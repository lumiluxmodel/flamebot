// public/js/app.js - Main Application Initialization
class FlamebotApp {
    constructor() {
        this.isInitialized = false;
        this.initializationAttempts = 0;
        this.maxInitializationAttempts = 3;
        this.components = {
            terminal: null,
            workflowUI: null,
            workflowManager: null
        };
        
        console.log('🔥 Flamebot App Constructor');
    }

    /**
     * Initialize the entire application
     */
    async init() {
        if (this.isInitialized) {
            console.log('⚠️ App already initialized');
            return;
        }

        this.initializationAttempts++;
        console.log(`🚀 Initializing Flamebot v2.0 (Attempt ${this.initializationAttempts})`);

        try {
            // Wait for DOM to be ready
            await this.waitForDOM();
            
            // Initialize components in correct order
            await this.initializeComponents();
            
            // Setup global event handlers
            this.setupGlobalHandlers();
            
            // Mark as initialized
            this.isInitialized = true;
            console.log('✅ Flamebot initialization completed successfully');
            
            // Add debug helpers
            this.addDebugHelpers();
            
        } catch (error) {
            console.error('❌ Initialization failed:', error);
            
            // Retry if within limits
            if (this.initializationAttempts < this.maxInitializationAttempts) {
                console.log(`🔄 Retrying initialization in 1 second...`);
                setTimeout(() => this.init(), 1000);
            } else {
                console.error('💥 Max initialization attempts reached');
                this.showFallbackError();
            }
        }
    }

