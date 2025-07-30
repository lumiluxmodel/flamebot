// src/services/channelStrategyService.js

/**
 * Base channel strategy interface
 */
class ChannelStrategy {
    constructor(config) {
        this.config = config;
    }

    /**
     * Format text for this channel
     * @param {string} text - Text to format
     * @param {string} username - Username to include
     * @returns {string} Formatted text
     */
    formatText(text, username) {
        throw new Error('formatText must be implemented by subclass');
    }

    /**
     * Validate text for this channel
     * @param {string} text - Text to validate
     * @returns {Object} Validation result
     */
    validateText(text) {
        throw new Error('validateText must be implemented by subclass');
    }

    /**
     * Get channel-specific configuration
     * @returns {Object} Channel config
     */
    getConfig() {
        return this.config;
    }
}

/**
 * Instagram/Gram channel strategy
 */
class GramChannelStrategy extends ChannelStrategy {
    constructor(config) {
        super({
            name: 'gram',
            prefix: config.prefix || '', // Prefix comes from database
            maxLength: 40,
            allowEmojis: false,
            allowSpecialChars: true,
            ...config
        });
    }

    formatText(text, username) {
        // Remove emojis and quotes for gram
        let cleanText = text
            .replace(/['"]/g, '') // Remove quotes
            .replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/gu, '') // Remove emojis
            .trim();

        // Truncate if too long
        if (cleanText.length > this.config.maxLength) {
            cleanText = cleanText.substring(0, this.config.maxLength).trim();
        }

        return `${this.config.prefix}${username} ${cleanText}`;
    }

    validateText(text) {
        if (!text || typeof text !== 'string') {
            return { isValid: false, error: 'Text is required and must be a string' };
        }

        if (text.length > this.config.maxLength) {
            return { 
                isValid: false, 
                error: `Text exceeds maximum length of ${this.config.maxLength} characters` 
            };
        }

        return { isValid: true };
    }
}

/**
 * Snapchat/Snap channel strategy
 */
class SnapChannelStrategy extends ChannelStrategy {
    constructor(config) {
        super({
            name: 'snap',
            prefix: config.prefix || '', // Prefix comes from database
            maxLength: 35,
            allowEmojis: false,
            allowSpecialChars: true,
            ...config
        });
    }

    formatText(text, username) {
        // More aggressive cleaning for snap
        let cleanText = text
            .replace(/['"]/g, '') // Remove quotes
            .replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/gu, '') // Remove emojis
            .replace(/[^\w\s.,!?;:-]/g, '') // Keep only basic punctuation
            .trim();

        // Truncate if too long
        if (cleanText.length > this.config.maxLength) {
            cleanText = cleanText.substring(0, this.config.maxLength).trim();
        }

        return `${this.config.prefix}${username} ${cleanText}`;
    }

    validateText(text) {
        if (!text || typeof text !== 'string') {
            return { isValid: false, error: 'Text is required and must be a string' };
        }

        if (text.length > this.config.maxLength) {
            return { 
                isValid: false, 
                error: `Text exceeds maximum length of ${this.config.maxLength} characters` 
            };
        }

        return { isValid: true };
    }
}

/**
 * OnlyFans/OF channel strategy
 */
class OFChannelStrategy extends ChannelStrategy {
    constructor(config) {
        super({
            name: 'of',
            prefix: config.prefix || '', // Prefix comes from database
            maxLength: 50,
            allowEmojis: true,
            allowSpecialChars: true,
            ...config
        });
    }

