// useMonitoring.js - Complete System Monitoring Hook
import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../services/api';

export const useMonitoring = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [systemHealth, setSystemHealth] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [alertFilters, setAlertFilters] = useState({
    severity: null,
    unacknowledged: false
  });
  
  const pollInterval = useRef(null);
  const abortController = useRef(null);

  // ============================
  // DASHBOARD DATA METHODS
  // ============================

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (abortController.current) {
        abortController.current.abort();
      }
      abortController.current = new AbortController();
      
      const result = await api.getMonitoringDashboard();
      
      if (result.success) {
        setDashboardData(result.data);
        return result;
      } else {
        throw new Error(result.error || 'Failed to fetch dashboard data');
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        setError(error.message);
        console.error('Error fetching dashboard data:', error);
      }
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCompleteDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await api.getDashboardData();
      
      if (result) {
        setDashboardData(result);
        
        // Update system health
        if (result.health) {
          setSystemHealth(result.health);
        }
        
        // Update alerts
        if (result.alerts && result.alerts.alerts) {
          setAlerts(result.alerts.alerts);
        }
        
        return result;
      } else {
        throw new Error('Failed to fetch complete dashboard data');
      }
    } catch (error) {
      setError(error.message);
      console.error('Error fetching complete dashboard data:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // ============================
  // ALERTS MANAGEMENT
  // ============================

  const fetchAlerts = useCallback(async (params = {}) => {
    try {
      setLoading(true);
      setError(null);
      
      const queryParams = {
        ...alertFilters,
        ...params
      };
      
      const result = await api.getSystemAlerts(queryParams);
      
      if (result.success) {
        setAlerts(result.data.alerts || []);
        return result;
      } else {
        throw new Error(result.error || 'Failed to fetch alerts');
      }
    } catch (error) {
      setError(error.message);
      console.error('Error fetching alerts:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [alertFilters]);

  const acknowledgeAlert = useCallback(async (alertId) => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await api.acknowledgeAlert(alertId);
      
      if (result.success) {
        // Update local alerts
        setAlerts(prev => prev.map(alert => 
          alert.id === alertId 
            ? { ...alert, acknowledged: true, acknowledgedAt: new Date() }
            : alert
        ));
        
        return result;
      } else {
        throw new Error(result.error || 'Failed to acknowledge alert');
      }
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const acknowledgeMultipleAlerts = useCallback(async (alertIds) => {
    try {
      setLoading(true);
      setError(null);
      
      const promises = alertIds.map(id => api.acknowledgeAlert(id));
      const results = await Promise.allSettled(promises);
      
      // Update local alerts for successful acknowledgments
      const successfulIds = alertIds.filter((id, index) => 
        results[index].status === 'fulfilled' && results[index].value.success
      );
      
      if (successfulIds.length > 0) {
        setAlerts(prev => prev.map(alert => 
          successfulIds.includes(alert.id) 
            ? { ...alert, acknowledged: true, acknowledgedAt: new Date() }
            : alert
        ));
      }
      
      const failedCount = alertIds.length - successfulIds.length;
      
      return {
        success: true,
        data: {
          acknowledgedCount: successfulIds.length,
          failedCount: failedCount,
          successfulIds: successfulIds
        }
      };
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // ============================
  // SYSTEM HEALTH METHODS
  // ============================

  const fetchSystemHealth = useCallback(async () => {
    try {
      const result = await api.getSystemHealth();
      
      if (result.success) {
        setSystemHealth(result.data);
        return result;
      } else {
        throw new Error(result.error || 'Failed to fetch system health');
      }
    } catch (error) {
      console.error('Error fetching system health:', error);
      setError(error.message);
      throw error;
    }
  }, []);

  const getSystemStatus = useCallback(async () => {
    try {
      const result = await api.getSystemStatus();
      
      if (result) {
        setSystemHealth(result);
        return result;
      } else {
        throw new Error('Failed to get system status');
      }
    } catch (error) {
      console.error('Error getting system status:', error);
      setError(error.message);
      throw error;
    }
  }, []);

  // ============================
  // FILTERING & SEARCH
  // ============================

  const updateAlertFilters = useCallback((newFilters) => {
    setAlertFilters(prev => ({
      ...prev,
      ...newFilters
    }));
  }, []);

  const clearAlertFilters = useCallback(() => {
    setAlertFilters({
      severity: null,
      unacknowledged: false
    });
  }, []);

  const getFilteredAlerts = useCallback((customFilters = {}) => {
    const filters = { ...alertFilters, ...customFilters };
    
    return alerts.filter(alert => {
      // Filter by severity
      if (filters.severity && alert.severity !== filters.severity) {
        return false;
      }
      
      // Filter by acknowledgment status
      if (filters.unacknowledged && alert.acknowledged) {
        return false;
      }
      
      return true;
    });
  }, [alerts, alertFilters]);

  // ============================
  // REAL-TIME POLLING
  // ============================

  const startPolling = useCallback((interval = 30000) => {
    if (pollInterval.current) return;
    
    console.log('🔄 Monitoring polling started');
    
    // Initial fetch
    fetchCompleteDashboardData();
    fetchAlerts();
    
    // Set up polling
    pollInterval.current = setInterval(() => {
      fetchCompleteDashboardData();
      fetchAlerts();
    }, interval);
  }, [fetchCompleteDashboardData, fetchAlerts]);

  const stopPolling = useCallback(() => {
    if (pollInterval.current) {
      clearInterval(pollInterval.current);
      pollInterval.current = null;
    }
    
    if (abortController.current) {
      abortController.current.abort();
    }
    
    console.log('⏹️ Monitoring polling stopped');
  }, []);

  // ============================
  // STATISTICS & ANALYSIS
  // ============================

  const getAlertStatistics = useCallback(() => {
    const total = alerts.length;
    const unacknowledged = alerts.filter(a => !a.acknowledged).length;
    const acknowledged = total - unacknowledged;
    
    const bySeverity = alerts.reduce((acc, alert) => {
      acc[alert.severity] = (acc[alert.severity] || 0) + 1;
      return acc;
    }, {});
    
    const recent = alerts.filter(a => {
      const alertTime = new Date(a.timestamp);
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      return alertTime > oneDayAgo;
    }).length;
    
    return {
      total,
      unacknowledged,
      acknowledged,
      bySeverity,
      recent,
      critical: bySeverity.critical || 0,
      error: bySeverity.error || 0,
      warning: bySeverity.warning || 0,
      info: bySeverity.info || 0
    };
  }, [alerts]);

  const getSystemHealthSummary = useCallback(() => {
    if (!systemHealth) {
      return {
        overall: 'unknown',
        components: {},
        score: 0
      };
    }
    
    const components = systemHealth.components || {};
    const componentStatuses = Object.values(components).map(c => c.healthy);
    const healthyCount = componentStatuses.filter(status => status).length;
    const totalCount = componentStatuses.length;
    const score = totalCount > 0 ? (healthyCount / totalCount) * 100 : 0;
    
    let overall = 'healthy';
    if (score < 50) overall = 'critical';
    else if (score < 80) overall = 'warning';
    else if (score < 100) overall = 'degraded';
    
    return {
      overall,
      components,
      score: Math.round(score),
      healthyComponents: healthyCount,
      totalComponents: totalCount
    };
  }, [systemHealth]);

  const getPerformanceMetrics = useCallback(() => {
    if (!dashboardData) return null;
    
    const workflows = dashboardData.workflowStats || {};
    const monitoring = dashboardData.monitoring || {};
    
    return {
      workflowSuccessRate: workflows.executor?.successRate || 0,
      averageExecutionTime: workflows.executor?.averageExecutionTime || 0,
      systemLoad: {
        activeWorkflows: workflows.executor?.activeExecutions || 0,
        queuedTasks: monitoring.tasks?.queued || 0,
        scheduledTasks: monitoring.cronJobs?.running || 0
      },
      uptime: systemHealth?.uptime || 0,
      lastUpdate: new Date()
    };
  }, [dashboardData, systemHealth]);

  // ============================
  // UTILITY METHODS
  // ============================

  const refreshAllData = useCallback(async () => {
    try {
      await Promise.all([
        fetchCompleteDashboardData(),
        fetchAlerts(),
        fetchSystemHealth()
      ]);
    } catch (error) {
      console.error('Error refreshing monitoring data:', error);
    }
  }, [fetchCompleteDashboardData, fetchAlerts, fetchSystemHealth]);

  const getUnacknowledgedAlerts = useCallback(() => {
    return alerts.filter(alert => !alert.acknowledged);
  }, [alerts]);

  const getCriticalAlerts = useCallback(() => {
    return alerts.filter(alert => alert.severity === 'critical');
  }, [alerts]);

  const getRecentAlerts = useCallback((hours = 24) => {
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
    return alerts.filter(alert => new Date(alert.timestamp) > cutoffTime);
  }, [alerts]);

  const isSystemHealthy = useCallback(() => {
    const summary = getSystemHealthSummary();
    return summary.overall === 'healthy';
  }, [getSystemHealthSummary]);

  const hasUnacknowledgedCriticalAlerts = useCallback(() => {
    return alerts.some(alert => 
      !alert.acknowledged && alert.severity === 'critical'
    );
  }, [alerts]);

  // ============================
  // LIFECYCLE EFFECTS
  // ============================

  useEffect(() => {
    // Initial data load
    refreshAllData();
    
    // Cleanup on unmount
    return () => {
      stopPolling();
    };
  }, []);

  // Re-fetch alerts when filters change
  useEffect(() => {
    fetchAlerts();
  }, [alertFilters]);

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
    dashboardData,
    alerts,
    systemHealth,
    loading,
    error,
    alertFilters,
    
    // Dashboard data
    fetchDashboardData,
    fetchCompleteDashboardData,
    
    // Alerts management
    fetchAlerts,
    acknowledgeAlert,
    acknowledgeMultipleAlerts,
    updateAlertFilters,
    clearAlertFilters,
    getFilteredAlerts,
    
    // System health
    fetchSystemHealth,
    getSystemStatus,
    
    // Polling
    startPolling,
    stopPolling,
    
    // Statistics & analysis
    getAlertStatistics,
    getSystemHealthSummary,
    getPerformanceMetrics,
    
    // Utilities
    refreshAllData,
    getUnacknowledgedAlerts,
    getCriticalAlerts,
    getRecentAlerts,
    isSystemHealthy,
    hasUnacknowledgedCriticalAlerts,
    
    // State setters
    setDashboardData,
    setAlerts,
    setSystemHealth,
    setError
  };
}; 