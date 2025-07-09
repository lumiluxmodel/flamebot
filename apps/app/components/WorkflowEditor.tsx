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
import { getLayoutedElements } from '../lib/workflow-layout'

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
  readOnly?: boolean
}

export default function WorkflowEditor(props: WorkflowEditorProps) {
  return (
    <ReactFlowProvider>
      <WorkflowEditorContent {...props} />
    </ReactFlowProvider>
  )
}

function WorkflowEditorContent({
  workflowData,
  onSave,
  onDataChange,
  readOnly = false,
}: WorkflowEditorProps) {
  const reactFlowInstance = useReactFlow()
  const [nodes, setNodes, onNodesChange] = useNodesState<WorkflowNode>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<WorkflowEdge>([])
  const [selectedNode, setSelectedNode] = useState<WorkflowNode | null>(null)
  const [isPropertyEditorOpen, setIsPropertyEditorOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const converter = useRef(new WorkflowConverter())
  const [nodePositions, setNodePositions] = useState<Record<string, { x: number; y: number }>>({})
  const cleanupRef = useRef<(() => void)[]>([])

  // Load workflow data when it changes
  useEffect(() => {
    if (workflowData?.steps) {
      const reactFlowData = converter.current.convertWorkflowStepsToReactFlow(workflowData.steps)
      
      // Restore saved positions if available
      const savedPositions = localStorage.getItem(`workflow-positions-${workflowData.type}`)
      if (savedPositions) {
        const positions = JSON.parse(savedPositions)
        const nodesWithPositions = reactFlowData.nodes.map(node => {
          if (positions[node.id]) {
            return { ...node, position: positions[node.id] }
          }
          return node
        })
        setNodes(nodesWithPositions)
        setNodePositions(positions)
      } else {
        setNodes(reactFlowData.nodes)
      }
      
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


  // Save node positions when they change
  const handleNodesChange = useCallback(
    (changes: Parameters<typeof onNodesChange>[0]) => {
      onNodesChange(changes)
      
      // Update positions when nodes are dragged
      if (workflowData?.type) {
        const updatedPositions = { ...nodePositions }
        changes.forEach((change) => {
          if (change.type === 'position' && change.dragging === false && change.position) {
            updatedPositions[change.id] = change.position
          }
        })
        
        if (Object.keys(updatedPositions).length > Object.keys(nodePositions).length) {
          setNodePositions(updatedPositions)
          // Save to localStorage with debounce
          const timeoutId = setTimeout(() => {
            localStorage.setItem(`workflow-positions-${workflowData.type}`, JSON.stringify(updatedPositions))
          }, 500)
          
          // Store cleanup function
          cleanupRef.current.push(() => clearTimeout(timeoutId))
        }
      }
    },
    [onNodesChange, nodePositions, workflowData?.type]
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
      const nodesBounds = reactFlowInstance.getNodesBounds(nodes)
      const imageWidth = nodesBounds.width + 200
      const imageHeight = nodesBounds.height + 200

      const canvas = document.createElement('canvas')
      canvas.width = imageWidth
      canvas.height = imageHeight

      const ctx = canvas.getContext('2d')
      if (!ctx) return

      // White background
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, imageWidth, imageHeight)

      // Get SVG from React Flow
      const svgElement = document.querySelector('.react-flow__viewport') as SVGElement
      if (!svgElement) return

      const svgData = new XMLSerializer().serializeToString(svgElement)
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
      const svgUrl = URL.createObjectURL(svgBlob)

      const img = new Image()
      img.onload = () => {
        ctx.drawImage(img, 100, 100)
        URL.revokeObjectURL(svgUrl)
        
        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.download = `workflow-${Date.now()}.png`
            link.href = url
            link.click()
            URL.revokeObjectURL(url)
          }
        })
      }
      img.src = svgUrl
    } catch (error) {
      console.error('Failed to export image:', error)
      alert('Failed to export workflow as image')
    }
  }, [reactFlowInstance, nodes])

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

  const handleAutoLayout = useCallback(() => {
    const { nodes: layoutedNodes } = getLayoutedElements(nodes, edges)
    setNodes(layoutedNodes as WorkflowNode[])
    
    // Save the new positions
    if (workflowData?.type) {
      const newPositions: Record<string, { x: number; y: number }> = {}
      layoutedNodes.forEach(node => {
        newPositions[node.id] = node.position
      })
      setNodePositions(newPositions)
      if (workflowData?.type) {
        localStorage.setItem(`workflow-positions-${workflowData.type}`, JSON.stringify(newPositions))
      }
    }
    
    // Fit view after layout
    const timeoutId = setTimeout(() => {
      reactFlowInstance.fitView({ padding: 0.2, duration: 800 })
    }, 50)
    
    // Store cleanup function
    cleanupRef.current.push(() => clearTimeout(timeoutId))
  }, [nodes, edges, setNodes, workflowData?.type, reactFlowInstance])

  // Cleanup on unmount
  useEffect(() => {
    const cleanupFunctions = cleanupRef.current
    return () => {
      cleanupFunctions.forEach(cleanup => cleanup())
    }
  }, [])

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="bottom-left"
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
              onAutoLayout={handleAutoLayout}
              saving={saving}
            />
          </Panel>
        )}
      </ReactFlow>

      {selectedNode && isPropertyEditorOpen && (
        <NodePropertyEditor
          node={selectedNode}
          isOpen={isPropertyEditorOpen}
          allNodes={nodes}
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
