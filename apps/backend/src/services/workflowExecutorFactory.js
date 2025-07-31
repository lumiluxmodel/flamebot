// src/services/workflowExecutorFactory.js - Factory for WorkflowExecutor using DI Container

const workflowContainer = require('./workflowServiceContainer');

/**
 * WorkflowExecutorFactory - Creates WorkflowExecutor instances using DI Container
 * Provides backward compatibility while using the new refactored architecture
 */
class WorkflowExecutorFactory {
  constructor() {
    this.container = workflowContainer;
    this.initialized = false;
    console.log("🏭 Workflow Executor Factory initialized");
  }

  /**
   * Initialize the factory and all services
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this.initialized) {
      console.log("⚠️ Workflow Executor Factory already initialized");
      return;
    }

    console.log("🚀 Initializing Workflow Executor Factory...");

    try {
      // Validate container configuration
      const validation = this.container.validateConfiguration();
      if (!validation.isValid) {
        console.error("❌ Container configuration validation failed:");
        validation.errors.forEach(error => console.error(`  - ${error}`));
        throw new Error("Invalid container configuration");
      }

      if (validation.warnings.length > 0) {
        console.warn("⚠️ Container configuration warnings:");
        validation.warnings.forEach(warning => console.warn(`  - ${warning}`));
      }

      // Initialize the container and all services
      await this.container.initialize();

      this.initialized = true;
      console.log("✅ Workflow Executor Factory initialized successfully");

    } catch (error) {
      console.error("❌ Failed to initialize Workflow Executor Factory:", error);
      throw error;
    }
  }

  /**
   * Get the WorkflowExecutor instance
   * @returns {WorkflowExecutor} Configured WorkflowExecutor instance
   */
  getWorkflowExecutor() {
    if (!this.initialized) {
      throw new Error("Factory must be initialized before getting WorkflowExecutor");
    }

    try {
      const executor = this.container.get('workflowExecutor');
      
      // Initialize the executor if it has an initialize method
      if (typeof executor.initialize === 'function' && !executor.isInitialized) {
        // Note: This will be called asynchronously, but for backward compatibility
        // we return the executor immediately
        executor.initialize().catch(error => {
          console.error("❌ Failed to initialize WorkflowExecutor:", error);
        });
      }

      return executor;

    } catch (error) {
      console.error("❌ Failed to get WorkflowExecutor from container:", error);
      throw error;
    }
  }

  /**
   * Get specialized service directly (for advanced usage)
   * @param {string} serviceName - Name of the service
   * @returns {Object} Service instance
   */
  getService(serviceName) {
    if (!this.initialized) {
      throw new Error("Factory must be initialized before getting services");
    }

    return this.container.get(serviceName);
  }

  /**
   * Get comprehensive statistics from all services
   * @returns {Object} Combined statistics
   */
  getStatistics() {
    if (!this.initialized) {
      return { error: "Factory not initialized" };
    }

    try {
      const executor = this.container.get('workflowExecutor');
      const containerStats = this.container.getStats();

      return {
        factory: {
          initialized: this.initialized,
          containerStats
        },
        services: executor.getStatistics()
      };

    } catch (error) {
      return {
        error: `Failed to get statistics: ${error.message}`
      };
    }
  }

  /**
   * Create a scoped factory for testing
   * @returns {WorkflowExecutorFactory} Scoped factory instance
   */
  createTestScope() {
    const scopedFactory = new WorkflowExecutorFactory();
    scopedFactory.container = this.container.createScope();
    
    console.log("🧪 Created scoped factory for testing");
    return scopedFactory;
  }

  /**
   * Shutdown the factory and all services
   * @returns {Promise<void>}
   */
  async shutdown() {
    if (!this.initialized) {
      console.log("⚠️ Factory not initialized, nothing to shutdown");
      return;
    }

    console.log("🛑 Shutting down Workflow Executor Factory...");

    try {
      await this.container.shutdown();
      this.initialized = false;
      console.log("✅ Workflow Executor Factory shutdown complete");

    } catch (error) {
      console.error("❌ Failed to shutdown Workflow Executor Factory:", error);
      throw error;
    }
  }

  /**
   * Register additional service (for extensibility)
   * @param {string} name - Service name
   * @param {Function|Object} serviceOrFactory - Service or factory
   * @param {Array} dependencies - Dependencies
   */
  registerService(name, serviceOrFactory, dependencies = []) {
    if (this.initialized) {
      console.warn("⚠️ Registering service after initialization may cause issues");
    }

    this.container.registerSingleton(name, serviceOrFactory, dependencies);
  }

  /**
   * Health check for the factory and all services
   * @returns {Object} Health status
   */
  healthCheck() {
    try {
      if (!this.initialized) {
        return {
          status: 'unhealthy',
          reason: 'Factory not initialized'
        };
      }

      const containerStats = this.container.getStats();
      const executor = this.container.get('workflowExecutor');
      const monitoringService = this.container.get('workflowMonitoringService');
      
      const healthStatus = monitoringService.checkHealthStatus();

      return {
        status: healthStatus.status,
        factory: {
          initialized: this.initialized,
          servicesLoaded: containerStats.instantiatedServices.length
        },
        executor: {
          initialized: executor.isInitialized
        },
        monitoring: healthStatus,
        timestamp: new Date()
      };

    } catch (error) {
      return {
        status: 'error',
        error: error.message,
        timestamp: new Date()
      };
    }
  }
}

// Export singleton instance for backward compatibility
const factory = new WorkflowExecutorFactory();

module.exports = factory;