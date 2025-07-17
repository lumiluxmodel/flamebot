const aiService = require('../services/aiService');
const usernameService = require('../services/usernameService');
const flamebotService = require('../services/flamebotService');
const databaseService = require('../services/databaseService');
const config = require('../config');

class AIController {
    /**
     * Generate a single prompt
     */
    async generatePrompt(req, res) {
        // Set timeout for this request
        const timeout = setTimeout(() => {
            if (!res.headersSent) {
                console.error('⏱️ Request timeout after 25 seconds');
                res.status(504).json({
                    success: false,
                    error: 'Request timeout - generation took too long'
                });
            }
        }, 25000);

        try {
            console.log('\n🎯 Generate Prompt Request:', req.body);
            
            const { model, channel } = req.body;

            // Validation
            if (!model || !channel) {
                clearTimeout(timeout);
                return res.status(400).json({
                    success: false,
                    error: 'Missing required fields: model and channel are required'
                });
            }

            // Get valid models and channels from database
            const dbModels = await databaseService.getAllModels();
            const dbChannels = await databaseService.getAllChannels();
            
            const validModels = dbModels.map(m => m.name.toLowerCase());
            const validChannels = dbChannels.map(c => c.name.toLowerCase());

            if (!validModels.includes(model.toLowerCase())) {
                clearTimeout(timeout);
                return res.status(400).json({
                    success: false,
                    error: `Invalid model. Valid models: ${validModels.join(', ')}`
                });
            }

            if (!validChannels.includes(channel.toLowerCase())) {
                clearTimeout(timeout);
                return res.status(400).json({
                    success: false,
                    error: `Invalid channel. Valid channels: ${validChannels.join(', ')}`
                });
            }

            // Check if OpenAI API key is configured
            if (!config.openai.apiKey) {
                clearTimeout(timeout);
                return res.status(500).json({
                    success: false,
                    error: 'OpenAI API key not configured. Please set OPENAI_API_KEY in .env file'
                });
            }

            // Get next username with timeout
            console.log('📂 Getting next username...');
            let usernameData;
            try {
                usernameData = await usernameService.getNextUsername(model, channel);
                console.log('✅ Username obtained:', usernameData.username);
            } catch (error) {
                console.error('❌ Error getting username:', error.message);
                clearTimeout(timeout);
                return res.status(500).json({
                    success: false,
                    error: `Failed to get username: ${error.message}`
                });
            }
            
            // Generate prompt with AI with timeout
            console.log('🤖 Generating prompt with AI...');
            let promptData;
            try {
                promptData = await aiService.generatePrompt(
                    model,
                    channel,
                    usernameData.username
                );
                console.log('✅ Prompt generated successfully');
            } catch (error) {
                console.error('❌ Error generating prompt:', error.message);
                clearTimeout(timeout);
                return res.status(500).json({
                    success: false,
                    error: `Failed to generate prompt: ${error.message}`
                });
            }

            // Clear timeout on success
            clearTimeout(timeout);

            res.json({
                success: true,
                data: {
                    ...promptData,
                    usernameInfo: usernameData
                }
            });
        } catch (error) {
            clearTimeout(timeout);
            console.error('❌ Unexpected error in generatePrompt:', error);
            if (!res.headersSent) {
                res.status(500).json({
                    success: false,
                    error: error.message || 'Failed to generate prompt'
                });
            }
        }
    }

