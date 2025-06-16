import React from 'react'

const StatBox = ({ label, value, className = '' }) => {
  return (
    <div className={`stat-box ${className}`}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
    </div>
  )
}

export default StatBox