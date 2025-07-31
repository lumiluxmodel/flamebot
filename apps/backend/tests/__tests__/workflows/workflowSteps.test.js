// tests/__tests__/workflows/workflowSteps.test.js
const workflowExecutor = require('../../../src/services/workflowExecutorV2');

describe('Workflow Steps Tests', () => {
  let testScope;
  let executionService;
  
  beforeAll(async () => {
    testScope = workflowExecutor.createTestScope();
    await testScope.initialize();
    executionService = testScope.getService('workflowExecutionService');
  });
  
  afterAll(async () => {
    if (testScope) {
      await testScope.shutdown();
    }
  });
  
  describe('Wait Step', () => {
    it('should execute wait step correctly', async () => {
      const execution = {
        accountId: 'test-account-wait',
        accountData: {
          model: 'Lola',
          channel: 'gram',
          card_id: 'test-card-wait'
        },
        workflowType: 'default',
        currentStep: 0,
        totalSteps: 3
      };
      
      const stepConfig = {
        id: 'wait_step',
        action: 'wait',
        delay: 1000, // 1 segundo para el test
        description: 'Test wait step'
      };
      
      // Ejecutar paso
      const result = await executionService.executeStepAction(execution, stepConfig);
      
      // Verificar resultado
      expect(result.success).toBe(true);
      expect(result.action).toBe('wait');
      expect(result.waitedMs).toBe(1000);
      expect(result.message).toContain('Waited 1000ms');
    });
  });
  
  describe('Go To Step', () => {
    it('should execute goto step correctly', async () => {
      const execution = {
        accountId: 'test-account-goto',
        accountData: {
          model: 'Lola',
          channel: 'gram',
          card_id: 'test-card-goto'
        },
        workflowType: 'default',
        currentStep: 3,
        totalSteps: 5,
        workflowDef: {
          steps: [
            { id: 'step_1', action: 'wait', delay: 0 },
            { id: 'swipe_10', action: 'swipe', delay: 0, swipeCount: 10 },
            { id: 'step_3', action: 'wait', delay: 0 },
            { id: 'goto_step', action: 'goto', delay: 0, nextStep: 'swipe_10' },
            { id: 'step_5', action: 'wait', delay: 0 }
          ]
        }
      };
      
      const stepConfig = {
        id: 'goto_step',
        action: 'goto',
        delay: 0,
        nextStep: 'swipe_10',
        description: 'Loop back to swipe step'
      };
      
      // Ejecutar paso
      const result = await executionService.executeStepAction(execution, stepConfig);
      
      // Verificar resultado
      expect(result.success).toBe(true);
      expect(result.action).toBe('goto');
      expect(result.nextStep).toBe('swipe_10');
      expect(result.loopCreated).toBe(true);
      expect(result.targetStepIndex).toBe(1); // swipe_10 está en índice 1
      expect(result.description).toBe('Loop back to swipe step');
      
      // Verificar que el currentStep fue actualizado
      expect(execution.currentStep).toBe(1); // Debería haber saltado al índice 1
    });
    
    it('should handle goto with invalid nextStep', async () => {
      const execution = {
        accountId: 'test-account-goto-invalid',
        accountData: {
          model: 'Aura',
          channel: 'snap',
          card_id: 'test-card-goto-invalid'
        },
        workflowType: 'default',
        currentStep: 2,
        totalSteps: 4,
        workflowDef: {
          steps: [
            { id: 'step_1', action: 'wait', delay: 0 },
            { id: 'step_2', action: 'wait', delay: 0 },
            { id: 'goto_invalid', action: 'goto', delay: 0, nextStep: 'non_existent_step' },
            { id: 'step_4', action: 'wait', delay: 0 }
          ]
        }
      };
      
      const stepConfig = {
        id: 'goto_invalid',
        action: 'goto',
        delay: 0,
        nextStep: 'non_existent_step',
        description: 'Invalid goto step'
      };
      
      // Ejecutar paso - debería fallar
      await expect(
        executionService.executeStepAction(execution, stepConfig)
      ).rejects.toThrow('Invalid nextStep: non_existent_step');
    });
    
    it('should handle goto without nextStep parameter', async () => {
      const execution = {
        accountId: 'test-account-goto-missing',
        accountData: {
          model: 'Iris',
          channel: 'of',
          card_id: 'test-card-goto-missing'
        },
        workflowType: 'default',
        currentStep: 1,
        totalSteps: 3,
        workflowDef: {
          steps: [
            { id: 'step_1', action: 'wait', delay: 0 },
            { id: 'goto_missing', action: 'goto', delay: 0 },
            { id: 'step_3', action: 'wait', delay: 0 }
          ]
        }
      };
      
      const stepConfig = {
        id: 'goto_missing',
        action: 'goto',
        delay: 0,
        description: 'Goto without nextStep'
      };
      
      // Ejecutar paso - debería fallar
      await expect(
        executionService.executeStepAction(execution, stepConfig)
      ).rejects.toThrow('nextStep is required for goto action');
    });
  });
  
  describe('Unknown Step', () => {
    it('should handle unknown step action', async () => {
      const execution = {
        accountId: 'test-account-unknown',
        accountData: {
          model: 'Lola',
          channel: 'gram',
          card_id: 'test-card-unknown'
        },
        workflowType: 'default',
        currentStep: 0,
        totalSteps: 2
      };
      
      const stepConfig = {
        id: 'unknown_step',
        action: 'unknown_action',
        delay: 0,
        description: 'Unknown action step'
      };
      
      // Ejecutar paso - debería fallar
      await expect(
        executionService.executeStepAction(execution, stepConfig)
      ).rejects.toThrow('Unknown step action: unknown_action');
    });
  });
});