// src/services/promptOrchestratorService.js
const aiService = require('./aiService');
const usernameService = require('./usernameService');
const promptValidationService = require('./promptValidationService');
const databaseService = require('./databaseService');

/**
 * Service responsible for orchestrating the prompt generation workflow
 * Follows Single Responsibility Principle - only handles coordination between services
 */
class PromptOrchestratorService {
    constructor() {
        this.activeRequests = new Map(); // Track active requests to prevent duplicates
    }

    /**
     * Generate a single prompt with full orchestration
     * @param {Object} requestData - Request data
     * @returns {Promise<Object>} Generated prompt data
     */
    async generatePrompt(requestData) {
        const requestId = this.generateRequestId(requestData);
        
        // Check if request is already in progress
        if (this.activeRequests.has(requestId)) {
            throw new Error('Duplicate request in progress');
        }

        this.activeRequests.set(requestId, true);

        try {
            // Step 1: Validate request
            const validation = await promptValidationService.validatePromptRequest(requestData);
            if (!validation.isValid) {
                throw Object.assign(new Error(validation.error), { 
                    statusCode: validation.statusCode 
                });
            }

            const { model, channel } = validation.data;

            // Step 2: Get next username
            const usernameData = await this.getNextUsernameWithRetry(model, channel);

            // Step 3: Generate prompt with AI
            const promptData = await this.generatePromptWithRetry(
                model, 
                channel, 
                usernameData.username
            );

            // Step 4: Combine results
            const result = {
                ...promptData,
                usernameInfo: usernameData,
                requestId: requestId,
                generatedAt: new Date().toISOString()
            };

            // Step 5: Log success metrics (optional)
            this.logMetrics('prompt_generated', { model, channel });

            return result;
        } finally {
            this.activeRequests.delete(requestId);
        }
    }

    /**
     * Generate multiple prompts in batch
     * @param {Object} batchRequest - Batch request data
     * @returns {Promise<Object>} Batch generation results
     */
    async generateBatchPrompts(batchRequest) {
        const { model, channel, count = 5 } = batchRequest;

        // Validate batch request
        if (count < 1 || count > 50) {
            throw Object.assign(new Error('Count must be between 1 and 50'), {
                statusCode: 400
            });
        }

        // Generate requests array
        const requests = Array(count).fill({ model, channel });

        // Validate all requests
        const batchValidation = await promptValidationService.validateBatchPromptRequests(requests);
        if (!batchValidation.isValid) {
            return {
                success: false,
                errors: batchValidation.errors,
                generated: 0,
                failed: batchValidation.errors.length
            };
        }

        // Process prompts with controlled concurrency
        const results = await this.processPromptsWithConcurrency(
            batchValidation.validatedRequests,
            3 // Max 3 concurrent generations
        );

        return {
            success: true,
            prompts: results.successful,
            errors: results.errors,
            generated: results.successful.length,
            failed: results.errors.length,
            total: count
        };
    }

    /**
     * Generate and update prompt for a specific account
     * @param {Object} updateRequest - Update request data
     * @returns {Promise<Object>} Update result
     */
    async generateAndUpdatePrompt(updateRequest) {
        const { accountId, model, channel, updateService } = updateRequest;

        // Generate prompt
        const promptData = await this.generatePrompt({ model, channel });

        // Update using the provided service (dependency injection)
        if (updateService) {
            const updateResult = await updateService.updatePrompt(
                accountId,
                promptData.obfuscatedText || promptData.visibleText
            );

            return {
                ...promptData,
                updateResult,
                accountId
            };
        }

        return promptData;
    }

    /**
     * Get next username with retry logic
     * @private
     */
    async getNextUsernameWithRetry(model, channel, maxRetries = 3) {
        let lastError;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await usernameService.getNextUsername(model, channel);
            } catch (error) {
                lastError = error;
                console.warn(`Username fetch attempt ${attempt} failed:`, error.message);
                
                if (attempt < maxRetries) {
                    // Exponential backoff
                    await this.delay(Math.pow(2, attempt) * 100);
                }
            }
        }

        throw Object.assign(new Error(`Failed to get username after ${maxRetries} attempts: ${lastError.message}`), {
            statusCode: 500,
            originalError: lastError
        });
    }

    /**
     * Generate prompt with retry logic
     * @private
     */
    async generatePromptWithRetry(model, channel, username, maxRetries = 2) {
        let lastError;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await aiService.generatePrompt(model, channel, username);
            } catch (error) {
                lastError = error;
                console.warn(`Prompt generation attempt ${attempt} failed:`, error.message);
                
                // Don't retry on rate limits
                if (error.message && error.message.includes('rate limit')) {
                    throw error;
                }
                
                if (attempt < maxRetries) {
                    await this.delay(Math.pow(2, attempt) * 500);
                }
            }
        }

        throw Object.assign(new Error(`Failed to generate prompt after ${maxRetries} attempts: ${lastError.message}`), {
            statusCode: 500,
            originalError: lastError
        });
    }

    /**
     * Process prompts with controlled concurrency
     * @private
     */
    async processPromptsWithConcurrency(requests, concurrencyLimit) {
        const successful = [];
        const errors = [];
        const executing = [];

        for (let i = 0; i < requests.length; i++) {
            const request = requests[i];
            
            const promise = this.generatePrompt({
                model: request.model,
                channel: request.channel
            }).then(result => {
                successful.push({ ...result, index: request.index });
            }).catch(error => {
                errors.push({
                    index: request.index,
                    error: error.message,
                    statusCode: error.statusCode
                });
            });

            executing.push(promise);

            if (executing.length >= concurrencyLimit) {
                await Promise.race(executing);
                executing.splice(executing.findIndex(p => p === promise), 1);
            }

            // Add small delay between requests
            if (i < requests.length - 1) {
                await this.delay(200);
            }
        }

        // Wait for remaining promises
        await Promise.all(executing);

        return { successful, errors };
    }

    /**
     * Generate unique request ID
     * @private
     */
    generateRequestId(requestData) {
        return `${requestData.model}-${requestData.channel}-${Date.now()}`;
    }

    /**
     * Delay helper
     * @private
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Log metrics (placeholder for future implementation)
     * @private
     */
    logMetrics(event, data) {
        // TODO: Implement actual metrics logging
        console.log(`📊 Metric: ${event}`, data);
    }

    /**
     * Health check for the orchestrator
     */
    async healthCheck() {
        const checks = {
            activeRequests: this.activeRequests.size,
            servicesAvailable: {
                validation: true,
                username: true,
                ai: true
            },
            timestamp: new Date().toISOString()
        };

        // Test service availability
        try {
            await promptValidationService.refreshCacheIfNeeded();
        } catch (error) {
            checks.servicesAvailable.validation = false;
        }

        return checks;
    }
}

module.exports = new PromptOrchestratorService();