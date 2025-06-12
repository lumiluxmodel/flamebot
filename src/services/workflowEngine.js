// src/services/workflowEngine.js
const EventEmitter = require('events');
const db = require('./databaseService');
const flamebotActionsService = require('./flamebotActionsService');
const aiService = require('./aiService');

/**
 * Core Workflow Engine - Manages automated account workflows
 * Handles the complete automation flow after account import
 */
class WorkflowEngine extends EventEmitter {
    constructor() {
        super();
        this.activeWorkflows = new Map(); // accountId -> workflow state
        this.scheduledTasks = new Map(); // taskId -> timeout reference
        this.isRunning = false;
        this.stats = {
            totalWorkflows: 0,
            activeWorkflows: 0,
            completedWorkflows: 0,
            failedWorkflows: 0
        };
        
        console.log('🤖 Workflow Engine initialized');
    }

    /**
     * Start the workflow engine
     */
    async start() {
        if (this.isRunning) {
            console.log('⚠️ Workflow Engine already running');
            return;
        }

        this.isRunning = true;
        console.log('🚀 Starting Workflow Engine...');
        
        // Load active workflows from database on startup
        await this.loadActiveWorkflows();
        
        // Setup cleanup interval (every 5 minutes)
        this.cleanupInterval = setInterval(() => {
            this.cleanupCompletedWorkflows();
        }, 5 * 60 * 1000);
        
        this.emit('engine:started');
        console.log('✅ Workflow Engine started successfully');
    }

    /**
     * Stop the workflow engine gracefully
     */
    async stop() {
        if (!this.isRunning) return;

        console.log('🛑 Stopping Workflow Engine...');
        this.isRunning = false;

        // Cancel all scheduled tasks
        for (const [taskId, timeoutRef] of this.scheduledTasks) {
            clearTimeout(timeoutRef);
            console.log(`   Cancelled scheduled task: ${taskId}`);
        }
        this.scheduledTasks.clear();

        // Stop cleanup interval
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }

        // Save workflow states to database
        await this.saveWorkflowStates();

