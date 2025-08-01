'use client'

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { X, CheckCircle, AlertTriangle, XCircle, Info } from 'lucide-react'
import { ClientOnlyIcon } from './common'

// Types
export type AlertType = 'success' | 'error' | 'warning' | 'info'

export interface AlertData {
  id: string
  type: AlertType
  title: string
  message?: string
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

export interface ConfirmData {
  id: string
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  type?: 'danger' | 'warning' | 'info'
  onConfirm: () => void
  onCancel?: () => void
}

export interface PromptData {
  id: string
  title: string
  message?: string
  placeholder?: string
  defaultValue?: string
  confirmText?: string
  cancelText?: string
  onConfirm: (value: string) => void
  onCancel?: () => void
}

// Context
interface AlertContextType {
  // Toast alerts
  showAlert: (alert: Omit<AlertData, 'id'>) => void
  showSuccess: (title: string, message?: string) => void
  showError: (title: string, message?: string) => void
  showWarning: (title: string, message?: string) => void
  showInfo: (title: string, message?: string) => void
  
  // Confirm dialogs
  showConfirm: (confirm: Omit<ConfirmData, 'id'>) => void
  
  // Prompt dialogs
  showPrompt: (prompt: Omit<PromptData, 'id' | 'onConfirm' | 'onCancel'>) => Promise<string | null>
}

const AlertContext = createContext<AlertContextType | null>(null)

export function useAlert() {
  const context = useContext(AlertContext)
  if (!context) {
    throw new Error('useAlert must be used within an AlertProvider')
  }
  return context
}

// Alert Provider Component
export function AlertProvider({ children }: { children: ReactNode }) {
  const [alerts, setAlerts] = useState<AlertData[]>([])
  const [confirms, setConfirms] = useState<ConfirmData[]>([])
  const [prompts, setPrompts] = useState<PromptData[]>([])

  const showAlert = useCallback((alert: Omit<AlertData, 'id'>) => {
    const id = `alert-${Date.now()}-${Math.random()}`
    const newAlert: AlertData = {
      ...alert,
      id,
      duration: alert.duration ?? 5000,
    }
    
    setAlerts(prev => [...prev, newAlert])
    
    if (newAlert.duration && newAlert.duration > 0) {
      setTimeout(() => {
        setAlerts(prev => prev.filter(a => a.id !== id))
      }, newAlert.duration)
    }
  }, [])

  const showSuccess = useCallback((title: string, message?: string) => {
    showAlert({ type: 'success', title, message })
  }, [showAlert])

  const showError = useCallback((title: string, message?: string) => {
    showAlert({ type: 'error', title, message, duration: 8000 })
  }, [showAlert])

  const showWarning = useCallback((title: string, message?: string) => {
    showAlert({ type: 'warning', title, message, duration: 6000 })
  }, [showAlert])

  const showInfo = useCallback((title: string, message?: string) => {
    showAlert({ type: 'info', title, message })
  }, [showAlert])

  const showConfirm = useCallback((confirm: Omit<ConfirmData, 'id'>) => {
    const id = `confirm-${Date.now()}-${Math.random()}`
    setConfirms(prev => [...prev, { ...confirm, id }])
  }, [])

  const showPrompt = useCallback((prompt: Omit<PromptData, 'id' | 'onConfirm' | 'onCancel'>): Promise<string | null> => {
    const id = `prompt-${Date.now()}-${Math.random()}`
    
    return new Promise((resolve) => {
      const promptWithCallbacks: PromptData = {
        ...prompt,
        id,
        onConfirm: (value: string) => {
          setPrompts(prev => prev.filter(p => p.id !== id))
          resolve(value)
        },
        onCancel: () => {
          setPrompts(prev => prev.filter(p => p.id !== id))
          resolve(null)
        }
      }
      
      setPrompts(prev => [...prev, promptWithCallbacks])
    })
  }, [])

  const removeAlert = useCallback((id: string) => {
    setAlerts(prev => prev.filter(a => a.id !== id))
  }, [])

  const removeConfirm = useCallback((id: string) => {
    setConfirms(prev => prev.filter(c => c.id !== id))
  }, [])


  return (
    <AlertContext.Provider value={{
      showAlert,
      showSuccess,
      showError,
      showWarning,
      showInfo,
      showConfirm,
      showPrompt,
    }}>
      {children}
      
      {/* Toast Alerts */}
      <div className="fixed top-4 right-4 z-[100] space-y-2 max-w-md">
        {alerts.map(alert => (
          <Toast key={alert.id} alert={alert} onClose={() => removeAlert(alert.id)} />
        ))}
      </div>

      {/* Confirm Dialogs */}
      {confirms.map(confirm => (
        <ConfirmDialog
          key={confirm.id}
          confirm={confirm}
          onClose={() => removeConfirm(confirm.id)}
        />
      ))}

      {/* Prompt Dialogs */}
      {prompts.map(prompt => (
        <PromptDialog
          key={prompt.id}
          prompt={prompt}
        />
      ))}
    </AlertContext.Provider>
  )
}

// Toast Alert Component
function Toast({ alert, onClose }: { alert: AlertData; onClose: () => void }) {
  const getIcon = () => {
    switch (alert.type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-500" />
      case 'error':
        return <XCircle className="w-5 h-5 text-red-600 dark:text-red-500" />
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-500" />
      case 'info':
        return <Info className="w-5 h-5 text-blue-600 dark:text-blue-500" />
    }
  }

  const getBorderColor = () => {
    switch (alert.type) {
      case 'success':
        return 'border-emerald-500/30'
      case 'error':
        return 'border-red-500/30'
      case 'warning':
        return 'border-yellow-500/30'
      case 'info':
        return 'border-blue-500/30'
    }
  }

  const getBgColor = () => {
    switch (alert.type) {
      case 'success':
        return 'bg-emerald-50 dark:bg-emerald-950/50'
      case 'error':
        return 'bg-red-50 dark:bg-red-950/50'
      case 'warning':
        return 'bg-yellow-50 dark:bg-yellow-950/50'
      case 'info':
        return 'bg-blue-50 dark:bg-blue-950/50'
    }
  }

  return (
    <div className={`
      ${getBgColor()} ${getBorderColor()}
      border rounded-lg p-4 shadow-lg backdrop-blur-xl
      animate-fade-in-scale cursor-pointer hover:scale-105 transition-transform
      cyber-card
    `}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          <ClientOnlyIcon>
            {getIcon()}
          </ClientOnlyIcon>
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-zinc-900 dark:text-white">
            {alert.title}
          </h4>
          {alert.message && (
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
              {alert.message}
            </p>
          )}
          {alert.action && (
            <button
              onClick={alert.action.onClick}
              className="text-xs font-medium text-yellow-600 dark:text-yellow-500 hover:text-yellow-700 dark:hover:text-yellow-400 mt-2 transition-colors"
            >
              {alert.action.label}
            </button>
          )}
        </div>
        <button
          onClick={onClose}
          className="flex-shrink-0 p-1 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
        >
          <ClientOnlyIcon>
            <X className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
          </ClientOnlyIcon>
        </button>
      </div>
    </div>
  )
}

// Confirm Dialog Component
function ConfirmDialog({ confirm, onClose }: { confirm: ConfirmData; onClose: () => void }) {
  const getButtonColor = () => {
    switch (confirm.type) {
      case 'danger':
        return 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
      case 'warning':
        return 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500'
      default:
        return 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
    }
  }

  const handleConfirm = () => {
    confirm.onConfirm()
    onClose()
  }

  const handleCancel = () => {
    confirm.onCancel?.()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/60 dark:bg-black/80 flex items-center justify-center z-[200] p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl border border-zinc-200 dark:border-zinc-700 w-full max-w-md animate-fade-in-scale">
        <div className="p-4">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">
            {confirm.title}
          </h3>
          <p className="text-zinc-600 dark:text-zinc-400 text-sm leading-relaxed">
            {confirm.message}
          </p>
        </div>
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 flex gap-2">
          <button
            onClick={handleCancel}
            className="flex-1 px-3 py-2 bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 text-zinc-700 dark:text-zinc-300 rounded-lg text-sm font-medium transition-colors"
          >
            {confirm.cancelText || 'Cancel'}
          </button>
          <button
            onClick={handleConfirm}
            className={`flex-1 px-3 py-2 text-white rounded-lg text-sm font-medium transition-colors ${getButtonColor()}`}
          >
            {confirm.confirmText || 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  )
}

// Prompt Dialog Component
function PromptDialog({ prompt }: { prompt: PromptData }) {
  const [value, setValue] = useState(prompt.defaultValue || '')

  const handleConfirm = () => {
    prompt.onConfirm(value)
  }

  const handleCancel = () => {
    prompt.onCancel?.()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleConfirm()
    } else if (e.key === 'Escape') {
      handleCancel()
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 dark:bg-black/80 flex items-center justify-center z-[200] p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl border border-zinc-200 dark:border-zinc-700 w-full max-w-md animate-fade-in-scale">
        <div className="p-4">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">
            {prompt.title}
          </h3>
          {prompt.message && (
            <p className="text-zinc-600 dark:text-zinc-400 text-sm leading-relaxed mb-4">
              {prompt.message}
            </p>
          )}
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={prompt.placeholder}
            className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 rounded-lg text-zinc-900 dark:text-white text-sm focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-all"
            autoFocus
          />
        </div>
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 flex gap-2">
          <button
            onClick={handleCancel}
            className="flex-1 px-3 py-2 bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 text-zinc-700 dark:text-zinc-300 rounded-lg text-sm font-medium transition-colors"
          >
            {prompt.cancelText || 'Cancel'}
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            {prompt.confirmText || 'OK'}
          </button>
        </div>
      </div>
    </div>
  )
}