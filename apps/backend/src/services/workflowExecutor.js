// src/services/workflowExecutor.js - Robust Workflow Execution Engine
const EventEmitter = require('events');
const workflowDb = require('./workflowDatabaseService');
const taskScheduler = require('./taskScheduler');
const cronManager = require('./cronManager');
const flamebotActionsService = require('./flamebotActionsService');
const aiService = require('./aiService');

/**
 * Workflow Executor Service - Handles robust execution of automated workflows
 * Manages the complete automation flow after account import with error handling and recovery
 */
class WorkflowExecutor extends EventEmitter {
    constructor() {
        super();
        this.activeExecutions = new Map(); // executionId -> execution state
        this.workflowDefinitions = new Map(); // workflowType -> definition
        this.executionStats = {
            totalExecutions: 0,
            successfulExecutions: 0,
            failedExecutions: 0,
            retryCount: 0,
            averageExecutionTime: 0
        };
        this.isInitialized = false;

        console.log('🎯 Workflow Executor initialized');
    }

    /**
     * Initialize the workflow executor with predefined workflows
     */
    async initialize() {
        if (this.isInitialized) {
            console.log('⚠️ Workflow Executor already initialized');
            return;
        }

        console.log('🚀 Initializing Workflow Executor...');

        // Load workflow definitions
        await this.loadWorkflowDefinitions();

        // Setup event listeners
        this.setupEventListeners();

        // Recovery: Resume interrupted executions
        await this.recoverInterruptedExecutions();

        this.isInitialized = true;
        console.log('✅ Workflow Executor initialized successfully');
    }

    /**
     * Load execution from database if not in memory
     * @param {string} accountId - Account ID
     * @returns {Promise<Object|null>} Execution state
     */
    async loadExecutionFromDatabase(accountId) {
        try {
            console.log(`📥 Loading execution from database for account: ${accountId}`);
            
            // Get workflow instance from database
            const workflowInstance = await workflowDb.getWorkflowInstanceByAccountId(accountId);
            
            if (!workflowInstance || workflowInstance.status !== 'active') {
                console.log(`⚠️ No active workflow found in database for account: ${accountId}`);
                return null;
            }
            
            // Get workflow definition
            const workflowDef = this.workflowDefinitions.get(workflowInstance.workflow_type);
            if (!workflowDef) {
                // Try loading from database
                const dbDef = await workflowDb.getWorkflowDefinition(workflowInstance.workflow_type);
                if (dbDef) {
                    this.workflowDefinitions.set(dbDef.type, {
                        name: dbDef.name,
                        description: dbDef.description,
                        steps: dbDef.steps,
                        config: dbDef.config || {},
                        version: dbDef.version,
                        source: 'database'
                    });
                    workflowDef = this.workflowDefinitions.get(workflowInstance.workflow_type);
                } else {
                    throw new Error(`Workflow definition not found: ${workflowInstance.workflow_type}`);
                }
            }
            
            // Recreate execution state
            const execution = {
                executionId: `recovered_${accountId}_${Date.now()}`,
                accountId: accountId,
                accountData: workflowInstance.account_data,
                workflowType: workflowInstance.workflow_type,
                workflowDef: workflowDef,
                workflowInstanceId: workflowInstance.id,
                status: 'active',
                currentStep: workflowInstance.current_step,
                totalSteps: workflowInstance.total_steps,
                startedAt: new Date(workflowInstance.started_at),
                lastActivity: new Date(workflowInstance.last_activity_at),
                retryCount: workflowInstance.retry_count || 0,
                maxRetries: workflowDef.config?.maxRetries || 3,
                executionLog: [],
                scheduledTasks: new Map(),
                continuousSwipeTaskId: null
            };
            
            // Get execution log from database
            const logs = await workflowDb.getExecutionLog(workflowInstance.id, 10);
            execution.executionLog = logs.map(log => ({
                stepId: log.step_id,
                stepIndex: log.step_index,
                action: log.action,
                success: log.success,
                result: log.result,
                error: log.error_message,
                duration: log.duration_ms,
                timestamp: new Date(log.executed_at)
            }));
            
            // Add to active executions
            this.activeExecutions.set(accountId, execution);
            
            console.log(`✅ Execution loaded from database: ${execution.executionId}`);
            return execution;
            
        } catch (error) {
            console.error(`❌ Failed to load execution from database:`, error);
            return null;
        }
    }

