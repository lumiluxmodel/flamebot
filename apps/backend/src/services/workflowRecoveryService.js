// src/services/workflowRecoveryService.js - Specialized Workflow Recovery Service

const EventEmitter = require("events");

/**
 * WorkflowRecoveryService - Handles single responsibility of workflow recovery and cleanup
 * Separated from WorkflowExecutor to follow Single Responsibility Principle
 */
class WorkflowRecoveryService extends EventEmitter {
  constructor(workflowDatabaseService) {
    super();
    
    this.workflowDb = workflowDatabaseService;
    
    this.recoveryStats = {
      totalRecoveryAttempts: 0,
      successfulRecoveries: 0,
      failedRecoveries: 0,
      interruptedWorkflowsFound: 0,
      orphanedTasksFound: 0,
      lastRecoveryRun: null
    };

    this.recoveryConfig = {
      maxRecoveryAge: 24 * 60 * 60 * 1000, // 24 hours
      maxRecoveryAttempts: 3,
      recoveryBatchSize: 10,
      orphanTaskCleanupAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    };

    console.log("🔧 Workflow Recovery Service initialized");
  }

  /**
   * Recover all interrupted workflows
   * @returns {Promise<Object>} Recovery summary
   */
  async recoverInterruptedExecutions() {
    console.log("🔧 Starting recovery of interrupted workflow executions...");
    
    const startTime = Date.now();
    this.recoveryStats.lastRecoveryRun = new Date();

    try {
      // Get interrupted workflows from database
      const interruptedWorkflows = await this.findInterruptedWorkflows();
      this.recoveryStats.interruptedWorkflowsFound = interruptedWorkflows.length;

      console.log(`📋 Found ${interruptedWorkflows.length} interrupted workflows to recover`);

      const recoveryResults = {
        found: interruptedWorkflows.length,
        recovered: 0,
        failed: 0,
        skipped: 0,
        details: []
      };

      // Process in batches to avoid overwhelming the system
      for (let i = 0; i < interruptedWorkflows.length; i += this.recoveryConfig.recoveryBatchSize) {
        const batch = interruptedWorkflows.slice(i, i + this.recoveryConfig.recoveryBatchSize);
        
        console.log(`🔄 Processing recovery batch ${Math.floor(i / this.recoveryConfig.recoveryBatchSize) + 1}/${Math.ceil(interruptedWorkflows.length / this.recoveryConfig.recoveryBatchSize)}`);

        for (const workflow of batch) {
          const result = await this.recoverSingleWorkflow(workflow);
          recoveryResults.details.push(result);

          if (result.success) {
            recoveryResults.recovered++;
          } else if (result.skipped) {
            recoveryResults.skipped++;
          } else {
            recoveryResults.failed++;
          }
        }

        // Small delay between batches
        if (i + this.recoveryConfig.recoveryBatchSize < interruptedWorkflows.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      // Update stats
      this.recoveryStats.totalRecoveryAttempts += recoveryResults.found;
      this.recoveryStats.successfulRecoveries += recoveryResults.recovered;
      this.recoveryStats.failedRecoveries += recoveryResults.failed;

      const duration = Date.now() - startTime;
      
      console.log(`✅ Recovery completed in ${duration}ms - Recovered: ${recoveryResults.recovered}, Failed: ${recoveryResults.failed}, Skipped: ${recoveryResults.skipped}`);

      this.emit('recovery:completed', {
        ...recoveryResults,
        duration,
        timestamp: new Date()
      });

      return recoveryResults;

    } catch (error) {
      console.error("❌ Recovery process failed:", error);
      this.emit('recovery:failed', {
        error: error.message,
        duration: Date.now() - startTime,
        timestamp: new Date()
      });
      throw error;
    }
  }

  /**
   * Find interrupted workflows that need recovery
   * @returns {Promise<Array>} Array of interrupted workflows
   */
  async findInterruptedWorkflows() {
    const cutoffTime = new Date(Date.now() - this.recoveryConfig.maxRecoveryAge);
    
    try {
      const workflows = await this.workflowDb.getWorkflowsForRecovery();
      
      // Filter and validate workflows for recovery
      const validWorkflows = [];
      
      for (const workflow of workflows) {
        // Skip if too old
        if (workflow.updated_at < cutoffTime) {
          console.log(`⏭️ Skipping old workflow ${workflow.account_id} (updated: ${workflow.updated_at})`);
          continue;
        }

        // Skip if already failed too many times
        if (workflow.retry_count >= this.recoveryConfig.maxRecoveryAttempts) {
          console.log(`⏭️ Skipping workflow ${workflow.account_id} (max retries reached: ${workflow.retry_count})`);
          continue;
        }

        // Validate workflow definition still exists
        if (!workflow.workflow_type || !workflow.execution_context) {
          console.log(`⏭️ Skipping invalid workflow ${workflow.account_id} (missing data)`);
          continue;
        }

        validWorkflows.push(workflow);
      }

      return validWorkflows;

    } catch (error) {
      console.error("❌ Failed to find interrupted workflows:", error);
      throw error;
    }
  }

  /**
   * Recover a single workflow
   * @param {Object} workflow - Workflow instance to recover
   * @returns {Promise<Object>} Recovery result
   */
  async recoverSingleWorkflow(workflow) {
    const accountId = workflow.account_id;
    
    console.log(`🔧 Attempting to recover workflow for account ${accountId}`);

    try {
      // Validate workflow state
      const validationResult = await this.validateWorkflowForRecovery(workflow);
      if (!validationResult.isValid) {
        console.log(`⏭️ Skipping recovery for ${accountId}: ${validationResult.reason}`);
        
        await this.markWorkflowAsUnrecoverable(workflow, validationResult.reason);
        
        return {
          accountId,
          success: false,
          skipped: true,
          reason: validationResult.reason
        };
      }

      // Clean up any orphaned tasks for this workflow
      await this.cleanupOrphanedTasks(accountId);

      // Reset workflow state for recovery
      await this.resetWorkflowForRecovery(workflow);

      // Emit recovery event for the main executor to pick up
      this.emit('workflow:recovery_ready', {
        accountId,
        workflowType: workflow.workflow_type,
        executionContext: workflow.execution_context,
        accountData: workflow.account_data,
        currentStep: workflow.current_step || 0,
        retryCount: workflow.retry_count || 0
      });

      console.log(`✅ Successfully prepared workflow ${accountId} for recovery`);

      return {
        accountId,
        success: true,
        skipped: false,
        currentStep: workflow.current_step || 0,
        retryCount: workflow.retry_count || 0
      };

    } catch (error) {
      console.error(`❌ Failed to recover workflow ${accountId}:`, error);

      // Mark workflow as failed if too many recovery attempts
      if (workflow.retry_count >= this.recoveryConfig.maxRecoveryAttempts - 1) {
        await this.markWorkflowAsFailed(workflow, `Recovery failed: ${error.message}`);
      }

      return {
        accountId,
        success: false,
        skipped: false,
        error: error.message
      };
    }
  }

  /**
   * Validate if workflow can be recovered
   * @param {Object} workflow - Workflow to validate
   * @returns {Promise<Object>} Validation result
   */
  async validateWorkflowForRecovery(workflow) {
    // Check if account data is valid
    if (!workflow.account_data || !workflow.account_data.card_id) {
      return {
        isValid: false,
        reason: "Missing or invalid account data"
      };
    }

    // Check if workflow type is valid
    if (!workflow.workflow_type) {
      return {
        isValid: false,
        reason: "Missing workflow type"
      };
    }

    // Check if execution context exists
    if (!workflow.execution_context) {
      return {
        isValid: false,
        reason: "Missing execution context"
      };
    }

    // Check if workflow hasn't been running for too long
    const maxAge = Date.now() - this.recoveryConfig.maxRecoveryAge;
    if (workflow.created_at < new Date(maxAge)) {
      return {
        isValid: false,
        reason: "Workflow too old for recovery"
      };
    }

    // Additional business logic validations could go here
    // For example: check if account is still active, check dependencies, etc.

    return {
      isValid: true,
      reason: "Workflow is valid for recovery"
    };
  }

  /**
   * Reset workflow state for recovery
   * @param {Object} workflow - Workflow to reset
   */
  async resetWorkflowForRecovery(workflow) {
    const updates = {
      status: 'recovering',
      next_action_at: new Date(),
      next_task_id: null,
      last_error: null,
      retry_count: (workflow.retry_count || 0) + 1
    };

    await this.workflowDb.updateWorkflowInstance(workflow.account_id, updates);
    
    console.log(`🔄 Reset workflow state for ${workflow.account_id}`);
  }

  /**
   * Mark workflow as unrecoverable
   * @param {Object} workflow - Workflow to mark
   * @param {string} reason - Reason for being unrecoverable
   */
  async markWorkflowAsUnrecoverable(workflow, reason) {
    const updates = {
      status: 'unrecoverable',
      last_error: reason,
      completed_at: new Date()
    };

    await this.workflowDb.updateWorkflowInstance(workflow.account_id, updates);
    
    console.log(`❌ Marked workflow ${workflow.account_id} as unrecoverable: ${reason}`);
  }

  /**
   * Mark workflow as permanently failed
   * @param {Object} workflow - Workflow to mark
   * @param {string} error - Error message
   */
  async markWorkflowAsFailed(workflow, error) {
    const updates = {
      status: 'failed',
      last_error: error,
      completed_at: new Date()
    };

    await this.workflowDb.updateWorkflowInstance(workflow.account_id, updates);
    
    console.log(`❌ Marked workflow ${workflow.account_id} as permanently failed: ${error}`);
  }

  /**
   * Clean up orphaned tasks for a specific account
   * @param {string} accountId - Account ID
   */
  async cleanupOrphanedTasks(accountId) {
    try {
      // This would interact with task scheduler to cancel any orphaned tasks
      // Implementation depends on task scheduler interface
      console.log(`🧹 Cleaning up orphaned tasks for ${accountId}`);
      
      // Placeholder for actual cleanup logic
      // await taskScheduler.cancelTasksForAccount(accountId);
      
    } catch (error) {
      console.warn(`⚠️ Failed to cleanup orphaned tasks for ${accountId}:`, error.message);
      // Don't fail recovery for this
    }
  }

  /**
   * Perform comprehensive system cleanup
   * @returns {Promise<Object>} Cleanup summary
   */
  async performSystemCleanup() {
    console.log("🧹 Starting comprehensive system cleanup...");
    
    const startTime = Date.now();
    const cleanupResults = {
      orphanedTasks: 0,
      oldWorkflows: 0,
      staleExecutions: 0,
      errors: []
    };

    try {
      // Clean up old completed workflows
      const oldWorkflowCount = await this.cleanupOldWorkflows();
      cleanupResults.oldWorkflows = oldWorkflowCount;

      // Clean up orphaned scheduled tasks
      const orphanedTaskCount = await this.cleanupOrphanedScheduledTasks();
      cleanupResults.orphanedTasks = orphanedTaskCount;

      // Clean up stale execution records
      const staleExecutionCount = await this.cleanupStaleExecutions();
      cleanupResults.staleExecutions = staleExecutionCount;

      const duration = Date.now() - startTime;
      
      console.log(`✅ System cleanup completed in ${duration}ms`);
      console.log(`   Cleaned: ${cleanupResults.oldWorkflows} workflows, ${cleanupResults.orphanedTasks} tasks, ${cleanupResults.staleExecutions} executions`);

      this.emit('cleanup:completed', {
        ...cleanupResults,
        duration,
        timestamp: new Date()
      });

      return cleanupResults;

    } catch (error) {
      console.error("❌ System cleanup failed:", error);
      cleanupResults.errors.push(error.message);
      
      this.emit('cleanup:failed', {
        error: error.message,
        duration: Date.now() - startTime,
        timestamp: new Date()
      });

      return cleanupResults;
    }
  }

  /**
   * Clean up old completed workflows
   * @returns {Promise<number>} Number of cleaned workflows
   */
  async cleanupOldWorkflows() {
    const cutoffDate = new Date(Date.now() - (30 * 24 * 60 * 60 * 1000)); // 30 days
    
    try {
      const result = await this.workflowDb.cleanupOldWorkflows(cutoffDate);
      console.log(`🧹 Cleaned up ${result} old workflow records`);
      return result;
    } catch (error) {
      console.error("❌ Failed to cleanup old workflows:", error);
      return 0;
    }
  }

  /**
   * Clean up orphaned scheduled tasks
   * @returns {Promise<number>} Number of cleaned tasks
   */
  async cleanupOrphanedScheduledTasks() {
    // This would integrate with task scheduler
    // Placeholder implementation
    console.log("🧹 Cleaning up orphaned scheduled tasks...");
    return 0;
  }

  /**
   * Clean up stale execution records
   * @returns {Promise<number>} Number of cleaned executions
   */
  async cleanupStaleExecutions() {
    // Clean up execution log entries older than retention period
    const cutoffDate = new Date(Date.now() - (7 * 24 * 60 * 60 * 1000)); // 7 days
    
    try {
      const result = await this.workflowDb.cleanupOldExecutionLogs(cutoffDate);
      console.log(`🧹 Cleaned up ${result} old execution log entries`);
      return result;
    } catch (error) {
      console.error("❌ Failed to cleanup execution logs:", error);
      return 0;
    }
  }

  /**
   * Get recovery service statistics
   * @returns {Object} Recovery statistics
   */
  getRecoveryStats() {
    return {
      service: 'WorkflowRecoveryService',
      recoveryStats: { ...this.recoveryStats },
      recoveryConfig: { ...this.recoveryConfig },
      listenerCount: this.listenerCount('workflow:recovery_ready') + this.listenerCount('recovery:completed')
    };
  }

  /**
   * Update recovery configuration
   * @param {Object} newConfig - New configuration values
   */
  updateRecoveryConfig(newConfig) {
    this.recoveryConfig = {
      ...this.recoveryConfig,
      ...newConfig
    };
    
    console.log("⚙️ Updated recovery configuration:", newConfig);
    
    this.emit('config:updated', {
      newConfig: this.recoveryConfig,
      timestamp: new Date()
    });
  }
}

module.exports = WorkflowRecoveryService;