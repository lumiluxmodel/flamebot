// src/services/databaseService.js
const { Pool } = require("pg");

class DatabaseService {
  constructor() {
    // Get database config based on environment
    const env = process.env.NODE_ENV || "development";
    let dbConfig;

    try {
      dbConfig = require("../config/database")[env];
    } catch (error) {
      // If database.js doesn't exist, use direct config
      dbConfig = {
        host: process.env.DB_HOST || "yamabiko.proxy.rlwy.net",
        port: process.env.DB_PORT || 18827,
        database: process.env.DB_NAME || "railway",
        user: process.env.DB_USER || "postgres",
        password: process.env.DB_PASSWORD || "pyZSoGjkpyNLzYnfFgRpoHdBGVsQgkie",
        ssl: {
          rejectUnauthorized: false,
        },
      };
    }

    this.pool = new Pool({
      host: dbConfig.host,
      port: dbConfig.port,
      database: dbConfig.database,
      user: dbConfig.user,
      password: dbConfig.password,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
      ssl: dbConfig.ssl || false,
    });

    // Log connection
    this.pool.on("connect", () => {
      console.log("✅ Database connected to Railway");
    });

    this.pool.on("error", (err) => {
      console.error("❌ Database error:", err);
    });
  }

  /**
   * Execute a query
   */
  async query(text, params) {
    const start = Date.now();
    try {
      const res = await this.pool.query(text, params);
      const duration = Date.now() - start;
      console.log("📊 Query executed", {
        text: text.substring(0, 50),
        duration,
        rows: res.rowCount,
      });
      return res;
    } catch (error) {
      console.error("❌ Query error:", error);
      throw error;
    }
  }

  /**
   * Get a client for transactions
   */
  async getClient() {
    const client = await this.pool.connect();
    const query = client.query.bind(client);
    const release = client.release.bind(client);

    // Enhanced release to ensure client is released
    const releaseClient = () => {
      client.release();
    };

    return { query, release: releaseClient, client };
  }

  // ========== ACCOUNTS ==========

  async createAccount(accountData) {
    const {
      flamebot_id,
      auth_token,
      proxy,
      model_name,
      location,
      refresh_token,
      device_id,
      persistent_id,
    } = accountData;

    const query = `
            INSERT INTO accounts (flamebot_id, auth_token, proxy, model_id, location, refresh_token, device_id, persistent_id)
            VALUES ($1, $2, $3, (SELECT id FROM models WHERE name = $4), $5, $6, $7, $8)
            RETURNING *
        `;

    const result = await this.query(query, [
      flamebot_id,
      auth_token,
      proxy,
      model_name,
      location,
      refresh_token,
      device_id,
      persistent_id,
    ]);

    return result.rows[0];
  }

  async getAccountById(accountId) {
    const query = `
            SELECT a.*, m.name as model_name, m.color as model_color
            FROM accounts a
            JOIN models m ON a.model_id = m.id
            WHERE a.flamebot_id = $1
        `;
    const result = await this.query(query, [accountId]);
    return result.rows[0];
  }

  async updateAccountStats(accountId, stats) {
    const { total_swipes, total_matches, last_swipe_at } = stats;

    const query = `
            UPDATE accounts 
            SET total_swipes = COALESCE($2, total_swipes),
                total_matches = COALESCE($3, total_matches),
                last_swipe_at = COALESCE($4, last_swipe_at),
                updated_at = CURRENT_TIMESTAMP
            WHERE flamebot_id = $1
            RETURNING *
        `;

    const result = await this.query(query, [
      accountId,
      total_swipes,
      total_matches,
      last_swipe_at,
    ]);
    return result.rows[0];
  }

  async updateAccountBio(accountId, bio) {
    const query = `
            UPDATE accounts 
            SET bio = $2, updated_at = CURRENT_TIMESTAMP
            WHERE flamebot_id = $1
            RETURNING *
        `;
    const result = await this.query(query, [accountId, bio]);
    return result.rows[0];
  }

