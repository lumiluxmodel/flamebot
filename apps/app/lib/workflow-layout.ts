import dagre from 'dagre'
import { Node, Edge } from '@xyflow/react'

export interface LayoutOptions {
  direction?: 'TB' | 'BT' | 'LR' | 'RL'
  nodeSpacing?: number
  rankSpacing?: number
}

export function getLayoutedElements(
  nodes: Node[],
  edges: Edge[],
  options: LayoutOptions = {}
) {
  const { 
    direction = 'TB', 
    nodeSpacing = 50, 
    rankSpacing = 100 
  } = options

  const dagreGraph = new dagre.graphlib.Graph()
  dagreGraph.setDefaultEdgeLabel(() => ({}))
  
  // Configure the layout
  dagreGraph.setGraph({ 
    rankdir: direction,
    nodesep: nodeSpacing,
    ranksep: rankSpacing,
    marginx: 20,
    marginy: 20
  })

  // Add nodes to dagre graph
  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { 
      width: node.width || 200, 
      height: node.height || 80 
    })
  })

  // Add edges to dagre graph
  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target)
  })

  // Run the layout algorithm
  dagre.layout(dagreGraph)

  // Get the new positions
  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id)
    
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - (node.width || 200) / 2,
        y: nodeWithPosition.y - (node.height || 80) / 2,
      },
    }
  })

  return { nodes: layoutedNodes, edges }
}

// Save and restore viewport state
export interface ViewportState {
  x: number
  y: number
  zoom: number
}

export function saveViewportState(reactFlowInstance: any): ViewportState | null {
  if (!reactFlowInstance) return null
  
  const viewport = reactFlowInstance.getViewport()
  return {
    x: viewport.x,
    y: viewport.y,
    zoom: viewport.zoom
  }
}

export function restoreViewportState(reactFlowInstance: any, state: ViewportState) {
  if (!reactFlowInstance || !state) return
  
  reactFlowInstance.setViewport({
    x: state.x,
    y: state.y,
    zoom: state.zoom
  })
}