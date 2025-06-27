// components/nodes/WorkflowNodes.tsx
import React, { useCallback, memo, useMemo } from 'react';
import { Handle, Position, NodeProps, useReactFlow } from '@xyflow/react';
import { 
  Clock, 
  Sparkles, 
  User, 
  MousePointer, 
  Activity,
  Repeat,
  Play,
  AlertCircle
} from 'lucide-react';
import { ClientOnlyIcon } from '../common';

// Base node styles
const baseNodeStyle = `
  min-w-[200px] rounded-lg border-2 transition-all duration-200
  bg-white dark:bg-zinc-900 
  hover:shadow-lg hover:scale-105
  cursor-pointer
`;

const headerStyle = `
  px-4 py-2 rounded-t-md flex items-center gap-2 text-white font-medium text-sm
`;

const contentStyle = `
  p-4 space-y-3
`;

// Node data interfaces
interface BaseNodeData extends Record<string, unknown> {
  label: string;
  description?: string;
  delay?: number;
  critical?: boolean;
  parallel?: boolean;
}

interface WaitNodeData extends BaseNodeData {
  delay: number;
  label: string;
}

interface GotoNodeData extends BaseNodeData {
  targetNodeId?: string;
  loop?: boolean;
}

interface SwipeNodeData extends BaseNodeData {
  swipeCount?: number;
}

interface ContinuousSwipeNodeData extends BaseNodeData {
  minSwipes?: number;
  maxSwipes?: number;
  minIntervalMs?: number;
  maxIntervalMs?: number;
}

// Type guard functions
function isBaseNodeData(data: unknown): data is BaseNodeData {
  return (
    typeof data === 'object' &&
    data !== null &&
    'label' in data &&
    typeof (data as Record<string, unknown>).label === 'string'
  );
}

function isWaitNodeData(data: unknown): data is WaitNodeData {
  return isBaseNodeData(data) && 'delay' in data && typeof (data as Record<string, unknown>).delay === 'number';
}

function isSwipeNodeData(data: unknown): data is SwipeNodeData {
  return isBaseNodeData(data);
}

function isContinuousSwipeNodeData(data: unknown): data is ContinuousSwipeNodeData {
  return isBaseNodeData(data);
}

function isGotoNodeData(data: unknown): data is GotoNodeData {
  return isBaseNodeData(data);
}

// Start Node
export const StartNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = isBaseNodeData(data) ? data : { label: 'Start', description: 'Workflow entry point' };
  
  return (
    <div className={`${baseNodeStyle} ${selected ? 'ring-2 ring-yellow-500 ring-offset-2' : ''} border-emerald-500`}>
      <div className={`${headerStyle} bg-emerald-500`}>
        <ClientOnlyIcon>
          <Play className="w-4 h-4" />
        </ClientOnlyIcon>
        <span>START</span>
      </div>
      <div className={contentStyle}>
        <div className="text-xs text-zinc-600 dark:text-zinc-400">
          {nodeData.description || 'Workflow entry point'}
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 bg-emerald-500 border-2 border-white dark:border-zinc-900"
      />
    </div>
  );
});
StartNode.displayName = 'StartNode';

// Wait Node
export const WaitNode = memo(({ id, data, selected }: NodeProps) => {
  const { updateNodeData } = useReactFlow();
  
  const nodeData = useMemo(() => {
    return isWaitNodeData(data) ? data : { 
      label: 'Wait', 
      delay: 60000, 
      description: 'Wait for specified delay' 
    };
  }, [data]);

  const handleDelayChange = useCallback((value: string) => {
    const delay = parseInt(value) || 0;
    updateNodeData(id, { ...nodeData, delay });
  }, [id, nodeData, updateNodeData]);

  const formatDelay = (ms: number): string => {
    if (ms < 60000) return `${Math.floor(ms / 1000)}s`;
    if (ms < 3600000) return `${Math.floor(ms / 60000)}m`;
    return `${Math.floor(ms / 3600000)}h`;
  };

  return (
    <div className={`${baseNodeStyle} ${selected ? 'ring-2 ring-yellow-500 ring-offset-2' : ''} border-blue-500`}>
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 bg-blue-500 border-2 border-white dark:border-zinc-900"
      />
      
      <div className={`${headerStyle} bg-blue-500`}>
        <ClientOnlyIcon>
          <Clock className="w-4 h-4" />
        </ClientOnlyIcon>
        <span>WAIT</span>
      </div>
      
      <div className={contentStyle}>
        <div className="space-y-2">
          <label className="text-xs text-zinc-600 dark:text-zinc-400">Delay (ms):</label>
          <input
            type="number"
            value={nodeData.delay || 0}
            onChange={(e) => handleDelayChange(e.target.value)}
            className="nodrag w-full px-2 py-1 text-sm bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            min="0"
            step="1000"
          />
          <div className="text-xs text-blue-600 dark:text-blue-400 font-mono">
            {formatDelay(nodeData.delay || 0)}
          </div>
        </div>
        <div className="text-xs text-zinc-600 dark:text-zinc-400">
          {nodeData.description || 'Wait for specified delay'}
        </div>
      </div>
      
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 bg-blue-500 border-2 border-white dark:border-zinc-900"
      />
    </div>
  );
});
WaitNode.displayName = 'WaitNode';

