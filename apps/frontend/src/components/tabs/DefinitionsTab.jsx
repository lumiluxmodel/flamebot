import React, { useState, useEffect } from 'react';
import { useWorkflows } from '../../hooks/useWorkflows';
import LoadingSpinner from '../LoadingSpinner';

const DefinitionsTab = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showExamples, setShowExamples] = useState(false);
  const [selectedDefinition, setSelectedDefinition] = useState(null);
  const [examples, setExamples] = useState(null);
  
  const [newDefinition, setNewDefinition] = useState({
    name: '',
    type: '',
    description: '',
    steps: [],
    config: {
      maxRetries: 3,
      retryBackoffMs: 30000,
      timeoutMs: 300000
    }
  });

  const {
    definitions,
    loading: workflowLoading,
    error: workflowError,
    createWorkflowDefinition,
    updateWorkflowDefinition,
    deleteWorkflowDefinition,
    toggleWorkflowStatus,
    cloneWorkflowDefinition,
    refreshData: refreshWorkflows
  } = useWorkflows();

  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    // Load examples on mount
    loadExamples();
  }, []);

  const loadExamples = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3090'}/api/workflows/examples`);
      const data = await response.json();
      if (data.success) {
        setExamples(data.data);
      }
    } catch (error) {
      console.error('Failed to load examples:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshWorkflows();
    } catch (error) {
      console.error('Error refreshing definitions:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleCreateDefinition = async () => {
    if (!newDefinition.name || !newDefinition.type || !newDefinition.description) {
      alert('Please fill in all required fields');
      return;
    }

    if (newDefinition.steps.length === 0) {
      alert('Please add at least one step');
      return;
    }

    try {
      await createWorkflowDefinition(newDefinition);
      setShowCreateForm(false);
      setNewDefinition({
        name: '',
        type: '',
        description: '',
        steps: [],
        config: {
          maxRetries: 3,
          retryBackoffMs: 30000,
          timeoutMs: 300000
        }
      });
      console.log('✅ Workflow definition created successfully');
    } catch (error) {
      console.error('❌ Failed to create workflow definition:', error);
      alert(`Failed to create workflow: ${error.message}`);
    }
  };

  const handleDeleteDefinition = async (type) => {
    if (!confirm(`Are you sure you want to delete the "${type}" workflow definition?`)) {
      return;
    }

    try {
      await deleteWorkflowDefinition(type);
      console.log('✅ Workflow definition deleted successfully');
    } catch (error) {
      console.error('❌ Failed to delete workflow definition:', error);
      alert(`Failed to delete workflow: ${error.message}`);
    }
  };

  const handleToggleStatus = async (type, currentStatus) => {
    try {
      await toggleWorkflowStatus(type, !currentStatus);
      console.log(`✅ Workflow ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
    } catch (error) {
      console.error('❌ Failed to toggle workflow status:', error);
      alert(`Failed to toggle status: ${error.message}`);
    }
  };

  const handleCloneDefinition = async (type) => {
    const newType = prompt(`Enter new type for cloned workflow (original: ${type}):`);
    const newName = prompt(`Enter new name for cloned workflow:`);
    
    if (!newType || !newName) return;

    try {
      await cloneWorkflowDefinition(type, {
        newType,
        newName,
        newDescription: `Cloned from ${type}`
      });
      console.log('✅ Workflow cloned successfully');
    } catch (error) {
      console.error('❌ Failed to clone workflow:', error);
      alert(`Failed to clone workflow: ${error.message}`);
    }
  };

  const addStep = () => {
    const step = {
      id: `step_${Date.now()}`,
      action: 'wait',
      description: 'New step',
      delay: 0,
      critical: false
    };
    setNewDefinition(prev => ({
      ...prev,
      steps: [...prev.steps, step]
    }));
  };

  const updateStep = (index, updates) => {
    setNewDefinition(prev => ({
      ...prev,
      steps: prev.steps.map((step, i) => 
        i === index ? { ...step, ...updates } : step
      )
    }));
  };

  const removeStep = (index) => {
    setNewDefinition(prev => ({
      ...prev,
      steps: prev.steps.filter((_, i) => i !== index)
    }));
  };

  const loadExample = (exampleKey) => {
    if (!examples || !examples[exampleKey]) return;
    
    const example = examples[exampleKey];
    setNewDefinition({
      ...example,
      type: `${example.type}_${Date.now()}` // Make unique
    });
    setShowExamples(false);
  };

  if (workflowLoading) {
    return <LoadingSpinner text="LOADING WORKFLOW DEFINITIONS..." />;
  }

  // Filter definitions
  const filteredDefinitions = definitions.filter(def => {
    const matchesSearch = !searchTerm || 
      def.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      def.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      def.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = !selectedType || def.type === selectedType;
    
    return matchesSearch && matchesType;
  });

  // Get unique types
  const availableTypes = [...new Set(definitions.map(def => def.type))];

  const formatDuration = (ms) => {
    if (!ms) return 'N/A';
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const getActionColor = (action) => {
    switch (action) {
      case 'wait': return '#666666';
      case 'add_prompt': return '#00ff41';
      case 'add_bio': return '#00ffff';
      case 'swipe_with_spectre': return '#ff9500';
      case 'activate_continuous_swipe': return '#ff0040';
      case 'spectre_config': return '#ff8000';
      default: return '#666666';
    }
  };

  return (
    <>
      {/* Header Controls */}
      <div className="definitions-controls">
        <div className="search-filters">
          <div className="search-group">
            <input
              type="text"
              className="form-input"
              placeholder="Search definitions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="filter-group">
            <select
              className="form-select"
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
            >
              <option value="">All Types ({definitions.length})</option>
              {availableTypes.map(type => (
                <option key={type} value={type}>
                  {type} ({definitions.filter(d => d.type === type).length})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="action-buttons">
          <button 
            className="btn btn-primary" 
            onClick={() => setShowCreateForm(true)}
          >
            ➕ Create New
          </button>
          <button 
            className="btn btn-secondary" 
            onClick={() => setShowExamples(true)}
          >
            📖 Examples
          </button>
          <button 
            className="btn btn-secondary" 
            onClick={handleRefresh}
            disabled={refreshing}
          >
            {refreshing ? '🔄 Refreshing...' : '🔄 Refresh'}
          </button>
        </div>
      </div>

      {/* Error Display */}
      {workflowError && (
        <div className="error-banner">
          <div className="error-content">
            <span className="error-icon">⚠️</span>
            <span className="error-message">{workflowError}</span>
          </div>
        </div>
      )}

      {/* Definitions Grid */}
      <div className="definitions-grid">
        {filteredDefinitions.map(definition => (
          <div key={definition.type} className="definition-card">
            <div className="definition-header">
              <div className="definition-title">
                <span className="definition-name">{definition.name}</span>
                <span className="definition-type">{definition.type}</span>
              </div>
              <div className="definition-status">
                <div className={`status-indicator ${definition.isActive ? 'active' : 'inactive'}`}>
                  {definition.isActive ? '🟢' : '🔴'}
                </div>
                <span className="status-text">
                  {definition.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>

            <div className="definition-content">
              <div className="definition-description">
                {definition.description}
              </div>

              <div className="definition-stats">
                <div className="stat-item">
                  <span className="stat-label">Steps:</span>
                  <span className="stat-value">{definition.totalSteps}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Duration:</span>
                  <span className="stat-value">{formatDuration(definition.estimatedDuration)}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Version:</span>
                  <span className="stat-value">{definition.version || '1.0'}</span>
                </div>
              </div>

              <div className="definition-steps">
                <div className="steps-header">
                  <span>Steps Overview:</span>
                </div>
                <div className="steps-list">
                  {definition.steps.slice(0, 5).map((step, index) => (
                    <div key={step.id || index} className="step-item">
                      <div 
                        className="step-indicator"
                        style={{ backgroundColor: getActionColor(step.action) }}
                      >
                        {index + 1}
                      </div>
                      <div className="step-content">
                        <div className="step-action">{step.action}</div>
                        <div className="step-description">{step.description}</div>
                      </div>
                      {step.critical && (
                        <div className="step-critical">⚠️</div>
                      )}
                    </div>
                  ))}
                  {definition.steps.length > 5 && (
                    <div className="step-item more-steps">
                      <span>+ {definition.steps.length - 5} more steps</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="definition-actions">
              <button 
                className="action-btn view-btn"
                onClick={() => setSelectedDefinition(definition)}
              >
                👁️ View Details
              </button>
              <button 
                className="action-btn clone-btn"
                onClick={() => handleCloneDefinition(definition.type)}
              >
                📋 Clone
              </button>
              <button 
                className={`action-btn ${definition.isActive ? 'deactivate-btn' : 'activate-btn'}`}
                onClick={() => handleToggleStatus(definition.type, definition.isActive)}
              >
                {definition.isActive ? '⏸️ Deactivate' : '▶️ Activate'}
              </button>
              {!['default', 'aggressive', 'test'].includes(definition.type) && (
                <button 
                  className="action-btn delete-btn"
                  onClick={() => handleDeleteDefinition(definition.type)}
                >
                  🗑️ Delete
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredDefinitions.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <div className="empty-message">No workflow definitions found</div>
          <div className="empty-description">
            {searchTerm || selectedType 
              ? 'Try adjusting your search or filters'
              : 'Create your first workflow definition to get started'}
          </div>
          <div className="empty-actions">
            <button className="btn btn-primary" onClick={() => setShowCreateForm(true)}>
              ➕ Create New Definition
            </button>
            <button className="btn btn-secondary" onClick={() => setShowExamples(true)}>
              📖 View Examples
            </button>
          </div>
        </div>
      )}

      {/* Create Definition Modal */}
      {showCreateForm && (
        <div className="modal-overlay">
          <div className="modal create-definition-modal">
            <div className="modal-header">
              <span className="modal-title">Create New Workflow Definition</span>
              <button 
                className="modal-close"
                onClick={() => setShowCreateForm(false)}
              >
                ✕
              </button>
            </div>
            
            <div className="modal-content">
              <div className="form-section">
                <div className="form-row">
                  <label>Name:</label>
                  <input
                    type="text"
                    className="form-input"
                    value={newDefinition.name}
                    onChange={(e) => setNewDefinition(prev => ({
                      ...prev,
                      name: e.target.value
                    }))}
                    placeholder="My Custom Workflow"
                  />
                </div>
                
                <div className="form-row">
                  <label>Type:</label>
                  <input
                    type="text"
                    className="form-input"
                    value={newDefinition.type}
                    onChange={(e) => setNewDefinition(prev => ({
                      ...prev,
                      type: e.target.value.replace(/[^a-zA-Z0-9_]/g, '')
                    }))}
                    placeholder="my_custom_workflow"
                  />
                </div>
                
                <div className="form-row">
                  <label>Description:</label>
                  <textarea
                    className="form-textarea"
                    value={newDefinition.description}
                    onChange={(e) => setNewDefinition(prev => ({
                      ...prev,
                      description: e.target.value
                    }))}
                    placeholder="Description of what this workflow does..."
                    rows="3"
                  />
                </div>
              </div>

              <div className="steps-section">
                <div className="steps-header">
                  <span>Workflow Steps:</span>
                  <button className="btn btn-small" onClick={addStep}>
                    ➕ Add Step
                  </button>
                </div>
                
                <div className="steps-list">
                  {newDefinition.steps.map((step, index) => (
                    <div key={step.id} className="step-editor">
                      <div className="step-number">{index + 1}</div>
                      
                      <div className="step-fields">
                        <div className="field-row">
                          <label>Action:</label>
                          <select
                            className="form-select"
                            value={step.action}
                            onChange={(e) => updateStep(index, { action: e.target.value })}
                          >
                            <option value="wait">Wait</option>
                            <option value="add_prompt">Add Prompt</option>
                            <option value="add_bio">Add Bio</option>
                            <option value="swipe_with_spectre">Swipe with Spectre</option>
                            <option value="activate_continuous_swipe">Continuous Swipe</option>
                            <option value="spectre_config">Configure Spectre</option>
                          </select>
                        </div>
                        
                        <div className="field-row">
                          <label>Description:</label>
                          <input
                            type="text"
                            className="form-input"
                            value={step.description}
                            onChange={(e) => updateStep(index, { description: e.target.value })}
                          />
                        </div>
                        
                        <div className="field-row">
                          <label>Delay (ms):</label>
                          <input
                            type="number"
                            className="form-input"
                            value={step.delay}
                            onChange={(e) => updateStep(index, { delay: parseInt(e.target.value) || 0 })}
                          />
                        </div>
                        
                        <div className="field-row">
                          <label>
                            <input
                              type="checkbox"
                              checked={step.critical}
                              onChange={(e) => updateStep(index, { critical: e.target.checked })}
                            />
                            Critical Step
                          </label>
                        </div>
                      </div>
                      
                      <button 
                        className="remove-step-btn"
                        onClick={() => removeStep(index)}
                      >
                        🗑️
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="modal-footer">
              <button 
                className="btn btn-secondary"
                onClick={() => setShowCreateForm(false)}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary"
                onClick={handleCreateDefinition}
                disabled={!newDefinition.name || !newDefinition.type || newDefinition.steps.length === 0}
              >
                Create Definition
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Examples Modal */}
      {showExamples && examples && (
        <div className="modal-overlay">
          <div className="modal examples-modal">
            <div className="modal-header">
              <span className="modal-title">Workflow Examples</span>
              <button 
                className="modal-close"
                onClick={() => setShowExamples(false)}
              >
                ✕
              </button>
            </div>
            
            <div className="modal-content">
              <div className="examples-grid">
                {Object.entries(examples).map(([key, example]) => (
                  <div key={key} className="example-card">
                    <div className="example-header">
                      <span className="example-name">{example.name}</span>
                      <span className="example-type">{example.type}</span>
                    </div>
                    
                    <div className="example-description">
                      {example.description}
                    </div>
                    
                    <div className="example-stats">
                      <span>Steps: {example.steps.length}</span>
                      <span>Duration: {formatDuration(example.steps.reduce((total, step) => total + (step.delay || 0), 0))}</span>
                    </div>
                    
                    <button 
                      className="btn btn-primary example-load-btn"
                      onClick={() => loadExample(key)}
                    >
                      Load Template
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Definition Details Modal */}
      {selectedDefinition && (
        <div className="modal-overlay">
          <div className="modal definition-details-modal">
            <div className="modal-header">
              <span className="modal-title">{selectedDefinition.name}</span>
              <button 
                className="modal-close"
                onClick={() => setSelectedDefinition(null)}
              >
                ✕
              </button>
            </div>
            
            <div className="modal-content">
              <div className="definition-info">
                <div className="info-row">
                  <span className="info-label">Type:</span>
                  <span className="info-value">{selectedDefinition.type}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Status:</span>
                  <span className={`info-value ${selectedDefinition.isActive ? 'active' : 'inactive'}`}>
                    {selectedDefinition.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="info-row">
                  <span className="info-label">Total Steps:</span>
                  <span className="info-value">{selectedDefinition.totalSteps}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Estimated Duration:</span>
                  <span className="info-value">{formatDuration(selectedDefinition.estimatedDuration)}</span>
                </div>
              </div>
              
              <div className="definition-full-description">
                <h4>Description:</h4>
                <p>{selectedDefinition.description}</p>
              </div>
              
              <div className="definition-steps-detail">
                <h4>Detailed Steps:</h4>
                {selectedDefinition.steps.map((step, index) => (
                  <div key={step.id || index} className="step-detail">
                    <div className="step-detail-header">
                      <span className="step-number">Step {index + 1}</span>
                      <span className="step-action">{step.action}</span>
                      {step.critical && <span className="critical-badge">Critical</span>}
                    </div>
                    <div className="step-detail-content">
                      <p>{step.description}</p>
                      {step.delay > 0 && (
                        <div className="step-timing">
                          Delay: {formatDuration(step.delay)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DefinitionsTab;