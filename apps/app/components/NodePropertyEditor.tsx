'use client'

import { useState, useEffect, useCallback } from 'react'
import { WorkflowNode, BaseNodeData, NODE_TYPES } from '../types/workflow'
import { X } from 'lucide-react'
import { useAlert } from './AlertSystem'

interface NodePropertyEditorProps {
  node: WorkflowNode
  isOpen: boolean
  onClose: () => void
  onSave: (data: BaseNodeData) => void
  onDelete: () => void
  allNodes?: WorkflowNode[] // Add this to get available nodes for goto
}

export function NodePropertyEditor({
  node,
  isOpen,
  onClose,
  onSave,
  onDelete,
  allNodes = [],
}: NodePropertyEditorProps) {
  const [formData, setFormData] = useState<BaseNodeData>(node.data)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const config = NODE_TYPES[node.type as keyof typeof NODE_TYPES] || NODE_TYPES.wait
  const { showConfirm } = useAlert()

  useEffect(() => {
    setFormData(node.data)
    setErrors({})
  }, [node.data])

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  const validateForm = useCallback((): boolean => {
    const newErrors: Record<string, string> = {}

    // Validate label
    if (!formData.label.trim()) {
      newErrors.label = 'Label is required'
    }

    // Validate swipe count
    if (formData.swipeCount !== undefined && formData.swipeCount < 1) {
      newErrors.swipeCount = 'Swipe count must be at least 1'
    }

    // Validate min/max swipes
    if (formData.minSwipes !== undefined && formData.maxSwipes !== undefined) {
      if (formData.minSwipes < 1) {
        newErrors.minSwipes = 'Minimum swipes must be at least 1'
      }
      if (formData.maxSwipes < 1) {
        newErrors.maxSwipes = 'Maximum swipes must be at least 1'
      }
      if (formData.minSwipes > formData.maxSwipes) {
        newErrors.maxSwipes = 'Maximum must be greater than minimum'
      }
    }

    // Validate min/max intervals
    if (formData.minIntervalMs !== undefined && formData.maxIntervalMs !== undefined) {
      if (formData.minIntervalMs < 1000) {
        newErrors.minIntervalMs = 'Minimum interval must be at least 1000ms'
      }
      if (formData.maxIntervalMs < 1000) {
        newErrors.maxIntervalMs = 'Maximum interval must be at least 1000ms'
      }
      if (formData.minIntervalMs > formData.maxIntervalMs) {
        newErrors.maxIntervalMs = 'Maximum must be greater than minimum'
      }
    }

    // Validate timeout
    if (formData.timeout !== undefined && formData.timeout < 0) {
      newErrors.timeout = 'Timeout cannot be negative'
    }

    // Validate delay
    if (formData.delay < 0) {
      newErrors.delay = 'Delay cannot be negative'
    }

    // Validate goto fields
    if (formData.nextStep !== undefined) {
      if (formData.infiniteAllowed === false && formData.maxIterations !== undefined) {
        if (formData.maxIterations < 1) {
          newErrors.maxIterations = 'Max iterations must be at least 1'
        }
        if (formData.maxIterations > 1000) {
          newErrors.maxIterations = 'Max iterations cannot exceed 1000'
        }
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [formData])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (validateForm()) {
      onSave(formData)
    }
  }

  const updateField = (field: keyof BaseNodeData, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  // Get available nodes for goto dropdown (excluding current node)
  const availableNodes = allNodes.filter(n => n.id !== node.id)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 dark:bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl border border-zinc-200 dark:border-zinc-700 w-full max-w-md max-h-[85vh] overflow-hidden animate-fade-in-scale">
        {/* Header */}
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: config.color }}
              />
              <div>
                <h3 className="font-semibold text-zinc-900 dark:text-white">Edit Node</h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">{config.label}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
            >
              <X className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
          {/* Label */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              Label
            </label>
            <input
              type="text"
              value={formData.label}
              onChange={(e) => updateField('label', e.target.value)}
              className={`w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border rounded-lg text-zinc-900 dark:text-white text-sm focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-all ${
                errors.label 
                  ? 'border-red-500 dark:border-red-500' 
                  : 'border-zinc-300 dark:border-zinc-600'
              }`}
              placeholder="Enter node label"
              required
            />
            {errors.label && (
              <p className="text-xs text-red-500 mt-1">{errors.label}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => updateField('description', e.target.value)}
              rows={2}
              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 rounded-lg text-zinc-900 dark:text-white text-sm focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-all resize-none"
              placeholder="Enter node description"
            />
          </div>

          {/* Delay */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              Delay (ms)
            </label>
            <input
              type="number"
              value={formData.delay}
              onChange={(e) => updateField('delay', Math.max(0, parseInt(e.target.value) || 0))}
              min="0"
              step="1000"
              className={`w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border rounded-lg text-zinc-900 dark:text-white text-sm focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-all ${
                errors.delay 
                  ? 'border-red-500 dark:border-red-500' 
                  : 'border-zinc-300 dark:border-zinc-600'
              }`}
              placeholder="0"
            />
            {errors.delay && (
              <p className="text-xs text-red-500 mt-1">{errors.delay}</p>
            )}
          </div>

          {/* Toggles */}
          <div className="grid grid-cols-2 gap-3">
            <label className="flex items-center gap-2 p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
              <input
                type="checkbox"
                checked={formData.critical || false}
                onChange={(e) => updateField('critical', e.target.checked)}
                className="rounded border-zinc-300 dark:border-zinc-600 text-yellow-600 focus:ring-yellow-500 focus:ring-offset-0"
              />
              <span className="text-sm text-zinc-700 dark:text-zinc-300">Critical</span>
            </label>

            {(formData.parallel !== undefined) && (
              <label className="flex items-center gap-2 p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                <input
                  type="checkbox"
                  checked={formData.parallel || false}
                  onChange={(e) => updateField('parallel', e.target.checked)}
                  className="rounded border-zinc-300 dark:border-zinc-600 text-yellow-600 focus:ring-yellow-500 focus:ring-offset-0"
                />
                <span className="text-sm text-zinc-700 dark:text-zinc-300">Parallel</span>
              </label>
            )}
          </div>

          {/* Timeout */}
          {(formData.timeout !== undefined) && (
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                Timeout (ms)
              </label>
              <input
                type="number"
                value={formData.timeout || 0}
                onChange={(e) => updateField('timeout', parseInt(e.target.value) || 0)}
                min="0"
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 rounded-lg text-zinc-900 dark:text-white text-sm focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-all"
              />
            </div>
          )}

          {/* Swipe Count */}
          {(formData.swipeCount !== undefined) && (
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                Swipe Count
              </label>
              <input
                type="number"
                value={formData.swipeCount || 0}
                onChange={(e) => updateField('swipeCount', Math.max(1, parseInt(e.target.value) || 0))}
                min="1"
                className={`w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border rounded-lg text-zinc-900 dark:text-white text-sm focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-all ${
                  errors.swipeCount 
                    ? 'border-red-500 dark:border-red-500' 
                    : 'border-zinc-300 dark:border-zinc-600'
                }`}
              />
              {errors.swipeCount && (
                <p className="text-xs text-red-500 mt-1">{errors.swipeCount}</p>
              )}
            </div>
          )}

          {/* Min/Max Swipes */}
          {(formData.minSwipes !== undefined) && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Min Swipes
                </label>
                <input
                  type="number"
                  value={formData.minSwipes || 0}
                  onChange={(e) => updateField('minSwipes', parseInt(e.target.value) || 0)}
                  min="1"
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 rounded-lg text-zinc-900 dark:text-white text-sm focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Max Swipes
                </label>
                <input
                  type="number"
                  value={formData.maxSwipes || 0}
                  onChange={(e) => updateField('maxSwipes', parseInt(e.target.value) || 0)}
                  min="1"
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 rounded-lg text-zinc-900 dark:text-white text-sm focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-all"
                />
              </div>
            </div>
          )}

          {/* Min/Max Intervals */}
          {(formData.minIntervalMs !== undefined) && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Min Interval (ms)
                </label>
                <input
                  type="number"
                  value={formData.minIntervalMs || 0}
                  onChange={(e) => updateField('minIntervalMs', parseInt(e.target.value) || 0)}
                  min="1000"
                  step="1000"
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 rounded-lg text-zinc-900 dark:text-white text-sm focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Max Interval (ms)
                </label>
                <input
                  type="number"
                  value={formData.maxIntervalMs || 0}
                  onChange={(e) => updateField('maxIntervalMs', parseInt(e.target.value) || 0)}
                  min="1000"
                  step="1000"
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 rounded-lg text-zinc-900 dark:text-white text-sm focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-all"
                />
              </div>
            </div>
          )}

          {/* Go To - Improved with select */}
          {(formData.nextStep !== undefined) && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Go To Node
                </label>
                <select
                  value={formData.nextStep || ''}
                  onChange={(e) => updateField('nextStep', e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 rounded-lg text-zinc-900 dark:text-white text-sm focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-all"
                >
                  <option value="">Select target node...</option>
                  {availableNodes.map((targetNode) => (
                    <option key={targetNode.id} value={targetNode.id}>
                      {targetNode.data.label} ({targetNode.type})
                    </option>
                  ))}
                </select>
                {availableNodes.length === 0 && (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                    No other nodes available to connect to
                  </p>
                )}
              </div>

              {/* Loop Control Section */}
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-300 mb-3">Loop Control</h4>
                
                {/* Infinite Allowed Toggle */}
                <div className="mb-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.infiniteAllowed !== false}
                      onChange={(e) => updateField('infiniteAllowed', e.target.checked)}
                      className="rounded border-yellow-300 dark:border-yellow-600 text-yellow-600 focus:ring-yellow-500 focus:ring-offset-0"
                    />
                    <span className="text-sm text-yellow-800 dark:text-yellow-300">Allow infinite loops</span>
                  </label>
                  <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-1 ml-6">
                    {formData.infiniteAllowed !== false 
                      ? "⚠️ This step can loop forever" 
                      : "✅ Loop will be limited by max iterations"
                    }
                  </p>
                </div>

                {/* Max Iterations - Only show if infinite is disabled */}
                {formData.infiniteAllowed === false && (
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-yellow-800 dark:text-yellow-300 mb-1.5">
                      Max Iterations
                    </label>
                    <input
                      type="number"
                      value={formData.maxIterations || 10}
                      onChange={(e) => updateField('maxIterations', Math.max(1, parseInt(e.target.value) || 10))}
                      min="1"
                      max="1000"
                      className="w-full px-3 py-2 bg-white dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-600 rounded-lg text-yellow-900 dark:text-yellow-100 text-sm focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-all"
                      placeholder="10"
                    />
                    <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-1">
                      Loop will fail after this many iterations
                    </p>
                  </div>
                )}

                {/* Track Iterations Toggle */}
                <div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.trackIterations !== false}
                      onChange={(e) => updateField('trackIterations', e.target.checked)}
                      className="rounded border-yellow-300 dark:border-yellow-600 text-yellow-600 focus:ring-yellow-500 focus:ring-offset-0"
                    />
                    <span className="text-sm text-yellow-800 dark:text-yellow-300">Track iterations in database</span>
                  </label>
                  <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-1 ml-6">
                    Recommended for monitoring and debugging
                  </p>
                </div>
              </div>
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSubmit}
              className="flex-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Save
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 text-zinc-700 dark:text-zinc-300 rounded-lg text-sm font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                showConfirm({
                  title: 'Delete Node',
                  message: 'Are you sure you want to delete this node? This action cannot be undone.',
                  type: 'danger',
                  confirmText: 'Delete',
                  cancelText: 'Cancel',
                  onConfirm: onDelete
                })
              }}
              className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  )
} 
