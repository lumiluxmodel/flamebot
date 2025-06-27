'use client'

import { useState, useEffect } from 'react'
import { WorkflowNode, BaseNodeData } from '../types/workflow'

interface NodePropertyEditorProps {
  node: WorkflowNode
  isOpen: boolean
  onClose: () => void
  onSave: (data: BaseNodeData) => void
  onDelete: () => void
}

export function NodePropertyEditor({
  node,
  isOpen,
  onClose,
  onSave,
  onDelete,
}: NodePropertyEditorProps) {
  const [formData, setFormData] = useState<BaseNodeData>(node.data)

  useEffect(() => {
    setFormData(node.data)
  }, [node.data])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  const updateField = (field: keyof BaseNodeData, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-zinc-900 rounded-lg shadow-xl border border-zinc-700 w-96 max-h-[80vh] overflow-y-auto">
        <div className="p-4 border-b border-zinc-700">
          <h3 className="text-lg font-semibold text-white">Edit Node Properties</h3>
          <p className="text-sm text-zinc-400">Node Type: {node.type}</p>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Label */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">
              Label
            </label>
            <input
              type="text"
              value={formData.label}
              onChange={(e) => updateField('label', e.target.value)}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded text-white focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => updateField('description', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded text-white focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
            />
          </div>

          {/* Delay */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">
              Delay (milliseconds)
            </label>
            <input
              type="number"
              value={formData.delay}
              onChange={(e) => updateField('delay', parseInt(e.target.value) || 0)}
              min="0"
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded text-white focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
            />
          </div>

          {/* Critical */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="critical"
              checked={formData.critical || false}
              onChange={(e) => updateField('critical', e.target.checked)}
              className="rounded border-zinc-600 text-yellow-600 focus:ring-yellow-500"
            />
            <label htmlFor="critical" className="ml-2 text-sm text-zinc-300">
              Critical step
            </label>
          </div>

          {/* Timeout */}
          {(formData.timeout !== undefined) && (
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">
                Timeout (milliseconds)
              </label>
              <input
                type="number"
                value={formData.timeout || 0}
                onChange={(e) => updateField('timeout', parseInt(e.target.value) || 0)}
                min="0"
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded text-white focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
              />
            </div>
          )}

          {/* Swipe Count */}
          {(formData.swipeCount !== undefined) && (
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">
                Swipe Count
              </label>
              <input
                type="number"
                value={formData.swipeCount || 0}
                onChange={(e) => updateField('swipeCount', parseInt(e.target.value) || 0)}
                min="1"
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded text-white focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
              />
            </div>
          )}

          {/* Min/Max Swipes for continuous swipe */}
          {(formData.minSwipes !== undefined) && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">
                  Min Swipes
                </label>
                <input
                  type="number"
                  value={formData.minSwipes || 0}
                  onChange={(e) => updateField('minSwipes', parseInt(e.target.value) || 0)}
                  min="1"
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded text-white focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">
                  Max Swipes
                </label>
                <input
                  type="number"
                  value={formData.maxSwipes || 0}
                  onChange={(e) => updateField('maxSwipes', parseInt(e.target.value) || 0)}
                  min="1"
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded text-white focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                />
              </div>
            </div>
          )}

          {/* Min/Max Intervals for continuous swipe */}
          {(formData.minIntervalMs !== undefined) && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">
                  Min Interval (ms)
                </label>
                <input
                  type="number"
                  value={formData.minIntervalMs || 0}
                  onChange={(e) => updateField('minIntervalMs', parseInt(e.target.value) || 0)}
                  min="1000"
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded text-white focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">
                  Max Interval (ms)
                </label>
                <input
                  type="number"
                  value={formData.maxIntervalMs || 0}
                  onChange={(e) => updateField('maxIntervalMs', parseInt(e.target.value) || 0)}
                  min="1000"
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded text-white focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                />
              </div>
            </div>
          )}

          {/* Next Step for goto */}
          {(formData.nextStep !== undefined) && (
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">
                Next Step ID
              </label>
              <input
                type="text"
                value={formData.nextStep || ''}
                onChange={(e) => updateField('nextStep', e.target.value)}
                placeholder="Enter target step ID"
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded text-white focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
              />
            </div>
          )}

          {/* Parallel */}
          {(formData.parallel !== undefined) && (
            <div className="flex items-center">
              <input
                type="checkbox"
                id="parallel"
                checked={formData.parallel || false}
                onChange={(e) => updateField('parallel', e.target.checked)}
                className="rounded border-zinc-600 text-yellow-600 focus:ring-yellow-500"
              />
              <label htmlFor="parallel" className="ml-2 text-sm text-zinc-300">
                Execute in parallel
              </label>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4 border-t border-zinc-700">
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded transition-colors"
            >
              Save Changes
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-zinc-600 hover:bg-zinc-500 text-white rounded transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                if (confirm('Are you sure you want to delete this node?')) {
                  onDelete()
                }
              }}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded transition-colors"
            >
              Delete
            </button>
          </div>
        </form>
      </div>
    </div>
  )
} 
