import React from 'react'
import { Play, Pause, RefreshCw } from 'lucide-react'

const StatusBar = ({ systemStatus, loading }) => {
  const { healthy, workflowCount, alertCount, currentTime } = systemStatus

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
        <div className={`status-indicator ${healthy ? 'healthy' : 'error'}`}></div>
        <span>System {healthy ? 'Online' : 'Offline'}</span>
      </div>
      
      <div className="status-item">
        <span>{workflowCount} Active Workflows</span>
      </div>
      
      <div className="status-item">
        <span>{alertCount} Alerts</span>
      </div>
      
      <div className="status-item">
        <span>{currentTime}</span>
      </div>
      
      <div className="status-item">
        <button 
          className="control-btn" 
          onClick={handlePauseAll}
          title="Pause All Workflows"
        >
          <Pause size={16} />
        </button>
        <button 
          className="control-btn" 
          onClick={handleResumeAll}
          title="Resume All Workflows"
        >
          <Play size={16} />
        </button>
        <button 
          className="control-btn" 
          onClick={handleRefresh}
          title="Refresh Data"
        >
          <RefreshCw size={16} />
        </button>
      </div>
    </div>
  )
}

export default StatusBar