    /**
     * Load workflow definitions into memory
     */
    async loadWorkflowDefinitions() {
        console.log('📚 Loading workflow definitions...');

        // Default workflow definitions (can be overridden from database)
        const defaultDefinitions = {
            'default': {
                name: 'Default Account Automation',
                description: 'Standard automation: 1h wait → prompt → 10 swipes → 20 swipes → 20 swipes → continuous → bio after 24h',
                maxRetries: 3,
                retryBackoffMs: 30000, // 30 seconds base
                timeoutMs: 600000, // 10 minutes per step
                steps: [
                    {
                        id: 'initial_wait',
                        action: 'wait',
                        delay: 60 * 60 * 1000, // 1 hour
                        description: 'Wait 1 hour after import',
                        critical: false
                    },
                    {
                        id: 'add_prompt',
                        action: 'add_prompt',
                        delay: 0,
                        description: 'Add AI-generated prompt',
                        critical: true,
                        timeout: 120000 // 2 minutes
                    },
                    {
                        id: 'pre_swipe_wait',
                        action: 'wait',
                        delay: 15 * 60 * 1000, // 15 minutes
                        description: 'Wait 15 minutes before first swipe',
                        critical: false
                    },
                    {
                        id: 'first_swipe_10',
                        action: 'swipe_with_spectre',
                        delay: 0,
                        swipeCount: 10,
                        description: 'First swipe session - 10 swipes',
                        critical: true,
                        timeout: 300000 // 5 minutes
                    },
                    {
                        id: 'inter_swipe_wait_1',
                        action: 'wait',
                        delay: 60 * 60 * 1000, // 1 hour
                        description: 'Wait 1 hour before second swipe',
                        critical: false
                    },
                    {
                        id: 'second_swipe_20',
                        action: 'swipe_with_spectre',
                        delay: 0,
                        swipeCount: 20,
                        description: 'Second swipe session - 20 swipes',
                        critical: true,
                        timeout: 300000 // 5 minutes
                    },
                    {
                        id: 'inter_swipe_wait_2',
                        action: 'wait',
                        delay: 60 * 60 * 1000, // 1 hour
                        description: 'Wait 1 hour before third swipe',
                        critical: false
                    },
                    {
                        id: 'third_swipe_20',
                        action: 'swipe_with_spectre',
                        delay: 0,
                        swipeCount: 20,
                        description: 'Third swipe session - 20 swipes',
                        critical: true,
                        timeout: 300000 // 5 minutes
                    },
                    {
                        id: 'continuous_swipe_activation',
                        action: 'activate_continuous_swipe',
                        delay: 0,
                        minSwipes: 20,
                        maxSwipes: 30,
                        minIntervalMs: 90 * 60 * 1000, // 90 minutes
                        maxIntervalMs: 180 * 60 * 1000, // 180 minutes
                        description: 'Activate continuous random swipes (20-30 every 90-180 min)',
                        critical: true,
                        timeout: 60000 // 1 minute setup
                    },
                    {
                        id: 'bio_after_24h',
                        action: 'add_bio',
                        delay: 24 * 60 * 60 * 1000, // 24 hours from start
                        description: 'Add AI-generated bio after 24 hours',
                        critical: false,
                        timeout: 120000 // 2 minutes
                    }
                ]
            },
            'aggressive': {
                name: 'Aggressive Account Automation',
                description: 'Faster automation for testing with reduced delays',
                maxRetries: 3,
                retryBackoffMs: 15000, // 15 seconds
                timeoutMs: 300000, // 5 minutes per step
                steps: [
                    {
                        id: 'quick_wait',
                        action: 'wait',
                        delay: 5 * 60 * 1000, // 5 minutes
                        description: 'Wait 5 minutes after import',
                        critical: false
                    },
                    {
                        id: 'add_prompt',
                        action: 'add_prompt',
                        delay: 0,
                        description: 'Add AI-generated prompt',
                        critical: true,
                        timeout: 120000
                    },
                    {
                        id: 'aggressive_swipe_15',
                        action: 'swipe_with_spectre',
                        delay: 0,
                        swipeCount: 15,
                        description: 'Aggressive swipe session - 15 swipes',
                        critical: true,
                        timeout: 300000
                    },
                    {
                        id: 'quick_bio',
                        action: 'add_bio',
                        delay: 60 * 60 * 1000, // 1 hour
                        description: 'Add bio after 1 hour',
                        critical: false,
                        timeout: 120000
                    },
                    {
                        id: 'aggressive_continuous',
                        action: 'activate_continuous_swipe',
                        delay: 0,
                        minSwipes: 25,
                        maxSwipes: 35,
                        minIntervalMs: 30 * 60 * 1000, // 30 minutes
                        maxIntervalMs: 60 * 60 * 1000, // 60 minutes
                        description: 'Aggressive continuous swipes (25-35 every 30-60 min)',
                        critical: true,
                        timeout: 60000
                    }
                ]
            },
            'test': {
                name: 'Test Workflow',
                description: 'Very fast workflow for development testing',
                maxRetries: 2,
                retryBackoffMs: 5000, // 5 seconds
                timeoutMs: 60000, // 1 minute per step
                steps: [
                    {
                        id: 'test_wait',
                        action: 'wait',
                        delay: 30 * 1000, // 30 seconds
                        description: 'Wait 30 seconds after import',
                        critical: false
                    },
                    {
                        id: 'test_prompt',
                        action: 'add_prompt',
                        delay: 0,
                        description: 'Add test prompt',
                        critical: true,
                        timeout: 60000
                    },
                    {
                        id: 'test_swipe',
                        action: 'swipe_with_spectre',
                        delay: 0,
                        swipeCount: 5,
                        description: 'Test swipe - 5 swipes',
                        critical: true,
                        timeout: 120000
                    },
                    {
                        id: 'test_bio',
                        action: 'add_bio',
                        delay: 2 * 60 * 1000, // 2 minutes
                        description: 'Add test bio after 2 minutes',
                        critical: false,
                        timeout: 60000
                    }
                ]
            }
        };

        // Load from database first, then use defaults for missing ones
        try {
            const dbDefinitions = await workflowDb.getAllWorkflowDefinitions();

            // Add database definitions
            for (const dbDef of dbDefinitions) {
                this.workflowDefinitions.set(dbDef.type, {
                    name: dbDef.name,
                    description: dbDef.description,
                    steps: dbDef.steps,
                    config: dbDef.config || {},
                    version: dbDef.version,
                    source: 'database'
                });
            }

            console.log(`   Loaded ${dbDefinitions.length} workflow definitions from database`);
        } catch (error) {
            console.error('⚠️ Failed to load from database, using defaults:', error);
        }

        // Add default definitions for missing types
        for (const [type, definition] of Object.entries(defaultDefinitions)) {
            if (!this.workflowDefinitions.has(type)) {
                this.workflowDefinitions.set(type, {
                    ...definition,
                    source: 'default'
                });
            }
        }

        console.log(`✅ Loaded ${this.workflowDefinitions.size} workflow definitions total`);
    }

