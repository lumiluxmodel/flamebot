const WorkflowManager = require('../../../src/services/workflowManager');

// Mock all dependencies
jest.mock('../../../src/services/workflowExecutor', () => {
  const mockEventEmitter = require('events');
  const mockExecutor = new mockEventEmitter();
  mockExecutor.initialize = jest.fn();
  mockExecutor.startExecution = jest.fn();
  mockExecutor.stopExecution = jest.fn();
  mockExecutor.pauseExecution = jest.fn();
  mockExecutor.resumeExecution = jest.fn();
  mockExecutor.getExecution = jest.fn();
  mockExecutor.getActiveExecutions = jest.fn();
  mockExecutor.getAllExecutions = jest.fn();
  mockExecutor.cleanupCompletedExecutions = jest.fn();
  return mockExecutor;
});

jest.mock('../../../src/services/cronManager', () => {
  const mockEventEmitter = require('events');
  const mockCronManager = new mockEventEmitter();
  mockCronManager.start = jest.fn();
  mockCronManager.stop = jest.fn();
  mockCronManager.scheduleWorkflow = jest.fn();
  mockCronManager.unscheduleWorkflow = jest.fn();
  mockCronManager.pauseAllJobs = jest.fn();
  mockCronManager.resumeAllJobs = jest.fn();
  mockCronManager.getJobStatus = jest.fn();
  mockCronManager.getAllJobs = jest.fn();
  return mockCronManager;
});

jest.mock('../../../src/services/cronMonitor', () => {
  const mockEventEmitter = require('events');
  const mockCronMonitor = new mockEventEmitter();
  mockCronMonitor.start = jest.fn();
  mockCronMonitor.stop = jest.fn();
  mockCronMonitor.getStats = jest.fn();
  return mockCronMonitor;
});

jest.mock('../../../src/services/taskScheduler', () => ({
  scheduleWorkflowTasks: jest.fn(),
  unscheduleAccountTasks: jest.fn(),
  pauseAccountTasks: jest.fn(),
  resumeAccountTasks: jest.fn()
}));

jest.mock('../../../src/services/workflowDatabaseService', () => ({
  createWorkflow: jest.fn(),
  updateWorkflow: jest.fn(),
  getWorkflow: jest.fn(),
  getAllWorkflows: jest.fn(),
  deleteWorkflow: jest.fn()
}));

