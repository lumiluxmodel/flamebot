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
      // Usando el endpoint correcto para start swipe
      const response = await this.client.post('/api/start-swipe', payload);
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
   * Configure Spectre and then start swipe (COMPLETE FLOW)
   * @param {string} accountId - Account ID
   * @param {number} maxLikes - Max likes for this swipe session
   * @param {string} taskName - Optional task name
   * @returns {Promise<Object>} Complete result
   */
  async spectreSwipeFlow(accountId, maxLikes = 50, taskName = null) {
    console.log(`🎯 Starting complete Spectre + Swipe flow for account ${accountId}`);
    
    try {
      // Step 1: Configure Spectre mode
      console.log(`📝 Step 1: Configuring Spectre mode (${maxLikes} likes)...`);
      const configResult = await this.configureSpectreMode(accountId, maxLikes);
      
      // Wait a bit between config and swipe
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Step 2: Start swipe with configured settings
      console.log(`💕 Step 2: Starting swipe task...`);
      const swipeResult = await this.startSwipeTask([accountId], taskName);
      
      return {
        success: true,
        configTaskId: configResult.taskId,
        swipeTaskId: swipeResult.taskId,
        maxLikes,
        accountId,
        message: `Spectre configured with ${maxLikes} likes and swipe started`
      };
    } catch (error) {
      console.error('❌ Error in Spectre + Swipe flow:', error.message);
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
   * Check swipe task status
   * @param {string} taskId - Task ID
   * @returns {Promise<Object>} Task status
   */
  async checkSwipeTaskStatus(taskId) {
    try {
      // Ajustar según el endpoint real de Flamebot para swipe status
      const response = await this.client.get(`/api/get-swipe-status/${taskId}`);
      return response.data;
    } catch (error) {
      console.error('Error checking swipe task status:', error.message);
      throw error;
    }
  }

  /**
   * Stop swipe task
   * @param {string} taskId - Task ID to stop
   * @returns {Promise<Object>} Stop result
   */
  async stopSwipeTask(taskId) {
    try {
      const response = await this.client.post(`/api/stop-swipe/${taskId}`);
      return response.data;
    } catch (error) {
      console.error('Error stopping swipe task:', error.message);
      throw error;
    }
  }

  // BACKWARDS COMPATIBILITY - mantener método original pero usando el nuevo
  async enableSpectreMode(accountId, spectreConfig = {}) {
    const maxLikes = spectreConfig.max_likes || 50;
    return await this.configureSpectreMode(accountId, maxLikes, spectreConfig);
  }
}

module.exports = new FlamebotActionsService();