// Add Prompt Node
export const AddPromptNode = memo(({ id, data, selected }: NodeProps) => {
  const { updateNodeData } = useReactFlow();
  
  const nodeData = useMemo(() => {
    return isBaseNodeData(data) ? data : { 
      label: 'Add Prompt', 
      description: 'Add AI-generated prompt',
      critical: false 
    };
  }, [data]);

  const handleCriticalChange = useCallback((checked: boolean) => {
    updateNodeData(id, { ...nodeData, critical: checked });
  }, [id, nodeData, updateNodeData]);

  return (
    <div className={`${baseNodeStyle} ${selected ? 'ring-2 ring-yellow-500 ring-offset-2' : ''} ${nodeData.critical ? 'border-red-500' : 'border-amber-500'}`}>
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 bg-amber-500 border-2 border-white dark:border-zinc-900"
      />
      
      <div className={`${headerStyle} ${nodeData.critical ? 'bg-red-500' : 'bg-amber-500'}`}>
        <ClientOnlyIcon>
          <Sparkles className="w-4 h-4" />
        </ClientOnlyIcon>
        <span>ADD PROMPT</span>
        {nodeData.critical && (
          <ClientOnlyIcon>
            <AlertCircle className="w-4 h-4 ml-auto" />
          </ClientOnlyIcon>
        )}
      </div>
      
      <div className={contentStyle}>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id={`critical-${id}`}
            checked={nodeData.critical || false}
            onChange={(e) => handleCriticalChange(e.target.checked)}
            className="nodrag w-4 h-4 text-red-600 rounded focus:ring-red-500"
          />
          <label htmlFor={`critical-${id}`} className="text-xs text-zinc-600 dark:text-zinc-400">
            Critical Step
          </label>
        </div>
        <div className="text-xs text-zinc-600 dark:text-zinc-400">
          {nodeData.description || 'Add AI-generated prompt'}
        </div>
      </div>
      
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 bg-amber-500 border-2 border-white dark:border-zinc-900"
      />
    </div>
  );
});
AddPromptNode.displayName = 'AddPromptNode';

// Add Bio Node
export const AddBioNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = isBaseNodeData(data) ? data : { 
    label: 'Add Bio', 
    description: 'Add bio information' 
  };
  
  return (
    <div className={`${baseNodeStyle} ${selected ? 'ring-2 ring-yellow-500 ring-offset-2' : ''} border-pink-500`}>
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 bg-pink-500 border-2 border-white dark:border-zinc-900"
      />
      
      <div className={`${headerStyle} bg-pink-500`}>
        <ClientOnlyIcon>
          <User className="w-4 h-4" />
        </ClientOnlyIcon>
        <span>ADD BIO</span>
      </div>
      
      <div className={contentStyle}>
        <div className="text-xs text-zinc-600 dark:text-zinc-400">
          {nodeData.description || 'Add bio information'}
        </div>
      </div>
      
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 bg-pink-500 border-2 border-white dark:border-zinc-900"
      />
    </div>
  );
});
AddBioNode.displayName = 'AddBioNode';

// Swipe with Spectre Node
export const SwipeWithSpectreNode = memo(({ id, data, selected }: NodeProps) => {
  const { updateNodeData } = useReactFlow();
  
  const nodeData = useMemo(() => {
    return isSwipeNodeData(data) ? data : { 
      label: 'Swipe with Spectre', 
      description: 'Swipe with Spectre',
      swipeCount: 10 
    };
  }, [data]);

  const handleSwipeCountChange = useCallback((value: string) => {
    const swipeCount = parseInt(value) || 1;
    updateNodeData(id, { ...nodeData, swipeCount });
  }, [id, nodeData, updateNodeData]);

  return (
    <div className={`${baseNodeStyle} ${selected ? 'ring-2 ring-yellow-500 ring-offset-2' : ''} border-cyan-500`}>
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 bg-cyan-500 border-2 border-white dark:border-zinc-900"
      />
      
      <div className={`${headerStyle} bg-cyan-500`}>
        <ClientOnlyIcon>
          <MousePointer className="w-4 h-4" />
        </ClientOnlyIcon>
        <span>SWIPE SPECTRE</span>
      </div>
      
      <div className={contentStyle}>
        <div className="space-y-2">
          <label className="text-xs text-zinc-600 dark:text-zinc-400">Swipe Count:</label>
          <input
            type="number"
            value={nodeData.swipeCount || 10}
            onChange={(e) => handleSwipeCountChange(e.target.value)}
            className="nodrag w-full px-2 py-1 text-sm bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded focus:outline-none focus:ring-2 focus:ring-cyan-500"
            min="1"
            max="100"
          />
        </div>
        <div className="text-xs text-zinc-600 dark:text-zinc-400">
          {nodeData.description || 'Swipe with Spectre'}
        </div>
      </div>
      
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 bg-cyan-500 border-2 border-white dark:border-zinc-900"
      />
    </div>
  );
});
SwipeWithSpectreNode.displayName = 'SwipeWithSpectreNode';

