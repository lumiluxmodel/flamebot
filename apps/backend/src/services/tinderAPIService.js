// src/services/tinderAPIService.js
const axios = require('axios');
const config = require('../config');

/**
 * Service responsible for all Tinder/Flamebot API interactions
 * Follows Single Responsibility Principle - only handles API communication
 */
class TinderAPIService {
    constructor() {
        this.client = axios.create({
            baseURL: config.flamebot.baseUrl,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.flamebot.apiKey}`
            },
            timeout: 30000
        });

        // Add request/response interceptors for logging
        this.setupInterceptors();
    }

    /**
     * Setup axios interceptors for logging and error handling
     * @private
     */
    setupInterceptors() {
        // Request interceptor
        this.client.interceptors.request.use(
            (config) => {
                console.log(`🔄 API Request: ${config.method.toUpperCase()} ${config.url}`);
                return config;
            },
            (error) => {
                console.error('❌ API Request Error:', error.message);
                return Promise.reject(error);
            }
        );

        // Response interceptor
        this.client.interceptors.response.use(
            (response) => {
                console.log(`✅ API Response: ${response.status} ${response.config.url}`);
                return response;
            },
            (error) => {
                const errorMessage = error.response?.data?.error || error.message;
                console.error(`❌ API Response Error: ${error.response?.status || 'N/A'} - ${errorMessage}`);
                return Promise.reject(this.enhanceError(error));
            }
        );
    }

    /**
     * Enhance error with additional context
     * @private
     */
    enhanceError(error) {
        const enhanced = new Error(error.response?.data?.error || error.message);
        enhanced.statusCode = error.response?.status;
        enhanced.originalError = error;
        enhanced.response = error.response;
        return enhanced;
    }

    /**
     * Update account bio
     * @param {string} accountId - Flamebot account ID (card_id)
     * @param {string} bio - Bio text
     * @returns {Promise<Object>} Task submission result
     */
    async updateBio(accountId, bio) {
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
        
        const response = await this.client.post('/api/edit-tinder-cards', payload);
        return {
            taskId: response.data.task_id,
            status: 'submitted',
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Update account prompt/question
     * @param {string} accountId - Flamebot account ID (card_id)
     * @param {string} promptText - Prompt text
     * @param {string} questionId - Question ID (default: pro_1)
     * @returns {Promise<Object>} Task submission result
     */
    async updatePrompt(accountId, promptText, questionId = 'pro_1') {
        const payload = {
            edits: [{
                card_id: accountId,
                update_data: {
                    questions: [{
                        id: questionId,
                        question: "My weird but true story is…",
                        answer: promptText
                    }]
                }
            }]
        };
        
        const response = await this.client.post('/api/edit-tinder-cards', payload);
        return {
            taskId: response.data.task_id,
            status: 'submitted',
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Update swiping configuration
     * @param {string} accountId - Flamebot account ID (card_id)
     * @param {Object} swipingConfig - Swiping configuration
     * @returns {Promise<Object>} Task submission result
     */
    async updateSwipingConfig(accountId, swipingConfig) {
        const payload = {
            edits: [{
                card_id: accountId,
                update_data: {
                    swiping: swipingConfig
                }
            }]
        };
        
        const response = await this.client.post('/api/edit-tinder-cards', payload);
        return {
            taskId: response.data.task_id,
            status: 'submitted',
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Start swipe task
     * @param {Array<string>} accountIds - Array of account IDs
     * @param {string} taskName - Optional task name
     * @returns {Promise<Object>} Task start result
     */
    async startSwipeTask(accountIds, taskName = null) {
        const payload = { account_ids: accountIds };
        if (taskName) payload.task_name = taskName;
        
        const response = await this.client.post('/api/tasks/swipe/start', payload);
        return {
            taskId: response.data.task_id,
            status: 'started',
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Stop swipe task
     * @param {string} taskId - Task ID to stop
     * @returns {Promise<Object>} Stop result
     */
    async stopSwipeTask(taskId) {
        const response = await this.client.post(`/api/tasks/swipe/stop/${taskId}`);
        return response.data;
    }

    /**
     * Stop all swipe tasks
     * @returns {Promise<Object>} Stop result
     */
    async stopAllSwipeTasks() {
        const response = await this.client.post('/api/tasks/swipe/stop-all');
        return response.data;
    }

    /**
     * Get swipe task status
     * @param {string} taskId - Task ID
     * @returns {Promise<Object>} Task status
     */
    async getSwipeTaskStatus(taskId) {
        const response = await this.client.get(`/api/tasks/swipe/status/${taskId}`);
        return response.data;
    }

    /**
     * Get active swipe tasks
     * @returns {Promise<Object>} Active tasks list
     */
    async getActiveSwipeTasks() {
        const response = await this.client.get('/api/tasks/swipe/active');
        return response.data;
    }

    /**
     * Get edit task status
     * @param {string} taskId - Task ID
     * @returns {Promise<Object>} Task status
     */
    async getEditTaskStatus(taskId) {
        const response = await this.client.get(`/api/get-edit-tinder-cards-status/${taskId}`);
        return response.data;
    }

    /**
     * Batch update multiple accounts
     * @param {Array<Object>} edits - Array of edit objects
     * @returns {Promise<Object>} Task submission result
     */
    async batchUpdateAccounts(edits) {
        const payload = { edits };
        const response = await this.client.post('/api/edit-tinder-cards', payload);
        return {
            taskId: response.data.task_id,
            status: 'submitted',
            editCount: edits.length,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Health check for the API service
     * @returns {Promise<Object>} Health status
     */
    async healthCheck() {
        try {
            // Try a lightweight endpoint if available
            const response = await this.client.get('/health', { timeout: 5000 });
            return {
                status: 'healthy',
                apiAvailable: true,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                apiAvailable: false,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }
}

module.exports = new TinderAPIService();