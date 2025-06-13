import React from 'react'
import Panel from '../Panel'
import LoadingSpinner from '../LoadingSpinner'
import { useApi } from '../../hooks/useApi'

const MonitoringTab = () => {
  const { data: monitoringData, loading } = useApi('/api/workflows/monitoring/dashboard')

  if (loading) {
    return <LoadingSpinner text="LOADING MONITORING DATA..." />
  }

  const monitoring = monitoringData?.data || {}

  return (
    <div className="monitoring-grid">
      {/* System Health */}
      <Panel title="SYSTEM HEALTH">
        <div className="health-components">
          <div className="health-component">
            <span className="component-name">Workflow Executor</span>
            <div className="component-status">
              <div className="component-indicator healthy"></div>
              <span className="component-text text-success">Online</span>
            </div>
          </div>
          <div className="health-component">
            <span className="component-name">Cron Manager</span>
            <div className="component-status">
              <div className="component-indicator healthy"></div>
              <span className="component-text text-success">Online</span>
            </div>
          </div>
          <div className="health-component">
            <span className="component-name">Task Scheduler</span>
            <div className="component-status">
              <div className="component-indicator healthy"></div>
              <span className="component-text text-success">Online</span>
            </div>
          </div>
          <div className="health-component">
            <span className="component-name">Database</span>
            <div className="component-status">
              <div className="component-indicator healthy"></div>
              <span className="component-text text-success">Online</span>
            </div>
          </div>
        </div>
      </Panel>

      {/* Performance Metrics */}
      <Panel title="PERFORMANCE METRICS">
        <div className="metrics-chart">
          <div className="metric-row">
            <span className="metric-label">CPU Usage:</span>
            <span className="metric-value">23%</span>
          </div>
          <div className="metric-row">
            <span className="metric-label">Memory Usage:</span>
            <span className="metric-value">245MB</span>
          </div>
          <div className="metric-row">
            <span className="metric-label">Active Connections:</span>
            <span className="metric-value">12</span>
          </div>
          <div className="metric-row">
            <span className="metric-label">Response Time:</span>
            <span className="metric-value">45ms</span>
          </div>
        </div>
      </Panel>

      {/* System Alerts */}
      <Panel 
        title="SYSTEM ALERTS" 
        className="full-width"
        action={
          <div className="alert-controls">
            <button className="btn btn-sm">Acknowledge All</button>
            <button className="btn btn-sm">Critical Only</button>
          </div>
        }
      >
        <div className="alerts-table">
          <table>
            <thead>
              <tr>
                <th>Severity</th>
                <th>Message</th>
                <th>Time</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <span className="alert-severity warning">WARNING</span>
                </td>
                <td>High queue size detected: 85 tasks</td>
                <td>2m ago</td>
                <td>
                  <button className="workflow-action-btn">✓ Ack</button>
                </td>
              </tr>
              <tr>
                <td>
                  <span className="alert-severity info">INFO</span>
                </td>
                <td>Daily maintenance completed successfully</td>
                <td>1h ago</td>
                <td>
                  <button className="workflow-action-btn">✓ Ack</button>
                </td>
              </tr>
              <tr>
                <td>
                  <span className="alert-severity error">ERROR</span>
                </td>
                <td>Failed to connect to external API</td>
                <td>3h ago</td>
                <td>
                  <button className="workflow-action-btn">✓ Ack</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  )
}

export default MonitoringTab