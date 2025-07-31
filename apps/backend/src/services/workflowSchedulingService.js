// src/services/workflowSchedulingService.js - Specialized Workflow Scheduling Service

const EventEmitter = require("events");
const taskScheduler = require("./taskScheduler");

/**
 * WorkflowSchedulingService - Database-First Workflow and Step Scheduling
 * Follows CODING_STANDARDS.md: Database is the Single Source of Truth
 */
class WorkflowSchedulingService extends EventEmitter {
  constructor(workflowDatabaseService) {
    super();
    this.workflowDb = workflowDatabaseService;
    // 🚀 DATABASE-FIRST: Removed in-memory Maps
    // All scheduling info is stored in database via scheduled_tasks table
    console.log("📅 Workflow Scheduling Service initialized (Database-First)");
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

      // 🚀 DATABASE-FIRST: Store scheduling info in database
      await this.workflowDb.createScheduledTask({
        taskId,
        workflowInstanceId: execution.workflowInstanceId,
        stepId: nextStep.id,
        action: "execute_workflow_step",
        scheduledFor: executeAt,
        payload: {
          accountId: execution.accountId,
          stepId: nextStep.id,
          delay,
          scheduledAt: new Date().toISOString()
        }
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

      // 🚀 DATABASE-FIRST: Store retry scheduling info in database
      await this.workflowDb.createScheduledTask({
        taskId: retryTaskId,
        workflowInstanceId: execution.workflowInstanceId,
        stepId: `retry_${execution.currentStep}_${retryCount}`,
        action: "retry_workflow_step",
        scheduledFor: retryAt,
        payload: {
          accountId: execution.accountId,
          retryCount,
          delay: retryDelay,
          originalError: error.message,
          scheduledAt: new Date().toISOString()
        }
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
          
          // 🚀 DATABASE-FIRST: Store parallel step scheduling info in database
          await this.workflowDb.createScheduledTask({
            taskId,
            workflowInstanceId: execution.workflowInstanceId,
            stepId: step.id,
            action: "execute_parallel_step",
            scheduledFor: executeAt,
            payload: {
              accountId: execution.accountId,
              stepId: step.id,
              delay: step.delay,
              isParallel: true,
              scheduledAt: new Date().toISOString()
            }
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
  /**
   * Cancel scheduled step (DATABASE-FIRST)
   * @param {string} taskId - Task ID to cancel
   * @returns {Promise<boolean>} Success status
   */
  async cancelScheduledTask(taskId) {
    try {
      // 🚀 DATABASE-FIRST: Get scheduled task from database
      const scheduledTask = await this.workflowDb.getScheduledTask(taskId);
      
      if (!scheduledTask) {
        console.warn(`⚠️ No scheduled task found for ${taskId}`);
        return false;
      }

      // Cancel in task scheduler
      if (taskId !== 'immediate') {
        await taskScheduler.cancelTask(taskId);
      }

      // Update database
      await this.workflowDb.cancelScheduledTask(taskId);
      
      this.emit('step:cancelled', {
        taskId,
        stepId: scheduledTask.step_id,
        accountId: scheduledTask.account_id
      });

      console.log(`✅ Cancelled scheduled task ${taskId}`);
      return true;

    } catch (error) {
      console.error(`❌ Failed to cancel scheduled task ${taskId}:`, error);
      this.emit('step:cancel_failed', {
        taskId,
        error: error.message
      });
      return false;
    }
  }

  /**
   * Get scheduling statistics
   * @returns {Object} Scheduling statistics
   */
  /**
   * Get scheduling statistics from database (DATABASE-FIRST)
   * @returns {Promise<Object>} Scheduling statistics
   */
  async getSchedulingStats() {
    try {
      // 🚀 DATABASE-FIRST: Get stats from database
      const query = `
        SELECT 
          COUNT(*) as total_scheduled,
          COUNT(*) FILTER (WHERE status = 'scheduled') as active_scheduled,
          COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_scheduled,
          COUNT(*) FILTER (WHERE status = 'completed') as completed_scheduled,
          COUNT(*) FILTER (WHERE status = 'failed') as failed_scheduled,
          COUNT(*) FILTER (WHERE action = 'retry_workflow_step') as retry_scheduled
        FROM scheduled_tasks
        WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '24 hours'
      `;
      
      const result = await this.workflowDb.db.query(query);
      const stats = result.rows[0];
      
      return {
        service: 'WorkflowSchedulingService',
        totalScheduled: parseInt(stats.total_scheduled) || 0,
        activeScheduled: parseInt(stats.active_scheduled) || 0,
        cancelledScheduled: parseInt(stats.cancelled_scheduled) || 0,
        completedScheduled: parseInt(stats.completed_scheduled) || 0,
        failedScheduled: parseInt(stats.failed_scheduled) || 0,
        retryScheduled: parseInt(stats.retry_scheduled) || 0,
        listenerCount: this.listenerCount('step:scheduled') + this.listenerCount('workflow:retry_scheduled')
      };
    } catch (error) {
      console.error('❌ Error getting scheduling stats:', error);
      return {
        service: 'WorkflowSchedulingService',
        error: error.message
      };
    }
  }

  /**
   * Cleanup completed or expired scheduling info
   * @param {number} maxAgeMs - Maximum age in milliseconds
   */
  /**
   * Cleanup old scheduled tasks from database (DATABASE-FIRST)
   * @param {number} olderThanDays - Remove tasks older than X days
   * @returns {Promise<number>} Number of tasks cleaned up
   */
  async cleanupSchedulingInfo(olderThanDays = 1) {
    try {
      // 🚀 DATABASE-FIRST: Cleanup using database method
      const cleanedCount = await this.workflowDb.cleanupOldTasks(olderThanDays);
      
      if (cleanedCount > 0) {
        console.log(`🧹 Cleaned up ${cleanedCount} old scheduled tasks from database`);
      }
      
      return cleanedCount;
    } catch (error) {
      console.error('❌ Error cleaning up scheduled tasks:', error);
      return 0;
    }
  }
}

module.exports = WorkflowSchedulingService;