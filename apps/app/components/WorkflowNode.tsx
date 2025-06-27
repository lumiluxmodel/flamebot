'use client'

import { memo } from 'react'
import { Handle, Position } from '@xyflow/react'
import { WorkflowNodeProps, NODE_TYPES, WorkflowNodeType } from '../types/workflow'

export const WorkflowNode = memo(({ data, selected }: WorkflowNodeProps) => {
  const nodeType = data.nodeType as WorkflowNodeType
  const config = NODE_TYPES[nodeType] || NODE_TYPES.wait
  
  return (
    <div
      className={`
        px-4 py-3 shadow-lg rounded-lg border-2 transition-all duration-200
        min-w-[120px] max-w-[200px]
        ${selected 
          ? 'border-yellow-400 shadow-yellow-400/50' 
          : 'border-zinc-600 hover:border-zinc-400'
        }
      `}
      style={{
        backgroundColor: '#1a1a1a',
        borderColor: selected ? '#facc15' : config.color,
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 !bg-zinc-600"
        style={{ borderColor: config.color }}
      />
      
      <div className="flex flex-col">
        <div 
          className="text-sm font-semibold mb-1 truncate"
          style={{ color: config.color }}
        >
          {data.label}
        </div>
        
        <div className="text-xs text-zinc-400 mb-2 truncate">
          {data.description}
        </div>
        
        <div className="flex flex-wrap gap-1 text-xs">
          {data.delay > 0 && (
            <span className="px-2 py-1 bg-zinc-800 rounded text-zinc-300">
              {formatDelay(data.delay)}
            </span>
          )}
          
          {data.critical && (
            <span className="px-2 py-1 bg-red-900 text-red-200 rounded">
              Critical
            </span>
          )}
          
          {data.swipeCount && (
            <span className="px-2 py-1 bg-purple-900 text-purple-200 rounded">
              {data.swipeCount} swipes
            </span>
          )}
          
          {data.parallel && (
            <span className="px-2 py-1 bg-blue-900 text-blue-200 rounded">
              Parallel
            </span>
          )}
        </div>
      </div>
      
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 !bg-zinc-600"
        style={{ borderColor: config.color }}
      />
    </div>
  )
})

WorkflowNode.displayName = 'WorkflowNode'

function formatDelay(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${Math.round(ms / 1000)}s`
  if (ms < 3600000) return `${Math.round(ms / 60000)}m`
  return `${Math.round(ms / 3600000)}h`
} 
