// tests/__tests__/workflows/allWorkflows.test.js
const workflowExecutor = require('../../../src/services/workflowExecutorV2');

describe('All Workflows Tests', () => {
  let testScope;
  
  // Definiciones de workflows para testing (basadas en los ejemplos de la API)
  const testWorkflowDefinitions = {
    basic: {
      name: "Basic Linear Workflow",
      type: "basic",
      description: "Simple workflow without loops or parallel execution",
      steps: [
        {
          id: "wait_30min",
          action: "wait",
          delay: 5000, // Reducido para testing
          description: "Wait 5 seconds after import",
        },
        {
          id: "add_prompt",
          action: "add_prompt",
          delay: 0,
          description: "Add AI-generated prompt",
          critical: true,
        },
        {
          id: "first_swipe",
          action: "swipe_with_spectre",
          delay: 2000, // Reducido para testing
          swipeCount: 5, // Reducido para testing
          description: "First swipe session - 5 swipes",
        },
        {
          id: "add_bio",
          action: "add_bio",
          delay: 3000, // Reducido para testing
          description: "Add bio after 3 seconds",
        },
      ],
    },

    loop_workflow: {
      name: "Workflow with Loop",
      type: "loop_workflow",
      description: "Infinite loop between swipe sessions",
      steps: [
        {
          id: "initial_wait",
          action: "wait",
          delay: 2000, // Reducido para testing
          description: "Wait 2 seconds",
        },
        {
          id: "add_prompt",
          action: "add_prompt",
          delay: 0,
          description: "Add AI prompt",
          critical: true,
        },
        {
          id: "swipe_10",
          action: "swipe_with_spectre",
          delay: 1000, // Reducido para testing
          swipeCount: 3, // Reducido para testing
          description: "Swipe 3 times",
        },
        {
          id: "swipe_20",
          action: "swipe_with_spectre",
          delay: 2000, // Reducido para testing
          swipeCount: 5, // Reducido para testing
          description: "Swipe 5 times",
        },
        {
          id: "loop_back",
          action: "goto",
          delay: 1000, // Reducido para testing
          description: "Wait 1s then loop back",
          nextStep: "swipe_10",
        },
      ],
    },

    parallel_workflow: {
      name: "Workflow with Parallel Steps",
      type: "parallel_workflow",
      description: "Main flow with parallel bio and prompt updates",
      steps: [
        {
          id: "setup",
          action: "wait",
          delay: 1000, // Reducido para testing
          description: "Initial setup wait 1s",
        },
        {
          id: "prompt",
          action: "add_prompt",
          delay: 0,
          description: "Initial prompt",
          critical: true,
        },
        {
          id: "continuous",
          action: "activate_continuous_swipe",
          delay: 500, // Reducido para testing
          minSwipes: 2,
          maxSwipes: 4,
          minIntervalMs: 1000,
          maxIntervalMs: 2000,
          description: "Start continuous swipes",
        },
        // Parallel steps
        {
          id: "bio_2h",
          action: "add_bio",
          delay: 3000, // Reducido para testing (3s en lugar de 2h)
          description: "Bio after 3s (parallel)",
          parallel: true,
        },
        {
          id: "prompt_4h",
          action: "add_prompt",
          delay: 5000, // Reducido para testing (5s en lugar de 4h)
          description: "Update prompt after 5s (parallel)",
          parallel: true,
        },
      ],
    },

    test_quick: {
      name: "Quick Test - Fast testing",
      type: "test_quick", 
      description: "Fast test to verify loop and parallel functionality",
      steps: [
        {
          id: "start",
          action: "wait",
          delay: 500, // 0.5 seconds
          description: "Quick start",
        },
        {
          id: "prompt",
          action: "add_prompt",
          delay: 0,
          description: "Test prompt",
        },
        {
          id: "swipe",
          action: "swipe_with_spectre",
          delay: 1000, // 1 second
          swipeCount: 2,
          description: "Test 2 swipes",
        },
        {
          id: "loop",
          action: "goto",
          delay: 500, // 0.5 seconds before loop
          description: "Loop back to swipe",
          nextStep: "swipe",
        },
        {
          id: "bio_parallel",
          action: "add_bio",
          delay: 2000, // 2 seconds from start
          description: "Bio after 2s (parallel)",
          parallel: true,
        },
      ],
    }
  };

  beforeAll(async () => {
    testScope = workflowExecutor.createTestScope();
    await testScope.initialize();
    
    // Mock las definiciones de workflow en el executor
    const executor = testScope.getWorkflowExecutor();
    executor.workflowDefinitions = new Map();
    
    // Cargar las definiciones de test
    Object.values(testWorkflowDefinitions).forEach(workflowDef => {
      executor.workflowDefinitions.set(workflowDef.type, workflowDef);
    });
  });
  
  afterAll(async () => {
    if (testScope) {
      await testScope.shutdown();
    }
  });

  describe('Basic Linear Workflow', () => {
    it('should execute basic workflow successfully', async () => {
      const testData = {
        accountId: 'test-basic-workflow-001',
        accountData: {
          model: 'Lola',
          channel: 'gram',
          card_id: 'test-card-basic-001',
          username: 'testlola-basic',
          bio: 'Test bio for basic workflow',
          prompt: 'Test prompt for basic workflow'
        },
        workflowType: 'basic'
      };

      // Ejecutar workflow
      const result = await testScope.getWorkflowExecutor().startExecution(
        testData.accountId,
        testData.accountData,
        testData.workflowType
      );

      // Verificaciones
      expect(result.success).toBe(true);
      expect(result.executionId).toBe(testData.accountId);

      // Verificar estado
      const status = testScope.getWorkflowExecutor().getExecutionStatus(testData.accountId);
      expect(status).toBeDefined();
      expect(status.status).toBe('active');
      expect(status.workflowType).toBe('basic');
      expect(status.totalSteps).toBe(4);
      expect(status.currentStep).toBe(0);
    });
  });

  describe('Loop Workflow with Goto', () => {
    it('should execute loop workflow with goto correctly', async () => {
      const testData = {
        accountId: 'test-loop-workflow-002',
        accountData: {
          model: 'Aura',
          channel: 'snap',
          card_id: 'test-card-loop-002',
          username: 'testaura-loop',
          bio: 'Test bio for loop workflow',
          prompt: 'Test prompt for loop workflow'
        },
        workflowType: 'loop_workflow'
      };

      // Ejecutar workflow
      const result = await testScope.getWorkflowExecutor().startExecution(
        testData.accountId,
        testData.accountData,
        testData.workflowType
      );

      // Verificaciones
      expect(result.success).toBe(true);
      expect(result.executionId).toBe(testData.accountId);

      // Verificar estado
      const status = testScope.getWorkflowExecutor().getExecutionStatus(testData.accountId);
      expect(status).toBeDefined();
      expect(status.status).toBe('active');
      expect(status.workflowType).toBe('loop_workflow');
      expect(status.totalSteps).toBe(5);

      // Verificar que tiene steps con goto
      const workflowDef = testScope.getWorkflowExecutor().workflowDefinitions.get('loop_workflow');
      const gotoSteps = workflowDef.steps.filter(step => step.action === 'goto');
      expect(gotoSteps.length).toBe(1);
      expect(gotoSteps[0].nextStep).toBe('swipe_10');
    });
  });

  describe('Parallel Workflow', () => {
    it('should execute parallel workflow correctly', async () => {
      const testData = {
        accountId: 'test-parallel-workflow-003',
        accountData: {
          model: 'Iris',
          channel: 'of',
          card_id: 'test-card-parallel-003',
          username: 'testiris-parallel',
          bio: 'Test bio for parallel workflow',
          prompt: 'Test prompt for parallel workflow'
        },
        workflowType: 'parallel_workflow'
      };

      // Ejecutar workflow
      const result = await testScope.getWorkflowExecutor().startExecution(
        testData.accountId,
        testData.accountData,
        testData.workflowType
      );

      // Verificaciones
      expect(result.success).toBe(true);
      expect(result.executionId).toBe(testData.accountId);

      // Verificar estado
      const status = testScope.getWorkflowExecutor().getExecutionStatus(testData.accountId);
      expect(status).toBeDefined();
      expect(status.status).toBe('active');
      expect(status.workflowType).toBe('parallel_workflow');
      expect(status.totalSteps).toBe(5);

      // Verificar que tiene steps paralelos
      const workflowDef = testScope.getWorkflowExecutor().workflowDefinitions.get('parallel_workflow');
      const parallelSteps = workflowDef.steps.filter(step => step.parallel === true);
      expect(parallelSteps.length).toBe(2);
      expect(parallelSteps.map(s => s.id)).toContain('bio_2h');
      expect(parallelSteps.map(s => s.id)).toContain('prompt_4h');
    });
  });

  describe('Quick Test Workflow', () => {
    it('should execute quick test workflow correctly', async () => {
      const testData = {
        accountId: 'test-quick-workflow-004',
        accountData: {
          model: 'Ciara',
          channel: 'gram',
          card_id: 'test-card-quick-004',
          username: 'testciara-quick',
          bio: 'Test bio for quick workflow',
          prompt: 'Test prompt for quick workflow'
        },
        workflowType: 'test_quick'
      };

      // Ejecutar workflow
      const result = await testScope.getWorkflowExecutor().startExecution(
        testData.accountId,
        testData.accountData,
        testData.workflowType
      );

      // Verificaciones
      expect(result.success).toBe(true);
      expect(result.executionId).toBe(testData.accountId);

      // Verificar estado
      const status = testScope.getWorkflowExecutor().getExecutionStatus(testData.accountId);
      expect(status).toBeDefined();
      expect(status.status).toBe('active');
      expect(status.workflowType).toBe('test_quick');
      expect(status.totalSteps).toBe(5);

      // Verificar que tiene tanto goto como parallel
      const workflowDef = testScope.getWorkflowExecutor().workflowDefinitions.get('test_quick');
      const gotoSteps = workflowDef.steps.filter(step => step.action === 'goto');
      const parallelSteps = workflowDef.steps.filter(step => step.parallel === true);
      
      expect(gotoSteps.length).toBe(1);
      expect(gotoSteps[0].nextStep).toBe('swipe');
      expect(parallelSteps.length).toBe(1);
      expect(parallelSteps[0].id).toBe('bio_parallel');
    });
  });

  describe('Workflow Definitions Validation', () => {
    it('should validate all workflow definitions are properly loaded', () => {
      const executor = testScope.getWorkflowExecutor();
      
      // Verificar que todas las definiciones están cargadas
      expect(executor.workflowDefinitions.size).toBe(4);
      expect(executor.workflowDefinitions.has('basic')).toBe(true);
      expect(executor.workflowDefinitions.has('loop_workflow')).toBe(true);
      expect(executor.workflowDefinitions.has('parallel_workflow')).toBe(true);
      expect(executor.workflowDefinitions.has('test_quick')).toBe(true);
    });

    it('should validate workflow steps have required fields', () => {
      const executor = testScope.getWorkflowExecutor();
      
      executor.workflowDefinitions.forEach((workflowDef, workflowType) => {
        expect(workflowDef.name).toBeDefined();
        expect(workflowDef.type).toBeDefined();
        expect(workflowDef.description).toBeDefined();
        expect(Array.isArray(workflowDef.steps)).toBe(true);
        expect(workflowDef.steps.length).toBeGreaterThan(0);

        workflowDef.steps.forEach((step, index) => {
          expect(step.id).toBeDefined();
          expect(step.action).toBeDefined();
          expect(step.description).toBeDefined();
          expect(typeof step.delay).toBe('number');

          // Validaciones específicas por acción
          if (step.action === 'goto') {
            expect(step.nextStep).toBeDefined();
            // Verificar que el nextStep existe
            const targetStep = workflowDef.steps.find(s => s.id === step.nextStep);
            expect(targetStep).toBeDefined();
          }

          if (step.action === 'swipe_with_spectre') {
            expect(step.swipeCount).toBeDefined();
            expect(typeof step.swipeCount).toBe('number');
            expect(step.swipeCount).toBeGreaterThan(0);
          }

          if (step.action === 'activate_continuous_swipe') {
            expect(step.minSwipes).toBeDefined();
            expect(step.maxSwipes).toBeDefined();
            expect(step.minIntervalMs).toBeDefined();
            expect(step.maxIntervalMs).toBeDefined();
          }
        });
      });
    });
  });

  describe('Multiple Workflows Execution', () => {
    it('should handle multiple concurrent workflow executions', async () => {
      const testAccounts = [
        {
          accountId: 'concurrent-001',
          accountData: {
            model: 'Lola',
            channel: 'gram',
            card_id: 'concurrent-card-001',
            username: 'concurrent-lola',
          },
          workflowType: 'basic'
        },
        {
          accountId: 'concurrent-002',
          accountData: {
            model: 'Aura',
            channel: 'snap',
            card_id: 'concurrent-card-002',
            username: 'concurrent-aura',
          },
          workflowType: 'loop_workflow'
        },
        {
          accountId: 'concurrent-003',
          accountData: {
            model: 'Iris',
            channel: 'of',
            card_id: 'concurrent-card-003',
            username: 'concurrent-iris',
          },
          workflowType: 'test_quick'
        }
      ];

      // Ejecutar múltiples workflows concurrentemente
      const results = await Promise.all(
        testAccounts.map(account =>
          testScope.getWorkflowExecutor().startExecution(
            account.accountId,
            account.accountData,
            account.workflowType
          )
        )
      );

      // Verificar que todos se ejecutaron exitosamente
      results.forEach((result, index) => {
        expect(result.success).toBe(true);
        expect(result.executionId).toBe(testAccounts[index].accountId);
      });

      // Verificar estados activos
      const activeExecutions = testScope.getWorkflowExecutor().getAllActiveExecutions();
      expect(activeExecutions.length).toBe(3);

      // Verificar que cada workflow tiene su estado correcto
      testAccounts.forEach(account => {
        const status = testScope.getWorkflowExecutor().getExecutionStatus(account.accountId);
        expect(status).toBeDefined();
        expect(status.status).toBe('active');
        expect(status.workflowType).toBe(account.workflowType);
      });
    });
  });

  describe('Workflow Statistics', () => {
    it('should provide comprehensive statistics for all workflows', () => {
      const stats = testScope.getWorkflowExecutor().getStatistics();
      
      expect(stats).toBeDefined();
      expect(stats.executor).toBeDefined();
      expect(stats.executor.isInitialized).toBe(true);
      expect(stats.executor.workflowDefinitions).toBe(4);
      
      // Verificar estadísticas de servicios especializados
      expect(stats.execution).toBeDefined();
      expect(stats.scheduling).toBeDefined();
      expect(stats.monitoring).toBeDefined();
      expect(stats.recovery).toBeDefined();
    });
  });
});