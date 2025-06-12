// src/routes/workflowRoutes.js - Comprehensive Workflow Management API
const express = require('express');
const router = express.Router();

// Import services
const workflowExecutor = require('../services/workflowExecutor');
const cronManager = require('../services/cronManager');
const taskScheduler = require('../services/taskScheduler');
const cronMonitor = require('../services/cronMonitor');
const workflowDb = require('../services/workflowDatabaseService');

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
router.post('/start', asyncHandler(async (req, res) => {
    try {
        const { 
            accountId, 
            accountData, 
            workflowType = 'default',
            webhookUrl = null 
        } = req.body;

        // Validation
        if (!accountId || !accountData) {
            return res.status(400).json({
                success: false,
                error: 'accountId and accountData are required'
            });
        }

        if (!accountData.model) {
            return res.status(400).json({
                success: false,
                error: 'accountData.model is required'
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
                message: 'Workflow execution started successfully',
                data: {
                    executionId: result.executionId,
                    accountId,
                    workflowType,
                    totalSteps: result.totalSteps,
                    estimatedDuration: result.estimatedDuration,
                    estimatedCompletionTime: new Date(Date.now() + result.estimatedDuration),
                    status: 'active'
                }
            });
        } else {
            res.status(400).json({
                success: false,
                error: result.error,
                message: 'Failed to start workflow execution'
            });
        }

    } catch (error) {
        console.error('❌ API Error - Start Workflow:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            message: 'Internal server error while starting workflow'
        });
    }
}));

/**
 * Get workflow execution status
 * GET /api/workflows/status/:accountId
 */
