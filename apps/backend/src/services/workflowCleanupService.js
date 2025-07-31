// src/services/workflowCleanupService.js - Database-First Automatic Cleanup Service

/**
 * WorkflowCleanupService - Handles automatic cleanup of old workflow data
 * Follows CODING_STANDARDS.md: Database is the Single Source of Truth
 */
class WorkflowCleanupService {
  constructor(workflowDatabaseService) {
    this.workflowDb = workflowDatabaseService;
    this.cleanupInterval = null;
    this.isRunning = false;
    
    // Default cleanup configuration (can be overridden by system config)
    this.config = {
      completedWorkflowsRetentionDays: 30,
      failedWorkflowsRetentionDays: 7,
      scheduledTasksRetentionDays: 1,
      executionLogRetentionDays: 14,
      cleanupIntervalMs: 24 * 60 * 60 * 1000, // 24 hours
      batchSize: 1000
    };
    
    console.log("🧹 Workflow Cleanup Service initialized");
  }

  /**
   * Start automatic cleanup
   * @param {Object} customConfig - Optional custom configuration
   */
  async start(customConfig = {}) {
    if (this.isRunning) {
      console.log("⚠️ Cleanup service already running");
      return;
    }

    // Update config with any custom values
    this.config = { ...this.config, ...customConfig };
    
    console.log("🚀 Starting workflow cleanup service...");
    console.log(`📊 Cleanup configuration:`, this.config);

    // Run initial cleanup
    await this.runCleanup();

    // Schedule recurring cleanup
    this.cleanupInterval = setInterval(async () => {
      try {
        await this.runCleanup();
      } catch (error) {
        console.error("❌ Error during scheduled cleanup:", error);
      }
    }, this.config.cleanupIntervalMs);

    this.isRunning = true;
    console.log("✅ Workflow cleanup service started");
  }

