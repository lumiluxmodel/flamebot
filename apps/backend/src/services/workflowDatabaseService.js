// src/services/workflowDatabaseService.js - Workflow Database Methods
const db = require("./databaseService");

/**
 * Workflow Database Service - Handles all workflow-related database operations
 * Extends the main database service with workflow-specific methods
 */
class WorkflowDatabaseService {
  constructor() {
    this.db = db;
  }

  // ========== WORKFLOW DEFINITIONS ==========

  /**
   * Get workflow definition by type
   * @param {string} workflowType - Workflow type
   * @returns {Promise<Object|null>} Workflow definition
   */
  async getWorkflowDefinition(workflowType) {
    const query = `
            SELECT id, name, type, description, steps, config, version
            FROM workflow_definitions 
            WHERE type = $1 AND is_active = true
        `;
    const result = await this.db.query(query, [workflowType]);
    return result.rows[0] || null;
  }

  /**
   * Get all workflow definitions
   * @returns {Promise<Array>} All workflow definitions
   */
  async getAllWorkflowDefinitions() {
    const query = `
            SELECT id, name, type, description, steps, config, version, created_at, updated_at
            FROM workflow_definitions 
            WHERE is_active = true
            ORDER BY name
        `;
    const result = await this.db.query(query);
    return result.rows;
  }

  /**
   * Create or update workflow definition
   * @param {Object} definition - Workflow definition
   * @returns {Promise<Object>} Created/updated definition
   */
  async upsertWorkflowDefinition(definition) {
    const query = `
            INSERT INTO workflow_definitions (name, type, description, steps, config)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (type) DO UPDATE SET
                name = EXCLUDED.name,
                description = EXCLUDED.description,
                steps = EXCLUDED.steps,
                config = EXCLUDED.config,
                version = workflow_definitions.version + 1,
                updated_at = CURRENT_TIMESTAMP
            RETURNING *
        `;
    const result = await this.db.query(query, [
      definition.name,
      definition.type,
      definition.description,
      JSON.stringify(definition.steps),
      JSON.stringify(definition.config || {}),
    ]);
    return result.rows[0];
  }

  // ========== WORKFLOW INSTANCES ==========

  /**
   * Create new workflow instance
   * @param {Object} workflowData - Workflow instance data
   * @returns {Promise<Object>} Created workflow instance
   */
  async createWorkflowInstance(workflowData) {
    const {
      workflowType,
      accountId,
      accountData,
      totalSteps,
      executionContext = {},
    } = workflowData;

    // Get workflow definition ID
    const workflowDef = await this.getWorkflowDefinition(workflowType);
    if (!workflowDef) {
      throw new Error(`Workflow definition not found: ${workflowType}`);
    }

    const query = `
            INSERT INTO workflow_instances (
                workflow_id, account_id, total_steps, account_data, execution_context
            ) VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `;

    const result = await this.db.query(query, [
      workflowDef.id,
      accountId,
      totalSteps,
      JSON.stringify(accountData),
      JSON.stringify(executionContext),
    ]);

    return result.rows[0];
  }

  /**
   * Get workflow instance by account ID
   * @param {string} accountId - Account ID
   * @returns {Promise<Object|null>} Workflow instance
   */
  async getWorkflowInstanceByAccountId(accountId) {
    const query = `
        SELECT 
            wi.*,
            wd.name as workflow_name,
            wd.type as workflow_type,
            wd.steps,
            wd.config as workflow_config,
            wd.description as workflow_description
        FROM workflow_instances wi
        JOIN workflow_definitions wd ON wi.workflow_id = wd.id
        WHERE wi.account_id = $1 AND wi.status IN ('active', 'paused')
        ORDER BY wi.created_at DESC
        LIMIT 1
    `;
    const result = await this.db.query(query, [accountId]);
    
    if (result.rows.length === 0) return null;
    
    // Parse JSON fields
    const row = result.rows[0];
    if (row.steps && typeof row.steps === 'string') {
        try {
            row.steps = JSON.parse(row.steps);
        } catch (e) {
            console.error('Error parsing steps JSON:', e);
        }
    }
    if (row.workflow_config && typeof row.workflow_config === 'string') {
        try {
            row.workflow_config = JSON.parse(row.workflow_config);
        } catch (e) {
            console.error('Error parsing workflow_config JSON:', e);
        }
    }
    if (row.account_data && typeof row.account_data === 'string') {
        try {
            row.account_data = JSON.parse(row.account_data);
        } catch (e) {
            console.error('Error parsing account_data JSON:', e);
        }
    }
    if (row.execution_context && typeof row.execution_context === 'string') {
        try {
            row.execution_context = JSON.parse(row.execution_context);
        } catch (e) {
            console.error('Error parsing execution_context JSON:', e);
        }
    }
    
    return row;
  }

