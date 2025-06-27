// types/workflow.ts - Complete type definitions for React Flow workflow editor

import { Node, Edge, NodeProps } from '@xyflow/react'

// Base workflow step interface matching backend
export interface WorkflowStep {
  id: string
  action: string
  description: string
  delay: number
  critical?: boolean
  timeout?: number
  // Specific action properties
  swipeCount?: number
  minSwipes?: number
  maxSwipes?: number
  minIntervalMs?: number
  maxIntervalMs?: number
  nextStep?: string
  parallel?: boolean
  config?: Record<string, unknown>
}

// Base workflow definition matching backend API
export interface WorkflowDefinition {
  id?: string
  type: string
  name: string
  description: string
  totalSteps?: number
  estimatedDuration?: number
  version?: string
  isActive?: boolean
  steps: WorkflowStep[]
  config?: Record<string, unknown>
}

// React Flow specific node data with index signature
export interface BaseNodeData extends Record<string, unknown> {
  label: string
  nodeType: string
  action: string
  description: string
  delay: number
  critical?: boolean
  timeout?: number
  // Action-specific properties
  swipeCount?: number
  minSwipes?: number
  maxSwipes?: number
  minIntervalMs?: number
  maxIntervalMs?: number
  nextStep?: string
  parallel?: boolean
  config?: Record<string, unknown>
}

// React Flow node types
export type WorkflowNodeType = 
  | 'wait'
  | 'add_prompt' 
  | 'add_bio'
  | 'swipe_with_spectre'
  | 'activate_continuous_swipe'
  | 'goto'
  | 'spectre_config'
  | 'swipe'

// React Flow edge data with index signature
export interface WorkflowEdgeData extends Record<string, unknown> {
  label?: string
  condition?: string
  animated?: boolean
}

// React Flow types
export type WorkflowNode = Node<BaseNodeData, WorkflowNodeType>
export type WorkflowEdge = Edge<WorkflowEdgeData>

// React Flow graph data
export interface ReactFlowData {
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
}

// Legacy workflow data format (for backwards compatibility)
export interface WorkflowData {
  nodes: Array<{
    id: string
    type: string
    position: { x: number; y: number }
    data: BaseNodeData
    text?: string
    properties: BaseNodeData
  }>
  edges: Array<{
    id: string
    source: string
    target: string
    data?: WorkflowEdgeData
  }>
}

// Node component props
export interface WorkflowNodeProps extends NodeProps {
  data: BaseNodeData
  onEdit?: (nodeId: string, data: BaseNodeData) => void
  onDelete?: (nodeId: string) => void
}

// Position interface
export interface Position {
  x: number
  y: number
}

// Viewport interface
export interface Viewport {
  x: number
  y: number
  zoom: number
}

// Node type configuration
export interface NodeTypeConfig {
  type: WorkflowNodeType
  label: string
  description: string
  defaultData: Partial<BaseNodeData>
  color: string
  icon?: string
}

// Available node types configuration
export const NODE_TYPES: Record<WorkflowNodeType, NodeTypeConfig> = {
  wait: {
    type: 'wait',
    label: 'Wait',
    description: 'Wait for specified duration',
    defaultData: {
      label: 'Wait',
      nodeType: 'wait',
      action: 'wait',
      description: 'Wait step',
      delay: 60000,
    },
    color: '#eab308', // yellow
  },
  add_prompt: {
    type: 'add_prompt',
    label: 'Add Prompt',
    description: 'Add AI prompt to profile',
    defaultData: {
      label: 'Add Prompt',
      nodeType: 'add_prompt',
      action: 'add_prompt',
      description: 'Add AI prompt',
      delay: 0,
      critical: true,
    },
    color: '#0ea5e9', // blue
  },
  add_bio: {
    type: 'add_bio',
    label: 'Add Bio',
    description: 'Update profile bio',
    defaultData: {
      label: 'Add Bio',
      nodeType: 'add_bio',
      action: 'add_bio',
      description: 'Update bio',
      delay: 0,
      critical: false,
    },
    color: '#10b981', // green
  },
  swipe_with_spectre: {
    type: 'swipe_with_spectre',
    label: 'Swipe with Spectre',
    description: 'Perform swipe action using Spectre',
    defaultData: {
      label: 'Swipe',
      nodeType: 'swipe_with_spectre',
      action: 'swipe_with_spectre',
      description: 'Swipe action',
      delay: 0,
      swipeCount: 10,
    },
    color: '#a855f7', // purple
  },
  activate_continuous_swipe: {
    type: 'activate_continuous_swipe',
    label: 'Continuous Swipe',
    description: 'Activate continuous swiping',
    defaultData: {
      label: 'Continuous',
      nodeType: 'activate_continuous_swipe',
      action: 'activate_continuous_swipe',
      description: 'Continuous swipe',
      delay: 0,
      minSwipes: 15,
      maxSwipes: 25,
      minIntervalMs: 3600000,
      maxIntervalMs: 7200000,
    },
    color: '#f59e0b', // amber
  },
  goto: {
    type: 'goto',
    label: 'Go To',
    description: 'Jump to another step',
    defaultData: {
      label: 'Go To',
      nodeType: 'goto',
      action: 'goto',
      description: 'Go to step',
      delay: 0,
      nextStep: '',
    },
    color: '#ef4444', // red
  },
  spectre_config: {
    type: 'spectre_config',
    label: 'Spectre Config',
    description: 'Configure Spectre settings',
    defaultData: {
      label: 'Spectre Config',
      nodeType: 'spectre_config',
      action: 'spectre_config',
      description: 'Configure Spectre',
      delay: 0,
    },
    color: '#6366f1', // indigo
  },
  swipe: {
    type: 'swipe',
    label: 'Basic Swipe',
    description: 'Basic swipe action',
    defaultData: {
      label: 'Basic Swipe',
      nodeType: 'swipe',
      action: 'swipe',
      description: 'Basic swipe',
      delay: 0,
      swipeCount: 5,
    },
    color: '#ec4899', // pink
  },
}

