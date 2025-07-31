// src/services/workflowMetricsService.js - Database-first Workflow Metrics Service

const databaseService = require('./databaseService');

/**
 * WorkflowMetricsService - Database-first metrics storage (follows CODING_STANDARDS.md)
 * REPLACES: In-memory metrics in WorkflowMonitoringService
 * GOLDEN RULE: Database is the Single Source of Truth
 */
class WorkflowMetricsService {
  constructor() {
    this.db = databaseService;
  }

  /**
   * Record workflow execution start in database
   * @param {string} executionId - Execution ID
   * @param {Object} executionInfo - Execution information
   */
  async recordExecutionStart(executionId, executionInfo) {
    try {
      await this.db.query(`
        INSERT INTO workflow_execution_log (
          execution_id, account_id, workflow_type, status, 
          started_at, current_step, total_steps, metadata
        ) VALUES ($1, $2, $3, 'started', $4, 0, $5, $6)
        ON CONFLICT (execution_id) DO UPDATE SET
          status = 'started',
          started_at = $4,
          updated_at = CURRENT_TIMESTAMP
      `, [
        executionId,
        executionInfo.accountId,
        executionInfo.workflowType,
        new Date(),
        executionInfo.totalSteps,
        JSON.stringify({
          startTime: Date.now()
        })
      ]);

      console.log(`📊 Recorded execution start: ${executionId}`);
    } catch (error) {
      console.error(`❌ Error recording execution start:`, error);
    }
  }

  /**
   * Update workflow execution progress in database
   * @param {string} executionId - Execution ID
   * @param {Object} progressInfo - Progress information
   */
  async updateExecutionProgress(executionId, progressInfo) {
    try {
      await this.db.query(`
        UPDATE workflow_execution_log SET
          current_step = $2,
          status = $3,
          progress_percentage = $4,
          updated_at = CURRENT_TIMESTAMP
        WHERE execution_id = $1
      `, [
        executionId,
        progressInfo.currentStep,
        progressInfo.status || 'running',
        progressInfo.progress || 0
      ]);

      console.log(`📊 Updated execution progress: ${executionId} (${progressInfo.currentStep}/${progressInfo.totalSteps})`);
    } catch (error) {
      console.error(`❌ Error updating execution progress:`, error);
    }
  }

  /**
   * Record workflow execution completion in database
   * @param {string} executionId - Execution ID
   * @param {boolean} success - Whether execution succeeded
   * @param {string} error - Error message if failed
   * @param {number} duration - Execution duration in ms
   */
  async recordExecutionComplete(executionId, success, error = null, duration = null) {
    try {
      const status = success ? 'completed' : 'failed';
      const completedAt = new Date();

      await this.db.query(`
        UPDATE workflow_execution_log SET
          status = $2,
          completed_at = $3,
          error_message = $4,
          duration_ms = $5,
          updated_at = CURRENT_TIMESTAMP
        WHERE execution_id = $1
      `, [
        executionId,
        status,
        completedAt,
        error,
        duration
      ]);

      // Update daily workflow stats
      await this.updateDailyStats();

      console.log(`📊 Recorded execution completion: ${executionId} (${status})`);
    } catch (error) {
      console.error(`❌ Error recording execution completion:`, error);
    }
  }

  /**
   * Get execution metrics from database (replaces in-memory metrics)
   * @param {string} timeframe - Timeframe ('1h', '24h', '7d', '30d')
   * @returns {Promise<Object>} Execution metrics
   */
  async getExecutionMetrics(timeframe = '24h') {
    try {
      const timeframeMap = {
        '1h': 'NOW() - INTERVAL \'1 hour\'',
        '24h': 'NOW() - INTERVAL \'24 hours\'',
        '7d': 'NOW() - INTERVAL \'7 days\'',
        '30d': 'NOW() - INTERVAL \'30 days\''
      };

      const timeCondition = timeframeMap[timeframe] || timeframeMap['24h'];

      const result = await this.db.query(`
        SELECT 
          COUNT(*) as total_executions,
          COUNT(*) FILTER (WHERE status = 'completed') as successful_executions,
          COUNT(*) FILTER (WHERE status = 'failed') as failed_executions,
          COUNT(*) FILTER (WHERE status IN ('started', 'running')) as active_executions,
          AVG(duration_ms) FILTER (WHERE duration_ms IS NOT NULL) as average_execution_time,
          MAX(duration_ms) as longest_execution,
          MIN(duration_ms) FILTER (WHERE duration_ms > 0) as shortest_execution
        FROM workflow_execution_log 
        WHERE started_at >= ${timeCondition}
      `);

      const metrics = result.rows[0];
      
      return {
        totalExecutions: parseInt(metrics.total_executions) || 0,
        successfulExecutions: parseInt(metrics.successful_executions) || 0,
        failedExecutions: parseInt(metrics.failed_executions) || 0,
        activeExecutions: parseInt(metrics.active_executions) || 0,
        averageExecutionTime: parseFloat(metrics.average_execution_time) || 0,
        longestExecution: parseFloat(metrics.longest_execution) || 0,
        shortestExecution: parseFloat(metrics.shortest_execution) || Infinity,
        successRate: parseInt(metrics.total_executions) > 0 
          ? (parseInt(metrics.successful_executions) / parseInt(metrics.total_executions)) * 100
          : 0,
        timeframe
      };

    } catch (error) {
      console.error(`❌ Error getting execution metrics:`, error);
      return {
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        activeExecutions: 0,
        averageExecutionTime: 0,
        longestExecution: 0,
        shortestExecution: Infinity,
        successRate: 0,
        timeframe
      };
    }
  }

