// src/services/taskMonitoringService.js
const EventEmitter = require('events');

/**
 * Service responsible for monitoring and polling task statuses
 * Follows Single Responsibility Principle - only handles task monitoring
 */
class TaskMonitoringService extends EventEmitter {
    constructor() {
        super();
        this.activeTasks = new Map();
        this.pollingIntervals = new Map();
        this.taskMetrics = new Map();
    }

    /**
     * Monitor an edit task until completion
     * @param {string} taskId - Task ID to monitor
     * @param {Object} apiService - API service for status checks
     * @param {Object} options - Monitoring options
     * @returns {Promise<Object>} Final task status
     */
    async monitorEditTask(taskId, apiService, options = {}) {
        const {
            maxAttempts = 24,
            interval = 5000,
            onProgress = null
        } = options;

        // Initialize metrics
        this.initializeTaskMetrics(taskId, 'edit');

        // Add to active tasks
        this.activeTasks.set(taskId, {
            type: 'edit',
            startTime: Date.now(),
            status: 'monitoring'
        });

        try {
            for (let attempt = 1; attempt <= maxAttempts; attempt++) {
                const status = await apiService.getEditTaskStatus(taskId);
                
                // Update metrics
                this.updateTaskMetrics(taskId, { 
                    lastCheck: Date.now(),
                    attempts: attempt,
                    lastStatus: status.status
                });

                // Emit progress event
                this.emit('taskProgress', {
                    taskId,
                    type: 'edit',
                    attempt,
                    maxAttempts,
                    status: status.status,
                    progress: status.progress
                });

                // Call progress callback if provided
                if (onProgress) {
                    onProgress({
                        taskId,
                        attempt,
                        maxAttempts,
                        status: status.status,
                        progress: status.progress
                    });
                }

                console.log(`⏳ Edit Task ${taskId} - Attempt ${attempt}/${maxAttempts} - Status: ${status.status}`);

                // Check completion states
                if (status.status === 'COMPLETED') {
                    this.handleTaskCompletion(taskId, 'success', status);
                    return status;
                }

                if (status.status === 'FAILED' || status.status === 'ERROR') {
                    this.handleTaskCompletion(taskId, 'failed', status);
                    throw new Error(`Task failed: ${status.error || 'Unknown error'}`);
                }

                // Wait before next attempt
                if (attempt < maxAttempts) {
                    await this.delay(interval);
                }
            }

            // Timeout reached
            this.handleTaskCompletion(taskId, 'timeout');
            throw new Error('Task monitoring timeout');

        } catch (error) {
            this.handleTaskCompletion(taskId, 'error', null, error);
            throw error;
        }
    }

    /**
     * Monitor a swipe task until completion
     * @param {string} taskId - Task ID to monitor
     * @param {Object} apiService - API service for status checks
     * @param {Object} options - Monitoring options
     * @returns {Promise<Object>} Final task status
     */
    async monitorSwipeTask(taskId, apiService, options = {}) {
        const {
            maxAttempts = 36,
            interval = 10000,
            onProgress = null
        } = options;

        // Initialize metrics
        this.initializeTaskMetrics(taskId, 'swipe');

        // Add to active tasks
        this.activeTasks.set(taskId, {
            type: 'swipe',
            startTime: Date.now(),
            status: 'monitoring'
        });

        try {
            for (let attempt = 1; attempt <= maxAttempts; attempt++) {
                const status = await apiService.getSwipeTaskStatus(taskId);
                const celeryStatus = status.celery_status;

                // Update metrics
                this.updateTaskMetrics(taskId, {
                    lastCheck: Date.now(),
                    attempts: attempt,
                    lastStatus: celeryStatus,
                    progress: status.progress
                });

                // Emit progress event
                this.emit('taskProgress', {
                    taskId,
                    type: 'swipe',
                    attempt,
                    maxAttempts,
                    status: celeryStatus,
                    progress: status.progress
                });

                // Call progress callback if provided
                if (onProgress) {
                    onProgress({
                        taskId,
                        attempt,
                        maxAttempts,
                        status: celeryStatus,
                        progress: status.progress
                    });
                }

                console.log(`⏳ Swipe Task ${taskId} - Attempt ${attempt}/${maxAttempts} - Status: ${celeryStatus}`);

                // Check completion states
                if (celeryStatus === 'SUCCESS') {
                    this.handleTaskCompletion(taskId, 'success', status);
                    return status;
                }

                if (celeryStatus === 'FAILURE') {
                    this.handleTaskCompletion(taskId, 'failed', status);
                    throw new Error(`Swipe task failed: ${JSON.stringify(status.error)}`);
                }

                if (celeryStatus === 'REVOKED') {
                    this.handleTaskCompletion(taskId, 'revoked', status);
                    return status;
                }

                // Continue monitoring for pending states
                if (['PENDING', 'STARTED', 'PROGRESS', 'RETRY'].includes(celeryStatus)) {
                    if (attempt < maxAttempts) {
                        await this.delay(interval);
                    }
                } else {
                    // Unknown status
                    console.warn(`Unknown swipe task status: ${celeryStatus}`);
                    return status;
                }
            }

            // Timeout reached
            this.handleTaskCompletion(taskId, 'timeout');
            throw new Error('Swipe task monitoring timeout');

        } catch (error) {
            this.handleTaskCompletion(taskId, 'error', null, error);
            throw error;
        }
    }

