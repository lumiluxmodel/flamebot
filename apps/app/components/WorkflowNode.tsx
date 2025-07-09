'use client'

import { memo } from 'react'
import { Handle, Position } from '@xyflow/react'
import { WorkflowNodeProps, NODE_TYPES, WorkflowNodeType } from '../types/workflow'

export const WorkflowNode = memo(({ data, selected }: WorkflowNodeProps) => {
  const nodeType = data.nodeType as WorkflowNodeType
  const config = NODE_TYPES[nodeType]
  
  if (!config) {
    console.warn(`Unknown node type: ${nodeType}, falling back to 'wait'`)
    const fallbackConfig = NODE_TYPES.wait
    return (
      <div className="px-4 py-3 border-2 border-red-500 bg-red-50 dark:bg-red-900/20 rounded-xl">
        <div className="text-sm font-bold text-red-700 dark:text-red-400">
          Unknown Node Type: {nodeType}
        </div>
        <div className="text-xs text-red-600 dark:text-red-500 mt-1">
          Using fallback configuration
        </div>
      </div>
    )
  }
  
  return (
    <div
      className={`
        relative px-4 py-3 shadow-lg rounded-xl border-2 transition-all duration-300 ease-out
        min-w-[140px] max-w-[220px] backdrop-blur-sm
        ${selected 
          ? 'border-yellow-500 shadow-yellow-500/30 scale-105 bg-yellow-50/90 dark:bg-yellow-500/10' 
          : 'border-zinc-300 dark:border-zinc-600 hover:border-yellow-400 dark:hover:border-yellow-500 hover:shadow-lg bg-white/90 dark:bg-zinc-900/90'
        }
        cyber-card group
      `}
    >
      {/* Top Handle */}
      <Handle
        type="target"
        position={Position.Top}
        className={`
          !w-4 !h-4 !border-2 !rounded-full transition-all duration-200
          ${selected 
            ? '!bg-yellow-500 !border-yellow-400' 
            : '!bg-zinc-300 dark:!bg-zinc-600 !border-zinc-400 dark:!border-zinc-500 hover:!bg-yellow-400 dark:hover:!bg-yellow-500'
          }
        `}
      />
      
      {/* Node Header */}
      <div className="flex items-center gap-2 mb-2">
        <div 
          className={`
            w-3 h-3 rounded-full transition-all duration-200
            ${selected ? 'animate-pulse' : ''}
          `}
          style={{ backgroundColor: config.color }}
        />
        <div 
          className={`
            text-sm font-bold truncate transition-colors duration-200
            ${selected 
              ? 'text-yellow-700 dark:text-yellow-400' 
              : 'text-zinc-900 dark:text-white group-hover:text-yellow-600 dark:group-hover:text-yellow-400'
            }
          `}
        >
          {data.label}
        </div>
      </div>
      
      {/* Node Description */}
      {data.description && (
        <div className="text-xs text-zinc-600 dark:text-zinc-400 mb-3 line-clamp-2 leading-relaxed">
          {data.description}
        </div>
      )}
      
      {/* Node Properties */}
      <div className="flex flex-wrap gap-1.5 text-xs">
        {data.delay > 0 && (
          <span className="inline-flex items-center px-2 py-1 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md text-zinc-700 dark:text-zinc-300 font-mono">
            ⏱ {formatDelay(data.delay)}
          </span>
        )}
        
        {data.critical && (
          <span className="inline-flex items-center px-2 py-1 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-md text-red-700 dark:text-red-400 font-medium">
            ⚠ Critical
          </span>
        )}
        
        {data.swipeCount && (
          <span className="inline-flex items-center px-2 py-1 bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800 rounded-md text-purple-700 dark:text-purple-400 font-mono">
            ↻ {data.swipeCount}x
          </span>
        )}
        
        {data.parallel && (
          <span className="inline-flex items-center px-2 py-1 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-md text-blue-700 dark:text-blue-400 font-medium">
            ⚡ Parallel
          </span>
        )}

        {data.minSwipes && data.maxSwipes && (
          <span className="inline-flex items-center px-2 py-1 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 rounded-md text-emerald-700 dark:text-emerald-400 font-mono">
            ∞ {data.minSwipes}-{data.maxSwipes}
          </span>
        )}
      </div>

      {/* Selection Indicator */}
      {selected && (
        <div className="absolute -inset-1 bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-400 rounded-xl -z-10 animate-pulse opacity-30" />
      )}
      
      {/* Bottom Handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        className={`
          !w-4 !h-4 !border-2 !rounded-full transition-all duration-200
          ${selected 
            ? '!bg-yellow-500 !border-yellow-400' 
            : '!bg-zinc-300 dark:!bg-zinc-600 !border-zinc-400 dark:!border-zinc-500 hover:!bg-yellow-400 dark:hover:!bg-yellow-500'
          }
        `}
      />

      {/* Cyber effect lines */}
      <div className="absolute top-0 left-0 w-4 h-0.5 bg-gradient-to-r from-transparent to-zinc-300 dark:to-zinc-600 opacity-50" />
      <div className="absolute bottom-0 right-0 w-4 h-0.5 bg-gradient-to-l from-transparent to-zinc-300 dark:to-zinc-600 opacity-50" />
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