  /**
   * Get workflow instance by ID
   * @param {number} instanceId - Instance ID
   * @returns {Promise<Object|null>} Workflow instance
   */
  async getWorkflowInstanceById(instanceId) {
    const query = `
        SELECT wi.*, wd.name as workflow_name, wd.type as workflow_type, wd.steps
        FROM workflow_instances wi
        JOIN workflow_definitions wd ON wi.workflow_id = wd.id
        WHERE wi.id = $1
    `;
    const result = await this.db.query(query, [instanceId]);
    return result.rows[0] || null;
  }

  /**
   * Get all active workflow instances
   * @returns {Promise<Array>} Active workflow instances
   */
  async getActiveWorkflowInstances() {
    const query = `
        SELECT wi.*, wd.name as workflow_name, wd.type as workflow_type, wd.steps
        FROM workflow_instances wi
        JOIN workflow_definitions wd ON wi.workflow_id = wd.id
        WHERE wi.status = 'active'
        ORDER BY wi.started_at DESC
    `;
    const result = await this.db.query(query);
    return result.rows;
  }

  /**
   * Update workflow instance
   * @param {string} accountId - Account ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated workflow instance
   */
  async updateWorkflowInstance(accountId, updates) {
    const setClause = [];
    const values = [];
    let paramIndex = 1;

    // Build dynamic SET clause
    Object.entries(updates).forEach(([key, value]) => {
      if (key === "execution_context" || key === "account_data") {
        setClause.push(`${key} = $${paramIndex}::jsonb`);
        values.push(JSON.stringify(value));
      } else {
        setClause.push(`${key} = $${paramIndex}`);
        values.push(value);
      }
      paramIndex++;
    });

    // Always update last_activity_at and updated_at
    setClause.push(`last_activity_at = CURRENT_TIMESTAMP`);
    setClause.push(`updated_at = CURRENT_TIMESTAMP`);

    const query = `
            UPDATE workflow_instances 
            SET ${setClause.join(", ")}
            WHERE account_id = $${paramIndex}
            RETURNING *
        `;
    values.push(accountId);

    const result = await this.db.query(query, values);
    return result.rows[0];
  }

  /**
   * Complete workflow instance
   * @param {string} accountId - Account ID
   * @returns {Promise<Object>} Updated workflow instance
   */
  async completeWorkflowInstance(accountId) {
    const query = `
            UPDATE workflow_instances 
            SET status = 'completed',
                completed_at = CURRENT_TIMESTAMP,
                next_action_at = NULL,
                next_task_id = NULL,
                progress_percentage = 100,
                updated_at = CURRENT_TIMESTAMP
            WHERE account_id = $1
            RETURNING *
        `;
    const result = await this.db.query(query, [accountId]);
    return result.rows[0];
  }

  /**
   * Fail workflow instance
   * @param {string} accountId - Account ID
   * @param {string} error - Error message
   * @returns {Promise<Object>} Updated workflow instance
   */
  async failWorkflowInstance(accountId, error) {
    const query = `
            UPDATE workflow_instances 
            SET status = 'failed',
                failed_at = CURRENT_TIMESTAMP,
                final_error = $2,
                next_action_at = NULL,
                next_task_id = NULL,
                updated_at = CURRENT_TIMESTAMP
            WHERE account_id = $1
            RETURNING *
        `;
    const result = await this.db.query(query, [accountId, error]);
    return result.rows[0];
  }

  /**
   * Stop workflow instance
   * @param {string} accountId - Account ID
   * @returns {Promise<Object>} Updated workflow instance
   */
  async stopWorkflowInstance(accountId) {
    const query = `
            UPDATE workflow_instances 
            SET status = 'stopped',
                stopped_at = CURRENT_TIMESTAMP,
                next_action_at = NULL,
                next_task_id = NULL,
                updated_at = CURRENT_TIMESTAMP
            WHERE account_id = $1
            RETURNING *
        `;
    const result = await this.db.query(query, [accountId]);
    return result.rows[0];
  }