  /**
   * Stop automatic cleanup
   */
  stop() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    
    this.isRunning = false;
    console.log("🛑 Workflow cleanup service stopped");
  }

  /**
   * Run complete cleanup process
   * @returns {Promise<Object>} Cleanup results
   */
  async runCleanup() {
    console.log("🧹 Starting cleanup process...");
    const startTime = Date.now();
    
    const results = {
      completedWorkflows: 0,
      failedWorkflows: 0,
      scheduledTasks: 0,
      executionLogs: 0,
      errors: []
    };

    try {
      // Cleanup completed workflows
      results.completedWorkflows = await this.cleanupCompletedWorkflows();
      
      // Cleanup failed workflows
      results.failedWorkflows = await this.cleanupFailedWorkflows();
      
      // Cleanup old scheduled tasks
      results.scheduledTasks = await this.cleanupScheduledTasks();
      
      // Cleanup execution logs
      results.executionLogs = await this.cleanupExecutionLogs();
      
      const totalCleaned = results.completedWorkflows + results.failedWorkflows + 
                          results.scheduledTasks + results.executionLogs;
      
      const duration = Date.now() - startTime;
      console.log(`✅ Cleanup completed in ${duration}ms - Total records cleaned: ${totalCleaned}`);
      
      return results;
      
    } catch (error) {
      console.error("❌ Cleanup process failed:", error);
      results.errors.push(error.message);
      return results;
    }
  }

  /**
   * Cleanup old completed workflows
   * @returns {Promise<number>} Number of workflows cleaned
   */
  async cleanupCompletedWorkflows() {
    try {
      const query = `
        DELETE FROM workflow_instances 
        WHERE status = 'completed' 
        AND completed_at < CURRENT_TIMESTAMP - INTERVAL '${this.config.completedWorkflowsRetentionDays} days'
      `;
      
      const result = await this.workflowDb.db.query(query);
      const count = result.rowCount;
      
      if (count > 0) {
        console.log(`🧹 Cleaned up ${count} completed workflows older than ${this.config.completedWorkflowsRetentionDays} days`);
      }
      
      return count;
      
    } catch (error) {
      console.error("❌ Error cleaning up completed workflows:", error);
      throw error;
    }
  }

  /**
   * Cleanup old failed workflows
   * @returns {Promise<number>} Number of workflows cleaned
   */
  async cleanupFailedWorkflows() {
    try {
      const query = `
        DELETE FROM workflow_instances 
        WHERE status = 'failed' 
        AND failed_at < CURRENT_TIMESTAMP - INTERVAL '${this.config.failedWorkflowsRetentionDays} days'
      `;
      
      const result = await this.workflowDb.db.query(query);
      const count = result.rowCount;
      
      if (count > 0) {
        console.log(`🧹 Cleaned up ${count} failed workflows older than ${this.config.failedWorkflowsRetentionDays} days`);
      }
      
      return count;
      
    } catch (error) {
      console.error("❌ Error cleaning up failed workflows:", error);
      throw error;
    }
  }

  /**
   * Cleanup old scheduled tasks
   * @returns {Promise<number>} Number of tasks cleaned
   */
  async cleanupScheduledTasks() {
    try {
      return await this.workflowDb.cleanupOldTasks(this.config.scheduledTasksRetentionDays);
      
    } catch (error) {
      console.error("❌ Error cleaning up scheduled tasks:", error);
      throw error;
    }
  }

  /**
   * Cleanup old execution logs
   * @returns {Promise<number>} Number of logs cleaned
   */
  async cleanupExecutionLogs() {
    try {
      const query = `
        DELETE FROM workflow_execution_log 
        WHERE executed_at < CURRENT_TIMESTAMP - INTERVAL '${this.config.executionLogRetentionDays} days'
      `;
      
      const result = await this.workflowDb.db.query(query);
      const count = result.rowCount;
      
      if (count > 0) {
        console.log(`🧹 Cleaned up ${count} execution log entries older than ${this.config.executionLogRetentionDays} days`);
      }
      
      return count;
      
    } catch (error) {
      console.error("❌ Error cleaning up execution logs:", error);
      throw error;
    }
  }

  /**
   * Cleanup workflows stuck in active state
   * @param {number} maxHours - Maximum hours a workflow can be active
   * @returns {Promise<number>} Number of stuck workflows cleaned
   */
  async cleanupStuckWorkflows(maxHours = 24) {
    try {
      const query = `
        UPDATE workflow_instances 
        SET status = 'failed',
            failed_at = CURRENT_TIMESTAMP,
            final_error = 'Workflow stuck in active state for more than ${maxHours} hours'
        WHERE status = 'active' 
        AND last_activity_at < CURRENT_TIMESTAMP - INTERVAL '${maxHours} hours'
        RETURNING account_id
      `;
      
      const result = await this.workflowDb.db.query(query);
      const count = result.rowCount;
      
      if (count > 0) {
        console.log(`🧹 Marked ${count} stuck workflows as failed`);
        result.rows.forEach(row => {
          console.log(`  - Account: ${row.account_id}`);
        });
      }
      
      return count;
      
    } catch (error) {
      console.error("❌ Error cleaning up stuck workflows:", error);
      throw error;
    }
  }

  /**
   * Get cleanup statistics
   * @returns {Promise<Object>} Cleanup statistics
   */
  async getCleanupStats() {
    try {
      const query = `
        SELECT 
          COUNT(*) FILTER (WHERE status = 'completed') as completed_count,
          COUNT(*) FILTER (WHERE status = 'failed') as failed_count,
          COUNT(*) FILTER (WHERE status = 'active' AND last_activity_at < CURRENT_TIMESTAMP - INTERVAL '24 hours') as stuck_count,
          (SELECT COUNT(*) FROM scheduled_tasks WHERE status IN ('completed', 'failed', 'cancelled')) as old_tasks_count,
          (SELECT COUNT(*) FROM workflow_execution_log WHERE executed_at < CURRENT_TIMESTAMP - INTERVAL '${this.config.executionLogRetentionDays} days') as old_logs_count
        FROM workflow_instances
      `;
      
      const result = await this.workflowDb.db.query(query);
      const stats = result.rows[0];
      
      return {
        isRunning: this.isRunning,
        config: this.config,
        candidates: {
          completedWorkflows: parseInt(stats.completed_count) || 0,
          failedWorkflows: parseInt(stats.failed_count) || 0,
          stuckWorkflows: parseInt(stats.stuck_count) || 0,
          oldTasks: parseInt(stats.old_tasks_count) || 0,
          oldLogs: parseInt(stats.old_logs_count) || 0
        }
      };
      
    } catch (error) {
      console.error("❌ Error getting cleanup stats:", error);
      return { error: error.message };
    }
  }

  /**
   * Force immediate cleanup (for manual triggering)
   * @returns {Promise<Object>} Cleanup results
   */
  async forceCleanup() {
    console.log("🚨 Force cleanup triggered");
    const results = await this.runCleanup();
    
    // Also cleanup stuck workflows
    try {
      results.stuckWorkflows = await this.cleanupStuckWorkflows();
    } catch (error) {
      results.errors.push(`Stuck workflows cleanup failed: ${error.message}`);
    }
    
    return results;
  }
}

module.exports = WorkflowCleanupService;