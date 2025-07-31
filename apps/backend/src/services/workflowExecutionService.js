// src/services/workflowExecutionService.js - Specialized Workflow Execution Service

const EventEmitter = require("events");
const flamebotActionsService = require("./flamebotActionsService");
const aiService = require("./aiService");

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

        case "swipe":
        case "swipe_with_spectre":
          result = await this.executeSwipe(execution, stepConfig);
          break;

        case "activate_continuous_swipe":
          result = await this.executeActivateContinuousSwipe(execution, stepConfig);
          break;

        case "deactivate_continuous_swipe":
          result = await this.executeDeactivateContinuousSwipe(execution, stepConfig);
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
   * Execute add_prompt action
   * @param {Object} execution - Execution context
   * @param {Object} stepConfig - Step configuration
   * @returns {Promise<Object>} Execution result
   */
  async executeAddPrompt(execution, stepConfig) {
    const { accountData } = execution;
    const { model, channel } = stepConfig;

    console.log(`💬 Adding prompt for ${accountData.card_id} - Model: ${model}, Channel: ${channel}`);

    const result = await flamebotActionsService.updatePrompt(
      accountData.card_id,
      model || "DefaultModel",
      channel || "gram"
    );

    return {
      success: true,
      taskId: result.taskId,
      generatedPrompt: result.visibleText,
      obfuscatedPrompt: result.obfuscatedText
    };
  }

  /**
   * Execute add_bio action
   * @param {Object} execution - Execution context
   * @param {Object} stepConfig - Step configuration
   * @returns {Promise<Object>} Execution result
   */
  async executeAddBio(execution, stepConfig) {
    const { accountData } = execution;
    const customBio = stepConfig.bio || null;

    console.log(`📝 Adding bio for ${accountData.card_id}`);

    const result = await flamebotActionsService.updateBio(
      accountData.card_id,
      customBio
    );

    return {
      success: true,
      taskId: result.taskId,
      generatedBio: result.generatedBio
    };
  }

  /**
   * Execute swipe action
   * @param {Object} execution - Execution context
   * @param {Object} stepConfig - Step configuration
   * @returns {Promise<Object>} Execution result
   */
  async executeSwipe(execution, stepConfig) {
    const { accountData } = execution;
    const swipeCount = stepConfig.swipeCount || 10;

    console.log(`👆 Starting swipe session for ${accountData.card_id} - Count: ${swipeCount}`);

    const result = await flamebotActionsService.swipe(
      accountData.card_id,
      swipeCount
    );

    return {
      success: true,
      taskId: result.taskId,
      swipeCount,
      swipeResults: result.swipeResults
    };
  }

  /**
   * Execute activate_continuous_swipe action
   * @param {Object} execution - Execution context
   * @param {Object} stepConfig - Step configuration
   * @returns {Promise<Object>} Execution result
   */
  async executeActivateContinuousSwipe(execution, stepConfig) {
    const { accountData } = execution;

    console.log(`🔄 Activating continuous swipe for ${accountData.card_id}`);

    const result = await flamebotActionsService.activateContinuousSwipe(
      accountData.card_id
    );

    return {
      success: true,
      continuousTaskId: result.continuousTaskId,
      message: "Continuous swipe activated"
    };
  }

  /**
   * Execute deactivate_continuous_swipe action
   * @param {Object} execution - Execution context
   * @param {Object} stepConfig - Step configuration
   * @returns {Promise<Object>} Execution result
   */
  async executeDeactivateContinuousSwipe(execution, stepConfig) {
    const { accountData } = execution;

    console.log(`⏹️ Deactivating continuous swipe for ${accountData.card_id}`);

    const result = await flamebotActionsService.deactivateContinuousSwipe(
      accountData.card_id
    );

    return {
      success: true,
      message: "Continuous swipe deactivated"
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

module.exports = new WorkflowExecutionService();