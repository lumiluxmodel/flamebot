// src/controllers/accountController.js - Updated with Workflow Integration
const flamebotService = require("../services/flamebotService");
const workflowManager = require("../services/workflowManager");
const { isValidModel, validateAccountData } = require("../utils/formatters");
const config = require("../config");

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
        refresh_token, // Support both naming conventions
        deviceId,
        device_id, // Support both naming conventions
        persistentId,
        devicePersistentId, // Support both naming conventions
        waitForCompletion = true,
        // NEW: Workflow configuration
        startAutomation = true,
        workflowType = "default",
        channel = "gram",
      } = req.body;

      // Normalize field names
      const finalDeviceId = deviceId || device_id;
      const finalRefreshToken = refreshToken || refresh_token;
      const finalPersistentId = persistentId || devicePersistentId;

      // Create normalized account data object
      const normalizedAccountData = {
        authToken,
        proxy,
        model,
        location,
        refreshToken: finalRefreshToken,
        deviceId: finalDeviceId,
        persistentId: finalPersistentId,
        channel
      };

      // Validate using the centralized validator
      const validation = validateAccountData(normalizedAccountData);
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          error: "Validation failed",
          details: validation.errors
        });
      }

      // Validate model
      if (!isValidModel(model, config.models.available)) {
        return res.status(400).json({
          success: false,
          error: `Invalid model. Available models: ${config.models.available.join(", ")}`,
        });
      }

      // Prepare account data for import
      const accountData = {
        ...normalizedAccountData,
        devicePersistentId: finalPersistentId, // Include both for compatibility
        importedAt: new Date().toISOString(),
      };

      console.log(`\n🚀 Starting account import process`);
      console.log(`   Model: ${model}`);
      console.log(`   Channel: ${channel}`);
      console.log(`   Start Automation: ${startAutomation}`);
      console.log(`   Workflow Type: ${workflowType}`);
      console.log(`   Format validation:`, {
        hasAuthToken: !!accountData.authToken,
        hasDeviceId: !!accountData.deviceId,
        hasRefreshToken: !!accountData.refreshToken,
        hasProxy: !!accountData.proxy,
        hasPersistentId: !!accountData.persistentId
      });

      // Import to Flamebot
      const result = await flamebotService.importAccount(
        accountData,
        waitForCompletion
      );

      if (result.success) {
        console.log(`✅ Account imported successfully`);
        console.log(`   Task ID: ${result.taskId}`);

        // Obtener el account_id real usando persistent_id
        let realAccountId = result.accountId;

        if (!realAccountId && finalPersistentId) {
          console.log(
            `🔍 Fetching real account ID using persistent_id: ${finalPersistentId}`
          );
          try {
            realAccountId = await flamebotService.getAccountIdByPersistentId(
              finalPersistentId
            );
            if (realAccountId) {
              console.log(`✅ Found real account ID: ${realAccountId}`);
            } else {
              console.log(
                `⚠️ Could not find account ID, workflow automation will not start`
              );
            }
          } catch (error) {
            console.error(`❌ Error fetching account ID:`, error);
          }
        }

        let workflowResult = null;

        // Start automation workflow if requested
        if (startAutomation && realAccountId) {
          console.log(`\n🤖 Starting automation workflow...`);
          try {
            workflowResult = await workflowManager.startAccountAutomation(
              realAccountId,
              {
                model,
                channel,
                authToken,
                importedAt: accountData.importedAt,
              },
              workflowType
            );

            if (workflowResult.success) {
              console.log(`✅ Automation workflow started successfully`);
            } else {
              console.log(
                `⚠️ Automation workflow failed to start: ${workflowResult.error}`
              );
            }
          } catch (workflowError) {
            console.error(
              `❌ Error starting automation workflow:`,
              workflowError
            );
            workflowResult = {
              success: false,
              error: workflowError.message,
            };
          }
        }

        // Return comprehensive response
        res.status(201).json({
          success: true,
          message: "Account imported successfully",
          data: {
            // Import data
            accountId: realAccountId || null,
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
              error: workflowResult?.error || null,
            },
          },
        });
      } else {
        res.status(result.statusCode || 500).json({
          success: false,
          error: result.error,
          message: result.message,
        });
      }
    } catch (error) {
      console.error("Import account error:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
        message: error.message,
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
        workflowType = "default",
      } = req.body;

      if (!Array.isArray(accounts) || accounts.length === 0) {
        return res.status(400).json({
          success: false,
          error: "Accounts array is required and must not be empty",
        });
      }

      console.log(`\n🚀 Starting bulk import process`);
      console.log(`   Accounts: ${accounts.length}`);
      console.log(`   Start Automation: ${startAutomation}`);
      console.log(`   Workflow Type: ${workflowType}`);

      // Normalize and validate all accounts
      const normalizedAccounts = [];
      
      for (const [index, account] of accounts.entries()) {
        // Normalize field names
        const normalizedAccount = {
          authToken: account.authToken,
          proxy: account.proxy,
          model: account.model,
          location: account.location,
          refreshToken: account.refreshToken || account.refresh_token,
          deviceId: account.deviceId || account.device_id,
          persistentId: account.persistentId || account.devicePersistentId,
          channel: account.channel || "gram"
        };

        // Validate using centralized validator
        const validation = validateAccountData(normalizedAccount);
        if (!validation.isValid) {
          return res.status(400).json({
            success: false,
            error: `Account ${index + 1} has validation errors`,
            details: validation.errors,
            accountIndex: index
          });
        }

        // Validate model
        if (!isValidModel(normalizedAccount.model, config.models.available)) {
          return res.status(400).json({
            success: false,
            error: `Invalid model "${normalizedAccount.model}" in account ${index + 1}. Available models: ${config.models.available.join(", ")}`,
          });
        }

        // Add to normalized list with additional fields for compatibility
        normalizedAccounts.push({
          ...normalizedAccount,
          devicePersistentId: normalizedAccount.persistentId, // Include both for compatibility
          importedAt: new Date().toISOString()
        });
      }

      // Log validation summary
      console.log(`✅ All ${normalizedAccounts.length} accounts validated successfully`);
      console.log(`📊 Sample account format check:`, {
        hasAuthToken: !!normalizedAccounts[0].authToken,
        hasDeviceId: !!normalizedAccounts[0].deviceId,
        hasRefreshToken: !!normalizedAccounts[0].refreshToken,
        hasProxy: !!normalizedAccounts[0].proxy,
        model: normalizedAccounts[0].model,
        channel: normalizedAccounts[0].channel
      });

      // Import accounts IN A SINGLE REQUEST
      console.log("📦 Sending bulk import request to Flamebot...");
      const results = await flamebotService.importMultipleAccounts(normalizedAccounts);

      // Start automation workflows for successful imports
      const workflowResults = [];
      if (startAutomation && results.successful.length > 0) {
        console.log(`\n🤖 Starting automation workflows for ${results.successful.length} accounts...`);

        for (const successfulImport of results.successful) {
          try {
            // Skip if we don't have an account ID
            if (!successfulImport.accountId) {
              console.log(`⚠️ Skipping workflow for account without ID: ${successfulImport.note || 'No ID retrieved'}`);
              workflowResults.push({
                accountId: null,
                model: successfulImport.model,
                workflowStarted: false,
                workflowError: "Account ID not available"
              });
              continue;
            }

            const workflowResult = await workflowManager.startAccountAutomation(
              successfulImport.accountId,
              {
                model: successfulImport.model,
                channel: successfulImport.channel || "gram",
                authToken: successfulImport.authToken,
                importedAt: new Date().toISOString(),
              },
              workflowType
            );

            workflowResults.push({
              accountId: successfulImport.accountId,
              model: successfulImport.model,
              workflowStarted: workflowResult.success,
              workflowError: workflowResult.error || null,
            });

            console.log(
              `   ${workflowResult.success ? "✅" : "❌"} ${
                successfulImport.accountId
              }: ${workflowResult.success ? "Started" : workflowResult.error}`
            );
          } catch (workflowError) {
            console.error(
              `❌ Workflow error for ${successfulImport.accountId}:`,
              workflowError
            );
            workflowResults.push({
              accountId: successfulImport.accountId,
              model: successfulImport.model,
              workflowStarted: false,
              workflowError: workflowError.message,
            });
          }
        }
      }

      // Calculate automation stats
      const automationStats = {
        enabled: startAutomation,
        workflowType: workflowType,
        started: workflowResults.filter((w) => w.workflowStarted).length,
        failed: workflowResults.filter((w) => !w.workflowStarted).length,
        total: workflowResults.length,
      };

      console.log(`\n📊 Import & Automation Summary:`);
      console.log(
        `   Accounts Imported: ${results.successful.length}/${results.total}`
      );
      console.log(
        `   Workflows Started: ${automationStats.started}/${automationStats.total}`
      );

      // Include task information in response
      const responseData = {
        // Import results
        ...results,
        
        // Task information (from bulk import)
        bulkImport: {
          taskId: results.taskId,
          taskCompleted: results.taskStatus?.status === "COMPLETED",
          importDuration: results.taskStatus ? 
            `${(results.taskStatus.duration || 0) / 1000}s` : 
            "Not measured"
        },

        // Automation results
        automation: automationStats,
        workflowResults: workflowResults,
      };

      res.status(200).json({
        success: true,
        message: `Imported ${results.successful.length} of ${results.total} accounts`,
        data: responseData
      });
    } catch (error) {
      console.error("Import multiple accounts error:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
        message: error.message,
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
          error: "Account ID is required",
        });
      }

      const workflowStatus =
        workflowManager.getAccountWorkflowStatus(accountId);

      if (!workflowStatus) {
        return res.status(404).json({
          success: false,
          error: "No workflow found for this account",
        });
      }

      res.json({
        success: true,
        data: workflowStatus,
      });
    } catch (error) {
      console.error("Get workflow status error:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Detener permanentemente workflow (con opción de eliminar)
   */
  async stopAccountAutomation(req, res) {
    try {
      const { accountId } = req.params;
      const { deleteData = false } = req.body;

      if (!accountId) {
        return res.status(400).json({
          success: false,
          error: "Account ID is required",
        });
      }

      const result = await workflowManager.stopAccountAutomation(
        accountId,
        deleteData
      );

      if (result.success) {
        res.json({
          success: true,
          message: result.message || "Workflow stopped permanently",
          data: {
            accountId,
            status: "stopped",
            permanent: true,
            deleted: deleteData,
            ...result,
          },
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error,
        });
      }
    } catch (error) {
      console.error("Stop automation error:", error);
      res.status(500).json({
        success: false,
        error: error.message,
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
          count: activeWorkflows.length,
        },
      });
    } catch (error) {
      console.error("Get active workflows error:", error);
      res.status(500).json({
        success: false,
        error: error.message,
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
          health: healthStatus,
        },
      });
    } catch (error) {
      console.error("Get workflow stats error:", error);
      res.status(500).json({
        success: false,
        error: error.message,
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
      console.error("Pause workflows error:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  async resumeAllWorkflows(req, res) {
    try {
      const result = await workflowManager.resumeAllWorkflows();
      res.json(result);
    } catch (error) {
      console.error("Resume workflows error:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
 * Obtener estado detallado del workflow
 */
async getDetailedWorkflowStatus(req, res) {
  try {
    const { accountId } = req.params;

    if (!accountId) {
      return res.status(400).json({
        success: false,
        error: "Account ID is required",
      });
    }

    const status = await workflowManager.getDetailedWorkflowStatus(accountId);
    
    if (status) {
      res.json({
        success: true,
        data: status
      });
    } else {
      res.status(404).json({
        success: false,
        error: "Workflow not found for this account"
      });
    }
  } catch (error) {
    console.error("Get detailed status error:", error);
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
        colors: config.models.colors,
      },
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
            timestamp: new Date().toISOString(),
          },
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Pausar workflow de una cuenta específica
   */
  async pauseAccountWorkflow(req, res) {
    try {
      const { accountId } = req.params;

      if (!accountId) {
        return res.status(400).json({
          success: false,
          error: "Account ID is required",
        });
      }

      const result = await workflowManager.pauseAccountWorkflow(accountId);

      if (result.success) {
        res.json({
          success: true,
          message: "Workflow paused successfully",
          data: {
            accountId,
            status: "paused",
            canResume: true,
            ...result,
          },
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error,
        });
      }
    } catch (error) {
      console.error("Pause workflow error:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Resumir workflow de una cuenta específica
   */
  async resumeAccountWorkflow(req, res) {
    try {
      const { accountId } = req.params;

      if (!accountId) {
        return res.status(400).json({
          success: false,
          error: "Account ID is required",
        });
      }

      const result = await workflowManager.resumeAccountWorkflow(accountId);

      if (result.success) {
        res.json({
          success: true,
          message: "Workflow resumed successfully",
          data: {
            accountId,
            status: "active",
            ...result,
          },
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error,
        });
      }
    } catch (error) {
      console.error("Resume workflow error:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Operaciones bulk en workflows
   */
  async bulkWorkflowOperation(req, res) {
    try {
      const { operation, accountIds } = req.body;

      if (!operation || !Array.isArray(accountIds) || accountIds.length === 0) {
        return res.status(400).json({
          success: false,
          error: "operation and accountIds array are required",
        });
      }

      let result;

      switch (operation) {
        case "pause":
          result = await workflowManager.pauseMultipleWorkflows(accountIds);
          break;

        case "resume":
          result = await workflowManager.resumeMultipleWorkflows(accountIds);
          break;

        case "stop":
          // Para stop, hacerlo uno por uno
          result = {
            successful: [],
            failed: [],
            total: accountIds.length,
          };

          for (const accountId of accountIds) {
            const stopResult = await workflowManager.stopAccountAutomation(
              accountId
            );
            if (stopResult.success) {
              result.successful.push(accountId);
            } else {
              result.failed.push({ accountId, error: stopResult.error });
            }
          }

          result.success = result.failed.length === 0;
          result.message = `Stopped ${result.successful.length} of ${result.total} workflows`;
          break;

        default:
          return res.status(400).json({
            success: false,
            error: `Invalid operation: ${operation}. Valid operations: pause, resume, stop`,
          });
      }

      res.json(result);
    } catch (error) {
      console.error("Bulk operation error:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Obtener workflows filtrados por estado
   */
  async getWorkflowsByStatus(req, res) {
    try {
      const { status } = req.query;

      const workflows = await workflowManager.getWorkflowsByStatus(status);

      res.json({
        success: true,
        data: {
          workflows,
          count: workflows.length,
          filter: status || "all",
        },
      });
    } catch (error) {
      console.error("Get workflows by status error:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
}

module.exports = new AccountController();