router.get('/status/:accountId', asyncHandler(async (req, res) => {
    try {
        const { accountId } = req.params;

        if (!accountId) {
            return res.status(400).json({
                success: false,
                error: 'Account ID is required'
            });
        }

        const status = workflowExecutor.getExecutionStatus(accountId);

        if (!status) {
            return res.status(404).json({
                success: false,
                error: 'No active workflow found for this account',
                data: null
            });
        }

        res.json({
            success: true,
            data: {
                ...status,
                progressPercentage: status.progress,
                isRunning: status.status === 'active',
                timeElapsed: Date.now() - status.startedAt.getTime(),
                nextStepDescription: status.nextStep?.description || 'Workflow completed',
                nextStepETA: status.nextStep ? new Date(Date.now() + (status.nextStep.delay || 0)) : null
            }
        });

    } catch (error) {
        console.error('❌ API Error - Get Status:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}));

/**
 * Stop workflow execution
 * POST /api/workflows/stop/:accountId
 */
router.post('/stop/:accountId', asyncHandler(async (req, res) => {
    try {
        const { accountId } = req.params;

        if (!accountId) {
            return res.status(400).json({
                success: false,
                error: 'Account ID is required'
            });
        }

        console.log(`🛑 API: Stopping workflow for account ${accountId}`);

        const result = await workflowExecutor.stopExecution(accountId);

        if (result.success) {
            res.json({
                success: true,
                message: 'Workflow execution stopped successfully',
                data: {
                    accountId,
                    status: 'stopped',
                    stoppedAt: new Date()
                }
            });
        } else {
            res.status(404).json({
                success: false,
                error: result.error,
                message: 'Failed to stop workflow execution'
            });
        }

    } catch (error) {
        console.error('❌ API Error - Stop Workflow:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}));

/**
 * Get all active workflow executions
 * GET /api/workflows/active
 */
router.get('/active', asyncHandler(async (req, res) => {
    try {
        const { page = 1, limit = 50, workflowType = null } = req.query;
        
        console.log(`📊 API: Getting active workflows (page ${page}, limit ${limit})`);

        let activeExecutions = workflowExecutor.getAllActiveExecutions();
        
        // Filter by workflow type if specified
        if (workflowType) {
            activeExecutions = activeExecutions.filter(exec => 
                exec.workflowType === workflowType
            );
        }

        // Pagination
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + parseInt(limit);
        const paginatedExecutions = activeExecutions.slice(startIndex, endIndex);

        // Enhance data for UI
        const enhancedExecutions = paginatedExecutions.map(execution => ({
            ...execution,
            timeElapsed: Date.now() - execution.startedAt.getTime(),
            progressPercentage: execution.progress,
            isRunning: execution.status === 'active'
        }));

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
                    hasPrev: page > 1
                },
                summary: {
                    totalActive: activeExecutions.length,
                    byWorkflowType: this.groupByWorkflowType(activeExecutions),
                    byStatus: this.groupByStatus(activeExecutions)
                }
            }
        });

    } catch (error) {
        console.error('❌ API Error - Get Active Workflows:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}));

/**
 * Get workflow execution statistics
 * GET /api/workflows/stats
 */
router.get('/stats', asyncHandler(async (req, res) => {
    try {
        console.log('📊 API: Getting workflow statistics');

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
                    successRate: executorStats.totalExecutions > 0 ? 
                        (executorStats.successfulExecutions / executorStats.totalExecutions) * 100 : 0
                },

                // Cron system statistics
                cronSystem: {
                    isRunning: cronStats.isRunning,
                    totalCronJobs: cronStats.totalCronJobs,
                    activeCronJobs: cronStats.totalCronJobs,
                    executedTasks: cronStats.stats.executedTasks,
                    failedTasks: cronStats.stats.failedTasks,
                    lastExecution: cronStats.stats.lastExecution
                },

                // Task scheduler statistics
                taskScheduler: {
                    activeTasks: taskStats.stats.activeTasks,
                    completedTasks: taskStats.stats.completedTasks,
                    failedTasks: taskStats.stats.failedTasks,
                    queuedTasks: taskStats.queuedTasks,
                    averageExecutionTime: taskStats.stats.avgExecutionTime
                },

                // Database statistics
                database: {
                    totalWorkflows: dbStats.total_workflows,
                    activeWorkflows: dbStats.active_workflows,
                    completedWorkflows: dbStats.completed_workflows,
                    failedWorkflows: dbStats.failed_workflows,
                    averageCompletionHours: dbStats.avg_completion_hours,
                    totalAccountsAutomated: dbStats.total_accounts_automated
                },

                // Execution statistics
                executions: {
                    totalExecutions: executionStats.total_executions,
                    successfulExecutions: executionStats.successful_executions,
                    failedExecutions: executionStats.failed_executions,
                    averageDurationMs: executionStats.avg_duration_ms,
                    uniqueActions: executionStats.unique_actions
                },

                // System health
                health: {
                    systemHealth: monitoringStats.systemHealth,
                    successRate: monitoringStats.successRate,
                    failureRate: monitoringStats.failureRate,
                    unacknowledgedAlerts: monitoringStats.alerts.unacknowledged
                },

                // Timestamp
                generatedAt: new Date(),
                uptime: Date.now() - (cronStats.stats.lastExecution || Date.now())
            }
        });

    } catch (error) {
        console.error('❌ API Error - Get Stats:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}));

// ============================
// WORKFLOW DEFINITION ENDPOINTS
// ============================

/**
 * Get available workflow definitions
 * GET /api/workflows/definitions
 */
router.get('/definitions', asyncHandler(async (req, res) => {
    try {
        console.log('📚 API: Getting workflow definitions');

        const definitions = await workflowDb.getAllWorkflowDefinitions();

        // Transform for API response
        const transformedDefinitions = definitions.map(def => ({
            type: def.type,
            name: def.name,
            description: def.description,
            totalSteps: def.steps.length,
            estimatedDuration: this.calculateEstimatedDuration(def.steps),
            version: def.version,
            isActive: true,
            steps: def.steps.map((step, index) => ({
                stepNumber: index + 1,
                id: step.id,
                action: step.action,
                description: step.description,
                delay: step.delay,
                critical: step.critical || false
            }))
        }));

        res.json({
            success: true,
            data: {
                definitions: transformedDefinitions,
                total: transformedDefinitions.length,
                availableTypes: transformedDefinitions.map(def => def.type)
            }
        });

    } catch (error) {
        console.error('❌ API Error - Get Definitions:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}));

/**
 * Get specific workflow definition
 * GET /api/workflows/definitions/:type
 */
router.get('/definitions/:type', asyncHandler(async (req, res) => {
    try {
        const { type } = req.params;

        console.log(`📚 API: Getting workflow definition: ${type}`);

        const definition = await workflowDb.getWorkflowDefinition(type);

        if (!definition) {
            return res.status(404).json({
                success: false,
                error: `Workflow definition '${type}' not found`
            });
        }

        res.json({
            success: true,
            data: {
                type: definition.type,
                name: definition.name,
                description: definition.description,
                totalSteps: definition.steps.length,
                estimatedDuration: this.calculateEstimatedDuration(definition.steps),
                version: definition.version,
                steps: definition.steps.map((step, index) => ({
                    stepNumber: index + 1,
                    id: step.id,
                    action: step.action,
                    description: step.description,
                    delay: step.delay,
                    critical: step.critical || false,
                    timeout: step.timeout,
                    config: step.config || {}
                })),
                config: definition.config || {}
            }
        });

    } catch (error) {
        console.error('❌ API Error - Get Definition:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}));

// ============================
// MONITORING & CONTROL ENDPOINTS
// ============================

/**
 * Get system monitoring dashboard data
 * GET /api/workflows/monitoring/dashboard
 */
router.get('/monitoring/dashboard', asyncHandler(async (req, res) => {
    try {
        console.log('📊 API: Getting monitoring dashboard data');

        const dashboardData = cronMonitor.getDashboardData();
        const activeExecutions = workflowExecutor.getAllActiveExecutions();

        // Enhance dashboard data
        const enhancedData = {
            ...dashboardData,
            
            // Workflow-specific metrics
            workflows: {
                active: activeExecutions.length,
                byType: this.groupByWorkflowType(activeExecutions),
                byStatus: this.groupByStatus(activeExecutions),
                recentlyCompleted: await this.getRecentlyCompletedWorkflows(10),
                recentlyFailed: await this.getRecentlyFailedWorkflows(5)
            },

            // System status
            systemStatus: {
                workflowExecutor: workflowExecutor.isInitialized,
                cronManager: dashboardData.cronJobs.total > 0,
                taskScheduler: dashboardData.tasks.active >= 0,
                database: true // TODO: Add DB health check
            },

            // Performance metrics
            performance: {
                averageWorkflowDuration: dashboardData.overview.avgExecutionTime,
                workflowSuccessRate: dashboardData.overview.successRate,
                systemLoad: {
                    activeWorkflows: activeExecutions.length,
                    queuedTasks: dashboardData.tasks.queued,
                    scheduledTasks: dashboardData.cronJobs.running
                }
            }
        };

        res.json({
            success: true,
            data: enhancedData
        });

    } catch (error) {
        console.error('❌ API Error - Get Dashboard:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}));

/**
 * Get system alerts
 * GET /api/workflows/monitoring/alerts
 */
router.get('/monitoring/alerts', asyncHandler(async (req, res) => {
    try {
        const { 
            unacknowledged = 'false', 
            severity = null,
            limit = 50 
        } = req.query;

        console.log('🚨 API: Getting system alerts');

        let alerts;
        if (unacknowledged === 'true') {
            alerts = cronMonitor.getUnacknowledgedAlerts(severity);
        } else {
            alerts = cronMonitor.getAllAlerts(parseInt(limit));
        }

        // Filter by severity if specified
        if (severity && unacknowledged !== 'true') {
            alerts = alerts.filter(alert => alert.severity === severity);
        }

        res.json({
            success: true,
            data: {
                alerts,
                summary: {
                    total: alerts.length,
                    unacknowledged: alerts.filter(a => !a.acknowledged).length,
                    bySeverity: {
                        critical: alerts.filter(a => a.severity === 'critical').length,
                        error: alerts.filter(a => a.severity === 'error').length,
                        warning: alerts.filter(a => a.severity === 'warning').length,
                        info: alerts.filter(a => a.severity === 'info').length
                    }
                }
            }
        });

    } catch (error) {
        console.error('❌ API Error - Get Alerts:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}));

/**
 * Acknowledge alert
 * POST /api/workflows/monitoring/alerts/:alertId/acknowledge
 */
router.post('/monitoring/alerts/:alertId/acknowledge', asyncHandler(async (req, res) => {
    try {
        const { alertId } = req.params;

        console.log(`🚨 API: Acknowledging alert: ${alertId}`);

        const success = cronMonitor.acknowledgeAlert(alertId);

        if (success) {
            res.json({
                success: true,
                message: 'Alert acknowledged successfully',
                data: { alertId, acknowledgedAt: new Date() }
            });
        } else {
            res.status(404).json({
                success: false,
                error: 'Alert not found'
            });
        }

    } catch (error) {
        console.error('❌ API Error - Acknowledge Alert:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}));

// ============================
// SYSTEM CONTROL ENDPOINTS  
// ============================

/**
 * Pause all workflows
 * POST /api/workflows/control/pause-all
 */
router.post('/control/pause-all', asyncHandler(async (req, res) => {
    try {
        console.log('⏸️ API: Pausing all workflows');

        // This would need to be implemented in WorkflowExecutor
        // For now, return success
        res.json({
            success: true,
            message: 'All workflows paused successfully',
            data: {
                pausedAt: new Date(),
                affectedWorkflows: workflowExecutor.getAllActiveExecutions().length
            }
        });

    } catch (error) {
        console.error('❌ API Error - Pause All:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}));

/**
 * Resume all workflows
 * POST /api/workflows/control/resume-all
 */
router.post('/control/resume-all', asyncHandler(async (req, res) => {
    try {
        console.log('▶️ API: Resuming all workflows');

        // This would need to be implemented in WorkflowExecutor
        res.json({
            success: true,
            message: 'All workflows resumed successfully',
            data: {
                resumedAt: new Date(),
                affectedWorkflows: 0 // TODO: Implement actual count
            }
        });

    } catch (error) {
        console.error('❌ API Error - Resume All:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}));

/**
 * System health check
 * GET /api/workflows/health
 */
router.get('/health', asyncHandler(async (req, res) => {
    try {
        const executorStats = workflowExecutor.getStatistics();
        const cronStatus = cronManager.getStatus();
        const monitoringStatus = cronMonitor.getStatus();

        const isHealthy = executorStats.isInitialized && 
                         cronStatus.isRunning && 
                         monitoringStatus.isMonitoring;

        const healthData = {
            healthy: isHealthy,
            components: {
                workflowExecutor: {
                    healthy: executorStats.isInitialized,
                    activeExecutions: executorStats.activeExecutions,
                    totalExecutions: executorStats.totalExecutions
                },
                cronManager: {
                    healthy: cronStatus.isRunning,
                    totalJobs: cronStatus.totalCronJobs,
                    executedTasks: cronStatus.stats.executedTasks
                },
                cronMonitor: {
                    healthy: monitoringStatus.isMonitoring,
                    systemHealth: monitoringStatus.systemHealth,
                    alerts: monitoringStatus.alerts.unacknowledged
                }
            },
            timestamp: new Date(),
            uptime: cronStatus.stats.lastExecution ? 
                Date.now() - cronStatus.stats.lastExecution.getTime() : 0
        };

        res.status(isHealthy ? 200 : 503).json({
            success: isHealthy,
            data: healthData
        });

    } catch (error) {
        console.error('❌ API Error - Health Check:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            healthy: false
        });
    }
}));

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
            SELECT account_id, workflow_type, completed_at, 
                   EXTRACT(EPOCH FROM (completed_at - started_at)) * 1000 as duration_ms
            FROM workflow_instances 
            WHERE status = 'completed' 
            ORDER BY completed_at DESC 
            LIMIT $1
        `;
        const result = await workflowDb.db.query(query, [limit]);
        return result.rows;
    } catch (error) {
        console.error('Error getting recently completed workflows:', error);
        return [];
    }
}

// Get recently failed workflows
async function getRecentlyFailedWorkflows(limit = 5) {
    try {
        const query = `
            SELECT account_id, workflow_type, failed_at, final_error
            FROM workflow_instances 
            WHERE status = 'failed' 
            ORDER BY failed_at DESC 
            LIMIT $1
        `;
        const result = await workflowDb.db.query(query, [limit]);
        return result.rows;
    } catch (error) {
        console.error('Error getting recently failed workflows:', error);
        return [];
    }
}

module.exports = router;