    /**
     * Generate multiple prompts
     */
    async generateMultiplePrompts(req, res) {
        try {
            const { model, channel, count = 5 } = req.body;

            // Validation
            if (!model || !channel) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing required fields: model and channel are required'
                });
            }

            if (count < 1 || count > 50) {
                return res.status(400).json({
                    success: false,
                    error: 'Count must be between 1 and 50'
                });
            }

            const prompts = [];
            const errors = [];

            for (let i = 0; i < count; i++) {
                try {
                    const usernameData = await usernameService.getNextUsername(model, channel);
                    const promptData = await aiService.generatePrompt(
                        model,
                        channel,
                        usernameData.username
                    );
                    
                    prompts.push({
                        ...promptData,
                        usernameInfo: usernameData
                    });

                    // Add delay to avoid rate limiting
                    if (i < count - 1) {
                        await new Promise(resolve => setTimeout(resolve, 500));
                    }
                } catch (error) {
                    errors.push({
                        index: i,
                        error: error.message
                    });
                }
            }

            res.json({
                success: true,
                data: {
                    prompts,
                    errors,
                    generated: prompts.length,
                    failed: errors.length,
                    total: count
                }
            });
        } catch (error) {
            console.error('Generate multiple prompts error:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to generate prompts'
            });
        }
    }

    /**
     * Generate Tinder bios
     */
    async generateBios(req, res) {
        try {
            const { count = 5 } = req.body;

            if (count < 1 || count > 20) {
                return res.status(400).json({
                    success: false,
                    error: 'Count must be between 1 and 20'
                });
            }

            const bios = await aiService.generateBios(count);

            res.json({
                success: true,
                data: {
                    bios,
                    count: bios.length
                }
            });
        } catch (error) {
            console.error('Generate bios error:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to generate bios'
            });
        }
    }

    /**
     * Upload usernames for a model
     */
    async uploadUsernames(req, res) {
        try {
            const { model, channel, usernames, replace = false } = req.body;

            // Validation
            if (!model || !channel || !usernames) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing required fields: model, channel, and usernames are required'
                });
            }

            if (!Array.isArray(usernames) || usernames.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Usernames must be a non-empty array'
                });
            }

            // Add usernames
            const result = await usernameService.addUsernames(
                model,
                channel,
                usernames,
                replace
            );

            res.json({
                success: true,
                message: `Successfully ${replace ? 'replaced' : 'added'} usernames`,
                data: result
            });
        } catch (error) {
            console.error('Upload usernames error:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to upload usernames'
            });
        }
    }

    /**
     * Get usernames for a model
     */
    async getUsernames(req, res) {
        try {
            const { model, channel } = req.params;

            const usernames = await usernameService.getAllUsernames(model, channel);

            res.json({
                success: true,
                data: {
                    model,
                    channel,
                    usernames,
                    count: usernames.length
                }
            });
        } catch (error) {
            console.error('Get usernames error:', error);
            res.status(404).json({
                success: false,
                error: error.message || 'Usernames not found'
            });
        }
    }

    /**
     * Get username statistics
     */
    async getUsernameStats(req, res) {
        try {
            const stats = await usernameService.getStatistics();

            res.json({
                success: true,
                data: stats
            });
        } catch (error) {
            console.error('Get username stats error:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to get statistics'
            });
        }
    }

    /**
     * Health check for AI service
     */
    async healthCheck(req, res) {
        try {
            const status = {
                service: 'AI Service',
                openaiConfigured: !!config.openai.apiKey,
                timestamp: new Date().toISOString()
            };

            // Test OpenAI connection if key is configured
            if (config.openai.apiKey) {
                try {
                    const testPrompt = await aiService.generateText(
                        "You are a test assistant.",
                        "Say 'OK' in one word.",
                        10
                    );
                    status.openaiConnection = 'OK';
                    status.testResponse = testPrompt;
                } catch (error) {
                    status.openaiConnection = 'ERROR';
                    status.openaiError = error.message;
                }
            }

            const isHealthy = status.openaiConfigured && status.openaiConnection === 'OK';
            
            res.status(isHealthy ? 200 : 503).json({
                success: isHealthy,
                data: status
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Generate and upload prompt to Flamebot
     */
    async generateAndUploadPrompt(req, res) {
        try {
            const { model, channel, accountId } = req.body;

            // Validation
            if (!model || !channel || !accountId) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing required fields: model, channel, and accountId are required'
                });
            }

            // Get next username
            const usernameData = await usernameService.getNextUsername(model, channel);
            
            // Generate prompt with AI
            const promptData = await aiService.generatePrompt(
                model,
                channel,
                usernameData.username
            );

            // TODO: Upload to Flamebot using the update bio endpoint
            // This will be implemented once we have the Flamebot bio update endpoint details
            
            res.json({
                success: true,
                message: 'Prompt generated successfully',
                data: {
                    ...promptData,
                    usernameInfo: usernameData,
                    accountId,
                    uploadStatus: 'pending' // Will be 'completed' once Flamebot integration is done
                }
            });
        } catch (error) {
            console.error('Generate and upload prompt error:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to generate and upload prompt'
            });
        }
    }
}

module.exports = new AIController();
