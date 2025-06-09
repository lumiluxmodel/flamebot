const axios = require('axios');
const config = require('../config');
const { formatAccountPayload } = require('../utils/formatters');

class FlamebotService {
  constructor() {
    this.client = axios.create({
      baseURL: config.flamebot.baseUrl,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.flamebot.apiKey}`
      },
      timeout: 30000
    });

    // Request interceptor for logging
    this.client.interceptors.request.use(
      (request) => {
        console.log(`🚀 ${request.method.toUpperCase()} ${request.url}`);
        if (config.server.env === 'development') {
          console.log('📦 Payload:', JSON.stringify(request.data, null, 2));
        }
        return request;
      },
      (error) => {
        console.error('❌ Request error:', error.message);
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
          console.error(`❌ Response error [${error.response.status}]:`, error.response.data);
        } else {
          console.error('❌ Network error:', error.message);
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Import account to Flamebot
   * @param {Object} accountData - Account information
   * @returns {Promise<Object>} API response with account ID
   */
  async importAccount(accountData) {
    try {
      const modelColor = config.models.colors[accountData.model.toLowerCase()] || '#44ab6c';
      const payload = formatAccountPayload(accountData, modelColor);
      
      const response = await this.client.post(
        config.flamebot.endpoints.addTinderCards,
        payload
      );

      return {
        success: true,
        data: response.data,
        accountId: response.data.account_id || response.data.id,
        message: 'Account imported successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data || error.message,
        statusCode: error.response?.status || 500,
        message: 'Failed to import account'
      };
    }
  }

  /**
   * Import multiple accounts
   * @param {Array<Object>} accounts - Array of account data
   * @returns {Promise<Object>} Results of import operations
   */
  async importMultipleAccounts(accounts) {
    const results = {
      successful: [],
      failed: [],
      total: accounts.length
    };

    for (const account of accounts) {
      const result = await this.importAccount(account);
      
      if (result.success) {
        results.successful.push({
          ...account,
          accountId: result.accountId
        });
      } else {
        results.failed.push({
          ...account,
          error: result.error
        });
      }

      // Add delay between requests to avoid rate limiting
      if (accounts.indexOf(account) < accounts.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
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
      const response = await this.client.get('/api/health', {
        validateStatus: (status) => status < 500
      });

      return {
        healthy: true,
        statusCode: response.status,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

module.exports = new FlamebotService();