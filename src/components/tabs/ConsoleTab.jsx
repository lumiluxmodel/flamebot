import React from 'react'
import Panel from '../Panel'
import StatBox from '../StatBox'

const ConsoleTab = () => {
  return (
    <div className="dashboard-grid">
      {/* Active Tasks */}
      <Panel title="ACTIVE TASKS">
        <div className="empty-state">
          <div className="empty-state-icon">◯</div>
          <div className="empty-state-message">No active tasks</div>
          <div className="empty-state-description">
            Start a swipe task to see activity
          </div>
        </div>
      </Panel>

      {/* Models */}
      <Panel title="MODELS">
        <div className="list-container">
          <div className="list-item">
            <div className="list-item-name">
              <div className="model-color" style={{ background: '#23d100' }}></div>
              Aura
            </div>
            <div className="list-item-info">0 active</div>
          </div>
          <div className="list-item">
            <div className="list-item-name">
              <div className="model-color" style={{ background: '#e00000' }}></div>
              Lola
            </div>
            <div className="list-item-info">0 active</div>
          </div>
          <div className="list-item">
            <div className="list-item-name">
              <div className="model-color" style={{ background: '#ffb3f5' }}></div>
              Iris
            </div>
            <div className="list-item-info">0 active</div>
          </div>
          <div className="list-item">
            <div className="list-item-name">
              <div className="model-color" style={{ background: '#295eff' }}></div>
              Ciara
            </div>
            <div className="list-item-info">0 active</div>
          </div>
          <button className="add-button">[+ ADD MODEL]</button>
        </div>
      </Panel>

      {/* Channels */}
      <Panel title="CHANNELS">
        <div className="list-container">
          <div className="list-item">
            <div className="list-item-name">snap</div>
            <div className="list-item-info text-success">● Active</div>
          </div>
          <div className="list-item">
            <div className="list-item-name">gram</div>
            <div className="list-item-info text-success">● Active</div>
          </div>
          <div className="list-item">
            <div className="list-item-name">of</div>
            <div className="list-item-info text-success">● Active</div>
          </div>
          <div className="list-item">
            <div className="list-item-name">telegram</div>
            <div className="list-item-info text-warning">⚠ Beta</div>
          </div>
          <button className="add-button">[+ ADD CHANNEL]</button>
        </div>
      </Panel>

      {/* Statistics */}
      <Panel title="TODAY'S STATISTICS">
        <div className="stats-grid">
          <StatBox label="Swipes" value="1,247" />
          <StatBox label="Matches" value="89" />
          <StatBox label="Active" value="12" />
          <StatBox label="Success" value="94%" />
        </div>
      </Panel>
    </div>
  )
}

export default ConsoleTab