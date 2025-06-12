// src/services/cronMonitor.js - Cron Job Monitoring Service
const EventEmitter = require('events');
const cronManager = require('./cronManager');
const taskScheduler = require('./taskScheduler');
const workflowDb = require('./workflowDatabaseService');

/**
 * Cron Monitor Service
 * Monitors cron jobs and scheduled tasks for health and performance
 */
class CronMonitor extends EventEmitter {
    constructor() {
        super();
        this.isMonitoring = false;
        this.monitoringInterval = null;
        this.alertThresholds = {
            maxFailureRate: 0.1, // 10% failure rate threshold
            maxExecutionTime: 300000, // 5 minutes max execution time
            minSuccessRate: 0.9, // 90% success rate minimum  
            maxQueueSize: 100, // Maximum queued tasks
            healthCheckInterval: 60000 // 1 minute health check interval
        };
        this.alerts = [];
        this.metrics = {
            totalExecutions: 0,
            successfulExecutions: 0,
            failedExecutions: 0,
            avgExecutionTime: 0,
            lastHealthCheck: null,
            systemHealth: 'unknown'
        };

        console.log('📊 Cron Monitor initialized');
    }

    /**
     * Start monitoring cron jobs and tasks
     */
    async start() {
        if (this.isMonitoring) {
            console.log('⚠️ Cron Monitor already running');
            return;
        }

        this.isMonitoring = true;
        console.log('🚀 Starting Cron Monitor...');

        // Setup event listeners
        this.setupEventListeners();

        // Start health check monitoring
        this.monitoringInterval = setInterval(() => {
            this.performHealthCheck();
        }, this.alertThresholds.healthCheckInterval);

        // Initial health check
        await this.performHealthCheck();

        this.emit('monitor:started');
        console.log('✅ Cron Monitor started successfully');
    }

    /**
     * Stop monitoring
     */
    async stop() {
        if (!this.isMonitoring) return;

        console.log('🛑 Stopping Cron Monitor...');
        this.isMonitoring = false;

        // Clear monitoring interval
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
        }

