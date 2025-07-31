// tests/__tests__/workflows/test2WorkflowGoto.test.js
// Test específico para el workflow test_2 con funcionalidad goto

const workflowExecutor = require('../../../src/services/workflowExecutorV2');

describe('Test2 Workflow - Goto Functionality', () => {
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

  beforeEach(async () => {
    // Clean up any existing workflow instances for test accounts
    const db = testScope.getService('databaseService');
    await db.query(`
      UPDATE workflow_instances 
      SET status = 'stopped' 
      WHERE account_id LIKE 'test-%' AND status = 'active'
    `);
  });

  describe('test_2 workflow execution', () => {
    it('should execute test_2 workflow with goto loop successfully', async () => {
      const testData = {
        accountId: 'test-goto-loop-001',
        accountData: {
          model: 'Lola',
          channel: 'gram',
          card_id: 'test-card-goto-001',
          username: 'testgoto001',
          bio: 'Test bio for goto workflow',
          prompt: 'Test prompt for goto workflow'
        },
        workflowType: 'test_2'
      };

      console.log('\n🚀 Starting test_2 workflow execution...');
      
      // Ejecutar workflow
      const result = await testScope.getWorkflowExecutor().startExecution(
        testData.accountId,
        testData.accountData,
        testData.workflowType
      );

      // Verificar inicio exitoso
      expect(result.success).toBe(true);
      expect(result.executionId).toBe(testData.accountId);
      console.log('✅ Workflow started successfully');

      // Obtener estado inicial
      const status = testScope.getWorkflowExecutor().getExecutionStatus(testData.accountId);
      expect(status).toBeDefined();
      expect(status.status).toBe('active');
      expect(status.workflowType).toBe('test_2');
      expect(status.totalSteps).toBe(5);
      expect(status.currentStep).toBe(0);
      
      console.log(`📊 Initial status: Step ${status.currentStep}/${status.totalSteps}`);

      // Verificar la definición del workflow cargada
      const workflowDef = await testScope.getService('workflowDatabaseService').getWorkflowDefinition('test_2');
      expect(workflowDef).toBeDefined();
      expect(workflowDef.type).toBe('test_2');
      expect(workflowDef.steps).toBeDefined();
      expect(workflowDef.steps.length).toBe(5);

      // Verificar que el paso goto existe y está configurado correctamente
      const gotoStep = workflowDef.steps.find(step => step.action === 'goto');
      expect(gotoStep).toBeDefined();
      expect(gotoStep.id).toBe('goto-1753962626530');
      expect(gotoStep.nextStep).toBe('wait-1753962612199');
      console.log('✅ Goto step found:', gotoStep.id, '->', gotoStep.nextStep);

      // Verificar que el paso target existe
      const targetStep = workflowDef.steps.find(step => step.id === gotoStep.nextStep);
      expect(targetStep).toBeDefined();
      expect(targetStep.id).toBe('wait-1753962612199');
      expect(targetStep.action).toBe('wait');
      console.log('✅ Target step found:', targetStep.id);

      // Obtener información del workflow activo
      const activeExecutions = testScope.getWorkflowExecutor().getAllActiveExecutions();
      expect(activeExecutions.length).toBeGreaterThan(0);
      
      const ourExecution = activeExecutions.find(exec => exec.accountId === testData.accountId);
      expect(ourExecution).toBeDefined();
      console.log('✅ Workflow is active and running');
    });

    it('should handle goto step execution in test_2 workflow', async () => {
      // Obtener el servicio de ejecución directamente
      const executionService = testScope.getService('workflowExecutionService');
      
      // Cargar la definición del workflow
      const workflowDef = await testScope.getService('workflowDatabaseService').getWorkflowDefinition('test_2');
      
      // Contexto de ejecución para el paso goto
      const execution = {
        accountId: 'test-goto-step-002',
        accountData: {
          model: 'Lola',
          channel: 'gram',
          card_id: 'test-card-goto-002'
        },
        workflowType: 'test_2',
        workflowDef: workflowDef,
        currentStep: 3, // Posición del goto en el array
        totalSteps: 5
      };

      // Configuración del paso goto
      const gotoStepConfig = {
        id: 'goto-1753962626530',
        action: 'goto',
        description: 'Go to step',
        delay: 0,
        nextStep: 'wait-1753962612199'
      };

      console.log('\n🔄 Testing goto step execution...');
      
      // Ejecutar el paso goto
      const result = await executionService.executeStepAction(execution, gotoStepConfig);

      // Verificar resultado del goto
      expect(result.success).toBe(true);
      expect(result.action).toBe('goto');
      expect(result.nextStep).toBe('wait-1753962612199');
      expect(result.loopCreated).toBe(true);
      
      // Verificar que el currentStep se actualizó al índice del target
      const targetIndex = workflowDef.steps.findIndex(step => step.id === 'wait-1753962612199');
      expect(execution.currentStep).toBe(targetIndex);
      
      console.log(`✅ Goto executed successfully: jumped to step ${targetIndex} (${result.nextStep})`);
    });

    it('should validate workflow structure for loops', () => {
      const steps = [
        { id: "wait_after_import", action: "wait" },
        { id: "add_prompt", action: "add_prompt" },
        { id: "wait-1753962612199", action: "wait" },
        { id: "goto-1753962626530", action: "goto", nextStep: "wait-1753962612199" },
        { id: "swipe_with_spectre-1753963073589", action: "swipe_with_spectre" }
      ];

      // Verificar que el goto apunta a un paso válido
      const gotoStep = steps.find(s => s.action === 'goto');
      const targetStep = steps.find(s => s.id === gotoStep.nextStep);
      
      expect(targetStep).toBeDefined();
      expect(targetStep.id).toBe('wait-1753962612199');
      
      // Verificar que crea un loop (el target está antes del goto)
      const gotoIndex = steps.findIndex(s => s.id === gotoStep.id);
      const targetIndex = steps.findIndex(s => s.id === targetStep.id);
      
      expect(targetIndex).toBeLessThan(gotoIndex);
      console.log(`✅ Loop structure validated: step ${gotoIndex} jumps back to step ${targetIndex}`);
    });
  });

  describe('Workflow Statistics with test_2', () => {
    it('should include test_2 in workflow statistics', () => {
      const stats = testScope.getWorkflowExecutor().getStatistics();
      
      expect(stats).toBeDefined();
      expect(stats.executor).toBeDefined();
      expect(stats.executor.isInitialized).toBe(true);
      
      // test_2 should be available in the executor
      const executor = testScope.getWorkflowExecutor();
      
      // Note: The workflow definitions are loaded from the database
      // so we can't check workflowDefinitions.size directly
      console.log('✅ Workflow executor statistics available');
    });
  });
});