    /**
     * Wait for DOM to be fully ready
     */
    waitForDOM() {
        return new Promise((resolve) => {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', resolve);
            } else {
                resolve();
            }
        });
    }

    /**
     * Initialize all components in the correct order
     */
    async initializeComponents() {
        console.log('🔧 Initializing components...');

        // 1. Initialize Workflow Manager first (data layer)
        if (typeof workflowManager !== 'undefined') {
            console.log('📊 Initializing Workflow Manager...');
            this.components.workflowManager = workflowManager;
            workflowManager.init();
        } else {
            console.warn('⚠️ WorkflowManager not found');
        }

        // 2. Initialize Terminal (legacy console)
        if (typeof terminal !== 'undefined') {
            console.log('💻 Initializing Terminal...');
            this.components.terminal = terminal;
            // Terminal auto-initializes, just reference it
        } else {
            console.warn('⚠️ Terminal not found');
        }

        // 3. Initialize Workflow UI (main interface)
        if (typeof workflowUI !== 'undefined') {
            console.log('🎨 Initializing Workflow UI...');
            this.components.workflowUI = workflowUI;
            workflowUI.init();
            
            // Ensure tabs are working
            await this.verifyTabFunctionality();
        } else {
            throw new Error('WorkflowUI is required but not found');
        }
    }

    /**
     * Setup global event handlers
     */
    setupGlobalHandlers() {
        console.log('🌐 Setting up global handlers...');

        // Handle visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                this.onAppVisible();
            } else {
                this.onAppHidden();
            }
        });

        // Handle window focus/blur
        window.addEventListener('focus', () => this.onAppFocused());
        window.addEventListener('blur', () => this.onAppBlurred());

        // Handle errors
        window.addEventListener('error', (event) => {
            console.error('Global error:', event.error);
            this.handleGlobalError(event.error);
        });

        // Handle unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection:', event.reason);
            this.handleGlobalError(event.reason);
        });

        // Handle keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleGlobalKeyboard(e));
    }

    /**
     * Verify tab functionality is working
     */
    async verifyTabFunctionality() {
        return new Promise((resolve) => {
            console.log('🔍 Verifying tab functionality...');
            
            const tabButtons = document.querySelectorAll('.nav-tab');
            const tabContents = document.querySelectorAll('.tab-content');
            
            console.log(`Found ${tabButtons.length} tab buttons and ${tabContents.length} tab contents`);
            
            if (tabButtons.length === 0 || tabContents.length === 0) {
                throw new Error('Tab elements not found');
            }

            // Test that at least one tab is active
            const activeTabs = document.querySelectorAll('.nav-tab.active');
            const activeContents = document.querySelectorAll('.tab-content.active');
            
            console.log(`Active tabs: ${activeTabs.length}, Active contents: ${activeContents.length}`);
            
            if (activeTabs.length === 0 || activeContents.length === 0) {
                console.log('🔧 No active tabs found, activating dashboard...');
                this.components.workflowUI.switchTab('dashboard');
            }
            
            resolve();
        });
    }

    /**
     * App visibility handlers
     */
    onAppVisible() {
        console.log('👁️ App became visible');
        if (this.components.workflowUI) {
            this.components.workflowUI.refreshCurrentTab();
        }
    }

    onAppHidden() {
        console.log('🙈 App hidden');
        // Pause intensive operations
    }

    onAppFocused() {
        console.log('🎯 App focused');
        // Focus command input if in console tab
        if (this.components.workflowUI?.currentTab === 'console') {
            const input = document.getElementById('command-input');
            if (input) input.focus();
        }
    }

    onAppBlurred() {
        console.log('😴 App blurred');
    }

    /**
     * Global keyboard handler
     */
    handleGlobalKeyboard(e) {
        // Ctrl/Cmd + K to clear (if in console)
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            if (this.components.workflowUI?.currentTab === 'console') {
                e.preventDefault();
                if (this.components.terminal) {
                    this.components.terminal.clearTerminal();
                }
            }
        }

        // Ctrl/Cmd + R to refresh current tab
        if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
            e.preventDefault();
            if (this.components.workflowUI) {
                this.components.workflowUI.refreshCurrentTab();
            }
        }

        // Number keys to switch tabs (Ctrl/Cmd + 1-5)
        if ((e.ctrlKey || e.metaKey) && e.key >= '1' && e.key <= '5') {
            e.preventDefault();
            const tabMap = ['dashboard', 'workflows', 'monitoring', 'definitions', 'console'];
            const tabIndex = parseInt(e.key) - 1;
            if (tabIndex < tabMap.length && this.components.workflowUI) {
                this.components.workflowUI.switchTab(tabMap[tabIndex]);
            }
        }

        // Escape to close modals
        if (e.key === 'Escape') {
            const modals = document.querySelectorAll('.modal-overlay.active');
            modals.forEach(modal => modal.classList.remove('active'));
        }
    }

    /**
     * Handle global errors
     */
    handleGlobalError(error) {
        const errorMessage = error?.message || String(error);
        
        // Don't show notifications for certain errors
        const ignoredErrors = [
            'Non-Error promise rejection captured',
            'Script error',
            'Network request failed'
        ];
        
        if (ignoredErrors.some(ignored => errorMessage.includes(ignored))) {
            return;
        }

        // Show error notification
        this.showNotification(`System Error: ${errorMessage}`, 'error');
    }

    /**
     * Show notification (use workflowUI or fallback)
     */
    showNotification(message, type = 'info') {
        if (this.components.workflowUI && this.components.workflowUI.showNotification) {
            this.components.workflowUI.showNotification(message, type);
        } else if (this.components.terminal && this.components.terminal.showNotification) {
            this.components.terminal.showNotification(message, type);
        } else {
            // Fallback notification
            console.log(`${type.toUpperCase()}: ${message}`);
            this.showFallbackNotification(message, type);
        }
    }

    /**
     * Fallback notification system
     */
    showFallbackNotification(message, type) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed; top: 20px; right: 20px; z-index: 9999;
            padding: 15px 20px; background: var(--bg-secondary, #0a0a0a);
            border: 1px solid var(--terminal-green, #00ff41); color: var(--terminal-green, #00ff41);
            font-size: 12px; border-radius: 4px; font-family: monospace;
        `;
        
        if (type === 'error') {
            notification.style.borderColor = 'var(--terminal-red, #ff4444)';
            notification.style.color = 'var(--terminal-red, #ff4444)';
        } else if (type === 'warning') {
            notification.style.borderColor = 'var(--terminal-yellow, #ffbd2e)';
            notification.style.color = 'var(--terminal-yellow, #ffbd2e)';
        }
        
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 5000);
    }

    /**
     * Show fallback error screen
     */
    showFallbackError() {
        const content = document.querySelector('.terminal-content');
        if (content) {
            content.innerHTML = `
                <div style="text-align: center; padding: 50px; color: var(--terminal-red, #ff4444);">
                    <h2>⚠️ SYSTEM INITIALIZATION FAILED</h2>
                    <p>Unable to load the workflow interface.</p>
                    <p>Please refresh the page or contact support.</p>
                    <button onclick="window.location.reload()" 
                            style="margin-top: 20px; padding: 10px 20px; background: transparent; 
                                   border: 1px solid var(--terminal-red, #ff4444); color: var(--terminal-red, #ff4444); 
                                   cursor: pointer; font-family: inherit;">
                        🔄 RELOAD PAGE
                    </button>
                </div>
            `;
        }
    }

    /**
     * Add debug helpers to window
     */
    addDebugHelpers() {
        // Add debug functions to window for console access
        window.flamebotDebug = {
            app: this,
            components: this.components,
            testTabs: () => {
                console.log('🔍 Tab Navigation Debug:');
                console.log('- Tab buttons:', document.querySelectorAll('.nav-tab').length);
                console.log('- Tab contents:', document.querySelectorAll('.tab-content').length);
                console.log('- Active tabs:', document.querySelectorAll('.nav-tab.active').length);
                console.log('- Active contents:', document.querySelectorAll('.tab-content.active').length);
                console.log('- Current tab:', this.components.workflowUI?.currentTab);
            },
            switchTab: (tabId) => {
                if (this.components.workflowUI) {
                    this.components.workflowUI.switchTab(tabId);
                } else {
                    console.error('WorkflowUI not available');
                }
            },
            status: () => {
                console.log('🔥 Flamebot Status:');
                console.log('- Initialized:', this.isInitialized);
                console.log('- Components:', Object.keys(this.components).filter(k => this.components[k] !== null));
                console.log('- Current tab:', this.components.workflowUI?.currentTab);
                console.log('- DOM ready:', document.readyState);
            }
        };

        console.log('🛠️ Debug helpers added to window.flamebotDebug');
        console.log('Available commands: testTabs(), switchTab(id), status()');
    }

    /**
     * Get app status
     */
    getStatus() {
        return {
            initialized: this.isInitialized,
            attempts: this.initializationAttempts,
            components: Object.fromEntries(
                Object.entries(this.components).map(([key, value]) => [key, value !== null])
            ),
            currentTab: this.components.workflowUI?.currentTab,
            domReady: document.readyState
        };
    }
}

// Create and initialize the app
let flamebotApp;

function initializeFlamebot() {
    try {
        flamebotApp = new FlamebotApp();
        flamebotApp.init();
    } catch (error) {
        console.error('💥 Failed to create Flamebot app:', error);
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeFlamebot);
} else {
    initializeFlamebot();
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { FlamebotApp, flamebotApp };
}
