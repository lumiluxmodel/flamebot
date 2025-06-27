'use client'

import { useCallback, useEffect, useState, useRef } from 'react'
import {
  ReactFlow,
  addEdge,
  useNodesState,
  useEdgesState,
  Background,
  Controls,
  MiniMap,
  Panel,
  Connection,
  ReactFlowProvider,
  useReactFlow,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import {
  WorkflowNode,
  WorkflowEdge,
  ReactFlowData,
  BaseNodeData,
  NODE_TYPES,
  WorkflowNodeType,
  WorkflowConverter,
  WorkflowDefinition,
  WorkflowStep,
} from '../types/workflow'
import { WorkflowControls } from './WorkflowControls'
import { NodePropertyEditor } from './NodePropertyEditor'
import { WorkflowNode as CustomWorkflowNode } from './WorkflowNode'

// Node types for React Flow
const nodeTypes = {
  wait: CustomWorkflowNode,
  add_prompt: CustomWorkflowNode,
  add_bio: CustomWorkflowNode,
  swipe_with_spectre: CustomWorkflowNode,
  activate_continuous_swipe: CustomWorkflowNode,
  goto: CustomWorkflowNode,
  spectre_config: CustomWorkflowNode,
  swipe: CustomWorkflowNode,
}

interface WorkflowEditorProps {
  workflowData?: WorkflowDefinition | null
  onSave?: (steps: WorkflowStep[]) => Promise<void>
  onDataChange?: (data: ReactFlowData) => void
  width?: number
  height?: number
  readOnly?: boolean
}

function WorkflowEditorContent({
  workflowData,
  onSave,
  onDataChange,
  width = 1200,
  height = 600,
  readOnly = false,
}: WorkflowEditorProps) {
  const reactFlowInstance = useReactFlow()
  const [nodes, setNodes, onNodesChange] = useNodesState<WorkflowNode>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<WorkflowEdge>([])
  const [selectedNode, setSelectedNode] = useState<WorkflowNode | null>(null)
  const [isPropertyEditorOpen, setIsPropertyEditorOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const converter = useRef(new WorkflowConverter())

  // Load workflow data when it changes
  useEffect(() => {
    if (workflowData?.steps) {
      const reactFlowData = converter.current.convertWorkflowStepsToReactFlow(workflowData.steps)
      setNodes(reactFlowData.nodes)
      setEdges(reactFlowData.edges)
    }
  }, [workflowData, setNodes, setEdges])

  // Handle data changes
  useEffect(() => {
    if (onDataChange) {
      onDataChange({ nodes, edges })
    }
  }, [nodes, edges, onDataChange])

  const onConnect = useCallback(
    (params: Connection) => {
      if (readOnly) return
      setEdges((eds) => addEdge(params, eds))
    },
    [setEdges, readOnly]
  )

  const onNodeClick = useCallback(
    (event: React.MouseEvent, node: WorkflowNode) => {
      if (readOnly) return
      setSelectedNode(node)
      setIsPropertyEditorOpen(true)
    },
    [readOnly]
  )

  const addNode = useCallback(
    (nodeType: WorkflowNodeType) => {
      if (readOnly) return

      const config = NODE_TYPES[nodeType]
      const newNode: WorkflowNode = {
        id: `${nodeType}-${Date.now()}`,
        type: nodeType,
        position: {
          x: Math.random() * 400 + 100,
          y: Math.random() * 400 + 100,
        },
        data: {
          label: config.label,
          nodeType: nodeType,
          action: nodeType,
          description: config.description,
          delay: 0,
          ...config.defaultData,
        },
      }

      setNodes((nds) => [...nds, newNode])
    },
    [setNodes, readOnly]
  )

  const updateNode = useCallback(
    (nodeId: string, newData: BaseNodeData) => {
      setNodes((nds) =>
        nds.map((node) =>
          node.id === nodeId
            ? { ...node, data: { ...node.data, ...newData } }
            : node
        )
      )
    },
    [setNodes]
  )

  const deleteNode = useCallback(
    (nodeId: string) => {
      if (readOnly) return
      setNodes((nds) => nds.filter((node) => node.id !== nodeId))
      setEdges((eds) => eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId))
    },
    [setNodes, setEdges, readOnly]
  )

  const handleSave = useCallback(async () => {
    if (!onSave || saving) return

    try {
      setSaving(true)
      const steps = converter.current.convertReactFlowToWorkflowSteps({ nodes, edges })
      await onSave(steps)
    } catch (error) {
      console.error('Failed to save workflow:', error)
      alert('Failed to save workflow')
    } finally {
      setSaving(false)
    }
  }, [onSave, nodes, edges, saving])

  const handleExportImage = useCallback(async () => {
    try {
      const dataUrl = await reactFlowInstance.getViewport()
      // Create download link
      const link = document.createElement('a')
      link.download = `workflow-${Date.now()}.png`
      link.href = dataUrl as unknown as string
      link.click()
    } catch (error) {
      console.error('Failed to export image:', error)
    }
  }, [reactFlowInstance])

  const handleExportJSON = useCallback(() => {
    const steps = converter.current.convertReactFlowToWorkflowSteps({ nodes, edges })
    const blob = new Blob([JSON.stringify(steps, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `workflow-${Date.now()}.json`
    link.click()
    URL.revokeObjectURL(url)
  }, [nodes, edges])

  const fitView = useCallback(() => {
    reactFlowInstance.fitView({ padding: 0.2 })
  }, [reactFlowInstance])

  return (
    <div
      className="workflow-editor-v2 border border-zinc-800 rounded-lg bg-black"
      style={{ width: `${width}px`, height: `${height}px` }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="bottom-left"
        className="dark"
        nodesDraggable={!readOnly}
        nodesConnectable={!readOnly}
        elementsSelectable={!readOnly}
      >
        <Background color="#333" />
        <Controls />
        <MiniMap
          nodeColor={(node) => {
            const nodeType = node.type as WorkflowNodeType
            return NODE_TYPES[nodeType]?.color || '#666'
          }}
          position="top-right"
        />
        
        {!readOnly && (
          <Panel position="top-left">
            <WorkflowControls
              onAddNode={addNode}
              onSave={onSave ? handleSave : undefined}
              onExportImage={handleExportImage}
              onExportJSON={handleExportJSON}
              onFitView={fitView}
              saving={saving}
            />
          </Panel>
        )}
      </ReactFlow>

      {selectedNode && isPropertyEditorOpen && (
        <NodePropertyEditor
          node={selectedNode}
          isOpen={isPropertyEditorOpen}
          onClose={() => {
            setIsPropertyEditorOpen(false)
            setSelectedNode(null)
          }}
          onSave={(nodeData) => {
            updateNode(selectedNode.id, nodeData)
            setIsPropertyEditorOpen(false)
            setSelectedNode(null)
          }}
          onDelete={() => {
            deleteNode(selectedNode.id)
            setIsPropertyEditorOpen(false)
            setSelectedNode(null)
          }}
        />
      )}
    </div>
  )
}

export default function WorkflowEditor(props: WorkflowEditorProps) {
  return (
    <ReactFlowProvider>
      <WorkflowEditorContent {...props} />
    </ReactFlowProvider>
  )
} 
