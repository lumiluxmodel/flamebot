// apps/backend/src/services/flamebotService.js
const axios = require("axios");
const config = require("../config");

class FlamebotService {
  constructor() {
    this.client = axios.create({
      baseURL: config.flamebot.baseUrl,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.flamebot.apiKey}`,
      },
      timeout: 30000,
    });

    // Request interceptor for logging
    this.client.interceptors.request.use(
      (request) => {
        console.log(`🚀 ${request.method.toUpperCase()} ${request.url}`);
        if (config.server.env === "development") {
          console.log("📦 Payload:", JSON.stringify(request.data, null, 2));
        }
        return request;
      },
      (error) => {
        console.error("❌ Request error:", error.message);
        return Promise.reject(error);
      }
    );

    // Response interceptor for logging
    this.client.interceptors.response.use(
      (response) => {
        console.log(`✅ Response [${response.status}]:`, response.data);
        return response;
      },
      (error) => {
        if (error.response) {
          console.error(
            `❌ Response error [${error.response.status}]:`,
            error.response.data
          );
        } else {
          console.error("❌ Network error:", error.message);
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Get account ID by persistent ID
   * @param {string} persistentId - Persistent ID to search for
   * @returns {Promise<string|null>} Account ID if found
   */
  async getAccountIdByPersistentId(persistentId) {
    try {
      console.log(
        `🔍 Searching for account with persistent_id: ${persistentId}`
      );

      const response = await this.client.get("/api/get-tinder-accounts");
      const accounts = response.data.accounts;

      if (!Array.isArray(accounts) || accounts.length === 0) {
        console.log("⚠️ No accounts found in response");
        return null;
      }

      // Buscar desde el final (la cuenta más reciente con ese persistent_id)
      const account = accounts.findLast(
        (acc) => acc?.user_data?.tokens?.persistent_id === persistentId
      );

      if (account) {
        const accountId =
          account.user_data?.user_data?.id || account.user_data?.id;
        console.log(`✅ Found account ID: ${accountId}`);
        return accountId;
      }

      console.log("❌ No account found with that persistent_id");
      return null;
    } catch (error) {
      console.error("Error fetching account by persistent_id:", error.message);
      throw error;
    }
  }

  /**
   * Check task status
   * @param {string} taskId - Task ID from import response
   * @returns {Promise<Object>} Task status
   */
  async checkTaskStatus(taskId) {
    try {
      const response = await this.client.get(
        `/api/get-add-tinder-cards-status/${taskId}`
      );
      return response.data;
    } catch (error) {
      console.error("Error checking task status:", error.message);
      throw error;
    }
  }

  /**
   * Poll task status until completed or failed
   * @param {string} taskId - Task ID from import response
   * @param {number} maxAttempts - Maximum polling attempts (default: 30)
   * @param {number} interval - Polling interval in ms (default: 2000)
   * @returns {Promise<Object>} Final task status
   */
  async pollTaskStatus(taskId, maxAttempts = 30, interval = 2000) {
    console.log(`⏳ Polling task status for ID: ${taskId}`);

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const status = await this.checkTaskStatus(taskId);

        console.log(
          `📊 Attempt ${attempt}/${maxAttempts} - Status: ${
            status.status
          }, Progress: ${status.progress || "N/A"}`
        );

        if (status.status === "COMPLETED") {
          console.log(
            `✅ Task completed successfully! Successful: ${status.successful}, Failed: ${status.failed}`
          );
          return status;
        }

        if (status.status === "FAILED") {
          console.error("❌ Task failed!");
          throw new Error("Task failed");
        }

        // Wait before next attempt
        if (attempt < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, interval));
        }
      } catch (error) {
        console.error(`Error on attempt ${attempt}:`, error.message);
        if (attempt === maxAttempts) throw error;
      }
    }

    throw new Error("Task polling timeout - maximum attempts reached");
  }

  /**
   * Format account for bulk import
   * @param {Object} accountData - Account information
   * @param {string} modelColor - Model color
   * @returns {Object} Formatted account data
   */
  formatAccountForBulkImport(accountData, modelColor) {
    // Importar el formateador correcto
    const { formatAccountString } = require("../utils/formatters");

    // Usar el formateador que ya maneja todos los casos
    const accountString = formatAccountString(accountData);

    // El modelo debe ser solo el nombre, sin " - Old" ni otros sufijos
    const cleanModel = accountData.model.replace(/ - Old$/, "").trim();

    return {
      account: accountString,
      class_info: {
        class_type: cleanModel,
        class_color: modelColor,
      },
    };
  }

  /**
   * Import account to Flamebot
   * @param {Object} accountData - Account information
   * @param {boolean} waitForCompletion - Whether to wait for task completion
   * @returns {Promise<Object>} API response with account ID
   */
  async importAccount(accountData, waitForCompletion = true) {
    try {
      // Validate required fields
      const requiredFields = ["authToken", "proxy", "model"];
      const missingFields = requiredFields.filter((field) => {
        if (field === "refreshToken") {
          return !accountData.refreshToken && !accountData.refresh_token;
        }
        return !accountData[field];
      });

      // Check for persistentId, refreshToken, and coordinates
      if (!accountData.persistentId && !accountData.devicePersistentId) {
        missingFields.push("persistentId");
      }
      if (!accountData.refreshToken && !accountData.refresh_token) {
        missingFields.push("refreshToken");
      }
      if (!accountData.latitude && !accountData.lat) {
        missingFields.push("latitude");
      }
      if (!accountData.longitude && !accountData.long) {
        missingFields.push("longitude");
      }

      if (missingFields.length > 0) {
        throw new Error(`Missing required fields: ${missingFields.join(", ")}`);
      }

      const modelColor = config.models.colors[accountData.model] || "#44ab6c";

      // For single import, we still use the same format but wrap in array
      const formattedAccount = this.formatAccountForBulkImport(
        accountData,
        modelColor
      );
      const payload = { accounts: [formattedAccount] };

      const response = await this.client.post(
        config.flamebot.endpoints.addTinderCards,
        payload
      );

      const result = {
        success: true,
        data: response.data,
        taskId: response.data.task_id,
        message: "Account import initiated",
      };

      // If waitForCompletion is true, poll for task status
      if (waitForCompletion && result.taskId) {
        console.log("\n🔄 Waiting for import to complete...");
        const taskStatus = await this.pollTaskStatus(result.taskId);
        result.taskStatus = taskStatus;
        result.message = "Account imported successfully";

        // Get account ID from successful_ids in task status
        if (taskStatus.successful_ids && taskStatus.successful_ids.length > 0) {
          // For single import, take the first (and should be only) ID
          result.accountId = taskStatus.successful_ids[0];
          console.log(`✅ Account ID from task status: ${result.accountId}`);
        } else {
          console.log(`⚠️ No successful_ids in task status, account ID not available`);
        }
      }

      return result;
    } catch (error) {
      return {
        success: false,
        error: error.response?.data || error.message,
        statusCode: error.response?.status || 500,
        message: "Failed to import account",
      };
    }
  }

  /**
   * Import multiple accounts in a single request
   * @param {Array<Object>} accounts - Array of account data
   * @param {boolean} waitForCompletion - Whether to wait for task completion
   * @returns {Promise<Object>} Results of import operation
   */
  async importMultipleAccounts(accounts, waitForCompletion = true) {
    try {
      console.log(`\n🚀 Starting bulk import for ${accounts.length} accounts`);

      // Validate all accounts first
      for (const [index, account] of accounts.entries()) {
        const requiredFields = ["authToken", "proxy", "model", "refreshToken"];
        const missingFields = requiredFields.filter((field) => {
          // Check for persistentId or devicePersistentId
          if (field === "persistentId") {
            return !account.persistentId && !account.devicePersistentId;
          }
          // Check for refreshToken or refresh_token
          if (field === "refreshToken") {
            return !account.refreshToken && !account.refresh_token;
          }
          return !account[field];
        });

        // Also check for persistentId and coordinates separately
        if (!account.persistentId && !account.devicePersistentId) {
          missingFields.push("persistentId");
        }
        if (!account.latitude && !account.lat) {
          missingFields.push("latitude");
        }
        if (!account.longitude && !account.long) {
          missingFields.push("longitude");
        }

        if (missingFields.length > 0) {
          throw new Error(
            `Account ${index + 1} missing required fields: ${missingFields.join(
              ", "
            )}`
          );
        }
      }

      // Format all accounts into the correct payload structure
      const formattedAccounts = accounts.map((account) => {
        const modelColor = config.models.colors[account.model] || "#44ab6c";
        return this.formatAccountForBulkImport(account, modelColor);
      });

      const bulkPayload = { accounts: formattedAccounts };

      console.log(
        `📦 Sending bulk import request with ${formattedAccounts.length} accounts`
      );
      console.log(
        `   Payload example:`,
        JSON.stringify(formattedAccounts[0], null, 2)
      );

      // Make a single request with all accounts
      const response = await this.client.post(
        config.flamebot.endpoints.addTinderCards,
        bulkPayload
      );

      const taskId = response.data.task_id;
      console.log(`✅ Bulk import initiated. Task ID: ${taskId}`);

      let taskStatus = null;

      // Wait for completion if requested
      if (waitForCompletion && taskId) {
        console.log("\n🔄 Waiting for bulk import to complete...");
        taskStatus = await this.pollTaskStatus(taskId, 60, 3000); // More attempts for bulk
      }

      // Process results
      const results = {
        successful: [],
        failed: [],
        total: accounts.length,
        taskId: taskId,
        taskStatus: taskStatus,
      };

      // If we have task status, try to match results with accounts
      if (taskStatus && taskStatus.status === "COMPLETED") {
        // The API might return details about each imported account
        // This depends on Flamebot's response format

        // Use successful_ids from task status
        if (taskStatus.successful_ids && Array.isArray(taskStatus.successful_ids)) {
          console.log(`📋 Using successful_ids from task status: ${taskStatus.successful_ids.length} IDs`);
          
          // Map successful IDs to accounts (assuming order is preserved)
          const successfulIds = taskStatus.successful_ids;
          
          for (let i = 0; i < accounts.length; i++) {
            const account = accounts[i];
            
            if (i < successfulIds.length) {
              // Account was successfully imported
              results.successful.push({
                ...account,
                accountId: successfulIds[i],
                taskId: taskId,
                taskStatus: taskStatus,
              });
            } else {
              // Account failed (more accounts than successful IDs)
              results.failed.push({
                ...account,
                error: "Import failed - no account ID returned",
              });
            }
          }
          
          // Handle case where there are fewer accounts than successful IDs
          // This shouldn't happen but we handle it for safety
          if (successfulIds.length > accounts.length) {
            console.log(`⚠️ Warning: More successful IDs (${successfulIds.length}) than accounts (${accounts.length})`);
          }
        } else {
          // Fallback: use successful/failed counts from task status
          console.log(`📋 No successful_ids array, using counts from task status`);
          
          const successfulCount = taskStatus.successful || 0;
          const failedCount = taskStatus.failed || 0;
          
          for (let i = 0; i < accounts.length; i++) {
            const account = accounts[i];
            
            if (i < successfulCount) {
              results.successful.push({
                ...account,
                accountId: null, // No ID available without successful_ids
                taskId: taskId,
                taskStatus: taskStatus,
                note: "Account imported but ID not available (no successful_ids in response)",
              });
            } else {
              results.failed.push({
                ...account,
                error: "Import failed based on task counts",
              });
            }
          }
        }
      } else if (taskStatus && taskStatus.status === "FAILED") {
        // If the entire task failed, all accounts failed
        accounts.forEach((account) => {
          results.failed.push({
            ...account,
            error: taskStatus.error || "Bulk import task failed",
          });
        });
      } else {
        // If we don't wait for completion, we can't determine individual results
        accounts.forEach((account) => {
          results.successful.push({
            ...account,
            accountId: null,
            taskId: taskId,
            note: "Import initiated but not verified",
          });
        });
      }

      console.log(`\n📊 Bulk import results:`);
      console.log(`   ✅ Successful: ${results.successful.length}`);
      console.log(`   ❌ Failed: ${results.failed.length}`);

      return results;
    } catch (error) {
      console.error("❌ Bulk import error:", error);

      // If the request failed entirely, all accounts failed
      return {
        successful: [],
        failed: accounts.map((account) => ({
          ...account,
          error:
            error.response?.data?.error ||
            error.message ||
            "Bulk import request failed",
        })),
        total: accounts.length,
        error: error.message,
      };
    }
  }

  /**
   * Health check for Flamebot API
   * @returns {Promise<Object>} API health status
   */
  async healthCheck() {
    try {
      // Try to make a request with minimal payload
      const response = await this.client.get("/api/health", {
        validateStatus: (status) => status < 500,
      });

      return {
        healthy: true,
        statusCode: response.status,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }
}

module.exports = new FlamebotService();
