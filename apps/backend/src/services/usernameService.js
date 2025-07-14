// src/services/usernameService.js - Updated to use database instead of files
const databaseService = require('./databaseService');

class UsernameService {
    constructor() {
        this.db = databaseService;
        console.log('📊 UsernameService initialized with database backend');
    }

    /**
     * Get next username in rotation
     * @param {string} model - Model name
     * @param {string} channel - Channel type (snap/gram/of)
     * @returns {Promise<Object>} Username data
     */
    async getNextUsername(model, channel) {
        try {
            console.log(`🔄 Getting next username for ${model}/${channel} from database`);
            return await this.db.getNextUsername(model, channel);
        } catch (error) {
            console.error(`❌ Error getting next username:`, error);
            throw new Error(`Failed to get username for ${model}/${channel}: ${error.message}`);
        }
    }

    /**
     * Get all usernames for a model and channel
     * @param {string} model - Model name
     * @param {string} channel - Channel type
     * @returns {Promise<Array>} Array of usernames
     */
    async getAllUsernames(model, channel) {
        try {
            console.log(`📋 Getting all usernames for ${model}/${channel} from database`);
            return await this.db.getAllUsernames(model, channel);
        } catch (error) {
            console.error(`❌ Error getting all usernames:`, error);
            throw new Error(`Failed to get usernames for ${model}/${channel}: ${error.message}`);
        }
    }

    /**
     * Add usernames to database
     * @param {string} model - Model name
     * @param {string} channel - Channel type
     * @param {Array<string>} newUsernames - Usernames to add
     * @param {boolean} replace - Whether to replace existing usernames
     * @returns {Promise<Object>} Operation result
     */
    async addUsernames(model, channel, newUsernames, replace = false) {
        try {
            console.log(`📝 ${replace ? 'Replacing' : 'Adding'} ${newUsernames.length} usernames for ${model}/${channel}`);
            
            if (replace) {
                const result = await this.db.replaceUsernames(model, channel, newUsernames);
                return {
                    added: result.count,
                    total: result.count,
                    duplicatesRemoved: 0
                };
            } else {
                const result = await this.db.addUsernames(model, channel, newUsernames);
                return {
                    added: result.count,
                    total: result.count,
                    duplicatesRemoved: 0
                };
            }
        } catch (error) {
            console.error(`❌ Error adding usernames:`, error);
            throw new Error(`Failed to add usernames: ${error.message}`);
        }
    }

    /**
     * Get statistics for all username files
     * @returns {Promise<Object>} Statistics object
     */
    async getStatistics() {
        try {
            console.log('📊 Getting username statistics from database');
            return await this.db.getStatistics();
        } catch (error) {
            console.error(`❌ Error getting statistics:`, error);
            throw new Error(`Failed to get statistics: ${error.message}`);
        }
    }

    /**
     * Load usernames from file (kept for migration purposes)
     * @param {string} model - Model name
     * @param {string} channel - Channel type
     * @returns {Promise<Array>} Array of usernames
     * @deprecated Use getAllUsernames instead
     */
    async loadUsernames(model, channel) {
        console.warn('⚠️ loadUsernames is deprecated, using getAllUsernames');
        return this.getAllUsernames(model, channel);
    }

    /**
     * Get file path (kept for backward compatibility)
     * @param {string} model - Model name
     * @param {string} channel - Channel type (snap/gram/of)
     * @returns {string} Empty string
     * @deprecated No longer using files
     */
    getFilePath(model, channel) {
        console.warn('⚠️ getFilePath is deprecated, no longer using files');
        return '';
    }

    /**
     * Save usernames to file (kept for backward compatibility)
     * @param {string} model - Model name
     * @param {string} channel - Channel type
     * @param {Array<string>} usernames - Array of usernames
     * @deprecated Use addUsernames instead
     */
    async saveUsernames(model, channel, usernames) {
        console.warn('⚠️ saveUsernames is deprecated, using addUsernames');
        return this.addUsernames(model, channel, usernames, true);
    }

    /**
     * Load pointers from file (kept for backward compatibility)
     * @returns {Promise<Object>} Empty object
     * @deprecated Pointers are now in database
     */
    async loadPointers() {
        console.warn('⚠️ loadPointers is deprecated, pointers are in database');
        return {};
    }

    /**
     * Save pointers to file (kept for backward compatibility)
     * @param {Object} pointers - Pointers object
     * @deprecated Pointers are now in database
     */
    async savePointers(pointers) {
        console.warn('⚠️ savePointers is deprecated, pointers are in database');
        return;
    }

    /**
     * Initialize directories (kept for backward compatibility)
     * @deprecated No longer using file system
     */
    async initializeDirectories() {
        console.warn('⚠️ initializeDirectories is deprecated, using database');
        return;
    }
}

module.exports = new UsernameService();
