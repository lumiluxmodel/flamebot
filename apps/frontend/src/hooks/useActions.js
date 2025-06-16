// useActions.js - Complete Actions Management Hook
import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../services/api';

export const useActions = () => {
  const [activeTasks, setActiveTasks] = useState([]);
  const [taskHistory, setTaskHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [models, setModels] = useState([]);
  
  const taskPolling = useRef({});
  const abortController = useRef(null);

  // ============================
  // SWIPE ACTIONS
  // ============================

  const startSwipe = useCallback(async (swipeConfig) => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await api.startSwipe(swipeConfig);
      
      if (result.success) {
        // Add to active tasks
        const newTask = {
          taskId: result.data.taskId || `swipe_${Date.now()}`,
          type: 'swipe',
          status: 'active',
          startedAt: new Date(),
          accountId: swipeConfig.accountId,
          config: swipeConfig
        };
        
        setActiveTasks(prev => [...prev, newTask]);
        
        return result;
      } else {
        throw new Error(result.error || 'Failed to start swipe');
      }
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const stopSwipe = useCallback(async (taskId) => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await api.stopSwipe(taskId);
      
      if (result.success) {
        // Update task status
        setActiveTasks(prev => prev.map(task => 
          task.taskId === taskId 
            ? { ...task, status: 'stopped', stoppedAt: new Date() }
            : task
        ));
        
        return result;
      } else {
        throw new Error(result.error || 'Failed to stop swipe');
      }
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const stopAllSwipes = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await api.stopAllSwipes();
      
      if (result.success) {
        // Update all swipe tasks to stopped
        setActiveTasks(prev => prev.map(task => 
          task.type === 'swipe' 
            ? { ...task, status: 'stopped', stoppedAt: new Date() }
            : task
        ));
        
        return result;
      } else {
        throw new Error(result.error || 'Failed to stop all swipes');
      }
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // ============================
  // SPECTRE MODE ACTIONS
  // ============================

  const enableSpectre = useCallback(async (spectreConfig) => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await api.enableSpectre(spectreConfig);
      
      if (result.success) {
        const newTask = {
          taskId: result.data.taskId || `spectre_${Date.now()}`,
          type: 'spectre',
          status: 'configuring',
          startedAt: new Date(),
          accountId: spectreConfig.accountId,
          config: spectreConfig
        };
        
        setActiveTasks(prev => [...prev, newTask]);
        
        return result;
      } else {
        throw new Error(result.error || 'Failed to enable Spectre');
      }
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // ============================
  // BIO ACTIONS
  // ============================

  const updateBio = useCallback(async (bioData) => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await api.updateBio(bioData);
      
      if (result.success) {
        const newTask = {
          taskId: result.data.taskId || `bio_${Date.now()}`,
          type: 'bio_update',
          status: 'active',
          startedAt: new Date(),
          accountId: bioData.accountId,
          config: bioData
        };
        
        setActiveTasks(prev => [...prev, newTask]);
        
        return result;
      } else {
        throw new Error(result.error || 'Failed to update bio');
      }
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const generateAndUpdateBio = useCallback(async (bioConfig) => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await api.generateAndUpdateBio(bioConfig);
      
      if (result.success) {
        const newTask = {
          taskId: result.data.taskId || `bio_generate_${Date.now()}`,
          type: 'bio_generate',
          status: 'generating',
          startedAt: new Date(),
          accountId: bioConfig.accountId,
          config: bioConfig
        };
        
        setActiveTasks(prev => [...prev, newTask]);
        
        return result;
      } else {
        throw new Error(result.error || 'Failed to generate and update bio');
      }
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // ============================
  // PROMPT ACTIONS
  // ============================

  const updatePrompt = useCallback(async (promptData) => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await api.updatePrompt(promptData);
      
      if (result.success) {
        const newTask = {
          taskId: result.data.taskId || `prompt_${Date.now()}`,
          type: 'prompt_update',
          status: 'active',
          startedAt: new Date(),
          accountId: promptData.accountId,
          config: promptData
        };
        
        setActiveTasks(prev => [...prev, newTask]);
        
        return result;
      } else {
        throw new Error(result.error || 'Failed to update prompt');
      }
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const generateAndUpdatePrompt = useCallback(async (promptConfig) => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await api.generateAndUpdatePrompt(promptConfig);
      
      if (result.success) {
        const newTask = {
          taskId: result.data.taskId || `prompt_generate_${Date.now()}`,
          type: 'prompt_generate',
          status: 'generating',
          startedAt: new Date(),
          accountId: promptConfig.accountId,
          config: promptConfig
        };
        
        setActiveTasks(prev => [...prev, newTask]);
        
        return result;
      } else {
        throw new Error(result.error || 'Failed to generate and update prompt');
      }
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // ============================
  // UTILITY METHODS
  // ============================

  const getTasksByType = useCallback((type) => {
    return activeTasks.filter(task => task.type === type);
  }, [activeTasks]);

  const getTasksByStatus = useCallback((status) => {
    return activeTasks.filter(task => task.status === status);
  }, [activeTasks]);

  const getTasksByAccount = useCallback((accountId) => {
    return activeTasks.filter(task => task.accountId === accountId);
  }, [activeTasks]);

  const refreshActiveTasks = useCallback(async () => {
    try {
      const result = await api.getActiveSwipeTasks();
      if (result.success) {
        setActiveTasks(result.data.tasks || []);
      }
    } catch (error) {
      console.error('Error refreshing active tasks:', error);
    }
  }, []);

  const fetchModels = useCallback(async () => {
    try {
      const result = await api.getModels();
      if (result.success) {
        setModels(result.data.models || []);
      }
    } catch (error) {
      console.error('Error fetching models:', error);
    }
  }, []);

  // ============================
  // LIFECYCLE EFFECTS
  // ============================

  useEffect(() => {
    fetchModels();
    refreshActiveTasks();
  }, []);

  return {
    // State
    activeTasks,
    taskHistory,
    loading,
    error,
    models,
    
    // Swipe actions
    startSwipe,
    stopSwipe,
    stopAllSwipes,
    
    // Spectre actions
    enableSpectre,
    
    // Bio actions
    updateBio,
    generateAndUpdateBio,
    
    // Prompt actions
    updatePrompt,
    generateAndUpdatePrompt,
    
    // Utilities
    getTasksByType,
    getTasksByStatus,
    getTasksByAccount,
    refreshActiveTasks,
    fetchModels,
    
    // State setters
    setActiveTasks,
    setTaskHistory,
    setError
  };
}; 