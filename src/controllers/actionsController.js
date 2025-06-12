// src/controllers/actionsController.js
const flamebotActionsService = require('../services/flamebotActionsService');
const aiService = require('../services/aiService');
const usernameService = require('../services/usernameService');

class ActionsController {
    // ============================
    // SWIPE ACTIONS
    // ============================

    /**
     * Start swipe task for one or multiple accounts (uses saved swiping config)
     */
    async startSwipe(req, res) {
        try {
            const { accountIds, taskName } = req.body;

            if (!Array.isArray(accountIds) || accountIds.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'accountIds array is required and must not be empty'
                });
            }

            console.log(`🎯 Starting swipe for ${accountIds.length} accounts (using saved config)`);
            
            const result = await flamebotActionsService.startSwipeTask(accountIds, taskName);

            res.json({
                success: true,
                message: `Swipe task started for ${accountIds.length} accounts`,
                data: result
            });
        } catch (error) {
            console.error('Start swipe error:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to start swipe task'
            });
        }
    }

    /**
     * Start swipe and wait for completion
     */
    async startSwipeWithWait(req, res) {
        try {
            const { accountIds, taskName, waitForCompletion = true } = req.body;

            if (!Array.isArray(accountIds) || accountIds.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'accountIds array is required and must not be empty'
                });
            }

            console.log(`🎯 Starting swipe with wait for ${accountIds.length} accounts`);
            
            const result = await flamebotActionsService.startSwipeTask(accountIds, taskName);

            if (waitForCompletion && result.taskId) {
                console.log('⏳ Waiting for swipe completion...');
                const finalStatus = await this.waitForSwipeCompletion(result.taskId);
                result.finalStatus = finalStatus;
            }

            res.json({
                success: true,
                message: `Swipe task ${waitForCompletion ? 'completed' : 'started'} for ${accountIds.length} accounts`,
                data: result
            });
        } catch (error) {
            console.error('Start swipe with wait error:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to start swipe task with wait'
            });
        }
    }

    /**
     * Check swipe task status
     */
    async getSwipeStatus(req, res) {
        try {
            const { taskId } = req.params;

            if (!taskId) {
                return res.status(400).json({
                    success: false,
                    error: 'Task ID is required'
                });
            }

            const status = await flamebotActionsService.checkSwipeTaskStatus(taskId);

            res.json({
                success: true,
                data: status
            });
        } catch (error) {
            console.error('Get swipe status error:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to get swipe status'
            });
        }
    }

    /**
     * Stop swipe task
     */
    async stopSwipe(req, res) {
        try {
            const { taskId } = req.params;

            if (!taskId) {
                return res.status(400).json({
                    success: false,
                    error: 'Task ID is required'
                });
            }

            const result = await flamebotActionsService.stopSwipeTask(taskId);

            res.json({
                success: true,
                message: 'Swipe task stopped successfully',
                data: result
            });
        } catch (error) {
            console.error('Stop swipe error:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to stop swipe task'
            });
        }
    }

    // ============================
    // SPECTRE MODE ACTIONS (CONFIGURACIÓN)
    // ============================

    /**
     * Configure Spectre mode for an account (saves swiping config)
     */
    async enableSpectre(req, res) {
        try {
            const { accountId, maxLikes = 50, customConfig = {} } = req.body;

            if (!accountId) {
                return res.status(400).json({
                    success: false,
                    error: 'accountId is required'
                });
            }

            console.log(`👻 Configuring Spectre mode for account ${accountId} with ${maxLikes} max likes`);
            
            const result = await flamebotActionsService.configureSpectreMode(accountId, maxLikes, customConfig);

            res.json({
                success: true,
                message: `Spectre mode configured with ${maxLikes} max likes`,
                data: result
            });
        } catch (error) {
            console.error('Configure Spectre error:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to configure Spectre mode'
            });
        }
    }

    /**
     * Complete Spectre flow: Configure + Start Swipe
     */
    async spectreSwipeFlow(req, res) {
        try {
            const { accountId, maxLikes = 50, taskName } = req.body;

            if (!accountId) {
                return res.status(400).json({
                    success: false,
                    error: 'accountId is required'
                });
            }

            console.log(`🚀 Starting complete Spectre + Swipe flow for account ${accountId}`);
            
            const result = await flamebotActionsService.spectreSwipeFlow(accountId, maxLikes, taskName);

            res.json({
                success: true,
                message: `Spectre configured (${maxLikes} likes) and swipe started`,
                data: result
            });
        } catch (error) {
            console.error('Spectre + Swipe flow error:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to execute Spectre + Swipe flow'
            });
        }
    }

    /**
     * Configure Spectre mode for multiple accounts
     */
    async enableSpectreBulk(req, res) {
        try {
            const { accountIds, maxLikes = 50, customConfig = {} } = req.body;

            if (!Array.isArray(accountIds) || accountIds.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'accountIds array is required and must not be empty'
                });
            }

            console.log(`👻 Configuring Spectre mode for ${accountIds.length} accounts with ${maxLikes} max likes`);
            
            const results = {
                successful: 0,
                failed: 0,
                results: []
            };

            for (const accountId of accountIds) {
                try {
                    const result = await flamebotActionsService.configureSpectreMode(accountId, maxLikes, customConfig);
                    results.successful++;
                    results.results.push({
                        accountId,
                        success: true,
                        taskId: result.taskId,
                        maxLikes
                    });
                } catch (error) {
                    results.failed++;
                    results.results.push({
                        accountId,
                        success: false,
                        error: error.message
                    });
                }

                // Add delay between requests
                if (accountIds.indexOf(accountId) < accountIds.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }

            res.json({
                success: true,
                message: `Spectre mode configured for ${results.successful} of ${accountIds.length} accounts`,
                data: results
            });
        } catch (error) {
            console.error('Configure Spectre bulk error:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to configure Spectre mode in bulk'
            });
        }
    }

    /**
     * Get Spectre configuration status
     */
    async getSpectreStatus(req, res) {
        try {
            const { taskId } = req.params;

            if (!taskId) {
                return res.status(400).json({
                    success: false,
                    error: 'Task ID is required'
                });
            }

            const status = await flamebotActionsService.pollEditTask(taskId, 1, 0); // Single check

            res.json({
                success: true,
                data: status
            });
        } catch (error) {
            console.error('Get Spectre status error:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to get Spectre status'
            });
        }
    }

    // ============================
    // BIO ACTIONS
    // ============================

    /**
     * Update bio with custom text
     */
    async updateBio(req, res) {
        try {
            const { accountId, bio } = req.body;

            if (!accountId) {
                return res.status(400).json({
                    success: false,
                    error: 'accountId is required'
                });
            }

            if (!bio) {
                return res.status(400).json({
                    success: false,
                    error: 'bio text is required'
                });
            }

            console.log(`📝 Updating bio for account ${accountId}`);
            
            const result = await flamebotActionsService.updateBio(accountId, bio);

            res.json({
                success: true,
                message: 'Bio updated successfully',
                data: result
            });
        } catch (error) {
            console.error('Update bio error:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to update bio'
            });
        }
    }

    /**
     * Generate and update bio with AI
     */
    async generateAndUpdateBio(req, res) {
        try {
            const { accountId } = req.body;

            if (!accountId) {
                return res.status(400).json({
                    success: false,
                    error: 'accountId is required'
                });
            }

            console.log(`🤖 Generating and updating bio for account ${accountId}`);
            
            // Generate bio first
            const bios = await aiService.generateBios(1);
            const generatedBio = bios[0].text;

            // Update bio
            const result = await flamebotActionsService.updateBio(accountId, generatedBio);
            result.generatedBio = generatedBio;

            res.json({
                success: true,
                message: 'Bio generated and updated successfully',
                data: result
            });
        } catch (error) {
            console.error('Generate and update bio error:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to generate and update bio'
            });
        }
    }

    /**
     * Bulk bio update for multiple accounts
     */
    async updateBioBulk(req, res) {
        try {
            const { accountIds, generateNew = true, customBio = null } = req.body;

            if (!Array.isArray(accountIds) || accountIds.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'accountIds array is required and must not be empty'
                });
            }

            console.log(`📝 Bulk bio update for ${accountIds.length} accounts`);
            
            const results = {
                successful: 0,
                failed: 0,
                results: []
            };

            for (const accountId of accountIds) {
                try {
                    let bioText = customBio;
                    
                    if (generateNew && !customBio) {
                        const bios = await aiService.generateBios(1);
                        bioText = bios[0].text;
                    }

                    const result = await flamebotActionsService.updateBio(accountId, bioText);
                    results.successful++;
                    results.results.push({
                        accountId,
                        success: true,
                        taskId: result.taskId,
                        bioText: bioText
                    });
                } catch (error) {
                    results.failed++;
                    results.results.push({
                        accountId,
                        success: false,
                        error: error.message
                    });
                }

                // Add delay between requests
                if (accountIds.indexOf(accountId) < accountIds.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 1500));
                }
            }

            res.json({
                success: true,
                message: `Bio updated for ${results.successful} of ${accountIds.length} accounts`,
                data: results
            });
        } catch (error) {
            console.error('Bulk bio update error:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to update bios in bulk'
            });
        }
    }

    /**
     * Get bio update status
     */
    async getBioStatus(req, res) {
        try {
            const { taskId } = req.params;

            if (!taskId) {
                return res.status(400).json({
                    success: false,
                    error: 'Task ID is required'
                });
            }

            const status = await flamebotActionsService.pollEditTask(taskId, 1, 0); // Single check

            res.json({
                success: true,
                data: status
            });
        } catch (error) {
            console.error('Get bio status error:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to get bio status'
            });
        }
    }

    // ============================
    // PROMPT ACTIONS
    // ============================

    /**
     * Update prompt with custom text
     */
    async updatePrompt(req, res) {
        try {
            const { accountId, model, channel, promptText } = req.body;

            if (!accountId || !model || !channel) {
                return res.status(400).json({
                    success: false,
                    error: 'accountId, model, and channel are required'
                });
            }

            if (!promptText) {
                return res.status(400).json({
                    success: false,
                    error: 'promptText is required'
                });
            }

            console.log(`💬 Updating prompt for account ${accountId} (${model}/${channel})`);
            
            const result = await flamebotActionsService.updatePrompt(accountId, model, channel, promptText);

            res.json({
                success: true,
                message: 'Prompt updated successfully',
                data: result
            });
        } catch (error) {
            console.error('Update prompt error:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to update prompt'
            });
        }
    }

    /**
     * Generate and update prompt with AI
     */
    async generateAndUpdatePrompt(req, res) {
        try {
            const { accountId, model, channel } = req.body;

            if (!accountId || !model || !channel) {
                return res.status(400).json({
                    success: false,
                    error: 'accountId, model, and channel are required'
                });
            }

            console.log(`🤖 Generating and updating prompt for account ${accountId} (${model}/${channel})`);
            
            const result = await flamebotActionsService.updatePrompt(accountId, model, channel);

            res.json({
                success: true,
                message: 'Prompt generated and updated successfully',
                data: result
            });
        } catch (error) {
            console.error('Generate and update prompt error:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to generate and update prompt'
            });
        }
    }

    /**
     * Bulk prompt update for multiple accounts
     */
    async updatePromptBulk(req, res) {
        try {
            const { accounts, generateNew = true, customPrompt = null } = req.body;

            if (!Array.isArray(accounts) || accounts.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'accounts array is required and must not be empty'
                });
            }

            // Validate account structure
            for (const account of accounts) {
                if (!account.accountId || !account.model || !account.channel) {
                    return res.status(400).json({
                        success: false,
                        error: 'Each account must have accountId, model, and channel'
                    });
                }
            }

            console.log(`💬 Bulk prompt update for ${accounts.length} accounts`);
            
            const results = {
                successful: 0,
                failed: 0,
                results: []
            };

            for (const account of accounts) {
                try {
                    const promptText = generateNew ? null : customPrompt;
                    const result = await flamebotActionsService.updatePrompt(
                        account.accountId, 
                        account.model, 
                        account.channel, 
                        promptText
                    );
                    
                    results.successful++;
                    results.results.push({
                        accountId: account.accountId,
                        model: account.model,
                        channel: account.channel,
                        success: true,
                        taskId: result.taskId,
                        visibleText: result.visibleText,
                        obfuscatedText: result.obfuscatedText
                    });
                } catch (error) {
                    results.failed++;
                    results.results.push({
                        accountId: account.accountId,
                        model: account.model,
                        channel: account.channel,
                        success: false,
                        error: error.message
                    });
                }

                // Add delay between requests
                if (accounts.indexOf(account) < accounts.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 1500));
                }
            }

            res.json({
                success: true,
                message: `Prompt updated for ${results.successful} of ${accounts.length} accounts`,
                data: results
            });
        } catch (error) {
            console.error('Bulk prompt update error:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to update prompts in bulk'
            });
        }
    }

    /**
     * Get prompt update status
     */
    async getPromptStatus(req, res) {
        try {
            const { taskId } = req.params;

            if (!taskId) {
                return res.status(400).json({
                    success: false,
                    error: 'Task ID is required'
                });
            }

            const status = await flamebotActionsService.pollEditTask(taskId, 1, 0); // Single check

            res.json({
                success: true,
                data: status
            });
        } catch (error) {
            console.error('Get prompt status error:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to get prompt status'
            });
        }
    }

    // ============================
    // COMBO ACTIONS
    // ============================

    /**
     * Update both bio and prompt together
     */
    async updateBioPromptCombo(req, res) {
        try {
            const { accountId, model, channel, generateBoth = true, customBio = null, customPrompt = null } = req.body;

            if (!accountId || !model || !channel) {
                return res.status(400).json({
                    success: false,
                    error: 'accountId, model, and channel are required'
                });
            }

            console.log(`🚀 Combo update (bio + prompt) for account ${accountId} (${model}/${channel})`);
            
            const results = {};

            // Update bio
            try {
                let bioText = customBio;
                if (generateBoth && !customBio) {
                    const bios = await aiService.generateBios(1);
                    bioText = bios[0].text;
                }
                
                const bioResult = await flamebotActionsService.updateBio(accountId, bioText);
                results.bioTaskId = bioResult.taskId;
                results.bioText = bioText;
                results.bioSuccess = true;
            } catch (error) {
                results.bioSuccess = false;
                results.bioError = error.message;
            }

            // Wait a bit between updates
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Update prompt
            try {
                const promptText = generateBoth ? null : customPrompt;
                const promptResult = await flamebotActionsService.updatePrompt(accountId, model, channel, promptText);
                results.promptTaskId = promptResult.taskId;
                results.promptText = promptResult.visibleText;
                results.promptSuccess = true;
            } catch (error) {
                results.promptSuccess = false;
                results.promptError = error.message;
            }

            const overallSuccess = results.bioSuccess && results.promptSuccess;

            res.json({
                success: overallSuccess,
                message: `Combo update ${overallSuccess ? 'completed' : 'partially completed'}`,
                data: results
            });
        } catch (error) {
            console.error('Bio + Prompt combo error:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to update bio and prompt combo'
            });
        }
    }

    // ============================
    // HELPER METHODS
    // ============================

    /**
     * Wait for swipe completion
     */
    async waitForSwipeCompletion(taskId, maxAttempts = 60, interval = 10000) {
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            const status = await flamebotActionsService.checkSwipeTaskStatus(taskId);
            
            if (status.celery_status === 'SUCCESS') {
                console.log('✅ Swipe task completed');
                return status;
            }
            
            if (status.celery_status === 'FAILURE' || status.celery_status === 'REVOKED') {
                throw new Error(`Swipe task failed: ${status.error}`);
            }
            
            console.log(`   Swipe status: ${status.celery_status} (${attempt}/${maxAttempts})`);
            
            if (attempt < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, interval));
            }
        }
        
        console.log('⚠️  Swipe task still running, stopping wait...');
        return { celery_status: 'TIMEOUT', message: 'Task still running after timeout' };
    }
}

module.exports = new ActionsController();