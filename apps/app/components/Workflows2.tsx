'use client'

import { useState, useEffect, useCallback } from 'react'
import { useWorkflowDefinitions, apiClient } from '../lib/api'
import WorkflowEditor from './WorkflowEditor'
import { 
  WorkflowDefinition, 
  WorkflowStep, 
} from '../types/workflow'

// Sample workflows for testing
interface SampleWorkflow {
  name: string
  type: string
  description: string
  steps: WorkflowStep[]
}

const Workflows2: React.FC = () => {
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowDefinition | SampleWorkflow | null>(null)
  const [saving, setSaving] = useState(false)
  const [dimensions, setDimensions] = useState({ width: 1200, height: 600 })
  
  const { data: workflowDefinitions, refetch: refetchDefinitions } = useWorkflowDefinitions()

  // Set dimensions on client side
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setDimensions({
        width: Math.min(window.innerWidth - 400, 1400),
        height: Math.min(window.innerHeight - 200, 700)
      })
    }
  }, [])

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
      setSaving(true)
      
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
      setSaving(false)
    }
  }, [selectedWorkflow, refetchDefinitions])

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="container mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Workflow Editor</h1>
          <p className="text-zinc-400">Create and edit visual workflows</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-4">
              <h2 className="text-lg font-semibold mb-4">Workflows</h2>
              
              {/* New Workflow Button */}
              <button
                onClick={handleNewWorkflow}
                className="w-full mb-4 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded transition-colors"
              >
                New Workflow
              </button>

              {/* Sample Workflows */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-zinc-400 mb-2">Sample Workflows</h3>
                <div className="space-y-2">
                  {Object.entries(sampleWorkflows).map(([key, workflow]) => (
                    <button
                      key={key}
                      onClick={() => handleLoadWorkflow(workflow)}
                      className={`w-full text-left p-3 rounded border transition-colors ${
                        selectedWorkflow?.type === workflow.type
                          ? 'border-yellow-500 bg-yellow-500/10'
                          : 'border-zinc-700 hover:border-zinc-600 hover:bg-zinc-800'
                      }`}
                    >
                      <div className="font-medium text-sm">{workflow.name}</div>
                      <div className="text-xs text-zinc-400 mt-1">{workflow.description}</div>
                      <div className="text-xs text-zinc-500 mt-1">{workflow.steps.length} steps</div>
                    </button>
                  ))}
                </div>
              </div>

                             {/* Saved Workflows */}
               {workflowDefinitions && workflowDefinitions.length > 0 && (
                 <div>
                   <h3 className="text-sm font-medium text-zinc-400 mb-2">Saved Workflows</h3>
                   <div className="space-y-2">
                     {workflowDefinitions.map((workflow: WorkflowDefinition) => (
                      <button
                        key={workflow.id}
                        onClick={() => handleLoadWorkflow(workflow)}
                        className={`w-full text-left p-3 rounded border transition-colors ${
                          selectedWorkflow?.type === workflow.type
                            ? 'border-yellow-500 bg-yellow-500/10'
                            : 'border-zinc-700 hover:border-zinc-600 hover:bg-zinc-800'
                        }`}
                      >
                        <div className="font-medium text-sm">{workflow.name}</div>
                        <div className="text-xs text-zinc-400 mt-1">{workflow.description}</div>
                        <div className="text-xs text-zinc-500 mt-1">
                          {workflow.steps.length} steps • v{workflow.version}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Main Editor */}
          <div className="lg:col-span-3">
            {selectedWorkflow ? (
              <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-4">
                <div className="mb-4">
                  <h2 className="text-xl font-semibold">{selectedWorkflow.name}</h2>
                  <p className="text-zinc-400 text-sm">{selectedWorkflow.description}</p>
                </div>
                
                <WorkflowEditor
                  workflowData={selectedWorkflow}
                  onSave={handleSaveWorkflow}
                  width={dimensions.width}
                  height={dimensions.height}
                />
                
                {saving && (
                  <div className="mt-4 p-3 bg-blue-600/20 border border-blue-500/30 rounded-lg">
                    <div className="flex items-center gap-2 text-blue-400 text-sm">
                      <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                      Saving workflow...
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-8 text-center">
                <div className="text-zinc-400 mb-4">
                  <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium mb-2">Select a Workflow</h3>
                <p className="text-zinc-500">Choose a workflow from the sidebar to start editing, or create a new one.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Workflows2 
