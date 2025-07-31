// src/services/workflowExecutorRefactored.js - Refactored Workflow Executor using DI and Specialized Services

const EventEmitter = require("events");

/**
 * WorkflowExecutor - Refactored to use dependency injection and specialized services
 * Now acts as a coordinator/orchestrator instead of doing everything itself
 * Follows Single Responsibility Principle and Dependency Inversion Principle
 */
class WorkflowExecutor extends EventEmitter {
  constructor(
    executionService,
    schedulingService, 
    monitoringService,
    recoveryService,
    workflowDatabaseService,
    taskScheduler
  ) {
    super();
    
    // Injected dependencies
    this.executionService = executionService;
    this.schedulingService = schedulingService;
    this.monitoringService = monitoringService;
    this.recoveryService = recoveryService;
    this.workflowDb = workflowDatabaseService;
    this.taskScheduler = taskScheduler;
    
    // Core state (minimal)
    this.workflowDefinitions = new Map(); // workflowType -> definition
    this.isInitialized = false;
    this.eventListenersSetup = false;

    console.log("🎯 Workflow Executor (Refactored) initialized with dependency injection");
  }

  /**
   * Initialize the workflow executor
   */
  async initialize() {
    if (this.isInitialized) {
      console.log("⚠️ Workflow Executor already initialized");
      return;
    }

    console.log("🚀 Initializing Workflow Executor...");

    try {
      // Load workflow definitions
      await this.loadWorkflowDefinitions();

      // Setup event listeners (only once)
      if (!this.eventListenersSetup) {
        this.setupEventListeners();
        this.eventListenersSetup = true;
      }

      // Delegate recovery to specialized service
      await this.recoveryService.recoverInterruptedExecutions();

      this.isInitialized = true;
      console.log("✅ Workflow Executor initialized successfully");

    } catch (error) {
      console.error("❌ Failed to initialize Workflow Executor:", error);
      throw error;
    }
  }

  /**
   * Start workflow execution
   * @param {string} accountId - Account ID
   * @param {Object} accountData - Account data
   * @param {string} workflowType - Workflow type
   * @returns {Promise<Object>} Execution result
   */
  async startExecution(accountId, accountData, workflowType) {
    console.log(`🚀 Starting workflow execution: ${workflowType} for account ${accountId}`);

    try {
      // Get workflow definition
      const workflowDef = this.workflowDefinitions.get(workflowType);
      if (!workflowDef) {
        throw new Error(`Workflow definition not found: ${workflowType}`);
      }

      // Create execution context
      const execution = {
        accountId,
        workflowType,
        accountData,
        workflowDef,
        currentStep: 0,
        totalSteps: workflowDef.steps.length,
        startTime: Date.now(),
        retryCount: 0,
        executionContext: {},
        scheduledTasks: new Map()
      };

      // Start monitoring
      this.monitoringService.startMonitoring(accountId, {
        accountId,
        workflowType,
        totalSteps: execution.totalSteps
      });

      // Store execution using safe method
      await this.safeSetExecution(accountId, execution);

      // Create workflow instance in database
      await this.workflowDb.createWorkflowInstance({
        accountId,
        workflowType,
        accountData,
        totalSteps: execution.totalSteps,
        executionContext: execution.executionContext,
        status: 'running'
      });

      // Start first step
      await this.processNextStep(execution);

      this.emit('execution:started', {
        accountId,
        workflowType,
        startTime: execution.startTime
      });

      console.log(`✅ Workflow execution started successfully: ${accountId}`);
      return { success: true, executionId: accountId };

    } catch (error) {
      console.error(`❌ Failed to start workflow execution for ${accountId}:`, error);
      
      // Update monitoring
      this.monitoringService.completeExecution(accountId, false, error.message);
      
      this.emit('execution:failed', {
        accountId,
        workflowType,
        error: error.message
      });
      
      throw error;
    }
  }

