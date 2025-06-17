// src/services/cronManager.js - Advanced Cron Job Manager
const cron = require('node-cron');
const EventEmitter = require('events');
const workflowDb = require('./workflowDatabaseService');

/**
 * Advanced Cron Job Manager
 * Handles scheduled tasks with better reliability and monitoring
 */
class CronManager extends EventEmitter {
    constructor() {
        super();
        this.cronJobs = new Map(); // cronId -> cron job instance
        this.scheduledTasks = new Map(); // taskId -> task info
        this.isRunning = false;
        this.stats = {
            totalJobs: 0,
            activeJobs: 0,
            executedTasks: 0,
            failedTasks: 0,
            lastExecution: null
        };
        
        console.log('⏰ Cron Manager initialized');
    }

    /**
     * Start the cron manager
     */
    async start() {
        if (this.isRunning) {
            console.log('⚠️ Cron Manager already running');
            return;
        }

        this.isRunning = true;
        console.log('🚀 Starting Cron Manager...');

        // Setup system cron jobs
        await this.setupSystemCronJobs();
        
        // Load scheduled tasks from database
        await this.loadScheduledTasks();
        
        this.emit('cron:started');
        console.log('✅ Cron Manager started successfully');
    }

    /**
     * Stop the cron manager gracefully
     */
    async stop() {
        if (!this.isRunning) return;
    
        console.log('🛑 Stopping Cron Manager...');
        this.isRunning = false;
    
        // Stop all cron jobs
        for (const [cronId, cronInfo] of this.cronJobs) {
            cronInfo.job.stop();  // <-- Cambiar cronJob por cronInfo.job
            console.log(`   Stopped cron job: ${cronId}`);
        }
        this.cronJobs.clear();
    
        // Clear scheduled tasks
        this.scheduledTasks.clear();
    
        this.emit('cron:stopped');
        console.log('✅ Cron Manager stopped gracefully');
    }

    /**
     * Setup system-level cron jobs
     */
    async setupSystemCronJobs() {
        console.log('⚙️ Setting up system cron jobs...');

        // 1. Task processor - runs every minute to check for due tasks
        this.createCronJob('task_processor', '* * * * *', async () => {
            await this.processDueTasks();
        }, 'Process due scheduled tasks');

        // 2. Cleanup job - runs every hour to clean up old tasks
        this.createCronJob('cleanup_tasks', '0 * * * *', async () => {
            await this.cleanupOldTasks();
        }, 'Clean up old completed tasks');

        // 3. Statistics update - runs every 10 minutes
        this.createCronJob('update_stats', '*/10 * * * *', async () => {
            await this.updateStatistics();
        }, 'Update workflow statistics');

        // 4. Health check - runs every 5 minutes
        this.createCronJob('health_check', '*/5 * * * *', async () => {
            await this.performHealthCheck();
        }, 'Perform system health check');

        // 5. Database maintenance - runs daily at 2 AM
        this.createCronJob('daily_maintenance', '0 2 * * *', async () => {
            await this.performDailyMaintenance();
        }, 'Perform daily database maintenance');

        console.log(`✅ System cron jobs created: ${this.cronJobs.size} jobs`);
    }

