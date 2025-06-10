const aiService = require('../services/aiService');
const usernameService = require('../services/usernameService');
const flamebotService = require('../services/flamebotService');
const config = require('../config');

class AIController {
    /**
     * Generate a single prompt
     */
    async generatePrompt(req, res) {
        try {
            const { model, channel } = req.body;

            // Validation
            if (!model || !channel) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing required fields: model and channel are required'
                });
            }

            const validModels = ['aura', 'lola', 'iris'];
            const validChannels = ['snap', 'gram'];

            if (!validModels.includes(model.toLowerCase())) {
                return res.status(400).json({
                    success: false,
                    error: `Invalid model. Valid models: ${validModels.join(', ')}`
                });
            }

            if (!validChannels.includes(channel.toLowerCase())) {
                return res.status(400).json({
                    success: false,
                    error: `Invalid channel. Valid channels: ${validChannels.join(', ')}`
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

            res.json({
                success: true,
                data: {
                    ...promptData,
                    usernameInfo: usernameData
                }
            });
        } catch (error) {
            console.error('Generate prompt error:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to generate prompt'
            });
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