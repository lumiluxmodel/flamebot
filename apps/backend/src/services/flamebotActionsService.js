// src/services/flamebotActionsService.js
const axios = require('axios');
const config = require('../config');
const aiService = require('./aiService');
const usernameService = require('./usernameService');

class FlamebotActionsService {
  constructor() {
    this.client = axios.create({
      baseURL: config.flamebot.baseUrl,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.flamebot.apiKey}`
      },
      timeout: 30000
    });
  }

  /**
   * Update account bio
   * @param {string} accountId - Flamebot account ID (card_id)
   * @param {string} bio - Bio text (or null to generate)
   * @returns {Promise<Object>} Task result
   */
  async updateBio(accountId, bio = null) {
    console.log(`📝 Updating bio for account ${accountId}`);
    
    // Generate bio if not provided
    if (!bio) {
      console.log('🤖 Generating new bio...');
      const bios = await aiService.generateBios(1);
      bio = bios[0].text;
      console.log(`✅ Generated bio: "${bio.substring(0, 50)}..."`);
    }
    
    // 🎯 PAYLOAD CORRECTO según tu ejemplo
    const payload = {
      edits: [{
        card_id: accountId,
        update_data: {
          bio_information: {
            mode: "manual",
            bio: bio
          }
        }
      }]
    };
    
    try {
      const response = await this.client.post('/api/edit-tinder-cards', payload);
      const taskId = response.data.task_id;
      
      if (taskId) {
        console.log(`✅ Bio update task submitted. Task ID: ${taskId}`);
        // Wait for completion
        const result = await this.pollEditTask(taskId);
        return { success: true, taskId, result, generatedBio: bio };
      }
      
      throw new Error('No task ID received');
    } catch (error) {
      console.error('❌ Error updating bio:', error.message);
      throw error;
    }
  }

  /**
   * Update account prompt
   * @param {string} accountId - Flamebot account ID (card_id)
   * @param {string} model - Model name for prompt generation
   * @param {string} channel - Channel (snap/gram/of)
   * @param {string} promptText - Optional custom prompt text
   * @returns {Promise<Object>} Task result
   */
  async updatePrompt(accountId, model, channel, promptText = null) {
    console.log(`💬 Updating prompt for account ${accountId}`);
    
    let visibleText = promptText;
    let obfuscatedText;
    
    // Generate prompt if not provided
    if (!promptText) {
      console.log('🤖 Generating new prompt...');
      const usernameData = await usernameService.getNextUsername(model, channel);
      const promptData = await aiService.generatePrompt(model, channel, usernameData.username);
      visibleText = promptData.visibleText;
      obfuscatedText = promptData.obfuscatedText;
      console.log(`✅ Generated prompt: "${visibleText}"`);
    }
    
    // 🎯 PAYLOAD CORRECTO según tu ejemplo
    const payload = {
      edits: [{
        card_id: accountId,
        update_data: {
          questions: [{
            id: "pro_1",
            question: "My weird but true story is…",
            answer: obfuscatedText || visibleText
          }]
        }
      }]
    };
    
    try {
      const response = await this.client.post('/api/edit-tinder-cards', payload);
      const taskId = response.data.task_id;
      
      if (taskId) {
        console.log(`✅ Prompt update task submitted. Task ID: ${taskId}`);
        const result = await this.pollEditTask(taskId);
        return { success: true, taskId, result, visibleText, obfuscatedText };
      }
      
      throw new Error('No task ID received');
    } catch (error) {
      console.error('❌ Error updating prompt:', error.message);
      throw error;
    }
  }

  /**
   * Configure Spectre mode (swiping configuration) - CON TUS PARÁMETROS EXACTOS
   * @param {string} accountId - Flamebot account ID (card_id)
   * @param {number} maxLikes - Maximum likes (default: 50)
   * @param {Object} customConfig - Optional custom configuration
   * @returns {Promise<Object>} Task result
   */
  async configureSpectreMode(accountId, maxLikes = 50, customConfig = {}) {
    console.log(`👻 Configuring Spectre mode for account ${accountId} with ${maxLikes} max likes`);
    
    // TUS PARÁMETROS EXACTOS 🎯
    const spectreConfig = {
      mode: "spectre",
      sleep_time: 10,
      max_likes: maxLikes,
      swipe_until: "like_quantity",
      swiping_type: "forcematching",
      like_percentage: 40,
      force_matching_config: {
        mode: "like_and_dislike",
        failure_action: "retry_until_matched"
      },
      // Allow override of specific properties
      ...customConfig
    };
    
    const payload = {
      edits: [{
        card_id: accountId,
        update_data: {
          swiping: spectreConfig
        }
      }]
    };
    
    try {
      const response = await this.client.post('/api/edit-tinder-cards', payload);
      const taskId = response.data.task_id;
      
      if (taskId) {
        console.log(`✅ Spectre configuration task submitted. Task ID: ${taskId}`);
        const result = await this.pollEditTask(taskId);
        return { 
          success: true, 
          taskId, 
          result, 
          spectreConfig,
          maxLikes 
        };
      }
      
      throw new Error('No task ID received');
    } catch (error) {
      console.error('❌ Error configuring Spectre mode:', error.message);
      throw error;
    }
  }

  /**
   * Start swipe task (uses saved swiping configuration)
   * @param {Array<string>} accountIds - Array of account IDs (card_ids)
   * @param {string} taskName - Optional task name
   * @returns {Promise<Object>} Task result
   */
  async startSwipeTask(accountIds, taskName = null) {
    console.log(`💕 Starting swipe task for ${accountIds.length} accounts`);
    
    const payload = { account_ids: accountIds };
    if (taskName) payload.task_name = taskName;
    
    try {
      // 🎯 USANDO ENDPOINT CORRECTO DE TU CÓDIGO PYTHON
      const response = await this.client.post('/api/tasks/swipe/start', payload);
      const taskId = response.data.task_id;
      
      if (taskId) {
        console.log(`✅ Swipe task started. Task ID: ${taskId}`);
        return { success: true, taskId };
      }
      
      throw new Error('No task ID received');
    } catch (error) {
      console.error('❌ Error starting swipe task:', error.message);
      throw error;
    }
  }

  /**
   * Check swipe task status - SEGÚN TU CÓDIGO PYTHON
   * @param {string} taskId - Task ID
   * @returns {Promise<Object>} Task status
   */
  async checkSwipeTaskStatus(taskId) {
    try {
      // 🎯 ENDPOINT CORRECTO DE TU CÓDIGO PYTHON
      const response = await this.client.get(`/api/tasks/swipe/status/${taskId}`);
      return response.data;
    } catch (error) {
      console.error('Error checking swipe task status:', error.message);
      throw error;
    }
  }

  /**
   * Stop swipe task - SEGÚN TU CÓDIGO PYTHON
   * @param {string} taskId - Task ID to stop
   * @returns {Promise<Object>} Stop result
   */
  async stopSwipeTask(taskId) {
    try {
      // 🎯 ENDPOINT CORRECTO DE TU CÓDIGO PYTHON
      const response = await this.client.post(`/api/tasks/swipe/stop/${taskId}`);
      return response.data;
    } catch (error) {
      console.error('Error stopping swipe task:', error.message);
      throw error;
    }
  }

  /**
   * Get all active swipe tasks - NUEVO ENDPOINT DESCUBIERTO
   * @returns {Promise<Object>} Active tasks list
   */
  async getActiveSwipeTasks() {
    try {
      // 🎯 NUEVO ENDPOINT QUE DESCUBRISTE
      const response = await this.client.get('/api/tasks/swipe/active');
      return response.data;
    } catch (error) {
      console.error('Error getting active swipe tasks:', error.message);
      throw error;
    }
  }

  /**
   * Stop all swipe tasks - SEGÚN TU CÓDIGO PYTHON
   * @returns {Promise<Object>} Stop result
   */
  async stopAllSwipeTasks() {
    try {
      // 🎯 ENDPOINT CORRECTO DE TU CÓDIGO PYTHON
      const response = await this.client.post('/api/tasks/swipe/stop-all');
      return response.data;
    } catch (error) {
      console.error('Error stopping all swipe tasks:', error.message);
      throw error;
    }
  }

  /**
   * Poll edit task status usando TU ENDPOINT EXACTO
   * @param {string} taskId - Task ID
   * @param {number} maxAttempts - Maximum polling attempts
   * @param {number} interval - Polling interval in ms
   * @returns {Promise<Object>} Final task status
   */
  async pollEditTask(taskId, maxAttempts = 24, interval = 5000) {
    console.log(`⏳ Polling edit task status: ${taskId}`);
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        // USANDO TU ENDPOINT EXACTO 🎯
        const response = await this.client.get(`/api/get-edit-tinder-cards-status/${taskId}`);
        const status = response.data.status;
        
        console.log(`   Attempt ${attempt}/${maxAttempts} - Status: ${status} - Progress: ${response.data.progress || 'N/A'}`);
        
        if (status === 'COMPLETED') {
          console.log('   ✅ Task completed successfully');
          console.log(`   📊 Results: Successful: ${response.data.successful}, Failed: ${response.data.failed}`);
          return response.data;
        }
        
        if (status === 'FAILED' || status === 'ERROR') {
          console.error('   ❌ Task failed:', response.data.error);
          throw new Error(`Task failed: ${response.data.error || 'Unknown error'}`);
        }
        
        // Wait before next attempt
        if (attempt < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, interval));
        }
      } catch (error) {
        if (attempt === maxAttempts) throw error;
      }
    }
    
    throw new Error('Task polling timeout');
  }

  /**
   * Poll swipe task status until completion - SEGÚN TU LÓGICA PYTHON
   * @param {string} taskId - Task ID
   * @param {number} maxAttempts - Maximum polling attempts (default: 36)
   * @param {number} interval - Polling interval in ms (default: 10000 = 10s)
   * @returns {Promise<Object>} Final task status
   */
  async pollSwipeTaskStatus(taskId, maxAttempts = 36, interval = 10000) {
    console.log(`⏳ Polling swipe task status: ${taskId}`);
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const status = await this.checkSwipeTaskStatus(taskId);
        const celeryStatus = status.celery_status;
        
        console.log(`   Attempt ${attempt}/${maxAttempts} - Celery Status: ${celeryStatus}`);
        
        // SEGÚN TU LÓGICA PYTHON
        if (celeryStatus === 'SUCCESS') {
          console.log('   ✅ Swipe task COMPLETED successfully!');
          console.log(`   📊 Result:`, JSON.stringify(status.result, null, 2));
          return status;
        }
        
        if (celeryStatus === 'FAILURE') {
          console.error('   ❌ Swipe task resulted in FAILURE.');
          console.error('   Error details:', JSON.stringify(status.error, null, 2));
          throw new Error(`Swipe task failed: ${JSON.stringify(status.error)}`);
        }
        
        if (celeryStatus === 'REVOKED') {
          console.log('   🛑 Swipe task was REVOKED (stopped).');
          console.log('   Details:', JSON.stringify(status.error, null, 2));
          return status;
        }
        
        if (['PENDING', 'STARTED', 'PROGRESS', 'RETRY'].includes(celeryStatus)) {
          console.log(`   ⏳ Swipe task is currently: ${celeryStatus}`);
          if (status.progress) {
            console.log('   📈 Progress:', JSON.stringify(status.progress, null, 2));
          }
          
          // Wait before next attempt
          if (attempt < maxAttempts) {
            console.log(`   ⏰ Waiting ${interval/1000}s before next check...`);
            await new Promise(resolve => setTimeout(resolve, interval));
          }
        } else {
          console.log(`   ❓ Unknown status: ${celeryStatus}. Stopping polling.`);
          return status;
        }
      } catch (error) {
        console.error(`   ❌ Error on attempt ${attempt}:`, error.message);
        if (attempt === maxAttempts) throw error;
      }
    }
    
    console.log('⚠️  Maximum polling attempts reached. Task might still be running.');
    throw new Error('Swipe task polling timeout');
  }

  // BACKWARDS COMPATIBILITY - mantener método original pero usando el nuevo
  async enableSpectreMode(accountId, spectreConfig = {}) {
    const maxLikes = spectreConfig.max_likes || 50;
    return await this.configureSpectreMode(accountId, maxLikes, spectreConfig);
  }

  /**
   * Get account information including status
   * @param {Array<string>} accountIds - Array of account IDs (card_ids)
   * @returns {Promise<Object>} Account information including status
   */
  async getAccountsInfo(accountIds) {
    console.log(`🔍 Getting account info for ${accountIds.length} accounts`);
    
    try {
      const response = await this.client.post('/api/get-tinder-accounts-by-ids', accountIds);
      
      if (!response.data.success) {
        throw new Error('Failed to get account info');
      }
      
      console.log(`✅ Retrieved info for ${response.data.total} accounts`);
      return response.data;
    } catch (error) {
      console.error('❌ Error getting account info:', error.message);
      throw error;
    }
  }

  /**
   * Check if account is alive (not banned)
   * @param {string} accountId - Account ID (card_id)
   * @returns {Promise<boolean>} True if account is alive
   */
  async isAccountAlive(accountId) {
    try {
      const accountInfo = await this.getAccountsInfo([accountId]);
      
      if (accountInfo.accounts && accountInfo.accounts.length > 0) {
        const account = accountInfo.accounts[0];
        const status = account.status;
        console.log(`📊 Account ${accountId} status: ${status}`);
        return status === 'alive';
      }
      
      console.warn(`⚠️ No account info found for ${accountId}`);
      return false;
    } catch (error) {
      console.error(`❌ Error checking account status for ${accountId}:`, error.message);
      return false;
    }
  }
}

module.exports = new FlamebotActionsService();