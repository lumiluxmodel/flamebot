// src/services/workflowExecutorV2.js - Modern WorkflowExecutor Entry Point

const workflowExecutorFactory = require('./workflowExecutorFactory');

/**
 * Modern WorkflowExecutor Entry Point
 * Provides clean interface to the refactored workflow system
 * Uses dependency injection and specialized services
 */

let factoryInitialized = false;
let cachedExecutor = null;

/**
 * Initialize the workflow system
 * @returns {Promise<void>}
 */
async function initialize() {
  if (factoryInitialized) {
    console.log("⚠️ Workflow system already initialized");
    return;
  }

  console.log("🚀 Initializing modern workflow system...");
  
  try {
    await workflowExecutorFactory.initialize();
    factoryInitialized = true;
    
    // Cache the executor for performance
    cachedExecutor = workflowExecutorFactory.getWorkflowExecutor();
    
    console.log("✅ Modern workflow system initialized successfully");
    
  } catch (error) {
    console.error("❌ Failed to initialize modern workflow system:", error);
    throw error;
  }
}

/**
 * Get the WorkflowExecutor instance
 * @returns {WorkflowExecutor} Configured executor
 */
function getWorkflowExecutor() {
  if (!factoryInitialized) {
    throw new Error("Workflow system must be initialized first. Call initialize() before using.");
  }
  
  return cachedExecutor || workflowExecutorFactory.getWorkflowExecutor();
}

/**
 * Get specialized service (advanced usage)
 * @param {string} serviceName - Service name
 * @returns {Object} Service instance
 */
function getService(serviceName) {
  if (!factoryInitialized) {
    throw new Error("Workflow system must be initialized first");
  }
  
  return workflowExecutorFactory.getService(serviceName);
}

/**
 * Get comprehensive system statistics
 * @returns {Object} System statistics
 */
function getSystemStatistics() {
  if (!factoryInitialized) {
    return { error: "System not initialized" };
  }
  
  return workflowExecutorFactory.getStatistics();
}

/**
 * Perform system health check
 * @returns {Object} Health status
 */
function healthCheck() {
  return workflowExecutorFactory.healthCheck();
}

/**
 * Shutdown the workflow system
 * @returns {Promise<void>}
 */
async function shutdown() {
  if (!factoryInitialized) {
    console.log("⚠️ System not initialized, nothing to shutdown");
    return;
  }
  
  console.log("🛑 Shutting down modern workflow system...");
  
  try {
    await workflowExecutorFactory.shutdown();
    factoryInitialized = false;
    cachedExecutor = null;
    
    console.log("✅ Modern workflow system shutdown complete");
    
  } catch (error) {
    console.error("❌ Failed to shutdown workflow system:", error);
    throw error;
  }
}

/**
 * Create test scope for isolated testing
 * @returns {Object} Test scope with isolated services
 */
function createTestScope() {
  const scopedFactory = workflowExecutorFactory.createTestScope();
  
  return {
    async initialize() {
      await scopedFactory.initialize();
    },
    
    getWorkflowExecutor() {
      return scopedFactory.getWorkflowExecutor();
    },
    
    getService(serviceName) {
      return scopedFactory.getService(serviceName);
    },
    
    async shutdown() {
      await scopedFactory.shutdown();
    }
  };
}

// Backward compatibility - auto-initialize on first access
let autoInitPromise = null;

function ensureInitialized() {
  if (!factoryInitialized && !autoInitPromise) {
    console.log("🔄 Auto-initializing workflow system for backward compatibility...");
    autoInitPromise = initialize().catch(error => {
      console.error("❌ Auto-initialization failed:", error);
      autoInitPromise = null;
      throw error;
    });
  }
  
  return autoInitPromise;
}

// Proxy object for backward compatibility
const workflowExecutorProxy = new Proxy({}, {
  get(target, prop) {
    // Handle initialization methods
    if (prop === 'initialize') return initialize;
    if (prop === 'shutdown') return shutdown;
    if (prop === 'getStatistics') return getSystemStatistics;
    if (prop === 'healthCheck') return healthCheck;
    if (prop === 'createTestScope') return createTestScope;
    if (prop === 'getService') return getService;
    
    // For EventEmitter methods like 'on', 'emit', etc. return dummy functions if not initialized
    if (prop === 'on' || prop === 'emit' || prop === 'once' || prop === 'removeListener') {
      if (!factoryInitialized) {
        // Return a dummy function that does nothing until initialized
        return () => {};
      }
    }
    
    // For all other properties, ensure system is initialized and delegate to executor
    if (!factoryInitialized) {
      // Auto-initialize for backward compatibility (async, non-blocking)
      ensureInitialized();
      // Return undefined for properties that can't be accessed yet
      return undefined;
    }
    
    const executor = getWorkflowExecutor();
    const value = executor[prop];
    
    // Bind methods to maintain correct 'this' context
    if (typeof value === 'function') {
      return value.bind(executor);
    }
    
    return value;
  }
});

module.exports = workflowExecutorProxy;