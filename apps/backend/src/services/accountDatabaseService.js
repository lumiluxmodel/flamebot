// src/services/accountDatabaseService.js - Database-first Account Management Service

const databaseService = require('./databaseService');

/**
 * AccountDatabaseService - Manages accounts in database following CODING_STANDARDS.md
 * GOLDEN RULE: Database is the Single Source of Truth
 */
class AccountDatabaseService {
  constructor() {
    this.db = databaseService;
  }

  /**
   * Save account data to database (replaces in-memory storage)
   * @param {string} flamebotId - Flamebot account ID
   * @param {Object} accountData - Account data from import
   * @returns {Promise<Object>} Save result
   */
  async saveAccountData(flamebotId, accountData) {
    try {
      // Get model_id from models table
      const modelResult = await this.db.query(
        'SELECT id FROM models WHERE name = $1',
        [accountData.model]
      );

      if (modelResult.rows.length === 0) {
        throw new Error(`Model not found in database: ${accountData.model}`);
      }

      const modelId = modelResult.rows[0].id;

      // Get channel_id from channels table
      const channelResult = await this.db.query(
        'SELECT id FROM channels WHERE name = $1',
        [accountData.channel || 'gram']
      );

      if (channelResult.rows.length === 0) {
        throw new Error(`Channel not found in database: ${accountData.channel || 'gram'}`);
      }

      const channelId = channelResult.rows[0].id;

      // Insert or update account
      const result = await this.db.query(`
        INSERT INTO accounts (
          flamebot_id, auth_token, proxy, model_id, channel_id,
          location, refresh_token, device_id, persistent_id,
          imported_at, status
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'active'
        )
        ON CONFLICT (flamebot_id) 
        DO UPDATE SET 
          auth_token = EXCLUDED.auth_token,
          proxy = EXCLUDED.proxy,
          model_id = EXCLUDED.model_id,
          channel_id = EXCLUDED.channel_id,
          location = EXCLUDED.location,
          refresh_token = EXCLUDED.refresh_token,
          device_id = EXCLUDED.device_id,
          persistent_id = EXCLUDED.persistent_id,
          imported_at = EXCLUDED.imported_at,
          updated_at = CURRENT_TIMESTAMP
        RETURNING id, flamebot_id
      `, [
        flamebotId,
        accountData.authToken,
        accountData.proxy,
        modelId,
        channelId,
        accountData.location,
        accountData.refreshToken,
        accountData.deviceId,
        accountData.persistentId,
        new Date()
      ]);

      console.log(`✅ Account saved to database: ${flamebotId}`);
      
      return {
        success: true,
        accountId: result.rows[0].id,
        flamebotId: result.rows[0].flamebot_id,
        modelId,
        channelId
      };

    } catch (error) {
      console.error(`❌ Error saving account ${flamebotId}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Load account data from database (replaces hardcoded accountData)
   * @param {string} flamebotId - Flamebot account ID
   * @returns {Promise<Object|null>} Account data from database
   */
  async loadAccountData(flamebotId) {
    try {
      const result = await this.db.query(`
        SELECT 
          a.id,
          a.flamebot_id,
          a.auth_token,
          a.proxy,
          a.location,
          a.refresh_token,
          a.device_id,
          a.persistent_id,
          a.bio,
          a.prompt,
          a.status,
          a.imported_at,
          a.last_swipe_at,
          a.total_swipes,
          a.total_matches,
          a.spectre_config,
          m.name as model,
          c.name as channel
        FROM accounts a
        JOIN models m ON a.model_id = m.id
        JOIN channels c ON a.channel_id = c.id
        WHERE a.flamebot_id = $1
      `, [flamebotId]);

      if (result.rows.length === 0) {
        console.warn(`⚠️ Account not found in database: ${flamebotId}`);
        return null;
      }

      const account = result.rows[0];
      
      console.log(`✅ Account loaded from database: ${flamebotId} (${account.model}/${account.channel})`);

      return {
        id: account.id,
        flamebotId: account.flamebot_id,
        authToken: account.auth_token,
        proxy: account.proxy,
        model: account.model,
        channel: account.channel,
        location: account.location,
        refreshToken: account.refresh_token,
        deviceId: account.device_id,
        persistentId: account.persistent_id,
        bio: account.bio,
        prompt: account.prompt,
        status: account.status,
        importedAt: account.imported_at,
        lastSwipeAt: account.last_swipe_at,
        totalSwipes: account.total_swipes,
        totalMatches: account.total_matches,
        spectreConfig: account.spectre_config
      };

    } catch (error) {
      console.error(`❌ Error loading account ${flamebotId}:`, error);
      return null;
    }
  }

  /**
   * Get all available models from database
   * @returns {Promise<Array>} Available models
   */
  async getAvailableModels() {
    try {
      const result = await this.db.query(
        'SELECT name FROM models ORDER BY name'
      );
      
      return result.rows.map(row => row.name);
    } catch (error) {
      console.error('❌ Error getting models:', error);
      return [];
    }
  }

  /**
   * Get all available channels from database
   * @returns {Promise<Array>} Available channels
   */
  async getAvailableChannels() {
    try {
      const result = await this.db.query(
        'SELECT name FROM channels ORDER BY name'
      );
      
      return result.rows.map(row => row.name);
    } catch (error) {
      console.error('❌ Error getting channels:', error);
      return [];
    }
  }

  /**
   * Update account bio in database
   * @param {string} flamebotId - Flamebot account ID
   * @param {string} bio - New bio
   * @returns {Promise<boolean>} Success status
   */
  async updateAccountBio(flamebotId, bio) {
    try {
      await this.db.query(
        'UPDATE accounts SET bio = $1, updated_at = CURRENT_TIMESTAMP WHERE flamebot_id = $2',
        [bio, flamebotId]
      );
      
      console.log(`✅ Bio updated for account: ${flamebotId}`);
      return true;
    } catch (error) {
      console.error(`❌ Error updating bio for ${flamebotId}:`, error);
      return false;
    }
  }

  /**
   * Update account prompt in database
   * @param {string} flamebotId - Flamebot account ID
   * @param {string} prompt - New prompt
   * @returns {Promise<boolean>} Success status
   */
  async updateAccountPrompt(flamebotId, prompt) {
    try {
      await this.db.query(
        'UPDATE accounts SET prompt = $1, updated_at = CURRENT_TIMESTAMP WHERE flamebot_id = $2',
        [prompt, flamebotId]
      );
      
      console.log(`✅ Prompt updated for account: ${flamebotId}`);
      return true;
    } catch (error) {
      console.error(`❌ Error updating prompt for ${flamebotId}:`, error);
      return false;
    }
  }

  /**
   * Update swipe statistics in database
   * @param {string} flamebotId - Flamebot account ID
   * @param {number} swipeCount - Number of swipes to add
   * @param {number} matchCount - Number of matches to add
   * @returns {Promise<boolean>} Success status
   */
  async updateSwipeStats(flamebotId, swipeCount = 0, matchCount = 0) {
    try {
      await this.db.query(`
        UPDATE accounts SET 
          total_swipes = total_swipes + $1,
          total_matches = total_matches + $2,
          last_swipe_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE flamebot_id = $3
      `, [swipeCount, matchCount, flamebotId]);
      
      console.log(`✅ Swipe stats updated for account: ${flamebotId} (+${swipeCount} swipes, +${matchCount} matches)`);
      return true;
    } catch (error) {
      console.error(`❌ Error updating swipe stats for ${flamebotId}:`, error);
      return false;
    }
  }

  /**
   * Get account statistics from database
   * @param {string} flamebotId - Flamebot account ID
   * @returns {Promise<Object|null>} Account statistics
   */
  async getAccountStats(flamebotId) {
    try {
      const result = await this.db.query(`
        SELECT 
          total_swipes,
          total_matches,
          last_swipe_at,
          imported_at,
          EXTRACT(DAYS FROM (CURRENT_TIMESTAMP - imported_at)) as days_active
        FROM accounts 
        WHERE flamebot_id = $1
      `, [flamebotId]);

      if (result.rows.length === 0) {
        return null;
      }

      const stats = result.rows[0];
      
      return {
        totalSwipes: stats.total_swipes || 0,
        totalMatches: stats.total_matches || 0,
        lastSwipeAt: stats.last_swipe_at,
        importedAt: stats.imported_at,
        daysActive: Math.floor(stats.days_active) || 0,
        matchRate: stats.total_swipes > 0 ? (stats.total_matches / stats.total_swipes * 100).toFixed(2) : 0
      };

    } catch (error) {
      console.error(`❌ Error getting account stats ${flamebotId}:`, error);
      return null;
    }
  }
}

module.exports = new AccountDatabaseService();