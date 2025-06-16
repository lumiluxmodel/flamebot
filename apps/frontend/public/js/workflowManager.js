// public/js/workflowManager.js - Workflow Data Management
class WorkflowManager {
    constructor() {
        this.API_BASE = window.location.origin + '/api/workflows';
        this.cache = new Map();
        this.cacheTimeout = 30000; // 30 seconds
        this.retryAttempts = 3;
        
        console.log('🔧 Workflow Manager initialized');
    }

    /**
     * Initialize workflow manager
     */
    init() {
        console.log('🚀 Initializing Workflow Manager...');
        this.setupErrorHandling();
        console.log('✅ Workflow Manager ready');
    }

    /**
     * Setup global error handling
     */
    setupErrorHandling() {
        // Handle unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection:', event.reason);
            if (typeof workflowUI !== 'undefined' && workflowUI.showNotification) {
                workflowUI.showNotification('An unexpected error occurred', 'error');
            }
        });

        // Handle general errors
        window.addEventListener('error', (event) => {
            console.error('Global error:', event.error);
        });
    }

    /**
     * Cached API request with retry logic
     */
    async request(endpoint, options = {}, useCache = true) {
        const cacheKey = `${endpoint}:${JSON.stringify(options)}`;
        
        // Check cache first
        if (useCache && this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.cacheTimeout) {
                return cached.data;
            }
        }

        // Make request with retry logic
        let lastError;
        for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
            try {
                const response = await fetch(`${this.API_BASE}${endpoint}`, {
                    ...options,
                    headers: {
                        'Content-Type': 'application/json',
                        ...options.headers
                    }
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const data = await response.json();
                
                // Cache successful response
                if (useCache) {
                    this.cache.set(cacheKey, {
                        data,
                        timestamp: Date.now()
                    });
                }

                return data;

            } catch (error) {
                lastError = error;
                console.warn(`Request attempt ${attempt} failed:`, error);
                
                if (attempt < this.retryAttempts) {
                    // Exponential backoff
                    const delay = Math.pow(2, attempt - 1) * 1000;
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }

        throw lastError;
    }

    /**
     * Get workflow statistics
     */
    async getStats() {
        return await this.request('/stats');
    }

    /**
     * Get dashboard data
     */
    async getDashboard() {
        return await this.request('/monitoring/dashboard');
    }

    /**
     * Get active workflows
     */
    async getActiveWorkflows(filters = {}) {
        const params = new URLSearchParams(filters);
        return await this.request(`/active?${params}`, {}, false); // Don't cache filtered results
    }

    /**
     * Get workflow status
     */
    async getWorkflowStatus(accountId) {
        return await this.request(`/status/${accountId}`, {}, false);
    }

    /**
     * Stop workflow
     */
    async stopWorkflow(accountId) {
        return await this.request(`/stop/${accountId}`, { method: 'POST' }, false);
    }

    /**
     * Get workflow definitions
     */
    async getDefinitions() {
        return await this.request('/definitions');
    }

    /**
     * Get monitoring alerts
     */
    async getAlerts(params = {}) {
        const query = new URLSearchParams(params);
        return await this.request(`/monitoring/alerts?${query}`, {}, false);
    }

    /**
     * Acknowledge alert
     */
    async acknowledgeAlert(alertId) {
        return await this.request(`/monitoring/alerts/${alertId}/acknowledge`, {
            method: 'POST'
        }, false);
    }

    /**
     * System control operations
     */
    async pauseAll() {
        return await this.request('/control/pause-all', { method: 'POST' }, false);
    }

    async resumeAll() {
        return await this.request('/control/resume-all', { method: 'POST' }, false);
    }

    /**
     * Health check
     */
    async getHealth() {
        return await this.request('/health', {}, false);
    }

    /**
     * Clear cache
     */
    clearCache() {
        this.cache.clear();
        console.log('🗑️ Workflow cache cleared');
    }

    /**
     * Get cache stats
     */
    getCacheStats() {
        return {
            size: this.cache.size,
            entries: Array.from(this.cache.keys())
        };
    }
}

// Initialize global instance
const workflowManager = new WorkflowManager();
