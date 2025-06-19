const axios = require("axios");
const config = require("../config");
const { formatAccountPayload } = require("../utils/formatters");

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
   * Import account to Flamebot
   * @param {Object} accountData - Account information
   * @param {boolean} waitForCompletion - Whether to wait for task completion
   * @returns {Promise<Object>} API response with account ID
   */
  async importAccount(accountData, waitForCompletion = true) {
    try {
      // Validate required fields for 7-part format
      const requiredFields = ["authToken", "proxy"];
      const missingFields = requiredFields.filter(
        (field) => !accountData[field]
      );

      if (missingFields.length > 0) {
        throw new Error(`Missing required fields: ${missingFields.join(", ")}`);
      }

      const modelColor = config.models.colors[accountData.model] || "#44ab6c";
      const payload = formatAccountPayload(accountData, modelColor);

      const response = await this.client.post(
        config.flamebot.endpoints.addTinderCards,
        payload
      );

      const result = {
        success: true,
        data: response.data,
        taskId: response.data.task_id,
        accountId: response.data.account_id || response.data.id,
        message: "Account import initiated",
      };

      // If waitForCompletion is true, poll for task status
      if (waitForCompletion && result.taskId) {
        console.log("\n🔄 Waiting for import to complete...");
        const taskStatus = await this.pollTaskStatus(result.taskId);
        result.taskStatus = taskStatus;
        result.message = "Account imported successfully";
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
   * Import multiple accounts
   * @param {Array<Object>} accounts - Array of account data
   * @param {boolean} waitForCompletion - Whether to wait for task completion
   * @returns {Promise<Object>} Results of import operations
   */
  async importMultipleAccounts(accounts, waitForCompletion = true) {
    const results = {
      successful: [],
      failed: [],
      total: accounts.length,
    };

    for (const account of accounts) {
      const result = await this.importAccount(account, waitForCompletion);

      if (result.success) {
        results.successful.push({
          ...account,
          accountId: result.accountId,
          taskId: result.taskId,
          taskStatus: result.taskStatus,
        });
      } else {
        results.failed.push({
          ...account,
          error: result.error,
        });
      }

      // Add delay between requests to avoid rate limiting
      if (accounts.indexOf(account) < accounts.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    return results;
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
