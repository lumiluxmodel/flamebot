// useWorkflows.js - Complete Workflow Management Hook
import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../services/api';

export const useWorkflows = () => {
  const [workflows, setWorkflows] = useState([]);
  const [definitions, setDefinitions] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activePolling, setActivePolling] = useState(false);
  
  const pollInterval = useRef(null);
  const abortController = useRef(null);

  // ============================
  // WORKFLOW EXECUTION METHODS
  // ============================

  const startWorkflow = useCallback(async (workflowData) => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await api.startWorkflow(workflowData);
      
      if (result.success) {
        // Refresh workflows list
        await fetchActiveWorkflows();
        return result;
      } else {
        throw new Error(result.error || 'Failed to start workflow');
      }
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const stopWorkflow = useCallback(async (accountId) => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await api.stopWorkflow(accountId);
      
      if (result.success) {
        // Update local state
        setWorkflows(prev => prev.map(w => 
          w.accountId === accountId 
            ? { ...w, status: 'stopped', stoppedAt: new Date() }
            : w
        ));
        return result;
      } else {
        throw new Error(result.error || 'Failed to stop workflow');
      }
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const getWorkflowStatus = useCallback(async (accountId) => {
    try {
      const result = await api.getWorkflowStatus(accountId);
      return result;
    } catch (error) {
      console.error('Error getting workflow status:', error);
      return null;
    }
  }, []);

  // ============================
  // DATA FETCHING METHODS
  // ============================

  const fetchActiveWorkflows = useCallback(async (params = {}) => {
    try {
      setLoading(true);
      setError(null);
      
      if (abortController.current) {
        abortController.current.abort();
      }
      abortController.current = new AbortController();
      
      const result = await api.getActiveWorkflows(params);
      
      if (result.success) {
        setWorkflows(result.data.executions || []);
        return result;
      } else {
        throw new Error(result.error || 'Failed to fetch workflows');
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        setError(error.message);
      }
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchWorkflowDefinitions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await api.getWorkflowDefinitions();
      
      if (result.success) {
        setDefinitions(result.data.definitions || []);
        return result;
      } else {
        throw new Error(result.error || 'Failed to fetch definitions');
      }
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchWorkflowStatistics = useCallback(async () => {
    try {
      const result = await api.getWorkflowStatistics();
      
      if (result.success) {
        setStatistics(result.data);
        return result;
      } else {
        throw new Error(result.error || 'Failed to fetch statistics');
      }
    } catch (error) {
      console.error('Error fetching workflow statistics:', error);
      setError(error.message);
      throw error;
    }
  }, []);

  // ============================
  // WORKFLOW DEFINITION METHODS
  // ============================

  const createWorkflowDefinition = useCallback(async (definitionData) => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await api.createWorkflowDefinition(definitionData);
      
      if (result.success) {
        // Refresh definitions
        await fetchWorkflowDefinitions();
        return result;
      } else {
        throw new Error(result.error || 'Failed to create workflow definition');
      }
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [fetchWorkflowDefinitions]);

  const updateWorkflowDefinition = useCallback(async (type, updateData) => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await api.updateWorkflowDefinition(type, updateData);
      
      if (result.success) {
        // Update local definitions
        setDefinitions(prev => prev.map(def => 
          def.type === type 
            ? { ...def, ...updateData, version: result.data.version }
            : def
        ));
        return result;
      } else {
        throw new Error(result.error || 'Failed to update workflow definition');
      }
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteWorkflowDefinition = useCallback(async (type) => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await api.deleteWorkflowDefinition(type);
      
      if (result.success) {
        // Remove from local definitions
        setDefinitions(prev => prev.filter(def => def.type !== type));
        return result;
      } else {
        throw new Error(result.error || 'Failed to delete workflow definition');
      }
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const toggleWorkflowStatus = useCallback(async (type, active) => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await api.toggleWorkflowStatus(type, active);
      
      if (result.success) {
        // Update local definitions
        setDefinitions(prev => prev.map(def => 
          def.type === type 
            ? { ...def, isActive: active }
            : def
        ));
        return result;
      } else {
        throw new Error(result.error || 'Failed to toggle workflow status');
      }
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const cloneWorkflowDefinition = useCallback(async (type, cloneData) => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await api.cloneWorkflowDefinition(type, cloneData);
      
      if (result.success) {
        // Refresh definitions to include the new clone
        await fetchWorkflowDefinitions();
        return result;
      } else {
        throw new Error(result.error || 'Failed to clone workflow definition');
      }
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [fetchWorkflowDefinitions]);

  // ============================
  // SYSTEM CONTROL METHODS
  // ============================

  const pauseAllWorkflows = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await api.pauseAllWorkflowsSystem();
      
      if (result.success) {
        // Update all workflows to paused status
        setWorkflows(prev => prev.map(w => ({ ...w, status: 'paused' })));
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
      
      const result = await api.resumeAllWorkflowsSystem();
      
      if (result.success) {
        // Refresh workflows to get current status
        await fetchActiveWorkflows();
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
  }, [fetchActiveWorkflows]);

  // ============================
  // REAL-TIME POLLING
  // ============================

  const startPolling = useCallback((interval = 30000) => {
    if (activePolling) return;
    
    setActivePolling(true);
    
    // Initial fetch
    fetchActiveWorkflows();
    fetchWorkflowStatistics();
    
    // Set up polling
    pollInterval.current = setInterval(() => {
      fetchActiveWorkflows();
      fetchWorkflowStatistics();
    }, interval);
    
    console.log('🔄 Workflow polling started');
  }, [activePolling, fetchActiveWorkflows, fetchWorkflowStatistics]);

  const stopPolling = useCallback(() => {
    if (pollInterval.current) {
      clearInterval(pollInterval.current);
      pollInterval.current = null;
    }
    
    if (abortController.current) {
      abortController.current.abort();
    }
    
    setActivePolling(false);
    console.log('⏹️ Workflow polling stopped');
  }, []);

  // ============================
  // UTILITY METHODS
  // ============================

  const getWorkflowsByStatus = useCallback((status) => {
    return workflows.filter(w => w.status === status);
  }, [workflows]);

  const getWorkflowsByType = useCallback((type) => {
    return workflows.filter(w => w.workflowType === type);
  }, [workflows]);

  const refreshData = useCallback(async () => {
    try {
      await Promise.all([
        fetchActiveWorkflows(),
        fetchWorkflowDefinitions(),
        fetchWorkflowStatistics()
      ]);
    } catch (error) {
      console.error('Error refreshing workflow data:', error);
    }
  }, [fetchActiveWorkflows, fetchWorkflowDefinitions, fetchWorkflowStatistics]);

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
    workflows,
    definitions,
    statistics,
    loading,
    error,
    activePolling,
    
    // Workflow execution
    startWorkflow,
    stopWorkflow,
    getWorkflowStatus,
    
    // Data fetching
    fetchActiveWorkflows,
    fetchWorkflowDefinitions,
    fetchWorkflowStatistics,
    
    // Workflow definitions
    createWorkflowDefinition,
    updateWorkflowDefinition,
    deleteWorkflowDefinition,
    toggleWorkflowStatus,
    cloneWorkflowDefinition,
    
    // System control
    pauseAllWorkflows,
    resumeAllWorkflows,
    
    // Polling
    startPolling,
    stopPolling,
    
    // Utilities
    getWorkflowsByStatus,
    getWorkflowsByType,
    refreshData,
    
    // State setters (for external updates)
    setWorkflows,
    setDefinitions,
    setStatistics,
    setError
  };
}; 