// lib/workflow-serializer.ts
import { Node, Edge } from '@xyflow/react';
import { 
  Workflow, 
  WorkflowStep, 
  NODE_TYPE_TO_ACTION 
} from './workflow-types';

// Type helper functions
function getBooleanProperty(data: unknown, key: string): boolean | undefined {
  if (data && typeof data === 'object' && data !== null && key in data) {
    const value = (data as Record<string, unknown>)[key];
    if (typeof value === 'boolean') {
      return value;
    }
  }
  return undefined;
}

function getNumberProperty(data: unknown, key: string): number | undefined {
  if (data && typeof data === 'object' && data !== null && key in data) {
    const value = (data as Record<string, unknown>)[key];
    if (typeof value === 'number') {
      return value;
    }
  }
  return undefined;
}

function getStringProperty(data: unknown, key: string): string | undefined {
  if (data && typeof data === 'object' && data !== null && key in data) {
    const value = (data as Record<string, unknown>)[key];
    if (typeof value === 'string') {
      return value;
    }
  }
  return undefined;
}

// Convert workflow JSON to React Flow format
export function workflowToReactFlow(workflow: Workflow): { 
  nodes: Node[]; 
  edges: Edge[]; 
} {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  
  // Create nodes from steps
  workflow.steps.forEach((step, index) => {
    const position = calculateNodePosition(index, step.parallel);
    
    const node: Node = {
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
      const edge: Edge = {
        id: `${step.id}-${workflow.steps[index + 1].id}`,
        source: step.id,
        target: workflow.steps[index + 1].id,
        type: 'default',
      };
      edges.push(edge);
    }
    
    // Loop connections (goto)
    if (step.nextStep && step.action === 'goto') {
      const edge: Edge = {
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
    const startNode: Node = {
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
      delay: getNumberProperty(node.data, 'delay') || 0,
      description: getStringProperty(node.data, 'description') || 
                   getStringProperty(node.data, 'label') || '',
    };

    // Add optional properties only if they exist and are of correct type
    const critical = getBooleanProperty(node.data, 'critical');
    if (critical !== undefined) {
      step.critical = critical;
    }

    const parallel = getBooleanProperty(node.data, 'parallel');
    if (parallel !== undefined) {
      step.parallel = parallel;
    }

    const swipeCount = getNumberProperty(node.data, 'swipeCount');
    if (swipeCount !== undefined) {
      step.swipeCount = swipeCount;
    }

    const minSwipes = getNumberProperty(node.data, 'minSwipes');
    if (minSwipes !== undefined) {
      step.minSwipes = minSwipes;
    }

    const maxSwipes = getNumberProperty(node.data, 'maxSwipes');
    if (maxSwipes !== undefined) {
      step.maxSwipes = maxSwipes;
    }

    const minIntervalMs = getNumberProperty(node.data, 'minIntervalMs');
    if (minIntervalMs !== undefined) {
      step.minIntervalMs = minIntervalMs;
    }

    const maxIntervalMs = getNumberProperty(node.data, 'maxIntervalMs');
    if (maxIntervalMs !== undefined) {
      step.maxIntervalMs = maxIntervalMs;
    }

    const timeout = getNumberProperty(node.data, 'timeout');
    if (timeout !== undefined) {
      step.timeout = timeout;
    }

    // Handle goto connections
    if (node.type === 'goto') {
      const targetNodeId = getStringProperty(node.data, 'targetNodeId');
      if (targetNodeId) {
        step.nextStep = targetNodeId;
      }
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