    /**
     * Create a cron job
     * @param {string} cronId - Unique cron job ID
     * @param {string} schedule - Cron schedule expression
     * @param {Function} task - Task function to execute
     * @param {string} description - Job description
     * @param {Object} options - Additional options
     */
    createCronJob(cronId, schedule, task, description, options = {}) {
        if (this.cronJobs.has(cronId)) {
            console.log(`⚠️ Cron job already exists: ${cronId}`);
            return false;
        }

        try {
            // Validate schedule
            if (!cron.validate(schedule)) {
                throw new Error(`Invalid cron schedule: ${schedule}`);
            }

            // Wrap task with error handling and logging
            const wrappedTask = async () => {
                const startTime = Date.now();
                console.log(`⏰ Executing cron job: ${cronId}`);
                
                try {
                    await task();
                    const duration = Date.now() - startTime;
                    console.log(`✅ Cron job completed: ${cronId} (${duration}ms)`);
                    
                    this.stats.executedTasks++;
                    this.stats.lastExecution = new Date();
                    this.emit('cron:job_completed', { cronId, duration });
                    
                } catch (error) {
                    const duration = Date.now() - startTime;
                    console.error(`❌ Cron job failed: ${cronId} (${duration}ms)`, error);
                    
                    this.stats.failedTasks++;
                    this.emit('cron:job_failed', { cronId, error, duration });
                }
            };

            // Create cron job
            const cronJob = cron.schedule(schedule, wrappedTask, {
                scheduled: false, // Don't start immediately
                timezone: options.timezone || 'UTC'
            });

            // Store job info
            this.cronJobs.set(cronId, {
                job: cronJob,
                schedule: schedule,
                description: description,
                createdAt: new Date(),
                lastExecution: null,
                executionCount: 0,
                failureCount: 0,
                options: options
            });

            // Start the job if cron manager is running
            if (this.isRunning) {
                cronJob.start();
            }

            this.stats.totalJobs++;
            this.stats.activeJobs++;

            console.log(`✅ Created cron job: ${cronId} (${schedule}) - ${description}`);
            return true;

        } catch (error) {
            console.error(`❌ Failed to create cron job ${cronId}:`, error);
            return false;
        }
    }

    /**
     * Remove a cron job
     * @param {string} cronId - Cron job ID
     */
    removeCronJob(cronId) {
        const cronInfo = this.cronJobs.get(cronId);
        if (!cronInfo) {
            console.log(`⚠️ Cron job not found: ${cronId}`);
            return false;
        }

        cronInfo.job.stop();
        this.cronJobs.delete(cronId);
        this.stats.activeJobs--;

        console.log(`🗑️ Removed cron job: ${cronId}`);
        this.emit('cron:job_removed', { cronId });
        return true;
    }

    /**
     * Schedule a one-time task
     * @param {string} taskId - Unique task ID
     * @param {Date} executeAt - When to execute
     * @param {Function} taskFunction - Function to execute
     * @param {Object} metadata - Task metadata
     */
    scheduleTask(taskId, executeAt, taskFunction, metadata = {}) {
        if (this.scheduledTasks.has(taskId)) {
            console.log(`⚠️ Task already scheduled: ${taskId}`);
            return false;
        }

        const delay = executeAt.getTime() - Date.now();
        if (delay <= 0) {
            console.log(`⚡ Executing task immediately (overdue): ${taskId}`);
            this.executeTask(taskId, taskFunction, metadata);
            return true;
        }

        console.log(`⏰ Scheduling task: ${taskId} for ${executeAt.toLocaleString()} (in ${this.formatDelay(delay)})`);

        const timeoutId = setTimeout(async () => {
            await this.executeTask(taskId, taskFunction, metadata);
            this.scheduledTasks.delete(taskId);
        }, delay);

        this.scheduledTasks.set(taskId, {
            taskId,
            executeAt,
            timeoutId,
            taskFunction,
            metadata,
            scheduledAt: new Date(),
            status: 'scheduled'
        });

        this.emit('task:scheduled', { taskId, executeAt, metadata });
        return true;
    }

    /**
     * Cancel a scheduled task
     * @param {string} taskId - Task ID
     */
    cancelTask(taskId) {
        const task = this.scheduledTasks.get(taskId);
        if (!task) {
            console.log(`⚠️ Task not found: ${taskId}`);
            return false;
        }

        clearTimeout(task.timeoutId);
        this.scheduledTasks.delete(taskId);

        console.log(`🚫 Cancelled task: ${taskId}`);
        this.emit('task:cancelled', { taskId });
        return true;
    }

    /**
     * Execute a task with error handling
     * @param {string} taskId - Task ID
     * @param {Function} taskFunction - Function to execute
     * @param {Object} metadata - Task metadata
     */
    async executeTask(taskId, taskFunction, metadata) {
        const startTime = Date.now();
        console.log(`🎬 Executing task: ${taskId}`);

        try {
            const result = await taskFunction();
            const duration = Date.now() - startTime;
            
            console.log(`✅ Task completed: ${taskId} (${duration}ms)`);
            this.emit('task:completed', { taskId, result, duration, metadata });
            
            return { success: true, result, duration };
            
        } catch (error) {
            const duration = Date.now() - startTime;
            console.error(`❌ Task failed: ${taskId} (${duration}ms)`, error);
            
            this.emit('task:failed', { taskId, error, duration, metadata });
            return { success: false, error: error.message, duration };
        }
    }