  /**
   * Process next step in workflow
   * @param {Object} execution - Execution context
   */
  async processNextStep(execution) {
    const { currentStep, workflowDef, accountId } = execution;

    // Check if workflow is complete
    if (currentStep >= workflowDef.steps.length) {
      await this.completeExecution(execution);
      return;
    }

    const stepConfig = workflowDef.steps[currentStep];
    console.log(`📋 Processing step ${currentStep + 1}/${workflowDef.steps.length}: ${stepConfig.id} for ${accountId}`);

    try {
      // Update monitoring progress
      this.monitoringService.updateExecutionProgress(accountId, {
        currentStep: currentStep + 1,
        status: 'processing_step'
      });

      // Execute step using specialized service
      const stepResult = await this.executeStep(execution, stepConfig);

      // Update execution context
      execution.executionContext[stepConfig.id] = stepResult;
      
      // Handle goto action - currentStep was already updated by executeGoto
      if (stepConfig.action === 'goto') {
        console.log(`🔄 Goto executed: currentStep set to ${execution.currentStep}`);
      } else {
        // Normal step progression
        execution.currentStep++;
      }

      // Update monitoring with completed step
      this.monitoringService.updateExecutionProgress(accountId, {
        currentStep: execution.currentStep,
        completedStep: {
          stepId: stepConfig.id,
          action: stepConfig.action,
          duration: stepResult.duration || 0,
          success: stepResult.success
        }
      });

      // Schedule next step if not complete
      if (execution.currentStep < workflowDef.steps.length) {
        const nextStep = workflowDef.steps[execution.currentStep];
        
        // Use scheduling service
        const taskId = await this.schedulingService.scheduleNextStep(
          execution, 
          nextStep, 
          execution.currentStep
        );

        // Update database
        await this.workflowDb.updateWorkflowInstance(accountId, {
          current_step: execution.currentStep,
          next_action_at: new Date(Date.now() + (nextStep.delay || 0)),
          next_task_id: taskId,
          progress_percentage: Math.round((execution.currentStep / execution.totalSteps) * 100),
          execution_context: execution.executionContext
        });
      } else {
        // Workflow complete
        await this.completeExecution(execution);
      }

    } catch (error) {
      console.error(`❌ Step ${stepConfig.id} failed for ${accountId}:`, error);
      await this.handleStepFailure(execution, stepConfig, error);
    }
  }

