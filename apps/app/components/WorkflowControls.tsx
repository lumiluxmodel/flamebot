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
    <div className="flex flex-col gap-3 p-3 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl rounded-lg shadow-lg border border-zinc-200 dark:border-zinc-700 cyber-card">
      {/* Add Node Button */}
      <div className="relative">
        <button
          onClick={() => setIsNodeMenuOpen(!isNodeMenuOpen)}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-yellow-500 to-yellow-600 dark:from-yellow-600 dark:to-yellow-500 hover:from-yellow-600 hover:to-yellow-700 dark:hover:from-yellow-500 dark:hover:to-yellow-400 text-white rounded-lg text-sm font-medium transition-all duration-200 cyber-button shadow-md hover:shadow-lg w-full justify-center"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Node
          <svg 
            className={`w-3 h-3 transition-transform duration-200 ${isNodeMenuOpen ? 'rotate-180' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Node Type Menu */}
        {isNodeMenuOpen && (
          <div className="absolute top-full left-0 mt-2 w-64 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-xl z-50 cyber-card animate-fade-in-scale">
            <div className="p-2 border-b border-zinc-200 dark:border-zinc-700">
              <h3 className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wide">Select Node Type</h3>
            </div>
            <div className="max-h-80 overflow-y-auto custom-scrollbar">
              {Object.entries(NODE_TYPES).map(([type, config]) => (
                <button
                  key={type}
                  onClick={() => {
                    onAddNode(type as WorkflowNodeType)
                    setIsNodeMenuOpen(false)
                  }}
                  className="w-full text-left p-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-all duration-200 first:rounded-t-lg last:rounded-b-lg group border-b border-zinc-100 dark:border-zinc-800 last:border-b-0"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded-full flex-shrink-0 shadow-sm group-hover:shadow-md transition-shadow duration-200"
                      style={{ backgroundColor: config.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-zinc-900 dark:text-white group-hover:text-yellow-600 dark:group-hover:text-yellow-400 transition-colors">
                        {config.label}
                      </div>
                      <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5 line-clamp-2">
                        {config.description}
                      </div>
                    </div>
                    <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <svg className="w-4 h-4 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-2">
        {onSave && (
          <button
            onClick={onSave}
            disabled={saving}
            className="flex items-center gap-2 px-3 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 dark:disabled:bg-emerald-800 text-white rounded-lg text-sm transition-all duration-200 cyber-button shadow-sm hover:shadow-md disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Saving...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Save
              </>
            )}
          </button>
        )}

        {onFitView && (
          <button
            onClick={onFitView}
            className="flex items-center gap-2 px-3 py-2 bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-500 text-white rounded-lg text-sm transition-all duration-200 cyber-button shadow-sm hover:shadow-md"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
            Fit View
          </button>
        )}

        <div className="flex gap-2">
          {onExportJSON && (
            <button
              onClick={onExportJSON}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-purple-500 hover:bg-purple-600 dark:bg-purple-600 dark:hover:bg-purple-500 text-white rounded-lg text-sm transition-all duration-200 cyber-button shadow-sm hover:shadow-md"
              title="Export as JSON"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              JSON
            </button>
          )}

          {onExportImage && (
            <button
              onClick={onExportImage}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-indigo-500 hover:bg-indigo-600 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white rounded-lg text-sm transition-all duration-200 cyber-button shadow-sm hover:shadow-md"
              title="Export as Image"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              IMG
            </button>
          )}
        </div>
      </div>

      {/* Status indicator */}
      <div className="pt-2 border-t border-zinc-200 dark:border-zinc-700">
        <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Editor Ready</span>
        </div>
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
