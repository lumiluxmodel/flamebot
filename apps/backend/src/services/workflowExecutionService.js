// src/services/workflowExecutionService.js - Database-First Workflow Execution Service

const EventEmitter = require("events");
const flamebotActionsService = require("./flamebotActionsService");
const aiService = require("./aiService");
const accountDatabaseService = require("./accountDatabaseService");

/**
 * WorkflowExecutionService - Handles single responsibility of step execution
 * Separated from WorkflowExecutor to follow Single Responsibility Principle
 */
class WorkflowExecutionService extends EventEmitter {
  constructor() {
    super();
    console.log("🎯 Workflow Execution Service initialized");
  }

  /**
   * Execute a single workflow step action
   * @param {Object} execution - Current execution context
   * @param {Object} stepConfig - Step configuration
   * @returns {Promise<Object>} Step execution result
   */
  async executeStepAction(execution, stepConfig) {
    const { action } = stepConfig;
    let result = null;

    console.log(`🔄 Executing step: ${stepConfig.id} (${action})`);

    try {
      switch (action) {
        case "add_prompt":
          result = await this.executeAddPrompt(execution, stepConfig);
          break;

        case "add_bio":
          result = await this.executeAddBio(execution, stepConfig);
          break;

        case "swipe_with_spectre":
          result = await this.executeSwipe(execution, stepConfig);
          break;

        case "wait":
          result = await this.executeWait(execution, stepConfig);
          break;

        case "goto":
          result = await this.executeGoto(execution, stepConfig);
          break;

        default:
          throw new Error(`Unknown step action: ${action}`);
      }

      console.log(`✅ Step ${stepConfig.id} completed successfully`);
      this.emit('step:completed', {
        executionId: execution.accountId,
        stepId: stepConfig.id,
        action,
        result
      });

      return result;

    } catch (error) {
      console.error(`❌ Step ${stepConfig.id} failed:`, error);
      this.emit('step:failed', {
        executionId: execution.accountId,
        stepId: stepConfig.id,
        action,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Execute add_prompt action (DATABASE-FIRST)
   * @param {Object} execution - Execution context
   * @param {Object} stepConfig - Step configuration
   * @returns {Promise<Object>} Execution result
   */
  async executeAddPrompt(execution, stepConfig) {
    const { accountId } = execution;

    // 🚀 DATABASE-FIRST: Load account data from database
    console.log(`💾 Loading account data from database for ${accountId}...`);
    const accountData = await accountDatabaseService.loadAccountData(accountId);
    
    if (!accountData) {
      throw new Error(`Account not found in database: ${accountId}`);
    }

    // 🔍 Verificar si la cuenta está viva antes de continuar
    console.log(`🔍 Verificando estado de la cuenta ${accountId}...`);
    const isAlive = await flamebotActionsService.isAccountAlive(accountId);
    
    if (!isAlive) {
      throw new Error(`Account ${accountId} is not alive (banned or inactive). Skipping action.`);
    }
    console.log(`✅ Account ${accountId} is alive. Continuing with action.`);

    // Use database data as primary source, allow workflow override
    const model = stepConfig.model || accountData.model;
    const channel = stepConfig.channel || accountData.channel;

    if (!model) {
      throw new Error(`No model found in database for account: ${accountId}`);
    }

    if (!channel) {
      throw new Error(`No channel found in database for account: ${accountId}`);
    }

    console.log(`💬 Adding prompt for ${accountId} - Model: ${model}, Channel: ${channel} (from database)`);

    const result = await flamebotActionsService.updatePrompt(
      accountId, // Use accountId directly instead of card_id
      model,
      channel
    );

    return {
      success: true,
      taskId: result.taskId,
      generatedPrompt: result.visibleText,
      obfuscatedPrompt: result.obfuscatedText
    };
  }

  /**
   * Execute add_bio action (DATABASE-FIRST)
   * @param {Object} execution - Execution context
   * @param {Object} stepConfig - Step configuration
   * @returns {Promise<Object>} Execution result
   */
  async executeAddBio(execution, stepConfig) {
    const { accountId } = execution;
    
    // 🚀 DATABASE-FIRST: Load account data from database
    console.log(`💾 Loading account data from database for ${accountId}...`);
    const accountData = await accountDatabaseService.loadAccountData(accountId);
    
    if (!accountData) {
      throw new Error(`Account not found in database: ${accountId}`);
    }

    // 🔍 Verificar si la cuenta está viva antes de continuar
    console.log(`🔍 Verificando estado de la cuenta ${accountId}...`);
    const isAlive = await flamebotActionsService.isAccountAlive(accountId);
    
    if (!isAlive) {
      throw new Error(`Account ${accountId} is not alive (banned or inactive). Skipping action.`);
    }
    console.log(`✅ Account ${accountId} is alive. Continuing with action.`);

    const customBio = stepConfig.bio || null;

    console.log(`📝 Adding bio for ${accountId} (from database)`);

    const result = await flamebotActionsService.updateBio(
      accountId, // Use accountId directly
      customBio
    );

    return {
      success: true,
      taskId: result.taskId,
      generatedBio: result.generatedBio
    };
  }

  /**
   * Execute swipe action (DATABASE-FIRST)
   * @param {Object} execution - Execution context
   * @param {Object} stepConfig - Step configuration
   * @returns {Promise<Object>} Execution result
   */
  async executeSwipe(execution, stepConfig) {
    const { accountId } = execution;
    const swipeCount = stepConfig.swipeCount || 10;

    // 🚀 DATABASE-FIRST: Load account data from database for swipe tracking
    console.log(`💾 Loading account data from database for ${accountId}...`);
    const accountData = await accountDatabaseService.loadAccountData(accountId);
    
    if (!accountData) {
      throw new Error(`Account not found in database: ${accountId}`);
    }

    // 🔍 Verificar si la cuenta está viva antes de continuar
    console.log(`🔍 Verificando estado de la cuenta ${accountId}...`);
    const isAlive = await flamebotActionsService.isAccountAlive(accountId);
    
    if (!isAlive) {
      throw new Error(`Account ${accountId} is not alive (banned or inactive). Skipping action.`);
    }
    console.log(`✅ Account ${accountId} is alive. Continuing with action.`);

    console.log(`👆 Starting swipe session for ${accountId} - Count: ${swipeCount} (from database)`);

    // 🎯 PASO 1: Configurar el max_likes usando edit-tinder-cards
    console.log(`⚙️ Configurando max_likes: ${swipeCount} para cuenta ${accountId}`);
    const configPayload = {
      edits: [{
        card_id: accountId,
        update_data: {
          swiping: {
            mode: "spectre",
            swiping_type: "forcematching",
            like_percentage: 100,
            sleep_time: 13,
            swipe_until: "like_quantity",
            max_likes: swipeCount,
            force_matching_config: {
              mode: "like_and_dislike",
              failure_action: "retry_until_matched"
            }
          }
        }
      }]
    };

    try {
      const configResponse = await flamebotActionsService.client.post('/api/edit-tinder-cards', configPayload);
      const configTaskId = configResponse.data.task_id;
      
      if (!configTaskId) {
        throw new Error('No se recibió task_id al configurar swipe');
      }
      
      console.log(`✅ Configuración enviada. Task ID: ${configTaskId}`);
      
      // Esperar a que se complete la configuración
      await flamebotActionsService.pollEditTask(configTaskId);
      console.log(`✅ Configuración completada correctamente`);
      
    } catch (error) {
      console.error('❌ Error configurando max_likes:', error.message);
      throw new Error(`Failed to configure swipe settings: ${error.message}`);
    }

    // 🎯 PASO 2: Iniciar el swipe task
    console.log(`🚀 Iniciando swipe task para cuenta ${accountId}`);
    const result = await flamebotActionsService.startSwipeTask(
      [accountId], // Pasar como array según tu ejemplo
      `Workflow swipe ${swipeCount}`
    );

    // 🚀 DATABASE-FIRST: Update swipe stats in database
    if (result.success) {
      // Polling opcional para obtener resultados
      try {
        const finalStatus = await flamebotActionsService.pollSwipeTaskStatus(result.taskId, 10, 5000);
        if (finalStatus.celery_status === 'SUCCESS' && finalStatus.result) {
          const matchCount = finalStatus.result.matches || 0;
          await accountDatabaseService.updateSwipeStats(accountId, swipeCount, matchCount);
          console.log(`📊 Updated swipe stats in database: +${swipeCount} swipes, +${matchCount} matches`);
        }
      } catch (pollError) {
        console.log(`⚠️ Could not poll for results, but swipe task started successfully`);
      }
    }

    return {
      success: true,
      taskId: result.taskId,
      swipeCount
    };
  }


  /**
   * Execute wait action
   * @param {Object} execution - Execution context
   * @param {Object} stepConfig - Step configuration
   * @returns {Promise<Object>} Execution result
   */
  async executeWait(execution, stepConfig) {
    const delay = stepConfig.delay || 0;

    console.log(`⏳ Waiting ${delay}ms for ${execution.accountId}`);

    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    return {
      action: 'wait',
      success: true,
      waitedMs: delay,
      message: `Waited ${delay}ms`
    };
  }

  /**
   * Execute goto action - Creates loops in workflow execution
   * @param {Object} execution - Execution context
   * @param {Object} stepConfig - Step configuration
   * @returns {Promise<Object>} Execution result
   */
  async executeGoto(execution, stepConfig) {
    const { nextStep, description } = stepConfig;
    
    console.log(`🔄 Executing goto step: ${stepConfig.id} -> ${nextStep}`);
    
    // Validate nextStep is provided
    if (!nextStep) {
      throw new Error('nextStep is required for goto action');
    }
    
    // Verify that the nextStep exists in the workflow definition
    const workflowDef = execution.workflowDef;
    const targetStep = workflowDef.steps.find(step => step.id === nextStep);
    
    if (!targetStep) {
      throw new Error(`Invalid nextStep: ${nextStep}. Step not found in workflow definition.`);
    }
    
    // Find the index of the target step
    const targetStepIndex = workflowDef.steps.findIndex(step => step.id === nextStep);
    
    // Update execution to jump to the target step
    execution.currentStep = targetStepIndex;
    
    console.log(`✅ Goto executed: Jumping to step ${targetStepIndex} (${nextStep})`);
    
    return {
      action: 'goto',
      nextStep,
      targetStepIndex,
      loopCreated: true,
      description: description || `Jump to step ${nextStep}`,
      success: true
    };
  }

  /**
   * Get execution statistics
   * @returns {Object} Execution statistics
   */
  getExecutionStats() {
    return {
      service: 'WorkflowExecutionService',
      listenerCount: this.listenerCount('step:completed') + this.listenerCount('step:failed'),
      uptime: process.uptime()
    };
  }
}

module.exports = WorkflowExecutionService;
