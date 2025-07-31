// src/services/workflowServiceContainer.js - Dependency Injection Container for Workflow Services

/**
 * WorkflowServiceContainer - Dependency Injection Container
 * Implements Dependency Inversion Principle to manage service dependencies
 */
class WorkflowServiceContainer {
  constructor() {
    this.services = new Map();
    this.singletons = new Map();
    this.factories = new Map();
    this.initialized = false;
    
    console.log("📦 Workflow Service Container initialized");
  }

  /**
   * Register a singleton service
   * @param {string} name - Service name
   * @param {Function|Object} serviceOrFactory - Service instance or factory function
   * @param {Array} dependencies - Array of dependency names
   */
  registerSingleton(name, serviceOrFactory, dependencies = []) {
    if (typeof serviceOrFactory === 'function') {
      this.factories.set(name, {
        factory: serviceOrFactory,
        dependencies,
        isSingleton: true
      });
    } else {
      this.singletons.set(name, serviceOrFactory);
    }
    
    console.log(`📦 Registered singleton: ${name}`);
  }

  /**
   * Register a transient service (new instance each time)
   * @param {string} name - Service name
   * @param {Function} factory - Factory function
   * @param {Array} dependencies - Array of dependency names
   */
  registerTransient(name, factory, dependencies = []) {
    this.factories.set(name, {
      factory,
      dependencies,
      isSingleton: false
    });
    
    console.log(`📦 Registered transient: ${name}`);
  }

  /**
   * Register an existing instance
   * @param {string} name - Service name
   * @param {Object} instance - Service instance
   */
  registerInstance(name, instance) {
    this.services.set(name, instance);
    console.log(`📦 Registered instance: ${name}`);
  }

  /**
   * Get service by name
   * @param {string} name - Service name
   * @returns {Object} Service instance
   */
  get(name) {
    // Check if already instantiated
    if (this.services.has(name)) {
      return this.services.get(name);
    }

    // Check singletons
    if (this.singletons.has(name)) {
      return this.singletons.get(name);
    }

    // Check factories
    if (this.factories.has(name)) {
      return this.createFromFactory(name);
    }

    throw new Error(`Service '${name}' not found in container`);
  }

  /**
   * Create service from factory
   * @param {string} name - Service name
   * @returns {Object} Service instance
   */
  createFromFactory(name) {
    const factoryInfo = this.factories.get(name);
    if (!factoryInfo) {
      throw new Error(`Factory for '${name}' not found`);
    }

    // Resolve dependencies
    const dependencies = factoryInfo.dependencies.map(depName => this.get(depName));
    
    // Create instance
    const instance = factoryInfo.factory(...dependencies);
    
    // Store singleton instances
    if (factoryInfo.isSingleton) {
      this.services.set(name, instance);
    }
    
    return instance;
  }

  /**
   * Check if service is registered
   * @param {string} name - Service name
   * @returns {boolean} True if registered
   */
  has(name) {
    return this.services.has(name) || 
           this.singletons.has(name) || 
           this.factories.has(name);
  }

  /**
   * Initialize all singleton services
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this.initialized) {
      console.log("⚠️ Service container already initialized");
      return;
    }

    console.log("🚀 Initializing workflow service container...");

    // Create all singletons to ensure proper initialization order
    const singletonNames = Array.from(this.factories.entries())
      .filter(([, info]) => info.isSingleton)
      .map(([name]) => name);

    for (const name of singletonNames) {
      try {
        const service = this.get(name);
        
        // Call initialize method if it exists
        if (service && typeof service.initialize === 'function') {
          await service.initialize();
        }
        
        console.log(`✅ Initialized service: ${name}`);
      } catch (error) {
        console.error(`❌ Failed to initialize service ${name}:`, error);
        throw error;
      }
    }

    this.initialized = true;
    console.log("✅ Workflow service container initialized successfully");
  }

  /**
   * Shutdown all services
   * @returns {Promise<void>}
   */
  async shutdown() {
    console.log("🛑 Shutting down workflow service container...");

    // Call shutdown on all services that support it
    for (const [name, service] of this.services) {
      try {
        if (service && typeof service.shutdown === 'function') {
          await service.shutdown();
          console.log(`✅ Shutdown service: ${name}`);
        }
      } catch (error) {
        console.error(`❌ Failed to shutdown service ${name}:`, error);
      }
    }

    // Clear all services
    this.services.clear();
    this.singletons.clear();
    
    this.initialized = false;
    console.log("✅ Workflow service container shutdown complete");
  }

  /**
   * Get container statistics
   * @returns {Object} Container statistics
   */
  getStats() {
    return {
      totalServices: this.services.size + this.singletons.size,
      instantiatedServices: this.services.size,
      singletonServices: this.singletons.size,
      factories: this.factories.size,
      initialized: this.initialized,
      serviceNames: {
        instantiated: Array.from(this.services.keys()),
        singletons: Array.from(this.singletons.keys()),
        factories: Array.from(this.factories.keys())
      }
    };
  }