    /**
     * Start workflow execution for a newly imported account
     * @param {string} accountId - Account ID
     * @param {Object} accountData - Account metadata
     * @param {string} workflowType - Workflow type to execute
     * @returns {Promise<Object>} Execution result
     */
    async startExecution(accountId, accountData, workflowType = 'default') {
        console.log(`\n🎯 Starting workflow execution: ${accountId}`);
        console.log(`   Workflow Type: ${workflowType}`);
        console.log(`   Account Data:`, accountData);

        try {
            // Validate workflow type
            const workflowDef = this.workflowDefinitions.get(workflowType);
            if (!workflowDef) {
                throw new Error(`Workflow type '${workflowType}' not found`);
            }

            // Check if execution already exists
            if (this.activeExecutions.has(accountId)) {
                console.log(`⚠️ Execution already active for account: ${accountId}`);
                return {
                    success: false,
                    error: 'Execution already active for this account'
                };
            }

            // Create workflow instance in database
            const workflowInstance = await workflowDb.createWorkflowInstance({
                workflowType,
                accountId,
                accountData,
                totalSteps: workflowDef.steps.length,
                executionContext: {
                    startedAt: new Date(),
                    currentStep: 0,
                    retryCount: 0,
                    maxRetries: workflowDef.maxRetries || 3
                }
            });

            // Create execution state
            const execution = {
                executionId: `exec_${accountId}_${Date.now()}`,
                accountId,
                accountData,
                workflowType,
                workflowDef,
                workflowInstanceId: workflowInstance.id,
                status: 'active',
                currentStep: 0,
                totalSteps: workflowDef.steps.length,
                startedAt: new Date(),
                lastActivity: new Date(),
                retryCount: 0,
                maxRetries: workflowDef.maxRetries || 3,
                executionLog: [],
                scheduledTasks: new Map(), // stepId -> taskId
                continuousSwipeTaskId: null
            };

            // Add to active executions
            this.activeExecutions.set(accountId, execution);
            this.executionStats.totalExecutions++;

            // Start first step
            await this.scheduleNextStep(execution);

            this.emit('execution:started', {
                accountId,
                executionId: execution.executionId,
                workflowType
            });

            console.log(`✅ Workflow execution started: ${execution.executionId}`);

            return {
                success: true,
                executionId: execution.executionId,
                workflowType,
                totalSteps: execution.totalSteps,
                estimatedDuration: this.calculateEstimatedDuration(workflowDef.steps)
            };

        } catch (error) {
            console.error(`❌ Failed to start execution for ${accountId}:`, error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Schedule the next step in workflow execution
     * @param {Object} execution - Execution state
     */
    async scheduleNextStep(execution) {
        if (execution.status !== 'active') {
            console.log(`⚠️ Execution not active: ${execution.accountId}`);
            return;
        }
    
        const currentStep = execution.workflowDef.steps[execution.currentStep];
        if (!currentStep) {
            // Workflow completed
            await this.completeExecution(execution);
            return;
        }
    
        console.log(`⏰ Scheduling step ${execution.currentStep + 1}/${execution.totalSteps}`);
        console.log(`   Step: ${currentStep.id} (${currentStep.description})`);
        console.log(`   Delay: ${this.formatDuration(currentStep.delay || 0)}`); // <- Asegurar que delay no sea undefined
    
        try {
            // FIX: Asegurar que el delay sea un número válido
            const delay = parseInt(currentStep.delay) || 0;
            const executeAt = new Date(Date.now() + delay);
            
            // Validar que la fecha sea válida
            if (isNaN(executeAt.getTime())) {
                console.error(`❌ Invalid execution time for step ${currentStep.id}. Delay: ${currentStep.delay}`);
                throw new Error(`Invalid delay value: ${currentStep.delay}`);
            }
    
            console.log(`   Execute at: ${executeAt.toISOString()}`);
    
            // Schedule task using TaskScheduler
            const taskId = await taskScheduler.scheduleTask({
                workflowInstanceId: execution.workflowInstanceId,
                stepId: currentStep.id,
                action: 'execute_workflow_step',
                scheduledFor: executeAt,
                payload: {
                    executionId: execution.executionId,
                    accountId: execution.accountId,
                    stepIndex: execution.currentStep,
                    stepConfig: currentStep,
                    workflowType: execution.workflowType
                },
                maxAttempts: execution.maxRetries
            });

            // Store task reference
            execution.scheduledTasks.set(currentStep.id, taskId);

            // Update database
            await workflowDb.updateWorkflowInstance(execution.accountId, {
                current_step: execution.currentStep,
                next_action_at: executeAt,
                next_task_id: taskId,
                progress_percentage: Math.round((execution.currentStep / execution.totalSteps) * 100)
            });

            console.log(`✅ Step scheduled: ${taskId} for ${executeAt.toLocaleString()}`);

        } catch (error) {
            console.error(`❌ Failed to schedule step:`, error);
            await this.handleExecutionError(execution, currentStep, error);
        }
    }

    /**
     * Execute a workflow step (called by TaskScheduler)
     * @param {Object} payload - Task payload from scheduler
     * @returns {Promise<Object>} Execution result
     */
    async executeWorkflowStep(payload) {
        const { executionId, accountId, stepIndex, stepConfig } = payload;

        console.log(`\n🎬 Executing workflow step: ${stepConfig.id}`);
        console.log(`   Account: ${accountId}`);
        console.log(`   Action: ${stepConfig.action}`);

        let execution = this.activeExecutions.get(accountId);
        
        // If not in memory, try to load from database
        if (!execution) {
            console.log(`⚠️ Execution not in memory, attempting to load from database...`);
            execution = await this.loadExecutionFromDatabase(accountId);
            
            if (!execution) {
                throw new Error(`Execution not found for account: ${accountId}`);
            }
        }

        const startTime = Date.now();
        let result = null;
        let success = false;

        try {
            // Set timeout for step execution
            const timeout = stepConfig.timeout || execution.workflowDef.config?.timeoutMs || 300000;
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error(`Step timeout after ${timeout}ms`)), timeout);
            });

            // Execute step with timeout
            const executionPromise = this.executeStepAction(execution, stepConfig);
            result = await Promise.race([executionPromise, timeoutPromise]);

            success = true;
            execution.retryCount = 0; // Reset retry count on success

            // Log success
            const logEntry = {
                stepId: stepConfig.id,
                stepIndex,
                action: stepConfig.action,
                success: true,
                result,
                duration: Date.now() - startTime,
                timestamp: new Date()
            };
            execution.executionLog.push(logEntry);

            // Save to database
            await workflowDb.addExecutionLog({
                workflowInstanceId: execution.workflowInstanceId,
                stepId: stepConfig.id,
                stepIndex,
                action: stepConfig.action,
                description: stepConfig.description,
                success: true,
                result,
                durationMs: Date.now() - startTime
            });

            console.log(`✅ Step completed: ${stepConfig.id} (${Date.now() - startTime}ms)`);

            // Move to next step (unless it's continuous swipe activation)
            if (stepConfig.action !== 'activate_continuous_swipe') {
                execution.currentStep++;
            }

            // Update last activity
            execution.lastActivity = new Date();

            // Schedule next step
            await this.scheduleNextStep(execution);

            this.emit('execution:step_completed', {
                accountId,
                executionId,
                stepId: stepConfig.id,
                result
            });

        } catch (error) {
            success = false;
            const errorMessage = error.message;

            console.error(`❌ Step failed: ${stepConfig.id}`, errorMessage);

            // Log failure
            const logEntry = {
                stepId: stepConfig.id,
                stepIndex,
                action: stepConfig.action,
                success: false,
                error: errorMessage,
                duration: Date.now() - startTime,
                timestamp: new Date()
            };
            execution.executionLog.push(logEntry);

            // Save to database
            await workflowDb.addExecutionLog({
                workflowInstanceId: execution.workflowInstanceId,
                stepId: stepConfig.id,
                stepIndex,
                action: stepConfig.action,
                description: stepConfig.description,
                success: false,
                errorMessage,
                durationMs: Date.now() - startTime
            });

            // Handle error (retry or fail)
            await this.handleExecutionError(execution, stepConfig, error);

            this.emit('execution:step_failed', {
                accountId,
                executionId,
                stepId: stepConfig.id,
                error: errorMessage
            });
        }

