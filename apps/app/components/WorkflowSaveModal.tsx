'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'

interface WorkflowSaveModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: { name: string; type: string; description: string }) => void
  initialData?: {
    name: string
    type: string
    description: string
  }
  mode: 'create' | 'update'
}

export function WorkflowSaveModal({
  isOpen,
  onClose,
  onSave,
  initialData = { name: '', type: '', description: '' },
  mode
}: WorkflowSaveModalProps) {
  const [formData, setFormData] = useState(initialData)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (isOpen) {
      setFormData(initialData)
      setErrors({})
    }
  }, [isOpen, initialData])

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

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required'
    }

    if (mode === 'create' && !formData.type.trim()) {
      newErrors.type = 'Type is required'
    } else if (mode === 'create' && !/^[a-zA-Z0-9_]+$/.test(formData.type)) {
      newErrors.type = 'Type must contain only letters, numbers, and underscores'
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (validateForm()) {
      onSave(formData)
    }
  }

  const updateField = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 dark:bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl border border-zinc-200 dark:border-zinc-700 w-full max-w-md animate-fade-in-scale">
        {/* Header */}
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-zinc-900 dark:text-white">
              {mode === 'create' ? 'Create New Workflow' : 'Update Workflow'}
            </h3>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
            >
              <X className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              Workflow Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => updateField('name', e.target.value)}
              className={`w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border rounded-lg text-zinc-900 dark:text-white text-sm focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-all ${
                errors.name 
                  ? 'border-red-500 dark:border-red-500' 
                  : 'border-zinc-300 dark:border-zinc-600'
              }`}
              placeholder="e.g., My Workflow"
              autoFocus
            />
            {errors.name && (
              <p className="text-xs text-red-500 mt-1">{errors.name}</p>
            )}
          </div>

          {/* Type (only for create mode) */}
          {mode === 'create' && (
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                Workflow Type
              </label>
              <input
                type="text"
                value={formData.type}
                onChange={(e) => updateField('type', e.target.value)}
                className={`w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border rounded-lg text-zinc-900 dark:text-white text-sm focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-all ${
                  errors.type 
                    ? 'border-red-500 dark:border-red-500' 
                    : 'border-zinc-300 dark:border-zinc-600'
                }`}
                placeholder="e.g., my_workflow"
              />
              {errors.type && (
                <p className="text-xs text-red-500 mt-1">{errors.type}</p>
              )}
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                Use only letters, numbers, and underscores
              </p>
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => updateField('description', e.target.value)}
              rows={3}
              className={`w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border rounded-lg text-zinc-900 dark:text-white text-sm focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-all resize-none ${
                errors.description 
                  ? 'border-red-500 dark:border-red-500' 
                  : 'border-zinc-300 dark:border-zinc-600'
              }`}
              placeholder="Describe what this workflow does..."
            />
            {errors.description && (
              <p className="text-xs text-red-500 mt-1">{errors.description}</p>
            )}
          </div>
        </form>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSubmit}
              className="flex-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              {mode === 'create' ? 'Create' : 'Update'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 text-zinc-700 dark:text-zinc-300 rounded-lg text-sm font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}