  /**
   * Validate container configuration
   * @returns {Object} Validation result
   */
  validateConfiguration() {
    const errors = [];
    const warnings = [];

    // Check for circular dependencies
    for (const [name, factoryInfo] of this.factories) {
      const circularDep = this.checkCircularDependency(name, factoryInfo.dependencies, new Set());
      if (circularDep) {
        errors.push(`Circular dependency detected: ${circularDep}`);
      }
    }

    // Check for missing dependencies
    for (const [name, factoryInfo] of this.factories) {
      for (const dep of factoryInfo.dependencies) {
        if (!this.has(dep)) {
          errors.push(`Service '${name}' depends on unregistered service '${dep}'`);
        }
      }
    }

    // Check for unused services
    const allDependencies = new Set();
    for (const [, factoryInfo] of this.factories) {
      factoryInfo.dependencies.forEach(dep => allDependencies.add(dep));
    }

    for (const name of this.services.keys()) {
      if (!allDependencies.has(name)) {
        warnings.push(`Service '${name}' is registered but not used as a dependency`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Check for circular dependencies
   * @param {string} serviceName - Service being checked
   * @param {Array} dependencies - Dependencies to check
   * @param {Set} visited - Already visited services
   * @returns {string|null} Circular dependency path or null
   */
  checkCircularDependency(serviceName, dependencies, visited) {
    if (visited.has(serviceName)) {
      return Array.from(visited).join(' -> ') + ' -> ' + serviceName;
    }

    visited.add(serviceName);

    for (const dep of dependencies) {
      const factoryInfo = this.factories.get(dep);
      if (factoryInfo) {
        const circular = this.checkCircularDependency(dep, factoryInfo.dependencies, new Set(visited));
        if (circular) {
          return circular;
        }
      }
    }

    visited.delete(serviceName);
    return null;
  }

  /**
   * Create a scoped container for testing
   * @returns {WorkflowServiceContainer} New scoped container
   */
  createScope() {
    const scopedContainer = new WorkflowServiceContainer();
    
    // Copy registrations but not instances
    scopedContainer.factories = new Map(this.factories);
    
    console.log("📦 Created scoped container for testing");
    return scopedContainer;
  }

  /**
   * Register all default workflow services
   */
  registerDefaults() {
    console.log("📦 Registering default workflow services...");

    // Register core specialized services
    this.registerSingleton('workflowExecutionService', () => {
      const WorkflowExecutionService = require('./workflowExecutionService');
      return new WorkflowExecutionService();
    });

    this.registerSingleton('workflowSchedulingService', (workflowDb) => {
      const WorkflowSchedulingService = require('./workflowSchedulingService');  
      return new WorkflowSchedulingService(workflowDb);
    }, ['workflowDatabaseService']);

    this.registerSingleton('workflowMonitoringService', () => {
      const WorkflowMonitoringService = require('./workflowMonitoringService');
      return new WorkflowMonitoringService();
    });

    this.registerSingleton('workflowRecoveryService', (workflowDb) => {
      const WorkflowRecoveryService = require('./workflowRecoveryService');
      return new WorkflowRecoveryService(workflowDb);
    }, ['workflowDatabaseService']);

    // Register external dependencies
    this.registerSingleton('databaseService', () => {
      const databaseService = require('./databaseService');
      return databaseService;
    });

    this.registerSingleton('taskScheduler', () => {
      const taskScheduler = require('./taskScheduler');
      return taskScheduler;
    });

    this.registerSingleton('workflowDatabaseService', () => {
      const workflowDatabaseService = require('./workflowDatabaseService');
      return workflowDatabaseService;
    });

    // Register System Config Service
    this.registerSingleton('systemConfigService', (databaseService) => {
      const SystemConfigService = require('./systemConfigService');
      return new SystemConfigService(databaseService);
    }, ['databaseService']);
    
    // Register Workflow Cleanup Service
    this.registerSingleton('workflowCleanupService', (workflowDb) => {
      const WorkflowCleanupService = require('./workflowCleanupService');
      return new WorkflowCleanupService(workflowDb);
    }, ['workflowDatabaseService']);
    
    // Register Workflow Lock Service
    this.registerSingleton('workflowLockService', (databaseService) => {
      const WorkflowLockService = require('./workflowLockService');
      return new WorkflowLockService(databaseService);
    }, ['databaseService']);

    // Register the improved WorkflowExecutor with all dependencies
    this.registerSingleton('workflowExecutor', (
      executionService,
      schedulingService,
      monitoringService,
      recoveryService,
      workflowDb,
      taskScheduler,
      systemConfig,
      lockService,
      cleanupService
    ) => {
      const WorkflowExecutorImproved = require('./workflowExecutorImproved');
      return new WorkflowExecutorImproved(
        executionService,
        schedulingService,
        monitoringService,
        recoveryService,
        workflowDb,
        taskScheduler,
        systemConfig,
        lockService,
        cleanupService
      );
    }, [
      'workflowExecutionService',
      'workflowSchedulingService', 
      'workflowMonitoringService',
      'workflowRecoveryService',
      'workflowDatabaseService',
      'taskScheduler',
      'systemConfigService',
      'workflowLockService',
      'workflowCleanupService'
    ]);

    console.log("✅ Default workflow services registered");
  }
}

// Export singleton instance
const container = new WorkflowServiceContainer();

// Register defaults immediately
container.registerDefaults();

module.exports = container;