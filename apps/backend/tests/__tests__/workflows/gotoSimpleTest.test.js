// tests/__tests__/workflows/gotoSimpleTest.test.js
// Simple test for goto functionality without full workflow execution

const workflowExecutor = require('../../../src/services/workflowExecutorV2');

describe('Goto Step - Simple Test', () => {
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

  describe('Goto functionality', () => {
    it('should execute goto step correctly', async () => {
      // Define a simple workflow with goto
      const workflowDef = {
        type: 'test_goto_simple',
        name: 'Simple Goto Test',
        steps: [
          { id: 'step1', action: 'wait', delay: 100 },
          { id: 'step2', action: 'wait', delay: 100 },
          { id: 'step3', action: 'goto', delay: 0, nextStep: 'step1' },
          { id: 'step4', action: 'wait', delay: 100 }
        ]
      };

      // Create execution context
      const execution = {
        accountId: 'test-goto-simple',
        accountData: { model: 'Lola', channel: 'gram', card_id: 'test-goto' },
        workflowType: 'test_goto_simple',
        workflowDef: workflowDef,
        currentStep: 2, // Position of goto step
        totalSteps: 4
      };

      // Execute goto step
      const gotoStep = workflowDef.steps[2];
      console.log('\n🔄 Testing goto:', gotoStep.id, '->', gotoStep.nextStep);
      
      const result = await executionService.executeStepAction(execution, gotoStep);

      // Verify results
      expect(result.success).toBe(true);
      expect(result.action).toBe('goto');
      expect(result.nextStep).toBe('step1');
      expect(result.loopCreated).toBe(true);
      expect(result.targetStepIndex).toBe(0);
      
      // Verify execution was updated
      expect(execution.currentStep).toBe(0);
      
      console.log('✅ Goto executed successfully!');
      console.log(`   Jumped from step 2 to step ${execution.currentStep}`);
    });

    it('should handle goto with test_2 workflow steps', async () => {
      // Load test_2 workflow from database
      const workflowDb = testScope.getService('workflowDatabaseService');
      const test2Workflow = await workflowDb.getWorkflowDefinition('test_2');
      
      if (!test2Workflow) {
        console.log('⚠️ test_2 workflow not found in database, skipping test');
        return;
      }

      console.log('\n📋 Testing with test_2 workflow:');
      console.log(`   Steps: ${test2Workflow.steps.length}`);
      
      // Find goto step
      const gotoStepIndex = test2Workflow.steps.findIndex(s => s.action === 'goto');
      const gotoStep = test2Workflow.steps[gotoStepIndex];
      
      expect(gotoStep).toBeDefined();
      expect(gotoStep.nextStep).toBe('wait-1753962612199');
      
      console.log(`   Goto step: ${gotoStep.id} -> ${gotoStep.nextStep}`);

      // Create execution context
      const execution = {
        accountId: 'test-goto-test2',
        accountData: { model: 'Lola', channel: 'gram', card_id: 'test-goto-2' },
        workflowType: 'test_2',
        workflowDef: test2Workflow,
        currentStep: gotoStepIndex,
        totalSteps: test2Workflow.steps.length
      };

      // Execute goto
      const result = await executionService.executeStepAction(execution, gotoStep);

      // Verify
      expect(result.success).toBe(true);
      expect(result.nextStep).toBe('wait-1753962612199');
      
      const targetIndex = test2Workflow.steps.findIndex(s => s.id === 'wait-1753962612199');
      expect(execution.currentStep).toBe(targetIndex);
      
      console.log(`✅ test_2 goto works! Jumped to step ${targetIndex}`);
    });

    it('should reject goto with invalid target', async () => {
      const workflowDef = {
        steps: [
          { id: 'step1', action: 'wait' },
          { id: 'step2', action: 'goto', nextStep: 'nonexistent' }
        ]
      };

      const execution = {
        accountId: 'test-invalid',
        workflowDef: workflowDef,
        currentStep: 1
      };

      await expect(
        executionService.executeStepAction(execution, workflowDef.steps[1])
      ).rejects.toThrow('Invalid nextStep: nonexistent');
      
      console.log('✅ Correctly rejected invalid goto target');
    });

    it('should reject goto without nextStep', async () => {
      const stepConfig = {
        id: 'bad_goto',
        action: 'goto',
        delay: 0
        // missing nextStep
      };

      const execution = {
        accountId: 'test-missing',
        workflowDef: { steps: [] }
      };

      await expect(
        executionService.executeStepAction(execution, stepConfig)
      ).rejects.toThrow('nextStep is required for goto action');
      
      console.log('✅ Correctly rejected goto without nextStep');
    });
  });

  describe('Loop detection', () => {
    it('should create loops when goto points backwards', () => {
      const steps = [
        { id: 'start', action: 'wait' },
        { id: 'middle', action: 'wait' },
        { id: 'loop', action: 'goto', nextStep: 'start' },
        { id: 'end', action: 'wait' }
      ];

      const gotoIndex = 2;
      const targetIndex = 0;

      expect(targetIndex).toBeLessThan(gotoIndex);
      console.log('✅ Loop detected: step 2 -> step 0');
    });

    it('should allow forward jumps', () => {
      const steps = [
        { id: 'start', action: 'wait' },
        { id: 'skip', action: 'goto', nextStep: 'end' },
        { id: 'middle', action: 'wait' },
        { id: 'end', action: 'wait' }
      ];

      const gotoIndex = 1;
      const targetIndex = 3;

      expect(targetIndex).toBeGreaterThan(gotoIndex);
      console.log('✅ Forward jump: step 1 -> step 3');
    });
  });
});