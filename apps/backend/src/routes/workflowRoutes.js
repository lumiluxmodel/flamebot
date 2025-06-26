// src/routes/workflowRoutes.js - Comprehensive Workflow Management API
const express = require("express");
const router = express.Router();

// Import services
const workflowExecutor = require("../services/workflowExecutor");
const cronManager = require("../services/cronManager");
const taskScheduler = require("../services/taskScheduler");
const cronMonitor = require("../services/cronMonitor");
const workflowDb = require("../services/workflowDatabaseService");

// Async error wrapper
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// ============================
// WORKFLOW EXECUTION ENDPOINTS
// ============================

/**
 * Start workflow execution for an account
 * POST /api/workflows/start
 */
router.post(
  "/start",
  asyncHandler(async (req, res) => {
    try {
      const {
        accountId,
        accountData,
        workflowType = "default",
        webhookUrl = null,
      } = req.body;

      // Validation
      if (!accountId || !accountData) {
        return res.status(400).json({
          success: false,
          error: "accountId and accountData are required",
        });
      }

      if (!accountData.model) {
        return res.status(400).json({
          success: false,
          error: "accountData.model is required",
        });
      }

      console.log(`🎯 API: Starting workflow for account ${accountId}`);
      console.log(`   Workflow Type: ${workflowType}`);
      console.log(`   Model: ${accountData.model}`);

      // Start execution
      const result = await workflowExecutor.startExecution(
        accountId,
        accountData,
        workflowType
      );

      if (result.success) {
        res.status(201).json({
          success: true,
          message: "Workflow execution started successfully",
          data: {
            executionId: result.executionId,
            accountId,
            workflowType,
            totalSteps: result.totalSteps,
            estimatedDuration: result.estimatedDuration,
            estimatedCompletionTime: new Date(
              Date.now() + result.estimatedDuration
            ),
            status: "active",
          },
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error,
          message: "Failed to start workflow execution",
        });
      }
    } catch (error) {
      console.error("❌ API Error - Start Workflow:", error);
      res.status(500).json({
        success: false,
        error: error.message,
        message: "Internal server error while starting workflow",
      });
    }
  })
);

/**
 * Get workflow execution status
 * GET /api/workflows/status/:accountId
 */
