import React, { useState, useEffect } from 'react'
import LoadingSpinner from '../LoadingSpinner'
import { useApi } from '../../hooks/useApi'

const WorkflowsTab = () => {
  const [selectedType, setSelectedType] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('')
  
  const { data: workflowsData, loading: workflowsLoading } = useApi('/api/workflows/active')
  const { data: statsData } = useApi('/api/workflows/stats')

  // Mock data for demo (replace with real API data later)
  const workflows = [
    {
      id: 'wf_684ac67f',
      accountId: '684ac67f',
      type: 'default',
      status: 'active',
      startTime: new Date(Date.now() - 2 * 60 * 60 * 1000),
      currentStep: 'swipe_campaign',
      progress: 75,
      swipes: 120,
      matches: 8
    },
    {
      id: 'wf_684ac2d6',
      accountId: '684ac2d6', 
      type: 'aggressive',
      status: 'active',
      startTime: new Date(Date.now() - 45 * 60 * 1000),
      currentStep: 'add_prompt',
      progress: 45,
      swipes: 67,
      matches: 3
    },
    {
      id: 'wf_684ac123',
      accountId: '684ac123',
      type: 'test',
      status: 'paused',
      startTime: new Date(Date.now() - 3 * 60 * 60 * 1000),
      currentStep: 'bio_update',
      progress: 20,
      swipes: 23,
      matches: 1
    }
  ]

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return '#00ff00'
      case 'paused': return '#ffff00'
      case 'completed': return '#00ffff'
      case 'failed': return '#ff0000'
      default: return '#666666'
    }
  }

  const getTypeColor = (type) => {
    switch (type) {
      case 'default': return '#00ff41'
      case 'aggressive': return '#ff0040'
      case 'test': return '#0080ff'
      default: return '#666666'
    }
  }

  const formatDuration = (startTime) => {
    const now = new Date()
    const diff = now - startTime
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    return `${hours}h ${minutes}m`
  }

  const handleStopWorkflow = (workflowId) => {
    console.log('Stopping workflow:', workflowId)
    // TODO: Implement API call
  }

  const handlePauseWorkflow = (workflowId) => {
    console.log('Pausing workflow:', workflowId)
    // TODO: Implement API call
  }

  if (workflowsLoading) {
    return <LoadingSpinner text="LOADING ACTIVE WORKFLOWS..." />
  }

  const filteredWorkflows = workflows.filter(workflow => {
    const typeMatch = !selectedType || workflow.type === selectedType
    const statusMatch = !selectedStatus || workflow.status === selectedStatus
    return typeMatch && statusMatch
  })

  return (
    <>
      {/* Workflow Controls */}
      <div className="workflow-controls">
        <div className="control-group">
          <label>Filter by Type:</label>
          <select 
            className="form-select" 
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
          >
            <option value="">All Types</option>
            <option value="default">Default</option>
            <option value="aggressive">Aggressive</option>
            <option value="test">Test</option>
          </select>
        </div>
        <div className="control-group">
          <label>Filter by Status:</label>
          <select 
            className="form-select"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
          </select>
        </div>
        <div className="control-group">
          <button className="btn btn-primary">🔄 Refresh</button>
          <button className="btn btn-warning">🛑 Stop Selected</button>
        </div>
      </div>

      {/* Workflows Grid */}
      <div className="workflows-grid">
        {filteredWorkflows.map(workflow => (
          <div key={workflow.id} className="workflow-card">
            <div className="workflow-header">
              <div className="workflow-id">
                <span className="workflow-label">WORKFLOW</span>
                <span className="workflow-value">{workflow.id}</span>
              </div>
              <div className="workflow-status">
                <div 
                  className="status-indicator"
                  style={{ backgroundColor: getStatusColor(workflow.status) }}
                ></div>
                <span className="status-text">{workflow.status.toUpperCase()}</span>
              </div>
            </div>

            <div className="workflow-content">
              <div className="workflow-info">
                <div className="info-row">
                  <span className="info-label">Account:</span>
                  <span className="info-value">{workflow.accountId}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Type:</span>
                  <span 
                    className="info-value type-badge"
                    style={{ color: getTypeColor(workflow.type) }}
                  >
                    {workflow.type.toUpperCase()}
                  </span>
                </div>
                <div className="info-row">
                  <span className="info-label">Duration:</span>
                  <span className="info-value">{formatDuration(workflow.startTime)}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Current Step:</span>
                  <span className="info-value">{workflow.currentStep}</span>
                </div>
              </div>

              <div className="workflow-progress">
                <div className="progress-header">
                  <span className="progress-label">Progress</span>
                  <span className="progress-percentage">{workflow.progress}%</span>
                </div>
                <div className="progress-bar">
                  <div 
                    className="progress-fill"
                    style={{ width: `${workflow.progress}%` }}
                  ></div>
                </div>
              </div>

              <div className="workflow-stats">
                <div className="stat-item">
                  <span className="stat-value">{workflow.swipes}</span>
                  <span className="stat-label">Swipes</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value">{workflow.matches}</span>
                  <span className="stat-label">Matches</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value">{Math.round((workflow.matches / workflow.swipes) * 100) || 0}%</span>
                  <span className="stat-label">Success</span>
                </div>
              </div>
            </div>

            <div className="workflow-actions">
              {workflow.status === 'active' && (
                <button 
                  className="action-btn pause-btn"
                  onClick={() => handlePauseWorkflow(workflow.id)}
                >
                  ⏸️ Pause
                </button>
              )}
              {workflow.status === 'paused' && (
                <button 
                  className="action-btn resume-btn"
                  onClick={() => handlePauseWorkflow(workflow.id)}
                >
                  ▶️ Resume
                </button>
              )}
              <button 
                className="action-btn stop-btn"
                onClick={() => handleStopWorkflow(workflow.id)}
              >
                🛑 Stop
              </button>
              <button className="action-btn details-btn">
                📊 Details
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredWorkflows.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">🤖</div>
          <div className="empty-message">No workflows found</div>
          <div className="empty-description">
            {selectedType || selectedStatus 
              ? 'Try adjusting your filters' 
              : 'No active workflows at the moment'}
          </div>
        </div>
      )}
    </>
  )
}

export default WorkflowsTab