  async updateAccountPrompt(accountId, prompt) {
    const query = `
            UPDATE accounts 
            SET prompt = $2, updated_at = CURRENT_TIMESTAMP
            WHERE flamebot_id = $1
            RETURNING *
        `;
    const result = await this.query(query, [accountId, prompt]);
    return result.rows[0];
  }

  async updateAccountSpectreConfig(accountId, spectreConfig) {
    const query = `
            UPDATE accounts 
            SET spectre_config = $2::jsonb, updated_at = CURRENT_TIMESTAMP
            WHERE flamebot_id = $1
            RETURNING *
        `;
    const result = await this.query(query, [
      accountId,
      JSON.stringify(spectreConfig),
    ]);
    return result.rows[0];
  }

  async getActiveAccounts(modelName = null) {
    let query = `
            SELECT a.*, m.name as model_name, m.color as model_color
            FROM accounts a
            JOIN models m ON a.model_id = m.id
            WHERE a.status = 'active'
        `;

    const params = [];
    if (modelName) {
      query += ` AND m.name = $1`;
      params.push(modelName);
    }

    query += ` ORDER BY a.created_at DESC`;

    const result = await this.query(query, params);
    return result.rows;
  }

  // ========== TASKS ==========

  async createTask(taskData) {
    const { task_id, type, status, account_id, payload } = taskData;

    const query = `
            INSERT INTO tasks (task_id, type, status, account_id, payload)
            VALUES ($1, $2, $3, (SELECT id FROM accounts WHERE flamebot_id = $4), $5::jsonb)
            RETURNING *
        `;

    const result = await this.query(query, [
      task_id,
      type,
      status,
      account_id,
      JSON.stringify(payload || {}),
    ]);

    return result.rows[0];
  }

  async updateTaskStatus(taskId, status, result = null, error = null) {
    const query = `
            UPDATE tasks 
            SET status = $2, 
                result = $3::jsonb,
                error = $4,
                completed_at = CASE WHEN $2 IN ('completed', 'failed') THEN CURRENT_TIMESTAMP ELSE NULL END,
                duration_ms = CASE WHEN $2 IN ('completed', 'failed') THEN EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - started_at)) * 1000 ELSE NULL END
            WHERE task_id = $1
            RETURNING *
        `;

    const result_json = result ? JSON.stringify(result) : null;
    const db_result = await this.query(query, [
      taskId,
      status,
      result_json,
      error,
    ]);
    return db_result.rows[0];
  }

  async getTaskById(taskId) {
    const query = `
            SELECT t.*, a.flamebot_id as account_id
            FROM tasks t
            LEFT JOIN accounts a ON t.account_id = a.id
            WHERE t.task_id = $1
        `;
    const result = await this.query(query, [taskId]);
    return result.rows[0];
  }

  async getTaskHistory(accountId = null, type = null, limit = 50) {
    let query = `
            SELECT t.*, a.flamebot_id as account_id, m.name as model_name
            FROM tasks t
            LEFT JOIN accounts a ON t.account_id = a.id
            LEFT JOIN models m ON a.model_id = m.id
            WHERE 1=1
        `;

    const params = [];
    let paramIndex = 1;

    if (accountId) {
      query += ` AND a.flamebot_id = $${paramIndex}`;
      params.push(accountId);
      paramIndex++;
    }

    if (type) {
      query += ` AND t.type = $${paramIndex}`;
      params.push(type);
      paramIndex++;
    }

    query += ` ORDER BY t.started_at DESC LIMIT $${paramIndex}`;
    params.push(limit);

    const result = await this.query(query, params);
    return result.rows;
  }

  // ========== SWIPE HISTORY ==========

  async createSwipeHistory(swipeData) {
    const { account_id, task_id, spectre_config } = swipeData;

    const query = `
            INSERT INTO swipe_history (account_id, task_id, spectre_config)
            VALUES (
                (SELECT id FROM accounts WHERE flamebot_id = $1),
                (SELECT id FROM tasks WHERE task_id = $2),
                $3::jsonb
            )
            RETURNING *
        `;

    const result = await this.query(query, [
      account_id,
      task_id,
      JSON.stringify(spectre_config || {}),
    ]);

    return result.rows[0];
  }