// Conversion utilities
export class WorkflowConverter {
  // Convert legacy WorkflowData to React Flow format
  convertLegacyToReactFlow(legacyData: WorkflowData): ReactFlowData {
    const nodes: WorkflowNode[] = legacyData.nodes.map(node => ({
      id: node.id,
      type: node.type as WorkflowNodeType,
      position: node.position,
      data: {
        label: node.data?.label || node.text || node.properties?.description || node.type,
        nodeType: node.type,
        action: node.properties?.action || node.type,
        description: node.properties?.description || node.data?.description || '',
        delay: node.properties?.delay || node.data?.delay || 0,
        critical: node.properties?.critical || node.data?.critical,
        timeout: node.properties?.timeout || node.data?.timeout,
        swipeCount: node.properties?.swipeCount || node.data?.swipeCount,
        minSwipes: node.properties?.minSwipes || node.data?.minSwipes,
        maxSwipes: node.properties?.maxSwipes || node.data?.maxSwipes,
        minIntervalMs: node.properties?.minIntervalMs || node.data?.minIntervalMs,
        maxIntervalMs: node.properties?.maxIntervalMs || node.data?.maxIntervalMs,
        nextStep: node.properties?.nextStep || node.data?.nextStep,
        parallel: node.properties?.parallel || node.data?.parallel,
        config: node.properties?.config || node.data?.config,
      },
    }))

    const edges: WorkflowEdge[] = legacyData.edges.map(edge => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      data: edge.data || {},
    }))

    return { nodes, edges }
  }

  // Convert React Flow format to legacy WorkflowData
  convertReactFlowToLegacy(reactFlowData: ReactFlowData): WorkflowData {
    const nodes = reactFlowData.nodes.map(node => ({
      id: node.id,
      type: node.type || 'wait',
      position: node.position,
      data: node.data,
      text: node.data.label,
      properties: { ...node.data },
    }))

    const edges = reactFlowData.edges.map(edge => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      data: edge.data,
    }))

    return { nodes, edges }
  }

  // Convert React Flow to workflow steps (for backend API)
  convertReactFlowToWorkflowSteps(reactFlowData: ReactFlowData): WorkflowStep[] {
    return reactFlowData.nodes.map(node => ({
      id: node.id,
      action: node.data.action,
      description: node.data.description,
      delay: node.data.delay,
      critical: node.data.critical,
      timeout: node.data.timeout,
      swipeCount: node.data.swipeCount,
      minSwipes: node.data.minSwipes,
      maxSwipes: node.data.maxSwipes,
      minIntervalMs: node.data.minIntervalMs,
      maxIntervalMs: node.data.maxIntervalMs,
      nextStep: node.data.nextStep,
      parallel: node.data.parallel,
      config: node.data.config,
    }))
  }

  // Convert workflow steps to React Flow (from backend API)
  convertWorkflowStepsToReactFlow(steps: WorkflowStep[]): ReactFlowData {
    const nodes: WorkflowNode[] = steps.map((step, index) => {
      const nodeType = step.action as WorkflowNodeType
      const config = NODE_TYPES[nodeType] || NODE_TYPES.wait

      return {
        id: step.id,
        type: nodeType,
        position: { x: 100 + (index % 3) * 200, y: 100 + Math.floor(index / 3) * 150 },
        data: {
          label: config.label,
          nodeType: step.action,
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
        },
      }
    })

    // Create automatic edges based on step order
    const edges: WorkflowEdge[] = []
    for (let i = 0; i < nodes.length - 1; i++) {
      const currentNode = nodes[i]
      const nextNode = nodes[i + 1]
      
      // Skip if current node has a goto action with specific target
      if (currentNode.data.action === 'goto' && currentNode.data.nextStep) {
        const targetNode = nodes.find(n => n.id === currentNode.data.nextStep)
        if (targetNode) {
          edges.push({
            id: `${currentNode.id}-goto-${targetNode.id}`,
            source: currentNode.id,
            target: targetNode.id,
            data: { label: 'goto', animated: true },
          })
        }
      } else {
        edges.push({
          id: `${currentNode.id}-${nextNode.id}`,
          source: currentNode.id,
          target: nextNode.id,
          data: {},
        })
      }
    }

    return { nodes, edges }
  }
} 
