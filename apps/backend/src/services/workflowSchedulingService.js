// src/services/workflowSchedulingService.js - Specialized Workflow Scheduling Service

const EventEmitter = require("events");
const taskScheduler = require("./taskScheduler");

/**
 * WorkflowSchedulingService - Handles single responsibility of workflow and step scheduling
 * Separated from WorkflowExecutor to follow Single Responsibility Principle
 */
class WorkflowSchedulingService extends EventEmitter {
  constructor() {
    super();
    this.scheduledWorkflows = new Map(); // workflowId -> scheduling info
    this.scheduledSteps = new Map(); // stepId -> scheduling info
    console.log("📅 Workflow Scheduling Service initialized");
  }

  /**
   * Schedule next workflow step
   * @param {Object} execution - Current execution context
   * @param {Object} nextStep - Next step configuration
   * @param {number} nextStepIndex - Index of next step
   * @returns {Promise<string>} Task ID
   */
  async scheduleNextStep(execution, nextStep, nextStepIndex) {
    const delay = nextStep.delay || 0;
    const executeAt = new Date(Date.now() + delay);
    
    console.log(`📅 Scheduling step ${nextStep.id} for ${executeAt.toLocaleString()} (delay: ${delay}ms)`);

    try {
      // Create task for step execution
      const taskId = await taskScheduler.scheduleTask({
        workflowInstanceId: execution.workflowInstanceId, // Use actual workflow instance ID from database
        stepId: nextStep.id,
        scheduledFor: executeAt,
        action: "execute_workflow_step",
        payload: {
          action: "execute_workflow_step",
          accountId: execution.accountId,
          workflowType: execution.workflowType,
          stepId: nextStep.id,
          stepIndex: nextStepIndex,
          stepConfig: nextStep,
        },
        maxAttempts: nextStep.critical ? 3 : 1,
      });

      // Store scheduling info
      this.scheduledSteps.set(nextStep.id, {
        taskId,
        stepId: nextStep.id,
        accountId: execution.accountId,
        executeAt,
        delay,
        scheduledAt: new Date(),
        status: 'scheduled'
      });

      this.emit('step:scheduled', {
        taskId,
        stepId: nextStep.id,
        accountId: execution.accountId,
        executeAt,
        delay
      });

      console.log(`✅ Step ${nextStep.id} scheduled with task ID: ${taskId}`);
      return taskId;

    } catch (error) {
      console.error(`❌ Failed to schedule step ${nextStep.id}:`, error);
      this.emit('step:schedule_failed', {
        stepId: nextStep.id,
        accountId: execution.accountId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Schedule workflow retry after failure
   * @param {Object} execution - Current execution context
   * @param {Error} error - The error that caused the failure
   * @param {number} retryCount - Current retry count
   * @returns {Promise<string>} Retry task ID
   */
  async scheduleWorkflowRetry(execution, error, retryCount) {
    const backoffMs = execution.workflowDef.config?.retryBackoffMs || 30000;
    const retryDelay = Math.min(backoffMs * Math.pow(2, retryCount - 1), 300000); // Max 5 minutes
    const retryAt = new Date(Date.now() + retryDelay);

    console.log(`🔄 Scheduling workflow retry ${retryCount} for ${execution.accountId} at ${retryAt.toLocaleString()}`);

    try {
      const retryTaskId = await taskScheduler.scheduleTask({
        workflowInstanceId: execution.workflowInstanceId,
        stepId: `retry_${execution.currentStep}_${retryCount}`,
        scheduledFor: retryAt,
        action: "retry_workflow_step",
        payload: {
          action: "retry_workflow_step",
          accountId: execution.accountId,
          workflowType: execution.workflowType,
          stepId: execution.workflowDef.steps[execution.currentStep]?.id,
          stepIndex: execution.currentStep,
          stepConfig: execution.workflowDef.steps[execution.currentStep],
          retryCount,
          originalError: error.message,
        },
        maxAttempts: 1, // Only one attempt for retry tasks
      });

      // Store retry scheduling info
      this.scheduledWorkflows.set(`${execution.accountId}_retry_${retryCount}`, {
        taskId: retryTaskId,
        accountId: execution.accountId,
        workflowType: execution.workflowType,
        retryCount,
        executeAt: retryAt,
        delay: retryDelay,
        scheduledAt: new Date(),
        status: 'retry_scheduled',
        originalError: error.message
      });

      this.emit('workflow:retry_scheduled', {
        taskId: retryTaskId,
        accountId: execution.accountId,
        retryCount,
        executeAt: retryAt,
        delay: retryDelay,
        originalError: error.message
      });

      console.log(`✅ Workflow retry ${retryCount} scheduled with task ID: ${retryTaskId}`);
      return retryTaskId;

    } catch (scheduleError) {
      console.error(`❌ Failed to schedule workflow retry:`, scheduleError);
      this.emit('workflow:retry_schedule_failed', {
        accountId: execution.accountId,
        retryCount,
        error: scheduleError.message,
        originalError: error.message
      });
      throw scheduleError;
    }
  }

  /**
   * Schedule parallel workflow steps
   * @param {Object} execution - Current execution context
   * @param {Array} parallelSteps - Array of parallel steps to schedule
   * @returns {Promise<Array>} Array of task IDs
   */
  async scheduleParallelSteps(execution, parallelSteps) {
    console.log(`⚡ Scheduling ${parallelSteps.length} parallel steps for ${execution.accountId}`);

    const scheduledTasks = [];
    const now = Date.now();

    for (const step of parallelSteps) {
      try {
        const executeAt = new Date(now + (step.delay || 0));
        
        console.log(`   📅 Scheduling parallel step ${step.id} for ${executeAt.toLocaleString()}`);

        if (step.delay > 0) {
          // Schedule for future execution
          const taskId = await taskScheduler.scheduleTask({
            executeAt,
            action: "execute_parallel_step",
            metadata: {
              action: "execute_parallel_step",
              accountId: execution.accountId,
              workflowType: execution.workflowType,
              stepId: step.id,
              stepConfig: step,
              isParallel: true,
            },
            maxAttempts: step.critical ? 3 : 1,
          });

          scheduledTasks.push({ stepId: step.id, taskId, executeAt });
          
          // Store parallel step scheduling info
          this.scheduledSteps.set(`${step.id}_parallel`, {
            taskId,
            stepId: step.id,
            accountId: execution.accountId,
            executeAt,
            delay: step.delay,
            scheduledAt: new Date(),
            status: 'parallel_scheduled',
            isParallel: true
          });

        } else {
          // Execute immediately (delay = 0)
          console.log(`   ⚡ Parallel step ${step.id} delay already passed, will execute immediately`);
          scheduledTasks.push({ stepId: step.id, taskId: 'immediate', executeAt });
        }

      } catch (error) {
        console.error(`❌ Failed to schedule parallel step ${step.id}:`, error);
        
        this.emit('step:parallel_schedule_failed', {
          stepId: step.id,
          accountId: execution.accountId,
          error: error.message
        });

        // If critical step, rethrow error
        if (step.critical) {
          throw error;
        }
      }
    }

    this.emit('steps:parallel_scheduled', {
      accountId: execution.accountId,
      scheduledCount: scheduledTasks.length,
      totalSteps: parallelSteps.length,
      tasks: scheduledTasks
    });

    console.log(`✅ Scheduled ${scheduledTasks.length}/${parallelSteps.length} parallel steps`);
    return scheduledTasks;
  }

  /**
   * Cancel scheduled step
   * @param {string} stepId - Step ID to cancel
   * @returns {Promise<boolean>} Success status
   */
  async cancelScheduledStep(stepId) {
    const scheduledInfo = this.scheduledSteps.get(stepId) || this.scheduledSteps.get(`${stepId}_parallel`);
    
    if (!scheduledInfo) {
      console.warn(`⚠️ No scheduled step found for ${stepId}`);
      return false;
    }

    try {
      if (scheduledInfo.taskId !== 'immediate') {
        await taskScheduler.cancelTask(scheduledInfo.taskId);
      }

      scheduledInfo.status = 'cancelled';
      
      this.emit('step:cancelled', {
        stepId,
        taskId: scheduledInfo.taskId,
        accountId: scheduledInfo.accountId
      });

      console.log(`✅ Cancelled scheduled step ${stepId} (task: ${scheduledInfo.taskId})`);
      return true;

    } catch (error) {
      console.error(`❌ Failed to cancel scheduled step ${stepId}:`, error);
      this.emit('step:cancel_failed', {
        stepId,
        taskId: scheduledInfo.taskId,
        error: error.message
      });
      return false;
    }
  }

  /**
   * Get scheduling statistics
   * @returns {Object} Scheduling statistics
   */
  getSchedulingStats() {
    const scheduledStepsCount = this.scheduledSteps.size;
    const scheduledWorkflowsCount = this.scheduledWorkflows.size;
    
    let activeScheduled = 0;
    let cancelledScheduled = 0;
    let retryScheduled = 0;

    for (const [, info] of this.scheduledSteps) {
      if (info.status === 'scheduled' || info.status === 'parallel_scheduled') {
        activeScheduled++;
      } else if (info.status === 'cancelled') {
        cancelledScheduled++;
      }
    }

    for (const [, info] of this.scheduledWorkflows) {
      if (info.status === 'retry_scheduled') {
        retryScheduled++;
      }
    }

    return {
      service: 'WorkflowSchedulingService',
      scheduledSteps: scheduledStepsCount,
      scheduledWorkflows: scheduledWorkflowsCount,
      activeScheduled,
      cancelledScheduled,
      retryScheduled,
      listenerCount: this.listenerCount('step:scheduled') + this.listenerCount('workflow:retry_scheduled')
    };
  }

  /**
   * Cleanup completed or expired scheduling info
   * @param {number} maxAgeMs - Maximum age in milliseconds
   */
  cleanupSchedulingInfo(maxAgeMs = 24 * 60 * 60 * 1000) { // 24 hours default
    const now = Date.now();
    let cleanedCount = 0;

    // Cleanup steps
    for (const [key, info] of this.scheduledSteps) {
      if (now - info.scheduledAt.getTime() > maxAgeMs) {
        this.scheduledSteps.delete(key);
        cleanedCount++;
      }
    }

    // Cleanup workflows
    for (const [key, info] of this.scheduledWorkflows) {
      if (now - info.scheduledAt.getTime() > maxAgeMs) {
        this.scheduledWorkflows.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned up ${cleanedCount} old scheduling records`);
    }

    return cleanedCount;
  }
}

module.exports = new WorkflowSchedulingService();