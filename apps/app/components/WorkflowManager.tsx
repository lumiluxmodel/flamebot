'use client'

import React, { useState, useCallback } from 'react'
import { useWorkflowDefinitions, apiClient } from '../lib/api'
import WorkflowEditor from './WorkflowEditor'
import { 
  WorkflowDefinition, 
  WorkflowStep, 
} from '../types/workflow'
import { ClientOnlyIcon } from './common'
import { 
  Plus,
  Workflow,
  Play,
  Clock,
  AlertTriangle,
  Zap,
  FileText,
  Download,
  Upload,
  RefreshCw
} from 'lucide-react'

// Sample workflows for testing
interface SampleWorkflow {
  name: string
  type: string
  description: string
  steps: WorkflowStep[]
}

export function WorkflowManager() {
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowDefinition | SampleWorkflow | null>(null)
  const [sidebarExpanded, setSidebarExpanded] = useState(true)
  const [loading, setLoading] = useState(false)
  
  const { data: workflowDefinitions, refetch: refetchDefinitions } = useWorkflowDefinitions()

  // Sample workflows for testing
  const sampleWorkflows: Record<string, SampleWorkflow> = {
    simple_workflow: {
      name: "Simple Workflow",
      type: "simple_workflow",
      description: "Basic workflow with wait and prompt",
      steps: [
        {
          id: "step1",
          action: "wait",
          delay: 60000,
          description: "Initial wait",
        },
        {
          id: "step2",
          action: "add_prompt",
          delay: 0,
          description: "Add AI prompt",
          critical: true,
        },
        {
          id: "step3",
          action: "swipe_with_spectre",
          delay: 30000,
          swipeCount: 10,
          description: "Swipe 10 times",
        },
      ],
    },
    continuous_workflow: {
      name: "Continuous Swipe Workflow",
      type: "continuous_workflow", 
      description: "Workflow with continuous swiping",
      steps: [
        {
          id: "setup",
          action: "wait",
          delay: 30000,
          description: "Setup wait",
        },
        {
          id: "prompt",
          action: "add_prompt",
          delay: 0,
          description: "Add prompt",
          critical: true,
        },
        {
          id: "continuous",
          action: "activate_continuous_swipe",
          delay: 60000,
          minSwipes: 15,
          maxSwipes: 25,
          minIntervalMs: 3600000,
          maxIntervalMs: 7200000,
          description: "Start continuous swipes",
        },
      ],
    },
  }

  const handleLoadWorkflow = (workflow: WorkflowDefinition | SampleWorkflow) => {
    setSelectedWorkflow(workflow)
  }

  const handleNewWorkflow = () => {
    setSelectedWorkflow({
      name: 'New Workflow',
      type: 'new_workflow',
      description: 'A new workflow',
      steps: []
    })
  }

  const handleSaveWorkflow = useCallback(async (steps: WorkflowStep[]) => {
    if (!selectedWorkflow) return

    try {
      setLoading(true)
      
      if ('id' in selectedWorkflow && selectedWorkflow.id) {
        // Update existing workflow
        await apiClient.updateWorkflowDefinition(selectedWorkflow.type, {
          name: selectedWorkflow.name,
          description: selectedWorkflow.description,
          steps: steps.map(step => ({
            id: step.id,
            action: step.action,
            description: step.description,
            delay: step.delay,
            critical: step.critical,
            timeout: step.timeout,
            swipeCount: step.swipeCount,
            minSwipes: step.minSwipes,
            maxSwipes: step.maxSwipes,
            minIntervalMs: step.minIntervalMs,
            maxIntervalMs: step.maxIntervalMs,
            nextStep: step.nextStep,
            parallel: step.parallel,
            config: step.config,
          }))
        })
      } else {
        // Create new workflow
        const name = prompt('Enter workflow name:', selectedWorkflow.name)
        const type = prompt('Enter workflow type:', selectedWorkflow.type)
        const description = prompt('Enter workflow description:', selectedWorkflow.description)
        
        if (!name || !type || !description) {
          alert('All fields are required')
          return
        }

        await apiClient.createWorkflowDefinition({
          name,
          type,
          description,
          steps: steps.map(step => ({
            id: step.id,
            action: step.action,
            description: step.description,
            delay: step.delay,
            critical: step.critical,
            timeout: step.timeout,
            swipeCount: step.swipeCount,
            minSwipes: step.minSwipes,
            maxSwipes: step.maxSwipes,
            minIntervalMs: step.minIntervalMs,
            maxIntervalMs: step.maxIntervalMs,
            nextStep: step.nextStep,
            parallel: step.parallel,
            config: step.config,
          }))
        })
      }
      
      await refetchDefinitions()
      alert('Workflow saved successfully!')
    } catch (error) {
      console.error('Failed to save workflow:', error)
      alert('Failed to save workflow')
    } finally {
      setLoading(false)
    }
  }, [selectedWorkflow, refetchDefinitions])



  const formatDelay = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`
    if (ms < 60000) return `${Math.round(ms / 1000)}s`
    if (ms < 3600000) return `${Math.round(ms / 60000)}m`
    return `${Math.round(ms / 3600000)}h`
  }

  return (
    <div className="h-full bg-background text-foreground flex">
      {/* Sidebar */}
      <div className={`
        transition-all duration-300 ease-in-out
        ${sidebarExpanded ? 'w-96' : 'w-20'}
        bg-zinc-50/80 dark:bg-zinc-950/80 backdrop-blur-xl
        border-r border-zinc-200 dark:border-zinc-800
        overflow-hidden flex flex-col
      `}>
        {/* Sidebar Header */}
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-100/50 dark:bg-zinc-900/50">
          <div className="flex items-center justify-between">
            {sidebarExpanded && (
              <div className="animate-fade-in">
                <h2 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <ClientOnlyIcon>
                    <Workflow className="w-5 h-5 text-yellow-600 dark:text-yellow-500" />
                  </ClientOnlyIcon>
                  ワークフロー
                </h2>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">Visual Editor 2.0</p>
              </div>
            )}
            <button
              onClick={() => setSidebarExpanded(!sidebarExpanded)}
              className="p-2 rounded-lg bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors"
            >
              <ClientOnlyIcon>
                <Workflow className={`w-4 h-4 text-yellow-600 dark:text-yellow-500 transition-transform ${sidebarExpanded ? 'rotate-180' : ''}`} />
              </ClientOnlyIcon>
            </button>
          </div>
        </div>

        {/* Sidebar Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {sidebarExpanded ? (
            <div className="p-4 space-y-6">
              {/* New Workflow Button */}
              <button
                onClick={handleNewWorkflow}
                className="w-full p-3 bg-gradient-to-r from-yellow-500 to-yellow-600 dark:from-yellow-600 dark:to-yellow-500 hover:from-yellow-600 hover:to-yellow-700 dark:hover:from-yellow-500 dark:hover:to-yellow-400 text-white rounded-lg font-medium transition-all duration-200 flex items-center gap-2 shadow-lg"
              >
                <ClientOnlyIcon>
                  <Plus className="w-4 h-4" />
                </ClientOnlyIcon>
                New Workflow
              </button>

              {/* Sample Workflows */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-zinc-600 dark:text-zinc-400">
                  <ClientOnlyIcon>
                    <FileText className="w-4 h-4" />
                  </ClientOnlyIcon>
                  Sample Templates
                </div>
                <div className="space-y-2">
                  {Object.entries(sampleWorkflows).map(([key, workflow]) => (
                    <button
                      key={`sample-workflow-${key}`}
                      onClick={() => handleLoadWorkflow(workflow)}
                      className={`w-full text-left p-3 rounded-lg border transition-all duration-200 group ${
                        selectedWorkflow?.type === workflow.type
                          ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-500/10 shadow-md'
                          : 'border-zinc-200 dark:border-zinc-700 hover:border-yellow-300 dark:hover:border-yellow-600 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`mt-1 p-1.5 rounded-md ${
                          selectedWorkflow?.type === workflow.type 
                            ? 'bg-yellow-500 text-white' 
                            : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400 group-hover:bg-yellow-100 dark:group-hover:bg-yellow-500/20'
                        }`}>
                          <ClientOnlyIcon>
                            <Workflow className="w-3 h-3" />
                          </ClientOnlyIcon>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-zinc-900 dark:text-white text-sm truncate">
                            {workflow.name}
                          </div>
                          <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 line-clamp-2">
                            {workflow.description}
                          </div>
                          <div className="flex items-center gap-3 mt-2 text-xs text-zinc-500 dark:text-zinc-500">
                            <span className="flex items-center gap-1">
                              <ClientOnlyIcon>
                                <Play className="w-3 h-3" />
                              </ClientOnlyIcon>
                              {workflow.steps.length} steps
                            </span>
                            {workflow.steps.some(s => s.critical) && (
                              <span className="flex items-center gap-1 text-yellow-600 dark:text-yellow-500">
                                <ClientOnlyIcon>
                                  <AlertTriangle className="w-3 h-3" />
                                </ClientOnlyIcon>
                                Critical
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Saved Workflows */}
              {workflowDefinitions && workflowDefinitions.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-zinc-600 dark:text-zinc-400">
                    <ClientOnlyIcon>
                      <Download className="w-4 h-4" />
                    </ClientOnlyIcon>
                    Saved Workflows
                  </div>
                  <div className="space-y-2">
                    {workflowDefinitions.map((workflow: WorkflowDefinition, index: number) => (
                      <button
                        key={`saved-workflow-${workflow.id || workflow.type || index}`}
                        onClick={() => handleLoadWorkflow(workflow)}
                        className={`w-full text-left p-3 rounded-lg border transition-all duration-200 group ${
                          selectedWorkflow?.type === workflow.type
                            ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-500/10 shadow-md'
                            : 'border-zinc-200 dark:border-zinc-700 hover:border-yellow-300 dark:hover:border-yellow-600 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`mt-1 p-1.5 rounded-md ${
                            selectedWorkflow?.type === workflow.type 
                              ? 'bg-yellow-500 text-white' 
                              : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400 group-hover:bg-yellow-100 dark:group-hover:bg-yellow-500/20'
                          }`}>
                            <ClientOnlyIcon>
                              <Workflow className="w-3 h-3" />
                            </ClientOnlyIcon>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-zinc-900 dark:text-white text-sm truncate">
                              {workflow.name}
                            </div>
                            <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 line-clamp-2">
                              {workflow.description}
                            </div>
                            <div className="flex items-center gap-3 mt-2 text-xs text-zinc-500 dark:text-zinc-500">
                              <span className="flex items-center gap-1">
                                <ClientOnlyIcon>
                                  <Play className="w-3 h-3" />
                                </ClientOnlyIcon>
                                {workflow.steps.length} steps
                              </span>
                              <span className="flex items-center gap-1">
                                <ClientOnlyIcon>
                                  <Upload className="w-3 h-3" />
                                </ClientOnlyIcon>
                                v{workflow.version}
                              </span>
                              {workflow.steps.some(s => s.critical) && (
                                <span className="flex items-center gap-1 text-yellow-600 dark:text-yellow-500">
                                  <ClientOnlyIcon>
                                    <AlertTriangle className="w-3 h-3" />
                                  </ClientOnlyIcon>
                                  Critical
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            // Collapsed sidebar icons
            <div className="p-2 space-y-2">
              <button
                onClick={handleNewWorkflow}
                className="w-full p-3 bg-yellow-500 hover:bg-yellow-600 dark:bg-yellow-600 dark:hover:bg-yellow-500 text-white rounded-lg transition-colors"
                title="New Workflow"
              >
                <ClientOnlyIcon>
                  <Plus className="w-4 h-4 mx-auto" />
                </ClientOnlyIcon>
              </button>
              {Object.entries(sampleWorkflows).map(([key, workflow]) => (
                <button
                  key={`collapsed-sample-${key}`}
                  onClick={() => handleLoadWorkflow(workflow)}
                  className={`w-full p-3 rounded-lg border transition-all ${
                    selectedWorkflow?.type === workflow.type
                      ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-500/10'
                      : 'border-zinc-200 dark:border-zinc-700 hover:border-yellow-300 dark:hover:border-yellow-600'
                  }`}
                  title={workflow.name}
                >
                  <ClientOnlyIcon>
                    <Workflow className="w-4 h-4 mx-auto text-zinc-600 dark:text-zinc-400" />
                  </ClientOnlyIcon>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Editor */}
      <div className="flex-1 flex flex-col">
        {selectedWorkflow ? (
          <>
            {/* Header */}
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div className="animate-fade-in-up">
                  <h2 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-500/20">
                      <ClientOnlyIcon>
                        <Workflow className="w-5 h-5 text-yellow-600 dark:text-yellow-500" />
                      </ClientOnlyIcon>
                    </div>
                    {selectedWorkflow.name}
                  </h2>
                  <p className="text-zinc-600 dark:text-zinc-400 text-sm mt-1">{selectedWorkflow.description}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-zinc-500 dark:text-zinc-500">
                    <span className="flex items-center gap-1">
                      <ClientOnlyIcon>
                        <Play className="w-3 h-3" />
                      </ClientOnlyIcon>
                      {selectedWorkflow.steps.length} steps
                    </span>
                    {selectedWorkflow.steps.some(s => s.critical) && (
                      <span className="flex items-center gap-1 text-yellow-600 dark:text-yellow-500">
                        <ClientOnlyIcon>
                          <AlertTriangle className="w-3 h-3" />
                        </ClientOnlyIcon>
                        Contains critical steps
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <ClientOnlyIcon>
                        <Clock className="w-3 h-3" />
                      </ClientOnlyIcon>
                      {formatDelay(selectedWorkflow.steps.reduce((sum, step) => sum + step.delay, 0))} total delay
                    </span>
                  </div>
                </div>
                {loading && (
                  <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-500">
                    <ClientOnlyIcon>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    </ClientOnlyIcon>
                    <span className="text-sm">Saving...</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Editor */}
            <div className="flex-1 p-4">
              <WorkflowEditor
                workflowData={selectedWorkflow}
                onSave={handleSaveWorkflow}
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-zinc-50/30 dark:bg-zinc-950/30">
            <div className="text-center animate-fade-in-up max-w-md">
              <div className="mb-6 relative">
                <div className="w-24 h-24 mx-auto bg-gradient-to-br from-yellow-100 to-yellow-200 dark:from-yellow-500/20 dark:to-yellow-600/20 rounded-2xl flex items-center justify-center border border-yellow-200 dark:border-yellow-500/30">
                  <ClientOnlyIcon>
                    <Workflow className="w-12 h-12 text-yellow-600 dark:text-yellow-500" />
                  </ClientOnlyIcon>
                </div>
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center">
                  <ClientOnlyIcon>
                    <Plus className="w-3 h-3 text-white" />
                  </ClientOnlyIcon>
                </div>
              </div>
              <h3 className="text-2xl font-bold text-zinc-900 dark:text-white mb-3">
                ワークフローを選択
              </h3>
              <p className="text-zinc-600 dark:text-zinc-400 mb-6 leading-relaxed">
                Choose a workflow from the sidebar to start editing, or create a new one to begin building your automation.
              </p>
              <div className="flex items-center justify-center gap-3 text-xs text-zinc-500 dark:text-zinc-500">
                <span className="flex items-center gap-1">
                  <ClientOnlyIcon>
                    <FileText className="w-3 h-3" />
                  </ClientOnlyIcon>
                  Templates available
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <ClientOnlyIcon>
                    <Zap className="w-3 h-3" />
                  </ClientOnlyIcon>
                  Visual editor
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <ClientOnlyIcon>
                    <Download className="w-3 h-3" />
                  </ClientOnlyIcon>
                  Export ready
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
