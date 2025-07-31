// src/services/taskScheduler.js - Advanced Task Scheduler
const EventEmitter = require('events');
const workflowDb = require('./workflowDatabaseService');
const flamebotActionsService = require('./flamebotActionsService');
const aiService = require('./aiService');

/**
 * Advanced Task Scheduler
 * Handles execution of workflow tasks with better reliability and monitoring
 */
class TaskScheduler extends EventEmitter {
    constructor() {
        super();
        this.activeTasks = new Map(); // taskId -> task execution info
        this.taskExecutors = new Map(); // action -> executor function
        this.taskQueue = []; // Queue for pending tasks
        this.isProcessing = false;
        this.maxConcurrentTasks = 10;
        this.stats = {
            totalTasks: 0,
            completedTasks: 0,
            failedTasks: 0,
            activeTasks: 0,
            avgExecutionTime: 0
        };

        // Register task executors
        this.registerTaskExecutors();
        
        console.log('📋 Task Scheduler initialized');
    }

    /**
     * Register task executor functions for different actions
     */
    registerTaskExecutors() {
        this.taskExecutors.set('wait', this.executeWaitTask.bind(this));
        this.taskExecutors.set('add_prompt', this.executeAddPromptTask.bind(this));
        this.taskExecutors.set('add_bio', this.executeAddBioTask.bind(this));
        this.taskExecutors.set('swipe', this.executeSwipeTask.bind(this));
        this.taskExecutors.set('continuous_swipe', this.executeContinuousSwipeTask.bind(this));
        this.taskExecutors.set('spectre_config', this.executeSpectreConfigTask.bind(this));

        this.taskExecutors.set('execute_workflow_step', this.executeWorkflowStep.bind(this));
        this.taskExecutors.set('execute_continuous_swipe', this.executeContinuousSwipeTask.bind(this));
        
        console.log(`📋 Registered ${this.taskExecutors.size} task executors`);
    }

    /**
     * Execute a task based on its configuration
     * @param {Object} task - Task from database or workflow
     * @returns {Promise<Object>} Execution result
     */
    async executeTask(task) {
        const taskId = task.task_id || `task_${Date.now()}`;
        const startTime = Date.now();
        
        console.log(`🎬 Executing task: ${taskId} (${task.action})`);
        
        try {
            // Check if executor exists for this action
            const executor = this.taskExecutors.get(task.action);
            if (!executor) {
                throw new Error(`No executor found for action: ${task.action}`);
            }

            // Mark task as active
            this.activeTasks.set(taskId, {
                taskId,
                action: task.action,
                startTime,
                workflowInstanceId: task.workflow_instance_id,
                accountId: task.account_id
            });

            this.stats.activeTasks++;
            this.emit('task:started', { taskId, action: task.action });

            // Execute the task
            const result = await executor(task);
            
            const duration = Date.now() - startTime;
            
            // Update statistics
            this.stats.completedTasks++;
            this.stats.totalTasks++;
            this.stats.activeTasks--;
            this.updateAvgExecutionTime(duration);

            // Remove from active tasks
            this.activeTasks.delete(taskId);

            console.log(`✅ Task completed: ${taskId} (${duration}ms)`);
            this.emit('task:completed', { taskId, result, duration });

            return {
                success: true,
                result,
                duration,
                taskId
            };

        } catch (error) {
            const duration = Date.now() - startTime;
            
            // Update statistics
            this.stats.failedTasks++;
            this.stats.totalTasks++;
            this.stats.activeTasks--;

            // Remove from active tasks
            this.activeTasks.delete(taskId);

            console.error(`❌ Task failed: ${taskId} (${duration}ms)`, error);
            this.emit('task:failed', { taskId, error, duration });

            return {
                success: false,
                error: error.message,
                duration,
                taskId
            };
        }
    }

    /**
 * Execute workflow step - delegates to WorkflowExecutor
 * @param {Object} task - Task from database
 * @returns {Promise<Object>} Result
 */
async executeWorkflowStep(task) {
    const payload = task.payload || {};
    console.log(`🎯 Executing workflow step via TaskScheduler`);
    
    // Get WorkflowExecutor instance
    const workflowExecutor = require('./workflowExecutorV2');
    
    // Call the workflow executor's method
    return await workflowExecutor.executeWorkflowStep(payload);
}

