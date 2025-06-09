const flamebotService = require('../services/flamebotService');
const { isValidModel } = require('../utils/formatters');
const config = require('../config');

class AccountController {
  /**
   * Import single account
   */
  async importAccount(req, res) {
    try {
      const { authToken, proxy, model, location, refreshToken, deviceId, persistentId } = req.body;

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
        importedAt: new Date().toISOString()
      };

      // Import to Flamebot
      const result = await flamebotService.importAccount(accountData);

      if (result.success) {
        res.status(201).json({
          success: true,
          message: 'Account imported successfully',
          data: {
            accountId: result.accountId,
            model: model,
            importedAt: accountData.importedAt
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
   * Import multiple accounts
   */
  async importMultipleAccounts(req, res) {
    try {
      const { accounts } = req.body;

      if (!Array.isArray(accounts) || accounts.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Accounts array is required and must not be empty'
        });
      }

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
      }

      // Import accounts
      const results = await flamebotService.importMultipleAccounts(accounts);

      res.status(200).json({
        success: true,
        message: `Imported ${results.successful.length} of ${results.total} accounts`,
        data: results
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
   * Get available models
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
   * Health check
   */
  async healthCheck(req, res) {
    const health = await flamebotService.healthCheck();
    res.status(health.healthy ? 200 : 503).json({
      success: health.healthy,
      data: health
    });
  }
}

module.exports = new AccountController();