  /**
   * Execute a single workflow step
   * @param {Object} execution - Execution context
   * @param {Object} stepConfig - Step configuration
   * @returns {Promise<Object>} Step result
   */
  async executeStep(execution, stepConfig) {
    const startTime = Date.now();

    try {
      // Get dynamic timeout
      const timeout = this.getDynamicTimeout(stepConfig, execution.workflowDef.config);
      
      // Create timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(
          () => reject(new Error(`Step '${stepConfig.action}' timeout after ${timeout}ms`)),
          timeout
        );
      });

      // Execute step using specialized execution service
      const executionPromise = this.executionService.executeStepAction(execution, stepConfig);

      // Race between execution and timeout
      const result = await Promise.race([executionPromise, timeoutPromise]);

      const duration = Date.now() - startTime;
      
      return {
        ...result,
        duration,
        success: true
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      
      return {
        success: false,
        error: error.message,
        duration
      };
    }
  }

  /**
   * Handle step failure
   * @param {Object} execution - Execution context
   * @param {Object} stepConfig - Failed step configuration
   * @param {Error} error - The error that occurred
   */
  async handleStepFailure(execution, stepConfig, error) {
    const { accountId, workflowDef } = execution;
    const maxRetries = workflowDef.config?.maxRetries || 3;

    console.log(`🔄 Handling step failure for ${accountId} - Retry ${execution.retryCount}/${maxRetries}`);

    // Record retry in monitoring
    this.monitoringService.recordRetry(accountId, execution.retryCount + 1, error.message);

    if (execution.retryCount < maxRetries) {
      // Schedule retry using scheduling service
      execution.retryCount++;
      
      const retryTaskId = await this.schedulingService.scheduleWorkflowRetry(
        execution, 
        error, 
        execution.retryCount
      );

      // Update database
      await this.workflowDb.updateWorkflowInstance(accountId, {
        retry_count: execution.retryCount,
        last_error: error.message,
        next_task_id: retryTaskId
      });

      console.log(`🔄 Scheduled retry ${execution.retryCount} for ${accountId}`);

    } else {
      // Max retries reached, fail execution
      await this.failExecution(execution, error);
    }
  }

  /**
   * Complete workflow execution successfully
   * @param {Object} execution - Execution context
   */
  async completeExecution(execution) {
    const { accountId, workflowType } = execution;
    const duration = Date.now() - execution.startTime;

    console.log(`✅ Completing workflow execution for ${accountId} - Duration: ${duration}ms`);

    try {
      // Update database
      await this.workflowDb.updateWorkflowInstance(accountId, {
        status: 'completed',
        completed_at: new Date(),
        progress_percentage: 100
      });

      // Complete monitoring
      this.monitoringService.completeExecution(accountId, true);

      // Clean up active execution
      await this.safeDeleteExecution(accountId);

      this.emit('execution:completed', {
        accountId,
        workflowType,
        duration,
        success: true
      });

      console.log(`🎉 Workflow execution completed successfully: ${accountId}`);

    } catch (error) {
      console.error(`❌ Failed to complete execution for ${accountId}:`, error);
      await this.failExecution(execution, error);
    }
  }

  /**
   * Fail workflow execution
   * @param {Object} execution - Execution context
   * @param {Error} error - The error that caused failure
   */
  async failExecution(execution, error) {
    const { accountId, workflowType } = execution;
    const duration = Date.now() - execution.startTime;

    console.log(`❌ Failing workflow execution for ${accountId}: ${error.message}`);

    try {
      // Update database
      await this.workflowDb.updateWorkflowInstance(accountId, {
        status: 'failed',
        completed_at: new Date(),
        last_error: error.message
      });

      // Complete monitoring
      this.monitoringService.completeExecution(accountId, false, error.message);

      // Clean up active execution
      await this.safeDeleteExecution(accountId);

      this.emit('execution:failed', {
        accountId,
        workflowType,
        duration,
        error: error.message
      });

      console.log(`💥 Workflow execution failed: ${accountId}`);

    } catch (updateError) {
      console.error(`❌ Failed to update failed execution for ${accountId}:`, updateError);
    }
  }

  /**
   * Get dynamic timeout based on step action type
   * @param {Object} stepConfig - Step configuration
   * @param {Object} workflowConfig - Workflow configuration  
   * @returns {number} Timeout in milliseconds
   */
  getDynamicTimeout(stepConfig, workflowConfig) {
    // Custom timeout for step takes priority
    if (stepConfig.timeout) {
      return stepConfig.timeout;
    }

    // Dynamic timeouts based on action type
    const actionTimeouts = {
      'add_bio': 120000, // 2 minutes
      'add_prompt': 90000, // 1.5 minutes
      'swipe': 180000, // 3 minutes  
      'swipe_with_spectre': 300000, // 5 minutes
      'wait': Math.min((stepConfig.delay || 0) + 30000, 600000), // delay + 30s buffer, max 10min
      'default': 120000 // 2 minutes
    };

    const actionTimeout = actionTimeouts[stepConfig.action] || actionTimeouts['default'];
    const workflowTimeout = workflowConfig?.timeoutMs || 600000; // 10 minutes max
    
    return Math.min(actionTimeout, workflowTimeout);
  }

  /**
   * Setup event listeners for coordination
   */
  setupEventListeners() {
    // Listen to recovery service
    this.recoveryService.on('workflow:recovery_ready', async (recoveryData) => {
      console.log(`🔧 Recovered workflow ready: ${recoveryData.accountId}`);
      
      try {
        // Resume execution from where it left off
        await this.resumeExecution(recoveryData);
      } catch (error) {
        console.error(`❌ Failed to resume recovered workflow ${recoveryData.accountId}:`, error);
      }
    });

    // Listen to task scheduler for step completion
    this.taskScheduler.on("task:completed", (data) => {
      if (data.metadata && data.metadata.action === "execute_workflow_step") {
        console.log(`📊 Workflow step task completed: ${data.taskId}`);
        // Task completion is handled by the main workflow flow
      }
    });

    this.taskScheduler.on("task:failed", (data) => {
      if (data.metadata && data.metadata.action === "execute_workflow_step") {
        console.error(`📊 Workflow step task failed: ${data.taskId}`, data.error);
        // Task failure handling would be implemented here
      }
    });

    console.log("👂 Event listeners setup completed");
  }

  /**
   * Resume execution from recovery
   * @param {Object} recoveryData - Recovery data from recovery service
   */
  async resumeExecution(recoveryData) {
    const { accountId, workflowType, executionContext, accountData, currentStep, retryCount } = recoveryData;

    console.log(`🔄 Resuming execution for ${accountId} from step ${currentStep}`);

    // Recreate execution context
    const workflowDef = this.workflowDefinitions.get(workflowType);
    if (!workflowDef) {
      throw new Error(`Workflow definition not found: ${workflowType}`);
    }

    const execution = {
      accountId,
      workflowType,
      accountData,
      workflowDef,
      currentStep,
      totalSteps: workflowDef.steps.length,
      startTime: Date.now(), // New start time for resumed execution
      retryCount,
      executionContext: executionContext || {},
      scheduledTasks: new Map()
    };

    // Resume monitoring
    this.monitoringService.startMonitoring(accountId, {
      accountId,
      workflowType,
      totalSteps: execution.totalSteps
    });

    // Store execution
    await this.safeSetExecution(accountId, execution);

    // Continue from current step
    await this.processNextStep(execution);
  }

  /**
   * Load workflow definitions
   */
  async loadWorkflowDefinitions() {
    console.log("📋 Loading workflow definitions from database...");
    
    try {
      // Get all active workflow definitions from database
      const definitions = await this.workflowDb.getAllWorkflowDefinitions();
      
      console.log(`📊 Found ${definitions.length} definitions in database`);
      
      // Clear existing definitions
      this.workflowDefinitions.clear();
      
      // Load each definition into memory
      for (const def of definitions) {
        this.workflowDefinitions.set(def.type, def);
        console.log(`✅ Loaded workflow: ${def.type} - ${def.name}`);
      }
      
      console.log(`✅ Loaded ${this.workflowDefinitions.size} workflow definitions`);
      
      // Debug: show all loaded types
      const loadedTypes = Array.from(this.workflowDefinitions.keys());
      console.log(`📋 Available workflow types: ${loadedTypes.join(', ')}`);
      
    } catch (error) {
      console.error("❌ Error loading workflow definitions:", error);
      throw error;
    }
  }

  /**
   * Get comprehensive statistics
   * @returns {Object} Combined statistics from all services
   */
  getStatistics() {
    const monitoringStats = this.monitoringService.getMonitoringStats();
    
    return {
      isInitialized: this.isInitialized,
      activeExecutions: this.activeExecutions?.size || 0,
      workflowDefinitions: this.workflowDefinitions.size,
      totalExecutions: monitoringStats.totalExecutions || 0,
      successfulExecutions: monitoringStats.successfulExecutions || 0,
      failedExecutions: monitoringStats.failedExecutions || 0,
      executor: {
        isInitialized: this.isInitialized,
        activeExecutions: this.activeExecutions?.size || 0,
        workflowDefinitions: this.workflowDefinitions.size
      },
      execution: this.executionService.getExecutionStats(),
      scheduling: this.schedulingService.getSchedulingStats(),
      monitoring: monitoringStats,
      recovery: this.recoveryService.getRecoveryStats()
    };
  }

  /**
   * Stop workflow execution
   * @param {string} accountId - Account ID
   * @returns {Promise<Object>} Result
   */
  async stopExecution(accountId) {
    console.log(`🛑 Stopping workflow execution for ${accountId}`);
    
    try {
      const execution = await this.safeGetExecution(accountId);
      if (!execution) {
        return { success: false, error: "Execution not found" };
      }

      // Cancel any scheduled tasks
      for (const [taskId] of execution.scheduledTasks) {
        await this.taskScheduler.cancelTask(taskId);
      }

      // Update database
      await this.workflowDb.updateWorkflowInstance(accountId, {
        status: 'stopped',
        completed_at: new Date()
      });

      // Complete monitoring
      this.monitoringService.completeExecution(accountId, false, 'Manually stopped');

      // Clean up active execution
      await this.safeDeleteExecution(accountId);

      this.emit('execution:stopped', {
        accountId,
        stoppedAt: new Date()
      });

      console.log(`✅ Workflow execution stopped: ${accountId}`);
      return { success: true };

    } catch (error) {
      console.error(`❌ Failed to stop execution for ${accountId}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get execution status
   * @param {string} accountId - Account ID
   * @returns {Object|null} Status object or null
   */
  getExecutionStatus(accountId) {
    const execution = this.activeExecutions?.get(accountId);
    if (!execution) {
      return null;
    }

    return {
      accountId,
      workflowType: execution.workflowType,
      status: 'active',
      progress: Math.round((execution.currentStep / execution.totalSteps) * 100),
      currentStep: execution.currentStep,
      totalSteps: execution.totalSteps,
      startedAt: new Date(execution.startTime),
      nextStep: execution.currentStep < execution.totalSteps ? 
        execution.workflowDef.steps[execution.currentStep] : null
    };
  }

  /**
   * Get all active executions
   * @returns {Array} Array of execution status objects
   */
  getAllActiveExecutions() {
    if (!this.activeExecutions) {
      return [];
    }

    const executions = [];
    for (const [accountId] of this.activeExecutions) {
      const status = this.getExecutionStatus(accountId);
      if (status) {
        executions.push(status);
      }
    }
    return executions;
  }

  /**
   * Execute workflow step (for TaskScheduler)
   * @param {Object} payload - Step payload
   * @returns {Promise<Object>} Result
   */
  async executeWorkflowStep(payload) {
    const { accountId } = payload;
    console.log(`🎯 Executing workflow step for ${accountId}`);

    try {
      const execution = await this.safeGetExecution(accountId);
      if (!execution) {
        throw new Error(`Execution not found: ${accountId}`);
      }

      // Process next step
      await this.processNextStep(execution);
      
      return { success: true };

    } catch (error) {
      console.error(`❌ Failed to execute workflow step for ${accountId}:`, error);
      return { success: false, error: error.message };
    }
  }


  // Safe execution methods (inherited from original)
  async safeGetExecution(executionId) {
    return this.activeExecutions?.get(executionId) || null;
  }

  async safeSetExecution(executionId, execution) {
    if (!this.activeExecutions) {
      this.activeExecutions = new Map();
    }
    this.activeExecutions.set(executionId, execution);
  }

  async safeDeleteExecution(executionId) {
    if (this.activeExecutions) {
      this.activeExecutions.delete(executionId);
    }
  }
}

module.exports = WorkflowExecutor;