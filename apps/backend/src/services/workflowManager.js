// src/services/workflowManager.js - Updated to use Database-First Architecture
const workflowExecutor = require("./workflowExecutorV2");
const cronManager = require("./cronManager");
const cronMonitor = require("./cronMonitor");
const taskScheduler = require("./taskScheduler");
const workflowDb = require("./workflowDatabaseService");
const accountDatabaseService = require("./accountDatabaseService");

/**
 * Workflow Manager - Provides a clean API interface to the modern workflow system
 * Now uses WorkflowExecutor with Cron-based scheduling
 */
class WorkflowManager {
  constructor() {
    this.executor = workflowExecutor;
    this.cronManager = cronManager;
    this.monitor = cronMonitor;
    this.taskScheduler = taskScheduler;
    this.isInitialized = false;
  }

  /**
   * Initialize the workflow manager with all subsystems
   */
  async initialize() {
    if (this.isInitialized) {
      console.log("⚠️ Workflow Manager already initialized");
      return { success: true };
    }

    try {
      console.log("🚀 Initializing Workflow Manager with Cron System...");

      // Initialize workflow executor
      await this.executor.initialize();

      // Setup event listeners after executor is initialized
      this.setupEventListeners();

      // Start cron manager
      await this.cronManager.start();

      // Start cron monitoring
      await this.monitor.start();

      this.isInitialized = true;
      console.log("✅ Workflow Manager initialized successfully");

      return { success: true };
    } catch (error) {
      console.error("❌ Failed to initialize Workflow Manager:", error);
      throw error;
    }
  }

  /**
   * Shutdown the workflow manager gracefully
   */
  async shutdown() {
    if (!this.isInitialized) return;

    try {
      console.log("🛑 Shutting down Workflow Manager...");

      // Stop cron monitoring first
      await this.monitor.stop();

      // Stop cron manager
      await this.cronManager.stop();

      // Note: WorkflowExecutor doesn't have a shutdown method,
      // but we can clear active executions if needed

      this.isInitialized = false;
      console.log("✅ Workflow Manager shut down successfully");
    } catch (error) {
      console.error("❌ Error during shutdown:", error);
      throw error;
    }
  }

