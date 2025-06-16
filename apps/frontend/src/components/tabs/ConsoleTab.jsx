import React, { useState, useEffect } from 'react'
import LoadingSpinner from '../LoadingSpinner'
import { useApi } from '../../hooks/useApi'

const ConsoleTab = () => {
  const [tasks, setTasks] = useState([])
  const [models, setModels] = useState([])
  const [channels, setChannels] = useState([])
  const [stats, setStats] = useState({})
  
  const { data: tasksData, loading: tasksLoading } = useApi('/api/accounts/workflows/active')
  const { data: modelsData } = useApi('/api/accounts/models')
  const { data: statsData } = useApi('/api/workflows/stats')

  // Mock data for the legacy console view
  useEffect(() => {
    // Mock active tasks
    setTasks([
      {
        id: 'task_001',
        accountId: '684ac67f',
        type: 'Default Workflow',
        status: 'Running',
        progress: 75,
        currentAction: 'Swipe Campaign',
        startTime: new Date(Date.now() - 2 * 60 * 60 * 1000),
        eta: '25 min'
      },
      {
        id: 'task_002',
        accountId: '684ac2d6',
        type: 'Aggressive Workflow',
        status: 'Running',
        progress: 45,
        currentAction: 'Bio Update',
        startTime: new Date(Date.now() - 45 * 60 * 1000),
        eta: '1h 15min'
      },
      {
        id: 'task_003',
        accountId: '684ac123',
        type: 'Test Workflow',
        status: 'Paused',
        progress: 20,
        currentAction: 'Prompt Addition',
        startTime: new Date(Date.now() - 3 * 60 * 60 * 1000),
        eta: 'Paused'
      }
    ])

    // Mock models
    setModels([
      { name: 'GPT-4 Turbo', status: 'Online', color: '#00ff41' },
      { name: 'Claude 3.5', status: 'Online', color: '#00ffff' },
      { name: 'Gemini Pro', status: 'Online', color: '#ff9500' },
      { name: 'Local LLM', status: 'Offline', color: '#666666' }
    ])

    // Mock channels
    setChannels([
      { name: 'Tinder API', status: 'Connected', color: '#00ff41' },
      { name: 'Bumble API', status: 'Connected', color: '#00ff41' },
      { name: 'Hinge API', status: 'Maintenance', color: '#ffff00' },
      { name: 'Match API', status: 'Disconnected', color: '#ff0040' }
    ])

    // Mock today's statistics
    setStats({
      swipesToday: 1247,
      matchesToday: 23,
      activeAccounts: 8,
      successRate: 89.2
    })
  }, [])

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'running':
      case 'online':
      case 'connected':
        return '#00ff00'
      case 'paused':
      case 'maintenance':
        return '#ffff00'
      case 'failed':
      case 'offline':
      case 'disconnected':
        return '#ff0040'
      default:
        return '#666666'
    }
  }

  const formatDuration = (startTime) => {
    const now = new Date()
    const diff = now - startTime
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    return `${hours}h ${minutes}m`
  }

  if (tasksLoading) {
    return <LoadingSpinner text="LOADING CONSOLE DATA..." />
  }

  return (
    <div className="console-dashboard">
      {/* Original Dashboard Grid */}
      <div className="dashboard-grid">
        {/* Legacy Task Monitor */}
        <div className="panel task-monitor">
          <div className="panel-header">
            <span>ACTIVE TASKS</span>
            <span className="task-count">{tasks.length} active</span>
          </div>
          <div className="panel-content">
            <div className="tasks-list">
              {tasks.map(task => (
                <div key={task.id} className="task-item">
                  <div className="task-header">
                    <div className="task-type">{task.type}</div>
                    <div 
                      className="task-status"
                      style={{ color: getStatusColor(task.status) }}
                    >
                      {task.status.toUpperCase()}
                    </div>
                  </div>
                  
                  <div className="task-details">
                    <div className="task-id">Account: {task.accountId}</div>
                    <div className="task-action">Action: {task.currentAction}</div>
                    <div className="task-timing">
                      Duration: {formatDuration(task.startTime)} | ETA: {task.eta}
                    </div>
                  </div>

                  <div className="task-progress">
                    <div className="progress-bar">
                      <div 
                        className="progress-fill"
                        style={{ 
                          width: `${task.progress}%`,
                          backgroundColor: getStatusColor(task.status)
                        }}
                      ></div>
                    </div>
                    <div className="progress-text">{task.progress}%</div>
                  </div>
                </div>
              ))}

              {tasks.length === 0 && (
                <div className="empty-state-small">
                  <div className="empty-message">No active tasks</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Models Panel */}
        <div className="panel">
          <div className="panel-header">
            <span>MODELS</span>
          </div>
          <div className="panel-content">
            <div className="list-container">
              {models.map((model, index) => (
                <div key={index} className="list-item">
                  <div 
                    className="model-color"
                    style={{ backgroundColor: model.color }}
                  ></div>
                  <div className="list-item-content">
                    <div className="list-item-name">{model.name}</div>
                    <div 
                      className="list-item-info"
                      style={{ color: getStatusColor(model.status) }}
                    >
                      {model.status}
                    </div>
                  </div>
                </div>
              ))}
              
              <div className="list-item add-item">
                <div className="add-button">
                  <span>+ Add Model</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Channels Panel */}
        <div className="panel">
          <div className="panel-header">
            <span>CHANNELS</span>
          </div>
          <div className="panel-content">
            <div className="list-container">
              {channels.map((channel, index) => (
                <div key={index} className="list-item">
                  <div 
                    className="model-color"
                    style={{ backgroundColor: channel.color }}
                  ></div>
                  <div className="list-item-content">
                    <div className="list-item-name">{channel.name}</div>
                    <div 
                      className="list-item-info"
                      style={{ color: getStatusColor(channel.status) }}
                    >
                      {channel.status}
                    </div>
                  </div>
                </div>
              ))}
              
              <div className="list-item add-item">
                <div className="add-button">
                  <span>+ Add Channel</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Statistics Panel */}
        <div className="panel">
          <div className="panel-header">
            <span>TODAY'S STATISTICS</span>
          </div>
          <div className="panel-content">
            <div className="stats-grid">
              <div className="stat-box">
                <div className="stat-label">Swipes</div>
                <div className="stat-value">{stats.swipesToday?.toLocaleString() || 0}</div>
              </div>
              <div className="stat-box">
                <div className="stat-label">Matches</div>
                <div className="stat-value">{stats.matchesToday || 0}</div>
              </div>
              <div className="stat-box">
                <div className="stat-label">Active</div>
                <div className="stat-value">{stats.activeAccounts || 0}</div>
              </div>
              <div className="stat-box">
                <div className="stat-label">Success</div>
                <div className="stat-value">{stats.successRate || 0}%</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Legacy Terminal Output */}
      <div className="panel terminal-output">
        <div className="panel-header">
          <span>SYSTEM OUTPUT</span>
          <button className="panel-action">Clear</button>
        </div>
        <div className="panel-content">
          <div className="terminal-log">
            <div className="log-entry">
              <span className="log-timestamp">[{new Date().toLocaleTimeString()}]</span>
              <span className="log-level info">INFO</span>
              <span className="log-message">Workflow engine initialized successfully</span>
            </div>
            <div className="log-entry">
              <span className="log-timestamp">[{new Date(Date.now() - 30000).toLocaleTimeString()}]</span>
              <span className="log-level success">SUCCESS</span>
              <span className="log-message">Account 684ac67f: Swipe campaign completed</span>
            </div>
            <div className="log-entry">
              <span className="log-timestamp">[{new Date(Date.now() - 60000).toLocaleTimeString()}]</span>
              <span className="log-level warning">WARNING</span>
              <span className="log-message">Rate limit approaching for account 684ac2d6</span>
            </div>
            <div className="log-entry">
              <span className="log-timestamp">[{new Date(Date.now() - 90000).toLocaleTimeString()}]</span>
              <span className="log-level success">SUCCESS</span>
              <span className="log-message">Bio update completed for account 684ac123</span>
            </div>
            <div className="log-entry">
              <span className="log-timestamp">[{new Date(Date.now() - 120000).toLocaleTimeString()}]</span>
              <span className="log-level info">INFO</span>
              <span className="log-message">Health check passed for all services</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ConsoleTab