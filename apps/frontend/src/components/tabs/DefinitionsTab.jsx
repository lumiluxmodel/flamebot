import React, { useState } from 'react'
import LoadingSpinner from '../LoadingSpinner'
import { useApi } from '../../hooks/useApi'

const DefinitionsTab = () => {
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  
  const { data: definitionsData, loading: definitionsLoading } = useApi('/api/workflows/definitions')

  // Mock workflow definitions data
  const workflowDefinitions = [
    {
      id: 'def_default_001',
      name: 'Default Tinder Automation',
      category: 'default',
      description: 'Standard Tinder automation workflow with bio update, prompt addition, and swipe campaign',
      version: '2.1.0',
      status: 'active',
      lastModified: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      steps: [
        { name: 'Account Validation', duration: '30s', status: 'enabled' },
        { name: 'Bio Update', duration: '45s', status: 'enabled' },
        { name: 'Prompt Addition', duration: '60s', status: 'enabled' },
        { name: 'Swipe Campaign', duration: '2h', status: 'enabled' },
        { name: 'Results Analysis', duration: '15s', status: 'enabled' }
      ],
      usageCount: 156,
      successRate: 94.2
    },
    {
      id: 'def_aggressive_001',
      name: 'Aggressive Growth Strategy',
      category: 'aggressive',
      description: 'High-intensity workflow focused on maximum engagement and rapid matching',
      version: '1.8.3',
      status: 'active',
      lastModified: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      steps: [
        { name: 'Profile Optimization', duration: '2m', status: 'enabled' },
        { name: 'Boost Activation', duration: '30s', status: 'enabled' },
        { name: 'Super Swipe Campaign', duration: '3h', status: 'enabled' },
        { name: 'Message Automation', duration: '1h', status: 'enabled' }
      ],
      usageCount: 89,
      successRate: 87.6
    },
    {
      id: 'def_test_001',
      name: 'A/B Testing Framework',
      category: 'test',
      description: 'Experimental workflow for testing new strategies and features',
      version: '0.9.1',
      status: 'draft',
      lastModified: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      steps: [
        { name: 'Setup Variants', duration: '1m', status: 'enabled' },
        { name: 'Run Test Campaign', duration: '30m', status: 'enabled' },
        { name: 'Collect Metrics', duration: '5m', status: 'enabled' },
        { name: 'Statistical Analysis', duration: '2m', status: 'enabled' }
      ],
      usageCount: 12,
      successRate: 75.8
    },
    {
      id: 'def_maintenance_001',
      name: 'Account Maintenance',
      category: 'maintenance',
      description: 'Regular maintenance tasks to keep accounts healthy and active',
      version: '1.2.4',
      status: 'active',
      lastModified: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      steps: [
        { name: 'Health Check', duration: '15s', status: 'enabled' },
        { name: 'Activity Review', duration: '30s', status: 'enabled' },
        { name: 'Profile Refresh', duration: '45s', status: 'enabled' },
        { name: 'Settings Optimization', duration: '20s', status: 'enabled' }
      ],
      usageCount: 234,
      successRate: 98.1
    }
  ]

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return '#00ff00'
      case 'draft': return '#ffff00'
      case 'deprecated': return '#ff0040'
      default: return '#666666'
    }
  }

  const getCategoryColor = (category) => {
    switch (category) {
      case 'default': return '#00ff41'
      case 'aggressive': return '#ff0040'
      case 'test': return '#0080ff'
      case 'maintenance': return '#00ffff'
      default: return '#666666'
    }
  }

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const handleCreateNew = () => {
    console.log('Creating new workflow definition')
    // TODO: Implement modal for creating new workflow
  }

  const handleEdit = (definitionId) => {
    console.log('Editing workflow definition:', definitionId)
    // TODO: Implement edit functionality
  }

  const handleDuplicate = (definitionId) => {
    console.log('Duplicating workflow definition:', definitionId)
    // TODO: Implement duplicate functionality
  }

  const handleDelete = (definitionId) => {
    console.log('Deleting workflow definition:', definitionId)
    // TODO: Implement delete functionality
  }

  if (definitionsLoading) {
    return <LoadingSpinner text="LOADING WORKFLOW DEFINITIONS..." />
  }

  const filteredDefinitions = workflowDefinitions.filter(def => {
    const categoryMatch = selectedCategory === 'all' || def.category === selectedCategory
    const searchMatch = !searchTerm || 
      def.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      def.description.toLowerCase().includes(searchTerm.toLowerCase())
    return categoryMatch && searchMatch
  })

  return (
    <>
      {/* Definitions Controls */}
      <div className="definitions-controls">
        <div className="control-group">
          <label>Category:</label>
          <select 
            className="form-select" 
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="all">All Categories</option>
            <option value="default">Default</option>
            <option value="aggressive">Aggressive</option>
            <option value="test">Test</option>
            <option value="maintenance">Maintenance</option>
          </select>
        </div>
        <div className="control-group">
          <label>Search:</label>
          <input 
            type="text"
            className="form-input"
            placeholder="Search workflows..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="control-group">
          <button 
            className="btn btn-primary"
            onClick={handleCreateNew}
          >
            ➕ Create New
          </button>
        </div>
      </div>

      {/* Definitions Grid */}
      <div className="definitions-grid">
        {filteredDefinitions.map(definition => (
          <div key={definition.id} className="definition-card">
            <div className="definition-header">
              <div className="definition-title">
                <span className="definition-name">{definition.name}</span>
                <span className="definition-version">v{definition.version}</span>
              </div>
              <div className="definition-badges">
                <div 
                  className="category-badge"
                  style={{ 
                    borderColor: getCategoryColor(definition.category),
                    color: getCategoryColor(definition.category)
                  }}
                >
                  {definition.category}
                </div>
                <div 
                  className="status-badge"
                  style={{ 
                    borderColor: getStatusColor(definition.status),
                    color: getStatusColor(definition.status)
                  }}
                >
                  {definition.status}
                </div>
              </div>
            </div>

            <div className="definition-content">
              <div className="definition-description">
                {definition.description}
              </div>

              <div className="definition-stats">
                <div className="definition-stat">
                  <span className="stat-value">{definition.usageCount}</span>
                  <span className="stat-label">Used</span>
                </div>
                <div className="definition-stat">
                  <span className="stat-value">{definition.successRate}%</span>
                  <span className="stat-label">Success</span>
                </div>
                <div className="definition-stat">
                  <span className="stat-value">{definition.steps.length}</span>
                  <span className="stat-label">Steps</span>
                </div>
              </div>

              <div className="definition-steps">
                <div className="steps-header">Workflow Steps:</div>
                <div className="steps-list">
                  {definition.steps.map((step, index) => (
                    <div key={index} className="step-item">
                      <div className="step-number">{index + 1}</div>
                      <div className="step-content">
                        <div className="step-name">{step.name}</div>
                        <div className="step-duration">{step.duration}</div>
                      </div>
                      <div 
                        className="step-status"
                        style={{ 
                          color: step.status === 'enabled' ? '#00ff00' : '#666666'
                        }}
                      >
                        {step.status === 'enabled' ? '✓' : '✗'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="definition-meta">
                <span className="meta-item">
                  Last modified: {formatDate(definition.lastModified)}
                </span>
              </div>
            </div>

            <div className="definition-actions">
              <button 
                className="action-btn edit-btn"
                onClick={() => handleEdit(definition.id)}
              >
                ✏️ Edit
              </button>
              <button 
                className="action-btn duplicate-btn"
                onClick={() => handleDuplicate(definition.id)}
              >
                📋 Duplicate
              </button>
              <button 
                className="action-btn delete-btn"
                onClick={() => handleDelete(definition.id)}
              >
                🗑️ Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredDefinitions.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">📚</div>
          <div className="empty-message">No workflow definitions found</div>
          <div className="empty-description">
            {searchTerm || selectedCategory !== 'all'
              ? 'Try adjusting your search or filters'
              : 'Create your first workflow definition to get started'}
          </div>
        </div>
      )}
    </>
  )
}

export default DefinitionsTab