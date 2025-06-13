import React from 'react'
import Panel from '../Panel'
import StatBox from '../StatBox'
import LoadingSpinner from '../LoadingSpinner'
import { useApi } from '../../hooks/useApi'

const DashboardTab = () => {
  const { data: statsData, loading: statsLoading } = useApi('/api/workflows/stats')
  const { data: dashboardData, loading: dashboardLoading } = useApi('/api/workflows/monitoring/dashboard')

  if (statsLoading || dashboardLoading) {
    return <LoadingSpinner text="LOADING DASHBOARD DATA..." />
  }

  const stats = statsData?.data || {}
  const dashboard = dashboardData?.data || {}

  return (
    <div className="dashboard-grid">
      {/* System Overview */}
      <Panel title="SYSTEM OVERVIEW">
        <div className="stats-grid">
          <StatBox label="Active Workflows" value={stats.activeExecutions || 0} />
          <StatBox label="Total Executions" value={stats.totalExecutions || 0} />
          <StatBox label="Success Rate" value={`${Math.round(stats.successRate || 0)}%`} />
          <StatBox label="Avg Duration" value="2.5h" />
        </div>
      </Panel>

      {/* Workflow Distribution */}
      <Panel title="WORKFLOW DISTRIBUTION">
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
      </Panel>

      {/* System Performance */}
      <Panel title="SYSTEM PERFORMANCE">
        <div className="stats-grid">
          <StatBox label="Cron Jobs" value={stats.cronSystem?.totalCronJobs || 0} />
          <StatBox label="Queued Tasks" value={stats.taskScheduler?.queuedTasks || 0} />
          <StatBox label="Memory Usage" value="245MB" />
          <StatBox label="Uptime" value="2d 14h" />
        </div>
      </Panel>

      {/* Recent Alerts */}
      <Panel title="RECENT ALERTS" action={
        <button className="panel-action">View All</button>
      }>
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
      </Panel>

      {/* Recent Activity */}
      <Panel title="RECENT ACTIVITY" className="full-width">
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
      </Panel>
    </div>
  )
}

export default DashboardTab