    /**
     * Process due scheduled tasks from database
     */
    async processDueTasks() {
        try {
            const dueTasks = await workflowDb.getDueScheduledTasks();
            
            if (dueTasks.length === 0) return;

            console.log(`⏰ Processing ${dueTasks.length} due tasks`);

            for (const task of dueTasks) {
                try {
                    // Mark task as running
                    await workflowDb.updateScheduledTask(task.task_id, 'running', {
                        last_attempt_at: new Date(),
                        attempts: task.attempts + 1
                    });

                    // Execute the task based on its action
                    const result = await this.executeWorkflowTask(task);

                    if (result.success) {
                        await workflowDb.completeScheduledTask(task.task_id, result);
                    } else {
                        if (task.attempts >= task.max_attempts) {
                            await workflowDb.failScheduledTask(task.task_id, result.error);
                        } else {
                            // Reschedule for retry
                            const retryDelay = Math.min(300000, 30000 * Math.pow(2, task.attempts)); // Exponential backoff
                            const retryAt = new Date(Date.now() + retryDelay);
                            
                            await workflowDb.updateScheduledTask(task.task_id, 'scheduled', {
                                scheduled_for: retryAt,
                                last_error: result.error
                            });
                        }
                    }

                } catch (error) {
                    console.error(`❌ Failed to process task ${task.task_id}:`, error);
                    await workflowDb.failScheduledTask(task.task_id, error.message);
                }
            }

        } catch (error) {
            console.error('❌ Error processing due tasks:', error);
        }
    }

    /**
     * Execute a workflow task based on its action
     * @param {Object} task - Task from database
     * @returns {Promise<Object>} Execution result
     */
    async executeWorkflowTask(task) {
        const TaskScheduler = require('./taskScheduler');
        return await TaskScheduler.executeTask(task);
    }

    /**
     * Load scheduled tasks from database on startup
     */
    async loadScheduledTasks() {
        try {
            const dueTasks = await workflowDb.getDueScheduledTasks(
                new Date(Date.now() + 24 * 60 * 60 * 1000) // Next 24 hours
            );

            console.log(`📥 Loading ${dueTasks.length} scheduled tasks from database`);

            for (const task of dueTasks) {
                const executeAt = new Date(task.scheduled_for);
                const delay = executeAt.getTime() - Date.now();

                if (delay > 0) {
                    // Create a wrapper function for the task
                    const taskFunction = async () => {
                        return await this.executeWorkflowTask(task);
                    };

                    this.scheduleTask(
                        task.task_id,
                        executeAt,
                        taskFunction,
                        {
                            workflowInstanceId: task.workflow_instance_id,
                            stepId: task.step_id,
                            action: task.action,
                            accountId: task.account_id
                        }
                    );
                }
            }

        } catch (error) {
            console.error('❌ Failed to load scheduled tasks:', error);
        }
    }

    /**
     * Clean up old completed tasks
     */
    async cleanupOldTasks() {
        try {
            const cleanedCount = await workflowDb.cleanupOldTasks(7); // 7 days
            if (cleanedCount > 0) {
                console.log(`🧹 Cleaned up ${cleanedCount} old tasks`);
            }
        } catch (error) {
            console.error('❌ Error cleaning up old tasks:', error);
        }
    }

    /**
     * Update statistics
     */
    async updateStatistics() {
        try {
            await workflowDb.updateDailyWorkflowStats();
        } catch (error) {
            console.error('❌ Error updating statistics:', error);
        }
    }

