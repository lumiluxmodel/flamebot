import React from 'react'
import LoadingSpinner from '../LoadingSpinner'
import { useApi } from '../../hooks/useApi'

const DashboardTab = () => {
  const { data: statsData, loading: statsLoading } = useApi('/api/workflows/stats')
  const { data: dashboardData, loading: dashboardLoading } = useApi('/api/workflows/monitoring/dashboard')

  if (statsLoading || dashboardLoading) {
    return <LoadingSpinner text="LOADING WORKFLOW DATA..." />
  }

  const stats = statsData?.data || {}
  const dashboard = dashboardData?.data || {}

  return (
    <>
      {/* System Overview Grid - Match original design */}
      <div className="overview-grid">
        <div className="overview-card">
          <div className="card-header">
            <span className="card-title">SYSTEM OVERVIEW</span>
            <span className="card-status" id="system-health">HEALTHY</span>
          </div>
          <div className="card-content">
            <div className="metric-row">
              <span className="metric-label">Active Workflows:</span>
              <span className="metric-value">{stats.activeExecutions || 0}</span>
            </div>
            <div className="metric-row">
              <span className="metric-label">Total Executions:</span>
              <span className="metric-value">{stats.totalExecutions || 0}</span>
            </div>
            <div className="metric-row">
              <span className="metric-label">Success Rate:</span>
              <span className="metric-value">{Math.round(stats.successRate || 0)}%</span>
            </div>
            <div className="metric-row">
              <span className="metric-label">Avg Duration:</span>
              <span className="metric-value">2.5h</span>
            </div>
          </div>
        </div>

        <div className="overview-card">
          <div className="card-header">
            <span className="card-title">WORKFLOW DISTRIBUTION</span>
          </div>
          <div className="card-content">
            <div className="workflow-types">
              <div className="workflow-type-bar">
                <div className="workflow-type-label">Default</div>
                <div className="workflow-type-progress">
                  <div className="workflow-type-fill" style={{ width: '70%' }}></div>
                </div>
                <div className="workflow-type-count">14</div>
              </div>
              <div className="workflow-type-bar">
                <div className="workflow-type-label">Aggressive</div>
                <div className="workflow-type-progress">
                  <div className="workflow-type-fill" style={{ width: '20%' }}></div>
                </div>
                <div className="workflow-type-count">4</div>
              </div>
              <div className="workflow-type-bar">
                <div className="workflow-type-label">Test</div>
                <div className="workflow-type-progress">
                  <div className="workflow-type-fill" style={{ width: '10%' }}></div>
                </div>
                <div className="workflow-type-count">2</div>
              </div>
            </div>
          </div>
        </div>

        <div className="overview-card">
          <div className="card-header">
            <span className="card-title">SYSTEM PERFORMANCE</span>
          </div>
          <div className="card-content">
            <div className="metric-row">
              <span className="metric-label">Cron Jobs:</span>
              <span className="metric-value">{stats.cronSystem?.totalCronJobs || 0}</span>
            </div>
            <div className="metric-row">
              <span className="metric-label">Queued Tasks:</span>
              <span className="metric-value">{stats.taskScheduler?.queuedTasks || 0}</span>
            </div>
            <div className="metric-row">
              <span className="metric-label">Memory Usage:</span>
              <span className="metric-value">245MB</span>
            </div>
            <div className="metric-row">
              <span className="metric-label">Uptime:</span>
              <span className="metric-value">2d 14h</span>
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
              <div className="alert-item">
                <div className="alert-severity warning">WARNING</div>
                <div className="alert-message">High queue size detected</div>
                <div className="alert-time">2m ago</div>
              </div>
              <div className="alert-item">
                <div className="alert-severity info">INFO</div>
                <div className="alert-message">Workflow completed successfully</div>
                <div className="alert-time">5m ago</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity - Full Width */}
      <div className="panel">
        <div className="panel-header">
          <span>RECENT ACTIVITY</span>
          <button className="panel-action">Refresh</button>
        </div>
        <div className="panel-content">
          <div className="activity-timeline">
            <div className="activity-item">
              <div className="activity-icon success">✓</div>
              <div className="activity-content">
                <div className="activity-description">Account 684ac67f - Default workflow completed</div>
                <div className="activity-meta">Duration: 2h 15m</div>
              </div>
              <div className="activity-time">3m ago</div>
            </div>
            <div className="activity-item">
              <div className="activity-icon success">✓</div>
              <div className="activity-content">
                <div className="activity-description">Account 684ac2d6 - Prompt added successfully</div>
                <div className="activity-meta">Step: add_prompt</div>
              </div>
              <div className="activity-time">7m ago</div>
            </div>
            <div className="activity-item">
              <div className="activity-icon error">✗</div>
              <div className="activity-content">
                <div className="activity-description">Account 684ac123 - Swipe task failed</div>
                <div className="activity-meta">Error: Rate limit exceeded</div>
              </div>
              <div className="activity-time">12m ago</div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default DashboardTab