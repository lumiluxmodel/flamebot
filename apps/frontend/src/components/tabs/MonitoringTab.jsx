import React, { useState, useEffect } from 'react'
import LoadingSpinner from '../LoadingSpinner'
import { useApi } from '../../hooks/useApi'

const MonitoringTab = () => {
  const [selectedTimeRange, setSelectedTimeRange] = useState('1h')
  const [showCriticalOnly, setShowCriticalOnly] = useState(false)
  
  const { data: healthData, loading: healthLoading } = useApi('/api/accounts/health')
  const { data: statsData } = useApi('/api/workflows/stats')

  // Mock system health data
  const systemHealth = {
    overall: 'healthy',
    components: [
      { name: 'API Server', status: 'healthy', uptime: '99.9%', responseTime: '45ms' },
      { name: 'Database', status: 'healthy', uptime: '99.8%', responseTime: '12ms' },
      { name: 'Workflow Engine', status: 'healthy', uptime: '99.7%', responseTime: '23ms' },
      { name: 'AI Service', status: 'warning', uptime: '98.5%', responseTime: '156ms' },
      { name: 'Queue System', status: 'healthy', uptime: '99.9%', responseTime: '8ms' }
    ]
  }

  // Mock performance metrics
  const performanceMetrics = [
    { name: 'CPU Usage', value: 45, max: 100, unit: '%', status: 'healthy' },
    { name: 'Memory Usage', value: 2.8, max: 8, unit: 'GB', status: 'healthy' },
    { name: 'Disk Usage', value: 156, max: 500, unit: 'GB', status: 'healthy' },
    { name: 'Network I/O', value: 12.5, max: 100, unit: 'MB/s', status: 'healthy' },
    { name: 'Active Connections', value: 43, max: 1000, unit: '', status: 'healthy' },
    { name: 'Queue Size', value: 8, max: 100, unit: 'tasks', status: 'healthy' }
  ]

  // Mock alerts data
  const alerts = [
    {
      id: 'alert_001',
      severity: 'warning',
      title: 'High Response Time Detected',
      message: 'AI Service response time exceeded 150ms threshold',
      timestamp: new Date(Date.now() - 10 * 60 * 1000),
      source: 'AI Service',
      acknowledged: false
    },
    {
      id: 'alert_002',
      severity: 'info',
      title: 'Workflow Completed Successfully',
      message: 'Account 684ac67f completed default workflow',
      timestamp: new Date(Date.now() - 25 * 60 * 1000),
      source: 'Workflow Engine',
      acknowledged: true
    },
    {
      id: 'alert_003',
      severity: 'error',
      title: 'Rate Limit Exceeded',
      message: 'Account 684ac123 hit rate limit during swipe task',
      timestamp: new Date(Date.now() - 45 * 60 * 1000),
      source: 'Actions Service',
      acknowledged: false
    },
    {
      id: 'alert_004',
      severity: 'critical',
      title: 'Database Connection Lost',
      message: 'Temporary connection loss to primary database',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      source: 'Database',
      acknowledged: true
    }
  ]

  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy': return '#00ff00'
      case 'warning': return '#ffff00'
      case 'error': return '#ff0040'
      case 'critical': return '#ff0040'
      default: return '#666666'
    }
  }

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'info': return '#00ffff'
      case 'warning': return '#ffff00'
      case 'error': return '#ff0040'
      case 'critical': return '#ff0040'
      default: return '#666666'
    }
  }

  const formatTimeAgo = (timestamp) => {
    const now = new Date()
    const diff = now - timestamp
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(minutes / 60)
    
    if (hours > 0) return `${hours}h ago`
    return `${minutes}m ago`
  }

  const handleAcknowledgeAlert = (alertId) => {
    console.log('Acknowledging alert:', alertId)
    // TODO: Implement API call
  }

  const handleAcknowledgeAll = () => {
    console.log('Acknowledging all alerts')
    // TODO: Implement API call
  }

  if (healthLoading) {
    return <LoadingSpinner text="LOADING SYSTEM MONITORING..." />
  }

  const filteredAlerts = showCriticalOnly 
    ? alerts.filter(alert => alert.severity === 'critical' || alert.severity === 'error')
    : alerts

  return (
    <>
      {/* System Health Dashboard */}
      <div className="monitoring-grid">
        {/* System Health Card */}
        <div className="monitoring-card">
          <div className="card-header">
            <span className="card-title">SYSTEM HEALTH</span>
            <div 
              className="health-indicator"
              style={{ backgroundColor: getStatusColor(systemHealth.overall) }}
            >
              ●
            </div>
          </div>
          <div className="card-content">
            <div className="health-components">
              {systemHealth.components.map((component, index) => (
                <div key={index} className="health-component">
                  <div className="component-header">
                    <span className="component-name">{component.name}</span>
                    <div 
                      className="component-status"
                      style={{ color: getStatusColor(component.status) }}
                    >
                      {component.status.toUpperCase()}
                    </div>
                  </div>
                  <div className="component-metrics">
                    <div className="component-metric">
                      <span className="metric-label">Uptime:</span>
                      <span className="metric-value">{component.uptime}</span>
                    </div>
                    <div className="component-metric">
                      <span className="metric-label">Response:</span>
                      <span className="metric-value">{component.responseTime}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Performance Metrics Card */}
        <div className="monitoring-card">
          <div className="card-header">
            <span className="card-title">PERFORMANCE METRICS</span>
            <select 
              className="time-range-select"
              value={selectedTimeRange}
              onChange={(e) => setSelectedTimeRange(e.target.value)}
            >
              <option value="1h">Last Hour</option>
              <option value="6h">Last 6 Hours</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
            </select>
          </div>
          <div className="card-content">
            <div className="metrics-grid">
              {performanceMetrics.map((metric, index) => (
                <div key={index} className="metric-card">
                  <div className="metric-header">
                    <span className="metric-name">{metric.name}</span>
                    <div 
                      className="metric-status"
                      style={{ backgroundColor: getStatusColor(metric.status) }}
                    ></div>
                  </div>
                  <div className="metric-value-container">
                    <span className="metric-current-value">
                      {metric.value}{metric.unit}
                    </span>
                    <span className="metric-max-value">
                      / {metric.max}{metric.unit}
                    </span>
                  </div>
                  <div className="metric-progress">
                    <div 
                      className="metric-progress-fill"
                      style={{ 
                        width: `${(metric.value / metric.max) * 100}%`,
                        backgroundColor: getStatusColor(metric.status)
                      }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* System Alerts */}
      <div className="monitoring-card full-width">
        <div className="card-header">
          <span className="card-title">SYSTEM ALERTS</span>
          <div className="alert-controls">
            <button 
              className="btn btn-primary"
              onClick={handleAcknowledgeAll}
            >
              Acknowledge All
            </button>
            <button 
              className={`btn ${showCriticalOnly ? 'btn-warning' : ''}`}
              onClick={() => setShowCriticalOnly(!showCriticalOnly)}
            >
              {showCriticalOnly ? 'Show All' : 'Critical Only'}
            </button>
          </div>
        </div>
        <div className="card-content">
          <div className="alerts-table">
            {filteredAlerts.map(alert => (
              <div 
                key={alert.id} 
                className={`alert-row ${alert.acknowledged ? 'acknowledged' : ''}`}
              >
                <div className="alert-severity-col">
                  <div 
                    className="alert-severity-badge"
                    style={{ 
                      borderColor: getSeverityColor(alert.severity),
                      color: getSeverityColor(alert.severity)
                    }}
                  >
                    {alert.severity.toUpperCase()}
                  </div>
                </div>
                <div className="alert-content-col">
                  <div className="alert-title">{alert.title}</div>
                  <div className="alert-message">{alert.message}</div>
                  <div className="alert-meta">
                    <span className="alert-source">Source: {alert.source}</span>
                    <span className="alert-timestamp">{formatTimeAgo(alert.timestamp)}</span>
                  </div>
                </div>
                <div className="alert-actions-col">
                  {!alert.acknowledged && (
                    <button 
                      className="acknowledge-btn"
                      onClick={() => handleAcknowledgeAlert(alert.id)}
                    >
                      ✓ Acknowledge
                    </button>
                  )}
                  {alert.acknowledged && (
                    <span className="acknowledged-badge">✓ Acknowledged</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {filteredAlerts.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">🎯</div>
              <div className="empty-message">No alerts found</div>
              <div className="empty-description">
                {showCriticalOnly 
                  ? 'No critical alerts at the moment' 
                  : 'All systems operating normally'}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export default MonitoringTab