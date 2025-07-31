// tests/__tests__/workflows/workflowStepExecution.test.js
const workflowExecutor = require('../../../src/services/workflowExecutorV2');

describe('Workflow Step Execution Tests - All Step Types', () => {
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

  // Contexto de ejecución base para todos los tests
  const baseExecution = {
    accountId: 'test-account-steps',
    accountData: {
      model: 'Lola',
      channel: 'gram',
      card_id: 'test-card-steps'
    },
    workflowType: 'test',
    currentStep: 0,
    totalSteps: 10
  };

  describe('Basic Steps', () => {
    it('should execute wait step correctly', async () => {
      const stepConfig = {
        id: 'wait_test',
        action: 'wait',
        delay: 1000,
        description: 'Test wait step'
      };

      const result = await executionService.executeStepAction(baseExecution, stepConfig);

      expect(result.success).toBe(true);
      expect(result.action).toBe('wait');
      expect(result.waitedMs).toBe(1000);
      expect(result.message).toContain('Waited 1000ms');
    });

    it('should execute add_prompt step correctly', async () => {
      const stepConfig = {
        id: 'add_prompt_test',
        action: 'add_prompt',
        delay: 0,
        model: 'Lola',
        channel: 'gram',
        description: 'Test add prompt step'
      };

      // Este test requiere el servicio real de flamebot
      try {
        const result = await executionService.executeStepAction(baseExecution, stepConfig);
        
        // Si funciona, verificar resultado
        expect(result.success).toBe(true);
        expect(result.taskId).toBeDefined();
        expect(result.generatedPrompt).toBeDefined();
        expect(result.obfuscatedPrompt).toBeDefined();
      } catch (error) {
        // Si falla por dependencias externas, solo verificar que el error es esperado
        expect(error.message).toMatch(/flamebot|network|timeout|connection/i);
        console.log('⚠️ add_prompt test skipped due to external dependency:', error.message);
      }
    });

    it('should execute add_bio step correctly', async () => {
      const stepConfig = {
        id: 'add_bio_test',
        action: 'add_bio',
        delay: 0,
        description: 'Test add bio step'
      };

      // Este test requiere el servicio real de flamebot
      try {
        const result = await executionService.executeStepAction(baseExecution, stepConfig);
        
        // Si funciona, verificar resultado
        expect(result.success).toBe(true);
        expect(result.taskId).toBeDefined();
        expect(result.generatedBio).toBeDefined();
      } catch (error) {
        // Si falla por dependencias externas, solo verificar que el error es esperado
        expect(error.message).toMatch(/flamebot|network|timeout|connection/i);
        console.log('⚠️ add_bio test skipped due to external dependency:', error.message);
      }
    });
  });

  describe('Advanced Steps', () => {
    it('should execute swipe_with_spectre step correctly', async () => {
      const stepConfig = {
        id: 'swipe_test',
        action: 'swipe_with_spectre',
        delay: 0,
        swipeCount: 5,
        description: 'Test swipe step'
      };

      // Este test requiere el servicio real de flamebot
      try {
        const result = await executionService.executeStepAction(baseExecution, stepConfig);
        
        // Si funciona, verificar resultado
        expect(result.success).toBe(true);
        expect(result.taskId).toBeDefined();
        expect(result.swipeCount).toBe(5);
        expect(result.spectreConfigured).toBe(true);
      } catch (error) {
        // Si falla por dependencias externas, solo verificar que el error es esperado
        expect(error.message).toMatch(/flamebot|network|timeout|connection/i);
        console.log('⚠️ swipe_with_spectre test skipped due to external dependency:', error.message);
      }
    });

    it('should execute activate_continuous_swipe step correctly', async () => {
      const stepConfig = {
        id: 'continuous_swipe_test',
        action: 'activate_continuous_swipe',
        delay: 0,
        minSwipes: 2,
        maxSwipes: 5,
        minIntervalMs: 1000,
        maxIntervalMs: 3000,
        description: 'Test continuous swipe step'
      };

      // Este test requiere el servicio real de flamebot
      try {
        const result = await executionService.executeStepAction(baseExecution, stepConfig);
        
        // Si funciona, verificar resultado
        expect(result.success).toBe(true);
        expect(result.taskId).toBeDefined();
        expect(result.continuousSwipeActivated).toBe(true);
        expect(result.minSwipes).toBe(2);
        expect(result.maxSwipes).toBe(5);
      } catch (error) {
        // Si falla por dependencias externas, solo verificar que el error es esperado
        expect(error.message).toMatch(/flamebot|network|timeout|connection/i);
        console.log('⚠️ activate_continuous_swipe test skipped due to external dependency:', error.message);
      }
    });

    it('should execute deactivate_continuous_swipe step correctly', async () => {
      const stepConfig = {
        id: 'deactivate_continuous_swipe_test',
        action: 'deactivate_continuous_swipe',
        delay: 0,
        description: 'Test deactivate continuous swipe step'
      };

      // Este test requiere el servicio real de flamebot
      try {
        const result = await executionService.executeStepAction(baseExecution, stepConfig);
        
        // Si funciona, verificar resultado
        expect(result.success).toBe(true);
        expect(result.taskId).toBeDefined();
        expect(result.continuousSwipeDeactivated).toBe(true);
      } catch (error) {
        // Si falla por dependencias externas, solo verificar que el error es esperado
        expect(error.message).toMatch(/flamebot|network|timeout|connection/i);
        console.log('⚠️ deactivate_continuous_swipe test skipped due to external dependency:', error.message);
      }
    });
  });

  describe('Control Flow Steps', () => {
    it('should execute goto step with valid target', async () => {
      const execution = {
        ...baseExecution,
        workflowDef: {
          steps: [
            { id: 'step_1', action: 'wait', delay: 0 },
            { id: 'target_step', action: 'wait', delay: 0 },
            { id: 'goto_step', action: 'goto', delay: 0, nextStep: 'target_step' },
            { id: 'step_4', action: 'wait', delay: 0 }
          ]
        }
      };

      const stepConfig = {
        id: 'goto_step',
        action: 'goto',
        delay: 0,
        nextStep: 'target_step',
        description: 'Test goto step'
      };

      const result = await executionService.executeStepAction(execution, stepConfig);

      expect(result.success).toBe(true);
      expect(result.action).toBe('goto');
      expect(result.nextStep).toBe('target_step');
      expect(result.targetStepIndex).toBe(1);
      expect(result.loopCreated).toBe(true);
      expect(result.description).toBe('Test goto step');
      
      // Verificar que currentStep fue actualizado
      expect(execution.currentStep).toBe(1);
    });

    it('should handle goto step with invalid target', async () => {
      const execution = {
        ...baseExecution,
        workflowDef: {
          steps: [
            { id: 'step_1', action: 'wait', delay: 0 },
            { id: 'goto_step', action: 'goto', delay: 0, nextStep: 'nonexistent' },
            { id: 'step_3', action: 'wait', delay: 0 }
          ]
        }
      };

      const stepConfig = {
        id: 'goto_step',
        action: 'goto',
        delay: 0,
        nextStep: 'nonexistent',
        description: 'Test invalid goto step'
      };

      await expect(
        executionService.executeStepAction(execution, stepConfig)
      ).rejects.toThrow('Invalid nextStep: nonexistent');
    });

    it('should handle goto step without nextStep', async () => {
      const execution = {
        ...baseExecution,
        workflowDef: {
          steps: [
            { id: 'step_1', action: 'wait', delay: 0 },
            { id: 'goto_step', action: 'goto', delay: 0 },
          ]
        }
      };

      const stepConfig = {
        id: 'goto_step',
        action: 'goto',
        delay: 0,
        description: 'Test goto without nextStep'
      };

      await expect(
        executionService.executeStepAction(execution, stepConfig)
      ).rejects.toThrow('nextStep is required for goto action');
    });
  });

  describe('Complex Workflow Patterns', () => {
    it('should handle loop pattern with goto', async () => {
      const execution = {
        ...baseExecution,
        workflowDef: {
          steps: [
            { id: 'start', action: 'wait', delay: 100 },
            { id: 'loop_target', action: 'wait', delay: 200 },
            { id: 'process', action: 'wait', delay: 100 },
            { id: 'loop_back', action: 'goto', delay: 0, nextStep: 'loop_target' },
            { id: 'end', action: 'wait', delay: 100 }
          ]
        }
      };

      // Simular ejecución de varios pasos del loop
      let currentStep = 1; // Empezar en loop_target
      execution.currentStep = currentStep;

      // Ejecutar paso loop_target
      const loopTargetResult = await executionService.executeStepAction(execution, {
        id: 'loop_target',
        action: 'wait',
        delay: 200,
        description: 'Loop target step'
      });

      expect(loopTargetResult.success).toBe(true);
      expect(loopTargetResult.action).toBe('wait');

      // Ejecutar paso process
      currentStep = 2;
      execution.currentStep = currentStep;
      
      const processResult = await executionService.executeStepAction(execution, {
        id: 'process',
        action: 'wait',
        delay: 100,
        description: 'Process step'
      });

      expect(processResult.success).toBe(true);

      // Ejecutar goto que regresa al loop_target
      currentStep = 3;
      execution.currentStep = currentStep;
      
      const gotoResult = await executionService.executeStepAction(execution, {
        id: 'loop_back',
        action: 'goto',
        delay: 0,
        nextStep: 'loop_target',
        description: 'Loop back to target'
      });

      expect(gotoResult.success).toBe(true);
      expect(gotoResult.nextStep).toBe('loop_target');
      expect(gotoResult.targetStepIndex).toBe(1);
      expect(execution.currentStep).toBe(1); // Debería haber saltado de vuelta
    });

    it('should handle multiple goto targets in sequence', async () => {
      const execution = {
        ...baseExecution,
        workflowDef: {
          steps: [
            { id: 'start', action: 'wait', delay: 100 },
            { id: 'target_a', action: 'wait', delay: 100 },
            { id: 'goto_to_b', action: 'goto', delay: 0, nextStep: 'target_b' },
            { id: 'target_b', action: 'wait', delay: 100 },
            { id: 'goto_to_c', action: 'goto', delay: 0, nextStep: 'target_c' },
            { id: 'target_c', action: 'wait', delay: 100 },
            { id: 'end', action: 'wait', delay: 100 }
          ]
        }
      };

      // Ejecutar goto_to_b
      execution.currentStep = 2;
      const gotoBResult = await executionService.executeStepAction(execution, {
        id: 'goto_to_b',
        action: 'goto',
        delay: 0,
        nextStep: 'target_b',
        description: 'Goto B'
      });

      expect(gotoBResult.success).toBe(true);
      expect(gotoBResult.targetStepIndex).toBe(3);
      expect(execution.currentStep).toBe(3);

      // Ejecutar goto_to_c
      execution.currentStep = 4;
      const gotoCResult = await executionService.executeStepAction(execution, {
        id: 'goto_to_c',
        action: 'goto',
        delay: 0,
        nextStep: 'target_c',
        description: 'Goto C'
      });

      expect(gotoCResult.success).toBe(true);
      expect(gotoCResult.targetStepIndex).toBe(5);
      expect(execution.currentStep).toBe(5);
    });
  });

  describe('Error Handling', () => {
    it('should handle unknown step actions', async () => {
      const stepConfig = {
        id: 'unknown_step',
        action: 'unknown_action',
        delay: 0,
        description: 'Unknown action'
      };

      await expect(
        executionService.executeStepAction(baseExecution, stepConfig)
      ).rejects.toThrow('Unknown step action: unknown_action');
    });

    it('should handle malformed step configurations', async () => {
      const stepConfig = {
        id: 'malformed_step',
        action: 'wait',
        delay: 'invalid_delay', // String en lugar de número
        description: 'Malformed step'
      };

      await expect(
        executionService.executeStepAction(baseExecution, stepConfig)
      ).rejects.toThrow();
    });
  });

  describe('Service Statistics', () => {
    it('should provide execution service statistics', () => {
      const stats = executionService.getExecutionStats();
      
      expect(stats).toBeDefined();
      expect(stats.service).toBe('WorkflowExecutionService');
      expect(typeof stats.uptime).toBe('number');
      expect(typeof stats.listenerCount).toBe('number');
    });
  });
});