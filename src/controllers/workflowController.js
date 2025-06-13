// src/controllers/workflowController.js - Workflow Management Controller
const workflowExecutor = require('../services/workflowExecutor');
const cronMonitor = require('../services/cronMonitor');
const workflowDb = require('../services/workflowDatabaseService');

class WorkflowController {
    /**
     * Start workflow execution (used by import process)
     */
    async startWorkflow(req, res) {
        try {
            const { 
                accountId, 
                accountData, 
                workflowType = 'default',
                startDelay = 0 
            } = req.body;

            console.log(`🎯 Controller: Starting workflow for ${accountId}`);

            // Validate required fields
            if (!accountId || !accountData || !accountData.model) {
                return res.status(400).json({
                    success: false,
                    error: 'accountId, accountData, and accountData.model are required'
                });
            }

            // Add delay if specified (useful for testing)
            if (startDelay > 0) {
                console.log(`⏰ Delaying workflow start by ${startDelay}ms`);
                setTimeout(async () => {
                    await workflowExecutor.startExecution(accountId, accountData, workflowType);
                }, startDelay);
                
                return res.status(202).json({
                    success: true,
                    message: `Workflow will start in ${startDelay}ms`,
                    data: { accountId, workflowType, startDelay }
                });
            }

            // Start immediately
            const result = await workflowExecutor.startExecution(accountId, accountData, workflowType);

            if (result.success) {
                res.status(201).json({
                    success: true,
                    message: 'Workflow started successfully',
                    data: result
                });
            } else {
                res.status(400).json({
                    success: false,
                    error: result.error
                });
            }

        } catch (error) {
            console.error('❌ Controller Error - Start Workflow:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Get comprehensive workflow dashboard data
     */
    async getDashboardData(req, res) {
        try {
            console.log('📊 Controller: Getting dashboard data');

            // Get data from multiple sources
            const [
                activeExecutions,
                executorStats,
                monitoringData,
                dbStats,
                recentActivity
            ] = await Promise.all([
                workflowExecutor.getAllActiveExecutions(),
                workflowExecutor.getStatistics(),
                cronMonitor.getDashboardData(),
                workflowDb.getWorkflowStatistics(),
                this.getRecentActivity()
            ]);

            // Compile comprehensive dashboard data
            const dashboardData = {
                overview: {
                    activeWorkflows: activeExecutions.length,
                    totalExecutions: executorStats.totalExecutions,
                    successRate: executorStats.totalExecutions > 0 ? 
                        (executorStats.successfulExecutions / executorStats.totalExecutions) * 100 : 0,
                    systemHealth: monitoringData.overview.systemHealth,
                    lastUpdate: new Date()
                },

                activeWorkflows: activeExecutions.map(exec => ({
                    accountId: exec.accountId,
                    workflowType: exec.workflowType,
                    progress: exec.progress,
                    status: exec.status,
                    startedAt: exec.startedAt,
                    timeElapsed: Date.now() - exec.startedAt.getTime(),
                    currentStep: exec.currentStep || 0,
                    totalSteps: exec.totalSteps || 0
                })),

                statistics: {
                    executor: executorStats,
                    database: dbStats,
                    monitoring: monitoringData.overview
                },

                systemHealth: {
                    components: monitoringData.overview,
                    alerts: {
                        total: monitoringData.alerts.summary.total,
                        unacknowledged: monitoringData.alerts.summary.unacknowledged,
                        critical: monitoringData.alerts.recent.filter(a => a.severity === 'critical').length
                    }
                },

                recentActivity: recentActivity,

                performance: {
                    cronJobs: monitoringData.cronJobs,
                    tasks: monitoringData.tasks,
                    avgExecutionTime: executorStats.averageExecutionTime
                }
            };

            res.json({
                success: true,
                data: dashboardData
            });

        } catch (error) {
            console.error('❌ Controller Error - Get Dashboard:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Get execution history for an account
     */
    async getExecutionHistory(req, res) {
        try {
            const { accountId } = req.params;
            const { limit = 20 } = req.query;

            console.log(`📋 Controller: Getting execution history for ${accountId}`);

            // Get execution logs from database
            const workflowInstance = await workflowDb.getWorkflowInstanceByAccountId(accountId);
            
            if (!workflowInstance) {
                return res.status(404).json({
                    success: false,
                    error: 'No workflow found for this account'
                });
            }

            const executionLogs = await workflowDb.getExecutionLog(workflowInstance.id, parseInt(limit));

            res.json({
                success: true,
                data: {
                    accountId,
                    workflowType: workflowInstance.workflow_type,
                    workflowStatus: workflowInstance.status,
                    totalSteps: workflowInstance.total_steps,
                    currentStep: workflowInstance.current_step,
                    startedAt: workflowInstance.started_at,
                    lastActivity: workflowInstance.last_activity_at,
                    executionLogs: executionLogs.map(log => ({
                        stepId: log.step_id,
                        stepIndex: log.step_index,
                        action: log.action,
                        description: log.description,
                        success: log.success,
                        result: log.result,
                        error: log.error_message,
                        duration: log.duration_ms,
                        executedAt: log.executed_at
                    }))
                }
            });

        } catch (error) {
            console.error('❌ Controller Error - Get History:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Bulk workflow operations
     */
    async bulkOperation(req, res) {
        try {
            const { operation, accountIds, workflowType } = req.body;

            if (!operation || !Array.isArray(accountIds) || accountIds.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'operation and accountIds array are required'
                });
            }

            console.log(`🔄 Controller: Bulk ${operation} for ${accountIds.length} accounts`);

            const results = {
                successful: [],
                failed: [],
                total: accountIds.length
            };

            for (const accountId of accountIds) {
                try {
                    let result;
                    
                    switch (operation) {
                        case 'stop':
                            result = await workflowExecutor.stopExecution(accountId);
                            break;
                        case 'start':
                            if (!workflowType) {
                                throw new Error('workflowType required for start operation');
                            }
                            // This would need account data - simplified for now
                            result = { success: false, error: 'Bulk start not implemented - use import endpoint' };
                            break;
                        default:
                            throw new Error(`Unknown operation: ${operation}`);
                    }

                    if (result.success) {
                        results.successful.push({ accountId, result });
                    } else {
                        results.failed.push({ accountId, error: result.error });
                    }

                } catch (error) {
                    results.failed.push({ accountId, error: error.message });
                }
            }

            res.json({
                success: results.failed.length === 0,
                message: `Bulk ${operation}: ${results.successful.length} successful, ${results.failed.length} failed`,
                data: results
            });

        } catch (error) {
            console.error('❌ Controller Error - Bulk Operation:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Get recent activity across all workflows
     */
    async getRecentActivity(limit = 50) {
    try {
        const query = `
            SELECT 
                wel.step_id,
                wel.action,
                wel.success,
                wel.executed_at,
                wel.duration_ms,
                wel.error_message,
                wi.account_id,
                wd.type as workflow_type  -- Cambiado: obtenemos type desde workflow_definitions
            FROM workflow_execution_log wel
            JOIN workflow_instances wi ON wel.workflow_instance_id = wi.id
            JOIN workflow_definitions wd ON wi.workflow_id = wd.id  -- Agregado: JOIN con definitions
            ORDER BY wel.executed_at DESC
            LIMIT $1
        `;
        
        const result = await workflowDb.db.query(query, [limit]);
        
        return result.rows.map(row => ({
            stepId: row.step_id,
            action: row.action,
            success: row.success,
            executedAt: row.executed_at,
            duration: row.duration_ms,
            error: row.error_message,
            accountId: row.account_id,
            workflowType: row.workflow_type
        }));

    } catch (error) {
        console.error('Error getting recent activity:', error);
        return [];
    }
}
}

module.exports = new WorkflowController();
