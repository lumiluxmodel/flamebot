import React, { useState } from 'react'
import Panel from '../Panel'
import LoadingSpinner from '../LoadingSpinner'
import { useApi } from '../../hooks/useApi'

const WorkflowsTab = () => {
  const [filters, setFilters] = useState({
    workflowType: '',
    status: ''
  })

  const { data: workflowsData, loading } = useApi('/api/workflows/active')

  if (loading) {
    return <LoadingSpinner text="LOADING ACTIVE WORKFLOWS..." />
  }

  const workflows = workflowsData?.data?.executions || []

  return (
    <div>
      {/* Workflow Controls */}
      <div className="workflow-controls">
        <div className="control-group">
          <label>Filter by Type:</label>
          <select 
            className="form-select"
            value={filters.workflowType}
            onChange={(e) => setFilters(prev => ({ ...prev, workflowType: e.target.value }))}
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
            value={filters.status}
            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
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
        {workflows.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🔄</div>
            <div className="empty-state-message">No active workflows found</div>
            <div className="empty-state-description">
              Import accounts to start automated workflows
            </div>
          </div>
        ) : (
          workflows.map((workflow) => (
            <WorkflowCard key={workflow.accountId} workflow={workflow} />
          ))
        )}
      </div>
    </div>
  )
}

const WorkflowCard = ({ workflow }) => {
  const progressPercentage = workflow.progress || 0

  return (
    <div className="workflow-card">
      <div className={`workflow-status ${workflow.status}`}></div>
      <div className="workflow-card-header">
        <div className="workflow-account-id">{workflow.accountId}</div>
        <div className={`workflow-type-badge ${workflow.workflowType}`}>
          {workflow.workflowType}
        </div>
      </div>
      <div className="workflow-card-body">
        <div className="workflow-progress">
          <div className="workflow-progress-header">
            <span className="workflow-progress-label">Progress</span>
            <span className="workflow-progress-percentage">{progressPercentage}%</span>
          </div>
          <div className="workflow-progress-bar">
            <div 
              className="workflow-progress-fill" 
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
        </div>
        
        <div className="workflow-info">
          <div className="workflow-info-item">
            <div className="workflow-info-label">Started</div>
            <div className="workflow-info-value">
              {new Date(workflow.startedAt).toLocaleTimeString()}
            </div>
          </div>
          <div className="workflow-info-item">
            <div className="workflow-info-label">Status</div>
            <div className="workflow-info-value">{workflow.status}</div>
          </div>
        </div>

        <div className="workflow-card-actions">
          <button className="workflow-action-btn primary">
            📊 Details
          </button>
          <button className="workflow-action-btn">
            ⏸️ Pause
          </button>
          <button className="workflow-action-btn danger">
            🛑 Stop
          </button>
        </div>
      </div>
    </div>
  )
}

export default WorkflowsTab