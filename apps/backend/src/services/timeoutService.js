// src/services/timeoutService.js
const EventEmitter = require('events');

/**
 * Service responsible for managing request timeouts
 * Follows Single Responsibility Principle - only handles timeout logic
 */
class TimeoutService extends EventEmitter {
    constructor() {
        super();
        this.activeTimeouts = new Map();
        this.defaultTimeout = 30000; // 30 seconds default
        this.timeoutConfigs = {
            prompt: 30000,        // 30s for prompt generation
            batch: 60000,         // 60s for batch operations
            upload: 45000,        // 45s for uploads
            health: 5000,         // 5s for health checks
            workflow: 120000      // 2min for workflows
        };
    }

    /**
     * Create a managed timeout
     * @param {string} id - Unique timeout ID
     * @param {Object} options - Timeout options
     * @returns {Object} Timeout handle
     */
    createTimeout(id, options = {}) {
        const {
            duration = this.defaultTimeout,
            type = 'default',
            onTimeout = null,
            metadata = {}
        } = options;

        // Clear existing timeout with same ID
        if (this.activeTimeouts.has(id)) {
            this.clearTimeout(id);
        }

        const timeoutDuration = this.timeoutConfigs[type] || duration;
        const startTime = Date.now();

        const timeoutHandle = {
            id,
            type,
            startTime,
            duration: timeoutDuration,
            metadata,
            cleared: false,
            elapsed: () => Date.now() - startTime,
            remaining: () => Math.max(0, timeoutDuration - (Date.now() - startTime))
        };

        const timer = setTimeout(() => {
            if (!timeoutHandle.cleared) {
                timeoutHandle.cleared = true;
                this.activeTimeouts.delete(id);

                // Emit timeout event
                this.emit('timeout', {
                    id,
                    type,
                    duration: timeoutDuration,
                    elapsed: Date.now() - startTime,
                    metadata
                });

                // Call timeout handler if provided
                if (onTimeout) {
                    onTimeout(timeoutHandle);
                }
            }
        }, timeoutDuration);

        timeoutHandle.timer = timer;
        timeoutHandle.clear = () => this.clearTimeout(id);

        this.activeTimeouts.set(id, timeoutHandle);

        return timeoutHandle;
    }

    /**
     * Clear a timeout
     * @param {string} id - Timeout ID
     * @returns {boolean} True if timeout was cleared
     */
    clearTimeout(id) {
        const timeoutHandle = this.activeTimeouts.get(id);
        if (timeoutHandle && !timeoutHandle.cleared) {
            clearTimeout(timeoutHandle.timer);
            timeoutHandle.cleared = true;
            this.activeTimeouts.delete(id);

            // Emit cleared event
            this.emit('cleared', {
                id,
                type: timeoutHandle.type,
                elapsed: timeoutHandle.elapsed()
            });

            return true;
        }
        return false;
    }

    /**
     * Clear all active timeouts
     */
    clearAll() {
        for (const [id, handle] of this.activeTimeouts) {
            if (!handle.cleared) {
                clearTimeout(handle.timer);
                handle.cleared = true;
            }
        }
        this.activeTimeouts.clear();
    }

    /**
     * Get active timeout info
     * @param {string} id - Timeout ID
     * @returns {Object|null} Timeout info
     */
    getTimeout(id) {
        const handle = this.activeTimeouts.get(id);
        if (handle && !handle.cleared) {
            return {
                id: handle.id,
                type: handle.type,
                elapsed: handle.elapsed(),
                remaining: handle.remaining(),
                duration: handle.duration,
                metadata: handle.metadata
            };
        }
        return null;
    }

    /**
     * Get all active timeouts
     * @returns {Array} Active timeout info
     */
    getActiveTimeouts() {
        const timeouts = [];
        for (const [id, handle] of this.activeTimeouts) {
            if (!handle.cleared) {
                timeouts.push({
                    id,
                    type: handle.type,
                    elapsed: handle.elapsed(),
                    remaining: handle.remaining(),
                    duration: handle.duration
                });
            }
        }
        return timeouts;
    }

    /**
     * Create a timeout wrapper for async functions
     * @param {Function} asyncFn - Async function to wrap
     * @param {Object} options - Timeout options
     * @returns {Function} Wrapped function
     */
    withTimeout(asyncFn, options = {}) {
        return async (...args) => {
            const timeoutId = `fn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            const { duration = this.defaultTimeout, errorMessage = 'Operation timed out' } = options;

            return new Promise(async (resolve, reject) => {
                let timeoutHandle;
                let isResolved = false;

                // Create timeout
                timeoutHandle = this.createTimeout(timeoutId, {
                    ...options,
                    onTimeout: () => {
                        if (!isResolved) {
                            isResolved = true;
                            reject(new Error(errorMessage));
                        }
                    }
                });

                try {
                    // Execute async function
                    const result = await asyncFn(...args);
                    
                    if (!isResolved) {
                        isResolved = true;
                        this.clearTimeout(timeoutId);
                        resolve(result);
                    }
                } catch (error) {
                    if (!isResolved) {
                        isResolved = true;
                        this.clearTimeout(timeoutId);
                        reject(error);
                    }
                }
            });
        };
    }

    /**
     * Create an HTTP response timeout handler
     * @param {Object} res - Express response object
     * @param {Object} options - Timeout options
     * @returns {Object} Timeout handle
     */
    createHTTPTimeout(res, options = {}) {
        const {
            duration = this.defaultTimeout,
            type = 'http',
            statusCode = 408,
            errorResponse = { success: false, error: 'Request timeout' }
        } = options;

        const timeoutId = `http-${Date.now()}-${res.req.path}`;

        return this.createTimeout(timeoutId, {
            duration,
            type,
            metadata: {
                path: res.req.path,
                method: res.req.method
            },
            onTimeout: () => {
                if (!res.headersSent) {
                    res.status(statusCode).json(errorResponse);
                }
            }
        });
    }

    /**
     * Update timeout configuration
     * @param {string} type - Timeout type
     * @param {number} duration - New duration in ms
     */
    updateTimeoutConfig(type, duration) {
        if (duration > 0) {
            this.timeoutConfigs[type] = duration;
        }
    }

    /**
     * Get timeout statistics
     * @returns {Object} Timeout statistics
     */
    getStatistics() {
        return {
            activeTimeouts: this.activeTimeouts.size,
            configurations: { ...this.timeoutConfigs },
            defaultTimeout: this.defaultTimeout
        };
    }
}

// Create singleton instance
const timeoutService = new TimeoutService();

// Listen to process events to clean up
process.on('beforeExit', () => {
    timeoutService.clearAll();
});

module.exports = timeoutService;