    /**
     * Start continuous monitoring of a task
     * @param {string} taskId - Task ID
     * @param {Object} apiService - API service
     * @param {Object} options - Monitoring options
     */
    startContinuousMonitoring(taskId, apiService, options = {}) {
        const { interval = 10000, type = 'edit' } = options;

        if (this.pollingIntervals.has(taskId)) {
            console.warn(`Task ${taskId} is already being monitored`);
            return;
        }

        const checkStatus = async () => {
            try {
                const status = type === 'edit' 
                    ? await apiService.getEditTaskStatus(taskId)
                    : await apiService.getSwipeTaskStatus(taskId);

                this.emit('statusUpdate', {
                    taskId,
                    type,
                    status,
                    timestamp: new Date().toISOString()
                });

                // Stop monitoring if task is complete
                const isComplete = type === 'edit'
                    ? ['COMPLETED', 'FAILED', 'ERROR'].includes(status.status)
                    : ['SUCCESS', 'FAILURE', 'REVOKED'].includes(status.celery_status);

                if (isComplete) {
                    this.stopContinuousMonitoring(taskId);
                }
            } catch (error) {
                console.error(`Error monitoring task ${taskId}:`, error.message);
                this.emit('monitoringError', { taskId, error });
            }
        };

        // Start monitoring
        const intervalId = setInterval(checkStatus, interval);
        this.pollingIntervals.set(taskId, intervalId);

        // Initial check
        checkStatus();
    }

    /**
     * Stop continuous monitoring of a task
     * @param {string} taskId - Task ID
     */
    stopContinuousMonitoring(taskId) {
        const intervalId = this.pollingIntervals.get(taskId);
        if (intervalId) {
            clearInterval(intervalId);
            this.pollingIntervals.delete(taskId);
            console.log(`Stopped monitoring task ${taskId}`);
        }
    }

    /**
     * Stop all continuous monitoring
     */
    stopAllMonitoring() {
        for (const [taskId, intervalId] of this.pollingIntervals) {
            clearInterval(intervalId);
        }
        this.pollingIntervals.clear();
        console.log('Stopped all task monitoring');
    }

    /**
     * Initialize task metrics
     * @private
     */
    initializeTaskMetrics(taskId, type) {
        this.taskMetrics.set(taskId, {
            type,
            startTime: Date.now(),
            endTime: null,
            duration: null,
            attempts: 0,
            lastCheck: null,
            lastStatus: null,
            result: null,
            error: null
        });
    }

    /**
     * Update task metrics
     * @private
     */
    updateTaskMetrics(taskId, updates) {
        const metrics = this.taskMetrics.get(taskId);
        if (metrics) {
            Object.assign(metrics, updates);
        }
    }

    /**
     * Handle task completion
     * @private
     */
    handleTaskCompletion(taskId, result, status = null, error = null) {
        const endTime = Date.now();
        const taskInfo = this.activeTasks.get(taskId);
        const metrics = this.taskMetrics.get(taskId);

        if (metrics) {
            metrics.endTime = endTime;
            metrics.duration = endTime - metrics.startTime;
            metrics.result = result;
            if (error) metrics.error = error.message;
        }

        // Emit completion event
        this.emit('taskCompleted', {
            taskId,
            type: taskInfo?.type,
            result,
            status,
            metrics,
            error
        });

        // Clean up
        this.activeTasks.delete(taskId);
        this.stopContinuousMonitoring(taskId);

        console.log(`✅ Task ${taskId} completed with result: ${result}`);
    }

    /**
     * Get active tasks
     * @returns {Object} Active tasks summary
     */
    getActiveTasks() {
        const tasks = [];
        for (const [taskId, info] of this.activeTasks) {
            const metrics = this.taskMetrics.get(taskId);
            tasks.push({
                taskId,
                ...info,
                duration: Date.now() - info.startTime,
                attempts: metrics?.attempts || 0,
                lastStatus: metrics?.lastStatus || 'unknown'
            });
        }
        return {
            count: tasks.length,
            tasks
        };
    }

    /**
     * Get task metrics
     * @param {string} taskId - Task ID
     * @returns {Object} Task metrics
     */
    getTaskMetrics(taskId) {
        return this.taskMetrics.get(taskId) || null;
    }

    /**
     * Clear completed task metrics
     * @param {number} olderThanMs - Clear metrics older than this duration
     */
    clearOldMetrics(olderThanMs = 3600000) { // 1 hour default
        const now = Date.now();
        for (const [taskId, metrics] of this.taskMetrics) {
            if (metrics.endTime && (now - metrics.endTime) > olderThanMs) {
                this.taskMetrics.delete(taskId);
            }
        }
    }

    /**
     * Delay helper
     * @private
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = new TaskMonitoringService();