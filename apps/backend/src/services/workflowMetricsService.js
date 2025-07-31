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
   * @param {string} executionId - Execution ID (account_id)
   * @param {Object} executionInfo - Execution information
   */
  async recordExecutionStart(executionId, executionInfo) {
    try {
      // Use workflow_instances table for execution tracking
      const result = await this.db.query(`
        UPDATE workflow_instances SET
          status = 'active',
          started_at = COALESCE(started_at, $1),
          last_activity_at = $1
        WHERE account_id = $2
        RETURNING id
      `, [
        new Date(),
        executionId
      ]);

      if (result.rows.length === 0) {
        console.log(`⚠️ No workflow instance found for account: ${executionId}`);
        return;
      }

      console.log(`📊 Recorded execution start: ${executionId} (stored in database)`);
    } catch (error) {
      console.error(`❌ Error recording execution start:`, error);
    }
  }

  /**
   * Update workflow execution progress in database
   * @param {string} executionId - Execution ID (account_id)
   * @param {Object} progressInfo - Progress information
   */
  async updateExecutionProgress(executionId, progressInfo) {
    try {
      // Map invalid statuses to valid ones
      let validStatus = progressInfo.status || 'active';
      if (['processing_step', 'running', 'started'].includes(validStatus)) {
        validStatus = 'active';
      }

      await this.db.query(`
        UPDATE workflow_instances SET
          current_step = $2,
          status = $3,
          progress_percentage = $4,
          last_activity_at = CURRENT_TIMESTAMP
        WHERE account_id = $1
      `, [
        executionId,
        progressInfo.currentStep || 0,
        validStatus,
        progressInfo.progress || 0
      ]);

      console.log(`📊 Updated execution progress: ${executionId} (stored in database)`);
    } catch (error) {
      console.error(`❌ Error updating execution progress:`, error);
    }
  }

  /**
   * Record workflow execution completion in database
   * @param {string} executionId - Execution ID (account_id)
   * @param {boolean} success - Whether execution succeeded
   * @param {string} error - Error message if failed
   * @param {number} duration - Execution duration in ms
   */
  async recordExecutionComplete(executionId, success, error = null, duration = null) {
    try {
      const status = success ? 'completed' : 'failed';
      const completedAt = new Date();

      await this.db.query(`
        UPDATE workflow_instances SET
          status = $2,
          completed_at = $3,
          last_error = $4,
          last_activity_at = CURRENT_TIMESTAMP,
          progress_percentage = $5
        WHERE account_id = $1
      `, [
        executionId,
        status,
        completedAt,
        error,
        success ? 100 : null
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
          COUNT(*) FILTER (WHERE status IN ('active', 'running', 'paused')) as active_executions,
          AVG(EXTRACT(EPOCH FROM (COALESCE(completed_at, NOW()) - started_at)) * 1000) as average_execution_time,
          MAX(EXTRACT(EPOCH FROM (COALESCE(completed_at, NOW()) - started_at)) * 1000) as longest_execution,
          MIN(EXTRACT(EPOCH FROM (completed_at - started_at)) * 1000) FILTER (WHERE completed_at IS NOT NULL) as shortest_execution
        FROM workflow_instances 
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
          wi.account_id,
          wd.type as workflow_type,
          wi.status,
          wi.current_step,
          wi.total_steps,
          wi.progress_percentage,
          wi.started_at,
          wi.last_activity_at,
          EXTRACT(EPOCH FROM (NOW() - wi.started_at)) * 1000 as duration_ms
        FROM workflow_instances wi
        JOIN workflow_definitions wd ON wi.workflow_id = wd.id
        WHERE wi.status IN ('active', 'running', 'paused')
        ORDER BY wi.started_at DESC
      `);

      return result.rows.map(row => ({
        executionId: row.account_id,
        accountId: row.account_id,
        workflowType: row.workflow_type,
        status: row.status,
        currentStep: row.current_step,
        totalSteps: row.total_steps,
        progress: row.progress_percentage,
        startTime: new Date(row.started_at).getTime(),
        lastActivity: new Date(row.last_activity_at).getTime(),
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

      // Check if workflow_stats table exists
      const tableExists = await this.db.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'workflow_stats'
        );
      `);

      if (!tableExists.rows[0].exists) {
        console.log(`📊 Skipping daily stats update - workflow_stats table doesn't exist`);
        return;
      }

      await this.db.query(`
        INSERT INTO workflow_stats (
          date, total_workflows, active_workflows, completed_workflows, 
          failed_workflows, stopped_workflows, avg_workflow_duration_hours
        )
        SELECT 
          $1::date,
          COUNT(*),
          COUNT(*) FILTER (WHERE status IN ('active', 'running')),
          COUNT(*) FILTER (WHERE status = 'completed'),
          COUNT(*) FILTER (WHERE status = 'failed'),
          COUNT(*) FILTER (WHERE status = 'stopped'),
          AVG(EXTRACT(EPOCH FROM (completed_at - started_at)) / 3600.0) FILTER (WHERE completed_at IS NOT NULL)
        FROM workflow_instances
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
          AVG(EXTRACT(EPOCH FROM (COALESCE(completed_at, NOW()) - started_at)) * 1000) as avg_duration,
          MAX(started_at) as last_workflow
        FROM workflow_instances
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
   * Clean old workflow instances (maintenance)
   * @param {number} daysToKeep - Days to keep in database
   */
  async cleanOldLogs(daysToKeep = 30) {
    try {
      const result = await this.db.query(`
        DELETE FROM workflow_instances 
        WHERE started_at < NOW() - INTERVAL '${daysToKeep} days'
        AND status IN ('completed', 'failed', 'stopped')
      `);

      console.log(`🧹 Cleaned ${result.rowCount} old workflow instances (older than ${daysToKeep} days)`);
      return result.rowCount;
    } catch (error) {
      console.error(`❌ Error cleaning old workflow instances:`, error);
      return 0;
    }
  }
}

module.exports = new WorkflowMetricsService();