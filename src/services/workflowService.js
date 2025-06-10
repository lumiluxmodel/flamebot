// src/services/workflowService.js
const flamebotService = require('./flamebotService');
const flamebotActionsService = require('./flamebotActionsService');
const webhookService = require('./webhookService');
const workflows = require('../config/workflows');

class WorkflowService {
  constructor() {
    this.activeWorkflows = new Map(); // accountId -> workflow state
  }

  /**
   * Start a workflow for an account
   * @param {string} accountId - Flamebot account ID
   * @param {Object} accountData - Account data (model, channel, etc)
   * @param {string} workflowName - Workflow to use (default: 'default')
   * @param {string} webhookUrl - Optional webhook URL for notifications
   * @returns {Promise<Object>} Workflow execution result
   */
  async startWorkflow(accountId, accountData, workflowName = 'default', webhookUrl = null) {
    console.log(`🚀 Starting workflow '${workflowName}' for account ${accountId}`);
    
    const workflow = workflows[workflowName];
    if (!workflow) {
      throw new Error(`Workflow '${workflowName}' not found`);
    }
    
    // Register webhook if provided
    if (webhookUrl) {
      webhookService.registerWebhook(accountId, webhookUrl);
    }
    
    // Initialize workflow state
    const workflowState = {
      accountId,
      accountData,
      workflowName,
      startedAt: new Date(),
      currentStep: 0,
      steps: workflow.steps,
      results: [],
      status: 'running'
    };
    
    this.activeWorkflows.set(accountId, workflowState);
    
    // Notify workflow started
    await webhookService.notifyWorkflowStarted(accountId, workflowState);
    
    // Execute workflow
    try {
      await this.executeWorkflow(workflowState);
      workflowState.status = 'completed';
      workflowState.completedAt = new Date();
      
      // Notify workflow completed
      await webhookService.notifyWorkflowCompleted(accountId, workflowState);
      
      // Clean up webhook
      webhookService.removeWebhook(accountId);
      
      return {
        success: true,
        workflow: workflowState
      };
    } catch (error) {
      workflowState.status = 'failed';
      workflowState.error = error.message;
      
      // Notify workflow failed
      await webhookService.notifyWorkflowFailed(accountId, workflowState, error);
      
      // Clean up webhook
      webhookService.removeWebhook(accountId);
      
      throw error;
    }
  }

  /**
   * Execute workflow steps
   * @param {Object} workflowState - Workflow state
   */
  async executeWorkflow(workflowState) {
    const { accountId, accountData, steps } = workflowState;
    
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      workflowState.currentStep = i;
      
      console.log(`\n📍 Step ${i + 1}/${steps.length}: ${step.description}`);
      
      // Wait for delay if specified
      if (step.delay && i > 0) {
        console.log(`⏰ Waiting ${this.formatDelay(step.delay)}...`);
        await this.delay(step.delay);
      }
      
      // Execute step action
      try {
        // Notify step started
        await webhookService.notifyStepStarted(accountId, step, i, steps.length);
        
        const result = await this.executeStep(accountId, accountData, step);
        workflowState.results.push({
          step: step.id,
          success: true,
          result,
          timestamp: new Date()
        });
        
        // Notify step completed
        await webhookService.notifyStepCompleted(accountId, step, result, i, steps.length);
        
        console.log(`✅ Step completed: ${step.id}`);
      } catch (error) {
        console.error(`❌ Step failed: ${step.id}`, error.message);
        workflowState.results.push({
          step: step.id,
          success: false,
          error: error.message,
          timestamp: new Date()
        });
        
        // Notify step failed
        await webhookService.notifyStepFailed(accountId, step, error, i, steps.length);
        
        throw error; // Stop workflow on error
      }
    }
  }

  /**
   * Execute individual workflow step
   * @param {string} accountId - Account ID
   * @param {Object} accountData - Account data
   * @param {Object} step - Step configuration
   * @returns {Promise<Object>} Step result
   */
  async executeStep(accountId, accountData, step) {
    switch (step.action) {
      case 'import_account':
        // This is already done when workflow starts
        return { message: 'Account already imported' };
        
      case 'add_prompt':
        return await flamebotActionsService.updatePrompt(
          accountId,
          accountData.model,
          accountData.channel,
          step.config.customText || null
        );
        
      case 'add_bio':
        return await flamebotActionsService.updateBio(
          accountId,
          step.config.customText || null
        );
        
      case 'enable_spectre_mode':
        return await flamebotActionsService.enableSpectreMode(
          accountId,
          step.config
        );
        
      case 'swipe':
        const taskName = `Swipe ${step.id} - ${accountData.model}`;
        const swipeResult = await flamebotActionsService.startSwipeTask(
          [accountId],
          taskName
        );
        
        // Optionally wait for swipe completion
        if (step.config.waitForCompletion) {
          console.log('⏳ Waiting for swipe task to complete...');
          await this.waitForSwipeCompletion(swipeResult.taskId);
        }
        
        return swipeResult;
        
      default:
        throw new Error(`Unknown action: ${step.action}`);
    }
  }

  /**
   * Wait for swipe task completion
   * @param {string} taskId - Swipe task ID
   * @param {number} maxAttempts - Maximum polling attempts
   * @param {number} interval - Polling interval
   */
  async waitForSwipeCompletion(taskId, maxAttempts = 60, interval = 10000) {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const status = await flamebotActionsService.checkSwipeTaskStatus(taskId);
      
      if (status.celery_status === 'SUCCESS') {
        console.log('✅ Swipe task completed');
        return status;
      }
      
      if (status.celery_status === 'FAILURE' || status.celery_status === 'REVOKED') {
        throw new Error(`Swipe task failed: ${status.error}`);
      }
      
      console.log(`   Swipe status: ${status.celery_status} (${attempt}/${maxAttempts})`);
      
      if (attempt < maxAttempts) {
        await this.delay(interval);
      }
    }
    
    console.log('⚠️  Swipe task still running, continuing workflow...');
  }

  /**
   * Get workflow status
   * @param {string} accountId - Account ID
   * @returns {Object} Workflow state
   */
  getWorkflowStatus(accountId) {
    return this.activeWorkflows.get(accountId);
  }

  /**
   * Get all active workflows
   * @returns {Array} Active workflows
   */
  getAllWorkflows() {
    return Array.from(this.activeWorkflows.values());
  }

  /**
   * Utility: delay function
   * @param {number} ms - Milliseconds to wait
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
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
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }
}

module.exports = new WorkflowService();