    /**
     * Execute continuous swipe - delegates to WorkflowExecutor
     * @param {Object} task - Task from database
     * @returns {Promise<Object>} Result
     */
    async executeContinuousSwipeTask(task) {
        const payload = task.payload || {};
        console.log(`🔄 Executing continuous swipe via TaskScheduler`);
        
        // Get WorkflowExecutor instance
        const workflowExecutor = require('./workflowExecutorV2');
        
        // Call the workflow executor's method
        return await workflowExecutor.executeContinuousSwipe(payload);
    }

    /**
     * Schedule a task for future execution
     * @param {Object} taskConfig - Task configuration
     * @returns {Promise<string>} Task ID
     */
    async scheduleTask(taskConfig) {
        const {
            workflowInstanceId,
            stepId,
            action,
            scheduledFor,
            payload = {},
            maxAttempts = 3
        } = taskConfig;

         // VALIDAR QUE scheduledFor SEA UNA FECHA VÁLIDA
        if (!scheduledFor || !(scheduledFor instanceof Date) || isNaN(scheduledFor.getTime())) {
            throw new Error(`Invalid scheduledFor date: ${scheduledFor}`);
        }

        const taskId = `${stepId}_${workflowInstanceId}_${Date.now()}`;

        try {
            // Save to database
            await workflowDb.createScheduledTask({
                taskId,
                workflowInstanceId,
                stepId,
                action,
                scheduledFor,
                payload,
                maxAttempts
            });

            console.log(`⏰ Task scheduled: ${taskId} for ${scheduledFor.toLocaleString()}`);
            this.emit('task:scheduled', { taskId, scheduledFor, action });

            return taskId;

        } catch (error) {
            console.error(`❌ Failed to schedule task:`, error);
            throw error;
        }
    }

    /**
     * Cancel a scheduled task
     * @param {string} taskId - Task ID
     * @returns {Promise<boolean>} Success status
     */
    async cancelTask(taskId) {
        try {
            await workflowDb.cancelScheduledTask(taskId);
            console.log(`🚫 Task cancelled: ${taskId}`);
            this.emit('task:cancelled', { taskId });
            return true;
        } catch (error) {
            console.error(`❌ Failed to cancel task ${taskId}:`, error);
            return false;
        }
    }

    // ========== TASK EXECUTORS ==========

    /**
     * Execute wait task
     * @param {Object} task - Task configuration
     * @returns {Promise<Object>} Result
     */
    async executeWaitTask(task) {
        const payload = task.payload || {};
        const waitTime = payload.delay || 0;
        
        console.log(`⏳ Wait task: ${waitTime}ms`);
        
        // For scheduled tasks, the wait has already happened
        // Just return success
        return {
            action: 'wait',
            waitTime,
            message: 'Wait completed'
        };
    }

    /**
     * Execute add prompt task
     * @param {Object} task - Task configuration
     * @returns {Promise<Object>} Result
     */
    async executeAddPromptTask(task) {
        const payload = task.payload || {};
        const accountId = task.account_id;
        
        console.log(`📝 Add prompt task for account: ${accountId}`);
        
        // Get workflow instance to get model and channel info
        const workflowInstance = await workflowDb.getWorkflowInstanceById(task.workflow_instance_id);
        if (!workflowInstance) {
            throw new Error('Workflow instance not found');
        }
        
        const accountData = workflowInstance.account_data;
        const model = accountData.model;
        const channel = accountData.channel || 'gram';
        
        // Generate and update prompt
        const result = await flamebotActionsService.updatePrompt(
            accountId,
            model,
            channel,
            payload.customPrompt || null
        );
        
        return {
            action: 'add_prompt',
            taskId: result.taskId,
            visibleText: result.visibleText,
            obfuscatedText: result.obfuscatedText,
            model,
            channel
        };
    }