  /**
   * Pause workflow instance
   * @param {string} accountId - Account ID
   * @returns {Promise<Object>} Updated workflow instance
   */
  async pauseWorkflowInstance(accountId) {
    const query = `
            UPDATE workflow_instances 
            SET status = 'paused',
                paused_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE account_id = $1 AND status = 'active'
            RETURNING *
        `;
    const result = await this.db.query(query, [accountId]);
    return result.rows[0];
  }

  /**
   * Resume workflow instance
   * @param {string} accountId - Account ID
   * @returns {Promise<Object>} Updated workflow instance
   */
  async resumeWorkflowInstance(accountId) {
    const query = `
            UPDATE workflow_instances 
            SET status = 'active',
                resumed_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE account_id = $1 AND status = 'paused'
            RETURNING *
        `;
    const result = await this.db.query(query, [accountId]);
    return result.rows[0];
  }

  /**
   * Pause all active workflows
   * @returns {Promise<number>} Number of workflows paused
   */
  async pauseAllWorkflows() {
    const query = `
            UPDATE workflow_instances 
            SET status = 'paused',
                paused_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE status = 'active'
        `;
    const result = await this.db.query(query);
    return result.rowCount;
  }

  /**
   * Resume all paused workflows
   * @returns {Promise<number>} Number of workflows resumed
   */
  async resumeAllWorkflows() {
    const query = `
            UPDATE workflow_instances 
            SET status = 'active',
                resumed_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE status = 'paused'
        `;
    const result = await this.db.query(query);
    return result.rowCount;
  }

  // ========== WORKFLOW EXECUTION LOG ==========

  /**
   * Add execution log entry
   * @param {Object} logData - Log entry data
   * @returns {Promise<Object>} Created log entry
   */
  async addExecutionLog(logData) {
    const {
      workflowInstanceId,
      stepId,
      stepIndex,
      action,
      description,
      success,
      result,
      errorMessage,
      durationMs,
    } = logData;

    const query = `
            INSERT INTO workflow_execution_log (
                workflow_instance_id, step_id, step_index, action, description,
                success, result, error_message, duration_ms
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *
        `;

    const dbResult = await this.db.query(query, [
      workflowInstanceId,
      stepId,
      stepIndex,
      action,
      description,
      success,
      result ? JSON.stringify(result) : null,
      errorMessage,
      durationMs,
    ]);

    return dbResult.rows[0];
  }

  /**
   * Get execution log for workflow instance
   * @param {number} workflowInstanceId - Workflow instance ID
   * @param {number} limit - Limit results
   * @returns {Promise<Array>} Execution log entries
   */
  async getExecutionLog(workflowInstanceId, limit = 50) {
    const query = `
            SELECT * FROM workflow_execution_log
            WHERE workflow_instance_id = $1
            ORDER BY executed_at DESC
            LIMIT $2
        `;
    const result = await this.db.query(query, [workflowInstanceId, limit]);
    return result.rows;
  }

  // ========== SCHEDULED TASKS ==========

  /**
   * Create scheduled task
   * @param {Object} taskData - Task data
   * @returns {Promise<Object>} Created task
   */
  async createScheduledTask(taskData) {
    const {
      taskId,
      workflowInstanceId,
      stepId,
      action,
      scheduledFor,
      payload = {},
    } = taskData;

    const query = `
            INSERT INTO scheduled_tasks (
                task_id, workflow_instance_id, step_id, action, scheduled_for, payload
            ) VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `;

    const result = await this.db.query(query, [
      taskId,
      workflowInstanceId,
      stepId,
      action,
      scheduledFor,
      JSON.stringify(payload),
    ]);

    return result.rows[0];
  }

  /**
   * Get scheduled task by task ID
   * @param {string} taskId - Task ID
   * @returns {Promise<Object|null>} Scheduled task
   */
  async getScheduledTask(taskId) {
    const query = `
            SELECT * FROM scheduled_tasks WHERE task_id = $1
        `;
    const result = await this.db.query(query, [taskId]);
    return result.rows[0] || null;
  }