        this.emit('monitor:stopped');
        console.log('✅ Cron Monitor stopped');
    }

    /**
     * Setup event listeners for cron manager and task scheduler
     */
    setupEventListeners() {
        // Cron Manager events
        cronManager.on('cron:job_completed', (data) => {
            this.handleJobCompletion(data);
        });

        cronManager.on('cron:job_failed', (data) => {
            this.handleJobFailure(data);
        });

        cronManager.on('task:completed', (data) => {
            this.handleTaskCompletion(data);
        });

        cronManager.on('task:failed', (data) => {
            this.handleTaskFailure(data);
        });

        cronManager.on('health:warning', (data) => {
            this.handleHealthWarning(data);
        });

        cronManager.on('health:error', (data) => {
            this.handleHealthError(data);
        });

        // Task Scheduler events
        taskScheduler.on('task:completed', (data) => {
            this.handleScheduledTaskCompletion(data);
        });

        taskScheduler.on('task:failed', (data) => {
            this.handleScheduledTaskFailure(data);
        });
    }

    /**
     * Handle cron job completion
     * @param {Object} data - Job completion data
     */
    handleJobCompletion(data) {
        this.metrics.totalExecutions++;
        this.metrics.successfulExecutions++;
        this.updateAvgExecutionTime(data.duration);

        // Check for slow executions
        if (data.duration > this.alertThresholds.maxExecutionTime) {
            this.createAlert('slow_execution', {
                cronId: data.cronId,
                duration: data.duration,
                threshold: this.alertThresholds.maxExecutionTime,
                severity: 'warning'
            });
        }
    }

    /**
     * Handle cron job failure
     * @param {Object} data - Job failure data
     */
    handleJobFailure(data) {
        this.metrics.totalExecutions++;
        this.metrics.failedExecutions++;
        this.updateAvgExecutionTime(data.duration);

        // Create failure alert
        this.createAlert('job_failure', {
            cronId: data.cronId,
            error: data.error.message,
            duration: data.duration,
            severity: 'error'
        });

        // Check failure rate
        this.checkFailureRate();
    }

    /**
     * Handle task completion
     * @param {Object} data - Task completion data
     */
    handleTaskCompletion(data) {
        console.log(`📊 Task completed: ${data.taskId} (${data.duration}ms)`);
    }

    /**
     * Handle task failure
     * @param {Object} data - Task failure data
     */
    handleTaskFailure(data) {
        console.error(`📊 Task failed: ${data.taskId}`, data.error.message);
        
        this.createAlert('task_failure', {
            taskId: data.taskId,
            error: data.error.message,
            metadata: data.metadata,
            severity: 'error'
        });
    }

    /**
     * Handle scheduled task completion
     * @param {Object} data - Scheduled task completion data
     */
    handleScheduledTaskCompletion(data) {
        console.log(`📊 Scheduled task completed: ${data.taskId} (${data.duration}ms)`);
    }

    /**
     * Handle scheduled task failure
     * @param {Object} data - Scheduled task failure data
     */
    handleScheduledTaskFailure(data) {
        console.error(`📊 Scheduled task failed: ${data.taskId}`, data.error.message);
        
        this.createAlert('scheduled_task_failure', {
            taskId: data.taskId,
            error: data.error.message,
            severity: 'error'
        });
    }

    /**
     * Handle health warnings
     * @param {Object} data - Health warning data
     */
    handleHealthWarning(data) {
        this.createAlert('health_warning', {
            component: data.component,
            status: data.status,
            severity: 'warning'
        });
    }

    /**
     * Handle health errors
     * @param {Object} data - Health error data
     */
    handleHealthError(data) {
        this.createAlert('health_error', {
            error: data.error,
            severity: 'critical'
        });
    }

    /**
     * Perform comprehensive health check
     */
    async performHealthCheck() {
        console.log('🔍 Performing cron system health check...');
        
        const healthReport = {
            timestamp: new Date(),
            overall: 'healthy',
            components: {}
        };

        try {
            // Check Cron Manager health
            const cronStatus = cronManager.getStatus();
            healthReport.components.cronManager = {
                healthy: cronStatus.isRunning,
                stats: cronStatus.stats,
                activeCronJobs: cronStatus.totalCronJobs,
                scheduledTasks: cronStatus.totalScheduledTasks
            };

            // Check Task Scheduler health
            const taskStatus = taskScheduler.getStatus();
            healthReport.components.taskScheduler = {
                healthy: true,
                stats: taskStatus.stats,
                activeTasks: taskStatus.stats.activeTasks,
                queuedTasks: taskStatus.queuedTasks
            };

            // Check queue size
            if (taskStatus.queuedTasks > this.alertThresholds.maxQueueSize) {
                healthReport.components.taskScheduler.healthy = false;
                this.createAlert('high_queue_size', {
                    queueSize: taskStatus.queuedTasks,
                    threshold: this.alertThresholds.maxQueueSize,
                    severity: 'warning'
                });
            }

            // Check database connectivity
            try {
                await workflowDb.db.query('SELECT 1');
                healthReport.components.database = { healthy: true };
            } catch (error) {
                healthReport.components.database = { 
                    healthy: false, 
                    error: error.message 
                };
                healthReport.overall = 'unhealthy';
            }

            // Check success rate
            const successRate = this.getSuccessRate();
            if (successRate < this.alertThresholds.minSuccessRate) {
                healthReport.overall = 'degraded';
                this.createAlert('low_success_rate', {
                    successRate: successRate,
                    threshold: this.alertThresholds.minSuccessRate,
                    severity: 'warning'
                });
            }

            // Update metrics
            this.metrics.lastHealthCheck = healthReport.timestamp;
            this.metrics.systemHealth = healthReport.overall;

            // Emit health check event
            this.emit('health:check_completed', healthReport);

            if (healthReport.overall !== 'healthy') {
                console.warn(`⚠️ System health: ${healthReport.overall}`);
            }

        } catch (error) {
            console.error('❌ Health check failed:', error);
            this.metrics.systemHealth = 'error';
            this.emit('health:check_failed', { error: error.message });
        }
    }

    /**
     * Create an alert
     * @param {string} type - Alert type
     * @param {Object} data - Alert data
     */
    createAlert(type, data) {
        const alert = {
            id: `${type}_${Date.now()}`,
            type,
            severity: data.severity || 'info',
            message: this.generateAlertMessage(type, data),
            data,
            timestamp: new Date(),
            acknowledged: false
        };

        this.alerts.push(alert);

        // Keep only last 100 alerts
        if (this.alerts.length > 100) {
            this.alerts = this.alerts.slice(-100);
        }

        console.log(`🚨 Alert created: [${alert.severity.toUpperCase()}] ${alert.message}`);
        this.emit('alert:created', alert);

        return alert;
    }

    /**
     * Generate alert message
     * @param {string} type - Alert type
     * @param {Object} data - Alert data
     * @returns {string} Alert message
     */
    generateAlertMessage(type, data) {
        switch (type) {
            case 'slow_execution':
                return `Cron job ${data.cronId} took ${data.duration}ms (threshold: ${data.threshold}ms)`;
            
            case 'job_failure':
                return `Cron job ${data.cronId} failed: ${data.error}`;
            
            case 'task_failure':
                return `Task ${data.taskId} failed: ${data.error}`;
            
            case 'scheduled_task_failure':
                return `Scheduled task ${data.taskId} failed: ${data.error}`;
            
            case 'high_failure_rate':
                return `High failure rate detected: ${(data.failureRate * 100).toFixed(1)}% (threshold: ${(data.threshold * 100).toFixed(1)}%)`;
            
            case 'low_success_rate':
                return `Low success rate: ${(data.successRate * 100).toFixed(1)}% (threshold: ${(data.threshold * 100).toFixed(1)}%)`;
            
            case 'high_queue_size':
                return `High queue size: ${data.queueSize} tasks (threshold: ${data.threshold})`;
            
            case 'health_warning':
                return `Health warning for ${data.component}: ${JSON.stringify(data.status)}`;
            
            case 'health_error':
                return `Health error: ${data.error}`;
            
            default:
                return `Alert: ${type}`;
        }
    }

    /**
     * Acknowledge an alert
     * @param {string} alertId - Alert ID
     * @returns {boolean} Success status
     */
    acknowledgeAlert(alertId) {
        const alert = this.alerts.find(a => a.id === alertId);
        if (alert) {
            alert.acknowledged = true;
            alert.acknowledgedAt = new Date();
            console.log(`✅ Alert acknowledged: ${alertId}`);
            this.emit('alert:acknowledged', alert);
            return true;
        }
        return false;
    }

    /**
     * Get unacknowledged alerts
     * @param {string} severity - Filter by severity (optional)
     * @returns {Array} Unacknowledged alerts
     */
    getUnacknowledgedAlerts(severity = null) {
        let alerts = this.alerts.filter(a => !a.acknowledged);
        
        if (severity) {
            alerts = alerts.filter(a => a.severity === severity);
        }
        
        return alerts.sort((a, b) => b.timestamp - a.timestamp);
    }

    /**
     * Get all alerts
     * @param {number} limit - Limit results
     * @returns {Array} All alerts
     */
    getAllAlerts(limit = 50) {
        return this.alerts
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, limit);
    }

    /**
     * Check failure rate and create alert if threshold exceeded
     */
    checkFailureRate() {
        const failureRate = this.getFailureRate();
        
        if (failureRate > this.alertThresholds.maxFailureRate) {
            this.createAlert('high_failure_rate', {
                failureRate: failureRate,
                threshold: this.alertThresholds.maxFailureRate,
                totalExecutions: this.metrics.totalExecutions,
                failedExecutions: this.metrics.failedExecutions,
                severity: 'warning'
            });
        }
    }

    /**
     * Get current failure rate
     * @returns {number} Failure rate (0-1)
     */
    getFailureRate() {
        if (this.metrics.totalExecutions === 0) return 0;
        return this.metrics.failedExecutions / this.metrics.totalExecutions;
    }

    /**
     * Get current success rate
     * @returns {number} Success rate (0-1)
     */
    getSuccessRate() {
        if (this.metrics.totalExecutions === 0) return 1;
        return this.metrics.successfulExecutions / this.metrics.totalExecutions;
    }

    /**
     * Update average execution time
     * @param {number} duration - Execution duration in milliseconds
     */
    updateAvgExecutionTime(duration) {
        const totalExecutions = this.metrics.totalExecutions;
        if (totalExecutions === 1) {
            this.metrics.avgExecutionTime = duration;
        } else {
            this.metrics.avgExecutionTime = ((this.metrics.avgExecutionTime * (totalExecutions - 1)) + duration) / totalExecutions;
        }
    }

    /**
     * Get monitoring status and metrics
     * @returns {Object} Monitor status
     */
    getStatus() {
        const cronStatus = cronManager.getStatus();
        const taskStatus = taskScheduler.getStatus();
        
        return {
            isMonitoring: this.isMonitoring,
            metrics: this.metrics,
            alertThresholds: this.alertThresholds,
            alerts: {
                total: this.alerts.length,
                unacknowledged: this.getUnacknowledgedAlerts().length,
                critical: this.getUnacknowledgedAlerts('critical').length,
                warnings: this.getUnacknowledgedAlerts('warning').length,
                errors: this.getUnacknowledgedAlerts('error').length
            },
            components: {
                cronManager: cronStatus,
                taskScheduler: taskStatus
            },
            systemHealth: this.metrics.systemHealth,
            successRate: this.getSuccessRate(),
            failureRate: this.getFailureRate()
        };
    }

    /**
     * Get dashboard data for monitoring UI
     * @returns {Object} Dashboard data
     */
    getDashboardData() {
        const status = this.getStatus();
        const recentAlerts = this.getAllAlerts(10);
        
        return {
            overview: {
                systemHealth: status.systemHealth,
                totalExecutions: status.metrics.totalExecutions,
                successRate: status.successRate,
                avgExecutionTime: status.metrics.avgExecutionTime,
                lastHealthCheck: status.metrics.lastHealthCheck
            },
            cronJobs: {
                total: status.components.cronManager.totalCronJobs,
                running: status.components.cronManager.stats.executedTasks,
                failed: status.components.cronManager.stats.failedTasks
            },
            tasks: {
                active: status.components.taskScheduler.stats.activeTasks,
                queued: status.components.taskScheduler.queuedTasks,
                completed: status.components.taskScheduler.stats.completedTasks,
                failed: status.components.taskScheduler.stats.failedTasks
            },
            alerts: {
                recent: recentAlerts,
                summary: status.alerts
            }
        };
    }

    /**
     * Update alert thresholds
     * @param {Object} newThresholds - New threshold values
     */
    updateAlertThresholds(newThresholds) {
        this.alertThresholds = { ...this.alertThresholds, ...newThresholds };
        console.log('📊 Alert thresholds updated:', newThresholds);
        this.emit('thresholds:updated', this.alertThresholds);
    }
}

// Export singleton instance  
module.exports = new CronMonitor();