  /**
   * Start automation workflow for a newly imported account (DATABASE-FIRST)
   * Follows CODING_STANDARDS.md: Database is the Single Source of Truth
   *
   * @param {string} accountId - Flamebot account ID (from import response)
   * @param {string} workflowType - Workflow type ('default', 'aggressive', or 'test')
   * @returns {Promise<Object>} Start result
   */
  async startAccountAutomation(
    accountId,
    workflowType = "default"
  ) {
    if (!this.isInitialized) {
      throw new Error("Workflow Manager not initialized");
    }

    try {
      console.log(`\n🎯 Starting automation for account: ${accountId}`);
      console.log(`   Workflow: ${workflowType}`);

      // 🚀 DATABASE-FIRST: Load account data from database
      console.log(`💾 Loading account data from database...`);
      const accountData = await accountDatabaseService.loadAccountData(accountId);
      
      if (!accountData) {
        throw new Error(`Account not found in database: ${accountId}`);
      }

      console.log(`   Model: ${accountData.model}`);
      console.log(`   Channel: ${accountData.channel}`);
      console.log(`   Status: ${accountData.status}`);

      // Validate account data from database
      if (!accountData.model) {
        throw new Error("Account model not found in database");
      }

      // Start workflow execution using the new executor
      const result = await this.executor.startExecution(
        accountId,
        accountData,
        workflowType
      );

      if (result.success) {
        console.log(`✅ Automation started for account: ${accountId}`);
        return {
          success: true,
          accountId,
          workflowType,
          executionId: result.executionId,
          totalSteps: result.totalSteps,
          estimatedDuration: result.estimatedDuration,
          message: "Account automation started successfully",
        };
      } else {
        return {
          success: false,
          error: result.error || "Failed to start workflow",
        };
      }
    } catch (error) {
      console.error(`❌ Failed to start automation for ${accountId}:`, error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Detener permanentemente workflow de una cuenta
   * @param {string} accountId - Account ID
   * @param {boolean} deleteData - Si eliminar completamente o solo archivar
   * @returns {Promise<Object>} Stop result
   */
  async stopAccountAutomation(accountId, deleteData = false) {
    try {
      console.log(`🛑 Permanently stopping workflow for account: ${accountId}`);
      const result = await this.executor.stopExecution(accountId, !deleteData);

      if (result.success) {
        console.log(
          `✅ Workflow permanently stopped for account: ${accountId}`
        );
      }

      return result;
    } catch (error) {
      console.error(`❌ Failed to stop automation for ${accountId}:`, error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get workflow status for an account
   * @param {string} accountId - Account ID
   * @returns {Object|null} Workflow status
   */
  getAccountWorkflowStatus(accountId) {
    const executionStatus = this.executor.getExecutionStatus(accountId);
    if (!executionStatus) return null;

    return {
      accountId: executionStatus.accountId,
      executionId: executionStatus.executionId,
      status: executionStatus.status,
      workflowType: executionStatus.workflowType,
      currentStep: executionStatus.currentStep,
      totalSteps: executionStatus.totalSteps,
      progress: executionStatus.progress,
      startedAt: executionStatus.startedAt,
      lastActivity: executionStatus.lastActivity,
      retryCount: executionStatus.retryCount,
      maxRetries: executionStatus.maxRetries,
      lastError: executionStatus.lastError,
      nextStep: executionStatus.nextStep,
      continuousSwipeActive: executionStatus.continuousSwipeActive,
      executionLog: executionStatus.executionLog,
    };
  }

  /**
   * Get all active workflows (for UI display)
   * @returns {Array} Active workflows
   */
  getAllActiveWorkflows() {
    const executions = this.executor.getAllActiveExecutions();

    return executions.map((execution) => ({
      accountId: execution.accountId,
      executionId: execution.executionId,
      workflowType: execution.workflowType,
      status: execution.status,
      progress: execution.progress,
      startedAt: execution.startedAt,
      lastActivity: execution.lastActivity,
      currentStep: execution.currentStep || 0,
      totalSteps: execution.totalSteps || 0,
    }));
  }

  /**
   * Get workflow statistics with cron monitoring data
   * @returns {Object} Enhanced workflow stats
   */
  getWorkflowStats() {
    const executorStats = this.executor.getStatistics();
    const cronStats = this.cronManager.getStatus();
    const monitoringData = this.monitor.getDashboardData();

    return {
      // Executor stats
      totalExecutions: executorStats.totalExecutions,
      successfulExecutions: executorStats.successfulExecutions,
      failedExecutions: executorStats.failedExecutions,
      activeExecutions: executorStats.activeExecutions,
      averageExecutionTime: executorStats.averageExecutionTime,

      // Cron system stats
      cronSystem: {
        isRunning: cronStats.isRunning,
        totalCronJobs: cronStats.totalCronJobs,
        scheduledTasks: cronStats.totalScheduledTasks,
        executedTasks: cronStats.stats.executedTasks,
        failedTasks: cronStats.stats.failedTasks,
      },

      // Task scheduler stats
      taskScheduler: this.taskScheduler.getStatus(),

      // Monitoring data
      monitoring: monitoringData,

      // Combined health status
      overallHealth: monitoringData.overview.systemHealth,
      successRate:
        executorStats.totalExecutions > 0
          ? (executorStats.successfulExecutions /
              executorStats.totalExecutions) *
            100
          : 0,

      lastUpdate: new Date(),
    };
  }

  /**
   * Get cron monitoring status
   * @returns {Object} Monitoring status
   */
  getMonitoringStatus() {
    return this.monitor.getStatus();
  }

  /**
   * Get cron monitoring dashboard data
   * @returns {Object} Dashboard data
   */
  getMonitoringDashboard() {
    return this.monitor.getDashboardData();
  }

  /**
   * Get alerts from cron monitor
   * @param {boolean} unacknowledgedOnly - Get only unacknowledged alerts
   * @param {string} severity - Filter by severity
   * @returns {Array} Alerts
   */
  getAlerts(unacknowledgedOnly = false, severity = null) {
    if (unacknowledgedOnly) {
      return this.monitor.getUnacknowledgedAlerts(severity);
    } else {
      return this.monitor.getAllAlerts();
    }
  }

  /**
   * Acknowledge an alert
   * @param {string} alertId - Alert ID
   * @returns {boolean} Success status
   */
  acknowledgeAlert(alertId) {
    return this.monitor.acknowledgeAlert(alertId);
  }

  /**
   * Update alert thresholds
   * @param {Object} thresholds - New threshold values
   * @returns {Object} Updated thresholds
   */
  updateAlertThresholds(thresholds) {
    this.monitor.updateAlertThresholds(thresholds);
    return this.monitor.alertThresholds;
  }

  /**
   * Get cron job information
   * @param {string} cronId - Cron job ID (optional)
   * @returns {Object|Array} Cron job(s) information
   */
  getCronJobInfo(cronId = null) {
    if (cronId) {
      return this.cronManager.getCronJobInfo(cronId);
    } else {
      const status = this.cronManager.getStatus();
      return status.cronJobs;
    }
  }

  /**
   * Control cron jobs
   * @param {string} action - Action to perform (start, stop, restart)
   * @param {string} cronId - Cron job ID (optional, for specific job)
   * @returns {Object} Operation result
   */
  controlCronJob(action, cronId = null) {
    try {
      let result = { success: false, message: "Unknown action" };

      switch (action) {
        case "start":
          if (cronId) {
            result.success = this.cronManager.startCronJob(cronId);
            result.message = result.success
              ? `Started cron job: ${cronId}`
              : `Failed to start cron job: ${cronId}`;
          } else {
            result.message = "Cron job ID required for start action";
          }
          break;

        case "stop":
          if (cronId) {
            result.success = this.cronManager.stopCronJob(cronId);
            result.message = result.success
              ? `Stopped cron job: ${cronId}`
              : `Failed to stop cron job: ${cronId}`;
          } else {
            result.message = "Cron job ID required for stop action";
          }
          break;

        case "restart":
          if (cronId) {
            const stopped = this.cronManager.stopCronJob(cronId);
            if (stopped) {
              // Wait a moment before restarting
              setTimeout(() => {
                this.cronManager.startCronJob(cronId);
              }, 1000);
              result.success = true;
              result.message = `Restarted cron job: ${cronId}`;
            } else {
              result.message = `Failed to restart cron job: ${cronId}`;
            }
          } else {
            result.message = "Cron job ID required for restart action";
          }
          break;

        default:
          result.message = `Unknown action: ${action}`;
      }

      return result;
    } catch (error) {
      return {
        success: false,
        message: `Error controlling cron job: ${error.message}`,
      };
    }
  }

  /**
   * Get task scheduler information
   * @returns {Object} Task scheduler status
   */
  getTaskSchedulerInfo() {
    return this.taskScheduler.getStatus();
  }

  /**
   * Get pending scheduled tasks
   * @returns {Promise<Array>} Pending tasks
   */
  async getPendingTasks() {
    return await this.taskScheduler.getPendingTasks();
  }

  /**
   * Get task execution history
   * @param {string} accountId - Account ID (optional)
   * @param {number} limit - Limit results
   * @returns {Promise<Array>} Task history
   */
  async getTaskHistory(accountId = null, limit = 50) {
    return await this.taskScheduler.getTaskHistory(accountId, limit);
  }

  /**
   * Get workflow definition for reference
   * @param {string} workflowType - Workflow type
   * @returns {Object|null} Workflow definition
   */
  async getWorkflowDefinition(workflowType) {
    const definition = this.executor.workflowDefinitions.get(workflowType);
    if (!definition) {
      // Try to load from database
      return await workflowDb.getWorkflowDefinition(workflowType);
    }
    return definition;
  }

  /**
   * Setup event listeners for workflow events
   */
  setupEventListeners() {
    // WorkflowExecutor events
    this.executor.on("execution:started", (data) => {
      console.log(
        `📊 Workflow Event: Started - ${data.accountId} (${data.executionId})`
      );
    });

    this.executor.on("execution:completed", (data) => {
      console.log(`📊 Workflow Event: Completed - ${data.accountId}`);
      console.log(`   Duration: ${data.duration}ms, Steps: ${data.totalSteps}`);
    });

    this.executor.on("execution:failed", (data) => {
      console.error(`📊 Workflow Event: Failed - ${data.accountId}`);
      console.error(`   Error: ${data.error}`);
    });

    this.executor.on("execution:step_completed", (data) => {
      console.log(
        `📊 Workflow Step Completed: ${data.stepId} for ${data.accountId}`
      );
    });

    this.executor.on("execution:step_failed", (data) => {
      console.error(
        `📊 Workflow Step Failed: ${data.stepId} for ${data.accountId}`
      );
      console.error(`   Error: ${data.error}`);
    });

    // CronManager events
    this.cronManager.on("cron:started", () => {
      console.log("📊 Cron Manager started");
    });

    this.cronManager.on("cron:stopped", () => {
      console.log("📊 Cron Manager stopped");
    });

    // CronMonitor alerts
    this.monitor.on("alert:created", (alert) => {
      console.log(`🚨 New Alert: [${alert.severity}] ${alert.message}`);
    });
  }

  /**
   * Health check for workflow manager with cron monitoring
   * @returns {Object} Enhanced health status
   */
  getHealthStatus() {
    const executorStats = this.executor.getStatistics();
    const cronStatus = this.cronManager.getStatus();
    const monitoringStatus = this.monitor.getStatus();
    const taskStatus = this.taskScheduler.getStatus();

    const overallHealthy =
      this.isInitialized &&
      executorStats.isInitialized &&
      cronStatus.isRunning &&
      monitoringStatus.isMonitoring &&
      monitoringStatus.systemHealth !== "error";

    return {
      healthy: overallHealthy,
      initialized: this.isInitialized,
      components: {
        workflowExecutor: {
          initialized: executorStats.isInitialized,
          activeExecutions: executorStats.activeExecutions,
          totalExecutions: executorStats.totalExecutions,
          successRate:
            (executorStats.totalExecutions || 0) > 0
              ? ((executorStats.successfulExecutions || 0) /
                  executorStats.totalExecutions) *
                100
              : 100, // Return 100% when no executions yet (optimistic default)
        },
        cronManager: {
          running: cronStatus.isRunning,
          totalCronJobs: cronStatus.totalCronJobs,
          scheduledTasks: cronStatus.totalScheduledTasks,
          executedTasks: cronStatus.stats.executedTasks,
          failedTasks: cronStatus.stats.failedTasks,
        },
        taskScheduler: {
          activeTasks: taskStatus.stats.activeTasks,
          completedTasks: taskStatus.stats.completedTasks,
          failedTasks: taskStatus.stats.failedTasks,
          queuedTasks: taskStatus.queuedTasks,
        },
        cronMonitor: {
          monitoring: monitoringStatus.isMonitoring,
          systemHealth: monitoringStatus.systemHealth,
          successRate: monitoringStatus.successRate,
          unacknowledgedAlerts: monitoringStatus.alerts?.unacknowledged || 0,
        },
      },
      metrics: {
        successRate: monitoringStatus.successRate,
        failureRate: monitoringStatus.failureRate,
        avgExecutionTime: executorStats.averageExecutionTime,
        totalExecutions: executorStats.totalExecutions,
      },
      alerts: {
        total: monitoringStatus.alerts?.total || 0,
        unacknowledged: monitoringStatus.alerts?.unacknowledged || 0,
        critical: monitoringStatus.alerts?.critical || 0,
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Pause all workflows (for maintenance)
   * @returns {Promise<Object>} Pause result
   */
  async pauseAllWorkflows() {
    try {
      console.log("⏸️ Pausing all workflows...");

      const pausedCount = await workflowDb.pauseAllWorkflows();

      console.log(`⏸️ Paused ${pausedCount} workflows`);
      return { success: true, message: `Paused ${pausedCount} workflows` };
    } catch (error) {
      console.error("❌ Failed to pause workflows:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Resume all paused workflows
   * @returns {Promise<Object>} Resume result
   */
  async resumeAllWorkflows() {
    try {
      console.log("▶️ Resuming all workflows...");

      const resumedCount = await workflowDb.resumeAllWorkflows();

      console.log(`▶️ Resumed ${resumedCount} workflows`);
      return { success: true, message: `Resumed ${resumedCount} workflows` };
    } catch (error) {
      console.error("❌ Failed to resume workflows:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Pausar workflow de una cuenta específica
   * @param {string} accountId - Account ID
   * @returns {Promise<Object>} Pause result
   */
  async pauseAccountWorkflow(accountId) {
    if (!this.isInitialized) {
      throw new Error("Workflow Manager not initialized");
    }

    try {
      console.log(`⏸️ Pausing workflow for account: ${accountId}`);
      const result = await this.executor.pauseExecution(accountId);

      if (result.success) {
        console.log(`✅ Workflow paused for account: ${accountId}`);
      }

      return result;
    } catch (error) {
      console.error(`❌ Failed to pause workflow for ${accountId}:`, error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Resumir workflow de una cuenta específica
   * @param {string} accountId - Account ID
   * @returns {Promise<Object>} Resume result
   */
  async resumeAccountWorkflow(accountId) {
    if (!this.isInitialized) {
      throw new Error("Workflow Manager not initialized");
    }

    try {
      console.log(`▶️ Resuming workflow for account: ${accountId}`);
      const result = await this.executor.resumeExecution(accountId);

      if (result.success) {
        console.log(`✅ Workflow resumed for account: ${accountId}`);
      }

      return result;
    } catch (error) {
      console.error(`❌ Failed to resume workflow for ${accountId}:`, error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Obtener estado detallado del workflow
   * @param {string} accountId - Account ID
   * @returns {Promise<Object|null>} Detailed workflow status
   */
  async getDetailedWorkflowStatus(accountId) {
    try {
      return await this.executor.getDetailedWorkflowStatus(accountId);
    } catch (error) {
      console.error(
        `❌ Failed to get detailed status for ${accountId}:`,
        error
      );
      return null;
    }
  }

  /**
   * Pausar múltiples workflows
   * @param {Array<string>} accountIds - Array of account IDs
   * @returns {Promise<Object>} Bulk pause result
   */
  async pauseMultipleWorkflows(accountIds) {
    const results = {
      successful: [],
      failed: [],
      total: accountIds.length,
    };

    for (const accountId of accountIds) {
      const result = await this.pauseAccountWorkflow(accountId);
      if (result.success) {
        results.successful.push(accountId);
      } else {
        results.failed.push({ accountId, error: result.error });
      }
    }

    return {
      success: results.failed.length === 0,
      message: `Paused ${results.successful.length} of ${results.total} workflows`,
      results,
    };
  }

  /**
   * Resumir múltiples workflows
   * @param {Array<string>} accountIds - Array of account IDs
   * @returns {Promise<Object>} Bulk resume result
   */
  async resumeMultipleWorkflows(accountIds) {
    const results = {
      successful: [],
      failed: [],
      total: accountIds.length,
    };

    for (const accountId of accountIds) {
      const result = await this.resumeAccountWorkflow(accountId);
      if (result.success) {
        results.successful.push(accountId);
      } else {
        results.failed.push({ accountId, error: result.error });
      }
    }

    return {
      success: results.failed.length === 0,
      message: `Resumed ${results.successful.length} of ${results.total} workflows`,
      results,
    };
  }

  /**
   * Obtener workflows por estado
   * @param {string} status - Estado a filtrar (active, paused, stopped, etc)
   * @returns {Promise<Array>} Workflows filtrados
   */
  async getWorkflowsByStatus(status = null) {
    try {
      let query = `
            SELECT 
                wi.account_id,
                wi.status,
                wi.current_step,
                wi.total_steps,
                wi.progress_percentage,
                wi.started_at,
                wi.last_activity_at,
                wd.type as workflow_type,
                wd.name as workflow_name
            FROM workflow_instances wi
            JOIN workflow_definitions wd ON wi.workflow_id = wd.id
        `;

      const params = [];
      if (status) {
        query += " WHERE wi.status = $1";
        params.push(status);
      }

      query += " ORDER BY wi.last_activity_at DESC";

      const result = await workflowDb.db.query(query, params);

      return result.rows.map((row) => ({
        accountId: row.account_id,
        status: row.status,
        workflowType: row.workflow_type,
        workflowName: row.workflow_name,
        currentStep: row.current_step,
        totalSteps: row.total_steps,
        progress: row.progress_percentage,
        startedAt: row.started_at,
        lastActivity: row.last_activity_at,
        canPause: row.status === "active",
        canResume: row.status === "paused",
        isPermanent: row.status === "stopped",
      }));
    } catch (error) {
      console.error("❌ Failed to get workflows by status:", error);
      return [];
    }
  }
}

// Export singleton instance
module.exports = new WorkflowManager();
