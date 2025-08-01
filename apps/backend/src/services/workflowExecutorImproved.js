// src/services/workflowExecutorImproved.js - Fully Database-First Workflow Executor

const EventEmitter = require("events");

/**
 * WorkflowExecutorImproved - Complete DATABASE-FIRST implementation
 * - No in-memory Maps
 * - Distributed locking for race condition prevention
 * - Configurable goto loop limits
 * - Database-driven timeouts and configurations
 * - Proper error handling and resource cleanup
 * - Transaction protection for critical operations
 */
class WorkflowExecutorImproved extends EventEmitter {
  constructor(
    executionService,
    schedulingService, 
    monitoringService,
    recoveryService,
    workflowDatabaseService,
    taskScheduler,
    systemConfigService,
    lockService,
    cleanupService
  ) {
    super();
    
    // Injected dependencies
    this.executionService = executionService;
    this.schedulingService = schedulingService;
    this.monitoringService = monitoringService;
    this.recoveryService = recoveryService;
    this.workflowDb = workflowDatabaseService;
    this.taskScheduler = taskScheduler;
    this.systemConfig = systemConfigService;
    this.lockService = lockService;
    this.cleanupService = cleanupService;
    
    // 🚀 DATABASE-FIRST: No in-memory state
    this.isInitialized = false;
    this.eventListenersSetup = false;

    console.log("🎯 Workflow Executor (Improved Database-First) initialized");
  }

  /**
   * Initialize the workflow executor
   */
  async initialize() {
    if (this.isInitialized) {
      console.log("⚠️ Workflow Executor already initialized");
      return;
    }

    console.log("🚀 Initializing Improved Workflow Executor...");

    try {
      // Setup event listeners (only once)
      if (!this.eventListenersSetup) {
        this.setupEventListeners();
        this.eventListenersSetup = true;
      }

      // Start cleanup service
      await this.cleanupService.start();

      // Delegate recovery to specialized service
      await this.recoveryService.recoverInterruptedExecutions();

      this.isInitialized = true;
      console.log("✅ Improved Workflow Executor initialized successfully");

    } catch (error) {
      console.error("❌ Failed to initialize Improved Workflow Executor:", error);
      throw error;
    }
  }