        return {
            success,
            result,
            duration: Date.now() - startTime
        };
    }

    /**
     * Execute individual step action
     * @param {Object} execution - Execution state
     * @param {Object} stepConfig - Step configuration
     * @returns {Promise<Object>} Step result
     */
    async executeStepAction(execution, stepConfig) {
        const { accountId, accountData } = execution;

        switch (stepConfig.action) {
            case 'wait':
                return {
                    action: 'wait',
                    duration: stepConfig.delay,
                    message: `Waited ${this.formatDuration(stepConfig.delay)}`
                };

            case 'add_prompt':
                console.log(`📝 Adding prompt for ${accountId}...`);
                const promptResult = await flamebotActionsService.updatePrompt(
                    accountId,
                    accountData.model,
                    accountData.channel || 'gram',
                    null // Generate new prompt
                );
                return {
                    action: 'add_prompt',
                    taskId: promptResult.taskId,
                    visibleText: promptResult.visibleText,
                    success: true
                };

            case 'add_bio':
                console.log(`📄 Adding bio for ${accountId}...`);
                const bioResult = await flamebotActionsService.updateBio(
                    accountId,
                    null // Generate new bio
                );
                return {
                    action: 'add_bio',
                    taskId: bioResult.taskId,
                    bioText: bioResult.generatedBio,
                    success: true
                };
            case 'swipe':
            case 'swipe_with_spectre':
                console.log(`💕 Executing swipe with Spectre (${stepConfig.swipeCount} swipes)...`);

                // First configure Spectre with the swipe count
                console.log(`👻 Configuring Spectre: ${stepConfig.swipeCount} max likes`);
                await flamebotActionsService.configureSpectreMode(
                    accountId,
                    stepConfig.swipeCount
                );

                // Wait for configuration to apply
                await new Promise(resolve => setTimeout(resolve, 3000));

                // Then start swipe task
                console.log(`🚀 Starting swipe task`);
                const swipeResult = await flamebotActionsService.startSwipeTask(
                    [accountId],
                    `Auto-swipe ${stepConfig.swipeCount} - ${stepConfig.id}`
                );

                return {
                    action: 'swipe_with_spectre',
                    swipeCount: stepConfig.swipeCount,
                    taskId: swipeResult.taskId,
                    spectreConfigured: true,
                    success: true
                };

            case 'activate_continuous_swipe':
                console.log(`🔄 Activating continuous swipe mode...`);
                const continuousTaskId = await this.activateContinuousSwipe(execution, stepConfig);

                // Store continuous swipe task ID
                execution.continuousSwipeTaskId = continuousTaskId;

                return {
                    action: 'activate_continuous_swipe',
                    continuousTaskId,
                    minSwipes: stepConfig.minSwipes,
                    maxSwipes: stepConfig.maxSwipes,
                    minInterval: stepConfig.minIntervalMs,
                    maxInterval: stepConfig.maxIntervalMs,
                    success: true
                };

                case 'continuous_swipe':
                    console.log(`🔄 Executing continuous swipe (${stepConfig.swipeCount || 'calculated'} swipes)...`);
                    
                    // Calculate random swipe count if not provided
                    const swipeCount = stepConfig.swipeCount || 
                        Math.floor(Math.random() * ((stepConfig.maxSwipes || 30) - (stepConfig.minSwipes || 20) + 1)) + (stepConfig.minSwipes || 20);
                    
                    // Configure Spectre with the swipe count
                    console.log(`👻 Configuring Spectre: ${swipeCount} max likes`);
                    await flamebotActionsService.configureSpectreMode(
                        accountId, 
                        swipeCount
                    );
                
                    // Wait for configuration to apply
                    await new Promise(resolve => setTimeout(resolve, 3000));
                
                    // Start swipe task
                    console.log(`🚀 Starting continuous swipe task`);
                    const continuousSwipeResult = await flamebotActionsService.startSwipeTask(
                        [accountId],
                        `Continuous-swipe ${swipeCount} - ${stepConfig.id}`
                    );
                
                    return {
                        action: 'continuous_swipe',
                        swipeCount: swipeCount,
                        taskId: continuousSwipeResult.taskId,
                        spectreConfigured: true,
                        success: true
                    };

            default:
                throw new Error(`Unknown step action: ${stepConfig.action}`);
        }
    }

    /**
     * Activate continuous swipe mode
     * @param {Object} execution - Execution state
     * @param {Object} stepConfig - Step configuration
     * @returns {Promise<string>} Continuous task ID
     */
    async activateContinuousSwipe(execution, stepConfig) {
        const { accountId } = execution;

        // Schedule first continuous swipe
        return await this.scheduleNextContinuousSwipe(execution, stepConfig);
    }

    /**
     * Schedule next continuous swipe
     * @param {Object} execution - Execution state
     * @param {Object} stepConfig - Step configuration
     * @returns {Promise<string>} Task ID
     */
    async scheduleNextContinuousSwipe(execution, stepConfig) {
        // Calculate random swipe count and interval
        const swipeCount = Math.floor(
            Math.random() * (stepConfig.maxSwipes - stepConfig.minSwipes + 1)
        ) + stepConfig.minSwipes;

        const interval = Math.floor(
            Math.random() * (stepConfig.maxIntervalMs - stepConfig.minIntervalMs)
        ) + stepConfig.minIntervalMs;

        const executeAt = new Date(Date.now() + interval);

        console.log(`🎲 Scheduling continuous swipe: ${swipeCount} swipes in ${this.formatDuration(interval)}`);

        // Schedule continuous swipe task
        const taskId = await taskScheduler.scheduleTask({
            workflowInstanceId: execution.workflowInstanceId,
            stepId: `${stepConfig.id}_continuous`,
            action: 'execute_continuous_swipe',
            scheduledFor: executeAt,
            payload: {
                executionId: execution.executionId,
                accountId: execution.accountId,
                swipeCount,
                stepConfig: stepConfig,
                nextSwipeScheduled: true
            },
            maxAttempts: 3
        });

        return taskId;
    }

    /**
     * Execute continuous swipe (called by TaskScheduler)
     * @param {Object} payload - Task payload
     * @returns {Promise<Object>} Execution result
     */
    async executeContinuousSwipe(payload) {
        const { executionId, accountId, swipeCount, stepConfig } = payload;

        console.log(`\n🔄 Executing continuous swipe: ${swipeCount} swipes for ${accountId}`);

        let execution = this.activeExecutions.get(accountId);
        
        // If not in memory, try to load from database
        if (!execution) {
            console.log(`⚠️ Execution not in memory, attempting to load from database...`);
            execution = await this.loadExecutionFromDatabase(accountId);
            
            if (!execution) {
                console.log(`⚠️ No active execution found for continuous swipe: ${accountId}`);
                return { success: false, message: 'Execution not found' };
            }
        }
        
        if (execution.status !== 'active') {
            console.log(`⚠️ Execution not active, skipping continuous swipe: ${accountId}`);
            return { success: false, message: 'Execution not active' };
        }

        try {
            // Configure Spectre with swipe count
            await flamebotActionsService.configureSpectreMode(accountId, swipeCount);

            // Wait for configuration
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Start swipe task
            const swipeResult = await flamebotActionsService.startSwipeTask(
                [accountId],
                `Continuous-swipe ${swipeCount} - ${Date.now()}`
            );

            // Schedule next continuous swipe
            const nextTaskId = await this.scheduleNextContinuousSwipe(execution, stepConfig);
            execution.continuousSwipeTaskId = nextTaskId;

            console.log(`✅ Continuous swipe executed: ${swipeCount} swipes, next in ${this.formatDuration(stepConfig.minIntervalMs)}-${this.formatDuration(stepConfig.maxIntervalMs)}`);

            return {
                success: true,
                action: 'continuous_swipe',
                swipeCount,
                taskId: swipeResult.taskId,
                nextTaskId
            };

        } catch (error) {
            console.error(`❌ Continuous swipe failed for ${accountId}:`, error);

            // Still schedule next attempt (with delay)
            try {
                const retryDelay = 30 * 60 * 1000; // 30 minutes retry delay
                const retryTaskId = await taskScheduler.scheduleTask({
                    workflowInstanceId: execution.workflowInstanceId,
                    stepId: `${stepConfig.id}_continuous_retry`,
                    action: 'execute_continuous_swipe',
                    scheduledFor: new Date(Date.now() + retryDelay),
                    payload: payload,
                    maxAttempts: 2
                });

                execution.continuousSwipeTaskId = retryTaskId;

            } catch (scheduleError) {
                console.error(`❌ Failed to schedule continuous swipe retry:`, scheduleError);
            }

            return {
                success: false,
                error: error.message,
                willRetry: true
            };
        }
    }

    /**
     * Handle execution error with retry logic
     * @param {Object} execution - Execution state
     * @param {Object} stepConfig - Failed step config
     * @param {Error} error - Error that occurred
     */
    async handleExecutionError(execution, stepConfig, error) {
        execution.retryCount++;
        execution.lastError = error.message;

        console.log(`🔄 Execution error handler: retry ${execution.retryCount}/${execution.maxRetries}`);

        if (execution.retryCount >= execution.maxRetries) {
            // Max retries reached
            if (stepConfig.critical) {
                // Critical step failed - fail entire execution
                console.error(`💥 Critical step failed, failing entire execution: ${execution.accountId}`);
                await this.failExecution(execution, error);
            } else {
                // Non-critical step - skip and continue
                console.log(`⚠️ Non-critical step failed, skipping: ${stepConfig.id}`);
                execution.currentStep++;
                execution.retryCount = 0; // Reset for next step
                await this.scheduleNextStep(execution);
            }
        } else {
            // Retry step with exponential backoff
            const backoffMs = execution.workflowDef.retryBackoffMs || 30000;
            const retryDelay = backoffMs * Math.pow(2, execution.retryCount - 1);
            const retryAt = new Date(Date.now() + retryDelay);

            console.log(`🔄 Scheduling retry ${execution.retryCount} in ${this.formatDuration(retryDelay)}`);

            try {
                const retryTaskId = await taskScheduler.scheduleTask({
                    workflowInstanceId: execution.workflowInstanceId,
                    stepId: `${stepConfig.id}_retry_${execution.retryCount}`,
                    action: 'execute_workflow_step',
                    scheduledFor: retryAt,
                    payload: {
                        executionId: execution.executionId,
                        accountId: execution.accountId,
                        stepIndex: execution.currentStep,
                        stepConfig: stepConfig,
                        workflowType: execution.workflowType,
                        isRetry: true,
                        retryAttempt: execution.retryCount
                    },
                    maxAttempts: 1 // Only one attempt for retry tasks
                });

                // Update database
                await workflowDb.updateWorkflowInstance(execution.accountId, {
                    next_action_at: retryAt,
                    next_task_id: retryTaskId,
                    retry_count: execution.retryCount,
                    last_error: error.message
                });

            } catch (scheduleError) {
                console.error(`❌ Failed to schedule retry:`, scheduleError);
                await this.failExecution(execution, scheduleError);
            }
        }
    }

    /**
     * Complete workflow execution
     * @param {Object} execution - Execution state
     */
    async completeExecution(execution) {
        console.log(`✅ Completing workflow execution: ${execution.accountId}`);

        execution.status = 'completed';
        execution.completedAt = new Date();

        this.executionStats.successfulExecutions++;
        this.updateAverageExecutionTime(Date.now() - execution.startedAt.getTime());

        // Update database
        await workflowDb.completeWorkflowInstance(execution.accountId);

        this.emit('execution:completed', {
            accountId: execution.accountId,
            executionId: execution.executionId,
            duration: execution.completedAt - execution.startedAt,
            totalSteps: execution.totalSteps
        });

        // Keep in memory for a short time for monitoring
        setTimeout(() => {
            this.activeExecutions.delete(execution.accountId);
        }, 10 * 60 * 1000); // 10 minutes
    }

    /**
     * Fail workflow execution
     * @param {Object} execution - Execution state
     * @param {Error} error - Final error
     */
    async failExecution(execution, error) {
        console.error(`❌ Failing workflow execution: ${execution.accountId}`);
        console.error(`   Error: ${error.message}`);

        execution.status = 'failed';
        execution.failedAt = new Date();
        execution.finalError = error.message;

        this.executionStats.failedExecutions++;

        // Cancel any scheduled tasks
        for (const taskId of execution.scheduledTasks.values()) {
            await taskScheduler.cancelTask(taskId);
        }

        // Cancel continuous swipe if active
        if (execution.continuousSwipeTaskId) {
            await taskScheduler.cancelTask(execution.continuousSwipeTaskId);
        }

        // Update database
        await workflowDb.failWorkflowInstance(execution.accountId, error.message);

        this.emit('execution:failed', {
            accountId: execution.accountId,
            executionId: execution.executionId,
            error: error.message,
            stepsCompleted: execution.currentStep
        });

        // Keep in memory longer for debugging
        setTimeout(() => {
            this.activeExecutions.delete(execution.accountId);
        }, 60 * 60 * 1000); // 1 hour
    }

    /**
     * Stop workflow execution
     * @param {string} accountId - Account ID
     * @returns {Promise<Object>} Stop result
     */
    async stopExecution(accountId) {
        const execution = this.activeExecutions.get(accountId);
        if (!execution) {
            return { success: false, error: 'Execution not found' };
        }

        console.log(`🛑 Stopping workflow execution: ${accountId}`);

        execution.status = 'stopped';
        execution.stoppedAt = new Date();

        // Cancel scheduled tasks
        for (const taskId of execution.scheduledTasks.values()) {
            await taskScheduler.cancelTask(taskId);
        }

        // Cancel continuous swipe
        if (execution.continuousSwipeTaskId) {
            await taskScheduler.cancelTask(execution.continuousSwipeTaskId);
        }

        // Update database
        await workflowDb.stopWorkflowInstance(accountId);

        this.emit('execution:stopped', {
            accountId,
            executionId: execution.executionId
        });

        return { success: true, message: 'Execution stopped' };
    }

    /**
     * Get execution status
     * @param {string} accountId - Account ID
     * @returns {Object|null} Execution status
     */
    getExecutionStatus(accountId) {
        const execution = this.activeExecutions.get(accountId);
        if (!execution) return null;

        return {
            executionId: execution.executionId,
            accountId: execution.accountId,
            workflowType: execution.workflowType,
            status: execution.status,
            currentStep: execution.currentStep,
            totalSteps: execution.totalSteps,
            progress: Math.round((execution.currentStep / execution.totalSteps) * 100),
            startedAt: execution.startedAt,
            lastActivity: execution.lastActivity,
            retryCount: execution.retryCount,
            maxRetries: execution.maxRetries,
            lastError: execution.lastError,
            nextStep: execution.workflowDef.steps[execution.currentStep],
            continuousSwipeActive: !!execution.continuousSwipeTaskId,
            executionLog: execution.executionLog.slice(-5) // Last 5 entries
        };
    }

    /**
     * Get all active executions
     * @returns {Array} Active executions
     */
    getAllActiveExecutions() {
        return Array.from(this.activeExecutions.values()).map(execution => ({
            executionId: execution.executionId,
            accountId: execution.accountId,
            workflowType: execution.workflowType,
            status: execution.status,
            progress: Math.round((execution.currentStep / execution.totalSteps) * 100),
            startedAt: execution.startedAt,
            lastActivity: execution.lastActivity
        }));
    }

    /**
     * Get executor statistics
     * @returns {Object} Statistics
     */
    getStatistics() {
        return {
            ...this.executionStats,
            activeExecutions: this.activeExecutions.size,
            availableWorkflows: this.workflowDefinitions.size,
            isInitialized: this.isInitialized
        };
    }

    /**
     * Recover interrupted executions on startup
     */
    async recoverInterruptedExecutions() {
        try {
            console.log('🔄 Recovering interrupted executions...');

            const activeWorkflows = await workflowDb.getActiveWorkflowInstances();
            console.log(`   Found ${activeWorkflows.length} active workflows to recover`);

            for (const workflow of activeWorkflows) {
                try {
                    // Recreate execution state
                    const workflowDef = this.workflowDefinitions.get(workflow.workflow_type);
                    if (!workflowDef) {
                        console.log(`⚠️ Workflow definition not found: ${workflow.workflow_type}, skipping recovery`);
                        await workflowDb.failWorkflowInstance(workflow.account_id, 'Workflow definition not found during recovery');
                        continue;
                    }

                    const execution = {
                        executionId: `recovered_${workflow.account_id}_${Date.now()}`,
                        accountId: workflow.account_id,
                        accountData: workflow.account_data,
                        workflowType: workflow.workflow_type,
                        workflowDef,
                        workflowInstanceId: workflow.id,
                        status: 'active',
                        currentStep: workflow.current_step,
                        totalSteps: workflow.total_steps,
                        startedAt: workflow.started_at,
                        lastActivity: workflow.last_activity_at,
                        retryCount: workflow.retry_count || 0,
                        maxRetries: workflowDef.maxRetries || 3,
                        executionLog: [],
                        scheduledTasks: new Map(),
                        continuousSwipeTaskId: null
                    };

                    // Add to active executions
                    this.activeExecutions.set(execution.accountId, execution);

                    // Resume from current step
                    if (execution.currentStep < execution.totalSteps) {
                        await this.scheduleNextStep(execution);
                        console.log(`   ✅ Recovered execution: ${execution.accountId} (step ${execution.currentStep})`);
                    } else {
                        // Execution was completed
                        await this.completeExecution(execution);
                    }

                } catch (recoverError) {
                    console.error(`❌ Failed to recover execution ${workflow.account_id}:`, recoverError);
                    await workflowDb.failWorkflowInstance(workflow.account_id, `Recovery failed: ${recoverError.message}`);
                }
            }

            console.log(`✅ Recovery completed: ${this.activeExecutions.size} executions recovered`);

        } catch (error) {
            console.error('❌ Recovery process failed:', error);
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Listen to task scheduler events
        taskScheduler.on('task:completed', (data) => {
            if (data.metadata && data.metadata.action === 'execute_workflow_step') {
                console.log(`📊 Workflow step task completed: ${data.taskId}`);
            }
        });

        taskScheduler.on('task:failed', (data) => {
            if (data.metadata && data.metadata.action === 'execute_workflow_step') {
                console.error(`📊 Workflow step task failed: ${data.taskId}`, data.error);
            }
        });
    }

    /**
     * Utility functions
     */
    formatDuration(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
        if (hours > 0) return `${hours}h ${minutes % 60}m`;
        if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
        return `${seconds}s`;
    }

    calculateEstimatedDuration(steps) {
        return steps.reduce((total, step) => total + (step.delay || 0), 0);
    }

    updateAverageExecutionTime(duration) {
        const total = this.executionStats.successfulExecutions;
        if (total === 1) {
            this.executionStats.averageExecutionTime = duration;
        } else {
            this.executionStats.averageExecutionTime =
                ((this.executionStats.averageExecutionTime * (total - 1)) + duration) / total;
        }
    }
}

// Export singleton instance
module.exports = new WorkflowExecutor();
