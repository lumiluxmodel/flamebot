// src/controllers/accountController.js - Updated with Workflow Integration
const flamebotService = require('../services/flamebotService');
const workflowManager = require('../services/workflowManager');
const { isValidModel } = require('../utils/formatters');
const config = require('../config');

class AccountController {
    /**
     * Import single account with automatic workflow start
     */
    async importAccount(req, res) {
        try {
            const { 
                authToken, 
                proxy, 
                model, 
                location, 
                refreshToken, 
                deviceId, 
                persistentId, 
                waitForCompletion = true,
                // NEW: Workflow configuration
                startAutomation = true,
                workflowType = 'default',
                channel = 'gram'
            } = req.body;

            // Validation
            if (!authToken || !proxy || !model) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing required fields: authToken, proxy, and model are required'
                });
            }

            if (!isValidModel(model, config.models.available)) {
                return res.status(400).json({
                    success: false,
                    error: `Invalid model. Available models: ${config.models.available.join(', ')}`
                });
            }

            // Prepare account data
            const accountData = {
                authToken,
                proxy,
                model,
                location,
                refreshToken,
                deviceId,
                persistentId,
                channel, // Add channel for workflows
                importedAt: new Date().toISOString()
            };

            console.log(`\n🚀 Starting account import process`);
            console.log(`   Model: ${model}`);
            console.log(`   Channel: ${channel}`);
            console.log(`   Start Automation: ${startAutomation}`);
            console.log(`   Workflow Type: ${workflowType}`);

            // Import to Flamebot
            const result = await flamebotService.importAccount(accountData, waitForCompletion);

            if (result.success) {
                console.log(`✅ Account imported successfully`);
                console.log(`   Account ID: ${result.accountId}`);
                console.log(`   Task ID: ${result.taskId}`);

                let workflowResult = null;

                // Start automation workflow if requested
                if (startAutomation) {
                    console.log(`\n🤖 Starting automation workflow...`);
                    try {
                        workflowResult = await workflowManager.startAccountAutomation(
                            result.accountId,
                            {
                                model,
                                channel,
                                authToken, // For logging/tracking
                                importedAt: accountData.importedAt
                            },
                            workflowType
                        );

                        if (workflowResult.success) {
                            console.log(`✅ Automation workflow started successfully`);
                        } else {
                            console.log(`⚠️ Automation workflow failed to start: ${workflowResult.error}`);
                        }
                    } catch (workflowError) {
                        console.error(`❌ Error starting automation workflow:`, workflowError);
                        workflowResult = {
                            success: false,
                            error: workflowError.message
                        };
                    }
                }

                // Return comprehensive response
                res.status(201).json({
                    success: true,
                    message: 'Account imported successfully',
                    data: {
                        // Import data
                        accountId: result.accountId,
                        taskId: result.taskId,
                        model: model,
                        channel: channel,
                        importedAt: accountData.importedAt,
                        taskStatus: result.taskStatus,
                        
                        // Workflow data
                        automation: {
                            enabled: startAutomation,
                            workflowType: workflowType,
                            started: workflowResult?.success || false,
                            error: workflowResult?.error || null
                        }
                    }
                });
            } else {
                res.status(result.statusCode || 500).json({
                    success: false,
                    error: result.error,
                    message: result.message
                });
            }
        } catch (error) {
            console.error('Import account error:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                message: error.message
            });
        }
    }

    /**
     * Import multiple accounts with automatic workflow start
     */
    async importMultipleAccounts(req, res) {
        try {
            const { 
                accounts,
                startAutomation = true,
                workflowType = 'default'
            } = req.body;

            if (!Array.isArray(accounts) || accounts.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Accounts array is required and must not be empty'
                });
            }

            console.log(`\n🚀 Starting bulk import process`);
            console.log(`   Accounts: ${accounts.length}`);
            console.log(`   Start Automation: ${startAutomation}`);
            console.log(`   Workflow Type: ${workflowType}`);

            // Validate all accounts
            for (const account of accounts) {
                if (!account.authToken || !account.proxy || !account.model) {
                    return res.status(400).json({
                        success: false,
                        error: 'Each account must have authToken, proxy, and model'
                    });
                }

                if (!isValidModel(account.model, config.models.available)) {
                    return res.status(400).json({
                        success: false,
                        error: `Invalid model "${account.model}" in account. Available models: ${config.models.available.join(', ')}`
                    });
                }

                // Set default channel if not provided
                if (!account.channel) {
                    account.channel = 'gram';
                }
            }

            // Import accounts
            const results = await flamebotService.importMultipleAccounts(accounts);

            // Start automation workflows for successful imports
            const workflowResults = [];
            if (startAutomation) {
                console.log(`\n🤖 Starting automation workflows...`);
                
                for (const successfulImport of results.successful) {
                    try {
                        const workflowResult = await workflowManager.startAccountAutomation(
                            successfulImport.accountId,
                            {
                                model: successfulImport.model,
                                channel: successfulImport.channel || 'gram',
                                authToken: successfulImport.authToken,
                                importedAt: new Date().toISOString()
                            },
                            workflowType
                        );

                        workflowResults.push({
                            accountId: successfulImport.accountId,
                            model: successfulImport.model,
                            workflowStarted: workflowResult.success,
                            workflowError: workflowResult.error || null
                        });

                        console.log(`   ${workflowResult.success ? '✅' : '❌'} ${successfulImport.accountId}: ${workflowResult.success ? 'Started' : workflowResult.error}`);
                    } catch (workflowError) {
                        console.error(`❌ Workflow error for ${successfulImport.accountId}:`, workflowError);
                        workflowResults.push({
                            accountId: successfulImport.accountId,
                            model: successfulImport.model,
                            workflowStarted: false,
                            workflowError: workflowError.message
                        });
                    }
                }
            }

            // Calculate automation stats
            const automationStats = {
                enabled: startAutomation,
                workflowType: workflowType,
                started: workflowResults.filter(w => w.workflowStarted).length,
                failed: workflowResults.filter(w => !w.workflowStarted).length,
                total: workflowResults.length
            };

            console.log(`\n📊 Import & Automation Summary:`);
            console.log(`   Accounts Imported: ${results.successful.length}/${results.total}`);
            console.log(`   Workflows Started: ${automationStats.started}/${automationStats.total}`);

            res.status(200).json({
                success: true,
                message: `Imported ${results.successful.length} of ${results.total} accounts`,
                data: {
                    // Import results
                    ...results,
                    
                    // Automation results
                    automation: automationStats,
                    workflowResults: workflowResults
                }
            });
        } catch (error) {
            console.error('Import multiple accounts error:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                message: error.message
            });
        }
    }

    /**
     * Get workflow status for an account
     */
    async getAccountWorkflowStatus(req, res) {
        try {
            const { accountId } = req.params;

            if (!accountId) {
                return res.status(400).json({
                    success: false,
                    error: 'Account ID is required'
                });
            }

            const workflowStatus = workflowManager.getAccountWorkflowStatus(accountId);

            if (!workflowStatus) {
                return res.status(404).json({
                    success: false,
                    error: 'No workflow found for this account'
                });
            }

            res.json({
                success: true,
                data: workflowStatus
            });
        } catch (error) {
            console.error('Get workflow status error:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Stop automation for an account
     */
    async stopAccountAutomation(req, res) {
        try {
            const { accountId } = req.params;

            if (!accountId) {
                return res.status(400).json({
                    success: false,
                    error: 'Account ID is required'
                });
            }

            const result = await workflowManager.stopAccountAutomation(accountId);

            res.json(result);
        } catch (error) {
            console.error('Stop automation error:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Get all active workflows (for dashboard)
     */
    async getAllActiveWorkflows(req, res) {
        try {
            const activeWorkflows = workflowManager.getAllActiveWorkflows();
            const stats = workflowManager.getWorkflowStats();

            res.json({
                success: true,
                data: {
                    workflows: activeWorkflows,
                    stats: stats,
                    count: activeWorkflows.length
                }
            });
        } catch (error) {
            console.error('Get active workflows error:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Get workflow statistics
     */
    async getWorkflowStats(req, res) {
        try {
            const stats = workflowManager.getWorkflowStats();
            const healthStatus = workflowManager.getHealthStatus();

            res.json({
                success: true,
                data: {
                    stats,
                    health: healthStatus
                }
            });
        } catch (error) {
            console.error('Get workflow stats error:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Pause/Resume workflows (maintenance endpoints)
     */
    async pauseAllWorkflows(req, res) {
        try {
            const result = await workflowManager.pauseAllWorkflows();
            res.json(result);
        } catch (error) {
            console.error('Pause workflows error:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    async resumeAllWorkflows(req, res) {
        try {
            const result = await workflowManager.resumeAllWorkflows();
            res.json(result);
        } catch (error) {
            console.error('Resume workflows error:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Get available models (unchanged)
     */
    async getModels(req, res) {
        res.json({
            success: true,
            data: {
                models: config.models.available,
                colors: config.models.colors
            }
        });
    }

    /**
     * Health check with workflow status
     */
    async healthCheck(req, res) {
        try {
            const flamebotHealth = await flamebotService.healthCheck();
            const workflowHealth = workflowManager.getHealthStatus();

            const overallHealthy = flamebotHealth.healthy && workflowHealth.healthy;

            res.status(overallHealthy ? 200 : 503).json({
                success: overallHealthy,
                data: {
                    flamebot: flamebotHealth,
                    workflows: workflowHealth,
                    overall: {
                        healthy: overallHealthy,
                        timestamp: new Date().toISOString()
                    }
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
}

module.exports = new AccountController();
