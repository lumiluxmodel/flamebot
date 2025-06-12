// src/services/workflowManager.js
const workflowEngine = require('./workflowEngine');
const cronMonitor = require('./cronMonitor');

/**
 * Workflow Manager - Provides a clean API interface to the workflow engine
 * Updated to include cron monitoring capabilities
 */
class WorkflowManager {
    constructor() {
        this.engine = workflowEngine;
        this.monitor = cronMonitor;
        this.isInitialized = false;
        
        // Setup event listeners
        this.setupEventListeners();
    }

    /**
     * Initialize the workflow manager with cron monitoring
     */
    async initialize() {
        if (this.isInitialized) {
            console.log('⚠️ Workflow Manager already initialized');
            return;
        }

        try {
            console.log('🚀 Initializing Workflow Manager with Cron Monitoring...');
            
            // Start the workflow engine (includes cron manager)
            await this.engine.start();
            
            // Start cron monitoring
            await this.monitor.start();
            
            this.isInitialized = true;
            console.log('✅ Workflow Manager with Cron Monitoring initialized successfully');
            
            return { success: true };
        } catch (error) {
            console.error('❌ Failed to initialize Workflow Manager:', error);
            throw error;
        }
    }

    /**
     * Shutdown the workflow manager gracefully
     */
    async shutdown() {
        if (!this.isInitialized) return;

        try {
            console.log('🛑 Shutting down Workflow Manager...');
            
            // Stop cron monitoring first
            await this.monitor.stop();
            
            // Stop workflow engine (includes cron manager)
            await this.engine.stop();
            
            this.isInitialized = false;
            console.log('✅ Workflow Manager shut down successfully');
        } catch (error) {
            console.error('❌ Error during shutdown:', error);
            throw error;
        }
    }

