import React, { useState, useEffect } from 'react'
import { useWorkflows } from '../../hooks/useWorkflows'
import { useAccounts } from '../../hooks/useAccounts'
import LoadingSpinner from '../LoadingSpinner'

const WorkflowsTab = () => {
  const [selectedType, setSelectedType] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('')
  const [selectedWorkflows, setSelectedWorkflows] = useState(new Set())
  const [refreshing, setRefreshing] = useState(false)

  const { 
    workflows,
    definitions,
    loading: workflowLoading,
    error: workflowError,
    stopWorkflow,
    pauseAllWorkflows,
    resumeAllWorkflows,
    getWorkflowsByType,
    getWorkflowsByStatus,
    refreshData: refreshWorkflows,
    startPolling,
    stopPolling
  } = useWorkflows()

  const {
    accounts,
    getAccountById
  } = useAccounts()

  // Start real-time polling
  useEffect(() => {
    startPolling(15000) // Poll every 15 seconds for active workflows
    return () => stopPolling()
  }, [])

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await refreshWorkflows()
    } catch (error) {
      console.error('Error refreshing workflows:', error)
    } finally {
      setRefreshing(false)
    }
  }

  const handleStopWorkflow = async (accountId) => {
    try {
      await stopWorkflow(accountId)
      console.log('✅ Workflow stopped:', accountId)
    } catch (error) {
      console.error('❌ Failed to stop workflow:', error)
    }
  }

  const handlePauseAllWorkflows = async () => {
    try {
      await pauseAllWorkflows()
      console.log('✅ All workflows paused')
    } catch (error) {
      console.error('❌ Failed to pause workflows:', error)
    }
  }

  const handleResumeAllWorkflows = async () => {
    try {
      await resumeAllWorkflows()
      console.log('✅ All workflows resumed')
    } catch (error) {
      console.error('❌ Failed to resume workflows:', error)
    }
  }

  const handleStopSelected = async () => {
    if (selectedWorkflows.size === 0) return
    
    try {
      const stopPromises = Array.from(selectedWorkflows).map(accountId => 
        stopWorkflow(accountId)
      )
      await Promise.all(stopPromises)
      setSelectedWorkflows(new Set())
      console.log('✅ Selected workflows stopped')
    } catch (error) {
      console.error('❌ Failed to stop selected workflows:', error)
    }
  }

  const toggleWorkflowSelection = (accountId) => {
    const newSelection = new Set(selectedWorkflows)
    if (newSelection.has(accountId)) {
      newSelection.delete(accountId)
    } else {
      newSelection.add(accountId)
    }
    setSelectedWorkflows(newSelection)
  }

  const selectAllVisible = () => {
    const visibleWorkflows = filteredWorkflows.map(w => w.accountId)
    setSelectedWorkflows(new Set(visibleWorkflows))
  }

  const clearSelection = () => {
    setSelectedWorkflows(new Set())
  }

  if (workflowLoading) {
    return <LoadingSpinner text="LOADING ACTIVE WORKFLOWS..." />
  }

  // Get unique workflow types from definitions and active workflows
  const workflowTypes = [
    ...new Set([
      ...definitions.map(def => def.type),
      ...workflows.map(wf => wf.workflowType)
    ])
  ]

  // Filter workflows based on selected criteria
  const filteredWorkflows = workflows.filter(workflow => {
    const typeMatch = !selectedType || workflow.workflowType === selectedType
    const statusMatch = !selectedStatus || workflow.status === selectedStatus
    return typeMatch && statusMatch
  })

  // Calculate workflow statistics
  const activeCount = workflows.filter(w => w.status === 'active').length
  const pausedCount = workflows.filter(w => w.status === 'paused').length
  const completedCount = workflows.filter(w => w.status === 'completed').length
  const failedCount = workflows.filter(w => w.status === 'failed').length

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
      case 'premium': return '#ff8000'
      default: return '#666666'
    }
  }

  const formatDuration = (startTime) => {
    if (!startTime) return 'N/A'
    const now = new Date()
    const start = new Date(startTime)
    const diff = now - start
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    return `${hours}h ${minutes}m`
  }

  const formatTimeRemaining = (workflow) => {
    if (!workflow.estimatedCompletionTime) return 'N/A'
    const completion = new Date(workflow.estimatedCompletionTime)
    const now = new Date()
    const diff = completion - now
    
    if (diff <= 0) return 'Overdue'
    
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    return `${hours}h ${minutes}m remaining`
  }

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
            <option value="">All Types ({workflows.length})</option>
            {workflowTypes.map(type => {
              const count = workflows.filter(w => w.workflowType === type).length
              return (
                <option key={type} value={type}>
                  {type} ({count})
                </option>
              )
            })}
          </select>
        </div>
        <div className="control-group">
          <label>Filter by Status:</label>
          <select 
            className="form-select"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            <option value="">All Status ({workflows.length})</option>
            <option value="active">Active ({activeCount})</option>
            <option value="paused">Paused ({pausedCount})</option>
            <option value="completed">Completed ({completedCount})</option>
            <option value="failed">Failed ({failedCount})</option>
          </select>
        </div>
        <div className="control-group">
          <button 
            className="btn btn-primary" 
            onClick={handleRefresh}
            disabled={refreshing}
          >
            {refreshing ? '🔄 Refreshing...' : '🔄 Refresh'}
          </button>
          <button 
            className="btn btn-warning" 
            onClick={handleStopSelected}
            disabled={selectedWorkflows.size === 0}
          >
            🛑 Stop Selected ({selectedWorkflows.size})
          </button>
        </div>
        <div className="control-group">
          <button 
            className="btn btn-secondary" 
            onClick={selectAllVisible}
            disabled={filteredWorkflows.length === 0}
          >
            ✅ Select All
          </button>
          <button 
            className="btn btn-secondary" 
            onClick={clearSelection}
            disabled={selectedWorkflows.size === 0}
          >
            ❌ Clear Selection
          </button>
        </div>
        <div className="control-group">
          <button 
            className="btn btn-warning" 
            onClick={handlePauseAllWorkflows}
            disabled={activeCount === 0}
          >
            ⏸️ Pause All
          </button>
          <button 
            className="btn btn-success" 
            onClick={handleResumeAllWorkflows}
            disabled={pausedCount === 0}
          >
            ▶️ Resume All
          </button>
        </div>
      </div>

      {/* Error Display */}
      {workflowError && (
        <div className="error-banner">
          <div className="error-content">
            <span className="error-icon">⚠️</span>
            <span className="error-message">{workflowError}</span>
            <button className="error-dismiss" onClick={() => setError(null)}>×</button>
          </div>
        </div>
      )}

      {/* Workflows Grid */}
      <div className="workflows-grid">
        {filteredWorkflows.map(workflow => {
          const account = getAccountById(workflow.accountId)
          const isSelected = selectedWorkflows.has(workflow.accountId)
          
          return (
            <div 
              key={workflow.executionId || workflow.accountId} 
              className={`workflow-card ${isSelected ? 'selected' : ''}`}
            >
              <div className="workflow-header">
                <div className="workflow-checkbox">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleWorkflowSelection(workflow.accountId)}
                  />
                </div>
                <div className="workflow-id">
                  <span className="workflow-label">WORKFLOW</span>
                  <span className="workflow-value">{workflow.accountId}</span>
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
                      style={{ color: getTypeColor(workflow.workflowType) }}
                    >
                      {workflow.workflowType.toUpperCase()}
                    </span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Duration:</span>
                    <span className="info-value">{formatDuration(workflow.startedAt)}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Current Step:</span>
                    <span className="info-value">{workflow.currentStep || 'N/A'}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Remaining:</span>
                    <span className="info-value">{formatTimeRemaining(workflow)}</span>
                  </div>
                </div>

                <div className="workflow-progress">
                  <div className="progress-header">
                    <span className="progress-label">Progress</span>
                    <span className="progress-percentage">{Math.round(workflow.progress || 0)}%</span>
                  </div>
                  <div className="progress-bar">
                    <div 
                      className="progress-fill"
                      style={{ width: `${workflow.progress || 0}%` }}
                    ></div>
                  </div>
                  <div className="progress-steps">
                    <span className="steps-completed">{workflow.completedSteps || 0}</span>
                    <span className="steps-separator">/</span>
                    <span className="steps-total">{workflow.totalSteps || 0}</span>
                    <span className="steps-label">steps</span>
                  </div>
                </div>

                <div className="workflow-stats">
                  <div className="stat-item">
                    <span className="stat-value">{workflow.actionsCompleted || 0}</span>
                    <span className="stat-label">Actions</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-value">{workflow.successfulActions || 0}</span>
                    <span className="stat-label">Success</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-value">
                      {workflow.actionsCompleted > 0 ? 
                        Math.round((workflow.successfulActions / workflow.actionsCompleted) * 100) : 0}%
                    </span>
                    <span className="stat-label">Rate</span>
                  </div>
                </div>
              </div>

              <div className="workflow-actions">
                {workflow.status === 'active' && (
                  <button 
                    className="action-btn pause-btn"
                    onClick={() => handlePauseAllWorkflows()}
                    title="Pause workflow"
                  >
                    ⏸️ Pause
                  </button>
                )}
                {workflow.status === 'paused' && (
                  <button 
                    className="action-btn resume-btn"
                    onClick={() => handleResumeAllWorkflows()}
                    title="Resume workflow"
                  >
                    ▶️ Resume
                  </button>
                )}
                <button 
                  className="action-btn stop-btn"
                  onClick={() => handleStopWorkflow(workflow.accountId)}
                  title="Stop workflow"
                >
                  🛑 Stop
                </button>
                <button 
                  className="action-btn details-btn"
                  title="View workflow details"
                >
                  📊 Details
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {filteredWorkflows.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">🤖</div>
          <div className="empty-message">No workflows found</div>
          <div className="empty-description">
            {selectedType || selectedStatus 
              ? 'Try adjusting your filters to see more workflows' 
              : 'No active workflows at the moment. Import accounts to start workflows.'}
          </div>
          {!selectedType && !selectedStatus && (
            <div className="empty-actions">
              <button className="btn btn-primary">+ Import Accounts</button>
              <button className="btn btn-secondary">📖 View Definitions</button>
            </div>
          )}
        </div>
      )}
    </>
  )
}

export default WorkflowsTab