const accountController = require('../../../src/controllers/accountController');
const flamebotService = require('../../../src/services/flamebotService');
const workflowManager = require('../../../src/services/workflowManager');
const { validateAccountDataWithDB, getAvailableModels } = require('../../../src/utils/formatters');
const { mockRequest, mockResponse } = require('../../__mocks__/express');

// Mock dependencies
jest.mock('../../../src/config', () => require('../../__mocks__/config'));
jest.mock('../../../src/services/flamebotService');
jest.mock('../../../src/services/workflowManager');
jest.mock('../../../src/utils/formatters');

describe('AccountController', () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = mockRequest();
    res = mockResponse();
  });

  describe('importAccount', () => {
    const validAccountData = {
      authToken: 'test-auth-token',
      proxy: 'http://proxy.com',
      model: 'Lola',
      location: '40.7128,-74.0060',
      latitude: '40.7128',
      longitude: '-74.0060',
      refreshToken: 'test-refresh-token',
      deviceId: 'test-device-id',
      persistentId: 'test-persistent-id',
      channel: 'gram'
    };

    beforeEach(() => {
      validateAccountDataWithDB.mockResolvedValue({
        isValid: true,
        errors: [],
        availableModels: ['Lola', 'Aura', 'Ciara', 'Iris']
      });
    });

    it('should successfully import an account', async () => {
      req.body = validAccountData;
      
      flamebotService.importAccount.mockResolvedValueOnce({
        success: true,
        taskId: 'task-123',
        accountId: 'account-456',
        taskStatus: { status: 'COMPLETED' }
      });

      workflowManager.startAccountAutomation.mockResolvedValueOnce({
        success: true
      });

      await accountController.importAccount(req, res);

      expect(validateAccountDataWithDB).toHaveBeenCalledWith({
        authToken: validAccountData.authToken,
        proxy: validAccountData.proxy,
        model: validAccountData.model,
        location: validAccountData.location,
        latitude: validAccountData.latitude,
        longitude: validAccountData.longitude,
        refreshToken: validAccountData.refreshToken,
        deviceId: validAccountData.deviceId,
        persistentId: validAccountData.persistentId,
        channel: validAccountData.channel
      });

      expect(flamebotService.importAccount).toHaveBeenCalledWith(
        expect.objectContaining({
          authToken: validAccountData.authToken,
          model: validAccountData.model,
          channel: validAccountData.channel
        }),
        true
      );

      expect(workflowManager.startAccountAutomation).toHaveBeenCalledWith(
        'account-456',
        expect.objectContaining({
          model: 'Lola',
          channel: 'gram'
        }),
        'default'
      );

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Account imported successfully',
        data: expect.objectContaining({
          accountId: 'account-456',
          taskId: 'task-123',
          model: 'Lola',
          channel: 'gram',
          automation: {
            enabled: true,
            workflowType: 'default',
            started: true,
            error: null
          }
        })
      });
    });

    it('should import account without starting automation', async () => {
      req.body = { ...validAccountData, startAutomation: false };
      
      flamebotService.importAccount.mockResolvedValueOnce({
        success: true,
        taskId: 'task-123',
        accountId: 'account-456'
      });

      await accountController.importAccount(req, res);

      expect(workflowManager.startAccountAutomation).not.toHaveBeenCalled();
      
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            automation: {
              enabled: false,
              workflowType: 'default',
              started: false,
              error: null
            }
          })
        })
      );
    });

    it('should handle validation errors', async () => {
      req.body = { ...validAccountData, model: 'InvalidModel' };
      
      validateAccountDataWithDB.mockResolvedValueOnce({
        isValid: false,
        errors: ['Invalid model: InvalidModel'],
        availableModels: ['Lola', 'Aura', 'Ciara', 'Iris']
      });

      await accountController.importAccount(req, res);

      expect(flamebotService.importAccount).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Validation failed',
        details: ['Invalid model: InvalidModel'],
        availableModels: ['Lola', 'Aura', 'Ciara', 'Iris']
      });
    });

    it('should handle import failure', async () => {
      req.body = validAccountData;
      
      flamebotService.importAccount.mockResolvedValueOnce({
        success: false,
        error: 'Import failed',
        message: 'API error',
        statusCode: 400
      });

      await accountController.importAccount(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Import failed',
        message: 'API error'
      });
    });

    it('should continue if workflow fails to start', async () => {
      req.body = validAccountData;
      
      flamebotService.importAccount.mockResolvedValueOnce({
        success: true,
        taskId: 'task-123',
        accountId: 'account-456'
      });

      workflowManager.startAccountAutomation.mockRejectedValueOnce(
        new Error('Workflow error')
      );

      await accountController.importAccount(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            automation: {
              enabled: true,
              workflowType: 'default',
              started: false,
              error: 'Workflow error'
            }
          })
        })
      );
    });

    it('should parse location from string', async () => {
      req.body = {
        ...validAccountData,
        latitude: undefined,
        longitude: undefined,
        location: '40.7128, -74.0060'
      };

      flamebotService.importAccount.mockResolvedValueOnce({
        success: true,
        taskId: 'task-123',
        accountId: 'account-456'
      });

      await accountController.importAccount(req, res);

      expect(flamebotService.importAccount).toHaveBeenCalledWith(
        expect.objectContaining({
          latitude: '40.7128',
          longitude: '-74.0060'
        }),
        true
      );
    });

    it('should handle alternative field names', async () => {
      req.body = {
        authToken: 'test-auth-token',
        proxy: 'http://proxy.com',
        model: 'Lola',
        location: '40.7128,-74.0060',
        refresh_token: 'test-refresh-token', // alternative name
        device_id: 'test-device-id', // alternative name
        devicePersistentId: 'test-persistent-id', // alternative name
        channel: 'gram'
      };

      flamebotService.importAccount.mockResolvedValueOnce({
        success: true,
        taskId: 'task-123',
        accountId: 'account-456'
      });

      await accountController.importAccount(req, res);

      expect(flamebotService.importAccount).toHaveBeenCalledWith(
        expect.objectContaining({
          refreshToken: 'test-refresh-token',
          deviceId: 'test-device-id',
          persistentId: 'test-persistent-id'
        }),
        true
      );
    });
  });

  describe('importMultipleAccounts', () => {
    const validAccounts = [
      {
        authToken: 'auth1',
        proxy: 'proxy1',
        model: 'Lola',
        location: '40.7128,-74.0060',
        refreshToken: 'refresh1',
        deviceId: 'device1',
        persistentId: 'persistent1',
        channel: 'gram'
      },
      {
        authToken: 'auth2',
        proxy: 'proxy2',
        model: 'Aura',
        location: '34.0522,-118.2437',
        refreshToken: 'refresh2',
        deviceId: 'device2',
        persistentId: 'persistent2',
        channel: 'snap'
      }
    ];

    beforeEach(() => {
      validateAccountDataWithDB.mockResolvedValue({
        isValid: true,
        errors: [],
        availableModels: ['Lola', 'Aura', 'Ciara', 'Iris']
      });
      getAvailableModels.mockResolvedValue(['Lola', 'Aura', 'Ciara', 'Iris']);
    });

    it('should successfully import multiple accounts', async () => {
      req.body = { accounts: validAccounts };

      flamebotService.importMultipleAccounts.mockResolvedValueOnce({
        successful: [
          { accountId: 'acc1', model: 'Lola', authToken: 'auth1' },
          { accountId: 'acc2', model: 'Aura', authToken: 'auth2' }
        ],
        failed: [],
        total: 2,
        taskId: 'bulk-task-123',
        taskStatus: { status: 'COMPLETED', duration: 5000 }
      });

      workflowManager.startAccountAutomation
        .mockResolvedValueOnce({ success: true })
        .mockResolvedValueOnce({ success: true });

      await accountController.importMultipleAccounts(req, res);

      expect(getAvailableModels).toHaveBeenCalled();
      expect(validateAccountDataWithDB).toHaveBeenCalledTimes(2);
      expect(flamebotService.importMultipleAccounts).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ authToken: 'auth1' }),
          expect.objectContaining({ authToken: 'auth2' })
        ])
      );

      expect(workflowManager.startAccountAutomation).toHaveBeenCalledTimes(2);
      
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Imported 2 of 2 accounts',
        data: expect.objectContaining({
          successful: expect.any(Array),
          failed: [],
          total: 2,
          automation: {
            enabled: true,
            workflowType: 'default',
            started: 2,
            failed: 0,
            total: 2
          }
        })
      });
    });

    it('should handle empty accounts array', async () => {
      req.body = { accounts: [] };

      await accountController.importMultipleAccounts(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Accounts array is required and must not be empty'
      });
    });

    it('should handle validation errors for specific accounts', async () => {
      req.body = { accounts: validAccounts };

      validateAccountDataWithDB
        .mockResolvedValueOnce({ isValid: true })
        .mockResolvedValueOnce({
          isValid: false,
          errors: ['Invalid model'],
          availableModels: ['Lola', 'Aura']
        });

      await accountController.importMultipleAccounts(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Account 2 has validation errors',
        details: ['Invalid model'],
        accountIndex: 1,
        availableModels: ['Lola', 'Aura']
      });
    });

    it('should handle partial import success', async () => {
      req.body = { accounts: validAccounts };

      flamebotService.importMultipleAccounts.mockResolvedValueOnce({
        successful: [
          { accountId: 'acc1', model: 'Lola', authToken: 'auth1' }
        ],
        failed: [
          { account: validAccounts[1], error: 'Import failed' }
        ],
        total: 2,
        taskId: 'bulk-task-123'
      });

      workflowManager.startAccountAutomation.mockResolvedValueOnce({ success: true });

      await accountController.importMultipleAccounts(req, res);

      expect(workflowManager.startAccountAutomation).toHaveBeenCalledTimes(1);
      
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            successful: expect.any(Array),
            failed: expect.any(Array),
            automation: {
              enabled: true,
              workflowType: 'default',
              started: 1,
              failed: 0,
              total: 1
            }
          })
        })
      );
    });

    it('should handle no models available', async () => {
      req.body = { accounts: validAccounts };
      getAvailableModels.mockResolvedValueOnce([]);

      await accountController.importMultipleAccounts(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'No models available in database'
      });
    });
  });

  describe('getAccountWorkflowStatus', () => {
    it('should get workflow status for account', async () => {
      req.params = { accountId: 'account-123' };
      
      const mockStatus = {
        accountId: 'account-123',
        status: 'active',
        currentStep: 'bio',
        progress: '2/5'
      };
      
      workflowManager.getAccountWorkflowStatus.mockReturnValueOnce(mockStatus);

      await accountController.getAccountWorkflowStatus(req, res);

      expect(workflowManager.getAccountWorkflowStatus).toHaveBeenCalledWith('account-123');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockStatus
      });
    });

    it('should handle missing account ID', async () => {
      req.params = {};

      await accountController.getAccountWorkflowStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Account ID is required'
      });
    });

    it('should handle workflow not found', async () => {
      req.params = { accountId: 'account-123' };
      workflowManager.getAccountWorkflowStatus.mockReturnValueOnce(null);

      await accountController.getAccountWorkflowStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'No workflow found for this account'
      });
    });
  });

  describe('stopAccountAutomation', () => {
    it('should stop workflow successfully', async () => {
      req.params = { accountId: 'account-123' };
      req.body = { deleteData: false };

      workflowManager.stopAccountAutomation.mockResolvedValueOnce({
        success: true,
        message: 'Workflow stopped'
      });

      await accountController.stopAccountAutomation(req, res);

      expect(workflowManager.stopAccountAutomation).toHaveBeenCalledWith(
        'account-123',
        false
      );
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Workflow stopped',
        data: expect.objectContaining({
          accountId: 'account-123',
          status: 'stopped',
          permanent: true,
          deleted: false
        })
      });
    });

    it('should stop workflow and delete data', async () => {
      req.params = { accountId: 'account-123' };
      req.body = { deleteData: true };

      workflowManager.stopAccountAutomation.mockResolvedValueOnce({
        success: true,
        message: 'Workflow stopped and data deleted'
      });

      await accountController.stopAccountAutomation(req, res);

      expect(workflowManager.stopAccountAutomation).toHaveBeenCalledWith(
        'account-123',
        true
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            deleted: true
          })
        })
      );
    });
  });

  describe('getAllActiveWorkflows', () => {
    it('should return all active workflows', async () => {
      const mockWorkflows = [
        { accountId: 'acc1', status: 'active' },
        { accountId: 'acc2', status: 'active' }
      ];
      const mockStats = {
        active: 2,
        paused: 0,
        stopped: 0,
        total: 2
      };

      workflowManager.getAllActiveWorkflows.mockReturnValueOnce(mockWorkflows);
      workflowManager.getWorkflowStats.mockReturnValueOnce(mockStats);

      await accountController.getAllActiveWorkflows(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          workflows: mockWorkflows,
          stats: mockStats,
          count: 2
        }
      });
    });
  });

  describe('bulkWorkflowOperation', () => {
    it('should pause multiple workflows', async () => {
      req.body = {
        operation: 'pause',
        accountIds: ['acc1', 'acc2', 'acc3']
      };

      workflowManager.pauseMultipleWorkflows.mockResolvedValueOnce({
        success: true,
        successful: ['acc1', 'acc2', 'acc3'],
        failed: [],
        total: 3
      });

      await accountController.bulkWorkflowOperation(req, res);

      expect(workflowManager.pauseMultipleWorkflows).toHaveBeenCalledWith(['acc1', 'acc2', 'acc3']);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          successful: ['acc1', 'acc2', 'acc3']
        })
      );
    });

    it('should handle invalid operation', async () => {
      req.body = {
        operation: 'invalid',
        accountIds: ['acc1']
      };

      await accountController.bulkWorkflowOperation(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid operation: invalid. Valid operations: pause, resume, stop'
      });
    });

    it('should stop multiple workflows individually', async () => {
      req.body = {
        operation: 'stop',
        accountIds: ['acc1', 'acc2']
      };

      workflowManager.stopAccountAutomation
        .mockResolvedValueOnce({ success: true })
        .mockResolvedValueOnce({ success: false, error: 'Failed' });

      await accountController.bulkWorkflowOperation(req, res);

      expect(workflowManager.stopAccountAutomation).toHaveBeenCalledTimes(2);
      expect(res.json).toHaveBeenCalledWith({
        successful: ['acc1'],
        failed: [{ accountId: 'acc2', error: 'Failed' }],
        total: 2,
        success: false,
        message: 'Stopped 1 of 2 workflows'
      });
    });
  });

  describe('getModels', () => {
    it('should return available models from database', async () => {
      getAvailableModels.mockResolvedValueOnce(['Lola', 'Aura', 'Ciara', 'Iris']);

      await accountController.getModels(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          models: ['Lola', 'Aura', 'Ciara', 'Iris'],
          colors: {
            Lola: '#FF69B4',
            Aura: '#9370DB',
            Ciara: '#20B2AA',
            Iris: '#FFD700'
          },
          source: 'database'
        }
      });
    });

    it('should handle database error', async () => {
      getAvailableModels.mockRejectedValueOnce(new Error('DB Error'));

      await accountController.getModels(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to get models from database',
        message: 'DB Error'
      });
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status', async () => {
      flamebotService.healthCheck.mockResolvedValueOnce({ healthy: true });
      workflowManager.getHealthStatus.mockReturnValueOnce({ healthy: true });

      await accountController.healthCheck(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          flamebot: { healthy: true },
          workflows: { healthy: true },
          overall: {
            healthy: true,
            timestamp: expect.any(String)
          }
        }
      });
    });

    it('should return unhealthy status if any service is unhealthy', async () => {
      flamebotService.healthCheck.mockResolvedValueOnce({ healthy: true });
      workflowManager.getHealthStatus.mockReturnValueOnce({ healthy: false });

      await accountController.healthCheck(req, res);

      expect(res.status).toHaveBeenCalledWith(503);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          data: expect.objectContaining({
            overall: expect.objectContaining({
              healthy: false
            })
          })
        })
      );
    });
  });
});