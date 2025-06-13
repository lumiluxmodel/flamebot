import React from 'react'

const Panel = ({ title, children, className = '', action = null }) => {
  return (
    <div className={`panel ${className}`}>
      <div className="panel-header">
        <span>{title}</span>
        {action && action}
      </div>
      <div className="panel-content">
        {children}
      </div>
    </div>
  )
}

export default Panel