    /**
     * Execute add bio task
     * @param {Object} task - Task configuration
     * @returns {Promise<Object>} Result
     */
    async executeAddBioTask(task) {
        const payload = task.payload || {};
        const accountId = task.account_id;
        
        console.log(`📄 Add bio task for account: ${accountId}`);
        
        // Generate and update bio
        const result = await flamebotActionsService.updateBio(
            accountId,
            payload.customBio || null
        );
        
        return {
            action: 'add_bio',
            taskId: result.taskId,
            bioText: result.generatedBio,
            status: result.result?.status
        };
    }

    /**
     * Execute swipe task
     * @param {Object} task - Task configuration
     * @returns {Promise<Object>} Result
     */
    async executeSwipeTask(task) {
        const payload = task.payload || {};
        const accountId = task.account_id;
        const swipeCount = payload.swipeCount || 10;
        
        console.log(`💕 Swipe task for account: ${accountId} (${swipeCount} swipes)`);
        
        try {
            // First configure Spectre mode with the swipe count
            console.log(`👻 Configuring Spectre mode: ${swipeCount} max likes`);
            await flamebotActionsService.configureSpectreMode(accountId, swipeCount);
            
            // Wait a bit for configuration to apply
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Then start the swipe task
            console.log(`🚀 Starting swipe task`);
            const swipeResult = await flamebotActionsService.startSwipeTask(
                [accountId],
                `Auto-swipe ${swipeCount} - ${task.step_id}`
            );
            
            return {
                action: 'swipe',
                swipeCount,
                taskId: swipeResult.taskId,
                accountId,
                spectreConfigured: true
            };
            
        } catch (error) {
            console.error(`❌ Swipe task failed:`, error);
            throw error;
        }
    }

    /**
     * Execute continuous swipe task
     * @param {Object} task - Task configuration
     * @returns {Promise<Object>} Result
     */
    async executeContinuousSwipeTask(task) {
        const payload = task.payload || {};
        const accountId = task.account_id;
        
        // Calculate random swipe count
        const minSwipes = payload.minSwipes || 20;
        const maxSwipes = payload.maxSwipes || 30;
        const swipeCount = Math.floor(Math.random() * (maxSwipes - minSwipes + 1)) + minSwipes;
        
        console.log(`🔄 Continuous swipe task for account: ${accountId} (${swipeCount} swipes)`);
        
        // Execute like a regular swipe task
        const modifiedTask = {
            ...task,
            payload: { ...payload, swipeCount }
        };
        
        const result = await this.executeSwipeTask(modifiedTask);
        result.continuous = true;
        result.minSwipes = minSwipes;
        result.maxSwipes = maxSwipes;
        
        // Schedule next continuous swipe
        await this.scheduleNextContinuousSwipe(task, payload);
        
        return result;
    }

    /**
     * Execute Spectre configuration task
     * @param {Object} task - Task configuration
     * @returns {Promise<Object>} Result
     */
    async executeSpectreConfigTask(task) {
        const payload = task.payload || {};
        const accountId = task.account_id;
        const maxLikes = payload.maxLikes || 50;
        
        console.log(`👻 Spectre config task for account: ${accountId} (${maxLikes} max likes)`);
        
        const result = await flamebotActionsService.configureSpectreMode(
            accountId,
            maxLikes,
            payload.customConfig || {}
        );
        
        return {
            action: 'spectre_config',
            maxLikes,
            taskId: result.taskId,
            spectreConfig: result.spectreConfig
        };
    }

    /**
     * Schedule next continuous swipe
     * @param {Object} task - Current task
     * @param {Object} payload - Task payload
     */
    async scheduleNextContinuousSwipe(task, payload) {
        try {
            const minInterval = payload.minInterval || 90 * 60 * 1000; // 90 minutes
            const maxInterval = payload.maxInterval || 180 * 60 * 1000; // 180 minutes
            
            // Calculate random next execution time
            const randomDelay = Math.floor(Math.random() * (maxInterval - minInterval)) + minInterval;
            const nextExecution = new Date(Date.now() + randomDelay);
            
            console.log(`⏰ Scheduling next continuous swipe for ${nextExecution.toLocaleString()}`);
            
            // Schedule next continuous swipe
            await this.scheduleTask({
                workflowInstanceId: task.workflow_instance_id,
                stepId: task.step_id, // Keep same step ID for continuous
                action: 'continuous_swipe',
                scheduledFor: nextExecution,
                payload: payload
            });
            
        } catch (error) {
            console.error(`❌ Failed to schedule next continuous swipe:`, error);
        }
    }

