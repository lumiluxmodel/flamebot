const fs = require('fs').promises;
const path = require('path');

class UsernameService {
    constructor() {
        this.dataDir = path.join(__dirname, '../../data');
        this.pointersFile = path.join(this.dataDir, 'username_pointers.json');
        this.usernamesDir = path.join(this.dataDir, 'usernames');
        
        // Initialize directories
        this.initializeDirectories();
    }

    /**
     * Initialize required directories
     */
    async initializeDirectories() {
        try {
            await fs.mkdir(this.dataDir, { recursive: true });
            await fs.mkdir(this.usernamesDir, { recursive: true });
        } catch (error) {
            console.error('Error creating directories:', error);
        }
    }

    /**
     * Load username pointers from file
     * @returns {Promise<Object>} Pointers object
     */
    async loadPointers() {
        try {
            const data = await fs.readFile(this.pointersFile, 'utf-8');
            return JSON.parse(data);
        } catch (error) {
            if (error.code === 'ENOENT') {
                return {};
            }
            throw error;
        }
    }

    /**
     * Save username pointers to file
     * @param {Object} pointers - Pointers object
     */
    async savePointers(pointers) {
        await fs.writeFile(this.pointersFile, JSON.stringify(pointers, null, 2), 'utf-8');
    }

    /**
     * Get file path for model and channel
     * @param {string} model - Model name
     * @param {string} channel - Channel type (snap/gram)
     * @returns {string} File path
     */
    getFilePath(model, channel) {
        const filename = `${model.toLowerCase()}_${channel === 'snap' ? 'snap' : 'ig'}.txt`;
        return path.join(this.usernamesDir, filename);
    }

    /**
     * Load usernames from file
     * @param {string} model - Model name
     * @param {string} channel - Channel type
     * @returns {Promise<Array>} Array of usernames
     */
    async loadUsernames(model, channel) {
        const filePath = this.getFilePath(model, channel);
        
        try {
            const data = await fs.readFile(filePath, 'utf-8');
            return data.split('\n')
                .map(line => line.trim())
                .filter(line => line.length > 0);
        } catch (error) {
            if (error.code === 'ENOENT') {
                throw new Error(`Username file not found: ${filePath}`);
            }
            throw error;
        }
    }

    /**
     * Save usernames to file
     * @param {string} model - Model name
     * @param {string} channel - Channel type
     * @param {Array<string>} usernames - Array of usernames
     */
    async saveUsernames(model, channel, usernames) {
        const filePath = this.getFilePath(model, channel);
        const content = usernames.join('\n');
        await fs.writeFile(filePath, content, 'utf-8');
    }

    /**
     * Get next username in rotation
     * @param {string} model - Model name
     * @param {string} channel - Channel type
     * @returns {Promise<Object>} Username data
     */
    async getNextUsername(model, channel) {
        const key = `${model.toLowerCase()}_${channel}`;
        const pointers = await this.loadPointers();
        const usernames = await this.loadUsernames(model, channel);

        if (usernames.length === 0) {
            throw new Error('No usernames available in file');
        }

        const index = pointers[key] || 0;
        const username = usernames[index];
        
        // Update pointer for next use
        pointers[key] = (index + 1) % usernames.length;
        await this.savePointers(pointers);

        return {
            username,
            index,
            total: usernames.length,
            nextIndex: pointers[key]
        };
    }

    /**
     * Get all usernames for a model and channel
     * @param {string} model - Model name
     * @param {string} channel - Channel type
     * @returns {Promise<Array>} Array of usernames
     */
    async getAllUsernames(model, channel) {
        return await this.loadUsernames(model, channel);
    }

    /**
     * Add usernames to file
     * @param {string} model - Model name
     * @param {string} channel - Channel type
     * @param {Array<string>} newUsernames - Usernames to add
     * @param {boolean} replace - Whether to replace existing usernames
     */
    async addUsernames(model, channel, newUsernames, replace = false) {
        let existingUsernames = [];
        
        if (!replace) {
            try {
                existingUsernames = await this.loadUsernames(model, channel);
            } catch (error) {
                // File doesn't exist, that's okay
            }
        }

        // Remove duplicates
        const allUsernames = [...new Set([...existingUsernames, ...newUsernames])];
        await this.saveUsernames(model, channel, allUsernames);

        return {
            added: newUsernames.length,
            total: allUsernames.length,
            duplicatesRemoved: (existingUsernames.length + newUsernames.length) - allUsernames.length
        };
    }

    /**
     * Get statistics for all username files
     * @returns {Promise<Object>} Statistics object
     */
    async getStatistics() {
        const stats = {};
        const models = ['aura', 'lola', 'iris', 'ciara'];
        const channels = ['snap', 'gram', 'of'];

        for (const model of models) {
            stats[model] = {};
            for (const channel of channels) {
                try {
                    const usernames = await this.loadUsernames(model, channel);
                    const pointers = await this.loadPointers();
                    const key = `${model}_${channel}`;
                    
                    stats[model][channel] = {
                        count: usernames.length,
                        currentIndex: pointers[key] || 0,
                        exists: true
                    };
                } catch (error) {
                    stats[model][channel] = {
                        count: 0,
                        currentIndex: 0,
                        exists: false
                    };
                }
            }
        }

        return stats;
    }
}

module.exports = new UsernameService();