describe('WorkflowManager', () => {
  let workflowManager;
  let mockExecutor, mockCronManager, mockMonitor, mockTaskScheduler, mockWorkflowDb;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Get references to mocked modules
    mockExecutor = require('../../../src/services/workflowExecutor');
    mockCronManager = require('../../../src/services/cronManager');
    mockMonitor = require('../../../src/services/cronMonitor');
    mockTaskScheduler = require('../../../src/services/taskScheduler');
    mockWorkflowDb = require('../../../src/services/workflowDatabaseService');
    
    // Create new instance for each test
    const WorkflowManagerClass = require('../../../src/services/workflowManager').constructor;
    workflowManager = new WorkflowManagerClass();
  });

  describe('initialization', () => {
    it('should initialize all subsystems successfully', async () => {
      mockExecutor.initialize.mockResolvedValueOnce();
      mockCronManager.start.mockResolvedValueOnce();
      mockMonitor.start.mockResolvedValueOnce();

      const result = await workflowManager.initialize();

      expect(mockExecutor.initialize).toHaveBeenCalled();
      expect(mockCronManager.start).toHaveBeenCalled();
      expect(mockMonitor.start).toHaveBeenCalled();
      expect(result).toEqual({ success: true });
      expect(workflowManager.isInitialized).toBe(true);
    });

    it('should not reinitialize if already initialized', async () => {
      workflowManager.isInitialized = true;

      const result = await workflowManager.initialize();

      expect(mockExecutor.initialize).not.toHaveBeenCalled();
      expect(result).toEqual({ success: true });
    });

    it('should handle initialization errors', async () => {
      const error = new Error('Initialization failed');
      mockExecutor.initialize.mockRejectedValueOnce(error);

      await expect(workflowManager.initialize()).rejects.toThrow('Initialization failed');
      expect(workflowManager.isInitialized).toBe(false);
    });
  });

  describe('shutdown', () => {
    beforeEach(() => {
      workflowManager.isInitialized = true;
    });

    it('should shutdown all subsystems gracefully', async () => {
      mockMonitor.stop.mockResolvedValueOnce();
      mockCronManager.stop.mockResolvedValueOnce();

      await workflowManager.shutdown();

      expect(mockMonitor.stop).toHaveBeenCalled();
      expect(mockCronManager.stop).toHaveBeenCalled();
      expect(workflowManager.isInitialized).toBe(false);
    });

    it('should not shutdown if not initialized', async () => {
      workflowManager.isInitialized = false;

      await workflowManager.shutdown();

      expect(mockMonitor.stop).not.toHaveBeenCalled();
      expect(mockCronManager.stop).not.toHaveBeenCalled();
    });

    it('should handle shutdown errors', async () => {
      const error = new Error('Shutdown failed');
      mockMonitor.stop.mockRejectedValueOnce(error);

      await expect(workflowManager.shutdown()).rejects.toThrow('Shutdown failed');
    });
  });

  describe('startAccountAutomation', () => {
    const mockAccountData = {
      model: 'Lola',
      channel: 'gram',
      authToken: 'test-token',
      importedAt: '2023-01-01T00:00:00.000Z'
    };

    beforeEach(() => {
      workflowManager.isInitialized = true;
    });

    it('should start automation workflow successfully', async () => {
      const mockWorkflow = {
        id: 'workflow-123',
        accountId: 'account-456',
        type: 'default',
        status: 'active'
      };

      mockWorkflowDb.createWorkflow.mockResolvedValueOnce(mockWorkflow);
      mockTaskScheduler.scheduleWorkflowTasks.mockResolvedValueOnce({ success: true });
      mockExecutor.startExecution.mockResolvedValueOnce({ success: true, executionId: 'exec-789' });

      const result = await workflowManager.startAccountAutomation(
        'account-456',
        mockAccountData,
        'default'
      );

      expect(mockWorkflowDb.createWorkflow).toHaveBeenCalledWith({
        accountId: 'account-456',
        type: 'default',
        model: 'Lola',
        channel: 'gram',
        status: 'active',
        config: expect.any(Object),
        metadata: expect.objectContaining({
          authToken: 'test-token',
          importedAt: mockAccountData.importedAt
        })
      });

      expect(mockTaskScheduler.scheduleWorkflowTasks).toHaveBeenCalledWith(
        'account-456',
        expect.any(Object)
      );

      expect(mockExecutor.startExecution).toHaveBeenCalledWith(
        'account-456',
        expect.any(Object)
      );

      expect(result).toEqual({
        success: true,
        workflowId: 'workflow-123',
        executionId: 'exec-789',
        message: 'Automation workflow started successfully'
      });
    });

    it('should fail if not initialized', async () => {
      workflowManager.isInitialized = false;

      await expect(
        workflowManager.startAccountAutomation('account-456', mockAccountData)
      ).rejects.toThrow('Workflow Manager not initialized');
    });

    it('should handle workflow creation failure', async () => {
      mockWorkflowDb.createWorkflow.mockRejectedValueOnce(new Error('DB Error'));

      const result = await workflowManager.startAccountAutomation(
        'account-456',
        mockAccountData
      );

      expect(result).toEqual({
        success: false,
        error: 'Failed to create workflow: DB Error'
      });
    });

    it('should handle task scheduling failure', async () => {
      const mockWorkflow = { id: 'workflow-123' };
      mockWorkflowDb.createWorkflow.mockResolvedValueOnce(mockWorkflow);
      mockTaskScheduler.scheduleWorkflowTasks.mockResolvedValueOnce({ 
        success: false, 
        error: 'Scheduling failed' 
      });

      const result = await workflowManager.startAccountAutomation(
        'account-456',
        mockAccountData
      );

      expect(result).toEqual({
        success: false,
        error: 'Failed to schedule workflow tasks: Scheduling failed'
      });
    });

    it('should handle execution start failure', async () => {
      const mockWorkflow = { id: 'workflow-123' };
      mockWorkflowDb.createWorkflow.mockResolvedValueOnce(mockWorkflow);
      mockTaskScheduler.scheduleWorkflowTasks.mockResolvedValueOnce({ success: true });
      mockExecutor.startExecution.mockResolvedValueOnce({ 
        success: false, 
        error: 'Execution failed' 
      });

      const result = await workflowManager.startAccountAutomation(
        'account-456',
        mockAccountData
      );

      expect(result).toEqual({
        success: false,
        error: 'Failed to start workflow execution: Execution failed'
      });
    });

    it('should use default workflow type', async () => {
      const mockWorkflow = { id: 'workflow-123' };
      mockWorkflowDb.createWorkflow.mockResolvedValueOnce(mockWorkflow);
      mockTaskScheduler.scheduleWorkflowTasks.mockResolvedValueOnce({ success: true });
      mockExecutor.startExecution.mockResolvedValueOnce({ success: true });

      await workflowManager.startAccountAutomation('account-456', mockAccountData);

      expect(mockWorkflowDb.createWorkflow).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'default'
        })
      );
    });

    it('should use custom workflow type', async () => {
      const mockWorkflow = { id: 'workflow-123' };
      mockWorkflowDb.createWorkflow.mockResolvedValueOnce(mockWorkflow);
      mockTaskScheduler.scheduleWorkflowTasks.mockResolvedValueOnce({ success: true });
      mockExecutor.startExecution.mockResolvedValueOnce({ success: true });

      await workflowManager.startAccountAutomation(
        'account-456',
        mockAccountData,
        'aggressive'
      );

      expect(mockWorkflowDb.createWorkflow).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'aggressive'
        })
      );
    });
  });

  describe('stopAccountAutomation', () => {
    beforeEach(() => {
      workflowManager.isInitialized = true;
    });

    it('should stop automation workflow successfully', async () => {
      const mockWorkflow = {
        id: 'workflow-123',
        accountId: 'account-456',
        status: 'active'
      };

      mockWorkflowDb.getWorkflow.mockResolvedValueOnce(mockWorkflow);
      mockExecutor.stopExecution.mockResolvedValueOnce({ success: true });
      mockTaskScheduler.unscheduleAccountTasks.mockResolvedValueOnce({ success: true });
      mockWorkflowDb.updateWorkflow.mockResolvedValueOnce();

      const result = await workflowManager.stopAccountAutomation('account-456', false);

      expect(mockExecutor.stopExecution).toHaveBeenCalledWith('account-456');
      expect(mockTaskScheduler.unscheduleAccountTasks).toHaveBeenCalledWith('account-456');
      expect(mockWorkflowDb.updateWorkflow).toHaveBeenCalledWith('workflow-123', {
        status: 'stopped',
        stoppedAt: expect.any(String)
      });

      expect(result).toEqual({
        success: true,
        message: 'Workflow stopped successfully'
      });
    });

    it('should stop and delete workflow data', async () => {
      const mockWorkflow = {
        id: 'workflow-123',
        accountId: 'account-456',
        status: 'active'
      };

      mockWorkflowDb.getWorkflow.mockResolvedValueOnce(mockWorkflow);
      mockExecutor.stopExecution.mockResolvedValueOnce({ success: true });
      mockTaskScheduler.unscheduleAccountTasks.mockResolvedValueOnce({ success: true });
      mockWorkflowDb.deleteWorkflow.mockResolvedValueOnce();

      const result = await workflowManager.stopAccountAutomation('account-456', true);

      expect(mockWorkflowDb.deleteWorkflow).toHaveBeenCalledWith('workflow-123');
      expect(result).toEqual({
        success: true,
        message: 'Workflow stopped and data deleted successfully'
      });
    });

    it('should handle workflow not found', async () => {
      mockWorkflowDb.getWorkflow.mockResolvedValueOnce(null);

      const result = await workflowManager.stopAccountAutomation('account-456');

      expect(result).toEqual({
        success: false,
        error: 'No workflow found for account account-456'
      });
    });

    it('should handle stop execution failure', async () => {
      const mockWorkflow = { id: 'workflow-123', accountId: 'account-456' };
      mockWorkflowDb.getWorkflow.mockResolvedValueOnce(mockWorkflow);
      mockExecutor.stopExecution.mockResolvedValueOnce({ 
        success: false, 
        error: 'Stop failed' 
      });

      const result = await workflowManager.stopAccountAutomation('account-456');

      expect(result).toEqual({
        success: false,
        error: 'Failed to stop execution: Stop failed'
      });
    });
  });

  describe('pauseAccountWorkflow', () => {
    beforeEach(() => {
      workflowManager.isInitialized = true;
    });

    it('should pause workflow successfully', async () => {
      const mockWorkflow = { id: 'workflow-123', accountId: 'account-456' };
      mockWorkflowDb.getWorkflow.mockResolvedValueOnce(mockWorkflow);
      mockExecutor.pauseExecution.mockResolvedValueOnce({ success: true });
      mockTaskScheduler.pauseAccountTasks.mockResolvedValueOnce({ success: true });
      mockWorkflowDb.updateWorkflow.mockResolvedValueOnce();

      const result = await workflowManager.pauseAccountWorkflow('account-456');

      expect(mockExecutor.pauseExecution).toHaveBeenCalledWith('account-456');
      expect(mockTaskScheduler.pauseAccountTasks).toHaveBeenCalledWith('account-456');
      expect(mockWorkflowDb.updateWorkflow).toHaveBeenCalledWith('workflow-123', {
        status: 'paused',
        pausedAt: expect.any(String)
      });

      expect(result).toEqual({
        success: true,
        message: 'Workflow paused successfully'
      });
    });

    it('should handle workflow not found', async () => {
      mockWorkflowDb.getWorkflow.mockResolvedValueOnce(null);

      const result = await workflowManager.pauseAccountWorkflow('account-456');

      expect(result).toEqual({
        success: false,
        error: 'No workflow found for account account-456'
      });
    });
  });

  describe('resumeAccountWorkflow', () => {
    beforeEach(() => {
      workflowManager.isInitialized = true;
    });

    it('should resume workflow successfully', async () => {
      const mockWorkflow = { id: 'workflow-123', accountId: 'account-456' };
      mockWorkflowDb.getWorkflow.mockResolvedValueOnce(mockWorkflow);
      mockExecutor.resumeExecution.mockResolvedValueOnce({ success: true });
      mockTaskScheduler.resumeAccountTasks.mockResolvedValueOnce({ success: true });
      mockWorkflowDb.updateWorkflow.mockResolvedValueOnce();

      const result = await workflowManager.resumeAccountWorkflow('account-456');

      expect(mockExecutor.resumeExecution).toHaveBeenCalledWith('account-456');
      expect(mockTaskScheduler.resumeAccountTasks).toHaveBeenCalledWith('account-456');
      expect(mockWorkflowDb.updateWorkflow).toHaveBeenCalledWith('workflow-123', {
        status: 'active',
        resumedAt: expect.any(String)
      });

      expect(result).toEqual({
        success: true,
        message: 'Workflow resumed successfully'
      });
    });
  });

  describe('getAccountWorkflowStatus', () => {
    it('should return workflow status', () => {
      const mockExecution = {
        accountId: 'account-456',
        status: 'active',
        currentStep: 'bio',
        progress: { completed: 2, total: 5 }
      };

      mockExecutor.getExecution.mockReturnValueOnce(mockExecution);

      const result = workflowManager.getAccountWorkflowStatus('account-456');

      expect(mockExecutor.getExecution).toHaveBeenCalledWith('account-456');
      expect(result).toEqual(mockExecution);
    });

    it('should return null if workflow not found', () => {
      mockExecutor.getExecution.mockReturnValueOnce(null);

      const result = workflowManager.getAccountWorkflowStatus('account-456');

      expect(result).toBeNull();
    });
  });

  describe('getAllActiveWorkflows', () => {
    it('should return all active workflows', () => {
      const mockExecutions = [
        { accountId: 'acc1', status: 'active' },
        { accountId: 'acc2', status: 'active' }
      ];

      mockExecutor.getActiveExecutions.mockReturnValueOnce(mockExecutions);

      const result = workflowManager.getAllActiveWorkflows();

      expect(mockExecutor.getActiveExecutions).toHaveBeenCalled();
      expect(result).toEqual(mockExecutions);
    });
  });

  describe('getWorkflowStats', () => {
    it('should return workflow statistics', () => {
      const mockExecutions = [
        { status: 'active' },
        { status: 'active' },
        { status: 'paused' },
        { status: 'stopped' }
      ];

      mockExecutor.getAllExecutions.mockReturnValueOnce(mockExecutions);

      const result = workflowManager.getWorkflowStats();

      expect(result).toEqual({
        active: 2,
        paused: 1,
        stopped: 1,
        total: 4
      });
    });

    it('should handle empty executions', () => {
      mockExecutor.getAllExecutions.mockReturnValueOnce([]);

      const result = workflowManager.getWorkflowStats();

      expect(result).toEqual({
        active: 0,
        paused: 0,
        stopped: 0,
        total: 0
      });
    });
  });

  describe('getHealthStatus', () => {
    it('should return healthy status', () => {
      mockMonitor.getStats.mockReturnValueOnce({
        healthy: true,
        activeJobs: 5,
        failedJobs: 0
      });

      const result = workflowManager.getHealthStatus();

      expect(result).toEqual({
        healthy: true,
        initialized: expect.any(Boolean),
        monitor: {
          healthy: true,
          activeJobs: 5,
          failedJobs: 0
        },
        timestamp: expect.any(String)
      });
    });

    it('should return unhealthy status if monitor is unhealthy', () => {
      mockMonitor.getStats.mockReturnValueOnce({
        healthy: false,
        activeJobs: 2,
        failedJobs: 3
      });

      const result = workflowManager.getHealthStatus();

      expect(result.healthy).toBe(false);
    });

    it('should return unhealthy status if not initialized', () => {
      workflowManager.isInitialized = false;
      mockMonitor.getStats.mockReturnValueOnce({ healthy: true });

      const result = workflowManager.getHealthStatus();

      expect(result.healthy).toBe(false);
      expect(result.initialized).toBe(false);
    });
  });

  describe('bulk operations', () => {
    beforeEach(() => {
      workflowManager.isInitialized = true;
    });

    describe('pauseAllWorkflows', () => {
      it('should pause all workflows successfully', async () => {
        mockCronManager.pauseAllJobs.mockResolvedValueOnce();
        mockExecutor.getAllExecutions.mockReturnValueOnce([
          { accountId: 'acc1' },
          { accountId: 'acc2' }
        ]);

        const result = await workflowManager.pauseAllWorkflows();

        expect(mockCronManager.pauseAllJobs).toHaveBeenCalled();
        expect(result).toEqual({
          success: true,
          message: 'All workflows paused successfully',
          count: 2
        });
      });
    });

    describe('resumeAllWorkflows', () => {
      it('should resume all workflows successfully', async () => {
        mockCronManager.resumeAllJobs.mockResolvedValueOnce();
        mockExecutor.getAllExecutions.mockReturnValueOnce([
          { accountId: 'acc1' },
          { accountId: 'acc2' }
        ]);

        const result = await workflowManager.resumeAllWorkflows();

        expect(mockCronManager.resumeAllJobs).toHaveBeenCalled();
        expect(result).toEqual({
          success: true,
          message: 'All workflows resumed successfully',
          count: 2
        });
      });
    });

    describe('pauseMultipleWorkflows', () => {
      it('should pause multiple workflows', async () => {
        const accountIds = ['acc1', 'acc2', 'acc3'];
        
        // Mock successful pause for first two, failure for third
        workflowManager.pauseAccountWorkflow = jest.fn()
          .mockResolvedValueOnce({ success: true })
          .mockResolvedValueOnce({ success: true })
          .mockResolvedValueOnce({ success: false, error: 'Pause failed' });

        const result = await workflowManager.pauseMultipleWorkflows(accountIds);

        expect(workflowManager.pauseAccountWorkflow).toHaveBeenCalledTimes(3);
        expect(result).toEqual({
          success: false,
          successful: ['acc1', 'acc2'],
          failed: [{ accountId: 'acc3', error: 'Pause failed' }],
          total: 3,
          message: 'Paused 2 of 3 workflows'
        });
      });
    });
  });
});