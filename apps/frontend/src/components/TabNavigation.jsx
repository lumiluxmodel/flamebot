import React from 'react'

const TabNavigation = ({ tabs, activeTab, onTabChange }) => {
  return (
    <div className="nav-tabs">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={`nav-tab ${activeTab === tab.id ? 'active' : ''}`}
          onClick={() => onTabChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}

export default TabNavigation