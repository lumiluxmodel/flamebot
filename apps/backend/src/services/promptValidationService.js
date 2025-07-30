// src/services/promptValidationService.js
const databaseService = require('./databaseService');

/**
 * Service responsible for validating prompt generation requests
 * Follows Single Responsibility Principle - only handles validation logic
 */
class PromptValidationService {
    constructor() {
        this.modelCache = new Map();
        this.channelCache = new Map();
        this.cacheExpiry = 5 * 60 * 1000; // 5 minutes cache
        this.lastCacheRefresh = 0;
    }

    /**
     * Validate prompt generation request
     * @param {Object} requestData - Request data to validate
     * @returns {Promise<Object>} Validation result with normalized data
     */
    async validatePromptRequest(requestData) {
        const { model, channel } = requestData;
        
        // Basic field validation
        const fieldValidation = this.validateRequiredFields(model, channel);
        if (!fieldValidation.isValid) {
            return fieldValidation;
        }

        // Refresh cache if needed
        await this.refreshCacheIfNeeded();

        // Validate model
        const modelValidation = await this.validateModel(model);
        if (!modelValidation.isValid) {
            return modelValidation;
        }

        // Validate channel
        const channelValidation = await this.validateChannel(channel);
        if (!channelValidation.isValid) {
            return channelValidation;
        }

        // Return validated and normalized data
        return {
            isValid: true,
            data: {
                model: modelValidation.normalizedValue,
                channel: channelValidation.normalizedValue,
                originalModel: model,
                originalChannel: channel
            }
        };
    }

    /**
     * Validate required fields
     * @param {string} model - Model name
     * @param {string} channel - Channel name
     * @returns {Object} Validation result
     */
    validateRequiredFields(model, channel) {
        if (!model || !channel) {
            return {
                isValid: false,
                error: 'Missing required fields: model and channel are required',
                statusCode: 400
            };
        }

        if (typeof model !== 'string' || typeof channel !== 'string') {
            return {
                isValid: false,
                error: 'Invalid field types: model and channel must be strings',
                statusCode: 400
            };
        }

        if (model.trim().length === 0 || channel.trim().length === 0) {
            return {
                isValid: false,
                error: 'Empty values: model and channel cannot be empty',
                statusCode: 400
            };
        }

        return { isValid: true };
    }

    /**
     * Validate model against database
     * @param {string} model - Model name to validate
     * @returns {Promise<Object>} Validation result
     */
    async validateModel(model) {
        const exactModelName = this.modelCache.get(model.toLowerCase());
        
        if (!exactModelName) {
            const validModels = Array.from(this.modelCache.values());
            return {
                isValid: false,
                error: `Invalid model. Valid models: ${validModels.join(', ')}`,
                statusCode: 400
            };
        }

        return {
            isValid: true,
            normalizedValue: exactModelName
        };
    }

    /**
     * Validate channel against database
     * @param {string} channel - Channel name to validate
     * @returns {Promise<Object>} Validation result
     */
    async validateChannel(channel) {
        const exactChannelName = this.channelCache.get(channel.toLowerCase());
        
        if (!exactChannelName) {
            const validChannels = Array.from(this.channelCache.values());
            return {
                isValid: false,
                error: `Invalid channel. Valid channels: ${validChannels.join(', ')}`,
                statusCode: 400
            };
        }

        return {
            isValid: true,
            normalizedValue: exactChannelName
        };
    }

    /**
     * Validate multiple prompt requests for batch operations
     * @param {Array} requests - Array of request objects
     * @returns {Promise<Object>} Batch validation result
     */
    async validateBatchPromptRequests(requests) {
        if (!Array.isArray(requests)) {
            return {
                isValid: false,
                error: 'Requests must be an array',
                statusCode: 400
            };
        }

        if (requests.length === 0) {
            return {
                isValid: false,
                error: 'Requests array cannot be empty',
                statusCode: 400
            };
        }

        if (requests.length > 50) {
            return {
                isValid: false,
                error: 'Maximum 50 requests allowed per batch',
                statusCode: 400
            };
        }

        const validatedRequests = [];
        const errors = [];

        for (let i = 0; i < requests.length; i++) {
            const validation = await this.validatePromptRequest(requests[i]);
            if (validation.isValid) {
                validatedRequests.push({
                    index: i,
                    ...validation.data
                });
            } else {
                errors.push({
                    index: i,
                    error: validation.error
                });
            }
        }

        return {
            isValid: errors.length === 0,
            validatedRequests,
            errors,
            summary: {
                total: requests.length,
                valid: validatedRequests.length,
                invalid: errors.length
            }
        };
    }

    /**
     * Validate username data
     * @param {Object} usernameData - Username data to validate
     * @returns {Object} Validation result
     */
    validateUsernameData(usernameData) {
        if (!usernameData) {
            return {
                isValid: false,
                error: 'Username data is required',
                statusCode: 500
            };
        }

        if (!usernameData.username || typeof usernameData.username !== 'string') {
            return {
                isValid: false,
                error: 'Invalid username data',
                statusCode: 500
            };
        }

        return { isValid: true };
    }

    /**
     * Refresh cache if needed
     * @private
     */
    async refreshCacheIfNeeded() {
        const now = Date.now();
        if (now - this.lastCacheRefresh > this.cacheExpiry) {
            await this.refreshCache();
        }
    }

    /**
     * Refresh model and channel cache from database
     * @private
     */
    async refreshCache() {
        try {
            // Get models and channels from database
            const [dbModels, dbChannels] = await Promise.all([
                databaseService.getAllModels(),
                databaseService.getAllChannels()
            ]);

            // Clear and rebuild model cache
            this.modelCache.clear();
            dbModels.forEach(m => {
                this.modelCache.set(m.name.toLowerCase(), m.name);
            });

            // Clear and rebuild channel cache
            this.channelCache.clear();
            dbChannels.forEach(c => {
                this.channelCache.set(c.name.toLowerCase(), c.name);
            });

            this.lastCacheRefresh = Date.now();
            console.log('✅ Validation cache refreshed');
        } catch (error) {
            console.error('❌ Error refreshing validation cache:', error);
            // Don't throw - use stale cache if available
            if (this.modelCache.size === 0 || this.channelCache.size === 0) {
                throw new Error('Failed to initialize validation cache');
            }
        }
    }

    /**
     * Clear cache (useful for testing)
     */
    clearCache() {
        this.modelCache.clear();
        this.channelCache.clear();
        this.lastCacheRefresh = 0;
    }
}

module.exports = new PromptValidationService();