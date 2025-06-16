import React, { useState, useEffect } from 'react'
import { useMonitoring } from '../../hooks/useMonitoring'
import { useWorkflows } from '../../hooks/useWorkflows'
import LoadingSpinner from '../LoadingSpinner'

const MonitoringTab = () => {
  const [selectedSeverity, setSelectedSeverity] = useState('')
  const [showUnacknowledgedOnly, setShowUnacknowledgedOnly] = useState(false)
  const [selectedAlerts, setSelectedAlerts] = useState(new Set())

  const {
    dashboardData,
    alerts,
    systemHealth,
    loading: monitoringLoading,
    error: monitoringError,
    acknowledgeAlert,
    acknowledgeMultipleAlerts,
    updateAlertFilters,
    getFilteredAlerts,
    getAlertStatistics,
    getSystemHealthSummary,
    getPerformanceMetrics,
    isSystemHealthy,
    hasUnacknowledgedCriticalAlerts,
    startPolling,
    stopPolling,
    refreshAllData
  } = useMonitoring()

  const {
    statistics: workflowStats,
    loading: workflowLoading
  } = useWorkflows()

  const [refreshing, setRefreshing] = useState(false)

  // Start real-time monitoring
  useEffect(() => {
    startPolling(10000) // Poll every 10 seconds for monitoring data
    return () => stopPolling()
  }, [])

  // Update filters when local state changes
  useEffect(() => {
    updateAlertFilters({
      severity: selectedSeverity || null,
      unacknowledged: showUnacknowledgedOnly
    })
  }, [selectedSeverity, showUnacknowledgedOnly])

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await refreshAllData()
    } catch (error) {
      console.error('Error refreshing monitoring data:', error)
    } finally {
      setRefreshing(false)
    }
  }

  const handleAcknowledgeAlert = async (alertId) => {
    try {
      await acknowledgeAlert(alertId)
      console.log('✅ Alert acknowledged:', alertId)
    } catch (error) {
      console.error('❌ Failed to acknowledge alert:', error)
    }
  }

  const handleAcknowledgeSelected = async () => {
    if (selectedAlerts.size === 0) return
    
    try {
      await acknowledgeMultipleAlerts(Array.from(selectedAlerts))
      setSelectedAlerts(new Set())
      console.log('✅ Selected alerts acknowledged')
    } catch (error) {
      console.error('❌ Failed to acknowledge selected alerts:', error)
    }
  }

  const toggleAlertSelection = (alertId) => {
    const newSelection = new Set(selectedAlerts)
    if (newSelection.has(alertId)) {
      newSelection.delete(alertId)
    } else {
      newSelection.add(alertId)
    }
    setSelectedAlerts(newSelection)
  }

  const selectAllVisible = () => {
    const visibleAlerts = filteredAlerts.map(alert => alert.id)
    setSelectedAlerts(new Set(visibleAlerts))
  }

  const clearSelection = () => {
    setSelectedAlerts(new Set())
  }

  if (monitoringLoading || workflowLoading) {
    return <LoadingSpinner text="LOADING MONITORING DATA..." />
  }

  // Get processed data
  const alertStats = getAlertStatistics()
  const healthSummary = getSystemHealthSummary()
  const performanceMetrics = getPerformanceMetrics()
  const filteredAlerts = getFilteredAlerts()

  // System health indicators
  const getHealthColor = (status) => {
    switch (status) {
      case 'healthy': return '#00ff00'
      case 'warning':
      case 'degraded': return '#ffff00'
      case 'critical': return '#ff0000'
      default: return '#666666'
    }
  }

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return '#ff0000'
      case 'error': return '#ff6600'
      case 'warning': return '#ffff00'
      case 'info': return '#00ffff'
      default: return '#666666'
    }
  }

  const formatUptime = (uptime) => {
    if (!uptime) return 'N/A'
    const days = Math.floor(uptime / (1000 * 60 * 60 * 24))
    const hours = Math.floor((uptime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    return `${days}d ${hours}h`
  }

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString()
  }

  const getTimeAgo = (timestamp) => {
    const now = new Date()
    const time = new Date(timestamp)
    const diff = now - time
    
    const minutes = Math.floor(diff / (1000 * 60))
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    
    if (days > 0) return `${days}d ago`
    if (hours > 0) return `${hours}h ago`
    if (minutes > 0) return `${minutes}m ago`
    return 'Just now'
  }

  return (
    <>
      {/* System Health Dashboard */}
      <div className="monitoring-overview">
        <div className="health-cards">
          <div className="health-card">
            <div className="health-header">
              <span className="health-title">SYSTEM HEALTH</span>
              <div 
                className="health-indicator"
                style={{ backgroundColor: getHealthColor(healthSummary.overall) }}
              ></div>
            </div>
            <div className="health-content">
              <div className="health-score">
                <span className="score-value">{healthSummary.score}%</span>
                <span className="score-label">{healthSummary.overall.toUpperCase()}</span>
              </div>
              <div className="health-components">
                {Object.entries(healthSummary.components).map(([name, component]) => (
                  <div key={name} className="component-status">
                    <span className="component-name">{name}</span>
                    <div 
                      className="component-indicator"
                      style={{ backgroundColor: component.healthy ? '#00ff00' : '#ff0000' }}
                    ></div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="health-card">
            <div className="health-header">
              <span className="health-title">PERFORMANCE</span>
            </div>
            <div className="health-content">
              <div className="metric-row">
                <span className="metric-label">Success Rate:</span>
                <span className="metric-value">
                  {performanceMetrics?.workflowSuccessRate ? 
                    `${Math.round(performanceMetrics.workflowSuccessRate)}%` : 'N/A'}
                </span>
              </div>
              <div className="metric-row">
                <span className="metric-label">Avg Execution:</span>
                <span className="metric-value">
                  {performanceMetrics?.averageExecutionTime ? 
                    `${Math.round(performanceMetrics.averageExecutionTime / 1000 / 60)}m` : 'N/A'}
                </span>
              </div>
              <div className="metric-row">
                <span className="metric-label">Active Workflows:</span>
                <span className="metric-value">
                  {performanceMetrics?.systemLoad?.activeWorkflows || 0}
                </span>
              </div>
              <div className="metric-row">
                <span className="metric-label">Uptime:</span>
                <span className="metric-value">{formatUptime(systemHealth?.uptime)}</span>
              </div>
            </div>
          </div>

          <div className="health-card">
            <div className="health-header">
              <span className="health-title">ALERTS SUMMARY</span>
              {hasUnacknowledgedCriticalAlerts() && (
                <span className="critical-badge">CRITICAL</span>
              )}
            </div>
            <div className="health-content">
              <div className="metric-row">
                <span className="metric-label">Total:</span>
                <span className="metric-value">{alertStats.total}</span>
              </div>
              <div className="metric-row">
                <span className="metric-label">Unacknowledged:</span>
                <span className="metric-value critical">{alertStats.unacknowledged}</span>
              </div>
              <div className="metric-row">
                <span className="metric-label">Critical:</span>
                <span className="metric-value error">{alertStats.critical}</span>
              </div>
              <div className="metric-row">
                <span className="metric-label">Recent (24h):</span>
                <span className="metric-value">{alertStats.recent}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Alert Management */}
      <div className="alerts-section">
        <div className="alerts-header">
          <div className="alerts-title">
            <span>SYSTEM ALERTS</span>
            <span className="alerts-count">({filteredAlerts.length})</span>
          </div>
          
          <div className="alerts-controls">
            <div className="filter-group">
              <label>Severity:</label>
              <select 
                className="form-select" 
                value={selectedSeverity}
                onChange={(e) => setSelectedSeverity(e.target.value)}
              >
                <option value="">All ({alertStats.total})</option>
                <option value="critical">Critical ({alertStats.critical})</option>
                <option value="error">Error ({alertStats.error})</option>
                <option value="warning">Warning ({alertStats.warning})</option>
                <option value="info">Info ({alertStats.info})</option>
              </select>
            </div>

            <div className="filter-group">
              <label>
                <input
                  type="checkbox"
                  checked={showUnacknowledgedOnly}
                  onChange={(e) => setShowUnacknowledgedOnly(e.target.checked)}
                />
                Unacknowledged Only
              </label>
            </div>
          </div>

          <div className="alerts-actions">
            <button 
              className="btn btn-primary" 
              onClick={handleRefresh}
              disabled={refreshing}
            >
              {refreshing ? '🔄 Refreshing...' : '🔄 Refresh'}
            </button>
            <button 
              className="btn btn-success" 
              onClick={handleAcknowledgeSelected}
              disabled={selectedAlerts.size === 0}
            >
              ✅ Acknowledge Selected ({selectedAlerts.size})
            </button>
            <button 
              className="btn btn-secondary" 
              onClick={selectAllVisible}
              disabled={filteredAlerts.length === 0}
            >
              Select All
            </button>
            <button 
              className="btn btn-secondary" 
              onClick={clearSelection}
              disabled={selectedAlerts.size === 0}
            >
              Clear
            </button>
          </div>
        </div>

        {/* Error Display */}
        {monitoringError && (
          <div className="error-banner">
            <div className="error-content">
              <span className="error-icon">⚠️</span>
              <span className="error-message">{monitoringError}</span>
            </div>
          </div>
        )}

        {/* Alerts List */}
        <div className="alerts-list">
          {filteredAlerts.length > 0 ? (
            filteredAlerts.map((alert) => {
              const isSelected = selectedAlerts.has(alert.id)
              
              return (
                <div 
                  key={alert.id} 
                  className={`alert-item ${alert.severity} ${alert.acknowledged ? 'acknowledged' : 'unacknowledged'} ${isSelected ? 'selected' : ''}`}
                >
                  <div className="alert-checkbox">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleAlertSelection(alert.id)}
                    />
                  </div>

                  <div 
                    className="alert-severity-badge"
                    style={{ backgroundColor: getSeverityColor(alert.severity) }}
                  >
                    {alert.severity.toUpperCase()}
                  </div>

                  <div className="alert-content">
                    <div className="alert-message">{alert.message}</div>
                    <div className="alert-details">
                      {alert.component && (
                        <span className="alert-component">Component: {alert.component}</span>
                      )}
                      {alert.source && (
                        <span className="alert-source">Source: {alert.source}</span>
                      )}
                    </div>
                  </div>

                  <div className="alert-timestamp">
                    <div className="alert-time">{getTimeAgo(alert.timestamp)}</div>
                    <div className="alert-full-time">{formatTimestamp(alert.timestamp)}</div>
                  </div>

                  <div className="alert-actions">
                    {!alert.acknowledged ? (
                      <button
                        className="action-btn acknowledge-btn"
                        onClick={() => handleAcknowledgeAlert(alert.id)}
                      >
                        ✅ Acknowledge
                      </button>
                    ) : (
                      <div className="acknowledged-badge">
                        <span>✅ Acknowledged</span>
                        <div className="acknowledged-time">
                          {formatTimestamp(alert.acknowledgedAt)}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })
          ) : (
            <div className="empty-state">
              <div className="empty-icon">🎯</div>
              <div className="empty-message">No alerts found</div>
              <div className="empty-description">
                {selectedSeverity || showUnacknowledgedOnly
                  ? 'Try adjusting your filters to see more alerts'
                  : 'System is running smoothly with no alerts'}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export default MonitoringTab