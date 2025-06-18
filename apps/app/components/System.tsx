// components/System.tsx
import React from 'react';
import { useWorkflowStats } from '../lib/api';
import { LoadingSpinner, ErrorDisplay, AnimatedCounter } from './common';

const System = () => {
  const { data: stats, loading, error, refetch } = useWorkflowStats();

  if (loading) {
    return (
      <div>
        <header className="mb-8 md:mb-12">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tighter mb-2 text-zinc-900 dark:text-white">SYSTEM HEALTH</h1>
          <div className="text-[11px] text-zinc-600 dark:text-zinc-500">診断レポート</div>
        </header>
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return <ErrorDisplay error={error} onRetry={refetch} />;
  }

  if (!stats) return null;

  const executedTasks = parseInt(stats.executions.totalExecutions);

  return (
    <div>
      <header className="mb-8 md:mb-12">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tighter mb-2 text-zinc-900 dark:text-white">SYSTEM HEALTH</h1>
        <div className="text-[11px] text-zinc-600 dark:text-zinc-500">診断レポート</div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-16">
        <div>
          <div className="text-[10px] text-zinc-600 mb-6 flex items-center gap-4">
            <span>COMPONENTS</span>
            <div className="flex-1 h-[1px] bg-gradient-to-r from-yellow-500/20 to-transparent"></div>
          </div>
          <div className="space-y-4">
            {[
              { name: 'WORKFLOW EXECUTOR', status: stats.executor.activeExecutions >= 0 ? 'OPERATIONAL' : 'OFFLINE', health: true },
              { name: 'CRON MANAGER', status: stats.cronSystem.isRunning ? 'OPERATIONAL' : 'OFFLINE', health: stats.cronSystem.isRunning },
              { name: 'TASK SCHEDULER', status: 'OPERATIONAL', health: true },
              { name: 'DATABASE', status: parseInt(stats.database.totalWorkflows) > 0 ? 'OPERATIONAL' : 'DEGRADED', health: parseInt(stats.database.totalWorkflows) > 0 }
            ].map((item, i) => (
              <div 
                key={i} 
                className="flex justify-between items-center py-3 border-b border-zinc-200 dark:border-zinc-950 hover:border-yellow-500/20 transition-all duration-300 hover:bg-zinc-50 dark:hover:bg-zinc-950/30 px-2 rounded animate-fade-in"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <span className="text-sm text-zinc-800 dark:text-white">{item.name}</span>
                <span className={`text-[11px] ${item.health ? 'text-emerald-600 dark:text-emerald-500' : 'text-red-600 dark:text-red-500'} pulse-dot`}>
                  ● {item.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="text-[10px] text-zinc-600 mb-6 flex items-center gap-4">
            <span>STATISTICS</span>
            <div className="flex-1 h-[1px] bg-gradient-to-r from-yellow-500/20 to-transparent"></div>
          </div>
          <div className="space-y-4">
            {[
              { label: 'EXECUTED TASKS', value: executedTasks, color: 'text-yellow-600 dark:text-yellow-500' },
              { label: 'AVG EXECUTION', value: `${parseFloat(stats.executions.averageDurationMs).toFixed(2)}ms`, color: 'text-zinc-900 dark:text-white' },
              { label: 'TOTAL WORKFLOWS', value: stats.database.totalWorkflows, color: 'text-zinc-900 dark:text-white' },
              { label: 'ACCOUNTS AUTOMATED', value: stats.database.totalAccountsAutomated, color: 'text-zinc-900 dark:text-white' },
              { label: 'SUCCESS RATE', value: `${Math.round(stats.health.successRate * 100)}%`, color: 'text-emerald-600 dark:text-emerald-500' }
            ].map((stat, i) => (
              <div 
                key={i} 
                className="flex justify-between text-sm hover:bg-zinc-50 dark:hover:bg-zinc-950/30 p-2 rounded transition-colors animate-fade-in"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <span className="text-zinc-600 dark:text-zinc-500">{stat.label}</span>
                <span className={`font-mono ${stat.color}`}>
                  {typeof stat.value === 'number' ? <AnimatedCounter value={stat.value} /> : stat.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="mt-12 md:mt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="cyber-card border-emerald-500/30 p-6 relative animate-fade-in-scale">
          <div className="absolute -top-3 left-8 bg-white dark:bg-black px-2 text-[10px] text-emerald-600 dark:text-emerald-500">SUCCESS RATE</div>
          <div className="text-[10px] text-zinc-600 mb-4">WORKFLOW_SUCCESS</div>
          <div className="text-2xl md:text-3xl font-bold text-emerald-600 dark:text-emerald-500">
            {Math.round(stats.health.successRate * 100)}%
          </div>
          <div className="text-[10px] text-zinc-600 mt-2">TOTAL SUCCESS RATIO</div>
        </div>

        <div className="cyber-card border-blue-500/30 p-6 relative animate-fade-in-scale" style={{ animationDelay: '0.1s' }}>
          <div className="absolute -top-3 left-8 bg-white dark:bg-black px-2 text-[10px] text-blue-600 dark:text-blue-500">THROUGHPUT</div>
          <div className="text-[10px] text-zinc-600 mb-4">AVG_EXECUTION_TIME</div>
          <div className="text-2xl md:text-3xl font-bold text-blue-600 dark:text-blue-500">
            {parseFloat(stats.executions.averageDurationMs).toFixed(1)}ms
          </div>
          <div className="text-[10px] text-zinc-600 mt-2">PER ACTION</div>
        </div>

        <div className="cyber-card border-yellow-500/30 p-6 relative animate-fade-in-scale" style={{ animationDelay: '0.2s' }}>
          <div className="absolute -top-3 left-8 bg-white dark:bg-black px-2 text-[10px] text-yellow-600 dark:text-yellow-500">UPTIME</div>
          <div className="text-[10px] text-zinc-600 mb-4">SYSTEM_UPTIME</div>
          <div className="text-2xl md:text-3xl font-bold text-yellow-600 dark:text-yellow-500">
            {stats.cronSystem.lastExecution ? 
              new Date(stats.cronSystem.lastExecution).toLocaleTimeString().slice(0, 5) : 
              'Running...'
            }
          </div>
          <div className="text-[10px] text-zinc-600 mt-2">CONTINUOUS OPERATION</div>
        </div>
      </div>

      {/* System Load */}
      <div className="mt-12 md:mt-16">
        <div className="text-[10px] text-zinc-600 mb-6 flex items-center gap-4">
          <span>SYSTEM_LOAD</span>
          <div className="flex-1 h-[1px] bg-gradient-to-r from-yellow-500/20 to-transparent"></div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'ACTIVE WORKFLOWS', value: stats.executor.activeExecutions, max: 10, color: 'yellow' },
            { label: 'QUEUED TASKS', value: stats.taskScheduler.queuedTasks, max: 50, color: 'blue' },
            { label: 'CRON JOBS', value: stats.cronSystem.totalCronJobs, max: 20, color: 'emerald' },
            { label: 'FAILED TASKS', value: stats.cronSystem.failedTasks, max: 5, color: 'red' }
          ].map((metric, i) => {
            const percentage = Math.min((metric.value / metric.max) * 100, 100);
            const colorClass = {
              yellow: 'bg-yellow-500',
              blue: 'bg-blue-500',
              emerald: 'bg-emerald-500',
              red: 'bg-red-500'
            }[metric.color];
            
            const textColorClass = {
              yellow: 'text-yellow-600 dark:text-yellow-500',
              blue: 'text-blue-600 dark:text-blue-500',
              emerald: 'text-emerald-600 dark:text-emerald-500',
              red: 'text-red-600 dark:text-red-500'
            }[metric.color];
            
            return (
              <div key={i} className="cyber-card p-4 animate-fade-in-scale" style={{ animationDelay: `${i * 0.1}s` }}>
                <div className="text-[10px] text-zinc-600 mb-2">{metric.label}</div>
                <div className={`text-2xl font-bold mb-2 ${textColorClass}`}>
                  <AnimatedCounter value={metric.value} />
                </div>
                <div className="bg-zinc-200 dark:bg-zinc-900 h-2 w-full rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${colorClass} rounded-full transition-all duration-1000`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <div className="text-[9px] text-zinc-600 mt-1">{percentage.toFixed(0)}% load</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default System;
