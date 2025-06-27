// lib/workflow-types.ts
import type { Node, Edge } from '@xyflow/react';

// Base workflow format matching backend requirements
export interface WorkflowStep {
  id: string;
  action: string;
  delay: number;
  description: string;
  critical?: boolean;
  parallel?: boolean;
  swipeCount?: number;
  minSwipes?: number;
  maxSwipes?: number;
  minIntervalMs?: number;
  maxIntervalMs?: number;
  nextStep?: string;
  timeout?: number;
}

export interface Workflow {
  name: string;
  type: string;
  description: string;
  steps: WorkflowStep[];
}

// Node data types for each action
export interface BaseNodeData {
  label: string;
  description?: string;
  delay?: number;
  critical?: boolean;
  parallel?: boolean;
}

export interface WaitNodeData extends BaseNodeData {
  delay: number;
}

export interface GotoNodeData extends BaseNodeData {
  targetNodeId: string;
  loop: boolean;
}

export interface SwipeWithSpectreNodeData extends BaseNodeData {
  swipeCount: number;
}

export interface ActivateContinuousSwipeNodeData extends BaseNodeData {
  minSwipes: number;
  maxSwipes: number;
  minIntervalMs: number;
  maxIntervalMs: number;
}

export type WorkflowNodeData = 
  | BaseNodeData
  | WaitNodeData 
  | GotoNodeData 
  | SwipeWithSpectreNodeData 
  | ActivateContinuousSwipeNodeData
  | Record<string, unknown>;

export type WorkflowNode = Node<WorkflowNodeData, string | undefined>;
export type WorkflowEdge = Edge<unknown>;

// Action type mapping
export const ACTION_TYPE_MAP: Record<string, string> = {
  'start': 'start',
  'wait': 'wait',
  'add_prompt': 'add_prompt',
  'add_bio': 'add_bio',
  'swipe_with_spectre': 'swipe_with_spectre',
  'activate_continuous_swipe': 'activate_continuous_swipe',
  'goto': 'goto',
};

export const NODE_TYPE_TO_ACTION: Record<string, string> = {
  'start': 'start',
  'wait': 'wait',
  'add_prompt': 'add_prompt',
  'add_bio': 'add_bio',
  'swipe_with_spectre': 'swipe_with_spectre',
  'activate_continuous_swipe': 'activate_continuous_swipe',
  'goto': 'goto',
};
