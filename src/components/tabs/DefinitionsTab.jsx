import React from 'react'
import Panel from '../Panel'
import LoadingSpinner from '../LoadingSpinner'
import { useApi } from '../../hooks/useApi'

const DefinitionsTab = () => {
  const { data: definitionsData, loading } = useApi('/api/workflows/definitions')

  if (loading) {
    return <LoadingSpinner text="LOADING WORKFLOW DEFINITIONS..." />
  }

  const definitions = definitionsData?.data?.definitions || []

  return (
    <div className="definitions-grid">
      {definitions.map((definition) => (
        <DefinitionCard key={definition.type} definition={definition} />
      ))}
    </div>
  )
}

const DefinitionCard = ({ definition }) => {
  const formatDuration = (ms) => {
    const hours = Math.floor(ms / (1000 * 60 * 60))
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))
    return `${hours}h ${minutes}m`
  }

  return (
    <div className="definition-card">
      <div className="definition-header">
        <div className="definition-name">{definition.name}</div>
        <div className="definition-description">{definition.description}</div>
      </div>
      <div className="definition-body">
        <div className="definition-steps">
          {definition.steps.map((step, index) => (
            <div key={step.id} className="definition-step">
              <div className="step-number">{step.stepNumber}</div>
              <div className="step-info">
                <div className="step-action">{step.action}</div>
                <div className="step-description">{step.description}</div>
              </div>
              <div className="step-delay">
                {formatDuration(step.delay)}
              </div>
            </div>
          ))}
        </div>
        <div className="metric-row">
          <span className="metric-label">Total Steps:</span>
          <span className="metric-value">{definition.totalSteps}</span>
        </div>
        <div className="metric-row">
          <span className="metric-label">Est. Duration:</span>
          <span className="metric-value">
            {formatDuration(definition.estimatedDuration)}
          </span>
        </div>
      </div>
    </div>
  )
}

export default DefinitionsTab