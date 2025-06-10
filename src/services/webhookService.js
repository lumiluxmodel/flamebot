// src/services/webhookService.js
const axios = require('axios');
const config = require('../config');

class WebhookService {
  constructor() {
    this.webhooks = new Map(); // accountId -> webhook URL
    this.retryAttempts = 3;
    this.retryDelay = 1000; // 1 second
  }

  /**
   * Register a webhook for an account
   * @param {string} accountId - Account ID
   * @param {string} webhookUrl - Webhook URL
   */
  registerWebhook(accountId, webhookUrl) {
    console.log(`🪝 Registering webhook for account ${accountId}: ${webhookUrl}`);
    this.webhooks.set(accountId, webhookUrl);
  }

  /**
   * Remove webhook for an account
   * @param {string} accountId - Account ID
   */
  removeWebhook(accountId) {
    this.webhooks.delete(accountId);
  }

  /**
   * Send webhook notification
   * @param {string} accountId - Account ID
   * @param {string} event - Event type
   * @param {Object} data - Event data
   */
  async sendNotification(accountId, event, data) {
    const webhookUrl = this.webhooks.get(accountId);
    
    if (!webhookUrl) {
      return; // No webhook registered
    }

    const payload = {
      accountId,
      event,
      timestamp: new Date().toISOString(),
      data
    };

    console.log(`📤 Sending webhook to ${webhookUrl} - Event: ${event}`);

    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        const response = await axios.post(webhookUrl, payload, {
          timeout: 5000,
          headers: {
            'Content-Type': 'application/json',
            'X-Flamebot-Event': event,
            'X-Flamebot-Account': accountId
          }
        });

        console.log(`✅ Webhook sent successfully (${response.status})`);
        return { success: true, status: response.status };
      } catch (error) {
        console.error(`❌ Webhook attempt ${attempt} failed:`, error.message);
        
        if (attempt < this.retryAttempts) {
          await this.delay(this.retryDelay * attempt);
        } else {
          console.error(`❌ Webhook failed after ${this.retryAttempts} attempts`);
          return { success: false, error: error.message };
        }
      }
    }
  }

  /**
   * Workflow event notifications
   */
  async notifyWorkflowStarted(accountId, workflowData) {
    await this.sendNotification(accountId, 'workflow.started', {
      workflowName: workflowData.workflowName,
      totalSteps: workflowData.steps.length,
      estimatedDuration: this.calculateEstimatedDuration(workflowData.steps)
    });
  }

  async notifyStepStarted(accountId, step, stepIndex, totalSteps) {
    await this.sendNotification(accountId, 'workflow.step.started', {
      step: step.id,
      action: step.action,
      description: step.description,
      stepNumber: stepIndex + 1,
      totalSteps
    });
  }

  async notifyStepCompleted(accountId, step, result, stepIndex, totalSteps) {
    await this.sendNotification(accountId, 'workflow.step.completed', {
      step: step.id,
      action: step.action,
      success: true,
      result,
      stepNumber: stepIndex + 1,
      totalSteps
    });
  }

  async notifyStepFailed(accountId, step, error, stepIndex, totalSteps) {
    await this.sendNotification(accountId, 'workflow.step.failed', {
      step: step.id,
      action: step.action,
      success: false,
      error: error.message || error,
      stepNumber: stepIndex + 1,
      totalSteps
    });
  }

  async notifyWorkflowCompleted(accountId, workflowData) {
    await this.sendNotification(accountId, 'workflow.completed', {
      workflowName: workflowData.workflowName,
      duration: Date.now() - workflowData.startedAt.getTime(),
      successfulSteps: workflowData.results.filter(r => r.success).length,
      failedSteps: workflowData.results.filter(r => !r.success).length,
      totalSteps: workflowData.steps.length
    });
  }

  async notifyWorkflowFailed(accountId, workflowData, error) {
    await this.sendNotification(accountId, 'workflow.failed', {
      workflowName: workflowData.workflowName,
      duration: Date.now() - workflowData.startedAt.getTime(),
      currentStep: workflowData.currentStep,
      error: error.message || error,
      completedSteps: workflowData.results.filter(r => r.success).length
    });
  }

  /**
   * Calculate estimated duration for workflow
   * @param {Array} steps - Workflow steps
   * @returns {number} Estimated duration in ms
   */
  calculateEstimatedDuration(steps) {
    return steps.reduce((total, step) => total + (step.delay || 0), 0);
  }

  /**
   * Utility: delay function
   * @param {number} ms - Milliseconds
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get all registered webhooks
   * @returns {Array} List of registered webhooks
   */
  getAllWebhooks() {
    return Array.from(this.webhooks.entries()).map(([accountId, url]) => ({
      accountId,
      url
    }));
  }
}

module.exports = new WebhookService();