  /**
   * Start workflow execution with distributed locking
   * @param {string} accountId - Account ID
   * @param {Object} accountData - Account data
   * @param {string} workflowType - Workflow type
   * @returns {Promise<Object>} Execution result
   */
  async startExecution(accountId, accountData, workflowType) {
    console.log(`🚀 Starting workflow execution: ${workflowType} for account ${accountId}`);

    try {
      // Use distributed lock to prevent multiple executions for same account
      return await this.lockService.withLock(`workflow:${accountId}:start`, async () => {
        // Get workflow definition from database
        const workflowDef = await this.workflowDb.getWorkflowDefinition(workflowType);
        if (!workflowDef) {
          throw new Error(`Workflow definition not found: ${workflowType}`);
        }

        // Create workflow instance in database (with transaction protection)
        const workflowInstance = await this.workflowDb.createWorkflowInstance({
          accountId,
          workflowType,
          accountData,
          totalSteps: workflowDef.steps.length,
          executionContext: {}
        });

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
          workflowInstanceId: workflowInstance.id
        };

        // Start monitoring
        this.monitoringService.startMonitoring(accountId, {
          accountId,
          workflowType,
          totalSteps: execution.totalSteps
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
      });

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
   * Process next step in workflow with distributed locking
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
      // Use distributed lock for step execution
      await this.lockService.executeStepWithLock(accountId, async () => {
        // Update monitoring progress
        this.monitoringService.updateExecutionProgress(accountId, {
          currentStep: currentStep + 1,
          status: 'processing_step'
        });

        // Execute step using specialized service
        const stepResult = await this.executeStep(execution, stepConfig);

        // Update execution context
        execution.executionContext[stepConfig.id] = stepResult;
        
        // Handle goto action with loop tracking
        if (stepConfig.action === 'goto') {
          await this.handleGotoStep(execution, stepConfig, stepResult);
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
      });

    } catch (error) {
      console.error(`❌ Step ${stepConfig.id} failed for ${accountId}:`, error);
      await this.handleStepFailure(execution, stepConfig, error);
    }
  }

  /**
   * Execute a single workflow step with database configuration
   * @param {Object} execution - Execution context
   * @param {Object} stepConfig - Step configuration
   * @returns {Promise<Object>} Step result
   */
  async executeStep(execution, stepConfig) {
    const startTime = Date.now();

    try {
      // Get dynamic timeout from database configuration
      const timeout = await this.systemConfig.getWorkflowTimeout(stepConfig.action);
      
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
   * Handle goto step with configurable loop tracking and limits
   * @param {Object} execution - Execution context
   * @param {Object} stepConfig - Goto step configuration
   * @param {Object} stepResult - Step execution result
   */
  async handleGotoStep(execution, stepConfig, stepResult) {
    const { accountId, workflowDef } = execution;
    const targetStepId = stepConfig.nextStep;
    
    // Get goto limits configuration from database
    const gotoConfig = await this.systemConfig.getGotoLimitsConfig();
    
    // Find target step index
    const targetStepIndex = workflowDef.steps.findIndex(step => step.id === targetStepId);
    if (targetStepIndex === -1) {
      throw new Error(`Target step not found: ${targetStepId}`);
    }
    
    // Get current goto iterations from database
    const workflowInstance = await this.workflowDb.getWorkflowInstanceByAccountId(accountId);
    const gotoIterations = workflowInstance.goto_iterations || {};
    
    // Track iterations for this goto step
    const gotoKey = `${stepConfig.id}_to_${targetStepId}`;
    const currentIterations = gotoIterations[gotoKey] || 0;
    const maxIterations = stepConfig.maxIterations || gotoConfig.defaultMaxIterations;
    
    // Check if infinite loops are allowed
    const infiniteAllowed = stepConfig.infiniteAllowed !== undefined ? 
      stepConfig.infiniteAllowed : gotoConfig.infiniteAllowed;
    
    if (!infiniteAllowed && currentIterations >= maxIterations) {
      throw new Error(`Goto loop limit exceeded: ${gotoKey} (${currentIterations}/${maxIterations})`);
    }
    
    // Update iteration count
    gotoIterations[gotoKey] = currentIterations + 1;
    
    // Update execution with new step and goto tracking
    execution.currentStep = targetStepIndex;
    
    // Update database with new current step and goto iterations
    await this.workflowDb.updateWorkflowInstance(accountId, {
      current_step: targetStepIndex,
      goto_iterations: gotoIterations,
      execution_context: {
        ...execution.executionContext,
        lastGoto: {
          from: stepConfig.id,
          to: targetStepId,
          iteration: gotoIterations[gotoKey],
          timestamp: new Date().toISOString()
        }
      }
    });
    
    console.log(`🔄 Goto executed: ${stepConfig.id} -> ${targetStepId} (iteration ${gotoIterations[gotoKey]})`);
    
    // Emit goto event for monitoring
    this.emit('step:goto', {
      accountId,
      fromStep: stepConfig.id,
      toStep: targetStepId,
      iteration: gotoIterations[gotoKey],
      maxIterations: infiniteAllowed ? 'infinite' : maxIterations
    });
  }

  /**
   * Handle step failure with database configuration
   * @param {Object} execution - Execution context
   * @param {Object} stepConfig - Failed step configuration
   * @param {Error} error - The error that occurred
   */
  async handleStepFailure(execution, stepConfig, error) {
    const { accountId, workflowDef } = execution;
    
    // Get retry config from database
    const retryConfig = await this.systemConfig.getRetryConfig();
    const maxRetries = workflowDef.config?.maxRetries || retryConfig.maxRetries;

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
   * Pause workflow execution with distributed locking
   * @param {string} accountId - Account ID
   * @returns {Promise<Object>} Pause result
   */
  async pauseExecution(accountId) {
    console.log(`⏸️ Pausing workflow execution for ${accountId}`);
    
    try {
      return await this.lockService.pauseWorkflowWithLock(accountId, async () => {
        // Use transaction-protected pause
        const updateResult = await this.workflowDb.pauseWorkflowInstance(accountId);

        if (!updateResult) {
          throw new Error("Workflow instance not found or cannot be paused");
        }

        // Cancel any scheduled tasks
        if (updateResult.next_task_id) {
          await this.schedulingService.cancelScheduledTask(updateResult.next_task_id);
          console.log(`📅 Cancelled scheduled task: ${updateResult.next_task_id}`);
        }

        // Update monitoring
        await this.monitoringService.updateExecutionProgress(accountId, {
          status: 'paused',
          pausedAt: new Date()
        });

        this.emit('execution:paused', { accountId, pausedAt: new Date() });

        return { 
          success: true, 
          message: "Workflow paused successfully",
          pausedAt: new Date()
        };
      });

    } catch (error) {
      console.error(`❌ Failed to pause execution for ${accountId}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Resume workflow execution with distributed locking
   * @param {string} accountId - Account ID
   * @returns {Promise<Object>} Resume result
   */
  async resumeExecution(accountId) {
    console.log(`▶️ Resuming workflow execution for ${accountId}`);
    
    try {
      return await this.lockService.resumeWorkflowWithLock(accountId, async () => {
        // Use transaction-protected resume
        const workflowInstance = await this.workflowDb.resumeWorkflowInstance(accountId);
        
        if (!workflowInstance) {
          throw new Error("Workflow instance not found or cannot be resumed");
        }

        // Get workflow definition from database
        const workflowDef = await this.workflowDb.getWorkflowDefinition(workflowInstance.workflow_type);
        if (!workflowDef) {
          throw new Error(`Workflow definition not found: ${workflowInstance.workflow_type}`);
        }

        // Recreate execution context
        const execution = {
          accountId,
          workflowType: workflowInstance.workflow_type,
          accountData: workflowInstance.account_data,
          workflowDef,
          currentStep: workflowInstance.current_step,
          totalSteps: workflowInstance.total_steps,
          startTime: new Date(workflowInstance.started_at).getTime(),
          retryCount: workflowInstance.retry_count,
          executionContext: workflowInstance.execution_context || {},
          workflowInstanceId: workflowInstance.id
        };

        // Update monitoring
        await this.monitoringService.updateExecutionProgress(accountId, {
          status: 'active',
          currentStep: execution.currentStep,
          totalSteps: execution.totalSteps,
          resumedAt: new Date()
        });

        // Process next step
        setImmediate(async () => {
          try {
            await this.processNextStep(execution);
          } catch (error) {
            console.error(`❌ Error processing step after resume:`, error);
            await this.failExecution(execution, error);
          }
        });

        this.emit('execution:resumed', {
          accountId,
          currentStep: execution.currentStep,
          totalSteps: execution.totalSteps,
          resumedAt: new Date()
        });

        return { 
          success: true, 
          message: "Workflow resumed successfully",
          currentStep: execution.currentStep,
          totalSteps: execution.totalSteps,
          resumedAt: new Date()
        };
      });

    } catch (error) {
      console.error(`❌ Failed to resume execution for ${accountId}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Complete workflow execution
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

      this.emit('execution:completed', {
        accountId,
        workflowType,
        duration,
        success: true
      });

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

      this.emit('execution:failed', {
        accountId,
        workflowType,
        duration,
        error: error.message
      });

    } catch (updateError) {
      console.error(`❌ Failed to update failed execution for ${accountId}:`, updateError);
    }
  }

  /**
   * Stop workflow execution with distributed locking
   * @param {string} accountId - Account ID
   * @returns {Promise<Object>} Result
   */
  async stopExecution(accountId) {
    console.log(`🛑 Stopping workflow execution for ${accountId}`);
    
    try {
      return await this.lockService.stopWorkflowWithLock(accountId, async () => {
        const workflowInstance = await this.workflowDb.getWorkflowInstanceByAccountId(accountId);
        if (!workflowInstance || !['active', 'paused'].includes(workflowInstance.status)) {
          return { success: false, error: "Active workflow not found" };
        }

        // Cancel any scheduled tasks
        if (workflowInstance.next_task_id) {
          await this.taskScheduler.cancelTask(workflowInstance.next_task_id);
        }

        // Update database
        await this.workflowDb.updateWorkflowInstance(accountId, {
          status: 'stopped',
          completed_at: new Date()
        });

        // Complete monitoring
        this.monitoringService.completeExecution(accountId, false, 'Manually stopped');

        this.emit('execution:stopped', { accountId, stoppedAt: new Date() });

        return { success: true };
      });

    } catch (error) {
      console.error(`❌ Failed to stop execution for ${accountId}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get execution status from database
   * @param {string} accountId - Account ID
   * @returns {Promise<Object|null>} Status object or null
   */
  async getExecutionStatus(accountId) {
    try {
      const workflowInstance = await this.workflowDb.getWorkflowInstanceByAccountId(accountId);
      if (!workflowInstance) {
        return null;
      }

      return {
        accountId,
        workflowType: workflowInstance.workflow_type,
        status: workflowInstance.status,
        progress: workflowInstance.progress_percentage || 0,
        currentStep: workflowInstance.current_step,
        totalSteps: workflowInstance.total_steps,
        startedAt: workflowInstance.started_at,
        nextStep: workflowInstance.current_step < workflowInstance.total_steps ? 
          workflowInstance.steps[workflowInstance.current_step] : null,
        gotoIterations: workflowInstance.goto_iterations || {}
      };
    } catch (error) {
      console.error(`❌ Error getting execution status for ${accountId}:`, error);
      return null;
    }
  }

  /**
   * Get all active executions from database
   * @returns {Promise<Array>} Array of execution status objects
   */
  async getAllActiveExecutions() {
    try {
      const query = 'SELECT * FROM active_workflow_executions ORDER BY started_at DESC';
      const result = await this.workflowDb.db.query(query);
      
      return result.rows.map(row => ({
        accountId: row.account_id,
        workflowType: row.workflow_type,
        status: row.status,
        progress: row.progress_percentage || 0,
        currentStep: row.current_step,
        totalSteps: row.total_steps,
        startedAt: row.started_at,
        gotoIterations: row.goto_iterations || {}
      }));
    } catch (error) {
      console.error('❌ Error getting active executions:', error);
      return [];
    }
  }

  /**
   * Get comprehensive statistics from database
   * @returns {Promise<Object>} Combined statistics
   */
  async getStatistics() {
    try {
      const [monitoringStats, activeCount, availableTypes] = await Promise.all([
        this.monitoringService.getStatistics(),
        this.getActiveExecutionsCount(),
        this.getAvailableWorkflowTypes()
      ]);
      
      return {
        isInitialized: this.isInitialized,
        activeExecutions: activeCount,
        workflowDefinitions: availableTypes.length,
        totalExecutions: monitoringStats.totalExecutions || 0,
        successfulExecutions: monitoringStats.successfulExecutions || 0,
        failedExecutions: monitoringStats.failedExecutions || 0,
        executor: {
          isInitialized: this.isInitialized,
          activeExecutions: activeCount,
          workflowDefinitions: availableTypes.length
        },
        execution: this.executionService.getExecutionStats(),
        scheduling: await this.schedulingService.getSchedulingStats(),
        monitoring: monitoringStats,
        recovery: this.recoveryService.getRecoveryStats(),
        cleanup: await this.cleanupService.getCleanupStats(),
        locks: await this.lockService.getLockStats()
      };
    } catch (error) {
      console.error('❌ Error getting statistics:', error);
      return { error: error.message };
    }
  }

  /**
   * Get count of active executions
   * @returns {Promise<number>} Count of active executions
   */
  async getActiveExecutionsCount() {
    try {
      const result = await this.workflowDb.db.query('SELECT get_active_executions_count() as count');
      return parseInt(result.rows[0].count) || 0;
    } catch (error) {
      console.error('❌ Error getting active executions count:', error);
      return 0;
    }
  }

  /**
   * Get available workflow types from database
   * @returns {Promise<Array>} Available workflow types
   */
  async getAvailableWorkflowTypes() {
    try {
      const definitions = await this.workflowDb.getAllWorkflowDefinitions();
      return definitions.map(def => def.type);
    } catch (error) {
      console.error("❌ Error getting workflow types:", error);
      return [];
    }
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Listen to recovery service
    this.recoveryService.on('workflow:recovery_ready', async (recoveryData) => {
      console.log(`🔧 Recovered workflow ready: ${recoveryData.accountId}`);
      
      try {
        // Resume execution from where it left off
        await this.resumeExecution(recoveryData.accountId);
      } catch (error) {
        console.error(`❌ Failed to resume recovered workflow ${recoveryData.accountId}:`, error);
      }
    });

    // Listen to task scheduler
    this.taskScheduler.on("task:completed", (data) => {
      if (data.metadata && data.metadata.action === "execute_workflow_step") {
        console.log(`📊 Workflow step task completed: ${data.taskId}`);
      }
    });

    this.taskScheduler.on("task:failed", (data) => {
      if (data.metadata && data.metadata.action === "execute_workflow_step") {
        console.error(`📊 Workflow step task failed: ${data.taskId}`, data.error);
      }
    });

    console.log("👂 Event listeners setup completed");
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
      // Get execution from database
      const workflowInstance = await this.workflowDb.getWorkflowInstanceByAccountId(accountId);
      if (!workflowInstance) {
        console.warn(`⚠️ Workflow instance not found for account: ${accountId}. This may be normal if workflow completed or was cleaned up.`);
        return {
          success: false,
          error: `Workflow instance not found: ${accountId}`,
          reason: 'workflow_completed_or_cleaned'
        };
      }

      // Reconstruct execution context from database
      const workflowDef = await this.workflowDb.getWorkflowDefinition(workflowInstance.workflow_type);
      const execution = {
        accountId: workflowInstance.account_id,
        workflowType: workflowInstance.workflow_type,
        accountData: workflowInstance.account_data,
        workflowDef,
        currentStep: workflowInstance.current_step,
        totalSteps: workflowInstance.total_steps,
        startTime: new Date(workflowInstance.started_at).getTime(),
        retryCount: workflowInstance.retry_count,
        executionContext: workflowInstance.execution_context || {},
        workflowInstanceId: workflowInstance.id
      };

      // Process next step
      await this.processNextStep(execution);
      
      return { success: true };

    } catch (error) {
      console.error(`❌ Failed to execute workflow step for ${accountId}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Shutdown the executor and cleanup resources
   */
  async shutdown() {
    console.log("🛑 Shutting down Improved Workflow Executor...");
    
    try {
      // Stop cleanup service
      this.cleanupService.stop();
      
      // Release all locks held by this instance
      await this.lockService.releaseAllLocks();
      
      this.isInitialized = false;
      console.log("✅ Improved Workflow Executor shutdown complete");
      
    } catch (error) {
      console.error("❌ Error during shutdown:", error);
    }
  }
}

module.exports = WorkflowExecutorImproved;