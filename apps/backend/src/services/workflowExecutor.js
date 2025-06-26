// src/services/workflowExecutor.js - Robust Workflow Execution Engine
const EventEmitter = require("events");
const workflowDb = require("./workflowDatabaseService");
const taskScheduler = require("./taskScheduler");
const cronManager = require("./cronManager");
const flamebotActionsService = require("./flamebotActionsService");
const aiService = require("./aiService");

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
      averageExecutionTime: 0,
    };
    this.isInitialized = false;

    console.log("🎯 Workflow Executor initialized");
  }

  /**
   * Initialize the workflow executor with predefined workflows
   */
  async initialize() {
    if (this.isInitialized) {
      console.log("⚠️ Workflow Executor already initialized");
      return;
    }

    console.log("🚀 Initializing Workflow Executor...");

    // Load workflow definitions
    await this.loadWorkflowDefinitions();

    // Setup event listeners
    this.setupEventListeners();

    // Recovery: Resume interrupted executions
    await this.recoverInterruptedExecutions();

    this.isInitialized = true;
    console.log("✅ Workflow Executor initialized successfully");
  }

  /**
   * Load execution from database if not in memory
   * @param {string} accountId - Account ID
   * @returns {Promise<Object|null>} Execution state
   */
  async loadExecutionFromDatabase(accountId) {
    try {
      console.log(
        `📥 Loading execution from database for account: ${accountId}`
      );

      // Get workflow instance from database
      const workflowInstance = await workflowDb.getWorkflowInstanceByAccountId(
        accountId
      );

      if (!workflowInstance || workflowInstance.status !== "active") {
        console.log(
          `⚠️ No active workflow found in database for account: ${accountId}`
        );
        return null;
      }

      // Get workflow definition
      const workflowDef = this.workflowDefinitions.get(
        workflowInstance.workflow_type
      );
      if (!workflowDef) {
        // Try loading from database
        const dbDef = await workflowDb.getWorkflowDefinition(
          workflowInstance.workflow_type
        );
        if (dbDef) {
          this.workflowDefinitions.set(dbDef.type, {
            name: dbDef.name,
            description: dbDef.description,
            steps: dbDef.steps,
            config: dbDef.config || {},
            version: dbDef.version,
            source: "database",
          });
          workflowDef = this.workflowDefinitions.get(
            workflowInstance.workflow_type
          );
        } else {
          throw new Error(
            `Workflow definition not found: ${workflowInstance.workflow_type}`
          );
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
        status: "active",
        currentStep: workflowInstance.current_step,
        totalSteps: workflowInstance.total_steps,
        startedAt: new Date(workflowInstance.started_at),
        lastActivity: new Date(workflowInstance.last_activity_at),
        retryCount: workflowInstance.retry_count || 0,
        maxRetries: workflowDef.config?.maxRetries || 3,
        executionLog: [],
        scheduledTasks: new Map(),
        continuousSwipeTaskId: null,
      };

      // Get execution log from database
      const logs = await workflowDb.getExecutionLog(workflowInstance.id, 10);
      execution.executionLog = logs.map((log) => ({
        stepId: log.step_id,
        stepIndex: log.step_index,
        action: log.action,
        success: log.success,
        result: log.result,
        error: log.error_message,
        duration: log.duration_ms,
        timestamp: new Date(log.executed_at),
      }));

      // Add to active executions
      this.activeExecutions.set(accountId, execution);

      console.log(
        `✅ Execution loaded from database: ${execution.executionId}`
      );
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
    console.log("📚 Loading workflow definitions...");

    // Default workflow definitions (can be overridden from database)
    const defaultDefinitions = {
      // Workflow básico sin loops ni parallel (como antes)
      default: {
        name: "Default Account Automation",
        description:
          "Standard automation: 1h wait → prompt → 10 swipes → 20 swipes → 20 swipes → continuous → bio after 24h",
        config: {
          maxRetries: 3,
          retryBackoffMs: 30000,
          timeoutMs: 600000,
        },
        steps: [
          {
            id: "initial_wait",
            action: "wait",
            delay: 60 * 60 * 1000, // 1 hour
            description: "Wait 1 hour after import",
            critical: false,
          },
          {
            id: "add_prompt",
            action: "add_prompt",
            delay: 0,
            description: "Add AI-generated prompt",
            critical: true,
            timeout: 120000,
          },
          {
            id: "pre_swipe_wait",
            action: "wait",
            delay: 15 * 60 * 1000, // 15 minutes
            description: "Wait 15 minutes before first swipe",
            critical: false,
          },
          {
            id: "first_swipe_10",
            action: "swipe_with_spectre",
            delay: 0,
            swipeCount: 10,
            description: "First swipe session - 10 swipes",
            critical: true,
            timeout: 300000,
          },
          {
            id: "inter_swipe_wait_1",
            action: "wait",
            delay: 60 * 60 * 1000, // 1 hour
            description: "Wait 1 hour before second swipe",
            critical: false,
          },
          {
            id: "second_swipe_20",
            action: "swipe_with_spectre",
            delay: 0,
            swipeCount: 20,
            description: "Second swipe session - 20 swipes",
            critical: true,
            timeout: 300000,
          },
          {
            id: "inter_swipe_wait_2",
            action: "wait",
            delay: 60 * 60 * 1000, // 1 hour
            description: "Wait 1 hour before third swipe",
            critical: false,
          },
          {
            id: "third_swipe_20",
            action: "swipe_with_spectre",
            delay: 0,
            swipeCount: 20,
            description: "Third swipe session - 20 swipes",
            critical: true,
            timeout: 300000,
          },
          {
            id: "continuous_swipe_activation",
            action: "activate_continuous_swipe",
            delay: 0,
            minSwipes: 20,
            maxSwipes: 30,
            minIntervalMs: 90 * 60 * 1000, // 90 minutes
            maxIntervalMs: 180 * 60 * 1000, // 180 minutes
            description:
              "Activate continuous random swipes (20-30 every 90-180 min)",
            critical: true,
            timeout: 60000,
          },
          {
            id: "bio_after_24h",
            action: "add_bio",
            delay: 24 * 60 * 60 * 1000, // 24 hours
            description: "Add AI-generated bio after 24 hours",
            critical: false,
            timeout: 120000,
          },
        ],
      },

      // NUEVO: Workflow con loop infinito
      loop_workflow: {
        name: "Loop Workflow Automation",
        description: "Workflow with infinite loop: prompt → swipes → loop back",
        config: {
          maxRetries: 3,
          retryBackoffMs: 30000,
          timeoutMs: 300000,
        },
        steps: [
          {
            id: "import_wait",
            action: "wait",
            delay: 60 * 60 * 1000, // 1 hour
            description: "Initial wait 1 hour",
            critical: false,
          },
          {
            id: "add_prompt",
            action: "add_prompt",
            delay: 0,
            description: "Add AI prompt",
            critical: true,
          },
          {
            id: "wait_before_swipe",
            action: "wait",
            delay: 15 * 60 * 1000, // 15 minutes
            description: "Wait 15 minutes",
            critical: false,
          },
          {
            id: "swipe_10",
            action: "swipe_with_spectre",
            delay: 0,
            swipeCount: 10,
            description: "Swipe 10 times",
            critical: true,
          },
          {
            id: "wait_1h",
            action: "wait",
            delay: 60 * 60 * 1000, // 1 hour
            description: "Wait 1 hour",
            critical: false,
          },
          {
            id: "swipe_20_first",
            action: "swipe_with_spectre",
            delay: 0,
            swipeCount: 20,
            description: "Swipe 20 times",
            critical: true,
          },
          {
            id: "wait_2h",
            action: "wait",
            delay: 2 * 60 * 60 * 1000, // 2 hours
            description: "Wait 2 hours",
            critical: false,
          },
          {
            id: "swipe_20_second",
            action: "swipe_with_spectre",
            delay: 0,
            swipeCount: 20,
            description: "Swipe 20 times again",
            critical: true,
          },
          {
            id: "loop_back",
            action: "goto",
            delay: 0,
            description: "Loop back to first swipe",
            nextStep: "swipe_10", // Vuelve al step swipe_10
          },
          // Step paralelo - se ejecuta independientemente
          {
            id: "bio_parallel",
            action: "add_bio",
            delay: 12 * 60 * 60 * 1000 + 20 * 60 * 1000, // 12h 20m desde el inicio
            description: "Add bio after 12h 20m (parallel)",
            parallel: true,
            critical: false,
          },
        ],
      },

      // NUEVO: Workflow con múltiples steps paralelos
      parallel_workflow: {
        name: "Parallel Execution Workflow",
        description:
          "Multiple parallel tasks: bio at 2h, prompt updates at 4h and 8h",
        config: {
          maxRetries: 3,
          retryBackoffMs: 30000,
          timeoutMs: 300000,
        },
        steps: [
          // Flujo principal
          {
            id: "initial_setup",
            action: "wait",
            delay: 30 * 60 * 1000, // 30 minutes
            description: "Initial setup wait",
            critical: false,
          },
          {
            id: "first_prompt",
            action: "add_prompt",
            delay: 0,
            description: "Initial AI prompt",
            critical: true,
          },
          {
            id: "continuous_swipes",
            action: "activate_continuous_swipe",
            delay: 30 * 60 * 1000, // 30 minutes after prompt
            minSwipes: 15,
            maxSwipes: 25,
            minIntervalMs: 60 * 60 * 1000, // 1 hour
            maxIntervalMs: 120 * 60 * 1000, // 2 hours
            description: "Start continuous swipes",
            critical: true,
          },
          // Steps paralelos - se ejecutan independientemente
          {
            id: "bio_2h",
            action: "add_bio",
            delay: 2 * 60 * 60 * 1000, // 2 hours desde el inicio
            description: "Add bio after 2 hours (parallel)",
            parallel: true,
            critical: false,
          },
          {
            id: "update_prompt_4h",
            action: "add_prompt",
            delay: 4 * 60 * 60 * 1000, // 4 hours desde el inicio
            description: "Update prompt after 4 hours (parallel)",
            parallel: true,
            critical: false,
          },
          {
            id: "update_prompt_8h",
            action: "add_prompt",
            delay: 8 * 60 * 60 * 1000, // 8 hours desde el inicio
            description: "Update prompt again after 8 hours (parallel)",
            parallel: true,
            critical: false,
          },
        ],
      },

      // Workflow agresivo actualizado
      aggressive: {
        name: "Aggressive Account Automation",
        description: "Faster automation with loop for testing",
        config: {
          maxRetries: 3,
          retryBackoffMs: 15000,
          timeoutMs: 300000,
        },
        steps: [
          {
            id: "quick_wait",
            action: "wait",
            delay: 5 * 60 * 1000, // 5 minutes
            description: "Wait 5 minutes after import",
            critical: false,
          },
          {
            id: "add_prompt",
            action: "add_prompt",
            delay: 0,
            description: "Add AI-generated prompt",
            critical: true,
            timeout: 120000,
          },
          {
            id: "aggressive_swipe_15",
            action: "swipe_with_spectre",
            delay: 0,
            swipeCount: 15,
            description: "Aggressive swipe session - 15 swipes",
            critical: true,
            timeout: 300000,
          },
          {
            id: "wait_30m",
            action: "wait",
            delay: 30 * 60 * 1000, // 30 minutes
            description: "Wait 30 minutes",
            critical: false,
          },
          {
            id: "aggressive_swipe_25",
            action: "swipe_with_spectre",
            delay: 0,
            swipeCount: 25,
            description: "Aggressive swipe session - 25 swipes",
            critical: true,
          },
          {
            id: "loop_aggressive",
            action: "goto",
            delay: 60 * 60 * 1000, // Wait 1 hour before looping
            description: "Loop back to first swipe",
            nextStep: "aggressive_swipe_15",
          },
          // Parallel bio
          {
            id: "quick_bio",
            action: "add_bio",
            delay: 60 * 60 * 1000, // 1 hour desde el inicio
            description: "Add bio after 1 hour (parallel)",
            parallel: true,
            critical: false,
          },
        ],
      },

      // Test workflow mejorado con todas las características
      test: {
        name: "Test Workflow - All Features",
        description: "Quick test with loop and parallel execution",
        config: {
          maxRetries: 2,
          retryBackoffMs: 5000,
          timeoutMs: 60000,
        },
        steps: [
          {
            id: "test_wait",
            action: "wait",
            delay: 30 * 1000, // 30 seconds
            description: "Wait 30 seconds",
            critical: false,
          },
          {
            id: "test_prompt",
            action: "add_prompt",
            delay: 0,
            description: "Add test prompt",
            critical: true,
            timeout: 60000,
          },
          {
            id: "test_swipe",
            action: "swipe_with_spectre",
            delay: 30 * 1000, // 30 seconds
            swipeCount: 5,
            description: "Test swipe - 5 swipes",
            critical: true,
            timeout: 120000,
          },
          {
            id: "test_wait_loop",
            action: "wait",
            delay: 60 * 1000, // 1 minute
            description: "Wait 1 minute before loop",
            critical: false,
          },
          {
            id: "test_loop",
            action: "goto",
            delay: 0,
            description: "Loop back to swipe (max 3 times)",
            nextStep: "test_swipe",
            // En producción podrías agregar un contador para limitar loops
          },
          // Parallel steps para testing
          {
            id: "test_bio_parallel",
            action: "add_bio",
            delay: 2 * 60 * 1000, // 2 minutes desde el inicio
            description: "Test bio after 2 min (parallel)",
            parallel: true,
            critical: false,
          },
          {
            id: "test_prompt_update",
            action: "add_prompt",
            delay: 3 * 60 * 1000, // 3 minutes desde el inicio
            description: "Update prompt after 3 min (parallel)",
            parallel: true,
            critical: false,
          },
        ],
      },
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
          source: "database",
        });
      }

      console.log(
        `   Loaded ${dbDefinitions.length} workflow definitions from database`
      );
    } catch (error) {
      console.error("⚠️ Failed to load from database, using defaults:", error);
    }

    // Add default definitions for missing types
    for (const [type, definition] of Object.entries(defaultDefinitions)) {
      if (!this.workflowDefinitions.has(type)) {
        this.workflowDefinitions.set(type, {
          ...definition,
          source: "default",
        });
      }
    }

    console.log(
      `✅ Loaded ${this.workflowDefinitions.size} workflow definitions total`
    );
  }

  /**
   * Start workflow execution for a newly imported account
   * @param {string} accountId - Account ID
   * @param {Object} accountData - Account metadata
   * @param {string} workflowType - Workflow type to execute
   * @returns {Promise<Object>} Execution result
   */
  async startExecution(accountId, accountData, workflowType = "default") {
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
          error: "Execution already active for this account",
        };
      }

      // Filtrar solo steps no paralelos para el flujo principal
      const mainFlowSteps = workflowDef.steps.filter((step) => !step.parallel);
      const parallelSteps = workflowDef.steps.filter((step) => step.parallel);

      // Create workflow instance in database
      const workflowInstance = await workflowDb.createWorkflowInstance({
        workflowType,
        accountId,
        accountData,
        totalSteps: mainFlowSteps.length, // Solo contar steps del flujo principal
        executionContext: {
          startedAt: new Date(),
          currentStep: 0,
          retryCount: 0,
          maxRetries: workflowDef.maxRetries || 3,
          hasParallelSteps: parallelSteps.length > 0,
          parallelStepIds: parallelSteps.map((s) => s.id),
        },
      });

      // Create execution state
      const execution = {
        executionId: `exec_${accountId}_${Date.now()}`,
        accountId,
        accountData,
        workflowType,
        workflowDef: {
          ...workflowDef,
          steps: mainFlowSteps, // Solo steps del flujo principal
        },
        originalWorkflowDef: workflowDef, // Guardar definición completa
        workflowInstanceId: workflowInstance.id,
        status: "active",
        currentStep: 0,
        totalSteps: mainFlowSteps.length,
        startedAt: new Date(),
        lastActivity: new Date(),
        retryCount: 0,
        maxRetries: workflowDef.maxRetries || 3,
        executionLog: [],
        scheduledTasks: new Map(),
        continuousSwipeTaskId: null,
      };

      // Add to active executions
      this.activeExecutions.set(accountId, execution);
      this.executionStats.totalExecutions++;

      // Programar steps paralelos
      if (parallelSteps.length > 0) {
        await this.scheduleParallelSteps(execution);
      }

      // Start first step del flujo principal
      await this.scheduleNextStep(execution);

      this.emit("execution:started", {
        accountId,
        executionId: execution.executionId,
        workflowType,
        hasParallelSteps: parallelSteps.length > 0,
      });

      console.log(`✅ Workflow execution started: ${execution.executionId}`);
      if (parallelSteps.length > 0) {
        console.log(`   ⚡ ${parallelSteps.length} parallel steps scheduled`);
      }

      return {
        success: true,
        executionId: execution.executionId,
        workflowType,
        totalSteps: workflowDef.steps.length,
        mainFlowSteps: mainFlowSteps.length,
        parallelSteps: parallelSteps.length,
        estimatedDuration: this.calculateEstimatedDuration(workflowDef.steps),
      };
    } catch (error) {
      console.error(`❌ Failed to start execution for ${accountId}:`, error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Schedule the next step in workflow execution
   * @param {Object} execution - Execution state
   */
  async scheduleNextStep(execution) {
    if (execution.status !== "active") {
      console.log(`⚠️ Execution not active: ${execution.accountId}`);
      return;
    }

    // Obtener el step actual que acaba de ejecutarse
    const currentStepConfig =
      execution.currentStep > 0
        ? execution.workflowDef.steps[execution.currentStep - 1]
        : null;

    let nextStep;
    let nextStepIndex;

    // Verificar si el step actual tiene un nextStep personalizado (para loops)
    if (currentStepConfig && currentStepConfig.nextStep) {
      // Buscar el step por ID
      nextStepIndex = execution.workflowDef.steps.findIndex(
        (s) => s.id === currentStepConfig.nextStep
      );
      if (nextStepIndex !== -1) {
        nextStep = execution.workflowDef.steps[nextStepIndex];
        console.log(
          `🔄 Custom next step: jumping to ${currentStepConfig.nextStep} (index ${nextStepIndex})`
        );
      } else {
        console.error(`❌ NextStep not found: ${currentStepConfig.nextStep}`);
        // Continuar con flujo normal
        nextStep = execution.workflowDef.steps[execution.currentStep];
        nextStepIndex = execution.currentStep;
      }
    } else {
      // Flujo normal secuencial
      nextStep = execution.workflowDef.steps[execution.currentStep];
      nextStepIndex = execution.currentStep;
    }

    if (!nextStep) {
      // Workflow completed
      await this.completeExecution(execution);
      return;
    }

    // Actualizar el índice para el próximo step
    execution.currentStep = nextStepIndex;

    console.log(
      `⏰ Scheduling step ${nextStepIndex + 1}/${execution.totalSteps}`
    );
    console.log(`   Step: ${nextStep.id} (${nextStep.description})`);
    console.log(`   Delay: ${this.formatDuration(nextStep.delay || 0)}`);

    try {
      const delay = parseInt(nextStep.delay) || 0;
      const executeAt = new Date(Date.now() + delay);

      // Validar que la fecha sea válida
      if (isNaN(executeAt.getTime())) {
        console.error(
          `❌ Invalid execution time for step ${nextStep.id}. Delay: ${nextStep.delay}`
        );
        throw new Error(`Invalid delay value: ${nextStep.delay}`);
      }

      console.log(`   Execute at: ${executeAt.toISOString()}`);

      // Schedule task using TaskScheduler
      const taskId = await taskScheduler.scheduleTask({
        workflowInstanceId: execution.workflowInstanceId,
        stepId: nextStep.id,
        action: "execute_workflow_step",
        scheduledFor: executeAt,
        payload: {
          executionId: execution.executionId,
          accountId: execution.accountId,
          stepIndex: nextStepIndex,
          stepConfig: nextStep,
          workflowType: execution.workflowType,
        },
        maxAttempts: execution.maxRetries,
      });

      // Store task reference
      execution.scheduledTasks.set(nextStep.id, taskId);

      // Update database
      await workflowDb.updateWorkflowInstance(execution.accountId, {
        current_step: nextStepIndex,
        next_action_at: executeAt,
        next_task_id: taskId,
        progress_percentage: Math.round(
          (nextStepIndex / execution.totalSteps) * 100
        ),
      });

      console.log(
        `✅ Step scheduled: ${taskId} for ${executeAt.toLocaleString()}`
      );
    } catch (error) {
      console.error(`❌ Failed to schedule step:`, error);
      await this.handleExecutionError(execution, nextStep, error);
    }
  }

  async scheduleParallelSteps(execution) {
    // Buscar todos los steps marcados como parallel
    const parallelSteps = execution.workflowDef.steps.filter(
      (step) => step.parallel === true
    );

    if (parallelSteps.length === 0) return;

    console.log(`⚡ Scheduling ${parallelSteps.length} parallel steps`);

    for (const step of parallelSteps) {
      try {
        // Los steps paralelos se programan desde el inicio del workflow
        const delay = parseInt(step.delay) || 0;
        const executeAt = new Date(execution.startedAt.getTime() + delay);

        // Solo programar si está en el futuro
        if (executeAt > new Date()) {
          console.log(
            `   ⚡ Scheduling parallel step: ${
              step.id
            } for ${executeAt.toLocaleString()}`
          );

          const taskId = await taskScheduler.scheduleTask({
            workflowInstanceId: execution.workflowInstanceId,
            stepId: step.id,
            action: "execute_workflow_step",
            scheduledFor: executeAt,
            payload: {
              executionId: execution.executionId,
              accountId: execution.accountId,
              stepIndex: -1, // Indicador de step paralelo
              stepConfig: step,
              workflowType: execution.workflowType,
              isParallel: true,
            },
            maxAttempts: step.critical ? execution.maxRetries : 1,
          });

          // Guardar referencia
          execution.scheduledTasks.set(`parallel_${step.id}`, taskId);
        } else {
          console.log(
            `   ⚡ Parallel step ${step.id} delay already passed, executing now`
          );
          // Ejecutar inmediatamente
          setTimeout(async () => {
            await this.executeStepAction(execution, step);
          }, 0);
        }
      } catch (error) {
        console.error(`❌ Failed to schedule parallel step ${step.id}:`, error);
        // No fallar todo el workflow por un step paralelo no crítico
        if (step.critical) {
          throw error;
        }
      }
    }
  }

  /**
   * Execute a workflow step (called by TaskScheduler)
   * @param {Object} payload - Task payload from scheduler
   * @returns {Promise<Object>} Execution result
   */
  async executeWorkflowStep(payload) {
    const { executionId, accountId, stepIndex, stepConfig, isParallel } =
      payload;

    console.log(
      `\n🎬 Executing workflow step: ${stepConfig.id}${
        isParallel ? " (PARALLEL)" : ""
      }`
    );
    console.log(`   Account: ${accountId}`);
    console.log(`   Action: ${stepConfig.action}`);

    let execution = this.activeExecutions.get(accountId);

    // If not in memory, try to load from database
    if (!execution) {
      console.log(
        `⚠️ Execution not in memory, attempting to load from database...`
      );
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
      const timeout =
        stepConfig.timeout || execution.workflowDef.config?.timeoutMs || 300000;
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(
          () => reject(new Error(`Step timeout after ${timeout}ms`)),
          timeout
        );
      });

      // Execute step with timeout
      const executionPromise = this.executeStepAction(execution, stepConfig);
      result = await Promise.race([executionPromise, timeoutPromise]);

      success = true;

      // Solo resetear retry count si no es paralelo
      if (!isParallel) {
        execution.retryCount = 0;
      }

      // Log success
      const logEntry = {
        stepId: stepConfig.id,
        stepIndex: isParallel ? -1 : stepIndex,
        action: stepConfig.action,
        success: true,
        result,
        duration: Date.now() - startTime,
        timestamp: new Date(),
        isParallel: isParallel || false,
      };
      execution.executionLog.push(logEntry);

      // Save to database
      await workflowDb.addExecutionLog({
        workflowInstanceId: execution.workflowInstanceId,
        stepId: stepConfig.id,
        stepIndex: isParallel ? -1 : stepIndex,
        action: stepConfig.action,
        description: stepConfig.description + (isParallel ? " (Parallel)" : ""),
        success: true,
        result,
        durationMs: Date.now() - startTime,
      });

      console.log(
        `✅ Step completed: ${stepConfig.id} (${Date.now() - startTime}ms)`
      );

      // Update last activity
      execution.lastActivity = new Date();

      // Si es un step paralelo, no afecta el flujo principal
      if (isParallel) {
        console.log(
          `⚡ Parallel step completed, main flow continues independently`
        );

        this.emit("execution:parallel_step_completed", {
          accountId,
          executionId,
          stepId: stepConfig.id,
          result,
        });

        return { success, result, duration: Date.now() - startTime };
      }

      // Handle next step based on action type
      if (stepConfig.action === "activate_continuous_swipe") {
        // Special handling for continuous swipe activation
        console.log(
          `🔄 Continuous swipe activated, handling next steps specially...`
        );

        // Incrementar para el siguiente step
        execution.currentStep++;

        // Update database with current progress
        await workflowDb.updateWorkflowInstance(execution.accountId, {
          current_step: execution.currentStep,
          progress_percentage: Math.round(
            (execution.currentStep / execution.totalSteps) * 100
          ),
          execution_context: {
            ...execution.executionContext,
            continuousSwipeActive: true,
            continuousSwipeTaskId: result.continuousTaskId,
          },
        });

        // Continuar con el siguiente step
        await this.scheduleNextStep(execution);
      } else if (stepConfig.action === "goto") {
        // Manejar acción goto (para loops)
        console.log(`🔄 Goto action: jumping to ${stepConfig.nextStep}`);

        // No incrementar currentStep, scheduleNextStep lo manejará
        await this.scheduleNextStep(execution);
      } else {
        // Normal flow for all other actions
        execution.currentStep++;
        await this.scheduleNextStep(execution);
      }

      this.emit("execution:step_completed", {
        accountId,
        executionId,
        stepId: stepConfig.id,
        result,
      });
    } catch (error) {
      success = false;
      const errorMessage = error.message;

      console.error(`❌ Step failed: ${stepConfig.id}`, errorMessage);

      // Log failure
      const logEntry = {
        stepId: stepConfig.id,
        stepIndex: isParallel ? -1 : stepIndex,
        action: stepConfig.action,
        success: false,
        error: errorMessage,
        duration: Date.now() - startTime,
        timestamp: new Date(),
        isParallel: isParallel || false,
      };
      execution.executionLog.push(logEntry);

      // Save to database
      await workflowDb.addExecutionLog({
        workflowInstanceId: execution.workflowInstanceId,
        stepId: stepConfig.id,
        stepIndex: isParallel ? -1 : stepIndex,
        action: stepConfig.action,
        description: stepConfig.description + (isParallel ? " (Parallel)" : ""),
        success: false,
        errorMessage,
        durationMs: Date.now() - startTime,
      });

      // Si es un step paralelo no crítico, no afecta el flujo principal
      if (isParallel && !stepConfig.critical) {
        console.log(
          `⚡ Non-critical parallel step failed, main flow continues`
        );

        this.emit("execution:parallel_step_failed", {
          accountId,
          executionId,
          stepId: stepConfig.id,
          error: errorMessage,
        });

        return {
          success: false,
          error: errorMessage,
          duration: Date.now() - startTime,
        };
      }

      // Handle error (retry or fail)
      await this.handleExecutionError(execution, stepConfig, error);

      this.emit("execution:step_failed", {
        accountId,
        executionId,
        stepId: stepConfig.id,
        error: errorMessage,
      });
    }

    return {
      success,
      result,
      duration: Date.now() - startTime,
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
      case "wait":
        return {
          action: "wait",
          duration: stepConfig.delay,
          message: `Waited ${this.formatDuration(stepConfig.delay)}`,
        };

      case "add_prompt":
        console.log(`📝 Adding prompt for ${accountId}...`);
        const promptResult = await flamebotActionsService.updatePrompt(
          accountId,
          accountData.model,
          accountData.channel || "gram",
          null // Generate new prompt
        );
        return {
          action: "add_prompt",
          taskId: promptResult.taskId,
          visibleText: promptResult.visibleText,
          success: true,
        };

      case "add_bio":
        console.log(`📄 Adding bio for ${accountId}...`);
        const bioResult = await flamebotActionsService.updateBio(
          accountId,
          null // Generate new bio
        );
        return {
          action: "add_bio",
          taskId: bioResult.taskId,
          bioText: bioResult.generatedBio,
          success: true,
        };

      case "swipe":
      case "swipe_with_spectre":
        console.log(
          `💕 Executing swipe with Spectre (${stepConfig.swipeCount} swipes)...`
        );

        // First configure Spectre with the swipe count
        console.log(
          `👻 Configuring Spectre: ${stepConfig.swipeCount} max likes`
        );
        await flamebotActionsService.configureSpectreMode(
          accountId,
          stepConfig.swipeCount
        );

        // Wait for configuration to apply
        await new Promise((resolve) => setTimeout(resolve, 3000));

        // Then start swipe task
        console.log(`🚀 Starting swipe task`);
        const swipeResult = await flamebotActionsService.startSwipeTask(
          [accountId],
          `Auto-swipe ${stepConfig.swipeCount} - ${stepConfig.id}`
        );

        return {
          action: "swipe_with_spectre",
          swipeCount: stepConfig.swipeCount,
          taskId: swipeResult.taskId,
          spectreConfigured: true,
          success: true,
        };

      case "goto":
        // Acción especial para loops
        console.log(
          `🔄 Goto action: preparing to jump to ${stepConfig.nextStep}`
        );
        return {
          action: "goto",
          targetStep: stepConfig.nextStep,
          message: `Loop to ${stepConfig.nextStep}`,
          success: true,
        };

      case "activate_continuous_swipe":
        console.log(`🔄 Activating continuous swipe mode...`);
        const continuousTaskId = await this.activateContinuousSwipe(
          execution,
          stepConfig
        );

        // Store continuous swipe task ID
        execution.continuousSwipeTaskId = continuousTaskId;

        return {
          action: "activate_continuous_swipe",
          continuousTaskId,
          minSwipes: stepConfig.minSwipes,
          maxSwipes: stepConfig.maxSwipes,
          minInterval: stepConfig.minIntervalMs,
          maxInterval: stepConfig.maxIntervalMs,
          success: true,
        };

      case "continuous_swipe":
        console.log(
          `🔄 Executing continuous swipe (${
            stepConfig.swipeCount || "calculated"
          } swipes)...`
        );

        // Calculate random swipe count if not provided
        const swipeCount =
          stepConfig.swipeCount ||
          Math.floor(
            Math.random() *
              ((stepConfig.maxSwipes || 30) - (stepConfig.minSwipes || 20) + 1)
          ) + (stepConfig.minSwipes || 20);

        // Configure Spectre with the swipe count
        console.log(`👻 Configuring Spectre: ${swipeCount} max likes`);
        await flamebotActionsService.configureSpectreMode(
          accountId,
          swipeCount
        );

        // Wait for configuration to apply
        await new Promise((resolve) => setTimeout(resolve, 3000));

        // Start swipe task
        console.log(`🚀 Starting continuous swipe task`);
        const continuousSwipeResult =
          await flamebotActionsService.startSwipeTask(
            [accountId],
            `Continuous-swipe ${swipeCount} - ${stepConfig.id}`
          );

        return {
          action: "continuous_swipe",
          swipeCount: swipeCount,
          taskId: continuousSwipeResult.taskId,
          spectreConfigured: true,
          success: true,
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
    const swipeCount =
      Math.floor(
        Math.random() * (stepConfig.maxSwipes - stepConfig.minSwipes + 1)
      ) + stepConfig.minSwipes;

    const interval =
      Math.floor(
        Math.random() * (stepConfig.maxIntervalMs - stepConfig.minIntervalMs)
      ) + stepConfig.minIntervalMs;

    const executeAt = new Date(Date.now() + interval);

    console.log(`🎲 Scheduling next continuous swipe:`);
    console.log(`   Swipes: ${swipeCount}`);
    console.log(`   Interval: ${this.formatDuration(interval)}`);
    console.log(`   Execute at: ${executeAt.toLocaleString()}`);

    // Schedule continuous swipe task
    const taskId = await taskScheduler.scheduleTask({
      workflowInstanceId: execution.workflowInstanceId,
      stepId: `${stepConfig.id}_continuous_${Date.now()}`,
      action: "execute_continuous_swipe",
      scheduledFor: executeAt,
      payload: {
        executionId: execution.executionId,
        accountId: execution.accountId,
        swipeCount,
        stepConfig: stepConfig,
        nextSwipeScheduled: true,
      },
      maxAttempts: 3,
    });

    console.log(`✅ Continuous swipe scheduled with task ID: ${taskId}`);

    return taskId;
  }

  /**
   * Execute continuous swipe (called by TaskScheduler)
   * @param {Object} payload - Task payload
   * @returns {Promise<Object>} Execution result
   */
  async executeContinuousSwipe(payload) {
    const { executionId, accountId, swipeCount, stepConfig } = payload;

    console.log(
      `\n🔄 Executing continuous swipe: ${swipeCount} swipes for ${accountId}`
    );

    let execution = this.activeExecutions.get(accountId);

    // If not in memory, try to load from database
    if (!execution) {
      console.log(
        `⚠️ Execution not in memory, attempting to load from database...`
      );
      execution = await this.loadExecutionFromDatabase(accountId);

      if (!execution) {
        console.log(
          `⚠️ No active execution found for continuous swipe: ${accountId}`
        );
        return { success: false, message: "Execution not found" };
      }
    }

    if (execution.status !== "active") {
      console.log(
        `⚠️ Execution not active, skipping continuous swipe: ${accountId}`
      );
      return { success: false, message: "Execution not active" };
    }

    try {
      // Configure Spectre with swipe count
      await flamebotActionsService.configureSpectreMode(accountId, swipeCount);

      // Wait for configuration
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Start swipe task
      const swipeResult = await flamebotActionsService.startSwipeTask(
        [accountId],
        `Continuous-swipe ${swipeCount} - ${Date.now()}`
      );

      // Schedule next continuous swipe
      const nextTaskId = await this.scheduleNextContinuousSwipe(
        execution,
        stepConfig
      );
      execution.continuousSwipeTaskId = nextTaskId;

      console.log(
        `✅ Continuous swipe executed: ${swipeCount} swipes, next in ${this.formatDuration(
          stepConfig.minIntervalMs
        )}-${this.formatDuration(stepConfig.maxIntervalMs)}`
      );

      return {
        success: true,
        action: "continuous_swipe",
        swipeCount,
        taskId: swipeResult.taskId,
        nextTaskId,
      };
    } catch (error) {
      console.error(`❌ Continuous swipe failed for ${accountId}:`, error);

      // Still schedule next attempt (with delay)
      try {
        const retryDelay = 30 * 60 * 1000; // 30 minutes retry delay
        const retryTaskId = await taskScheduler.scheduleTask({
          workflowInstanceId: execution.workflowInstanceId,
          stepId: `${stepConfig.id}_continuous_retry`,
          action: "execute_continuous_swipe",
          scheduledFor: new Date(Date.now() + retryDelay),
          payload: payload,
          maxAttempts: 2,
        });

        execution.continuousSwipeTaskId = retryTaskId;
      } catch (scheduleError) {
        console.error(
          `❌ Failed to schedule continuous swipe retry:`,
          scheduleError
        );
      }

      return {
        success: false,
        error: error.message,
        willRetry: true,
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

    console.log(
      `🔄 Execution error handler: retry ${execution.retryCount}/${execution.maxRetries}`
    );

    if (execution.retryCount >= execution.maxRetries) {
      // Max retries reached
      if (stepConfig.critical) {
        // Critical step failed - fail entire execution
        console.error(
          `💥 Critical step failed, failing entire execution: ${execution.accountId}`
        );
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

      console.log(
        `🔄 Scheduling retry ${execution.retryCount} in ${this.formatDuration(
          retryDelay
        )}`
      );

      try {
        const retryTaskId = await taskScheduler.scheduleTask({
          workflowInstanceId: execution.workflowInstanceId,
          stepId: `${stepConfig.id}_retry_${execution.retryCount}`,
          action: "execute_workflow_step",
          scheduledFor: retryAt,
          payload: {
            executionId: execution.executionId,
            accountId: execution.accountId,
            stepIndex: execution.currentStep,
            stepConfig: stepConfig,
            workflowType: execution.workflowType,
            isRetry: true,
            retryAttempt: execution.retryCount,
          },
          maxAttempts: 1, // Only one attempt for retry tasks
        });

        // Update database
        await workflowDb.updateWorkflowInstance(execution.accountId, {
          next_action_at: retryAt,
          next_task_id: retryTaskId,
          retry_count: execution.retryCount,
          last_error: error.message,
        });
      } catch (scheduleError) {
        console.error(`❌ Failed to schedule retry:`, scheduleError);
        await this.failExecution(execution, scheduleError);
      }
    }
  }

  /**
   * NUEVA: Pausar workflow (se puede resumir después)
   * @param {string} accountId - Account ID
   * @returns {Promise<Object>} Pause result
   */
  async pauseExecution(accountId) {
    const execution = this.activeExecutions.get(accountId);

    if (!execution) {
      const dbExecution = await this.loadExecutionFromDatabase(accountId);
      if (!dbExecution || dbExecution.status !== "active") {
        return {
          success: false,
          error: "No active execution found to pause",
        };
      }
    }

    console.log(`⏸️ Pausing workflow execution: ${accountId}`);

    // Actualizar en memoria si existe
    if (execution) {
      execution.status = "paused";
      execution.pausedAt = new Date();
    }

    try {
      // Actualizar en base de datos
      const updateQuery = `
      UPDATE workflow_instances 
      SET status = 'paused',
          paused_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP,
          execution_context = jsonb_set(
            COALESCE(execution_context, '{}'),
            '{pause_reason}',
            '"Manual pause by user"'
          )
      WHERE account_id = $1 AND status = 'active'
      RETURNING *
    `;

      const result = await workflowDb.db.query(updateQuery, [accountId]);

      if (result.rowCount === 0) {
        return {
          success: false,
          error: "Workflow not found or not active",
        };
      }

      // NO cancelamos las tareas, solo las marcamos como pausadas
      const pauseTasksQuery = `
      UPDATE scheduled_tasks st
      SET execution_context = jsonb_set(
        COALESCE(execution_context, '{}'),
        '{paused}',
        'true'
      )
      FROM workflow_instances wi
      WHERE st.workflow_instance_id = wi.id
      AND wi.account_id = $1
      AND st.status = 'scheduled'
    `;

      await workflowDb.db.query(pauseTasksQuery, [accountId]);

      this.emit("execution:paused", {
        accountId,
        executionId: execution?.executionId || "unknown",
        pausedBy: "user",
      });

      console.log(`✅ Workflow paused successfully for account: ${accountId}`);

      return {
        success: true,
        message: "Workflow paused successfully",
        canResume: true,
      };
    } catch (error) {
      console.error(`❌ Failed to pause workflow:`, error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * NUEVA: Resumir workflow pausado
   * @param {string} accountId - Account ID
   * @returns {Promise<Object>} Resume result
   */
  async resumeExecution(accountId) {
    console.log(`▶️ Resuming workflow execution: ${accountId}`);

    try {
      // Verificar que el workflow esté pausado
      const checkQuery = `
      SELECT * FROM workflow_instances 
      WHERE account_id = $1 AND status = 'paused'
    `;

      const checkResult = await workflowDb.db.query(checkQuery, [accountId]);

      if (checkResult.rowCount === 0) {
        return {
          success: false,
          error: "No paused workflow found for this account",
        };
      }

      const workflowInstance = checkResult.rows[0];

      // Actualizar estado a activo
      const updateQuery = `
      UPDATE workflow_instances 
      SET status = 'active',
          resumed_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP,
          execution_context = jsonb_set(
            COALESCE(execution_context, '{}'),
            '{resumed_at}',
            to_jsonb(CURRENT_TIMESTAMP::text)
          )
      WHERE account_id = $1 AND status = 'paused'
      RETURNING *
    `;

      await workflowDb.db.query(updateQuery, [accountId]);

      // Reactivar tareas pausadas
      const resumeTasksQuery = `
      UPDATE scheduled_tasks st
      SET execution_context = jsonb_set(
        COALESCE(execution_context, '{}'),
        '{paused}',
        'false'
      )
      FROM workflow_instances wi
      WHERE st.workflow_instance_id = wi.id
      AND wi.account_id = $1
      AND st.status = 'scheduled'
    `;

      await workflowDb.db.query(resumeTasksQuery, [accountId]);

      // Cargar el workflow en memoria si no está
      let execution = this.activeExecutions.get(accountId);
      if (!execution) {
        execution = await this.loadExecutionFromDatabase(accountId);
        if (execution) {
          this.activeExecutions.set(accountId, execution);
        }
      }

      // Si hay un siguiente paso pendiente, programarlo
      if (execution && execution.currentStep < execution.totalSteps) {
        await this.scheduleNextStep(execution);
      }

      this.emit("execution:resumed", {
        accountId,
        executionId: execution?.executionId || "unknown",
      });

      console.log(`✅ Workflow resumed successfully for account: ${accountId}`);

      return {
        success: true,
        message: "Workflow resumed successfully",
        currentStep: execution?.currentStep,
        totalSteps: execution?.totalSteps,
      };
    } catch (error) {
      console.error(`❌ Failed to resume workflow:`, error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Complete workflow execution
   * @param {Object} execution - Execution state
   */
  async completeExecution(execution) {
    console.log(`✅ Completing workflow execution: ${execution.accountId}`);

    execution.status = "completed";
    execution.completedAt = new Date();

    this.executionStats.successfulExecutions++;
    this.updateAverageExecutionTime(Date.now() - execution.startedAt.getTime());

    // Update database
    await workflowDb.completeWorkflowInstance(execution.accountId);

    this.emit("execution:completed", {
      accountId: execution.accountId,
      executionId: execution.executionId,
      duration: execution.completedAt - execution.startedAt,
      totalSteps: execution.totalSteps,
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

    execution.status = "failed";
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

    this.emit("execution:failed", {
      accountId: execution.accountId,
      executionId: execution.executionId,
      error: error.message,
      stepsCompleted: execution.currentStep,
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
      return { success: false, error: "Execution not found" };
    }

    console.log(`🛑 Stopping workflow execution: ${accountId}`);

    execution.status = "stopped";
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

    this.emit("execution:stopped", {
      accountId,
      executionId: execution.executionId,
    });

    return { success: true, message: "Execution stopped" };
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
      progress: Math.round(
        (execution.currentStep / execution.totalSteps) * 100
      ),
      startedAt: execution.startedAt,
      lastActivity: execution.lastActivity,
      retryCount: execution.retryCount,
      maxRetries: execution.maxRetries,
      lastError: execution.lastError,
      nextStep: execution.workflowDef.steps[execution.currentStep],
      continuousSwipeActive: !!execution.continuousSwipeTaskId,
      executionLog: execution.executionLog.slice(-5), // Last 5 entries
    };
  }

  /**
   * Get detailed workflow status including database info
   * @param {string} accountId - Account ID
   * @returns {Promise<Object|null>} Detailed workflow status
   */
  async getDetailedWorkflowStatus(accountId) {
    try {
      // Primero intentar obtener de memoria
      let execution = this.activeExecutions.get(accountId);

      // Si no está en memoria, cargar desde base de datos
      if (!execution) {
        console.log(
          `📥 Loading execution from database for detailed status: ${accountId}`
        );
        execution = await this.loadExecutionFromDatabase(accountId);

        if (!execution) {
          // No hay workflow activo, buscar en la base de datos cualquier estado
          const workflowInstance =
            await workflowDb.getWorkflowInstanceByAccountId(accountId);

          if (!workflowInstance) {
            console.log(`❌ No workflow found for account: ${accountId}`);
            return null;
          }

          // Obtener logs de ejecución
          const executionLogs = await workflowDb.getExecutionLog(
            workflowInstance.id,
            20
          );

          // Obtener tareas programadas
          const scheduledTasksQuery = `
          SELECT * FROM scheduled_tasks 
          WHERE workflow_instance_id = $1 
          ORDER BY scheduled_for DESC 
          LIMIT 10
        `;
          const scheduledTasks = await workflowDb.db.query(
            scheduledTasksQuery,
            [workflowInstance.id]
          );

          // Retornar información de la base de datos
          return {
            accountId: accountId,
            workflowType: workflowInstance.workflow_type,
            status: workflowInstance.status,
            currentStep: workflowInstance.current_step,
            totalSteps: workflowInstance.total_steps,
            progress: workflowInstance.progress_percentage || 0,
            startedAt: workflowInstance.started_at,
            lastActivity: workflowInstance.last_activity_at,
            completedAt: workflowInstance.completed_at,
            failedAt: workflowInstance.failed_at,
            stoppedAt: workflowInstance.stopped_at,
            pausedAt: workflowInstance.paused_at,
            resumedAt: workflowInstance.resumed_at,
            finalError: workflowInstance.final_error,
            nextActionAt: workflowInstance.next_action_at,
            retryCount: workflowInstance.retry_count || 0,
            executionContext: workflowInstance.execution_context,
            accountData: workflowInstance.account_data,
            workflowDefinition: {
              name: workflowInstance.workflow_name,
              description: workflowInstance.workflow_description,
              steps: workflowInstance.steps,
            },
            executionLogs: executionLogs.map((log) => ({
              stepId: log.step_id,
              stepIndex: log.step_index,
              action: log.action,
              description: log.description,
              success: log.success,
              result: log.result,
              error: log.error_message,
              duration: log.duration_ms,
              executedAt: log.executed_at,
            })),
            scheduledTasks: scheduledTasks.rows.map((task) => ({
              taskId: task.task_id,
              stepId: task.step_id,
              action: task.action,
              status: task.status,
              scheduledFor: task.scheduled_for,
              createdAt: task.created_at,
              completedAt: task.completed_at,
              lastError: task.last_error,
              attempts: task.attempts,
            })),
            isInMemory: false,
          };
        }
      }

      // Si está en memoria, obtener información completa
      const workflowInstance = await workflowDb.getWorkflowInstanceById(
        execution.workflowInstanceId
      );
      const executionLogs = await workflowDb.getExecutionLog(
        execution.workflowInstanceId,
        20
      );
      const scheduledTasksQuery = `
      SELECT * FROM scheduled_tasks 
      WHERE workflow_instance_id = $1 
      ORDER BY scheduled_for DESC 
      LIMIT 10
    `;
      const scheduledTasks = await workflowDb.db.query(scheduledTasksQuery, [
        execution.workflowInstanceId,
      ]);

      return {
        // Información de memoria
        executionId: execution.executionId,
        accountId: execution.accountId,
        workflowType: execution.workflowType,
        status: execution.status,
        currentStep: execution.currentStep,
        totalSteps: execution.totalSteps,
        progress: Math.round(
          (execution.currentStep / execution.totalSteps) * 100
        ),
        startedAt: execution.startedAt,
        lastActivity: execution.lastActivity,
        retryCount: execution.retryCount,
        maxRetries: execution.maxRetries,
        lastError: execution.lastError,
        continuousSwipeActive: !!execution.continuousSwipeTaskId,
        continuousSwipeTaskId: execution.continuousSwipeTaskId,

        // Información de base de datos
        workflowInstanceId: execution.workflowInstanceId,
        nextActionAt: workflowInstance?.next_action_at,
        nextTaskId: workflowInstance?.next_task_id,
        completedAt: workflowInstance?.completed_at,
        failedAt: workflowInstance?.failed_at,
        stoppedAt: workflowInstance?.stopped_at,
        pausedAt: workflowInstance?.paused_at,
        resumedAt: workflowInstance?.resumed_at,
        finalError: workflowInstance?.final_error,
        executionContext: workflowInstance?.execution_context,
        accountData: execution.accountData,

        // Definición del workflow
        workflowDefinition: {
          name: execution.workflowDef.name,
          description: execution.workflowDef.description,
          steps: execution.workflowDef.steps,
          config: execution.workflowDef.config,
        },

        // Próximo paso
        nextStep: execution.workflowDef.steps[execution.currentStep],

        // Logs de ejecución (desde DB)
        executionLogs: executionLogs.map((log) => ({
          stepId: log.step_id,
          stepIndex: log.step_index,
          action: log.action,
          description: log.description,
          success: log.success,
          result: log.result,
          error: log.error_message,
          duration: log.duration_ms,
          executedAt: log.executed_at,
        })),

        // Tareas programadas activas
        scheduledTasks: scheduledTasks.rows.map((task) => ({
          taskId: task.task_id,
          stepId: task.step_id,
          action: task.action,
          status: task.status,
          scheduledFor: task.scheduled_for,
          createdAt: task.created_at,
          completedAt: task.completed_at,
          lastError: task.last_error,
          attempts: task.attempts,
        })),

        // Estado de tareas en memoria
        memoryScheduledTasks: Array.from(
          execution.scheduledTasks.entries()
        ).map(([stepId, taskId]) => ({
          stepId,
          taskId,
        })),

        isInMemory: true,
      };
    } catch (error) {
      console.error(
        `❌ Error getting detailed workflow status for ${accountId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Get all active executions
   * @returns {Array} Active executions
   */
  getAllActiveExecutions() {
    return Array.from(this.activeExecutions.values()).map((execution) => ({
      executionId: execution.executionId,
      accountId: execution.accountId,
      workflowType: execution.workflowType,
      status: execution.status,
      progress: Math.round(
        (execution.currentStep / execution.totalSteps) * 100
      ),
      startedAt: execution.startedAt,
      lastActivity: execution.lastActivity,
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
      isInitialized: this.isInitialized,
    };
  }

  /**
   * Recover interrupted executions on startup
   */
  async recoverInterruptedExecutions() {
    try {
      console.log("🔄 Recovering interrupted executions...");

      const activeWorkflows = await workflowDb.getActiveWorkflowInstances();
      console.log(
        `   Found ${activeWorkflows.length} active workflows to recover`
      );

      for (const workflow of activeWorkflows) {
        try {
          // Recreate execution state
          const workflowDef = this.workflowDefinitions.get(
            workflow.workflow_type
          );
          if (!workflowDef) {
            console.log(
              `⚠️ Workflow definition not found: ${workflow.workflow_type}, skipping recovery`
            );
            await workflowDb.failWorkflowInstance(
              workflow.account_id,
              "Workflow definition not found during recovery"
            );
            continue;
          }

          const execution = {
            executionId: `recovered_${workflow.account_id}_${Date.now()}`,
            accountId: workflow.account_id,
            accountData: workflow.account_data,
            workflowType: workflow.workflow_type,
            workflowDef,
            workflowInstanceId: workflow.id,
            status: "active",
            currentStep: workflow.current_step,
            totalSteps: workflow.total_steps,
            startedAt: workflow.started_at,
            lastActivity: workflow.last_activity_at,
            retryCount: workflow.retry_count || 0,
            maxRetries: workflowDef.maxRetries || 3,
            executionLog: [],
            scheduledTasks: new Map(),
            continuousSwipeTaskId: null,
          };

          // Add to active executions
          this.activeExecutions.set(execution.accountId, execution);

          // Resume from current step
          if (execution.currentStep < execution.totalSteps) {
            await this.scheduleNextStep(execution);
            console.log(
              `   ✅ Recovered execution: ${execution.accountId} (step ${execution.currentStep})`
            );
          } else {
            // Execution was completed
            await this.completeExecution(execution);
          }
        } catch (recoverError) {
          console.error(
            `❌ Failed to recover execution ${workflow.account_id}:`,
            recoverError
          );
          await workflowDb.failWorkflowInstance(
            workflow.account_id,
            `Recovery failed: ${recoverError.message}`
          );
        }
      }

      console.log(
        `✅ Recovery completed: ${this.activeExecutions.size} executions recovered`
      );
    } catch (error) {
      console.error("❌ Recovery process failed:", error);
    }
  }

  async checkWorkflowStatus(accountId) {
    const query = `
      SELECT status, execution_context
      FROM workflow_instances
      WHERE account_id = $1
    `;

    const result = await workflowDb.db.query(query, [accountId]);
    return result.rows[0];
  }

  // Nuevo método helper para calcular delays desde el inicio del workflow
  calculateDelayFromStart(execution, step) {
    // Para steps como bio_after_24h, necesitamos calcular desde el inicio
    // no desde el step actual
    if (step.delay && step.delay > 3600000) {
      // Si el delay es mayor a 1 hora
      // Es probable que sea un delay desde el inicio del workflow
      return step.delay;
    }

    // Para delays cortos, usar el delay normal
    return step.delay || 0;
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Listen to task scheduler events
    taskScheduler.on("task:completed", (data) => {
      if (data.metadata && data.metadata.action === "execute_workflow_step") {
        console.log(`📊 Workflow step task completed: ${data.taskId}`);
      }
    });

    taskScheduler.on("task:failed", (data) => {
      if (data.metadata && data.metadata.action === "execute_workflow_step") {
        console.error(
          `📊 Workflow step task failed: ${data.taskId}`,
          data.error
        );
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
        (this.executionStats.averageExecutionTime * (total - 1) + duration) /
        total;
    }
  }
}

// Export singleton instance
module.exports = new WorkflowExecutor();
