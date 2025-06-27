// lib/workflow-serializer.ts
import { Node, Edge } from '@xyflow/react';
import { 
  Workflow, 
  WorkflowStep, 
  WorkflowNode, 
  WorkflowEdge,
  NODE_TYPE_TO_ACTION 
} from './workflow-types';

// Convert workflow JSON to React Flow format
export function workflowToReactFlow(workflow: Workflow): { 
  nodes: WorkflowNode[]; 
  edges: WorkflowEdge[]; 
} {
  const nodes: WorkflowNode[] = [];
  const edges: WorkflowEdge[] = [];
  
  // Create nodes from steps
  workflow.steps.forEach((step, index) => {
    const position = calculateNodePosition(index, step.parallel);
    
    const node: WorkflowNode = {
      id: step.id,
      type: getNodeType(step.action),
      position,
      data: {
        label: step.description || step.action,
        description: step.description,
        delay: step.delay,
        critical: step.critical,
        parallel: step.parallel,
        ...(step.swipeCount && { swipeCount: step.swipeCount }),
        ...(step.minSwipes && { minSwipes: step.minSwipes }),
        ...(step.maxSwipes && { maxSwipes: step.maxSwipes }),
        ...(step.minIntervalMs && { minIntervalMs: step.minIntervalMs }),
        ...(step.maxIntervalMs && { maxIntervalMs: step.maxIntervalMs }),
        ...(step.nextStep && { targetNodeId: step.nextStep, loop: true }),
      },
    };
    
    nodes.push(node);
  });

  // Create edges from step connections
  workflow.steps.forEach((step, index) => {
    // Regular flow to next step (if not last and no explicit nextStep)
    if (index < workflow.steps.length - 1 && !step.nextStep) {
      const edge: WorkflowEdge = {
        id: `${step.id}-${workflow.steps[index + 1].id}`,
        source: step.id,
        target: workflow.steps[index + 1].id,
        type: 'default',
      };
      edges.push(edge);
    }
    
    // Loop connections (goto)
    if (step.nextStep && step.action === 'goto') {
      const edge: WorkflowEdge = {
        id: `${step.id}-${step.nextStep}`,
        source: step.id,
        sourceHandle: 'loop',
        target: step.nextStep,
        type: 'loop',
        animated: true,
        style: {
          stroke: '#ef4444',
          strokeWidth: 2,
        },
      };
      edges.push(edge);
    }
  });

  // Add start node if not present
  if (nodes.length > 0 && !nodes.find(n => n.type === 'start')) {
    const startNode: WorkflowNode = {
      id: 'start',
      type: 'start',
      position: { x: 250, y: 0 },
      data: {
        label: 'Start',
        description: 'Workflow entry point',
      },
    };
    
    nodes.unshift(startNode);
    
    // Connect start to first step
    if (workflow.steps.length > 0) {
      edges.unshift({
        id: `start-${workflow.steps[0].id}`,
        source: 'start',
        target: workflow.steps[0].id,
        type: 'default',
      });
    }
  }

  return { nodes, edges };
}

// Convert React Flow to workflow JSON format
export function reactFlowToWorkflow(
  nodes: Node[], 
  edges: Edge[], 
  metadata: { name: string; type: string; description: string }
): Workflow {
  // Filter out start node and sort by position
  const workflowNodes = nodes
    .filter(node => node.type !== 'start')
    .sort((a, b) => a.position.y - b.position.y);

  const steps: WorkflowStep[] = workflowNodes.map(node => {
    const step: WorkflowStep = {
      id: node.id,
      action: NODE_TYPE_TO_ACTION[node.type || ''] || node.type || 'unknown',
      delay: (node.data && typeof node.data === 'object' && 'delay' in node.data && typeof node.data.delay === 'number') ? node.data.delay : 0,
      description: (node.data && typeof node.data === 'object' && 'description' in node.data && typeof node.data.description === 'string') ? node.data.description : 
                   (node.data && typeof node.data === 'object' && 'label' in node.data && typeof node.data.label === 'string') ? node.data.label : '',
      ...(node.data && typeof node.data === 'object' && 'critical' in node.data && node.data.critical ? { critical: node.data.critical } : {}),
      ...(node.data && typeof node.data === 'object' && 'parallel' in node.data && node.data.parallel ? { parallel: node.data.parallel } : {}),
      ...(node.data && typeof node.data === 'object' && 'swipeCount' in node.data && node.data.swipeCount ? { swipeCount: node.data.swipeCount } : {}),
      ...(node.data && typeof node.data === 'object' && 'minSwipes' in node.data && node.data.minSwipes ? { minSwipes: node.data.minSwipes } : {}),
      ...(node.data && typeof node.data === 'object' && 'maxSwipes' in node.data && node.data.maxSwipes ? { maxSwipes: node.data.maxSwipes } : {}),
      ...(node.data && typeof node.data === 'object' && 'minIntervalMs' in node.data && node.data.minIntervalMs ? { minIntervalMs: node.data.minIntervalMs } : {}),
      ...(node.data && typeof node.data === 'object' && 'maxIntervalMs' in node.data && node.data.maxIntervalMs ? { maxIntervalMs: node.data.maxIntervalMs } : {}),
      ...(node.data && typeof node.data === 'object' && 'timeout' in node.data && node.data.timeout ? { timeout: node.data.timeout } : {}),
    };

    // Handle goto connections
    if (node.type === 'goto' && node.data && typeof node.data === 'object' && 'targetNodeId' in node.data && node.data.targetNodeId) {
      step.nextStep = node.data.targetNodeId as string;
    }

    return step;
  });

  return {
    ...metadata,
    steps,
  };
}

// Helper functions
function getNodeType(action: string): string {
  const actionToNodeType: Record<string, string> = {
    'wait': 'wait',
    'add_prompt': 'add_prompt',
    'add_bio': 'add_bio',
    'swipe_with_spectre': 'swipe_with_spectre',
    'activate_continuous_swipe': 'activate_continuous_swipe',
    'goto': 'goto',
  };
  return actionToNodeType[action] || 'default';
}

function calculateNodePosition(
  index: number, 
  parallel?: boolean
): { x: number; y: number } {
  const baseX = 250;
  const baseY = 100;
  const verticalSpacing = 150;
  const horizontalSpacing = 300;
  
  if (parallel) {
    // Place parallel nodes to the side
    return {
      x: baseX + horizontalSpacing,
      y: baseY + index * verticalSpacing,
    };
  }
  
  return {
    x: baseX,
    y: baseY + index * verticalSpacing,
  };
}
