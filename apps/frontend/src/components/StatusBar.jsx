import React from 'react'

const StatusBar = ({ systemStatus, loading }) => {
  const getStatusIndicatorClass = () => {
    if (loading) return 'status-indicator warning'
    return systemStatus.healthy ? 'status-indicator healthy' : 'status-indicator error'
  }

  const getStatusText = () => {
    if (loading) return 'Connecting...'
    return systemStatus.healthy ? 'System Online' : 'System Error'
  }

  const handlePauseAll = () => {
    console.log('Pause all workflows')
    // TODO: Implement pause all functionality
  }

  const handleResumeAll = () => {
    console.log('Resume all workflows')
    // TODO: Implement resume all functionality
  }

  const handleRefresh = () => {
    console.log('Refresh data')
    // TODO: Implement refresh functionality
  }

  return (
    <div className="status-bar">
      <div className="status-item">
        <div className={getStatusIndicatorClass()}></div>
        <span>{getStatusText()}</span>
      </div>
      <div className="status-item">
        <span>{systemStatus.workflowCount} Active Workflows</span>
      </div>
      <div className="status-item">
        <span>{systemStatus.alertCount} Alerts</span>
      </div>
      <div className="status-item">
        <span>{systemStatus.currentTime}</span>
      </div>
      <div className="status-item">
        <button className="control-btn" title="Pause All Workflows" onClick={handlePauseAll}>⏸️</button>
        <button className="control-btn" title="Resume All Workflows" onClick={handleResumeAll}>▶️</button>
        <button className="control-btn" title="Refresh Data" onClick={handleRefresh}>🔄</button>
      </div>
    </div>
  )
}

export default StatusBar