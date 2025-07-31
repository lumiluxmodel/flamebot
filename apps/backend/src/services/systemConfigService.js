// src/services/systemConfigService.js - Database-First System Configuration Service

/**
 * SystemConfigService - Replaces all hardcoded values with database configuration
 * Follows CODING_STANDARDS.md: Database is the Single Source of Truth
 */
class SystemConfigService {
  constructor(databaseService) {
    this.db = databaseService;
    this.configCache = new Map(); // Small cache for frequently accessed configs
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes cache timeout
    this.lastCacheUpdate = new Map();
    
    console.log("🔧 System Config Service initialized (Database-First)");
  }

  /**
   * Get configuration value by key
   * @param {string} key - Configuration key
   * @param {*} defaultValue - Default value if not found
   * @returns {Promise<*>} Configuration value
   */
  async getConfig(key, defaultValue = null) {
    // Check cache first
    const cached = this.configCache.get(key);
    const lastUpdate = this.lastCacheUpdate.get(key) || 0;
    
    if (cached && (Date.now() - lastUpdate < this.cacheTimeout)) {
      return cached;
    }

    try {
      const query = 'SELECT value FROM system_config WHERE key = $1';
      const result = await this.db.query(query, [key]);
      
      if (result.rows.length > 0) {
        const value = result.rows[0].value;
        
        // Update cache
        this.configCache.set(key, value);
        this.lastCacheUpdate.set(key, Date.now());
        
        return value;
      }
      
      return defaultValue;
      
    } catch (error) {
      console.error(`❌ Failed to get config ${key}:`, error);
      return defaultValue;
    }
  }

  /**
   * Get workflow timeout configuration
   * @param {string} action - Action type
   * @param {Object} stepConfig - Step configuration (for wait steps)
   * @returns {Promise<number>} Timeout in milliseconds
   */
  async getWorkflowTimeout(action, stepConfig = {}) {
    const timeouts = await this.getConfig('workflow.timeouts', {
      add_bio: 120000,
      add_prompt: 90000,
      swipe: 180000,
      swipe_with_spectre: 300000,
      wait: 30000,
      default: 120000,
      max_wait_time: 86400000  // 24 hours
    });
    
    // Special handling for wait action - allow up to 24 hours
    if (action === 'wait' && stepConfig.delay) {
      // For wait: timeout = delay + buffer (max 24 hours)
      const waitTimeout = stepConfig.delay + (timeouts.wait || 30000);
      const maxWaitTime = timeouts.max_wait_time || 86400000; // 24 hours
      
      // Ensure wait steps can run up to 24 hours
      if (stepConfig.delay <= maxWaitTime) {
        return Math.min(waitTimeout, maxWaitTime);
      } else {
        // If delay exceeds 24 hours, cap it at 24 hours
        return maxWaitTime;
      }
    }
    
    return timeouts[action] || timeouts.default;
  }

  /**
   * Get monitoring thresholds
   * @returns {Promise<Object>} Monitoring configuration
   */
  async getMonitoringConfig() {
    return await this.getConfig('workflow.monitoring', {
      maxExecutionTime: 600000,
      maxFailureRate: 0.3,
      maxRetryRate: 0.5,
      maxConcurrentExecutions: 100,
      healthCheckInterval: 60000
    });
  }

  /**
   * Get retry configuration
   * @returns {Promise<Object>} Retry configuration
   */
  async getRetryConfig() {
    return await this.getConfig('workflow.retry', {
      maxRetries: 3,
      retryBackoffMs: 30000,
      maxRetryDelay: 300000
    });
  }

  /**
   * Get goto loop limits configuration
   * @returns {Promise<Object>} Goto limits configuration
   */
  async getGotoLimitsConfig() {
    return await this.getConfig('workflow.goto_limits', {
      defaultMaxIterations: 1000,
      infiniteAllowed: true,
      trackIterations: true
    });
  }

  /**
   * Update configuration value
   * @param {string} key - Configuration key
   * @param {*} value - New value
   * @param {string} description - Optional description
   * @returns {Promise<boolean>} Success status
   */
  async updateConfig(key, value, description = null) {
    try {
      const query = `
        INSERT INTO system_config (key, value, description, category)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (key) DO UPDATE SET
          value = EXCLUDED.value,
          description = COALESCE(EXCLUDED.description, system_config.description),
          updated_at = CURRENT_TIMESTAMP
        RETURNING *
      `;
      
      const category = key.split('.')[0]; // Extract category from key
      const result = await this.db.query(query, [key, JSON.stringify(value), description, category]);
      
      // Clear cache for this key
      this.configCache.delete(key);
      this.lastCacheUpdate.delete(key);
      
      console.log(`✅ Updated config ${key}`);
      return true;
      
    } catch (error) {
      console.error(`❌ Failed to update config ${key}:`, error);
      return false;
    }
  }

  /**
   * Clear configuration cache
   */
  clearCache() {
    this.configCache.clear();
    this.lastCacheUpdate.clear();
    console.log("🧹 System config cache cleared");
  }

  /**
   * Get all configuration values for a category
   * @param {string} category - Configuration category
   * @returns {Promise<Object>} All configs in category
   */
  async getCategoryConfigs(category) {
    try {
      const query = 'SELECT key, value FROM system_config WHERE category = $1';
      const result = await this.db.query(query, [category]);
      
      const configs = {};
      result.rows.forEach(row => {
        configs[row.key] = row.value;
      });
      
      return configs;
      
    } catch (error) {
      console.error(`❌ Failed to get category configs ${category}:`, error);
      return {};
    }
  }
}

module.exports = SystemConfigService;