    /**
     * Perform health check
     */
    async performHealthCheck() {
        try {
            // Check database connection
            await workflowDb.db.query('SELECT 1');
            
            // Check workflow engine health
            const workflowManager = require('./workflowManager');
            const health = workflowManager.getHealthStatus();
            
            if (!health.healthy) {
                console.warn('⚠️ Workflow engine health check failed');
                this.emit('health:warning', { component: 'workflow_engine', status: health });
            }
            
        } catch (error) {
            console.error('❌ Health check failed:', error);
            this.emit('health:error', { error: error.message });
        }
    }

    /**
     * Perform daily maintenance
     */
    async performDailyMaintenance() {
        try {
            console.log('🧹 Performing daily maintenance...');
            
            const WorkflowMaintenance = require('../scripts/workflow-maintenance');
            const maintenance = new WorkflowMaintenance();
            await maintenance.runMaintenance();
            
            console.log('✅ Daily maintenance completed');
            this.emit('maintenance:completed');
            
        } catch (error) {
            console.error('❌ Daily maintenance failed:', error);
            this.emit('maintenance:failed', { error: error.message });
        }
    }

    /**
     * Get cron manager status
     * @returns {Object} Status information
     */
    getStatus() {
        const cronJobsInfo = [];
        for (const [cronId, cronInfo] of this.cronJobs) {
            cronJobsInfo.push({
                id: cronId,
                schedule: cronInfo.schedule,
                description: cronInfo.description,
                running: cronInfo.job.running,
                lastExecution: cronInfo.lastExecution,
                executionCount: cronInfo.executionCount,
                failureCount: cronInfo.failureCount
            });
        }

        const scheduledTasksInfo = [];
        for (const [taskId, taskInfo] of this.scheduledTasks) {
            scheduledTasksInfo.push({
                taskId: taskId,
                executeAt: taskInfo.executeAt,
                status: taskInfo.status,
                scheduledAt: taskInfo.scheduledAt,
                metadata: taskInfo.metadata
            });
        }

        return {
            isRunning: this.isRunning,
            stats: this.stats,
            cronJobs: cronJobsInfo,
            scheduledTasks: scheduledTasksInfo,
            totalCronJobs: this.cronJobs.size,
            totalScheduledTasks: this.scheduledTasks.size
        };
    }

    /**
     * Get cron job info
     * @param {string} cronId - Cron job ID
     * @returns {Object|null} Cron job information
     */
    getCronJobInfo(cronId) {
        const cronInfo = this.cronJobs.get(cronId);
        if (!cronInfo) return null;

        return {
            id: cronId,
            schedule: cronInfo.schedule,
            description: cronInfo.description,
            running: cronInfo.job.running,
            createdAt: cronInfo.createdAt,
            lastExecution: cronInfo.lastExecution,
            executionCount: cronInfo.executionCount,
            failureCount: cronInfo.failureCount,
            options: cronInfo.options
        };
    }

    /**
     * Start a specific cron job
     * @param {string} cronId - Cron job ID
     */
    startCronJob(cronId) {
        const cronInfo = this.cronJobs.get(cronId);
        if (!cronInfo) {
            console.log(`⚠️ Cron job not found: ${cronId}`);
            return false;
        }

        cronInfo.job.start();
        console.log(`▶️ Started cron job: ${cronId}`);
        this.emit('cron:job_started', { cronId });
        return true;
    }

    /**
     * Stop a specific cron job
     * @param {string} cronId - Cron job ID
     */
    stopCronJob(cronId) {
        const cronInfo = this.cronJobs.get(cronId);
        if (!cronInfo) {
            console.log(`⚠️ Cron job not found: ${cronId}`);
            return false;
        }

        cronInfo.job.stop();
        console.log(`⏸️ Stopped cron job: ${cronId}`);
        this.emit('cron:job_stopped', { cronId });
        return true;
    }

    /**
     * Format delay for display
     * @param {number} ms - Milliseconds
     * @returns {string} Formatted delay
     */
    formatDelay(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) {
            return `${days}d ${hours % 24}h ${minutes % 60}m`;
        } else if (hours > 0) {
            return `${hours}h ${minutes % 60}m`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        } else {
            return `${seconds}s`;
        }
    }
}

// Export singleton instance
module.exports = new CronManager();
