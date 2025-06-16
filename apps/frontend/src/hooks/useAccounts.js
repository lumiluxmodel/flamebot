// useAccounts.js - Complete Account Management Hook
import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../services/api';

export const useAccounts = () => {
  const [accounts, setAccounts] = useState([]);
  const [importHistory, setImportHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [models, setModels] = useState([]);
  const [systemHealth, setSystemHealth] = useState(null);
  
  const pollInterval = useRef(null);
  const abortController = useRef(null);

  // ============================
  // ACCOUNT IMPORT METHODS
  // ============================

  const importAccount = useCallback(async (accountData, startWorkflow = true) => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await api.importAccount({
        ...accountData,
        autoStartWorkflow: startWorkflow
      });
      
      if (result.success) {
        // Add to accounts list
        const newAccount = {
          accountId: result.data.accountId,
          ...accountData,
          importedAt: new Date(),
          status: 'imported',
          workflowStatus: startWorkflow ? 'starting' : 'pending'
        };
        
        setAccounts(prev => [...prev, newAccount]);
        
        // Add to import history
        setImportHistory(prev => [
          ...prev.slice(-99), // Keep last 100 imports
          {
            type: 'single',
            accountId: result.data.accountId,
            timestamp: new Date(),
            success: true,
            data: result.data
          }
        ]);
        
        return result;
      } else {
        throw new Error(result.error || 'Failed to import account');
      }
    } catch (error) {
      // Add failed import to history
      setImportHistory(prev => [
        ...prev.slice(-99),
        {
          type: 'single',
          timestamp: new Date(),
          success: false,
          error: error.message,
          data: accountData
        }
      ]);
      
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const importMultipleAccounts = useCallback(async (accountsData, startWorkflows = true) => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await api.importMultipleAccounts({
        accounts: accountsData,
        autoStartWorkflows: startWorkflows
      });
      
      if (result.success) {
        // Add all accounts to list
        const newAccounts = result.data.accounts.map(acc => ({
          ...acc,
          importedAt: new Date(),
          status: 'imported',
          workflowStatus: startWorkflows ? 'starting' : 'pending'
        }));
        
        setAccounts(prev => [...prev, ...newAccounts]);
        
        // Add to import history
        setImportHistory(prev => [
          ...prev.slice(-99),
          {
            type: 'bulk',
            accountCount: accountsData.length,
            successCount: result.data.successCount,
            failedCount: result.data.failedCount,
            timestamp: new Date(),
            success: true,
            data: result.data
          }
        ]);
        
        return result;
      } else {
        throw new Error(result.error || 'Failed to import accounts');
      }
    } catch (error) {
      // Add failed bulk import to history
      setImportHistory(prev => [
        ...prev.slice(-99),
        {
          type: 'bulk',
          accountCount: accountsData.length,
          timestamp: new Date(),
          success: false,
          error: error.message
        }
      ]);
      
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // ============================
  // ACCOUNT WORKFLOW MANAGEMENT
  // ============================

  const getAccountWorkflowStatus = useCallback(async (accountId) => {
    try {
      const result = await api.getAccountWorkflowStatus(accountId);
      
      if (result.success) {
        // Update account workflow status
        setAccounts(prev => prev.map(acc => 
          acc.accountId === accountId 
            ? { ...acc, workflowStatus: result.data.status, workflowData: result.data }
            : acc
        ));
        
        return result;
      } else {
        throw new Error(result.error || 'Failed to get workflow status');
      }
    } catch (error) {
      console.error(`Error getting workflow status for ${accountId}:`, error);
      return null;
    }
  }, []);

  const stopAccountAutomation = useCallback(async (accountId) => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await api.stopAccountAutomation(accountId);
      
      if (result.success) {
        // Update account status
        setAccounts(prev => prev.map(acc => 
          acc.accountId === accountId 
            ? { 
                ...acc, 
                workflowStatus: 'stopped', 
                stoppedAt: new Date() 
              }
            : acc
        ));
        
        return result;
      } else {
        throw new Error(result.error || 'Failed to stop automation');
      }
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const getAllActiveWorkflows = useCallback(async () => {
    try {
      const result = await api.getAllActiveWorkflows();
      
      if (result.success) {
        // Update accounts with workflow data
        const workflows = result.data.workflows || [];
        
        setAccounts(prev => prev.map(acc => {
          const workflow = workflows.find(w => w.accountId === acc.accountId);
          return workflow 
            ? { ...acc, workflowStatus: workflow.status, workflowData: workflow }
            : acc;
        }));
        
        return result;
      } else {
        throw new Error(result.error || 'Failed to get active workflows');
      }
    } catch (error) {
      console.error('Error getting active workflows:', error);
      setError(error.message);
      throw error;
    }
  }, []);

  const pauseAllWorkflows = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await api.pauseAllWorkflows();
      
      if (result.success) {
        // Update all accounts to paused
        setAccounts(prev => prev.map(acc => ({
          ...acc,
          workflowStatus: acc.workflowStatus === 'active' ? 'paused' : acc.workflowStatus
        })));
        
        return result;
      } else {
        throw new Error(result.error || 'Failed to pause all workflows');
      }
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const resumeAllWorkflows = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await api.resumeAllWorkflows();
      
      if (result.success) {
        // Update paused accounts to active
        setAccounts(prev => prev.map(acc => ({
          ...acc,
          workflowStatus: acc.workflowStatus === 'paused' ? 'active' : acc.workflowStatus
        })));
        
        return result;
      } else {
        throw new Error(result.error || 'Failed to resume all workflows');
      }
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // ============================
  // CONVENIENCE METHODS
  // ============================

  const importAccountWithWorkflow = useCallback(async (accountData, workflowType = 'default') => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await api.importAccountWithWorkflow(accountData, workflowType);
      
      if (result.success) {
        // Add account with workflow info
        const newAccount = {
          accountId: result.data.import.accountId,
          ...accountData,
          importedAt: new Date(),
          status: 'imported',
          workflowStatus: 'active',
          workflowType: workflowType,
          workflowData: result.data.workflow
        };
        
        setAccounts(prev => [...prev, newAccount]);
        
        // Add to import history
        setImportHistory(prev => [
          ...prev.slice(-99),
          {
            type: 'single_with_workflow',
            accountId: result.data.import.accountId,
            workflowType: workflowType,
            timestamp: new Date(),
            success: true,
            data: result.data
          }
        ]);
        
        return result;
      } else {
        throw new Error(result.error || 'Failed to import account with workflow');
      }
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // ============================
  // DATA FETCHING
  // ============================

  const fetchModels = useCallback(async () => {
    try {
      const result = await api.getModels();
      
      if (result.success) {
        setModels(result.data.models || []);
        return result;
      } else {
        throw new Error(result.error || 'Failed to fetch models');
      }
    } catch (error) {
      console.error('Error fetching models:', error);
      setError(error.message);
      throw error;
    }
  }, []);

  const fetchAccountsHealth = useCallback(async () => {
    try {
      const result = await api.getAccountsHealth();
      
      if (result.success) {
        setSystemHealth(result.data);
        return result;
      } else {
        throw new Error(result.error || 'Failed to fetch accounts health');
      }
    } catch (error) {
      console.error('Error fetching accounts health:', error);
      setError(error.message);
      throw error;
    }
  }, []);

  const getWorkflowStats = useCallback(async () => {
    try {
      const result = await api.getWorkflowStats();
      
      if (result.success) {
        return result;
      } else {
        throw new Error(result.error || 'Failed to get workflow stats');
      }
    } catch (error) {
      console.error('Error getting workflow stats:', error);
      throw error;
    }
  }, []);

  // ============================
  // POLLING & REAL-TIME UPDATES
  // ============================

  const startPolling = useCallback((interval = 30000) => {
    if (pollInterval.current) return;
    
    // Initial fetch
    getAllActiveWorkflows();
    fetchAccountsHealth();
    
    // Set up polling
    pollInterval.current = setInterval(() => {
      getAllActiveWorkflows();
      fetchAccountsHealth();
    }, interval);
    
    console.log('🔄 Account polling started');
  }, [getAllActiveWorkflows, fetchAccountsHealth]);

  const stopPolling = useCallback(() => {
    if (pollInterval.current) {
      clearInterval(pollInterval.current);
      pollInterval.current = null;
    }
    
    if (abortController.current) {
      abortController.current.abort();
    }
    
    console.log('⏹️ Account polling stopped');
  }, []);

  // Update workflow statuses for specific accounts
  const updateAccountWorkflowStatuses = useCallback(async (accountIds) => {
    if (!accountIds || accountIds.length === 0) return;
    
    try {
      const promises = accountIds.map(id => getAccountWorkflowStatus(id));
      await Promise.allSettled(promises);
    } catch (error) {
      console.error('Error updating account workflow statuses:', error);
    }
  }, [getAccountWorkflowStatus]);

  // ============================
  // UTILITY METHODS
  // ============================

  const getAccountsByStatus = useCallback((status) => {
    return accounts.filter(acc => acc.status === status);
  }, [accounts]);

  const getAccountsByWorkflowStatus = useCallback((workflowStatus) => {
    return accounts.filter(acc => acc.workflowStatus === workflowStatus);
  }, [accounts]);

  const getAccountsByModel = useCallback((model) => {
    return accounts.filter(acc => acc.model === model);
  }, [accounts]);

  const getAccountById = useCallback((accountId) => {
    return accounts.find(acc => acc.accountId === accountId);
  }, [accounts]);

  const removeAccount = useCallback((accountId) => {
    setAccounts(prev => prev.filter(acc => acc.accountId !== accountId));
  }, []);

  const updateAccount = useCallback((accountId, updates) => {
    setAccounts(prev => prev.map(acc => 
      acc.accountId === accountId 
        ? { ...acc, ...updates, updatedAt: new Date() }
        : acc
    ));
  }, []);

  const refreshData = useCallback(async () => {
    try {
      await Promise.all([
        fetchModels(),
        getAllActiveWorkflows(),
        fetchAccountsHealth()
      ]);
    } catch (error) {
      console.error('Error refreshing account data:', error);
    }
  }, [fetchModels, getAllActiveWorkflows, fetchAccountsHealth]);

  // Get summary statistics
  const getAccountsSummary = useCallback(() => {
    const total = accounts.length;
    const active = accounts.filter(acc => acc.workflowStatus === 'active').length;
    const imported = accounts.filter(acc => acc.status === 'imported').length;
    const failed = accounts.filter(acc => acc.workflowStatus === 'failed').length;
    
    const modelDistribution = accounts.reduce((acc, account) => {
      acc[account.model] = (acc[account.model] || 0) + 1;
      return acc;
    }, {});
    
    return {
      total,
      active,
      imported,
      failed,
      success: imported - failed,
      modelDistribution
    };
  }, [accounts]);

  // ============================
  // LIFECYCLE EFFECTS
  // ============================

  useEffect(() => {
    // Initial data load
    refreshData();
    
    // Cleanup on unmount
    return () => {
      stopPolling();
    };
  }, []);

  // Cleanup aborted requests
  useEffect(() => {
    return () => {
      if (abortController.current) {
        abortController.current.abort();
      }
    };
  }, []);

  return {
    // State
    accounts,
    importHistory,
    loading,
    error,
    models,
    systemHealth,
    
    // Account import
    importAccount,
    importMultipleAccounts,
    importAccountWithWorkflow,
    
    // Workflow management
    getAccountWorkflowStatus,
    stopAccountAutomation,
    getAllActiveWorkflows,
    pauseAllWorkflows,
    resumeAllWorkflows,
    updateAccountWorkflowStatuses,
    
    // Data fetching
    fetchModels,
    fetchAccountsHealth,
    getWorkflowStats,
    
    // Polling
    startPolling,
    stopPolling,
    
    // Utilities
    getAccountsByStatus,
    getAccountsByWorkflowStatus,
    getAccountsByModel,
    getAccountById,
    removeAccount,
    updateAccount,
    refreshData,
    getAccountsSummary,
    
    // State setters
    setAccounts,
    setImportHistory,
    setError
  };
}; 