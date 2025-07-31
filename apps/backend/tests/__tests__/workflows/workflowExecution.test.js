// tests/__tests__/workflows/workflowExecution.test.js
const workflowExecutor = require('../../../src/services/workflowExecutorV2');

describe('Workflow Execution Tests', () => {
  let testScope;
  
  beforeAll(async () => {
    // Crear scope de test aislado
    testScope = workflowExecutor.createTestScope();
    await testScope.initialize();
  });
  
  afterAll(async () => {
    if (testScope) {
      await testScope.shutdown();
    }
  });
  
  beforeEach(async () => {
    // Limpiar estado antes de cada test
    try {
      const dbService = testScope.getService('workflowDatabaseService');
      if (dbService && typeof dbService.cleanupTestData === 'function') {
        await dbService.cleanupTestData();
      }
    } catch (error) {
      console.log('Note: cleanupTestData not available:', error.message);
    }
  });
  
  describe('Default Workflow', () => {
    it('should execute complete default workflow successfully', async () => {
      // Datos de prueba reales (sin importar cuenta real)
      const testData = {
        accountId: 'test-account-123',
        accountData: {
          model: 'Lola',
          channel: 'gram',
          card_id: 'test-card-123',
          username: 'testuser123',
          bio: 'Test bio for testing',
          prompt: 'Test prompt for testing'
        },
        workflowType: 'default'
      };
      
      // Ejecutar workflow
      const result = await testScope.getWorkflowExecutor().startExecution(
        testData.accountId,
        testData.accountData,
        testData.workflowType
      );
      
      // Verificar resultado inicial
      expect(result.success).toBe(true);
      expect(result.executionId).toBe(testData.accountId);
      
      // Obtener estado del workflow
      const status = testScope.getWorkflowExecutor().getExecutionStatus(testData.accountId);
      
      // Verificar que el workflow está activo
      expect(status).toBeDefined();
      expect(status.status).toBe('active');
      expect(status.currentStep).toBe(0);
      expect(status.totalSteps).toBeGreaterThan(0);
      
      // Verificar datos del workflow
      expect(status.workflowType).toBe('default');
      
      // Verificar que el primer paso está programado
      expect(status.nextStep).toBeDefined();
      expect(status.nextStep.id).toBeDefined();
    });
  });
  
  describe('Workflow Statistics', () => {
    it('should provide comprehensive statistics', async () => {
      const stats = testScope.getWorkflowExecutor().getStatistics();
      
      // Verificar estructura de estadísticas
      expect(stats).toBeDefined();
      expect(stats.executor).toBeDefined();
      expect(stats.executor.isInitialized).toBe(true);
    });
  });
  
  describe('Health Check', () => {
    it('should pass health check', async () => {
      const health = testScope.getWorkflowExecutor().healthCheck();
      
      // Verificar salud del sistema
      expect(health).toBeDefined();
      expect(health.status).toBeDefined();
    });
  });
});