  /**
   * Get due scheduled tasks
   * @param {Date} beforeTime - Get tasks scheduled before this time
   * @returns {Promise<Array>} Due tasks
   */
  async getDueScheduledTasks(beforeTime = new Date()) {
    const query = `
            SELECT st.*, wi.account_id
            FROM scheduled_tasks st
            JOIN workflow_instances wi ON st.workflow_instance_id = wi.id
            WHERE st.status = 'scheduled' 
            AND st.scheduled_for <= $1
            ORDER BY st.scheduled_for ASC
        `;
    const result = await this.db.query(query, [beforeTime]);
    return result.rows;
  }

  /**
   * Update scheduled task status
   * @param {string} taskId - Task ID
   * @param {string} status - New status
   * @param {Object} updates - Additional updates
   * @returns {Promise<Object>} Updated task
   */
  async updateScheduledTask(taskId, status, updates = {}) {
    const setClause = ["status = $2", "updated_at = CURRENT_TIMESTAMP"];
    const values = [taskId, status];
    let paramIndex = 3;

    // Add additional updates
    Object.entries(updates).forEach(([key, value]) => {
      if (key === "payload") {
        setClause.push(`${key} = $${paramIndex}::jsonb`);
        values.push(JSON.stringify(value));
      } else {
        setClause.push(`${key} = $${paramIndex}`);
        values.push(value);
      }
      paramIndex++;
    });

    const query = `
            UPDATE scheduled_tasks 
            SET ${setClause.join(", ")}
            WHERE task_id = $1
            RETURNING *
        `;

    const result = await this.db.query(query, values);
    return result.rows[0];
  }

  /**
   * Cancel scheduled task
   * @param {string} taskId - Task ID
   * @returns {Promise<Object>} Updated task
   */
  async cancelScheduledTask(taskId) {
    return this.updateScheduledTask(taskId, "cancelled", {
      cancelled_at: new Date(),
    });
  }

  /**
   * Complete scheduled task
   * @param {string} taskId - Task ID
   * @param {Object} result - Task result
   * @returns {Promise<Object>} Updated task
   */
  async completeScheduledTask(taskId, result = {}) {
    return this.updateScheduledTask(taskId, "completed", {
      completed_at: new Date(),
      payload: result,
    });
  }

  /**
   * Fail scheduled task
   * @param {string} taskId - Task ID
   * @param {string} error - Error message
   * @returns {Promise<Object>} Updated task
   */
  async failScheduledTask(taskId, error) {
    const query = `
      UPDATE scheduled_tasks 
      SET status = 'failed',
          last_error = $2,
          last_attempt_at = CURRENT_TIMESTAMP,
          attempts = attempts + 1,
          updated_at = CURRENT_TIMESTAMP
      WHERE task_id = $1
      RETURNING *
    `;
    
    const result = await this.db.query(query, [taskId, error]);
    return result.rows[0];
  }

  /**
   * Clean up old completed/failed tasks
   * @param {number} olderThanDays - Remove tasks older than X days
   * @returns {Promise<number>} Number of tasks removed
   */
  async cleanupOldTasks(olderThanDays = 7) {
    const query = `
            DELETE FROM scheduled_tasks 
            WHERE status IN ('completed', 'failed', 'cancelled')
            AND created_at < CURRENT_TIMESTAMP - INTERVAL '${olderThanDays} days'
        `;
    const result = await this.db.query(query);
    return result.rowCount;
  }

  // ========== WORKFLOW STATISTICS ==========

  /**
   * Get workflow statistics
   * @returns {Promise<Object>} Workflow statistics
   */
  async getWorkflowStatistics() {
    const query = `
            SELECT 
                COUNT(*) FILTER (WHERE status = 'active') as active_workflows,
                COUNT(*) FILTER (WHERE status = 'completed') as completed_workflows,
                COUNT(*) FILTER (WHERE status = 'failed') as failed_workflows,
                COUNT(*) FILTER (WHERE status = 'stopped') as stopped_workflows,
                COUNT(*) FILTER (WHERE status = 'paused') as paused_workflows,
                COUNT(*) as total_workflows,
                AVG(EXTRACT(EPOCH FROM (completed_at - started_at))/3600) 
                    FILTER (WHERE status = 'completed') as avg_completion_hours,
                COUNT(DISTINCT account_id) as total_accounts_automated
            FROM workflow_instances
        `;
    const result = await this.db.query(query);
    return result.rows[0];
  }

