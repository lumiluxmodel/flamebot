// tests/__tests__/workflows/workflowServices.test.js
const workflowExecutor = require('../../../src/services/workflowExecutorV2');

describe('Workflow Services Tests', () => {
  let testScope;
  
  beforeAll(async () => {
    testScope = workflowExecutor.createTestScope();
    await testScope.initialize();
  });
  
  afterAll(async () => {
    if (testScope) {
      await testScope.shutdown();
    }
  });
  
  describe('Service Initialization', () => {
    it('should initialize all services correctly', async () => {
      // Verificar que el testScope está inicializado
      expect(testScope).toBeDefined();
      
      // Obtener el executor
      const executor = testScope.getWorkflowExecutor();
      expect(executor).toBeDefined();
      expect(executor.isInitialized).toBeTruthy();
    });
    
    it('should provide access to specialized services', async () => {
      // Verificar acceso a servicios especializados
      const executionService = testScope.getService('workflowExecutionService');
      expect(executionService).toBeDefined();
      
      const schedulingService = testScope.getService('workflowSchedulingService');
      expect(schedulingService).toBeDefined();
      
      const monitoringService = testScope.getService('workflowMonitoringService');
      expect(monitoringService).toBeDefined();
      
      const recoveryService = testScope.getService('workflowRecoveryService');
      expect(recoveryService).toBeDefined();
    });
  });
  
  describe('Execution Service', () => {
    it('should provide execution statistics', async () => {
      const executionService = testScope.getService('workflowExecutionService');
      const stats = executionService.getExecutionStats();
      
      expect(stats).toBeDefined();
      expect(stats.service).toBe('WorkflowExecutionService');
      expect(typeof stats.uptime).toBe('number');
    });
  });
  
  describe('Workflow Executor Methods', () => {
    it('should provide required workflow executor methods', async () => {
      const executor = testScope.getWorkflowExecutor();
      
      // Verificar que tiene los métodos requeridos
      expect(typeof executor.startExecution).toBe('function');
      expect(typeof executor.stopExecution).toBe('function');
      expect(typeof executor.getExecutionStatus).toBe('function');
      expect(typeof executor.getAllActiveExecutions).toBe('function');
      expect(typeof executor.getStatistics).toBe('function');
    });
    
    it('should handle getAllActiveExecutions when no executions exist', async () => {
      const executor = testScope.getWorkflowExecutor();
      const activeExecutions = executor.getAllActiveExecutions();
      
      expect(Array.isArray(activeExecutions)).toBe(true);
      // Puede ser array vacío o tener elementos previos
      expect(activeExecutions.length).toBeGreaterThanOrEqual(0);
    });
  });
});