    /**
     * Start automation workflow for a newly imported account
     * This should be called after successful account import
     * 
     * @param {string} accountId - Flamebot account ID (from import response)
     * @param {Object} accountData - Account data
     * @param {string} accountData.model - Model name (Aura, Lola, Iris, Ciara)
     * @param {string} accountData.channel - Channel for prompts (snap, gram, of)
     * @param {string} workflowType - Workflow type ('default' or 'aggressive')
     * @returns {Promise<Object>} Start result
     */
    async startAccountAutomation(accountId, accountData, workflowType = 'default') {
        if (!this.isInitialized) {
            throw new Error('Workflow Manager not initialized');
        }

        try {
            console.log(`\n🎯 Starting automation for account: ${accountId}`);
            console.log(`   Model: ${accountData.model}`);
            console.log(`   Channel: ${accountData.channel || 'gram'}`);
            console.log(`   Workflow: ${workflowType}`);

            // Validate account data
            if (!accountId || !accountData.model) {
                throw new Error('Account ID and model are required');
            }

            // Start the workflow
            const started = await this.engine.startWorkflow(accountId, accountData, workflowType);
            
            if (started) {
                console.log(`✅ Automation started for account: ${accountId}`);
                return {
                    success: true,
                    accountId,
                    workflowType,
                    message: 'Account automation started successfully'
                };
            } else {
                return {
                    success: false,
                    error: 'Workflow already exists for this account'
                };
            }
        } catch (error) {
            console.error(`❌ Failed to start automation for ${accountId}:`, error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Stop automation for an account
     * @param {string} accountId - Account ID
     * @returns {Promise<Object>} Stop result
     */
    async stopAccountAutomation(accountId) {
        try {
            const workflow = this.engine.getWorkflowStatus(accountId);
            if (!workflow) {
                return {
                    success: false,
                    error: 'No active workflow found for this account'
                };
            }

            // Mark workflow as stopped
            workflow.status = 'stopped';
            workflow.stoppedAt = new Date();
            workflow.nextActionAt = null;

            // Cancel scheduled task if exists
            if (workflow.nextTaskId && this.engine.scheduledTasks.has(workflow.nextTaskId)) {
                clearTimeout(this.engine.scheduledTasks.get(workflow.nextTaskId));
                this.engine.scheduledTasks.delete(workflow.nextTaskId);
            }

            // Update stats
            this.engine.stats.activeWorkflows--;

            console.log(`🛑 Stopped automation for account: ${accountId}`);
            
            return {
                success: true,
                accountId,
                message: 'Account automation stopped'
            };
        } catch (error) {
            console.error(`❌ Failed to stop automation for ${accountId}:`, error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get workflow status for an account
     * @param {string} accountId - Account ID
     * @returns {Object|null} Workflow status
     */
    getAccountWorkflowStatus(accountId) {
        const workflow = this.engine.getWorkflowStatus(accountId);
        if (!workflow) return null;

        return {
            accountId: workflow.accountId,
            status: workflow.status,
            workflowType: workflow.workflowType,
            currentStep: workflow.currentStep,
            totalSteps: workflow.steps.length,
            nextActionAt: workflow.nextActionAt,
            lastActivity: workflow.lastActivity,
            startedAt: workflow.startedAt,
            executionLog: workflow.executionLog,
            progress: {
                completed: workflow.currentStep,
                total: workflow.steps.length,
                percentage: Math.round((workflow.currentStep / workflow.steps.length) * 100)
            }
        };
    }

    /**
     * Get all active workflows (for UI display)
     * @returns {Array} Active workflows
     */
    getAllActiveWorkflows() {
        const workflows = this.engine.getAllActiveWorkflows();
        
        return workflows.map(workflow => ({
            accountId: workflow.accountId,
            model: workflow.accountData.model,
            status: workflow.status,
            workflowType: workflow.workflowType,
            currentStep: workflow.currentStep,
            totalSteps: workflow.steps.length,
            nextActionAt: workflow.nextActionAt,
            lastActivity: workflow.lastActivity,
            startedAt: workflow.startedAt,
            progress: {
                completed: workflow.currentStep,
                total: workflow.steps.length,
                percentage: Math.round((workflow.currentStep / workflow.steps.length) * 100)
            },
            nextAction: workflow.steps[workflow.currentStep]?.description || 'Completed'
        }));
    }

    /**
     * Get workflow statistics with cron monitoring data
     * @returns {Object} Enhanced workflow stats
     */
    getWorkflowStats() {
        const engineStats = this.engine.getStats();
        const monitoringData = this.monitor.getDashboardData();
        
        return {
            // Engine stats
            ...engineStats,
            
            // Monitoring data
            monitoring: monitoringData,
            
            // Combined health status
            overallHealth: monitoringData.overview.systemHealth,
            uptime: this.isInitialized ? Date.now() - this.engine.startTime : 0,
            lastUpdate: new Date()
        };
    }

    /**
     * Get cron monitoring status
     * @returns {Object} Monitoring status
     */
    getMonitoringStatus() {
        return this.monitor.getStatus();
    }

    /**
     * Get cron monitoring dashboard data
     * @returns {Object} Dashboard data
     */
    getMonitoringDashboard() {
        return this.monitor.getDashboardData();
    }

    /**
     * Get alerts from cron monitor
     * @param {boolean} unacknowledgedOnly - Get only unacknowledged alerts
     * @param {string} severity - Filter by severity
     * @returns {Array} Alerts
     */
    getAlerts(unacknowledgedOnly = false, severity = null) {
        if (unacknowledgedOnly) {
            return this.monitor.getUnacknowledgedAlerts(severity);
        } else {
            return this.monitor.getAllAlerts();
        }
    }

    /**
     * Acknowledge an alert
     * @param {string} alertId - Alert ID
     * @returns {boolean} Success status
     */
    acknowledgeAlert(alertId) {
        return this.monitor.acknowledgeAlert(alertId);
    }

    /**
     * Update alert thresholds
     * @param {Object} thresholds - New threshold values
     * @returns {Object} Updated thresholds
     */
    updateAlertThresholds(thresholds) {
        this.monitor.updateAlertThresholds(thresholds);
        return this.monitor.alertThresholds;
    }

    /**
     * Get cron job information
     * @param {string} cronId - Cron job ID (optional)
     * @returns {Object|Array} Cron job(s) information
     */
    getCronJobInfo(cronId = null) {
        const cronManager = require('./cronManager');
        if (cronId) {
            return cronManager.getCronJobInfo(cronId);
        } else {
            const status = cronManager.getStatus();
            return status.cronJobs;
        }
    }

    /**
     * Control cron jobs
     * @param {string} action - Action to perform (start, stop, restart)
     * @param {string} cronId - Cron job ID (optional, for specific job)
     * @returns {Object} Operation result
     */
    controlCronJob(action, cronId = null) {
        const cronManager = require('./cronManager');
        
        try {
            let result = { success: false, message: 'Unknown action' };
            
            switch (action) {
                case 'start':
                    if (cronId) {
                        result.success = cronManager.startCronJob(cronId);
                        result.message = result.success ? `Started cron job: ${cronId}` : `Failed to start cron job: ${cronId}`;
                    } else {
                        result.message = 'Cron job ID required for start action';
                    }
                    break;
                    
                case 'stop':
                    if (cronId) {
                        result.success = cronManager.stopCronJob(cronId);
                        result.message = result.success ? `Stopped cron job: ${cronId}` : `Failed to stop cron job: ${cronId}`;
                    } else {
                        result.message = 'Cron job ID required for stop action';
                    }
                    break;
                    
                case 'restart':
                    if (cronId) {
                        const stopped = cronManager.stopCronJob(cronId);
                        if (stopped) {
                            // Wait a moment before restarting
                            setTimeout(() => {
                                cronManager.startCronJob(cronId);
                            }, 1000);
                            result.success = true;
                            result.message = `Restarted cron job: ${cronId}`;
                        } else {
                            result.message = `Failed to restart cron job: ${cronId}`;
                        }
                    } else {
                        result.message = 'Cron job ID required for restart action';
                    }
                    break;
                    
                default:
                    result.message = `Unknown action: ${action}`;
            }
            
            return result;
            
        } catch (error) {
            return {
                success: false,
                message: `Error controlling cron job: ${error.message}`
            };
        }
    }

    /**
     * Get task scheduler information
     * @returns {Object} Task scheduler status
     */
    getTaskSchedulerInfo() {
        const taskScheduler = require('./taskScheduler');
        return taskScheduler.getStatus();
    }

    /**
     * Get pending scheduled tasks
     * @returns {Promise<Array>} Pending tasks
     */
    async getPendingTasks() {
        const taskScheduler = require('./taskScheduler');
        return await taskScheduler.getPendingTasks();
    }

    /**
     * Get task execution history
     * @param {string} accountId - Account ID (optional)
     * @param {number} limit - Limit results
     * @returns {Promise<Array>} Task history
     */
    async getTaskHistory(accountId = null, limit = 50) {
        const taskScheduler = require('./taskScheduler');
        return await taskScheduler.getTaskHistory(accountId, limit);
    }

    /**
     * Get workflow definition for reference
     * @param {string} workflowType - Workflow type
     * @returns {Object|null} Workflow definition
     */
    async getWorkflowDefinition(workflowType) {
        return await this.engine.getWorkflowDefinition(workflowType);
    }

    /**
     * Setup event listeners for workflow events
     */
    setupEventListeners() {
        this.engine.on('workflow:started', (data) => {
            console.log(`📊 Workflow Event: Started - ${data.accountId}`);
        });

        this.engine.on('workflow:completed', (data) => {
            console.log(`📊 Workflow Event: Completed - ${data.workflow.accountId}`);
        });

        this.engine.on('workflow:failed', (data) => {
            console.error(`📊 Workflow Event: Failed - ${data.workflow.accountId}`);
            console.error(`   Error: ${data.error.message}`);
        });

        this.engine.on('workflow:step_executed', (data) => {
            const { workflow, step, result } = data;
            console.log(`📊 Workflow Event: Step Executed`);
            console.log(`   Account: ${workflow.accountId}`);
            console.log(`   Step: ${step.id}`);
            console.log(`   Success: ${result.success ? '✅' : '❌'}`);
        });

        this.engine.on('engine:started', () => {
            console.log('📊 Workflow Engine started');
        });

        this.engine.on('engine:stopped', () => {
            console.log('📊 Workflow Engine stopped');
        });
    }

    /**
     * Health check for workflow manager with cron monitoring
     * @returns {Object} Enhanced health status
     */
    getHealthStatus() {
        const engineStats = this.getWorkflowStats();
        const monitoringStatus = this.monitor.getStatus();
        
        const overallHealthy = this.isInitialized && 
                              this.engine.isRunning && 
                              monitoringStatus.isMonitoring &&
                              monitoringStatus.systemHealth !== 'error';
        
        return {
            healthy: overallHealthy,
            initialized: this.isInitialized,
            components: {
                workflowEngine: {
                    running: this.engine.isRunning,
                    activeWorkflows: engineStats.activeWorkflows,
                    totalWorkflows: engineStats.totalWorkflows
                },
                cronManager: {
                    running: engineStats.cronManager?.isRunning || false,
                    totalCronJobs: engineStats.cronManager?.totalCronJobs || 0,
                    executedTasks: engineStats.cronManager?.executedTasks || 0,
                    failedTasks: engineStats.cronManager?.failedTasks || 0
                },
                taskScheduler: {
                    activeTasks: engineStats.taskScheduler?.activeTasks || 0,
                    completedTasks: engineStats.taskScheduler?.completedTasks || 0,
                    failedTasks: engineStats.taskScheduler?.failedTasks || 0,
                    queuedTasks: engineStats.taskScheduler?.queuedTasks || 0
                },
                cronMonitor: {
                    monitoring: monitoringStatus.isMonitoring,
                    systemHealth: monitoringStatus.systemHealth,
                    successRate: monitoringStatus.successRate,
                    unacknowledgedAlerts: monitoringStatus.alerts?.unacknowledged || 0
                }
            },
            metrics: {
                successRate: monitoringStatus.successRate,
                failureRate: monitoringStatus.failureRate,
                avgExecutionTime: monitoringStatus.metrics?.avgExecutionTime || 0,
                totalExecutions: monitoringStatus.metrics?.totalExecutions || 0
            },
            alerts: {
                total: monitoringStatus.alerts?.total || 0,
                unacknowledged: monitoringStatus.alerts?.unacknowledged || 0,
                critical: monitoringStatus.alerts?.critical || 0
            },
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Pause all workflows (for maintenance)
     * @returns {Promise<Object>} Pause result
     */
    async pauseAllWorkflows() {
        try {
            console.log('⏸️ Pausing all workflows...');
            
            // Cancel all scheduled tasks
            for (const [taskId, timeoutRef] of this.engine.scheduledTasks) {
                clearTimeout(timeoutRef);
            }
            this.engine.scheduledTasks.clear();

            // Mark all workflows as paused
            for (const workflow of this.engine.activeWorkflows.values()) {
                workflow.status = 'paused';
                workflow.pausedAt = new Date();
            }

            console.log('⏸️ All workflows paused');
            return { success: true, message: 'All workflows paused' };
        } catch (error) {
            console.error('❌ Failed to pause workflows:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Resume all paused workflows
     * @returns {Promise<Object>} Resume result  
     */
    async resumeAllWorkflows() {
        try {
            console.log('▶️ Resuming all workflows...');
            
            let resumedCount = 0;
            for (const workflow of this.engine.activeWorkflows.values()) {
                if (workflow.status === 'paused') {
                    workflow.status = 'active';
                    workflow.resumedAt = new Date();
                    delete workflow.pausedAt;
                    
                    // Reschedule next action
                    this.engine.scheduleNextAction(workflow);
                    resumedCount++;
                }
            }

            console.log(`▶️ Resumed ${resumedCount} workflows`);
            return { success: true, message: `Resumed ${resumedCount} workflows` };
        } catch (error) {
            console.error('❌ Failed to resume workflows:', error);
            return { success: false, error: error.message };
        }
    }
}

// Export singleton instance
module.exports = new WorkflowManager();
