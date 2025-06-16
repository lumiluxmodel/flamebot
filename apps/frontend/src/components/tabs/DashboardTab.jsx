import React, { useEffect, useState } from 'react';
import { useMonitoring } from '../../hooks/useMonitoring';
import { useWorkflows } from '../../hooks/useWorkflows';
import { useAccounts } from '../../hooks/useAccounts';
import LoadingSpinner from '../LoadingSpinner';

const DashboardTab = () => {
  const { 
    dashboardData, 
    alerts, 
    systemHealth, 
    loading: monitoringLoading, 
    startPolling: startMonitoringPolling,
    stopPolling: stopMonitoringPolling,
    getAlertStatistics,
    getSystemHealthSummary,
    refreshAllData
  } = useMonitoring();

  const { 
    statistics: workflowStats, 
    workflows: activeWorkflows,
    loading: workflowLoading,
    startPolling: startWorkflowPolling,
    stopPolling: stopWorkflowPolling,
    getWorkflowsByType
  } = useWorkflows();

  const {
    accounts,
    loading: accountsLoading,
    getAccountsSummary
  } = useAccounts();

  const [refreshing, setRefreshing] = useState(false);

  // Start polling on mount
  useEffect(() => {
    startMonitoringPolling(30000); // Poll every 30 seconds
    startWorkflowPolling(30000);

    return () => {
      stopMonitoringPolling();
      stopWorkflowPolling();
    };
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshAllData();
    } catch (error) {
      console.error('Error refreshing dashboard:', error);
    } finally {
      setRefreshing(false);
    }
  };

  if (monitoringLoading || workflowLoading || accountsLoading) {
    return <LoadingSpinner text="LOADING DASHBOARD DATA..." />;
  }

  // Calculate real-time metrics
  const alertStats = getAlertStatistics();
  const healthSummary = getSystemHealthSummary();
  const accountsSummary = getAccountsSummary();
  
  // Workflow distribution by type
  const workflowDistribution = {};
  if (activeWorkflows && activeWorkflows.length > 0) {
    activeWorkflows.forEach(workflow => {
      const type = workflow.workflowType || 'unknown';
      workflowDistribution[type] = (workflowDistribution[type] || 0) + 1;
    });
  }

  const totalWorkflows = activeWorkflows?.length || 0;

  // Recent alerts (last 5)
  const recentAlerts = alerts?.slice(0, 5) || [];

  // System status color
  const getSystemStatusColor = () => {
    const status = healthSummary.overall;
    switch (status) {
      case 'healthy': return 'success';
      case 'warning': 
      case 'degraded': return 'warning';
      case 'critical': return 'error';
      default: return 'info';
    }
  };

  // Format duration
  const formatDuration = (ms) => {
    if (!ms) return 'N/A';
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  // Format uptime
  const formatUptime = (ms) => {
    if (!ms) return 'N/A';
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));
    const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    return `${days}d ${hours}h`;
  };

  return (
    <>
      {/* System Overview Grid - Real Data */}
      <div className="overview-grid">
        <div className="overview-card">
          <div className="card-header">
            <span className="card-title">SYSTEM OVERVIEW</span>
            <span className={`card-status ${getSystemStatusColor()}`}>
              {healthSummary.overall.toUpperCase()}
            </span>
          </div>
          <div className="card-content">
            <div className="metric-row">
              <span className="metric-label">Active Workflows:</span>
              <span className="metric-value">{totalWorkflows}</span>
            </div>
            <div className="metric-row">
              <span className="metric-label">Total Accounts:</span>
              <span className="metric-value">{accountsSummary.total}</span>
            </div>
            <div className="metric-row">
              <span className="metric-label">Success Rate:</span>
              <span className="metric-value">
                {workflowStats?.executor?.successRate ? 
                  `${Math.round(workflowStats.executor.successRate)}%` : 'N/A'
                }
              </span>
            </div>
            <div className="metric-row">
              <span className="metric-label">System Health:</span>
              <span className="metric-value">{healthSummary.score}%</span>
            </div>
          </div>
        </div>

        <div className="overview-card">
          <div className="card-header">
            <span className="card-title">WORKFLOW DISTRIBUTION</span>
          </div>
          <div className="card-content">
            <div className="workflow-types">
              {Object.entries(workflowDistribution).map(([type, count]) => {
                const percentage = totalWorkflows > 0 ? (count / totalWorkflows) * 100 : 0;
                return (
                  <div key={type} className="workflow-type-bar">
                    <div className="workflow-type-label">{type}</div>
                    <div className="workflow-type-progress">
                      <div 
                        className="workflow-type-fill" 
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                    <div className="workflow-type-count">{count}</div>
                  </div>
                );
              })}
              {Object.keys(workflowDistribution).length === 0 && (
                <div className="workflow-type-bar">
                  <div className="workflow-type-label">No active workflows</div>
                  <div className="workflow-type-progress">
                    <div className="workflow-type-fill" style={{ width: '0%' }}></div>
                  </div>
                  <div className="workflow-type-count">0</div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="overview-card">
          <div className="card-header">
            <span className="card-title">SYSTEM PERFORMANCE</span>
          </div>
          <div className="card-content">
            <div className="metric-row">
              <span className="metric-label">Active Cron Jobs:</span>
              <span className="metric-value">
                {workflowStats?.cronSystem?.activeCronJobs || 0}
              </span>
            </div>
            <div className="metric-row">
              <span className="metric-label">Queued Tasks:</span>
              <span className="metric-value">
                {workflowStats?.taskScheduler?.queuedTasks || 0}
              </span>
            </div>
            <div className="metric-row">
              <span className="metric-label">Avg Execution:</span>
              <span className="metric-value">
                {formatDuration(workflowStats?.executor?.averageExecutionTime)}
              </span>
            </div>
            <div className="metric-row">
              <span className="metric-label">Uptime:</span>
              <span className="metric-value">
                {formatUptime(systemHealth?.uptime)}
              </span>
            </div>
          </div>
        </div>

        <div className="overview-card">
          <div className="card-header">
            <span className="card-title">RECENT ALERTS</span>
            <button className="card-action">View All</button>
          </div>
          <div className="card-content">
            <div className="alerts-list">
              {recentAlerts.length > 0 ? recentAlerts.map((alert, index) => (
                <div key={alert.id || index} className="alert-item">
                  <div className={`alert-severity ${alert.severity}`}>
                    {alert.severity.toUpperCase()}
                  </div>
                  <div className="alert-message">{alert.message}</div>
                  <div className="alert-time">
                    {new Date(alert.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              )) : (
                <div className="alert-item">
                  <div className="alert-severity info">INFO</div>
                  <div className="alert-message">No recent alerts</div>
                  <div className="alert-time">System healthy</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity - Real workflow activity */}
      <div className="panel">
        <div className="panel-header">
          <span>RECENT ACTIVITY</span>
          <button 
            className="panel-action" 
            onClick={handleRefresh}
            disabled={refreshing}
          >
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
        <div className="panel-content">
          <div className="activity-timeline">
            {activeWorkflows && activeWorkflows.length > 0 ? 
              activeWorkflows.slice(0, 10).map((workflow, index) => (
                <div key={workflow.executionId || index} className="activity-item">
                  <div className={`activity-icon ${workflow.status === 'active' ? 'success' : 
                    workflow.status === 'failed' ? 'error' : 'info'}`}>
                    {workflow.status === 'active' ? '⚡' : 
                     workflow.status === 'completed' ? '✓' : 
                     workflow.status === 'failed' ? '✗' : '○'}
                  </div>
                  <div className="activity-content">
                    <div className="activity-description">
                      Account {workflow.accountId} - {workflow.workflowType} workflow {workflow.status}
                    </div>
                    <div className="activity-meta">
                      Progress: {Math.round(workflow.progress || 0)}% | 
                      Step: {workflow.currentStep || 'N/A'}
                    </div>
                  </div>
                  <div className="activity-time">
                    {new Date(workflow.startedAt).toLocaleTimeString()}
                  </div>
                </div>
              )) : (
                <div className="activity-item">
                  <div className="activity-icon info">○</div>
                  <div className="activity-content">
                    <div className="activity-description">No active workflows</div>
                    <div className="activity-meta">System ready for new workflows</div>
                  </div>
                  <div className="activity-time">Now</div>
                </div>
              )
            }
          </div>
        </div>
      </div>
    </>
  );
};

export default DashboardTab;