    formatText(text, username) {
        // Less aggressive cleaning for OF
        let cleanText = text
            .replace(/['"]/g, '') // Remove quotes only
            .trim();

        // Truncate if too long
        if (cleanText.length + this.config.prefix.length + username.length + 1 > this.config.maxLength) {
            const availableLength = this.config.maxLength - this.config.prefix.length - username.length - 1;
            cleanText = cleanText.substring(0, availableLength).trim();
        }

        return `${this.config.prefix}${username} ${cleanText}`;
    }

    validateText(text) {
        if (!text || typeof text !== 'string') {
            return { isValid: false, error: 'Text is required and must be a string' };
        }

        return { isValid: true }; // More lenient validation for OF
    }
}

/**
 * Channel strategy factory and manager
 */
class ChannelStrategyService {
    constructor(databaseService = null) {
        this.strategies = new Map();
        this.defaultConfigs = new Map();
        this.databaseService = databaseService;
        this.channelPrefixes = {};
        this.prefixesLoaded = false;
        
        // Register default strategies
        this.registerDefaultStrategies();
    }

    /**
     * Load channel prefixes from database
     * @private
     */
    async loadChannelPrefixes() {
        if (!this.databaseService) {
            const databaseService = require('./databaseService');
            this.databaseService = databaseService;
        }

        try {
            const channels = await this.databaseService.getAllChannels();
            
            for (const channel of channels) {
                this.channelPrefixes[channel.name] = channel.prefix;
            }
            
            this.prefixesLoaded = true;
            console.log('✅ Channel prefixes loaded from database:', this.channelPrefixes);
            
        } catch (error) {
            console.error('❌ Failed to load channel prefixes from database:', error.message);
            // Fallback to empty prefixes if database fails
            this.channelPrefixes = {};
            this.prefixesLoaded = true;
        }
    }

    /**
     * Register default channel strategies
     * @private
     */
    registerDefaultStrategies() {
        this.registerStrategy('gram', GramChannelStrategy);
        this.registerStrategy('snap', SnapChannelStrategy);
        this.registerStrategy('of', OFChannelStrategy);

        // Set default configs WITHOUT hardcoded prefixes
        this.defaultConfigs.set('gram', { maxLength: 40 });
        this.defaultConfigs.set('snap', { maxLength: 35 });
        this.defaultConfigs.set('of', { maxLength: 50 });
    }

    /**
     * Register a channel strategy
     * @param {string} channelName - Channel name
     * @param {Function} StrategyClass - Strategy class constructor
     * @param {Object} config - Default configuration
     */
    registerStrategy(channelName, StrategyClass, config = {}) {
        this.strategies.set(channelName.toLowerCase(), {
            StrategyClass,
            config: { ...this.defaultConfigs.get(channelName.toLowerCase()), ...config }
        });
    }

    /**
     * Get strategy for a channel
     * @param {string} channelName - Channel name
     * @param {Object} customConfig - Custom configuration
     * @returns {ChannelStrategy} Channel strategy instance
     */
    async getStrategy(channelName, customConfig = {}) {
        // Load prefixes from database if not loaded
        if (!this.prefixesLoaded) {
            await this.loadChannelPrefixes();
        }

        const strategyInfo = this.strategies.get(channelName.toLowerCase());
        
        if (!strategyInfo) {
            throw new Error(`No strategy registered for channel: ${channelName}`);
        }

        // Get real prefix from database
        const realPrefix = this.channelPrefixes[channelName.toLowerCase()] || '';
        
        const config = { 
            ...strategyInfo.config, 
            prefix: realPrefix,  // Use REAL prefix from database
            ...customConfig 
        };
        
        return new strategyInfo.StrategyClass(config);
    }

    /**
     * Check if strategy exists for channel
     * @param {string} channelName - Channel name
     * @returns {boolean} True if strategy exists
     */
    hasStrategy(channelName) {
        return this.strategies.has(channelName.toLowerCase());
    }

    /**
     * Get all registered channel names
     * @returns {Array<string>} Channel names
     */
    getRegisteredChannels() {
        return Array.from(this.strategies.keys());
    }

    /**
     * Format text using appropriate channel strategy
     * @param {string} channelName - Channel name
     * @param {string} text - Text to format
     * @param {string} username - Username
     * @param {Object} customConfig - Custom configuration
     * @returns {Promise<string>} Formatted text
     */
    async formatText(channelName, text, username, customConfig = {}) {
        const strategy = await this.getStrategy(channelName, customConfig);
        return strategy.formatText(text, username);
    }

    /**
     * Validate text using appropriate channel strategy
     * @param {string} channelName - Channel name
     * @param {string} text - Text to validate
     * @param {Object} customConfig - Custom configuration
     * @returns {Promise<Object>} Validation result
     */
    async validateText(channelName, text, customConfig = {}) {
        const strategy = await this.getStrategy(channelName, customConfig);
        return strategy.validateText(text);
    }

    /**
     * Update channel configuration
     * @param {string} channelName - Channel name
     * @param {Object} newConfig - New configuration
     */
    updateChannelConfig(channelName, newConfig) {
        const strategyInfo = this.strategies.get(channelName.toLowerCase());
        if (strategyInfo) {
            strategyInfo.config = { ...strategyInfo.config, ...newConfig };
        }
    }

    /**
     * Get channel configuration
     * @param {string} channelName - Channel name
     * @returns {Object} Channel configuration
     */
    getChannelConfig(channelName) {
        const strategyInfo = this.strategies.get(channelName.toLowerCase());
        return strategyInfo ? { ...strategyInfo.config } : null;
    }

    /**
     * Create a batch formatter for multiple texts
     * @param {string} channelName - Channel name
     * @param {Object} customConfig - Custom configuration
     * @returns {Function} Batch formatter function
     */
    createBatchFormatter(channelName, customConfig = {}) {
        const strategy = this.getStrategy(channelName, customConfig);
        
        return (items) => {
            return items.map(item => {
                if (typeof item === 'string') {
                    return strategy.formatText(item, '');
                } else if (item.text && item.username) {
                    return strategy.formatText(item.text, item.username);
                } else {
                    throw new Error('Invalid item format for batch formatting');
                }
            });
        };
    }
}

// Export strategy classes and service
module.exports = {
    ChannelStrategy,
    GramChannelStrategy,
    SnapChannelStrategy,
    OFChannelStrategy,
    ChannelStrategyService,
    // Export singleton instance
    channelStrategyService: new ChannelStrategyService()
};