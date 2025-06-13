import React from 'react'

const LoadingSpinner = ({ text = "LOADING WORKFLOW DATA..." }) => {
  return (
    <div className="loading">
      <div className="loading-text">{text}</div>
      <div className="loading-bar">
        <div className="loading-progress"></div>
      </div>
    </div>
  )
}

export default LoadingSpinner