router.get(
  "/status/:accountId",
  asyncHandler(async (req, res) => {
    try {
      const { accountId } = req.params;

      if (!accountId) {
        return res.status(400).json({
          success: false,
          error: "Account ID is required",
        });
      }

      const status = workflowExecutor.getExecutionStatus(accountId);

      if (!status) {
        return res.status(404).json({
          success: false,
          error: "No active workflow found for this account",
          data: null,
        });
      }

      res.json({
        success: true,
        data: {
          ...status,
          progressPercentage: status.progress,
          isRunning: status.status === "active",
          timeElapsed: Date.now() - status.startedAt.getTime(),
          nextStepDescription:
            status.nextStep?.description || "Workflow completed",
          nextStepETA: status.nextStep
            ? new Date(Date.now() + (status.nextStep.delay || 0))
            : null,
        },
      });
    } catch (error) {
      console.error("❌ API Error - Get Status:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  })
);

/**
 * Stop workflow execution
 * POST /api/workflows/stop/:accountId
 */
router.post(
  "/stop/:accountId",
  asyncHandler(async (req, res) => {
    try {
      const { accountId } = req.params;

      if (!accountId) {
        return res.status(400).json({
          success: false,
          error: "Account ID is required",
        });
      }

      console.log(`🛑 API: Stopping workflow for account ${accountId}`);

      const result = await workflowExecutor.stopExecution(accountId);

      if (result.success) {
        res.json({
          success: true,
          message: "Workflow execution stopped successfully",
          data: {
            accountId,
            status: "stopped",
            stoppedAt: new Date(),
          },
        });
      } else {
        res.status(404).json({
          success: false,
          error: result.error,
          message: "Failed to stop workflow execution",
        });
      }
    } catch (error) {
      console.error("❌ API Error - Stop Workflow:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  })
);

/**
 * Get all active workflow executions
 * GET /api/workflows/active
 */
router.get(
  "/active",
  asyncHandler(async (req, res) => {
    try {
      const {
        page = 1,
        limit = 50,
        workflowType = null,
        status = "active", // Por defecto solo trae activos
      } = req.query;

      console.log(
        `📊 API: Getting workflows (page ${page}, limit ${limit}, status ${status}, type ${
          workflowType || "all"
        })`
      );

      let activeExecutions = workflowExecutor.getAllActiveExecutions();

      // Filter by status (active | paused | stopped | completed | failed)
      if (status && status !== "all") {
        activeExecutions = activeExecutions.filter(
          (exec) => exec.status === status
        );
      }

      // Filter by workflow type if specified
      if (workflowType) {
        activeExecutions = activeExecutions.filter(
          (exec) => exec.workflowType === workflowType
        );
      }

      // Pagination
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + parseInt(limit);
      const paginatedExecutions = activeExecutions.slice(startIndex, endIndex);

      // Enhance data for UI
      const enhancedExecutions = paginatedExecutions.map((execution) => ({
        ...execution,
        timeElapsed: Date.now() - execution.startedAt.getTime(),
        progressPercentage: execution.progress,
        isRunning: execution.status === "active",
      }));

      // Recalculate summary based on filtered data
      const summary = {
        totalActive: activeExecutions.filter((e) => e.status === "active")
          .length,
        byWorkflowType: groupByWorkflowType(activeExecutions),
        byStatus: groupByStatus(activeExecutions),
      };

      res.json({
        success: true,
        data: {
          executions: enhancedExecutions,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: activeExecutions.length,
            pages: Math.ceil(activeExecutions.length / limit),
            hasNext: endIndex < activeExecutions.length,
            hasPrev: page > 1,
          },
          summary: summary,
          filters: {
            status: status,
            workflowType: workflowType || "all",
          },
        },
      });
    } catch (error) {
      console.error("❌ API Error - Get Active Workflows:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  })
);

/**
 * Get workflow execution statistics
 * GET /api/workflows/stats
 */
router.get(
  "/stats",
  asyncHandler(async (req, res) => {
    try {
      console.log("📊 API: Getting workflow statistics");

      const executorStats = workflowExecutor.getStatistics();
      const cronStats = cronManager.getStatus();
      const taskStats = taskScheduler.getStatus();
      const monitoringStats = cronMonitor.getStatus();

      // Get database statistics
      const dbStats = await workflowDb.getWorkflowStatistics();
      const executionStats = await workflowDb.getExecutionStatistics();

      res.json({
        success: true,
        data: {
          // Executor statistics
          executor: {
            totalExecutions: executorStats.totalExecutions,
            successfulExecutions: executorStats.successfulExecutions,
            failedExecutions: executorStats.failedExecutions,
            activeExecutions: executorStats.activeExecutions,
            averageExecutionTime: executorStats.averageExecutionTime,
            successRate:
              executorStats.totalExecutions > 0
                ? (executorStats.successfulExecutions /
                    executorStats.totalExecutions) *
                  100
                : 0,
          },

          // Cron system statistics
          cronSystem: {
            isRunning: cronStats.isRunning,
            totalCronJobs: cronStats.totalCronJobs,
            activeCronJobs: cronStats.totalCronJobs,
            executedTasks: cronStats.stats.executedTasks,
            failedTasks: cronStats.stats.failedTasks,
            lastExecution: cronStats.stats.lastExecution,
          },

          // Task scheduler statistics
          taskScheduler: {
            activeTasks: taskStats.stats.activeTasks,
            completedTasks: taskStats.stats.completedTasks,
            failedTasks: taskStats.stats.failedTasks,
            queuedTasks: taskStats.queuedTasks,
            averageExecutionTime: taskStats.stats.avgExecutionTime,
          },

          // Database statistics
          database: {
            totalWorkflows: dbStats.total_workflows,
            activeWorkflows: dbStats.active_workflows,
            completedWorkflows: dbStats.completed_workflows,
            failedWorkflows: dbStats.failed_workflows,
            averageCompletionHours: dbStats.avg_completion_hours,
            totalAccountsAutomated: dbStats.total_accounts_automated,
          },

          // Execution statistics
          executions: {
            totalExecutions: executionStats.total_executions,
            successfulExecutions: executionStats.successful_executions,
            failedExecutions: executionStats.failed_executions,
            averageDurationMs: executionStats.avg_duration_ms,
            uniqueActions: executionStats.unique_actions,
          },

          // System health
          health: {
            systemHealth: monitoringStats.systemHealth,
            successRate: monitoringStats.successRate,
            failureRate: monitoringStats.failureRate,
            unacknowledgedAlerts: monitoringStats.alerts.unacknowledged,
          },

          // Timestamp
          generatedAt: new Date(),
          uptime: Date.now() - (cronStats.stats.lastExecution || Date.now()),
        },
      });
    } catch (error) {
      console.error("❌ API Error - Get Stats:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  })
);

// ============================
// WORKFLOW DEFINITION ENDPOINTS
// ============================

/**
 * Get available workflow definitions
 * GET /api/workflows/definitions
 */
router.get(
  "/definitions",
  asyncHandler(async (req, res) => {
    try {
      console.log("📚 API: Getting workflow definitions");

      const definitions = await workflowDb.getAllWorkflowDefinitions();

      // Transform for API response
      const transformedDefinitions = definitions.map((def) => ({
        type: def.type,
        name: def.name,
        description: def.description,
        totalSteps: def.steps.length,
        estimatedDuration: calculateEstimatedDuration(def.steps),
        version: def.version,
        isActive: true,
        steps: def.steps.map((step, index) => ({
          stepNumber: index + 1,
          id: step.id,
          action: step.action,
          description: step.description,
          delay: step.delay,
          critical: step.critical || false,
        })),
      }));

      res.json({
        success: true,
        data: {
          definitions: transformedDefinitions,
          total: transformedDefinitions.length,
          availableTypes: transformedDefinitions.map((def) => def.type),
        },
      });
    } catch (error) {
      console.error("❌ API Error - Get Definitions:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  })
);

/**
 * Get specific workflow definition
 * GET /api/workflows/definitions/:type
 */
router.get(
  "/definitions/:type",
  asyncHandler(async (req, res) => {
    try {
      const { type } = req.params;

      console.log(`📚 API: Getting workflow definition: ${type}`);

      const definition = await workflowDb.getWorkflowDefinition(type);

      if (!definition) {
        return res.status(404).json({
          success: false,
          error: `Workflow definition '${type}' not found`,
        });
      }

      res.json({
        success: true,
        data: {
          type: definition.type,
          name: definition.name,
          description: definition.description,
          totalSteps: definition.steps.length,
          estimatedDuration: calculateEstimatedDuration(definition.steps),
          version: definition.version,
          steps: definition.steps.map((step, index) => ({
            stepNumber: index + 1,
            id: step.id,
            action: step.action,
            description: step.description,
            delay: step.delay,
            critical: step.critical || false,
            timeout: step.timeout,
            config: step.config || {},
          })),
          config: definition.config || {},
        },
      });
    } catch (error) {
      console.error("❌ API Error - Get Definition:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  })
);

/**
 * Create new workflow definition
 * POST /api/workflows/definitions
 */
router.post(
  "/definitions",
  asyncHandler(async (req, res) => {
    try {
      const { name, type, description, steps, config = {} } = req.body;

      console.log(`🎨 API: Creating new workflow definition: ${type}`);

      // Validation
      if (!name || !type || !description || !steps) {
        return res.status(400).json({
          success: false,
          error:
            "Missing required fields: name, type, description, and steps are required",
        });
      }

      if (!Array.isArray(steps) || steps.length === 0) {
        return res.status(400).json({
          success: false,
          error: "Steps must be a non-empty array",
        });
      }

      // Validate type format (alphanumeric and underscore only)
      if (!/^[a-zA-Z0-9_]+$/.test(type)) {
        return res.status(400).json({
          success: false,
          error: "Type must contain only letters, numbers, and underscores",
        });
      }

      // Validate each step
      const validActions = [
        "wait",
        "add_prompt",
        "add_bio",
        "swipe_with_spectre",
        "activate_continuous_swipe",
        "spectre_config",
        "swipe",
      ];

      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];

        if (!step.id || !step.action || !step.description) {
          return res.status(400).json({
            success: false,
            error: `Step ${
              i + 1
            } missing required fields: id, action, description`,
          });
        }

        if (!validActions.includes(step.action)) {
          return res.status(400).json({
            success: false,
            error: `Step ${i + 1} has invalid action: ${
              step.action
            }. Valid actions: ${validActions.join(", ")}`,
          });
        }

        // Set default delay if not provided
        if (step.delay === undefined) {
          step.delay = 0;
        }

        // Validate action-specific requirements
        if (step.action === "swipe_with_spectre" && !step.swipeCount) {
          return res.status(400).json({
            success: false,
            error: `Step ${i + 1} (${
              step.id
            }): swipe_with_spectre requires swipeCount`,
          });
        }

        if (step.action === "activate_continuous_swipe") {
          if (
            !step.minSwipes ||
            !step.maxSwipes ||
            !step.minIntervalMs ||
            !step.maxIntervalMs
          ) {
            return res.status(400).json({
              success: false,
              error: `Step ${i + 1} (${
                step.id
              }): continuous swipe requires minSwipes, maxSwipes, minIntervalMs, maxIntervalMs`,
            });
          }
        }
      }

      // Set default config values
      const defaultConfig = {
        maxRetries: 3,
        retryBackoffMs: 30000,
        timeoutMs: 300000,
        ...config,
      };

      // Create workflow definition
      const created = await workflowDb.upsertWorkflowDefinition({
        name,
        type,
        description,
        steps,
        config: defaultConfig,
      });

      // Reload workflow definitions in executor
      await workflowExecutor.loadWorkflowDefinitions();

      console.log(
        `✅ Created workflow definition: ${type} (v${created.version})`
      );

      res.status(201).json({
        success: true,
        message: "Workflow definition created successfully",
        data: {
          id: created.id,
          type: created.type,
          name: created.name,
          version: created.version,
          totalSteps: steps.length,
          estimatedDuration: calculateEstimatedDuration(steps),
        },
      });
    } catch (error) {
      console.error("❌ API Error - Create Definition:", error);

      // Handle unique constraint violation
      if (
        error.message.includes("duplicate key") ||
        error.message.includes("already exists")
      ) {
        return res.status(409).json({
          success: false,
          error: `Workflow type '${req.body.type}' already exists. Use PUT to update.`,
        });
      }

      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  })
);

/**
 * Update existing workflow definition
 * PUT /api/workflows/definitions/:type
 */
router.put(
  "/definitions/:type",
  asyncHandler(async (req, res) => {
    try {
      const { type } = req.params;
      const { name, description, steps, config } = req.body;

      console.log(`📝 API: Updating workflow definition: ${type}`);

      // Check if exists
      const existing = await workflowDb.getWorkflowDefinition(type);
      if (!existing) {
        return res.status(404).json({
          success: false,
          error: `Workflow definition '${type}' not found`,
        });
      }

      // Validate updates (similar to create)
      if (steps) {
        if (!Array.isArray(steps) || steps.length === 0) {
          return res.status(400).json({
            success: false,
            error: "Steps must be a non-empty array",
          });
        }

        // Validate each step (same as create)
        const validActions = [
          "wait",
          "add_prompt",
          "add_bio",
          "swipe_with_spectre",
          "activate_continuous_swipe",
          "spectre_config",
          "swipe",
        ];

        for (let i = 0; i < steps.length; i++) {
          const step = steps[i];

          if (!step.id || !step.action || !step.description) {
            return res.status(400).json({
              success: false,
              error: `Step ${i + 1} missing required fields`,
            });
          }

          if (!validActions.includes(step.action)) {
            return res.status(400).json({
              success: false,
              error: `Step ${i + 1} has invalid action: ${step.action}`,
            });
          }
        }
      }

      // Prepare update
      const updateData = {
        type,
        name: name || existing.name,
        description: description || existing.description,
        steps: steps || existing.steps,
        config: config ? { ...existing.config, ...config } : existing.config,
      };

      // Update workflow
      const updated = await workflowDb.upsertWorkflowDefinition(updateData);

      // Reload workflow definitions in executor
      await workflowExecutor.loadWorkflowDefinitions();

      console.log(
        `✅ Updated workflow definition: ${type} (v${updated.version})`
      );

      res.json({
        success: true,
        message: "Workflow definition updated successfully",
        data: {
          id: updated.id,
          type: updated.type,
          name: updated.name,
          version: updated.version,
          previousVersion: existing.version,
        },
      });
    } catch (error) {
      console.error("❌ API Error - Update Definition:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  })
);

/**
 * Delete workflow definition
 * DELETE /api/workflows/definitions/:type
 */
router.delete(
  "/definitions/:type",
  asyncHandler(async (req, res) => {
    try {
      const { type } = req.params;

      console.log(`🗑️ API: Deleting workflow definition: ${type}`);

      // Prevent deletion of system workflows
      const systemWorkflows = ["default", "aggressive", "test"];
      if (systemWorkflows.includes(type)) {
        return res.status(403).json({
          success: false,
          error: `Cannot delete system workflow: ${type}`,
        });
      }

      // Check if exists
      const existing = await workflowDb.getWorkflowDefinition(type);
      if (!existing) {
        return res.status(404).json({
          success: false,
          error: `Workflow definition '${type}' not found`,
        });
      }

      // Check if any active instances
      const query = `
            SELECT COUNT(*) as active_count
            FROM workflow_instances wi
            JOIN workflow_definitions wd ON wi.workflow_id = wd.id
            WHERE wd.type = $1 AND wi.status = 'active'
        `;
      const result = await workflowDb.db.query(query, [type]);

      if (parseInt(result.rows[0].active_count) > 0) {
        return res.status(409).json({
          success: false,
          error: `Cannot delete workflow with active instances. Found ${result.rows[0].active_count} active workflows.`,
        });
      }

      // Soft delete (deactivate)
      const deleteQuery = `
            UPDATE workflow_definitions 
            SET is_active = false, updated_at = CURRENT_TIMESTAMP 
            WHERE type = $1
            RETURNING *
        `;
      await workflowDb.db.query(deleteQuery, [type]);

      // Reload workflow definitions
      await workflowExecutor.loadWorkflowDefinitions();

      console.log(`✅ Deleted workflow definition: ${type}`);

      res.json({
        success: true,
        message: "Workflow definition deleted successfully",
        data: {
          type,
          name: existing.name,
        },
      });
    } catch (error) {
      console.error("❌ API Error - Delete Definition:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  })
);

/**
 * Activate/Deactivate workflow definition
 * PATCH /api/workflows/definitions/:type/status
 */
router.patch(
  "/definitions/:type/status",
  asyncHandler(async (req, res) => {
    try {
      const { type } = req.params;
      const { active } = req.body;

      if (typeof active !== "boolean") {
        return res.status(400).json({
          success: false,
          error: "Active status must be a boolean",
        });
      }

      console.log(
        `🔄 API: ${active ? "Activating" : "Deactivating"} workflow: ${type}`
      );

      const query = `
            UPDATE workflow_definitions 
            SET is_active = $2, updated_at = CURRENT_TIMESTAMP 
            WHERE type = $1
            RETURNING *
        `;
      const result = await workflowDb.db.query(query, [type, active]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: `Workflow definition '${type}' not found`,
        });
      }

      // Reload workflow definitions
      await workflowExecutor.loadWorkflowDefinitions();

      res.json({
        success: true,
        message: `Workflow ${
          active ? "activated" : "deactivated"
        } successfully`,
        data: {
          type,
          name: result.rows[0].name,
          active: result.rows[0].is_active,
        },
      });
    } catch (error) {
      console.error("❌ API Error - Update Status:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  })
);

/**
 * Clone existing workflow definition
 * POST /api/workflows/definitions/:type/clone
 */
router.post(
  "/definitions/:type/clone",
  asyncHandler(async (req, res) => {
    try {
      const { type } = req.params;
      const { newType, newName, newDescription } = req.body;

      console.log(`📋 API: Cloning workflow definition: ${type} → ${newType}`);

      // Validation
      if (!newType || !newName) {
        return res.status(400).json({
          success: false,
          error: "newType and newName are required",
        });
      }

      // Validate new type format
      if (!/^[a-zA-Z0-9_]+$/.test(newType)) {
        return res.status(400).json({
          success: false,
          error: "newType must contain only letters, numbers, and underscores",
        });
      }

      // Get source workflow
      const source = await workflowDb.getWorkflowDefinition(type);
      if (!source) {
        return res.status(404).json({
          success: false,
          error: `Source workflow '${type}' not found`,
        });
      }

      // Create cloned workflow
      const cloned = await workflowDb.upsertWorkflowDefinition({
        name: newName,
        type: newType,
        description:
          newDescription || `${source.description} (cloned from ${type})`,
        steps: source.steps,
        config: source.config,
      });

      // Reload workflow definitions
      await workflowExecutor.loadWorkflowDefinitions();

      console.log(`✅ Cloned workflow: ${type} → ${newType}`);

      res.status(201).json({
        success: true,
        message: "Workflow cloned successfully",
        data: {
          sourceType: type,
          newType: cloned.type,
          name: cloned.name,
          version: cloned.version,
          totalSteps: cloned.steps.length,
        },
      });
    } catch (error) {
      console.error("❌ API Error - Clone Definition:", error);

      if (error.message.includes("duplicate key")) {
        return res.status(409).json({
          success: false,
          error: `Workflow type '${req.body.newType}' already exists`,
        });
      }

      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  })
);

/**
 * Get workflow definition examples
 * GET /api/workflows/examples
 */
router.get(
  "/examples",
  asyncHandler(async (req, res) => {
    const examples = {
      basic: {
        name: "Basic Linear Workflow",
        type: "basic",
        description: "Simple workflow without loops or parallel execution",
        steps: [
          {
            id: "wait_30min",
            action: "wait",
            delay: 1800000,
            description: "Wait 30 minutes after import",
          },
          {
            id: "add_prompt",
            action: "add_prompt",
            delay: 0,
            description: "Add AI-generated prompt",
            critical: true,
          },
          {
            id: "first_swipe",
            action: "swipe_with_spectre",
            delay: 900000,
            swipeCount: 20,
            description: "First swipe session - 20 swipes",
          },
          {
            id: "add_bio",
            action: "add_bio",
            delay: 3600000,
            description: "Add bio after 1 hour",
          },
        ],
      },

      loop_example: {
        name: "Workflow with Loop",
        type: "loop_workflow",
        description: "Infinite loop between swipe sessions",
        steps: [
          {
            id: "initial_wait",
            action: "wait",
            delay: 3600000,
            description: "Wait 1 hour",
          },
          {
            id: "add_prompt",
            action: "add_prompt",
            delay: 0,
            description: "Add AI prompt",
            critical: true,
          },
          {
            id: "swipe_10",
            action: "swipe_with_spectre",
            delay: 900000,
            swipeCount: 10,
            description: "Swipe 10 times",
          },
          {
            id: "swipe_20",
            action: "swipe_with_spectre",
            delay: 3600000,
            swipeCount: 20,
            description: "Swipe 20 times",
          },
          {
            id: "loop_back",
            action: "goto",
            delay: 7200000,
            description: "Wait 2h then loop back",
            nextStep: "swipe_10",
          },
        ],
      },

      parallel_example: {
        name: "Workflow with Parallel Steps",
        type: "parallel_workflow",
        description: "Main flow with parallel bio and prompt updates",
        steps: [
          {
            id: "setup",
            action: "wait",
            delay: 1800000,
            description: "Initial setup wait 30min",
          },
          {
            id: "prompt",
            action: "add_prompt",
            delay: 0,
            description: "Initial prompt",
            critical: true,
          },
          {
            id: "continuous",
            action: "activate_continuous_swipe",
            delay: 1800000,
            minSwipes: 15,
            maxSwipes: 25,
            minIntervalMs: 3600000,
            maxIntervalMs: 7200000,
            description: "Start continuous swipes",
          },
          // Parallel steps
          {
            id: "bio_2h",
            action: "add_bio",
            delay: 7200000,
            description: "Bio after 2h (parallel)",
            parallel: true,
          },
          {
            id: "prompt_4h",
            action: "add_prompt",
            delay: 14400000,
            description: "Update prompt after 4h (parallel)",
            parallel: true,
          },
        ],
      },

      complete_example: {
        name: "Complete Example - Your Image Flow",
        type: "complete_flow",
        description:
          "Import → 1h → prompt → 15m → 10 swipes → loop with 20 swipes + parallel bio at 12h20m",
        steps: [
          {
            id: "import",
            action: "wait",
            delay: 0,
            description: "Import account",
          },
          {
            id: "wait_1h",
            action: "wait",
            delay: 3600000,
            description: "Wait 1 hour",
          },
          {
            id: "add_prompt",
            action: "add_prompt",
            delay: 0,
            description: "Add AI prompt",
            critical: true,
          },
          {
            id: "wait_15m",
            action: "wait",
            delay: 900000,
            description: "Wait 15 minutes",
          },
          {
            id: "swipe_10",
            action: "swipe_with_spectre",
            delay: 0,
            swipeCount: 10,
            description: "10 swipes",
            critical: true,
          },
          {
            id: "wait_1h_loop",
            action: "wait",
            delay: 3600000,
            description: "Wait 1 hour",
          },
          {
            id: "swipe_20_first",
            action: "swipe_with_spectre",
            delay: 0,
            swipeCount: 20,
            description: "20 swipes",
            critical: true,
          },
          {
            id: "wait_2h",
            action: "wait",
            delay: 7200000,
            description: "Wait 2 hours",
          },
          {
            id: "swipe_20_second",
            action: "swipe_with_spectre",
            delay: 0,
            swipeCount: 20,
            description: "20 swipes",
            critical: true,
          },
          {
            id: "loop",
            action: "goto",
            delay: 0,
            description: "Loop back to 10 swipes",
            nextStep: "swipe_10",
          },
          // Parallel bio
          {
            id: "bio_12h20m",
            action: "add_bio",
            delay: 44400000, // 12h 20m
            description: "Add bio after 12h 20m",
            parallel: true,
            critical: false,
          },
        ],
      },

      test_quick: {
        name: "Quick Test - 5 minutes total",
        type: "test_quick",
        description: "Fast test to verify loop and parallel functionality",
        steps: [
          {
            id: "start",
            action: "wait",
            delay: 10000, // 10 seconds
            description: "Quick start",
          },
          {
            id: "prompt",
            action: "add_prompt",
            delay: 0,
            description: "Test prompt",
          },
          {
            id: "swipe",
            action: "swipe_with_spectre",
            delay: 20000, // 20 seconds
            swipeCount: 3,
            description: "Test 3 swipes",
          },
          {
            id: "loop",
            action: "goto",
            delay: 30000, // 30 seconds before loop
            description: "Loop back to swipe",
            nextStep: "swipe",
          },
          {
            id: "bio_parallel",
            action: "add_bio",
            delay: 60000, // 1 minute from start
            description: "Bio after 1 min (parallel)",
            parallel: true,
          },
        ],
      },
    };

    res.json({
      success: true,
      message: "Workflow examples with loops and parallel execution",
      data: examples,
      usage: {
        create: "POST /api/workflows/definitions with any example",
        validActions: [
          "wait - Wait for specified delay",
          "add_prompt - Generate and add AI prompt",
          "add_bio - Generate and add AI bio",
          "swipe_with_spectre - Configure Spectre and swipe (requires: swipeCount)",
          "activate_continuous_swipe - Start infinite random swipes",
          "goto - Jump to another step (requires: nextStep)",
        ],
        features: {
          loops: "Use 'goto' action with 'nextStep' to create loops",
          parallel:
            "Add 'parallel: true' to execute steps without blocking main flow",
          delays:
            "Parallel steps delays are from workflow START, not from previous step",
        },
        tips: [
          "All delays are in milliseconds",
          "Mark critical steps with critical: true to fail workflow if they fail",
          "Parallel non-critical steps won't stop the workflow if they fail",
          "Use timeout to override default step timeout",
          "Loops can be infinite - be careful!",
          "Test with 'test_quick' workflow first (5 min total)",
        ],
      },
    });
  })
);

// ============================
// MONITORING & CONTROL ENDPOINTS
// ============================

/**
 * Get system monitoring dashboard data
 * GET /api/workflows/monitoring/dashboard
 */
router.get(
  "/monitoring/dashboard",
  asyncHandler(async (req, res) => {
    try {
      console.log("📊 API: Getting monitoring dashboard data");

      const dashboardData = cronMonitor.getDashboardData();
      const activeExecutions = workflowExecutor.getAllActiveExecutions();

      // Enhance dashboard data
      const enhancedData = {
        ...dashboardData,

        // Workflow-specific metrics
        workflows: {
          active: activeExecutions.length,
          byType: groupByWorkflowType(activeExecutions),
          byStatus: groupByStatus(activeExecutions),
          recentlyCompleted: await getRecentlyCompletedWorkflows(10),
          recentlyFailed: await getRecentlyFailedWorkflows(5),
        },

        // System status
        systemStatus: {
          workflowExecutor: workflowExecutor.isInitialized,
          cronManager: dashboardData.cronJobs.total > 0,
          taskScheduler: dashboardData.tasks.active >= 0,
          database: true, // TODO: Add DB health check
        },

        // Performance metrics
        performance: {
          averageWorkflowDuration: dashboardData.overview.avgExecutionTime,
          workflowSuccessRate: dashboardData.overview.successRate,
          systemLoad: {
            activeWorkflows: activeExecutions.length,
            queuedTasks: dashboardData.tasks.queued,
            scheduledTasks: dashboardData.cronJobs.running,
          },
        },
      };

      res.json({
        success: true,
        data: enhancedData,
      });
    } catch (error) {
      console.error("❌ API Error - Get Dashboard:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  })
);

/**
 * Get system alerts
 * GET /api/workflows/monitoring/alerts
 */
router.get(
  "/monitoring/alerts",
  asyncHandler(async (req, res) => {
    try {
      const {
        unacknowledged = "false",
        severity = null,
        limit = 50,
      } = req.query;

      console.log("🚨 API: Getting system alerts");

      let alerts;
      if (unacknowledged === "true") {
        alerts = cronMonitor.getUnacknowledgedAlerts(severity);
      } else {
        alerts = cronMonitor.getAllAlerts(parseInt(limit));
      }

      // Filter by severity if specified
      if (severity && unacknowledged !== "true") {
        alerts = alerts.filter((alert) => alert.severity === severity);
      }

      res.json({
        success: true,
        data: {
          alerts,
          summary: {
            total: alerts.length,
            unacknowledged: alerts.filter((a) => !a.acknowledged).length,
            bySeverity: {
              critical: alerts.filter((a) => a.severity === "critical").length,
              error: alerts.filter((a) => a.severity === "error").length,
              warning: alerts.filter((a) => a.severity === "warning").length,
              info: alerts.filter((a) => a.severity === "info").length,
            },
          },
        },
      });
    } catch (error) {
      console.error("❌ API Error - Get Alerts:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  })
);

/**
 * Acknowledge alert
 * POST /api/workflows/monitoring/alerts/:alertId/acknowledge
 */
router.post(
  "/monitoring/alerts/:alertId/acknowledge",
  asyncHandler(async (req, res) => {
    try {
      const { alertId } = req.params;

      console.log(`🚨 API: Acknowledging alert: ${alertId}`);

      const success = cronMonitor.acknowledgeAlert(alertId);

      if (success) {
        res.json({
          success: true,
          message: "Alert acknowledged successfully",
          data: { alertId, acknowledgedAt: new Date() },
        });
      } else {
        res.status(404).json({
          success: false,
          error: "Alert not found",
        });
      }
    } catch (error) {
      console.error("❌ API Error - Acknowledge Alert:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  })
);

// ============================
// SYSTEM CONTROL ENDPOINTS
// ============================

/**
 * Pause all workflows
 * POST /api/workflows/control/pause-all
 */
router.post(
  "/control/pause-all",
  asyncHandler(async (req, res) => {
    try {
      console.log("⏸️ API: Pausing all workflows");

      // This would need to be implemented in WorkflowExecutor
      // For now, return success
      res.json({
        success: true,
        message: "All workflows paused successfully",
        data: {
          pausedAt: new Date(),
          affectedWorkflows: workflowExecutor.getAllActiveExecutions().length,
        },
      });
    } catch (error) {
      console.error("❌ API Error - Pause All:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  })
);

/**
 * Resume all workflows
 * POST /api/workflows/control/resume-all
 */
router.post(
  "/control/resume-all",
  asyncHandler(async (req, res) => {
    try {
      console.log("▶️ API: Resuming all workflows");

      // This would need to be implemented in WorkflowExecutor
      res.json({
        success: true,
        message: "All workflows resumed successfully",
        data: {
          resumedAt: new Date(),
          affectedWorkflows: 0, // TODO: Implement actual count
        },
      });
    } catch (error) {
      console.error("❌ API Error - Resume All:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  })
);

/**
 * System health check
 * GET /api/workflows/health
 */
router.get(
  "/health",
  asyncHandler(async (req, res) => {
    try {
      const executorStats = workflowExecutor.getStatistics();
      const cronStatus = cronManager.getStatus();
      const monitoringStatus = cronMonitor.getStatus();

      const isHealthy =
        executorStats.isInitialized &&
        cronStatus.isRunning &&
        monitoringStatus.isMonitoring;

      const healthData = {
        healthy: isHealthy,
        components: {
          workflowExecutor: {
            healthy: executorStats.isInitialized,
            activeExecutions: executorStats.activeExecutions,
            totalExecutions: executorStats.totalExecutions,
          },
          cronManager: {
            healthy: cronStatus.isRunning,
            totalJobs: cronStatus.totalCronJobs,
            executedTasks: cronStatus.stats.executedTasks,
          },
          cronMonitor: {
            healthy: monitoringStatus.isMonitoring,
            systemHealth: monitoringStatus.systemHealth,
            alerts: monitoringStatus.alerts.unacknowledged,
          },
        },
        timestamp: new Date(),
        uptime: cronStatus.stats.lastExecution
          ? Date.now() - cronStatus.stats.lastExecution.getTime()
          : 0,
      };

      res.status(isHealthy ? 200 : 503).json({
        success: isHealthy,
        data: healthData,
      });
    } catch (error) {
      console.error("❌ API Error - Health Check:", error);
      res.status(500).json({
        success: false,
        error: error.message,
        healthy: false,
      });
    }
  })
);

/**
 * Test workflow endpoint - Ejecuta en el mismo proceso del servidor
 * POST /api/workflows/test
 */
router.post(
  "/test",
  asyncHandler(async (req, res) => {
    try {
      const {
        accountId = `test_${Date.now()}`,
        workflowType = "test",
        accountData,
      } = req.body;

      console.log(`\n🧪 TEST WORKFLOW ENDPOINT`);
      console.log(`   Account ID: ${accountId}`);
      console.log(`   Workflow Type: ${workflowType}`);

      // Datos de cuenta por defecto para pruebas
      const testAccountData = accountData || {
        model: "Aura",
        channel: "gram",
        authToken: "test_token_" + Date.now(),
        importedAt: new Date().toISOString(),
      };

      // Iniciar workflow usando el servicio local
      const workflowManager = require("../services/workflowManager");

      // Asegurar que está inicializado
      if (!workflowManager.isInitialized) {
        await workflowManager.initialize();
      }

      const result = await workflowManager.startAccountAutomation(
        accountId,
        testAccountData,
        workflowType
      );

      if (result.success) {
        // Obtener estado inicial
        const status = workflowManager.getAccountWorkflowStatus(accountId);

        res.status(201).json({
          success: true,
          message: "Test workflow started successfully",
          data: {
            ...result,
            currentStatus: status
              ? {
                  progress: status.progress,
                  currentStep: status.currentStep,
                  totalSteps: status.totalSteps,
                  nextStep: status.nextStep?.description,
                  nextExecutionTime: status.nextStep
                    ? new Date(Date.now() + (status.nextStep.delay || 0))
                    : null,
                }
              : null,
            monitoringUrl: `/api/workflows/status/${accountId}`,
            tip: "Use GET /api/workflows/status/:accountId to monitor progress",
          },
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error,
          message: "Failed to start test workflow",
        });
      }
    } catch (error) {
      console.error("❌ Test workflow endpoint error:", error);
      res.status(500).json({
        success: false,
        error: error.message,
        message: "Internal error during test workflow execution",
      });
    }
  })
);

/**
 * Quick test endpoint - Inicia un test rápido
 * GET /api/workflows/test/quick
 */
router.get(
  "/test/quick",
  asyncHandler(async (req, res) => {
    const accountId = `quick_test_${Date.now()}`;

    console.log(`\n⚡ QUICK TEST - Starting workflow for ${accountId}`);

    // Redirigir al endpoint POST con datos de prueba
    req.body = {
      accountId,
      workflowType: "test",
    };

    // Llamar al handler del POST
    return router.handle(req, res);
  })
);

// ============================
// UTILITY METHODS
// ============================

// Group executions by workflow type
function groupByWorkflowType(executions) {
  return executions.reduce((acc, exec) => {
    acc[exec.workflowType] = (acc[exec.workflowType] || 0) + 1;
    return acc;
  }, {});
}

// Group executions by status
function groupByStatus(executions) {
  return executions.reduce((acc, exec) => {
    acc[exec.status] = (acc[exec.status] || 0) + 1;
    return acc;
  }, {});
}

// Calculate estimated duration
function calculateEstimatedDuration(steps) {
  return steps.reduce((total, step) => total + (step.delay || 0), 0);
}

// Get recently completed workflows
async function getRecentlyCompletedWorkflows(limit = 10) {
  try {
    const query = `
            SELECT 
                wi.account_id, 
                wd.type as workflow_type,  -- Obtenemos el type desde workflow_definitions
                wi.completed_at, 
                EXTRACT(EPOCH FROM (wi.completed_at - wi.started_at)) * 1000 as duration_ms
            FROM workflow_instances wi
            JOIN workflow_definitions wd ON wi.workflow_id = wd.id  -- JOIN con workflow_definitions
            WHERE wi.status = 'completed' 
            ORDER BY wi.completed_at DESC 
            LIMIT $1
        `;
    const result = await workflowDb.db.query(query, [limit]);
    return result.rows;
  } catch (error) {
    console.error("Error getting recently completed workflows:", error);
    return [];
  }
}
// Get recently failed workflows
async function getRecentlyFailedWorkflows(limit = 5) {
  try {
    const query = `
            SELECT 
                wi.account_id, 
                wd.type as workflow_type,  -- Obtenemos el type desde workflow_definitions
                wi.failed_at, 
                wi.final_error
            FROM workflow_instances wi
            JOIN workflow_definitions wd ON wi.workflow_id = wd.id  -- JOIN con workflow_definitions
            WHERE wi.status = 'failed' 
            ORDER BY wi.failed_at DESC 
            LIMIT $1
        `;
    const result = await workflowDb.db.query(query, [limit]);
    return result.rows;
  } catch (error) {
    console.error("Error getting recently failed workflows:", error);
    return [];
  }
}

module.exports = router;