  /**
   * Get execution statistics
   * @returns {Promise<Object>} Execution statistics
   */
  async getExecutionStatistics() {
    const query = `
            SELECT 
                COUNT(*) as total_executions,
                COUNT(*) FILTER (WHERE success = true) as successful_executions,
                COUNT(*) FILTER (WHERE success = false) as failed_executions,
                AVG(duration_ms) as avg_duration_ms,
                COUNT(DISTINCT action) as unique_actions
            FROM workflow_execution_log
        `;
    const result = await this.db.query(query);
    return result.rows[0];
  }

  /**
   * Update daily workflow stats
   * @param {Date} date - Date to update stats for
   * @returns {Promise<Object>} Updated stats
   */
  async updateDailyWorkflowStats(date = new Date()) {
    const dateStr = date.toISOString().split("T")[0];

    const query = `
        INSERT INTO workflow_stats (
            date, total_workflows, active_workflows, completed_workflows,
            failed_workflows, stopped_workflows, total_steps_executed,
            successful_steps, failed_steps, avg_workflow_duration_hours,
            total_accounts_automated
        )
        SELECT 
            $1::date,
            COUNT(DISTINCT wi.id),
            COUNT(DISTINCT wi.id) FILTER (WHERE wi.status = 'active'),
            COUNT(DISTINCT wi.id) FILTER (WHERE wi.status = 'completed'),
            COUNT(DISTINCT wi.id) FILTER (WHERE wi.status = 'failed'),
            COUNT(DISTINCT wi.id) FILTER (WHERE wi.status = 'stopped'),
            (SELECT COUNT(*) FROM workflow_execution_log WHERE executed_at::date = $1::date),
            (SELECT COUNT(*) FROM workflow_execution_log WHERE executed_at::date = $1::date AND success = true),
            (SELECT COUNT(*) FROM workflow_execution_log WHERE executed_at::date = $1::date AND success = false),
            AVG(EXTRACT(EPOCH FROM (wi.completed_at - wi.started_at))/3600) 
                FILTER (WHERE wi.status = 'completed'),
            COUNT(DISTINCT wi.account_id)
        FROM workflow_instances wi
        WHERE wi.created_at::date <= $1::date
        ON CONFLICT (date) DO UPDATE SET
            total_workflows = EXCLUDED.total_workflows,
            active_workflows = EXCLUDED.active_workflows,
            completed_workflows = EXCLUDED.completed_workflows,
            failed_workflows = EXCLUDED.failed_workflows,
            stopped_workflows = EXCLUDED.stopped_workflows,
            total_steps_executed = EXCLUDED.total_steps_executed,
            successful_steps = EXCLUDED.successful_steps,
            failed_steps = EXCLUDED.failed_steps,
            avg_workflow_duration_hours = EXCLUDED.avg_workflow_duration_hours,
            total_accounts_automated = EXCLUDED.total_accounts_automated,
            updated_at = CURRENT_TIMESTAMP
    `;

    const result = await this.db.query(query, [dateStr]);
    return { success: true, date: dateStr };
}
  // ========== RECOVERY OPERATIONS ==========

  /**
   * Load workflows that need recovery (active workflows from previous session)
   * @returns {Promise<Array>} Workflows needing recovery
   */
  async getWorkflowsForRecovery() {
    const query = `
        SELECT wi.*, wd.steps, wd.type as workflow_type
        FROM workflow_instances wi
        JOIN workflow_definitions wd ON wi.workflow_id = wd.id
        WHERE wi.status = 'active'
        AND wi.next_action_at IS NOT NULL
        ORDER BY wi.next_action_at ASC
    `;
    const result = await this.db.query(query);
    return result.rows;
  }

  /**
   * Mark workflow instances as recovered
   * @param {Array} accountIds - Account IDs to mark as recovered
   * @returns {Promise<number>} Number of workflows updated
   */
  async markWorkflowsAsRecovered(accountIds) {
    const query = `
            UPDATE workflow_instances 
            SET execution_context = jsonb_set(
                COALESCE(execution_context, '{}'),
                '{recovered}',
                'true'
            ),
            updated_at = CURRENT_TIMESTAMP
            WHERE account_id = ANY($1)
        `;
    const result = await this.db.query(query, [accountIds]);
    return result.rowCount;
  }
}

// Export singleton instance
module.exports = new WorkflowDatabaseService();