    /**
     * Process task queue
     */
    async processTaskQueue() {
        if (this.isProcessing || this.taskQueue.length === 0) {
            return;
        }

        this.isProcessing = true;
        
        while (this.taskQueue.length > 0 && this.activeTasks.size < this.maxConcurrentTasks) {
            const task = this.taskQueue.shift();
            
            // Execute task without waiting
            this.executeTask(task).catch(error => {
                console.error(`❌ Queued task execution failed:`, error);
            });
        }
        
        this.isProcessing = false;
    }

    /**
     * Add task to queue
     * @param {Object} task - Task to queue
     */
    queueTask(task) {
        this.taskQueue.push(task);
        console.log(`📥 Task queued: ${task.action} (queue size: ${this.taskQueue.length})`);
        
        // Process queue
        setImmediate(() => this.processTaskQueue());
    }

    /**
     * Get task scheduler status
     * @returns {Object} Status information
     */
    getStatus() {
        const activeTasksInfo = [];
        for (const [taskId, taskInfo] of this.activeTasks) {
            activeTasksInfo.push({
                taskId,
                action: taskInfo.action,
                accountId: taskInfo.accountId,
                startTime: taskInfo.startTime,
                duration: Date.now() - taskInfo.startTime
            });
        }

        return {
            stats: this.stats,
            activeTasks: activeTasksInfo,
            queuedTasks: this.taskQueue.length,
            maxConcurrentTasks: this.maxConcurrentTasks,
            registeredExecutors: Array.from(this.taskExecutors.keys())
        };
    }

    /**
     * Update average execution time
     * @param {number} duration - Task duration in milliseconds
     */
    updateAvgExecutionTime(duration) {
        const currentAvg = this.stats.avgExecutionTime;
        const totalCompleted = this.stats.completedTasks;
        
        if (totalCompleted === 1) {
            this.stats.avgExecutionTime = duration;
        } else {
            this.stats.avgExecutionTime = ((currentAvg * (totalCompleted - 1)) + duration) / totalCompleted;
        }
    }

    /**
     * Get task execution history
     * @param {string} accountId - Account ID (optional)
     * @param {number} limit - Limit results
     * @returns {Promise<Array>} Task history
     */
    async getTaskHistory(accountId = null, limit = 50) {
        try {
            const query = `
                SELECT st.*, wi.account_id
                FROM scheduled_tasks st
                JOIN workflow_instances wi ON st.workflow_instance_id = wi.id
                WHERE ($1::text IS NULL OR wi.account_id = $1)
                AND st.status IN ('completed', 'failed')
                ORDER BY st.completed_at DESC, st.updated_at DESC
                LIMIT $2
            `;
            
            const result = await workflowDb.db.query(query, [accountId, limit]);
            return result.rows;
            
        } catch (error) {
            console.error('❌ Failed to get task history:', error);
            return [];
        }
    }

    /**
     * Get pending tasks
     * @returns {Promise<Array>} Pending tasks
     */
    async getPendingTasks() {
        try {
            return await workflowDb.getDueScheduledTasks(
                new Date(Date.now() + 24 * 60 * 60 * 1000) // Next 24 hours
            );
        } catch (error) {
            console.error('❌ Failed to get pending tasks:', error);
            return [];
        }
    }

    /**
     * Register custom task executor
     * @param {string} action - Action name
     * @param {Function} executor - Executor function
     */
    registerExecutor(action, executor) {
        this.taskExecutors.set(action, executor);
        console.log(`📋 Registered custom executor for action: ${action}`);
    }

    /**
     * Unregister task executor
     * @param {string} action - Action name
     */
    unregisterExecutor(action) {
        if (this.taskExecutors.delete(action)) {
            console.log(`🗑️ Unregistered executor for action: ${action}`);
            return true;
        }
        return false;
    }
}

// Export singleton instance
module.exports = new TaskScheduler();