// Activate Continuous Swipe Node
export const ActivateContinuousSwipeNode = memo(({ id, data, selected }: NodeProps) => {
  const { updateNodeData } = useReactFlow();
  
  const nodeData = useMemo(() => {
    return isContinuousSwipeNodeData(data) ? data : { 
      label: 'Continuous Swipe', 
      description: 'Activate continuous swipe mode',
      minSwipes: 15,
      maxSwipes: 25,
      minIntervalMs: 3600000,
      maxIntervalMs: 7200000
    };
  }, [data]);

  const handleUpdate = useCallback((field: string, value: string) => {
    const numValue = parseInt(value) || 0;
    updateNodeData(id, { ...nodeData, [field]: numValue });
  }, [id, nodeData, updateNodeData]);

  return (
    <div className={`${baseNodeStyle} ${selected ? 'ring-2 ring-yellow-500 ring-offset-2' : ''} border-purple-500`}>
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 bg-purple-500 border-2 border-white dark:border-zinc-900"
      />
      
      <div className={`${headerStyle} bg-purple-500`}>
        <ClientOnlyIcon>
          <Activity className="w-4 h-4" />
        </ClientOnlyIcon>
        <span>CONTINUOUS SWIPE</span>
      </div>
      
      <div className={contentStyle}>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-zinc-600 dark:text-zinc-400">Min Swipes:</label>
            <input
              type="number"
              value={nodeData.minSwipes || 15}
              onChange={(e) => handleUpdate('minSwipes', e.target.value)}
              className="nodrag w-full px-2 py-1 text-sm bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
              min="1"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-600 dark:text-zinc-400">Max Swipes:</label>
            <input
              type="number"
              value={nodeData.maxSwipes || 25}
              onChange={(e) => handleUpdate('maxSwipes', e.target.value)}
              className="nodrag w-full px-2 py-1 text-sm bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
              min="1"
            />
          </div>
        </div>
        <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-2">
          {nodeData.description || 'Activate continuous swipe mode'}
        </div>
      </div>
      
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 bg-purple-500 border-2 border-white dark:border-zinc-900"
      />
    </div>
  );
});
ActivateContinuousSwipeNode.displayName = 'ActivateContinuousSwipeNode';

// Goto Node (for loops)
export const GotoNode = memo(({ id, data, selected }: NodeProps) => {
  const { updateNodeData, getNodes } = useReactFlow();
  
  const nodeData = useMemo(() => {
    return isGotoNodeData(data) ? data : { 
      label: 'Go To', 
      description: 'Loop back to previous step',
      loop: false,
      targetNodeId: ''
    };
  }, [data]);
  
  const nodes = getNodes();

  const availableTargets = nodes.filter(node => 
    node.id !== id && node.type !== 'goto'
  );

  const handleTargetChange = useCallback((value: string) => {
    updateNodeData(id, { 
      ...nodeData, 
      targetNodeId: value,
      loop: true 
    });
  }, [id, nodeData, updateNodeData]);

  return (
    <div className={`${baseNodeStyle} ${selected ? 'ring-2 ring-yellow-500 ring-offset-2' : ''} border-red-500 ${nodeData.loop ? 'animate-pulse' : ''}`}>
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 bg-red-500 border-2 border-white dark:border-zinc-900"
      />
      
      <div className={`${headerStyle} bg-red-500`}>
        <ClientOnlyIcon>
          <Repeat className="w-4 h-4" />
        </ClientOnlyIcon>
        <span>GO TO (LOOP)</span>
      </div>
      
      <div className={contentStyle}>
        <div className="space-y-2">
          <label className="text-xs text-zinc-600 dark:text-zinc-400">Target Step:</label>
          <select 
            value={nodeData.targetNodeId || ''} 
            onChange={(e) => handleTargetChange(e.target.value)}
            className="nodrag w-full px-2 py-1 text-sm bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <option value="">Select target...</option>
            {availableTargets.map(node => {
              const targetData = isBaseNodeData(node.data) ? node.data : { label: node.id };
              return (
                <option key={node.id} value={node.id}>
                  {targetData.label || node.id}
                </option>
              );
            })}
          </select>
        </div>
        <div className="text-xs text-zinc-600 dark:text-zinc-400">
          {nodeData.description || 'Loop back to previous step'}
        </div>
      </div>
      
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 bg-red-500 border-2 border-white dark:border-zinc-900"
      />
      
      {/* Special handle for loop connections */}
      <Handle
        type="source"
        position={Position.Left}
        id="loop"
        className="w-3 h-3 bg-red-600 border-2 border-white dark:border-zinc-900"
        style={{ top: '50%' }}
      />
    </div>
  );
});
GotoNode.displayName = 'GotoNode';

// Export all node types
export const nodeTypes = {
  start: StartNode,
  wait: WaitNode,
  add_prompt: AddPromptNode,
  add_bio: AddBioNode,
  swipe_with_spectre: SwipeWithSpectreNode,
  activate_continuous_swipe: ActivateContinuousSwipeNode,
  goto: GotoNode,
};
