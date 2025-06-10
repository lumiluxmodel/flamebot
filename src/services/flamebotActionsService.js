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
   * @param {string} accountId - Flamebot account ID
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
    
    const payload = {
      edits: [{
        card_id: accountId,
        update_data: {
          bio_information: {
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
        return { success: true, taskId, result };
      }
      
      throw new Error('No task ID received');
    } catch (error) {
      console.error('❌ Error updating bio:', error.message);
      throw error;
    }
  }

  /**
   * Update account prompt
   * @param {string} accountId - Flamebot account ID
   * @param {string} model - Model name for prompt generation
   * @param {string} channel - Channel (snap/gram)
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
    
    // For now, we'll use the obfuscated text as the prompt answer
    // You'll need to adjust based on how Flamebot expects prompts
    const payload = {
      edits: [{
        card_id: accountId,
        update_data: {
          prompts: [{
            id: "prompt_1", // You may need to get valid prompt IDs from Flamebot
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
   * Enable Spectre mode
   * @param {string} accountId - Flamebot account ID
   * @param {Object} spectreConfig - Spectre configuration
   * @returns {Promise<Object>} Task result
   */
  async enableSpectreMode(accountId, spectreConfig = {}) {
    console.log(`👻 Enabling Spectre mode for account ${accountId}`);
    
    const defaultConfig = {
      mode: 'spectre',
      swiping_type: 'forcematching',
      force_matching_config: {
        mode: 'like_and_dislike'
      },
      swipe_until: 'like_quantity',
      max_likes: 50
    };
    
    const swipingConfig = { ...defaultConfig, ...spectreConfig };
    
    const payload = {
      edits: [{
        card_id: accountId,
        update_data: {
          swiping: swipingConfig
        }
      }]
    };
    
    try {
      const response = await this.client.post('/api/edit-tinder-cards', payload);
      const taskId = response.data.task_id;
      
      if (taskId) {
        console.log(`✅ Spectre mode task submitted. Task ID: ${taskId}`);
        const result = await this.pollEditTask(taskId);
        return { success: true, taskId, result };
      }
      
      throw new Error('No task ID received');
    } catch (error) {
      console.error('❌ Error enabling Spectre mode:', error.message);
      throw error;
    }
  }

  /**
   * Start swipe task
   * @param {Array<string>} accountIds - Array of account IDs
   * @param {string} taskName - Optional task name
   * @returns {Promise<Object>} Task result
   */
  async startSwipeTask(accountIds, taskName = null) {
    console.log(`💕 Starting swipe task for ${accountIds.length} accounts`);
    
    const payload = { account_ids: accountIds };
    if (taskName) payload.task_name = taskName;
    
    try {
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
   * Poll edit task status
   * @param {string} taskId - Task ID
   * @param {number} maxAttempts - Maximum polling attempts
   * @param {number} interval - Polling interval in ms
   * @returns {Promise<Object>} Final task status
   */
  async pollEditTask(taskId, maxAttempts = 24, interval = 5000) {
    console.log(`⏳ Polling edit task status: ${taskId}`);
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await this.client.get(`/api/get-edit-tinder-cards-status/${taskId}`);
        const status = response.data.status;
        
        console.log(`   Attempt ${attempt}/${maxAttempts} - Status: ${status}`);
        
        if (status === 'COMPLETED') {
          console.log('   ✅ Task completed successfully');
          return response.data;
        }
        
        if (status === 'ERROR') {
          console.error('   ❌ Task failed:', response.data.error);
          throw new Error(`Task failed: ${response.data.error}`);
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
      const response = await this.client.get(`/api/tasks/swipe/status/${taskId}`);
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
      const response = await this.client.post(`/api/tasks/swipe/stop/${taskId}`);
      return response.data;
    } catch (error) {
      console.error('Error stopping swipe task:', error.message);
      throw error;
    }
  }
}

module.exports = new FlamebotActionsService();