  async updateSwipeHistory(swipeHistoryId, stats) {
    const { swipes_count, likes_count, matches_count } = stats;

    const query = `
            UPDATE swipe_history 
            SET swipes_count = $2,
                likes_count = $3,
                matches_count = $4,
                completed_at = CURRENT_TIMESTAMP,
                duration_minutes = EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - started_at)) / 60
            WHERE id = $1
            RETURNING *
        `;

    const result = await this.query(query, [
      swipeHistoryId,
      swipes_count,
      likes_count,
      matches_count,
    ]);
    return result.rows[0];
  }

  // ========== USERNAMES ==========

  async addUsernames(modelName, channelName, usernames) {
    const client = await this.getClient();

    try {
      await client.query("BEGIN");

      // Get model and channel IDs (case-insensitive)
      const modelResult = await client.query(
        "SELECT id FROM models WHERE LOWER(name) = LOWER($1)",
        [modelName]
      );
      const channelResult = await client.query(
        "SELECT id FROM channels WHERE LOWER(name) = LOWER($1)",
        [channelName]
      );

      if (!modelResult.rows[0] || !channelResult.rows[0]) {
        throw new Error("Model or channel not found");
      }

      const modelId = modelResult.rows[0].id;
      const channelId = channelResult.rows[0].id;

      // Insert usernames
      for (const username of usernames) {
        await client.query(
          `INSERT INTO usernames (model_id, channel_id, username) 
                     VALUES ($1, $2, $3) 
                     ON CONFLICT (model_id, channel_id, username) DO NOTHING`,
          [modelId, channelId, username]
        );
      }

      await client.query("COMMIT");
      return { success: true, count: usernames.length };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async getNextUsername(modelName, channelName) {
    const client = await this.getClient();

    try {
      await client.query("BEGIN");

      // Get model and channel IDs (case-insensitive)
      const modelResult = await client.query(
        "SELECT id FROM models WHERE LOWER(name) = LOWER($1)",
        [modelName]
      );
      const channelResult = await client.query(
        "SELECT id FROM channels WHERE LOWER(name) = LOWER($1)",
        [channelName]
      );

      if (!modelResult.rows[0] || !channelResult.rows[0]) {
        throw new Error("Model or channel not found");
      }

      const modelId = modelResult.rows[0].id;
      const channelId = channelResult.rows[0].id;

      // Get current pointer
      let pointerResult = await client.query(
        "SELECT current_index FROM username_pointers WHERE model_id = $1 AND channel_id = $2",
        [modelId, channelId]
      );

      let currentIndex = 0;
      if (!pointerResult.rows[0]) {
        // Create pointer if doesn't exist
        await client.query(
          "INSERT INTO username_pointers (model_id, channel_id, current_index) VALUES ($1, $2, 0)",
          [modelId, channelId]
        );
      } else {
        currentIndex = pointerResult.rows[0].current_index;
      }

      // Get username at current index
      const usernameResult = await client.query(
        `SELECT username FROM usernames 
                 WHERE model_id = $1 AND channel_id = $2 
                 ORDER BY created_at 
                 LIMIT 1 OFFSET $3`,
        [modelId, channelId, currentIndex]
      );

      if (!usernameResult.rows[0]) {
        // Reset to beginning if we've reached the end
        currentIndex = 0;
        const firstUsername = await client.query(
          `SELECT username FROM usernames 
                     WHERE model_id = $1 AND channel_id = $2 
                     ORDER BY created_at 
                     LIMIT 1`,
          [modelId, channelId]
        );

        if (!firstUsername.rows[0]) {
          throw new Error("No usernames available");
        }

        usernameResult.rows[0] = firstUsername.rows[0];
      }

      // Update pointer
      const totalCount = await client.query(
        "SELECT COUNT(*) FROM usernames WHERE model_id = $1 AND channel_id = $2",
        [modelId, channelId]
      );

      const nextIndex = (currentIndex + 1) % parseInt(totalCount.rows[0].count);

      await client.query(
        `UPDATE username_pointers 
                 SET current_index = $3, updated_at = CURRENT_TIMESTAMP 
                 WHERE model_id = $1 AND channel_id = $2`,
        [modelId, channelId, nextIndex]
      );

      await client.query("COMMIT");

      return {
        username: usernameResult.rows[0].username,
        index: currentIndex,
        total: parseInt(totalCount.rows[0].count),
        nextIndex: nextIndex,
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get all usernames for a model and channel
   * @param {string} modelName - Model name
   * @param {string} channelName - Channel name
   * @returns {Promise<Array>} Array of usernames
   */
  async getAllUsernames(modelName, channelName) {
    const query = `
      SELECT u.username 
      FROM usernames u
      JOIN models m ON u.model_id = m.id
      JOIN channels c ON u.channel_id = c.id
      WHERE LOWER(m.name) = LOWER($1) 
      AND LOWER(c.name) = LOWER($2)
      ORDER BY u.created_at
  `;

    const result = await this.query(query, [modelName, channelName]);
    return result.rows.map((row) => row.username);
  }

  /**
   * Get username statistics for all models and channels
   * @returns {Promise<Object>} Statistics object
   */
  async getStatistics() {
    const query = `
      SELECT 
          m.name as model_name,
          c.name as channel_name,
          COUNT(u.id) as username_count,
          up.current_index,
          EXISTS(SELECT 1 FROM usernames u2 WHERE u2.model_id = m.id AND u2.channel_id = c.id) as exists
      FROM models m
      CROSS JOIN channels c
      LEFT JOIN usernames u ON u.model_id = m.id AND u.channel_id = c.id
      LEFT JOIN username_pointers up ON up.model_id = m.id AND up.channel_id = c.id
      GROUP BY m.name, c.name, m.id, c.id, up.current_index
      ORDER BY m.name, c.name
  `;

    const result = await this.query(query);

    // Format results to match existing structure
    const stats = {};
    for (const row of result.rows) {
      if (!stats[row.model_name.toLowerCase()]) {
        stats[row.model_name.toLowerCase()] = {};
      }

      stats[row.model_name.toLowerCase()][row.channel_name] = {
        count: parseInt(row.username_count) || 0,
        currentIndex: row.current_index || 0,
        exists: row.exists || false,
      };
    }

    return stats;
  }

  /**
   * Replace all usernames for a model and channel
   * @param {string} modelName - Model name
   * @param {string} channelName - Channel name
   * @param {Array<string>} usernames - Array of usernames
   * @returns {Promise<Object>} Operation result
   */
  async replaceUsernames(modelName, channelName, usernames) {
    const client = await this.getClient();

    try {
      await client.query("BEGIN");

      // Get model and channel IDs
      const modelResult = await client.query(
        "SELECT id FROM models WHERE LOWER(name) = LOWER($1)",
        [modelName]
      );
      const channelResult = await client.query(
        "SELECT id FROM channels WHERE LOWER(name) = LOWER($1)",
        [channelName]
      );

      if (!modelResult.rows[0] || !channelResult.rows[0]) {
        throw new Error("Model or channel not found");
      }

      const modelId = modelResult.rows[0].id;
      const channelId = channelResult.rows[0].id;

      // Delete existing usernames
      await client.query(
        "DELETE FROM usernames WHERE model_id = $1 AND channel_id = $2",
        [modelId, channelId]
      );

      // Reset pointer
      await client.query(
        "UPDATE username_pointers SET current_index = 0 WHERE model_id = $1 AND channel_id = $2",
        [modelId, channelId]
      );

      // Insert new usernames
      for (const username of usernames) {
        await client.query(
          "INSERT INTO usernames (model_id, channel_id, username) VALUES ($1, $2, $3)",
          [modelId, channelId, username]
        );
      }

      await client.query("COMMIT");
      return { success: true, count: usernames.length };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  // ========== ANALYTICS ==========

  async updateDailyAnalytics(date = new Date()) {
    const dateStr = date.toISOString().split("T")[0];

    const query = `
            INSERT INTO analytics (date, model_id, total_swipes, total_likes, total_matches, 
                                 total_accounts_active, avg_swipes_per_account, avg_matches_per_account, conversion_rate)
            SELECT 
                $1::date,
                m.id,
                COALESCE(SUM(sh.swipes_count), 0),
                COALESCE(SUM(sh.likes_count), 0),
                COALESCE(SUM(sh.matches_count), 0),
                COUNT(DISTINCT a.id),
                CASE WHEN COUNT(DISTINCT a.id) > 0 
                     THEN SUM(sh.swipes_count)::float / COUNT(DISTINCT a.id) 
                     ELSE 0 END,
                CASE WHEN COUNT(DISTINCT a.id) > 0 
                     THEN SUM(sh.matches_count)::float / COUNT(DISTINCT a.id) 
                     ELSE 0 END,
                CASE WHEN SUM(sh.swipes_count) > 0 
                     THEN (SUM(sh.matches_count)::float / SUM(sh.swipes_count) * 100) 
                     ELSE 0 END
            FROM models m
            LEFT JOIN accounts a ON a.model_id = m.id
            LEFT JOIN swipe_history sh ON sh.account_id = a.id 
                AND DATE(sh.started_at) = $1::date
            GROUP BY m.id
            ON CONFLICT (date, model_id) 
            DO UPDATE SET 
                total_swipes = EXCLUDED.total_swipes,
                total_likes = EXCLUDED.total_likes,
                total_matches = EXCLUDED.total_matches,
                total_accounts_active = EXCLUDED.total_accounts_active,
                avg_swipes_per_account = EXCLUDED.avg_swipes_per_account,
                avg_matches_per_account = EXCLUDED.avg_matches_per_account,
                conversion_rate = EXCLUDED.conversion_rate
        `;

    await this.query(query, [dateStr]);
    return { success: true, date: dateStr };
  }

  async getAnalytics(startDate, endDate, modelName = null) {
    let query = `
            SELECT * FROM daily_performance
            WHERE date BETWEEN $1 AND $2
        `;

    const params = [startDate, endDate];

    if (modelName) {
      query += ` AND model_name = $3`;
      params.push(modelName);
    }

    query += ` ORDER BY date DESC, model_name`;

    const result = await this.query(query, params);
    return result.rows;
  }

  // ========== ACCOUNT STATS ==========

  async getAccountStats() {
    const query = `
            SELECT 
                COUNT(*) as total_accounts,
                COUNT(CASE WHEN status = 'active' THEN 1 END) as active_accounts,
                SUM(total_swipes) as total_swipes,
                SUM(total_matches) as total_matches
            FROM accounts
        `;

    const result = await this.query(query);
    return result.rows[0];
  }

  // ========== MODELS AND CHANNELS ==========

  /**
   * Get all available models from database
   * @returns {Promise<Array>} Array of models
   */
  async getAllModels() {
    const query = `
      SELECT id, name, color 
      FROM models 
      ORDER BY name
    `;
    const result = await this.query(query);
    return result.rows;
  }

  /**
   * Get all available channels from database
   * @returns {Promise<Array>} Array of channels
   */
  async getAllChannels() {
    const query = `
      SELECT id, name, prefix, format, is_active 
      FROM channels 
      WHERE is_active = true 
      ORDER BY name
    `;
    const result = await this.query(query);
    return result.rows;
  }

  /**
   * Get channel by name
   * @param {string} channelName - Channel name
   * @returns {Promise<Object|null>} Channel data
   */
  async getChannelByName(channelName) {
    const query = `
      SELECT id, name, prefix, format, is_active 
      FROM channels 
      WHERE LOWER(name) = LOWER($1) AND is_active = true
    `;
    const result = await this.query(query, [channelName]);
    return result.rows[0] || null;
  }

  // ========== CLEANUP ==========

  async close() {
    await this.pool.end();
    console.log("🔌 Database connection closed");
  }
}

// Export a singleton instance
module.exports = new DatabaseService();
