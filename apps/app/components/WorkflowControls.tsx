'use client'

import { useState } from 'react'
import { WorkflowNodeType, NODE_TYPES } from '../types/workflow'

interface WorkflowControlsProps {
  onAddNode: (nodeType: WorkflowNodeType) => void
  onSave?: () => Promise<void> | void
  onExportImage?: () => void
  onExportJSON?: () => void
  onFitView?: () => void
  saving?: boolean
}

export function WorkflowControls({
  onAddNode,
  onSave,
  onExportImage,
  onExportJSON,
  onFitView,
  saving = false,
}: WorkflowControlsProps) {
  const [isNodeMenuOpen, setIsNodeMenuOpen] = useState(false)

  return (
    <div className="flex flex-col gap-2 p-2 bg-zinc-900 rounded-lg shadow-lg border border-zinc-700">
      {/* Add Node Button */}
      <div className="relative">
        <button
          onClick={() => setIsNodeMenuOpen(!isNodeMenuOpen)}
          className="flex items-center gap-2 px-3 py-2 bg-yellow-600 hover:bg-yellow-500 text-white rounded text-sm font-medium transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Node
        </button>

        {/* Node Type Menu */}
        {isNodeMenuOpen && (
          <div className="absolute top-full left-0 mt-1 w-48 bg-zinc-800 border border-zinc-600 rounded-lg shadow-xl z-50">
            {Object.entries(NODE_TYPES).map(([type, config]) => (
              <button
                key={type}
                onClick={() => {
                  onAddNode(type as WorkflowNodeType)
                  setIsNodeMenuOpen(false)
                }}
                className="w-full text-left px-3 py-2 hover:bg-zinc-700 transition-colors first:rounded-t-lg last:rounded-b-lg"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: config.color }}
                  />
                  <div>
                    <div className="text-sm font-medium text-white">{config.label}</div>
                    <div className="text-xs text-zinc-400">{config.description}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-1">
        {onSave && (
          <button
            onClick={onSave}
            disabled={saving}
            className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-500 disabled:bg-green-800 text-white rounded text-sm transition-colors"
          >
            {saving ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
            {saving ? 'Saving...' : 'Save'}
          </button>
        )}

        {onFitView && (
          <button
            onClick={onFitView}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
            Fit View
          </button>
        )}

        {onExportJSON && (
          <button
            onClick={onExportJSON}
            className="flex items-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded text-sm transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export JSON
          </button>
        )}

        {onExportImage && (
          <button
            onClick={onExportImage}
            className="flex items-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-sm transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Export Image
          </button>
        )}
      </div>

      {/* Click outside to close menu */}
      {isNodeMenuOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsNodeMenuOpen(false)}
        />
      )}
    </div>
  )
} 
