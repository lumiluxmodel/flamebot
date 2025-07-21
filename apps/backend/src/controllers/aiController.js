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
                res.status(408).json({
                    success: false,
                    error: 'Request timeout - prompt generation took too long'
                });
            }
        }, 30000); // 30 second timeout

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

            // Get valid models and channels from database (keep original case)
            const dbModels = await databaseService.getAllModels();
            const dbChannels = await databaseService.getAllChannels();
            
            // Create case-insensitive lookup maps
            const modelLookup = new Map();
            const channelLookup = new Map();
            
            dbModels.forEach(m => {
                modelLookup.set(m.name.toLowerCase(), m.name); // map lowercase to original
            });
            
            dbChannels.forEach(c => {
                channelLookup.set(c.name.toLowerCase(), c.name); // map lowercase to original  
            });

            // Find exact model and channel names from database
            const exactModelName = modelLookup.get(model.toLowerCase());
            const exactChannelName = channelLookup.get(channel.toLowerCase());

            if (!exactModelName) {
                clearTimeout(timeout);
                return res.status(400).json({
                    success: false,
                    error: `Invalid model. Valid models: ${Array.from(modelLookup.values()).join(', ')}`
                });
            }

            if (!exactChannelName) {
                clearTimeout(timeout);
                return res.status(400).json({
                    success: false,
                    error: `Invalid channel. Valid channels: ${Array.from(channelLookup.values()).join(', ')}`
                });
            }

            // 🎯 Check if this is a special model that uses predefined content
            const specialModels = ['andria', 'elliana', 'lexi', 'mia'];
            const normalizedModel = exactModelName.toLowerCase();
            
            let promptData;
            let usernameData = null;
            
            if (specialModels.includes(normalizedModel)) {
                console.log(`🎯 Special model detected: ${exactModelName} - using predefined content from prompt.json`);
                
                try {
                    const promptJsonData = require('../config/prompt.json');
                    const jsonKey = exactModelName.charAt(0).toUpperCase() + exactModelName.slice(1).toLowerCase();
                    const predefinedText = promptJsonData[jsonKey];
                    
                    if (!predefinedText) {
                        console.error(`❌ No predefined content found for key "${jsonKey}" in prompt.json`);
                        console.log(`Available keys:`, Object.keys(promptJsonData));
                        throw new Error(`No predefined content found for model ${exactModelName}`);
                    }
                    
                    console.log(`✅ Using predefined content for ${jsonKey}: "${predefinedText.substring(0, 50)}..."`);
                    
                    // For special models, create mock prompt data
                    promptData = {
                        visibleText: predefinedText,
                        obfuscatedText: predefinedText, // Same content for both
                        model: exactModelName,
                        channel: exactChannelName
                    };
                    
                    // Create mock username data for special models
                    usernameData = {
                        username: `${exactModelName}User`,
                        index: 1,
                        total: 1
                    };
                    
                    console.log('✅ Special model prompt prepared successfully');
                    
                } catch (error) {
                    console.error('❌ Error loading predefined content:', error.message);
                    clearTimeout(timeout);
                    return res.status(500).json({
                        success: false,
                        error: `Failed to load predefined content: ${error.message}`
                    });
                }
                
            } else {
                console.log(`🤖 Normal model detected: ${exactModelName} - using AI generation`);
                
                // Check if OpenAI API key is configured
                if (!config.openai.apiKey) {
                    clearTimeout(timeout);
                    return res.status(500).json({
                        success: false,
                        error: 'OpenAI API key not configured. Please set OPENAI_API_KEY in .env file'
                    });
                }

                // Get next username with timeout using EXACT names from database
                console.log('📂 Getting next username...');
                try {
                    usernameData = await usernameService.getNextUsername(exactModelName, exactChannelName);
                    console.log('✅ Username obtained:', usernameData.username);
                } catch (error) {
                    console.error('❌ Error getting username:', error.message);
                    clearTimeout(timeout);
                    return res.status(500).json({
                        success: false,
                        error: `Failed to get username: ${error.message}`
                    });
                }
                
                // Generate prompt with AI with timeout using EXACT names
                console.log('🤖 Generating prompt with AI...');
                try {
                    promptData = await aiService.generatePrompt(
                        exactModelName,
                        exactChannelName,
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
