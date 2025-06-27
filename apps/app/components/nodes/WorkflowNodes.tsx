// components/nodes/WorkflowNodes.tsx
import React, { useCallback, memo } from 'react';
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
interface BaseNodeData {
  label: string;
  description?: string;
  delay?: number;
  critical?: boolean;
  parallel?: boolean;
}

interface WaitNodeData extends BaseNodeData {
  delay: number;
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

// Start Node
export const StartNode = memo(({ data, selected }: NodeProps<BaseNodeData>) => {
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
          {data.description || 'Workflow entry point'}
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
export const WaitNode = memo(({ id, data, selected }: NodeProps<WaitNodeData>) => {
  const { updateNodeData } = useReactFlow();

  const handleDelayChange = useCallback((value: string) => {
    const delay = parseInt(value) || 0;
    updateNodeData(id, { ...data, delay });
  }, [id, data, updateNodeData]);

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
            value={data.delay || 0}
            onChange={(e) => handleDelayChange(e.target.value)}
            className="nodrag w-full px-2 py-1 text-sm bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            min="0"
            step="1000"
          />
          <div className="text-xs text-blue-600 dark:text-blue-400 font-mono">
            {formatDelay(data.delay || 0)}
          </div>
        </div>
        <div className="text-xs text-zinc-600 dark:text-zinc-400">
          {data.description || 'Wait for specified delay'}
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
export const AddPromptNode = memo(({ id, data, selected }: NodeProps<BaseNodeData>) => {
  const { updateNodeData } = useReactFlow();

  const handleCriticalChange = useCallback((checked: boolean) => {
    updateNodeData(id, { ...data, critical: checked });
  }, [id, data, updateNodeData]);

  return (
    <div className={`${baseNodeStyle} ${selected ? 'ring-2 ring-yellow-500 ring-offset-2' : ''} ${data.critical ? 'border-red-500' : 'border-amber-500'}`}>
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 bg-amber-500 border-2 border-white dark:border-zinc-900"
      />
      
      <div className={`${headerStyle} ${data.critical ? 'bg-red-500' : 'bg-amber-500'}`}>
        <ClientOnlyIcon>
          <Sparkles className="w-4 h-4" />
        </ClientOnlyIcon>
        <span>ADD PROMPT</span>
        {data.critical && (
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
            checked={data.critical || false}
            onChange={(e) => handleCriticalChange(e.target.checked)}
            className="nodrag w-4 h-4 text-red-600 rounded focus:ring-red-500"
          />
          <label htmlFor={`critical-${id}`} className="text-xs text-zinc-600 dark:text-zinc-400">
            Critical Step
          </label>
        </div>
        <div className="text-xs text-zinc-600 dark:text-zinc-400">
          {data.description || 'Add AI-generated prompt'}
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
export const AddBioNode = memo(({ data, selected }: NodeProps<BaseNodeData>) => {
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
          {data.description || 'Add bio information'}
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
export const SwipeWithSpectreNode = memo(({ id, data, selected }: NodeProps<SwipeNodeData>) => {
  const { updateNodeData } = useReactFlow();

  const handleSwipeCountChange = useCallback((value: string) => {
    const swipeCount = parseInt(value) || 1;
    updateNodeData(id, { ...data, swipeCount });
  }, [id, data, updateNodeData]);

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
            value={data.swipeCount || 10}
            onChange={(e) => handleSwipeCountChange(e.target.value)}
            className="nodrag w-full px-2 py-1 text-sm bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded focus:outline-none focus:ring-2 focus:ring-cyan-500"
            min="1"
            max="100"
          />
        </div>
        <div className="text-xs text-zinc-600 dark:text-zinc-400">
          {data.description || 'Swipe with Spectre'}
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
export const ActivateContinuousSwipeNode = memo(({ id, data, selected }: NodeProps<ContinuousSwipeNodeData>) => {
  const { updateNodeData } = useReactFlow();

  const handleUpdate = useCallback((field: string, value: string) => {
    const numValue = parseInt(value) || 0;
    updateNodeData(id, { ...data, [field]: numValue });
  }, [id, data, updateNodeData]);

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
              value={data.minSwipes || 15}
              onChange={(e) => handleUpdate('minSwipes', e.target.value)}
              className="nodrag w-full px-2 py-1 text-sm bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
              min="1"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-600 dark:text-zinc-400">Max Swipes:</label>
            <input
              type="number"
              value={data.maxSwipes || 25}
              onChange={(e) => handleUpdate('maxSwipes', e.target.value)}
              className="nodrag w-full px-2 py-1 text-sm bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
              min="1"
            />
          </div>
        </div>
        <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-2">
          {data.description || 'Activate continuous swipe mode'}
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
export const GotoNode = memo(({ id, data, selected }: NodeProps<GotoNodeData>) => {
  const { updateNodeData, getNodes } = useReactFlow();
  const nodes = getNodes();

  const availableTargets = nodes.filter(node => 
    node.id !== id && node.type !== 'goto'
  );

  const handleTargetChange = useCallback((value: string) => {
    updateNodeData(id, { 
      ...data, 
      targetNodeId: value,
      loop: true 
    });
  }, [id, data, updateNodeData]);

  return (
    <div className={`${baseNodeStyle} ${selected ? 'ring-2 ring-yellow-500 ring-offset-2' : ''} border-red-500 ${data.loop ? 'animate-pulse' : ''}`}>
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
            value={data.targetNodeId || ''} 
            onChange={(e) => handleTargetChange(e.target.value)}
            className="nodrag w-full px-2 py-1 text-sm bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <option value="">Select target...</option>
            {availableTargets.map(node => (
              <option key={node.id} value={node.id}>
                {node.data.label || node.id}
              </option>
            ))}
          </select>
        </div>
        <div className="text-xs text-zinc-600 dark:text-zinc-400">
          {data.description || 'Loop back to previous step'}
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
