// components/nodes/WorkflowNodes.tsx
import React, { useCallback, memo, useMemo } from 'react';
import { Handle, Position, NodeProps, useReactFlow } from '@xyflow/react';
import { 
  Clock, 
  Sparkles, 
  User, 
  MousePointer, 
  Repeat,
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
  model?: string;
  channel?: string;
  bio?: string;
}

interface WaitNodeData extends BaseNodeData {
  delay: number;
  label: string;
}

interface GotoNodeData extends BaseNodeData {
  nextStep?: string;
  infiniteAllowed?: boolean;
  maxIterations?: number;
  trackIterations?: boolean;
}

interface SwipeNodeData extends BaseNodeData {
  swipeCount?: number;
  critical?: boolean;
}

interface AddPromptNodeData extends BaseNodeData {
  model?: string;
  channel?: string;
  critical?: boolean;
}

interface AddBioNodeData extends BaseNodeData {
  bio?: string;
  critical?: boolean;
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

function isGotoNodeData(data: unknown): data is GotoNodeData {
  return isBaseNodeData(data);
}

function isAddPromptNodeData(data: unknown): data is AddPromptNodeData {
  return isBaseNodeData(data);
}

function isAddBioNodeData(data: unknown): data is AddBioNodeData {
  return isBaseNodeData(data);
}

// Wait Node
export const WaitNode = memo(({ id, data, selected }: NodeProps) => {
  const { updateNodeData } = useReactFlow();
  const [inputMode, setInputMode] = React.useState<'ms' | 'minutes' | 'hours'>('ms');
  
  const nodeData = useMemo(() => {
    return isWaitNodeData(data) ? data : { 
      label: 'Wait', 
      delay: 60000, 
      description: 'Wait for specified delay' 
    };
  }, [data]);

  const handleDelayChange = useCallback((value: string) => {
    const numValue = parseInt(value) || 0;
    let delay = numValue;
    
    // Convert to milliseconds based on input mode
    if (inputMode === 'minutes') {
      delay = numValue * 60 * 1000;
    } else if (inputMode === 'hours') {
      delay = numValue * 60 * 60 * 1000;
    }
    
    updateNodeData(id, { ...nodeData, delay });
  }, [id, nodeData, updateNodeData, inputMode]);

  const getDisplayValue = useCallback((ms: number): number => {
    if (inputMode === 'minutes') return Math.floor(ms / (60 * 1000));
    if (inputMode === 'hours') return Math.floor(ms / (60 * 60 * 1000));
    return ms;
  }, [inputMode]);

  const formatDelay = (ms: number): string => {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
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
          <div className="flex items-center justify-between">
            <label className="text-xs text-zinc-600 dark:text-zinc-400">Delay:</label>
            <div className="flex gap-1">
              <button
                onClick={() => setInputMode('ms')}
                className={`nodrag px-2 py-0.5 text-xs rounded ${
                  inputMode === 'ms' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400'
                }`}
              >
                ms
              </button>
              <button
                onClick={() => setInputMode('minutes')}
                className={`nodrag px-2 py-0.5 text-xs rounded ${
                  inputMode === 'minutes' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400'
                }`}
              >
                min
              </button>
              <button
                onClick={() => setInputMode('hours')}
                className={`nodrag px-2 py-0.5 text-xs rounded ${
                  inputMode === 'hours' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400'
                }`}
              >
                hr
              </button>
            </div>
          </div>
          <input
            type="number"
            value={getDisplayValue(nodeData.delay || 0)}
            onChange={(e) => handleDelayChange(e.target.value)}
            className="nodrag w-full px-2 py-1 text-sm bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            min="0"
            step={inputMode === 'hours' ? '1' : inputMode === 'minutes' ? '1' : '1000'}
          />
          <div className="text-xs text-blue-600 dark:text-blue-400 font-mono">
            = {formatDelay(nodeData.delay || 0)}
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
    return isAddPromptNodeData(data) ? data : { 
      label: 'Add Prompt', 
      description: 'Add AI-generated prompt',
      critical: true,
      model: undefined,
      channel: undefined
    };
  }, [data]);

  const validModels = ['Lola', 'Aura', 'Iris'];
  const validChannels = ['gram', 'tinder', 'bumble'];

  const handleCriticalChange = useCallback((checked: boolean) => {
    updateNodeData(id, { ...nodeData, critical: checked });
  }, [id, nodeData, updateNodeData]);

  const handleModelChange = useCallback((value: string) => {
    updateNodeData(id, { ...nodeData, model: value || undefined });
  }, [id, nodeData, updateNodeData]);

  const handleChannelChange = useCallback((value: string) => {
    updateNodeData(id, { ...nodeData, channel: value || undefined });
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
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-zinc-600 dark:text-zinc-400">Model:</label>
              <select
                value={nodeData.model || ''}
                onChange={(e) => handleModelChange(e.target.value)}
                className="nodrag w-full px-2 py-1 text-sm bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded focus:outline-none focus:ring-2 focus:ring-amber-500 mt-1"
              >
                <option value="">Default</option>
                {validModels.map(model => (
                  <option key={model} value={model}>{model}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-zinc-600 dark:text-zinc-400">Channel:</label>
              <select
                value={nodeData.channel || ''}
                onChange={(e) => handleChannelChange(e.target.value)}
                className="nodrag w-full px-2 py-1 text-sm bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded focus:outline-none focus:ring-2 focus:ring-amber-500 mt-1"
              >
                <option value="">Default</option>
                {validChannels.map(channel => (
                  <option key={channel} value={channel}>{channel}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id={`critical-${id}`}
              checked={nodeData.critical !== false}
              onChange={(e) => handleCriticalChange(e.target.checked)}
              className="nodrag w-4 h-4 text-red-600 rounded focus:ring-red-500"
            />
            <label htmlFor={`critical-${id}`} className="text-xs text-zinc-600 dark:text-zinc-400">
              Critical Step
            </label>
          </div>
        </div>
        
        <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-2">
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
export const AddBioNode = memo(({ id, data, selected }: NodeProps) => {
  const { updateNodeData } = useReactFlow();
  
  const nodeData = useMemo(() => {
    return isAddBioNodeData(data) ? data : { 
      label: 'Add Bio', 
      description: 'Update profile bio',
      critical: false,
      bio: undefined
    };
  }, [data]);

  const handleCriticalChange = useCallback((checked: boolean) => {
    updateNodeData(id, { ...nodeData, critical: checked });
  }, [id, nodeData, updateNodeData]);

  const handleBioChange = useCallback((value: string) => {
    updateNodeData(id, { ...nodeData, bio: value || undefined });
  }, [id, nodeData, updateNodeData]);
  
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
        <div className="space-y-3">
          <div>
            <label className="text-xs text-zinc-600 dark:text-zinc-400">Custom Bio (optional):</label>
            <textarea
              value={nodeData.bio || ''}
              onChange={(e) => handleBioChange(e.target.value)}
              placeholder="Leave empty for AI-generated bio"
              className="nodrag w-full px-2 py-1 text-sm bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded focus:outline-none focus:ring-2 focus:ring-pink-500 mt-1 resize-none"
              rows={2}
              maxLength={500}
            />
            <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              {nodeData.bio ? `${nodeData.bio.length}/500` : 'AI-generated if empty'}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id={`critical-bio-${id}`}
              checked={nodeData.critical || false}
              onChange={(e) => handleCriticalChange(e.target.checked)}
              className="nodrag w-4 h-4 text-pink-600 rounded focus:ring-pink-500"
            />
            <label htmlFor={`critical-bio-${id}`} className="text-xs text-zinc-600 dark:text-zinc-400">
              Critical Step
            </label>
          </div>
        </div>
        
        <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-2">
          {nodeData.description || 'Update profile bio'}
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
      description: 'Auto swipe session',
      swipeCount: 20,
      critical: true
    };
  }, [data]);

  const handleSwipeCountChange = useCallback((value: string) => {
    const swipeCount = Math.max(1, Math.min(100, parseInt(value) || 1));
    updateNodeData(id, { ...nodeData, swipeCount });
  }, [id, nodeData, updateNodeData]);

  const handleCriticalChange = useCallback((checked: boolean) => {
    updateNodeData(id, { ...nodeData, critical: checked });
  }, [id, nodeData, updateNodeData]);

  return (
    <div className={`${baseNodeStyle} ${selected ? 'ring-2 ring-yellow-500 ring-offset-2' : ''} ${nodeData.critical ? 'border-red-500' : 'border-cyan-500'}`}>
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 bg-cyan-500 border-2 border-white dark:border-zinc-900"
      />
      
      <div className={`${headerStyle} ${nodeData.critical ? 'bg-red-500' : 'bg-cyan-500'}`}>
        <ClientOnlyIcon>
          <MousePointer className="w-4 h-4" />
        </ClientOnlyIcon>
        <span>SWIPE SPECTRE</span>
        {nodeData.critical && (
          <ClientOnlyIcon>
            <AlertCircle className="w-4 h-4 ml-auto" />
          </ClientOnlyIcon>
        )}
      </div>
      
      <div className={contentStyle}>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-zinc-600 dark:text-zinc-400">Swipe Count:</label>
            <input
              type="number"
              value={nodeData.swipeCount || 20}
              onChange={(e) => handleSwipeCountChange(e.target.value)}
              className="nodrag w-full px-2 py-1 text-sm bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded focus:outline-none focus:ring-2 focus:ring-cyan-500 mt-1"
              min="1"
              max="100"
            />
            <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Range: 1-100 swipes
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id={`critical-swipe-${id}`}
              checked={nodeData.critical !== false}
              onChange={(e) => handleCriticalChange(e.target.checked)}
              className="nodrag w-4 h-4 text-red-600 rounded focus:ring-red-500"
            />
            <label htmlFor={`critical-swipe-${id}`} className="text-xs text-zinc-600 dark:text-zinc-400">
              Critical Step
            </label>
          </div>
        </div>
        
        <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-2">
          {nodeData.description || 'Auto swipe session'}
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

// Goto Node (for loops)
export const GotoNode = memo(({ id, data, selected }: NodeProps) => {
  const { updateNodeData, getNodes } = useReactFlow();
  
  const nodeData = useMemo(() => {
    return isGotoNodeData(data) ? data : { 
      label: 'Go To', 
      description: 'Jump to another step',
      nextStep: '',
      infiniteAllowed: true,
      maxIterations: 1000,
      trackIterations: true
    };
  }, [data]);
  
  const nodes = getNodes();

  const availableTargets = nodes.filter(node => 
    node.id !== id && node.type !== 'goto'
  );

  const handleTargetChange = useCallback((value: string) => {
    updateNodeData(id, { 
      ...nodeData, 
      nextStep: value
    });
  }, [id, nodeData, updateNodeData]);

  const handleInfiniteChange = useCallback((checked: boolean) => {
    updateNodeData(id, { 
      ...nodeData, 
      infiniteAllowed: checked,
      maxIterations: checked ? undefined : 10
    });
  }, [id, nodeData, updateNodeData]);

  const handleMaxIterationsChange = useCallback((value: string) => {
    const maxIterations = parseInt(value) || 1;
    updateNodeData(id, { ...nodeData, maxIterations });
  }, [id, nodeData, updateNodeData]);

  return (
    <div className={`${baseNodeStyle} ${selected ? 'ring-2 ring-yellow-500 ring-offset-2' : ''} border-red-500`}>
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 bg-red-500 border-2 border-white dark:border-zinc-900"
      />
      
      <div className={`${headerStyle} bg-red-500`}>
        <ClientOnlyIcon>
          <Repeat className="w-4 h-4" />
        </ClientOnlyIcon>
        <span>GO TO</span>
        {nodeData.infiniteAllowed && (
          <span className="ml-auto text-xs">∞</span>
        )}
      </div>
      
      <div className={contentStyle}>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-zinc-600 dark:text-zinc-400">Target Step:</label>
            <select 
              value={nodeData.nextStep || ''} 
              onChange={(e) => handleTargetChange(e.target.value)}
              className="nodrag w-full px-2 py-1 text-sm bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded focus:outline-none focus:ring-2 focus:ring-red-500 mt-1"
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

          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={nodeData.infiniteAllowed !== false}
                onChange={(e) => handleInfiniteChange(e.target.checked)}
                className="nodrag w-4 h-4 text-red-600 rounded focus:ring-red-500"
              />
              <span className="text-xs text-zinc-600 dark:text-zinc-400">
                Allow infinite loops
              </span>
            </label>
            
            {nodeData.infiniteAllowed === false && (
              <div>
                <label className="text-xs text-zinc-600 dark:text-zinc-400">Max iterations:</label>
                <input
                  type="number"
                  value={nodeData.maxIterations || 10}
                  onChange={(e) => handleMaxIterationsChange(e.target.value)}
                  className="nodrag w-full px-2 py-1 text-sm bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded focus:outline-none focus:ring-2 focus:ring-red-500 mt-1"
                  min="1"
                  max="1000"
                />
              </div>
            )}
          </div>

          <div className="text-xs text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 p-2 rounded">
            {nodeData.infiniteAllowed !== false 
              ? "⚠️ This step can loop forever"
              : `✅ Limited to ${nodeData.maxIterations || 10} iterations`
            }
          </div>
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
  wait: WaitNode,
  add_prompt: AddPromptNode,
  add_bio: AddBioNode,
  swipe_with_spectre: SwipeWithSpectreNode,
  goto: GotoNode,
};
