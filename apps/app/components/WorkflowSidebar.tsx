// components/WorkflowSidebar.tsx
import React from 'react';
import { 
  Clock, 
  Sparkles, 
  User, 
  MousePointer, 
  Activity,
  Repeat,
  Play,
  Info
} from 'lucide-react';
import { ClientOnlyIcon } from './common';

interface NodeType {
  type: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  description: string;
}

const nodeTypes: NodeType[] = [
  {
    type: 'start',
    label: 'Start',
    icon: <Play className="w-4 h-4" />,
    color: 'bg-emerald-500',
    description: 'Workflow entry point'
  },
  {
    type: 'wait',
    label: 'Wait',
    icon: <Clock className="w-4 h-4" />,
    color: 'bg-blue-500',
    description: 'Delay execution'
  },
  {
    type: 'add_prompt',
    label: 'Add Prompt',
    icon: <Sparkles className="w-4 h-4" />,
    color: 'bg-amber-500',
    description: 'Add AI-generated prompt'
  },
  {
    type: 'add_bio',
    label: 'Add Bio',
    icon: <User className="w-4 h-4" />,
    color: 'bg-pink-500',
    description: 'Add bio information'
  },
  {
    type: 'swipe_with_spectre',
    label: 'Swipe Spectre',
    icon: <MousePointer className="w-4 h-4" />,
    color: 'bg-cyan-500',
    description: 'Configure swipe action'
  },
  {
    type: 'activate_continuous_swipe',
    label: 'Continuous Swipe',
    icon: <Activity className="w-4 h-4" />,
    color: 'bg-purple-500',
    description: 'Infinite random swipes'
  },
  {
    type: 'goto',
    label: 'Go To (Loop)',
    icon: <Repeat className="w-4 h-4" />,
    color: 'bg-red-500',
    description: 'Create loops'
  }
] as const;

export const WorkflowSidebar: React.FC = () => {
  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="w-64 bg-zinc-50 dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-900 p-4 overflow-y-auto">
      <div className="mb-6">
        <h3 className="text-sm font-bold text-zinc-900 dark:text-white mb-2">NODE PALETTE</h3>
        <div className="text-[10px] text-zinc-600 dark:text-zinc-500">
          DRAG_TO_ADD • CONNECT_WITH_HANDLES
        </div>
      </div>

      <div className="space-y-3">
        {nodeTypes.map((node) => (
          <div
            key={node.type}
            className="group cursor-move"
            draggable
            onDragStart={(e) => onDragStart(e, node.type)}
          >
            <div className="bg-white dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-800 rounded-lg p-3 hover:border-yellow-500/50 hover:shadow-md transition-all duration-200 group-active:scale-95">
              <div className="flex items-center gap-3 mb-2">
                <div className={`${node.color} p-2 rounded text-white`}>
                  <ClientOnlyIcon>
                    {node.icon}
                  </ClientOnlyIcon>
                </div>
                <div className="flex-1">
                  <div className="font-medium text-sm text-zinc-900 dark:text-white">
                    {node.label}
                  </div>
                  <div className="text-[10px] text-zinc-600 dark:text-zinc-500">
                    {node.type}
                  </div>
                </div>
              </div>
              <div className="text-xs text-zinc-600 dark:text-zinc-400">
                {node.description}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 p-4 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900/50 rounded-lg">
        <div className="flex items-start gap-2">
          <ClientOnlyIcon>
            <Info className="w-4 h-4 text-yellow-600 dark:text-yellow-500 mt-0.5" />
          </ClientOnlyIcon>
          <div className="text-xs text-yellow-800 dark:text-yellow-200">
            <div className="font-medium mb-1">Tips:</div>
            <ul className="space-y-1 text-[10px]">
              <li>• Use Backspace to delete</li>
              <li>• Hold Shift for multi-select</li>
              <li>• Ctrl+scroll to zoom</li>
              <li>• Loops connect backwards</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