        this.emit('engine:stopped');
        console.log('✅ Workflow Engine stopped gracefully');
    }

    /**
     * Start workflow for a newly imported account
     * @param {string} accountId - Flamebot account ID
     * @param {Object} accountData - Account data (model, etc.)
     * @param {string} workflowType - Type of workflow to start
     */
    async startWorkflow(accountId, accountData, workflowType = 'default') {
        console.log(`\n🎯 Starting workflow for account: ${accountId}`);
        console.log(`   Model: ${accountData.model}`);
        console.log(`   Workflow: ${workflowType}`);

        // Check if workflow already exists
        if (this.activeWorkflows.has(accountId)) {
            console.log(`⚠️ Workflow already active for account: ${accountId}`);
            return false;
        }

        // Get workflow definition
        const workflowDef = await this.getWorkflowDefinition(workflowType);
        if (!workflowDef) {
            throw new Error(`Workflow type not found: ${workflowType}`);
        }

        // Create workflow state
        const workflow = {
            accountId,
            accountData,
            workflowType,
            status: 'active',
            currentStep: 0,
            steps: workflowDef.steps,
            startedAt: new Date(),
            lastActivity: new Date(),
            nextActionAt: null,
            executionLog: [],
            retryCount: 0,
            maxRetries: 3
        };

        // Save to database
        await this.saveWorkflowToDatabase(workflow);

        // Add to active workflows
        this.activeWorkflows.set(accountId, workflow);
        this.stats.totalWorkflows++;
        this.stats.activeWorkflows++;

        // Start first action (after import delay)
        this.scheduleNextAction(workflow);

        this.emit('workflow:started', { accountId, workflow });
        console.log(`✅ Workflow started for account: ${accountId}`);
        
        return true;
    }

    /**
     * Get workflow definition by type (from database or fallback to hardcoded)
     * @param {string} workflowType - Workflow type
     * @returns {Object} Workflow definition
     */
    async getWorkflowDefinition(workflowType) {
        try {
            // Try to get from database first
            const workflowDb = require('./workflowDatabaseService');
            const dbDefinition = await workflowDb.getWorkflowDefinition(workflowType);
            
            if (dbDefinition) {
                return {
                    name: dbDefinition.name,
                    description: dbDefinition.description,
                    steps: dbDefinition.steps
                };
            }
        } catch (error) {
            console.error(`⚠️ Failed to get workflow definition from database:`, error);
        }
        
        // Fallback to hardcoded definitions
        const definitions = {
            'default': {
                name: 'Default Account Automation',
                description: 'Standard workflow for new accounts',
                steps: [
                    {
                        id: 'wait_after_import',
                        action: 'wait',
                        delay: 60 * 60 * 1000, // 1 hour
                        description: 'Wait 1 hour after import'
                    },
                    {
                        id: 'add_prompt',
                        action: 'add_prompt',
                        delay: 0,
                        description: 'Add AI-generated prompt'
                    },
                    {
                        id: 'wait_before_first_swipe',
                        action: 'wait',
                        delay: 15 * 60 * 1000, // 15 minutes
                        description: 'Wait 15 minutes before first swipe'
                    },
                    {
                        id: 'first_swipe_10',
                        action: 'swipe',
                        swipeCount: 10,
                        description: 'First swipe session - 10 swipes'
                    },
                    {
                        id: 'wait_before_second_swipe',
                        action: 'wait',
                        delay: 60 * 60 * 1000, // 1 hour
                        description: 'Wait 1 hour before second swipe'
                    },
                    {
                        id: 'second_swipe_20',
                        action: 'swipe',
                        swipeCount: 20,
                        description: 'Second swipe session - 20 swipes'
                    },
                    {
                        id: 'wait_before_third_swipe',
                        action: 'wait',
                        delay: 60 * 60 * 1000, // 1 hour
                        description: 'Wait 1 hour before third swipe'
                    },
                    {
                        id: 'third_swipe_20',
                        action: 'swipe',
                        swipeCount: 20,
                        description: 'Third swipe session - 20 swipes'
                    },
                    {
                        id: 'continuous_swipe_mode',
                        action: 'continuous_swipe',
                        minSwipes: 20,
                        maxSwipes: 30,
                        minInterval: 90 * 60 * 1000, // 90 minutes
                        maxInterval: 180 * 60 * 1000, // 180 minutes
                        description: 'Continuous random swipes 20-30 every 90-180 min'
                    },
                    {
                        id: 'add_bio_after_24h',
                        action: 'add_bio',
                        delay: 24 * 60 * 60 * 1000, // 24 hours from start
                        description: 'Add AI-generated bio after 24 hours'
                    }
                ]
            },
            'aggressive': {
                name: 'Aggressive Account Automation',
                description: 'Faster workflow for testing',
                steps: [
                    {
                        id: 'wait_after_import',
                        action: 'wait',
                        delay: 5 * 60 * 1000, // 5 minutes
                        description: 'Wait 5 minutes after import'
                    },
                    {
                        id: 'add_prompt',
                        action: 'add_prompt',
                        delay: 0,
                        description: 'Add AI-generated prompt'
                    },
                    {
                        id: 'first_swipe_15',
                        action: 'swipe',
                        swipeCount: 15,
                        description: 'First swipe session - 15 swipes'
                    },
                    {
                        id: 'continuous_swipe_mode',
                        action: 'continuous_swipe',
                        minSwipes: 25,
                        maxSwipes: 35,
                        minInterval: 30 * 60 * 1000, // 30 minutes
                        maxInterval: 60 * 60 * 1000, // 60 minutes
                        description: 'Continuous swipes 25-35 every 30-60 min'
                    }
                ]
            },
            'test': {
                name: 'Test Workflow',
                description: 'Very fast workflow for development testing',
                steps: [
                    {
                        id: 'wait_after_import',
                        action: 'wait',
                        delay: 30 * 1000, // 30 seconds
                        description: 'Wait 30 seconds after import'
                    },
                    {
                        id: 'add_prompt',
                        action: 'add_prompt',
                        delay: 0,
                        description: 'Add AI-generated prompt'
                    },
                    {
                        id: 'test_swipe_5',
                        action: 'swipe',
                        swipeCount: 5,
                        description: 'Test swipe session - 5 swipes'
                    },
                    {
                        id: 'add_bio_test',
                        action: 'add_bio',
                        delay: 2 * 60 * 1000, // 2 minutes
                        description: 'Add bio after 2 minutes'
                    }
                ]
            }
        };

        return definitions[workflowType];
    }

    /**
     * Schedule the next action for a workflow
     * @param {Object} workflow - Workflow state
     */
    scheduleNextAction(workflow) {
        if (workflow.status !== 'active') return;

        const currentStep = workflow.steps[workflow.currentStep];
        if (!currentStep) {
            // Workflow completed
            this.completeWorkflow(workflow);
            return;
        }

        let delay = currentStep.delay || 0;
        
        // For continuous swipe mode, calculate random delay
        if (currentStep.action === 'continuous_swipe') {
            const minInterval = currentStep.minInterval || 90 * 60 * 1000;
            const maxInterval = currentStep.maxInterval || 180 * 60 * 1000;
            delay = Math.floor(Math.random() * (maxInterval - minInterval)) + minInterval;
        }

        // Calculate next execution time
        workflow.nextActionAt = new Date(Date.now() + delay);
        
        console.log(`⏰ Scheduled next action for ${workflow.accountId}:`);
        console.log(`   Step: ${currentStep.id} (${currentStep.description})`);
        console.log(`   Delay: ${this.formatDelay(delay)}`);
        console.log(`   Execute at: ${workflow.nextActionAt.toLocaleString()}`);

        // Schedule the action
        const taskId = `${workflow.accountId}_${currentStep.id}_${Date.now()}`;
        const timeoutRef = setTimeout(() => {
            this.executeWorkflowStep(workflow, currentStep);
        }, delay);

        this.scheduledTasks.set(taskId, timeoutRef);
        workflow.nextTaskId = taskId;

        // Update workflow in database
        this.updateWorkflowInDatabase(workflow);
    }

    /**
     * Execute a workflow step
     * @param {Object} workflow - Workflow state
     * @param {Object} step - Step to execute
     */
    async executeWorkflowStep(workflow, step) {
        console.log(`\n🎬 Executing step: ${step.id} for account: ${workflow.accountId}`);
        console.log(`   Action: ${step.action}`);
        console.log(`   Description: ${step.description}`);

        const executionStart = new Date();
        let result = { success: true, message: 'Step completed' };

        try {
            switch (step.action) {
                case 'wait':
                    result = { success: true, message: `Waited ${this.formatDelay(step.delay)}` };
                    break;

                case 'add_prompt':
                    result = await this.executeAddPrompt(workflow);
                    break;

                case 'add_bio':
                    result = await this.executeAddBio(workflow);
                    break;

                case 'swipe':
                    result = await this.executeSwipe(workflow, step.swipeCount);
                    break;

                case 'continuous_swipe':
                    result = await this.executeContinuousSwipe(workflow, step);
                    break;

                default:
                    throw new Error(`Unknown action: ${step.action}`);
            }

            console.log(`✅ Step completed: ${step.id}`);
            console.log(`   Result: ${result.message}`);

            // Log execution to database and memory
            const logEntry = {
                stepId: step.id,
                action: step.action,
                success: true,
                result: result,
                executedAt: executionStart,
                duration: Date.now() - executionStart.getTime()
            };
            
            workflow.executionLog.push(logEntry);
            
            // Save to database if we have DB ID
            if (workflow.dbId) {
                try {
                    const workflowDb = require('./workflowDatabaseService');
                    await workflowDb.addExecutionLog({
                        workflowInstanceId: workflow.dbId,
                        stepId: step.id,
                        stepIndex: workflow.currentStep,
                        action: step.action,
                        description: step.description,
                        success: true,
                        result: result,
                        durationMs: Date.now() - executionStart.getTime()
                    });
                } catch (dbError) {
                    console.error(`❌ Failed to save execution log:`, dbError);
                }
            }

            // Reset retry count on success
            workflow.retryCount = 0;

            // Move to next step (unless it's continuous_swipe)
            if (step.action !== 'continuous_swipe') {
                workflow.currentStep++;
            }

            // Schedule next action
            workflow.lastActivity = new Date();
            this.scheduleNextAction(workflow);

        } catch (error) {
            console.error(`❌ Step failed: ${step.id}`, error.message);

            // Log failure to database and memory
            const logEntry = {
                stepId: step.id,
                action: step.action,
                success: false,
                error: error.message,
                executedAt: executionStart,
                duration: Date.now() - executionStart.getTime()
            };
            
            workflow.executionLog.push(logEntry);
            
            // Save to database if we have DB ID
            if (workflow.dbId) {
                try {
                    const workflowDb = require('./workflowDatabaseService');
                    await workflowDb.addExecutionLog({
                        workflowInstanceId: workflow.dbId,
                        stepId: step.id,
                        stepIndex: workflow.currentStep,
                        action: step.action,
                        description: step.description,
                        success: false,
                        errorMessage: error.message,
                        durationMs: Date.now() - executionStart.getTime()
                    });
                } catch (dbError) {
                    console.error(`❌ Failed to save error log:`, dbError);
                }
            }

            await this.handleWorkflowError(workflow, step, error);
        }

        // Update workflow state
        this.updateWorkflowInDatabase(workflow);
        this.emit('workflow:step_executed', { workflow, step, result });
    }

    /**
     * Handle workflow error with retry logic
     * @param {Object} workflow - Workflow state
     * @param {Object} step - Failed step
     * @param {Error} error - Error that occurred
     */
    async handleWorkflowError(workflow, step, error) {
        workflow.retryCount++;
        workflow.lastError = error.message;

        if (workflow.retryCount >= workflow.maxRetries) {
            console.error(`❌ Workflow failed after ${workflow.maxRetries} retries: ${workflow.accountId}`);
            await this.failWorkflow(workflow, error);
        } else {
            console.log(`🔄 Retrying step ${step.id} (attempt ${workflow.retryCount}/${workflow.maxRetries})`);
            
            // Retry after exponential backoff delay
            const retryDelay = Math.min(300000, 30000 * Math.pow(2, workflow.retryCount - 1)); // Max 5 minutes
            workflow.nextActionAt = new Date(Date.now() + retryDelay);
            
            try {
                // Schedule retry using TaskScheduler
                const retryTaskId = await taskScheduler.scheduleTask({
                    workflowInstanceId: workflow.dbId,
                    stepId: step.id,
                    action: step.action,
                    scheduledFor: workflow.nextActionAt,
                    payload: {
                        retry: true,
                        attempt: workflow.retryCount,
                        originalError: error.message,
                        delay: step.delay,
                        swipeCount: step.swipeCount
                    }
                });

                workflow.nextTaskId = retryTaskId;
                
            } catch (scheduleError) {
                console.error(`❌ Failed to schedule retry:`, scheduleError);
                // Fallback to setTimeout
                setTimeout(() => {
                    this.executeWorkflowStep(workflow, step);
                }, retryDelay);
            }
        }
    }

    /**
     * Complete a workflow
     * @param {Object} workflow - Workflow state
     */
    async completeWorkflow(workflow) {
        console.log(`✅ Workflow completed: ${workflow.accountId}`);
        
        workflow.status = 'completed';
        workflow.completedAt = new Date();
        workflow.nextActionAt = null;

        this.stats.activeWorkflows--;
        this.stats.completedWorkflows++;

        // Update in database
        if (workflow.dbId) {
            try {
                const workflowDb = require('./workflowDatabaseService');
                await workflowDb.completeWorkflowInstance(workflow.accountId);
            } catch (error) {
                console.error(`❌ Failed to complete workflow in database:`, error);
            }
        }

        await this.updateWorkflowInDatabase(workflow);
        this.emit('workflow:completed', { workflow });

        // Remove from active workflows after a delay (for monitoring)
        setTimeout(() => {
            this.activeWorkflows.delete(workflow.accountId);
        }, 10 * 60 * 1000); // Keep for 10 minutes
    }

    /**
     * Fail a workflow
     * @param {Object} workflow - Workflow state
     * @param {Error} error - Final error
     */
    async failWorkflow(workflow, error) {
        console.error(`❌ Workflow failed permanently: ${workflow.accountId}`);
        console.error(`   Error: ${error.message}`);
        
        workflow.status = 'failed';
        workflow.failedAt = new Date();
        workflow.finalError = error.message;
        workflow.nextActionAt = null;

        this.stats.activeWorkflows--;
        this.stats.failedWorkflows++;

        // Update in database
        if (workflow.dbId) {
            try {
                const workflowDb = require('./workflowDatabaseService');
                await workflowDb.failWorkflowInstance(workflow.accountId, error.message);
            } catch (dbError) {
                console.error(`❌ Failed to update failed workflow in database:`, dbError);
            }
        }

        await this.updateWorkflowInDatabase(workflow);
        this.emit('workflow:failed', { workflow, error });

        // Remove from active workflows after a delay
        setTimeout(() => {
            this.activeWorkflows.delete(workflow.accountId);
        }, 60 * 60 * 1000); // Keep for 1 hour for debugging
    }

    /**
     * Get workflow status
     * @param {string} accountId - Account ID
     * @returns {Object|null} Workflow state
     */
    getWorkflowStatus(accountId) {
        return this.activeWorkflows.get(accountId) || null;
    }

    /**
     * Get all active workflows
     * @returns {Array} Active workflows
     */
    getAllActiveWorkflows() {
        return Array.from(this.activeWorkflows.values());
    }

    /**
     * Get engine statistics
     * @returns {Object} Engine stats
     */
    getStats() {
        return {
            ...this.stats,
            activeWorkflows: this.activeWorkflows.size,
            scheduledTasks: this.scheduledTasks.size,
            isRunning: this.isRunning
        };
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

    /**
     * DATABASE OPERATIONS - Real implementation using WorkflowDatabaseService
     */
    async saveWorkflowToDatabase(workflow) {
        try {
            console.log(`💾 Saving workflow to database: ${workflow.accountId}`);
            
            const workflowDb = require('./workflowDatabaseService');
            
            // Create workflow instance in database
            const dbWorkflow = await workflowDb.createWorkflowInstance({
                workflowType: workflow.workflowType,
                accountId: workflow.accountId,
                accountData: workflow.accountData,
                totalSteps: workflow.steps.length,
                executionContext: {
                    currentStep: workflow.currentStep,
                    nextActionAt: workflow.nextActionAt,
                    nextTaskId: workflow.nextTaskId,
                    retryCount: workflow.retryCount,
                    maxRetries: workflow.maxRetries
                }
            });
            
            // Store database ID in workflow for future updates
            workflow.dbId = dbWorkflow.id;
            
            console.log(`✅ Workflow saved to database with ID: ${dbWorkflow.id}`);
        } catch (error) {
            console.error(`❌ Failed to save workflow to database:`, error);
            // Don't throw - continue with in-memory operation
        }
    }

    async updateWorkflowInDatabase(workflow) {
        try {
            if (!workflow.dbId) {
                // If no DB ID, try to find it by account ID
                const workflowDb = require('./workflowDatabaseService');
                const existingWorkflow = await workflowDb.getWorkflowInstanceByAccountId(workflow.accountId);
                if (existingWorkflow) {
                    workflow.dbId = existingWorkflow.id;
                }
            }
            
            if (workflow.dbId) {
                const workflowDb = require('./workflowDatabaseService');
                
                await workflowDb.updateWorkflowInstance(workflow.accountId, {
                    status: workflow.status,
                    current_step: workflow.currentStep,
                    progress_percentage: Math.round((workflow.currentStep / workflow.steps.length) * 100),
                    next_action_at: workflow.nextActionAt,
                    next_task_id: workflow.nextTaskId,
                    retry_count: workflow.retryCount,
                    last_error: workflow.lastError,
                    final_error: workflow.finalError,
                    completed_at: workflow.completedAt,
                    failed_at: workflow.failedAt,
                    stopped_at: workflow.stoppedAt,
                    paused_at: workflow.pausedAt,
                    resumed_at: workflow.resumedAt,
                    execution_context: {
                        currentStep: workflow.currentStep,
                        nextActionAt: workflow.nextActionAt,
                        nextTaskId: workflow.nextTaskId,
                        retryCount: workflow.retryCount,
                        executionLog: workflow.executionLog.slice(-10) // Keep last 10 entries
                    }
                });
                
                console.log(`💾 Updated workflow in database: ${workflow.accountId}`);
            }
        } catch (error) {
            console.error(`❌ Failed to update workflow in database:`, error);
            // Don't throw - continue with in-memory operation
        }
    }

    async loadActiveWorkflows() {
        try {
            console.log(`📥 Loading active workflows from database...`);
            
            const workflowDb = require('./workflowDatabaseService');
            const dbWorkflows = await workflowDb.getWorkflowsForRecovery();
            
            console.log(`📥 Found ${dbWorkflows.length} workflows to recover`);
            
            for (const dbWorkflow of dbWorkflows) {
                try {
                    // Parse execution context
                    const executionContext = dbWorkflow.execution_context || {};
                    const executionLog = executionContext.executionLog || [];
                    
                    // Recreate workflow state
                    const workflow = {
                        accountId: dbWorkflow.account_id,
                        accountData: dbWorkflow.account_data,
                        workflowType: dbWorkflow.workflow_type,
                        status: dbWorkflow.status,
                        currentStep: dbWorkflow.current_step,
                        steps: dbWorkflow.steps,
                        startedAt: dbWorkflow.started_at,
                        lastActivity: dbWorkflow.last_activity_at,
                        nextActionAt: dbWorkflow.next_action_at,
                        nextTaskId: dbWorkflow.next_task_id,
                        executionLog: executionLog,
                        retryCount: dbWorkflow.retry_count,
                        maxRetries: dbWorkflow.max_retries,
                        dbId: dbWorkflow.id // Store DB ID for future updates
                    };
                    
                    // Add to active workflows
                    this.activeWorkflows.set(workflow.accountId, workflow);
                    
                    // Reschedule next action if needed
                    if (workflow.nextActionAt && workflow.status === 'active') {
                        const delay = new Date(workflow.nextActionAt).getTime() - Date.now();
                        if (delay > 0) {
                            this.scheduleNextAction(workflow);
                            console.log(`   🔄 Rescheduled workflow: ${workflow.accountId} (${this.formatDelay(delay)})`);
                        } else {
                            console.log(`   ⚡ Executing overdue action: ${workflow.accountId}`);
                            // Execute immediately for overdue actions
                            const currentStep = workflow.steps[workflow.currentStep];
                            if (currentStep) {
                                setTimeout(() => this.executeWorkflowStep(workflow, currentStep), 1000);
                            }
                        }
                    }
                    
                } catch (stepError) {
                    console.error(`❌ Failed to recover workflow ${dbWorkflow.account_id}:`, stepError);
                }
            }
            
            // Mark workflows as recovered
            if (dbWorkflows.length > 0) {
                const accountIds = dbWorkflows.map(w => w.account_id);
                await workflowDb.markWorkflowsAsRecovered(accountIds);
                
                this.stats.totalWorkflows = dbWorkflows.length;
                this.stats.activeWorkflows = this.activeWorkflows.size;
            }
            
            console.log(`✅ Recovered ${this.activeWorkflows.size} active workflows`);
            
        } catch (error) {
            console.error(`❌ Failed to load workflows from database:`, error);
            // Continue without recovery - new workflows can still be created
        }
    }

    async saveWorkflowStates() {
        try {
            console.log(`💾 Saving ${this.activeWorkflows.size} workflow states to database...`);
            
            let savedCount = 0;
            for (const workflow of this.activeWorkflows.values()) {
                try {
                    await this.updateWorkflowInDatabase(workflow);
                    savedCount++;
                } catch (error) {
                    console.error(`❌ Failed to save workflow ${workflow.accountId}:`, error);
                }
            }
            
            console.log(`✅ Saved ${savedCount} workflow states to database`);
        } catch (error) {
            console.error(`❌ Failed to save workflow states:`, error);
        }
    }

    /**
     * Cleanup completed workflows from memory
     */
    cleanupCompletedWorkflows() {
        const cutoffTime = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago
        let cleanedCount = 0;

        for (const [accountId, workflow] of this.activeWorkflows) {
            if (workflow.status === 'completed' && workflow.completedAt < cutoffTime) {
                this.activeWorkflows.delete(accountId);
                cleanedCount++;
            }
        }

        if (cleanedCount > 0) {
            console.log(`🧹 Cleaned up ${cleanedCount} completed workflows from memory`);
        }
    }
}

// Export singleton instance
module.exports = new WorkflowEngine();