  /**
   * Get active executions from database (replaces in-memory Map)
   * @returns {Promise<Array>} Active executions
   */
  async getActiveExecutions() {
    try {
      const result = await this.db.query(`
        SELECT 
          execution_id,
          account_id,
          workflow_type,
          status,
          current_step,
          total_steps,
          progress_percentage,
          started_at,
          updated_at,
          EXTRACT(EPOCH FROM (NOW() - started_at)) * 1000 as duration_ms
        FROM workflow_execution_log 
        WHERE status IN ('started', 'running', 'active')
        ORDER BY started_at DESC
      `);

      return result.rows.map(row => ({
        executionId: row.execution_id,
        accountId: row.account_id,
        workflowType: row.workflow_type,
        status: row.status,
        currentStep: row.current_step,
        totalSteps: row.total_steps,
        progress: row.progress_percentage,
        startTime: new Date(row.started_at).getTime(),
        lastActivity: new Date(row.updated_at).getTime(),
        duration: parseFloat(row.duration_ms) || 0
      }));

    } catch (error) {
      console.error(`❌ Error getting active executions:`, error);
      return [];
    }
  }

  /**
   * Update daily workflow statistics
   */
  async updateDailyStats() {
    try {
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

      await this.db.query(`
        INSERT INTO workflow_stats (
          date, total_workflows, active_workflows, completed_workflows, 
          failed_workflows, stopped_workflows, avg_workflow_duration_hours
        )
        SELECT 
          $1::date,
          COUNT(*),
          COUNT(*) FILTER (WHERE status IN ('started', 'running')),
          COUNT(*) FILTER (WHERE status = 'completed'),
          COUNT(*) FILTER (WHERE status = 'failed'),
          COUNT(*) FILTER (WHERE status = 'stopped'),
          AVG(duration_ms) FILTER (WHERE duration_ms IS NOT NULL) / 3600000.0
        FROM workflow_execution_log
        WHERE DATE(started_at) = $1::date
        ON CONFLICT (date) DO UPDATE SET
          total_workflows = EXCLUDED.total_workflows,
          active_workflows = EXCLUDED.active_workflows,
          completed_workflows = EXCLUDED.completed_workflows,
          failed_workflows = EXCLUDED.failed_workflows,
          stopped_workflows = EXCLUDED.stopped_workflows,
          avg_workflow_duration_hours = EXCLUDED.avg_workflow_duration_hours,
          updated_at = CURRENT_TIMESTAMP
      `, [today]);

      console.log(`📊 Updated daily stats for ${today}`);
    } catch (error) {
      console.error(`❌ Error updating daily stats:`, error);
    }
  }

  /**
   * Get workflow performance by account
   * @param {string} accountId - Account ID (optional)
   * @returns {Promise<Array>} Performance data
   */
  async getAccountPerformance(accountId = null) {
    try {
      let query = `
        SELECT 
          account_id,
          COUNT(*) as total_workflows,
          COUNT(*) FILTER (WHERE status = 'completed') as completed,
          COUNT(*) FILTER (WHERE status = 'failed') as failed,
          AVG(duration_ms) FILTER (WHERE duration_ms IS NOT NULL) as avg_duration,
          MAX(started_at) as last_workflow
        FROM workflow_execution_log
      `;

      const params = [];
      if (accountId) {
        query += ' WHERE account_id = $1';
        params.push(accountId);
      }

      query += ' GROUP BY account_id ORDER BY last_workflow DESC';

      const result = await this.db.query(query, params);

      return result.rows.map(row => ({
        accountId: row.account_id,
        totalWorkflows: parseInt(row.total_workflows),
        completedWorkflows: parseInt(row.completed),
        failedWorkflows: parseInt(row.failed),
        successRate: row.total_workflows > 0 ? (row.completed / row.total_workflows * 100).toFixed(2) : 0,
        avgDuration: parseFloat(row.avg_duration) || 0,
        lastWorkflow: row.last_workflow
      }));

    } catch (error) {
      console.error(`❌ Error getting account performance:`, error);
      return [];
    }
  }

  /**
   * Clean old execution logs (maintenance)
   * @param {number} daysToKeep - Days to keep in database
   */
  async cleanOldLogs(daysToKeep = 30) {
    try {
      const result = await this.db.query(`
        DELETE FROM workflow_execution_log 
        WHERE started_at < NOW() - INTERVAL '${daysToKeep} days'
        AND status IN ('completed', 'failed', 'stopped')
      `);

      console.log(`🧹 Cleaned ${result.rowCount} old execution logs (older than ${daysToKeep} days)`);
      return result.rowCount;
    } catch (error) {
      console.error(`❌ Error cleaning old logs:`, error);
      return 0;
    }
  }
}

module.exports = new WorkflowMetricsService();