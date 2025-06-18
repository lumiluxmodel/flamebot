'use client';
import React, { useState, useEffect, useRef } from 'react';
import { AlertCircle, X, Plus, Edit2, Copy, Trash2, Heart, Menu, Loader2, RefreshCw } from 'lucide-react';

// Import API hooks
import { 
  useWorkflowStats, 
  useActiveWorkflows, 
  useDashboardData, 
  useSystemHealth,
  apiClient, 
  WorkflowDefinition
} from '../lib/api';

// Types
interface WorkflowStep {
  id: string;
  action: string;
  delay: number;
  description: string;
  swipeCount?: number;
  minSwipes?: number;
  maxSwipes?: number;
  minIntervalMs?: number;
  maxIntervalMs?: number;
  critical?: boolean;
  timeout?: number;
}

interface Workflow {
  type: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  duration: string;
  color: string;
  accent: string;
  config?: {
    maxRetries?: number;
    retryBackoffMs?: number;
    timeoutMs?: number;
  };
}

// Color mapping for Tailwind JIT fix
const colorMap = {
  yellow: {
    border: 'border-yellow-500/20',
    borderHover: 'hover:border-yellow-500/40',
    text: 'text-yellow-500',
    bg: 'bg-yellow-500'
  },
  red: {
    border: 'border-red-500/20',
    borderHover: 'hover:border-red-500/40',
    text: 'text-red-500',
    bg: 'bg-red-500'
  },
  emerald: {
    border: 'border-emerald-500/20',
    borderHover: 'hover:border-emerald-500/40',
    text: 'text-emerald-500',
    bg: 'bg-emerald-500'
  },
  blue: {
    border: 'border-blue-500/20',
    borderHover: 'hover:border-blue-500/40',
    text: 'text-blue-500',
    bg: 'bg-blue-500'
  }
};

// Global format time function
const formatTime = (date: Date) => {
  return date.toTimeString().slice(0, 5);
};

// Format delay from milliseconds to human readable
const formatDelay = (ms: number): string => {
  if (ms < 60000) return `${Math.floor(ms / 1000)}s`;
  if (ms < 3600000) return `${Math.floor(ms / 60000)}m`;
  if (ms < 86400000) return `${Math.floor(ms / 3600000)}h`;
  return `${Math.floor(ms / 86400000)}d`;
};

// Parse human readable delay to milliseconds
const parseDelay = (str: string): number => {
  const num = parseInt(str);
  const unit = str.slice(-1).toLowerCase();
  switch (unit) {
    case 's': return num * 1000;
    case 'm': return num * 60000;
    case 'h': return num * 3600000;
    case 'd': return num * 86400000;
    default: return parseInt(str) || 0;
  }
};

// Fixed Animated Counter Component with cleanup
const AnimatedCounter = ({ value, duration = 2000 }: { value: number; duration?: number }) => {
  const [count, setCount] = useState(0);
  const countRef = useRef<number>(0);
  const frameRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const currentCount = Math.floor(progress * value);
      
      if (currentCount !== countRef.current) {
        countRef.current = currentCount;
        setCount(currentCount);
      }
      
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      }
    };
    
    frameRef.current = requestAnimationFrame(animate);

    // Cleanup function
    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [value, duration]);

  return <span>{count}</span>;
};

// Custom ScrollArea Component (styles already in globals.css)
const ScrollArea = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={`overflow-auto custom-scrollbar ${className || ''}`}>
    {children}
  </div>
);

// Loading component
const LoadingSpinner = ({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  return (
    <div className="flex items-center justify-center">
      <ClientOnlyIcon>
        <Loader2 className={`${sizeClasses[size]} animate-spin text-yellow-500`} />
      </ClientOnlyIcon>
    </div>
  );
};

// Error component
const ErrorDisplay = ({ error, onRetry }: { error: string; onRetry?: () => void }) => (
  <div className="text-center p-8">
    <ClientOnlyIcon>
      <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
    </ClientOnlyIcon>
    <div className="text-red-500 mb-2">Error</div>
    <div className="text-zinc-400 text-sm mb-4">{error}</div>
    {onRetry && (
      <button 
        onClick={onRetry}
        className="text-yellow-500 hover:text-yellow-400 text-sm flex items-center gap-2 mx-auto transition-colors"
      >
        <ClientOnlyIcon>
          <RefreshCw className="w-4 h-4" />
        </ClientOnlyIcon> Retry
      </button>
    )}
  </div>
);

// Overview Component with real data
const Overview = () => {
  const { data: stats, loading: statsLoading, error: statsError, refetch: refetchStats } = useWorkflowStats();
  const { data: dashboardData, loading: dashboardLoading, error: dashboardError, refetch: refetchDashboard } = useDashboardData();
  const { data: healthData, loading: healthLoading } = useSystemHealth();

  if (statsLoading || dashboardLoading || healthLoading) {
    return (
      <div className="space-y-8 md:space-y-16">
        <header className="animate-slide-up">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tighter mb-4 text-white">
            DASHBOARD
          </h1>
          <div className="text-[10px] md:text-[11px] text-zinc-500">
            <LoadingSpinner size="sm" />
          </div>
        </header>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16">
          <div className="cyber-card p-6 md:p-8">
            <LoadingSpinner />
          </div>
          <div className="cyber-card p-6 md:p-8">
            <LoadingSpinner />
          </div>
        </div>
      </div>
    );
  }

  if (statsError) {
    return <ErrorDisplay error={statsError} onRetry={refetchStats} />;
  }

  if (dashboardError) {
    return <ErrorDisplay error={dashboardError} onRetry={refetchDashboard} />;
  }

  if (!stats || !dashboardData) return null;

  const systemHealth = dashboardData.overview.systemHealth.toUpperCase();
  const activeWorkflows = stats.executor.activeExecutions;
  const successRate = Math.round(stats.health.successRate * 100);
  const cronJobs = `${stats.database.completedWorkflows}/${stats.cronSystem.totalCronJobs}`;

  // Calculate uptime
  const uptimeMs = Date.now() - new Date(dashboardData.overview.lastHealthCheck).getTime();
  const uptimeHours = Math.floor(uptimeMs / (1000 * 60 * 60));
  const uptimeMinutes = Math.floor((uptimeMs % (1000 * 60 * 60)) / (1000 * 60));

  // Get additional system info from health data
  const systemComponentsHealthy = healthData?.healthy ?? true;

  return (
    <div className="space-y-8 md:space-y-16">
      <header className="animate-slide-up">
        <h1 className="text-4xl md:text-6xl font-bold tracking-tighter mb-4 text-white">
          DASHBOARD
        </h1>
        <div className="text-[10px] md:text-[11px] text-zinc-500 flex flex-wrap gap-2 md:gap-6">
          <span>STATUS: <span className={systemHealth === 'HEALTHY' && systemComponentsHealthy ? 'text-emerald-500' : 'text-red-500'}>{systemHealth}</span></span>
          <span className="text-yellow-500 hidden md:inline">|</span>
          <span>UPTIME: {uptimeHours}H {uptimeMinutes}M</span>
          <span className="text-yellow-500 hidden md:inline">|</span>
          <span>v2.0.1</span>
        </div>
      </header>

      <div className="space-y-8 md:space-y-16">
        {/* Main Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16">
          <div className="relative animate-fade-in-scale cyber-card p-6 md:p-8">
            <div className="text-[10px] text-zinc-600 mb-4">ACTIVE_WORKFLOWS</div>
            <div className="text-5xl md:text-8xl font-bold">
              <AnimatedCounter value={activeWorkflows} />
            </div>
            <div className="text-[11px] text-zinc-500 mt-2">CURRENTLY RUNNING</div>
            <div className="absolute top-0 right-0 w-8 h-8 border-t border-r border-yellow-500/30"></div>
          </div>
          
          <div className="animate-fade-in-scale cyber-card p-6 md:p-8" style={{ animationDelay: '0.2s' }}>
            <div className="text-[10px] text-zinc-600 mb-4">SUCCESS_RATE</div>
            <div className="text-5xl md:text-8xl font-bold text-yellow-500">
              <AnimatedCounter value={successRate} />%
            </div>
            <div className="text-[11px] text-zinc-500 mt-2">全て成功</div>
            <div className="absolute top-0 right-0 w-8 h-8 border-t border-r border-yellow-500/30"></div>
          </div>
        </div>

        {/* System Components */}
        <div>
          <div className="text-[10px] text-zinc-600 mb-6 flex items-center gap-4">
            <span>SYSTEM_COMPONENTS</span>
            <div className="flex-1 h-[1px] bg-gradient-to-r from-zinc-900 via-yellow-500/20 to-zinc-900"></div>
            <span className="text-yellow-500">サイバー</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8">
            {[
              { 
                value: dashboardData.systemStatus.workflowExecutor ? '1/1' : '0/1', 
                label: 'EXECUTOR', 
                status: dashboardData.systemStatus.workflowExecutor ? 'ACTIVE' : 'OFFLINE', 
                color: dashboardData.systemStatus.workflowExecutor ? 'emerald' : 'red' 
              },
              { 
                value: cronJobs, 
                label: 'CRON', 
                status: dashboardData.systemStatus.cronManager ? 'RUNNING' : 'STOPPED', 
                color: dashboardData.systemStatus.cronManager ? 'yellow' : 'red' 
              },
              { 
                value: stats.health.unacknowledgedAlerts.toString(), 
                label: 'ALERTS', 
                status: stats.health.unacknowledgedAlerts > 0 ? 'ACTIVE' : 'CLEAR', 
                color: stats.health.unacknowledgedAlerts > 0 ? 'red' : 'emerald' 
              }
            ].map((component, i) => (
              <div 
                key={i} 
                className={`cyber-card p-4 md:p-6 ${colorMap[component.color as keyof typeof colorMap].borderHover} transition-all duration-300 animate-fade-in-scale group`}
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div className={`text-2xl md:text-3xl font-bold mb-2 ${colorMap[component.color as keyof typeof colorMap].text} group-hover:scale-110 transition-transform duration-300`}>
                  {component.value}
                </div>
                <div className="text-[10px] text-zinc-600">{component.label}</div>
                <div className={`text-[10px] mt-2 ${colorMap[component.color as keyof typeof colorMap].text}`}>
                  ● {component.status}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        {dashboardData.workflows.recentlyCompleted.length > 0 && (
          <div>
            <div className="text-[10px] text-zinc-600 mb-6 flex items-center gap-4">
              <span>RECENT_COMPLETIONS</span>
              <div className="flex-1 h-[1px] bg-gradient-to-r from-zinc-900 via-yellow-500/20 to-zinc-900"></div>
            </div>
            <div className="space-y-3">
              {dashboardData.workflows.recentlyCompleted.slice(0, 3).map((workflow, i) => (
                <div key={i} className="cyber-card p-4 flex justify-between items-center animate-fade-in" style={{ animationDelay: `${i * 0.1}s` }}>
                  <div>
                    <div className="text-sm font-mono">{workflow.account_id.slice(-8)}</div>
                    <div className="text-[10px] text-zinc-500">{workflow.workflow_type.toUpperCase()}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-emerald-500 text-[10px]">● COMPLETED</div>
                    <div className="text-[10px] text-zinc-500">
                      {Math.round(parseFloat(workflow.duration_ms) / 1000)}s
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Barcode */}
        <div className="flex justify-center pt-8">
          <div className="text-center animate-fade-in">
            <div className="font-mono text-[10px] tracking-[0.3em] mb-2 opacity-60">
              |||| || ||| |||| | || ||| |||| ||| | ||||
            </div>
            <div className="text-[10px] text-zinc-600">FLM-BOT-2025-001</div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Workflows Component with real data
const Workflows = ({ setEditingWorkflow, setShowEditModal, setShowCreateModal }: { 
  setEditingWorkflow: (workflow: Workflow) => void; 
  setShowEditModal: (show: boolean) => void; 
  setShowCreateModal: (show: boolean) => void; 
}) => {
  const { data: activeWorkflows, loading: activeLoading } = useActiveWorkflows();
  const [workflowDefinitions, setWorkflowDefinitions] = useState<Workflow[]>([]);
  const [definitionsLoading, setDefinitionsLoading] = useState(true);

  // Load workflow definitions
  useEffect(() => {
    const loadDefinitions = async () => {
      try {
        const result = await apiClient.getWorkflowDefinitions();
        // Transform backend data to frontend format
        const transformed = result.definitions.map((def: WorkflowDefinition) => ({
          type: def.type,
          name: def.name,
          description: def.description,
          duration: formatDelay(def.estimatedDuration),
          color: getWorkflowColor(def.type),
          accent: getWorkflowAccent(def.type),
          steps: def.steps
        }));
        setWorkflowDefinitions(transformed);
      } catch (error) {
        console.error('Failed to load workflow definitions:', error);
      } finally {
        setDefinitionsLoading(false);
      }
    };

    loadDefinitions();
  }, []);

  // Helper functions for colors
  const getWorkflowColor = (type: string) => {
    const colorMapping: Record<string, string> = {
      'default': 'border-yellow-500/20',
      'aggressive': 'border-red-500/20',
      'test': 'border-emerald-500/20',
      'premium': 'border-blue-500/20'
    };
    return colorMapping[type] || 'border-zinc-500/20';
  };

  const getWorkflowAccent = (type: string) => {
    const accentMapping: Record<string, string> = {
      'default': 'text-yellow-500',
      'aggressive': 'text-red-500',
      'test': 'text-emerald-500',
      'premium': 'text-blue-500'
    };
    return accentMapping[type] || 'text-zinc-500';
  };

  if (activeLoading || definitionsLoading) {
    return (
      <div>
        <header className="mb-8 md:mb-12">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tighter mb-2 text-white">WORKFLOWS</h1>
          <div className="text-[11px] text-zinc-500">AUTOMATION PROCESSES</div>
        </header>
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div>
      <header className="mb-8 md:mb-12 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tighter mb-2 text-white">WORKFLOWS</h1>
          <div className="text-[11px] text-zinc-500">AUTOMATION PROCESSES</div>
        </div>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="w-full md:w-auto px-6 py-3 bg-yellow-500 text-black text-[11px] font-bold uppercase tracking-wider hover:bg-yellow-400 transition-all duration-300 flex items-center justify-center gap-2 cyber-button"
        >
          <ClientOnlyIcon>
            <Plus className="w-4 h-4" />
          </ClientOnlyIcon> CREATE NEW
        </button>
      </header>

      <ScrollArea className="h-[400px] md:h-[600px]">
        <div className="space-y-6 md:space-y-8 pr-2">
          {/* Active Workflows */}
          {activeWorkflows && activeWorkflows.length > 0 && (
            <div>
              <div className="text-[10px] text-zinc-600 mb-4">ACTIVE_EXECUTIONS</div>
              {activeWorkflows.map((workflow) => (
                <div key={workflow.executionId} className="cyber-card border-yellow-500/30 p-6 md:p-8 relative animate-pulse-border mb-6">
                  <div className="flex flex-col md:flex-row justify-between items-start mb-6 gap-4">
                    <div>
                      <div className="text-[10px] text-zinc-600 mb-2">EXECUTION_ID</div>
                      <div className="font-mono text-sm break-all">{workflow.executionId}</div>
                    </div>
                    <div className="text-[11px] text-yellow-500 pulse-dot">● {workflow.status.toUpperCase()}</div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 text-sm mb-6">
                    <div>
                      <div className="text-[10px] text-zinc-600 mb-2">TYPE</div>
                      <div>{workflow.workflowType.toUpperCase()}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-zinc-600 mb-2">PROGRESS</div>
                      <div className="text-yellow-500">{workflow.progress}%</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-zinc-600 mb-2">CURRENT STEP</div>
                      <div>{workflow.currentStep}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-zinc-600 mb-2">STEPS</div>
                      <div>{Math.floor((workflow.progress / 100) * workflow.totalSteps)}/{workflow.totalSteps}</div>
                    </div>
                  </div>

                  <div className="bg-zinc-950 h-2 w-full rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-yellow-500 to-yellow-400 rounded-full transition-all duration-1000"
                      style={{ width: `${workflow.progress}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Workflow Definitions */}
          <div>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-2">
              <div className="text-[10px] text-zinc-600">AVAILABLE_DEFINITIONS ({workflowDefinitions.length})</div>
              <div className="text-[10px] text-yellow-500">サイバー サイバー サイバー</div>
            </div>
            
            <div className="space-y-6 md:space-y-8">
              {workflowDefinitions.map((workflow, i) => (
                <div 
                  key={i} 
                  className={`cyber-card ${workflow.color} p-6 md:p-8 hover:border-opacity-60 transition-all duration-300 animate-fade-in-up group`}
                  style={{ animationDelay: `${i * 0.1}s` }}
                >
                  <div className="flex flex-col md:flex-row justify-between items-start mb-6 gap-4">
                    <div className="flex-1">
                      <div className="text-[10px] text-zinc-600 mb-2">TYPE_{String(i+1).padStart(2, '0')}</div>
                      <div className="text-xl md:text-2xl font-bold mb-2 group-hover:text-yellow-500 transition-colors">
                        {workflow.type.toUpperCase()}
                      </div>
                      <div className="text-[11px] text-zinc-500">{workflow.description}</div>
                    </div>
                    <div className="flex gap-2">
                      {[
                        { icon: Copy, color: 'text-blue-500' },
                        { icon: Edit2, color: 'text-yellow-500', onClick: () => { setEditingWorkflow(workflow); setShowEditModal(true); } },
                        { icon: Trash2, color: 'text-red-500' }
                      ].map((action, j) => {
                        const IconComponent = action.icon;
                        return (
                          <button 
                            key={j}
                            onClick={action.onClick}
                            className={`p-2 text-zinc-600 hover:${action.color} transition-all duration-300 hover:scale-110`}
                          >
                            <ClientOnlyIcon>
                              <IconComponent className="w-4 h-4" />
                            </ClientOnlyIcon>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8 mb-6 text-sm">
                    <div>
                      <div className="text-[10px] text-zinc-600 mb-1">TOTAL STEPS</div>
                      <div className={workflow.accent}>{workflow.steps.length}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-zinc-600 mb-1">EST. DURATION</div>
                      <div>{workflow.duration}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-zinc-600 mb-1">VERSION</div>
                      <div>v1.0</div>
                    </div>
                  </div>

                  {/* Step Details */}
                  <div className="border-t border-zinc-900 pt-6">
                    <div className="text-[10px] text-zinc-600 mb-4">WORKFLOW_STEPS</div>
                    <div className="space-y-3">
                      {workflow.steps.map((step, j) => (
                        <div key={j} className="flex items-center gap-4 text-[11px] hover:bg-zinc-950/50 p-2 rounded transition-colors">
                          <div className={`w-6 h-6 rounded-full border ${workflow.color} flex items-center justify-center flex-shrink-0`}>
                            <span className="text-[9px]">{j+1}</span>
                          </div>
                          <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-4">
                            <span className="text-zinc-400">{step.description}</span>
                            <span className={`font-mono ${workflow.accent}`}>{step.action}</span>
                            <span className="text-zinc-600">{formatDelay(step.delay)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};

// System Component with real data
const System = () => {
  const { data: stats, loading, error, refetch } = useWorkflowStats();

  if (loading) {
    return (
      <div>
        <header className="mb-8 md:mb-12">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tighter mb-2 text-white">SYSTEM HEALTH</h1>
          <div className="text-[11px] text-zinc-500">診断レポート</div>
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
        <h1 className="text-4xl md:text-5xl font-bold tracking-tighter mb-2 text-white">SYSTEM HEALTH</h1>
        <div className="text-[11px] text-zinc-500">診断レポート</div>
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
                className="flex justify-between items-center py-3 border-b border-zinc-950 hover:border-yellow-500/20 transition-all duration-300 hover:bg-zinc-950/30 px-2 rounded animate-fade-in"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <span className="text-sm">{item.name}</span>
                <span className={`text-[11px] ${item.health ? 'text-emerald-500' : 'text-red-500'} pulse-dot`}>
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
              { label: 'EXECUTED TASKS', value: executedTasks, color: 'text-yellow-500' },
              { label: 'AVG EXECUTION', value: `${parseFloat(stats.executions.averageDurationMs).toFixed(2)}ms`, color: 'text-white' },
              { label: 'TOTAL WORKFLOWS', value: stats.database.totalWorkflows, color: 'text-white' },
              { label: 'ACCOUNTS AUTOMATED', value: stats.database.totalAccountsAutomated, color: 'text-white' },
              { label: 'SUCCESS RATE', value: `${Math.round(stats.health.successRate * 100)}%`, color: 'text-emerald-500' }
            ].map((stat, i) => (
              <div 
                key={i} 
                className="flex justify-between text-sm hover:bg-zinc-950/30 p-2 rounded transition-colors animate-fade-in"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <span className="text-zinc-500">{stat.label}</span>
                <span className={`font-mono ${stat.color}`}>
                  {typeof stat.value === 'number' ? <AnimatedCounter value={stat.value} /> : stat.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-12 md:mt-16 cyber-card border-yellow-500/30 p-6 md:p-8 relative animate-fade-in-scale">
        <div className="absolute -top-3 left-8 bg-black px-2 text-[10px] text-yellow-500">UPTIME</div>
        <div className="text-[10px] text-zinc-600 mb-4">SYSTEM_UPTIME</div>
        <div className="text-2xl md:text-3xl font-bold text-yellow-500">
          {stats.cronSystem.lastExecution ? 
            formatTime(new Date(stats.cronSystem.lastExecution)) : 
            'Running...'
          }
        </div>
        <div className="text-[10px] text-zinc-600 mt-2">CONTINUOUS OPERATION</div>
      </div>
    </div>
  );
};

// Alerts Component with real data  
const Alerts = ({ time }: { time: Date }) => {
  const [alerts, setAlerts] = useState<Array<{
    severity: string;
    message: string;
    timestamp: string;
  }>>([]);
  const [alertsLoading, setAlertsLoading] = useState(true);

  useEffect(() => {
    const loadAlerts = async () => {
      try {
        const result = await apiClient.getAlerts(false, 10);
        setAlerts(result.alerts || []);
      } catch (error) {
        console.error('Failed to load alerts:', error);
      } finally {
        setAlertsLoading(false);
      }
    };

    loadAlerts();
  }, []);

  if (alertsLoading) {
    return (
      <div>
        <header className="mb-8 md:mb-12">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tighter mb-2 text-white">ALERTS</h1>
          <div className="text-[11px] text-zinc-500">警報システム</div>
        </header>
        <LoadingSpinner />
      </div>
    );
  }

  const alertCounts = alerts.reduce((acc, alert) => {
    acc[alert.severity] = (acc[alert.severity] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div>
      <header className="mb-8 md:mb-12">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tighter mb-2 text-white">ALERTS</h1>
        <div className="text-[11px] text-zinc-500">警報システム</div>
      </header>

      <div className="cyber-card p-8 md:p-16 mb-8 md:mb-12 relative animate-fade-in">
        <div className="text-center">
          <ClientOnlyIcon>
            <AlertCircle className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-6 text-zinc-800 animate-pulse" />
          </ClientOnlyIcon>
          <div className="text-lg text-zinc-600 mb-2">
            {alerts.length === 0 ? 'NO ACTIVE ALERTS' : `${alerts.length} ACTIVE ALERTS`}
          </div>
          <div className="text-[11px] text-zinc-700">
            {alerts.length === 0 ? 'System operating within normal parameters' : 'Check alert details below'}
          </div>
          <div className="mt-4 text-[10px] text-yellow-500">
            {alerts.length === 0 ? 'すべてクリア' : '注意が必要'}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        {[
          { level: 'CRITICAL', count: alertCounts.critical || 0, color: 'border-red-500/20', textColor: 'text-red-500' },
          { level: 'ERROR', count: alertCounts.error || 0, color: 'border-orange-500/20', textColor: 'text-orange-500' },
          { level: 'WARNING', count: alertCounts.warning || 0, color: 'border-yellow-500/20', textColor: 'text-yellow-500' },
          { level: 'INFO', count: alertCounts.info || 0, color: 'border-zinc-900', textColor: 'text-zinc-500' }
        ].map((alert, i) => (
          <div 
            key={i} 
            className={`cyber-card ${alert.color} p-4 md:p-6 text-center hover:border-opacity-50 transition-all duration-300 animate-fade-in-scale group`}
            style={{ animationDelay: `${i * 0.1}s` }}
          >
            <div className={`text-3xl md:text-4xl font-bold mb-2 group-hover:scale-110 transition-transform ${alert.textColor}`}>
              {alert.count}
            </div>
            <div className="text-[10px] text-zinc-600">{alert.level}</div>
          </div>
        ))}
      </div>

      {/* Recent Alerts */}
      {alerts.length > 0 && (
        <div className="mt-8 md:mt-12">
          <div className="text-[10px] text-zinc-600 mb-4">RECENT_ALERTS</div>
          <div className="space-y-3">
            {alerts.slice(0, 5).map((alert, i) => (
              <div key={i} className="cyber-card p-4 flex justify-between items-center">
                <div>
                  <div className={`text-sm font-mono ${
                    alert.severity === 'critical' ? 'text-red-500' :
                    alert.severity === 'error' ? 'text-orange-500' :
                    alert.severity === 'warning' ? 'text-yellow-500' : 'text-zinc-500'
                  }`}>
                    {alert.message}
                  </div>
                  <div className="text-[10px] text-zinc-500 mt-1">
                    {new Date(alert.timestamp).toLocaleString()}
                  </div>
                </div>
                <div className={`text-[10px] uppercase ${
                  alert.severity === 'critical' ? 'text-red-500' :
                  alert.severity === 'error' ? 'text-orange-500' :
                  alert.severity === 'warning' ? 'text-yellow-500' : 'text-zinc-500'
                }`}>
                  {alert.severity}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8 md:mt-12 text-center animate-fade-in">
        <div className="text-[10px] text-zinc-600">LAST SCAN</div>
        <div className="text-yellow-500 font-mono text-sm mt-1">{time ? formatTime(time) : '--:--'}</div>
      </div>
    </div>
  );
};

// Client-side only icon wrapper to prevent hydration issues
const ClientOnlyIcon = ({ children }: { children: React.ReactNode }) => {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return <div className="w-5 h-5" />; // Placeholder with same dimensions
  }

  return <>{children}</>;
};

// Main Component
export default function FlameBotDashboard() {
  const [activeSection, setActiveSection] = useState('001');
  const [time, setTime] = useState<Date | null>(null);
  const [glitchActive, setGlitchActive] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Modal state for workflow creation/editing
  const [workflowName, setWorkflowName] = useState('');
  const [workflowType, setWorkflowType] = useState('');
  const [workflowDescription, setWorkflowDescription] = useState('');
  const [workflowSteps, setWorkflowSteps] = useState<WorkflowStep[]>([]);

  // Get real data with hooks
  const { data: activeWorkflows } = useActiveWorkflows();

  useEffect(() => {
    // Set initial time on client side only
    setTime(new Date());
    
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const glitchTimer = setInterval(() => {
      setGlitchActive(true);
      setTimeout(() => setGlitchActive(false), 200);
    }, 8000);
    return () => clearInterval(glitchTimer);
  }, []);

  const sections = [
    { id: '001', label: 'OVERVIEW', jp: 'オーバービュー' },
    { id: '002', label: 'WORKFLOWS', jp: 'ワークフロー' },
    { id: '003', label: 'SYSTEM', jp: 'システム' },
    { id: '004', label: 'ALERTS', jp: 'アラート' }
  ];

  const resetModalState = () => {
    setWorkflowName('');
    setWorkflowType('');
    setWorkflowDescription('');
    setWorkflowSteps([]);
  };

  const openCreateModal = () => {
    resetModalState();
    setShowCreateModal(true);
  };

  const openEditModal = (workflow: Workflow) => {
    setWorkflowName(workflow.name);
    setWorkflowType(workflow.type);
    setWorkflowDescription(workflow.description);
    setWorkflowSteps([...workflow.steps]);
    setShowEditModal(true);
  };

  const addStep = () => {
    const newStep: WorkflowStep = {
      id: `step_${Date.now()}`,
      action: 'wait',
      delay: 60000,
      description: 'New step'
    };
    setWorkflowSteps([...workflowSteps, newStep]);
  };

  const updateStep = (index: number, field: keyof WorkflowStep, value: string | number | boolean) => {
    const updatedSteps = [...workflowSteps];
    updatedSteps[index] = { ...updatedSteps[index], [field]: value };
    setWorkflowSteps(updatedSteps);
  };

  const removeStep = (index: number) => {
    setWorkflowSteps(workflowSteps.filter((_, i) => i !== index));
  };

  const actionOptions = [
    { value: 'wait', label: 'Wait', fields: ['delay'] },
    { value: 'add_prompt', label: 'Add Prompt', fields: ['delay', 'critical', 'timeout'] },
    { value: 'add_bio', label: 'Add Bio', fields: ['delay'] },
    { value: 'swipe_with_spectre', label: 'Swipe with Spectre', fields: ['delay', 'swipeCount'] },
    { value: 'activate_continuous_swipe', label: 'Continuous Swipe', fields: ['delay', 'minSwipes', 'maxSwipes', 'minIntervalMs', 'maxIntervalMs'] }
  ];

  return (
    <div className="min-h-screen bg-black text-white font-mono overflow-hidden relative">
      {/* Enhanced background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(234,179,8,0.03),transparent_70%)]" />
        <div className="absolute inset-0 opacity-[0.015] bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(255,255,255,0.05)_2px,rgba(255,255,255,0.05)_4px)]" />
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-yellow-500/30 to-transparent animate-pulse" />
      </div>

      <div className="flex h-screen relative">
        {/* Mobile Menu Button */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="md:hidden fixed top-4 left-4 z-50 p-2 bg-zinc-900 border border-yellow-500/20 text-yellow-500 hover:bg-yellow-500/10 transition-colors"
        >
          <ClientOnlyIcon>
            <Menu className="w-5 h-5" />
          </ClientOnlyIcon>
        </button>

        {/* Mobile Overlay */}
        {sidebarOpen && (
          <div 
            className="md:hidden fixed inset-0 bg-black/80 backdrop-blur-sm z-40"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Left Sidebar */}
        <div className={`
          fixed md:relative w-64 h-full border-r border-zinc-900 bg-black/95 backdrop-blur-xl p-4 md:p-8 
          flex flex-col justify-between z-40 transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}>
          <div>
            <div className="mb-12 md:mb-16">
              <h1 className={`text-2xl md:text-3xl font-bold mb-2 transition-all duration-300 ${
                glitchActive ? 'animate-pulse text-yellow-500 scale-110' : ''
              }`}>
                侍
              </h1>
              <div className="text-[10px] text-zinc-600">
                FLAME<span className="text-yellow-500">[</span>BOT<span className="text-yellow-500">]</span>
              </div>
            </div>

            <nav className="space-y-6 md:space-y-8">
              {sections.map((section, i) => (
                <button
                  key={section.id}
                  onClick={() => {
                    setActiveSection(section.id);
                    setSidebarOpen(false);
                  }}
                  className={`block text-left transition-all duration-300 group w-full hover:transform hover:translate-x-2 ${
                    activeSection === section.id ? 'text-white' : 'text-zinc-600 hover:text-zinc-400'
                  }`}
                  style={{ animationDelay: `${i * 0.1}s` }}
                >
                  <div className={`text-[10px] mb-1 transition-colors ${
                    activeSection === section.id ? 'text-yellow-500' : 'group-hover:text-yellow-500/70'
                  }`}>
                    {section.id}
                  </div>
                  <div className="text-sm uppercase tracking-wider">{section.label}</div>
                  <div className="text-[10px] text-zinc-700 mt-1">{section.jp}</div>
                  <div className={`mt-2 h-[1px] bg-yellow-500 transition-all duration-300 ${
                    activeSection === section.id ? 'w-8' : 'w-0 group-hover:w-4'
                  }`} />
                </button>
              ))}
            </nav>
          </div>

          <div className="text-[10px] text-zinc-600 space-y-1">
            <div className="text-yellow-500 font-mono">{time ? formatTime(time) : '--:--'}</div>
            <div>TOKYO-3</div>
            <div>35.6762°N</div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto">
          <div className="p-4 md:p-8 lg:p-16 w-full max-w-none">
            {activeSection === '001' && <Overview />}
            {activeSection === '002' && (
              <Workflows
                setEditingWorkflow={openEditModal}
                setShowEditModal={setShowEditModal}
                setShowCreateModal={openCreateModal}
              />
            )}
            {activeSection === '003' && <System />}
            {activeSection === '004' && time && <Alerts time={time} />}
          </div>
        </div>

        {/* Right Panel - Enhanced with real executions */}
        <div className="hidden lg:flex w-64 xl:w-80 border-l border-zinc-900 p-6 xl:p-8 flex-col justify-between relative overflow-hidden">
          {/* Background with FLAME text */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-[120px] xl:text-[200px] font-bold text-zinc-950 opacity-20 animate-pulse">炎</div>
          </div>
          
          <div className="text-right text-[10px] text-zinc-600 relative z-10">
            <div className="text-yellow-500">001/004</div>
            <div>TOKYO-3</div>
          </div>

          {/* Active Executions */}
          <div className="relative z-10 space-y-4">
            <div className="text-[10px] text-zinc-600 mb-4 text-center">ACTIVE_EXECUTIONS</div>
            {activeWorkflows && activeWorkflows.length > 0 ? (
              activeWorkflows.slice(0, 3).map((execution, i) => (
                <div key={execution.executionId} className="bg-zinc-950/40 border border-zinc-800/50 p-3 backdrop-blur-sm animate-fade-in" style={{ animationDelay: `${i * 0.2}s` }}>
                  <div className="text-[9px] text-zinc-500 mb-1">EXECUTION_ID</div>
                  <div className="font-mono text-[10px] text-yellow-500 mb-2 break-all">{execution.executionId.slice(-8)}</div>
                  <div className="flex justify-between text-[9px] mb-2">
                    <span className="text-zinc-400">{execution.workflowType.toUpperCase()}</span>
                    <span className={`${execution.status === 'active' ? 'text-emerald-500' : 'text-zinc-500'} pulse-dot`}>
                      ● {execution.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex justify-between text-[9px] mb-2">
                    <span className="text-zinc-500">PROGRESS</span>
                    <span className="text-yellow-500">{execution.progress}%</span>
                  </div>
                  <div className="bg-zinc-900 h-1 w-full rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-yellow-500 to-yellow-400 rounded-full transition-all duration-1000"
                      style={{ width: `${execution.progress}%` }}
                    />
                  </div>
                  <div className="text-[8px] text-zinc-600 mt-1">{execution.currentStep}</div>
                </div>
              ))
            ) : (
              <div className="text-center text-zinc-600 text-[11px]">
                No active workflows
              </div>
            )}
          </div>

          <div className="text-center relative z-10">
            <div className="text-6xl xl:text-8xl font-bold text-zinc-800 mb-4 hover:text-zinc-700 transition-colors duration-500">炎</div>
            <div className="text-[10px] text-yellow-500 tracking-widest">FLAME</div>
          </div>

          <div className="text-[10px] text-zinc-600 relative z-10">
            <div className="mb-2 text-yellow-500">c.FUTURE [B]</div>
            <div className="flex items-center justify-end gap-1 text-[11px]">
              <span>made with</span>
              <ClientOnlyIcon>
                <Heart className="w-3 h-3 text-red-500 animate-pulse" />
              </ClientOnlyIcon>
              <span>by pimbo</span>
            </div>
          </div>
          
          <div className="absolute bottom-0 right-0 w-16 xl:w-24 h-16 xl:h-24 opacity-50" 
               style={{
                 clipPath: 'polygon(100% 0, 100% 100%, 0 100%)',
                 background: 'repeating-linear-gradient(45deg, #eab308, #eab308 2px, #18181b 2px, #18181b 4px)'
               }}>
          </div>
        </div>
      </div>

      {/* Enhanced Create/Edit Workflow Modal */}
      {(showCreateModal || showEditModal) && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-950/95 backdrop-blur-xl border border-yellow-500/20 max-w-4xl w-full max-h-[90vh] overflow-auto animate-fade-in-scale">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-xl md:text-2xl font-bold mb-1 text-white">
                    {showCreateModal ? 'CREATE WORKFLOW' : 'EDIT WORKFLOW'}
                  </h2>
                  <div className="text-[10px] text-zinc-500">
                    {showCreateModal ? '新しいワークフローを作成' : 'ワークフローを編集'}
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setShowCreateModal(false);
                    setShowEditModal(false);
                    resetModalState();
                  }} 
                  className="text-zinc-600 hover:text-white transition-colors p-1"
                >
                  <ClientOnlyIcon>
                    <X className="w-5 h-5" />
                  </ClientOnlyIcon>
                </button>
              </div>

              <div className="space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] text-zinc-600 block mb-2">WORKFLOW_NAME</label>
                    <input 
                      type="text" 
                      placeholder="Custom Workflow"
                      value={workflowName}
                      onChange={(e) => setWorkflowName(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 px-4 py-3 text-sm focus:border-yellow-500/50 outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-zinc-600 block mb-2">TYPE_IDENTIFIER</label>
                    <input 
                      type="text" 
                      placeholder="custom_workflow"
                      value={workflowType}
                      onChange={(e) => setWorkflowType(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 px-4 py-3 text-sm font-mono focus:border-yellow-500/50 outline-none transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-zinc-600 block mb-2">DESCRIPTION</label>
                  <textarea 
                    placeholder="Describe your workflow..."
                    value={workflowDescription}
                    onChange={(e) => setWorkflowDescription(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 px-4 py-3 text-sm h-20 focus:border-yellow-500/50 outline-none resize-none transition-colors"
                  />
                </div>

                {/* Workflow Steps */}
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <label className="text-[10px] text-zinc-600">WORKFLOW_STEPS ({workflowSteps.length})</label>
                    <button 
                      onClick={addStep}
                      className="text-[10px] text-yellow-500 hover:text-yellow-400 flex items-center gap-1 transition-colors"
                    >
                      <ClientOnlyIcon>
                        <Plus className="w-3 h-3" />
                      </ClientOnlyIcon> ADD STEP
                    </button>
                  </div>
                  
                  <ScrollArea className="max-h-96 pr-2">
                    <div className="space-y-4">
                      {workflowSteps.map((step, i) => {
                        const selectedAction = actionOptions.find(opt => opt.value === step.action);
                        return (
                          <div key={i} className="bg-zinc-900 border border-zinc-800 p-4 rounded">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="w-6 h-6 rounded-full border border-yellow-500/20 flex items-center justify-center text-[9px] flex-shrink-0">
                                {i + 1}
                              </div>
                              <select 
                                value={step.action}
                                onChange={(e) => updateStep(i, 'action', e.target.value)}
                                className="bg-zinc-800 text-xs px-3 py-2 outline-none border border-zinc-700 focus:border-yellow-500/50 transition-colors"
                              >
                                {actionOptions.map(option => (
                                  <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                              </select>
                              <input 
                                type="text" 
                                placeholder="Step description"
                                value={step.description}
                                onChange={(e) => updateStep(i, 'description', e.target.value)}
                                className="flex-1 bg-zinc-800 px-3 py-2 text-xs outline-none border border-zinc-700 focus:border-yellow-500/50 transition-colors"
                              />
                              <button 
                                onClick={() => removeStep(i)}
                                className="text-red-500 hover:text-red-400 p-1 transition-colors"
                              >
                                <ClientOnlyIcon>
                                  <X className="w-4 h-4" />
                                </ClientOnlyIcon>
                              </button>
                            </div>

                            {/* Dynamic fields based on action */}
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 ml-9">
                              {selectedAction?.fields.includes('delay') && (
                                <div>
                                  <label className="text-[9px] text-zinc-500 block mb-1">DELAY</label>
                                  <input 
                                    type="text" 
                                    placeholder="60s, 5m, 1h"
                                    value={formatDelay(step.delay)}
                                    onChange={(e) => updateStep(i, 'delay', parseDelay(e.target.value))}
                                    className="w-full bg-zinc-800 px-2 py-1 text-xs outline-none border border-zinc-700 focus:border-yellow-500/50 transition-colors"
                                  />
                                </div>
                              )}

                              {selectedAction?.fields.includes('swipeCount') && (
                                <div>
                                  <label className="text-[9px] text-zinc-500 block mb-1">SWIPE COUNT</label>
                                  <input 
                                    type="number" 
                                    placeholder="10"
                                    value={step.swipeCount || ''}
                                    onChange={(e) => updateStep(i, 'swipeCount', parseInt(e.target.value) || 0)}
                                    className="w-full bg-zinc-800 px-2 py-1 text-xs outline-none border border-zinc-700 focus:border-yellow-500/50 transition-colors"
                                  />
                                </div>
                              )}

                              {selectedAction?.fields.includes('minSwipes') && (
                                <>
                                  <div>
                                    <label className="text-[9px] text-zinc-500 block mb-1">MIN SWIPES</label>
                                    <input 
                                      type="number" 
                                      placeholder="25"
                                      value={step.minSwipes || ''}
                                      onChange={(e) => updateStep(i, 'minSwipes', parseInt(e.target.value) || 0)}
                                      className="w-full bg-zinc-800 px-2 py-1 text-xs outline-none border border-zinc-700 focus:border-yellow-500/50 transition-colors"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[10px] text-zinc-600 block mb-2">MAX SWIPES</label>
                                    <input 
                                      type="number" 
                                      placeholder="40"
                                      value={step.maxSwipes || ''}
                                      onChange={(e) => updateStep(i, 'maxSwipes', parseInt(e.target.value) || 0)}
                                      className="w-full bg-zinc-800 px-2 py-1 text-xs outline-none border border-zinc-700 focus:border-yellow-500/50 transition-colors"
                                    />
                                  </div>
                                </>
                              )}

                              {selectedAction?.fields.includes('minIntervalMs') && (
                                <>
                                  <div>
                                    <label className="text-[9px] text-zinc-500 block mb-1">MIN INTERVAL</label>
                                    <input 
                                      type="text" 
                                      placeholder="2h"
                                      value={formatDelay(step.minIntervalMs || 0)}
                                      onChange={(e) => updateStep(i, 'minIntervalMs', parseDelay(e.target.value))}
                                      className="w-full bg-zinc-800 px-2 py-1 text-xs outline-none border border-zinc-700 focus:border-yellow-500/50 transition-colors"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[9px] text-zinc-500 block mb-1">MAX INTERVAL</label>
                                    <input 
                                      type="text" 
                                      placeholder="4h"
                                      value={formatDelay(step.maxIntervalMs || 0)}
                                      onChange={(e) => updateStep(i, 'maxIntervalMs', parseDelay(e.target.value))}
                                      className="w-full bg-zinc-800 px-2 py-1 text-xs outline-none border border-zinc-700 focus:border-yellow-500/50 transition-colors"
                                    />
                                  </div>
                                </>
                              )}

                              {selectedAction?.fields.includes('critical') && (
                                <div className="flex items-center gap-2">
                                  <input 
                                    type="checkbox" 
                                    checked={step.critical || false}
                                    onChange={(e) => updateStep(i, 'critical', e.target.checked)}
                                    className="w-3 h-3"
                                  />
                                  <label className="text-[9px] text-zinc-500">CRITICAL</label>
                                </div>
                              )}

                              {selectedAction?.fields.includes('timeout') && (
                                <div>
                                  <label className="text-[9px] text-zinc-500 block mb-1">TIMEOUT</label>
                                  <input 
                                    type="text" 
                                    placeholder="2m"
                                    value={step.timeout ? formatDelay(step.timeout) : ''}
                                    onChange={(e) => updateStep(i, 'timeout', parseDelay(e.target.value))}
                                    className="w-full bg-zinc-800 px-2 py-1 text-xs outline-none border border-zinc-700 focus:border-yellow-500/50 transition-colors"
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </div>

                <div className="flex flex-col md:flex-row gap-3 pt-4">
                  <button 
                    onClick={async () => {
                      try {
                        if (showCreateModal) {
                          await apiClient.createWorkflowDefinition({
                            name: workflowName,
                            type: workflowType,
                            description: workflowDescription,
                            steps: workflowSteps
                          });
                        } else {
                          await apiClient.updateWorkflowDefinition(workflowType, {
                            name: workflowName,
                            description: workflowDescription,
                            steps: workflowSteps
                          });
                        }
                        setShowCreateModal(false);
                        setShowEditModal(false);
                        resetModalState();
                        // Refresh the page or refetch data
                        window.location.reload();
                      } catch (error) {
                        console.error('Failed to save workflow:', error);
                        alert('Failed to save workflow. Please check the console for details.');
                      }
                    }}
                    className="flex-1 bg-yellow-500 text-black py-3 text-[11px] font-bold uppercase tracking-wider hover:bg-yellow-400 transition-all duration-300 cyber-button"
                  >
                    {showCreateModal ? 'CREATE' : 'SAVE'}
                  </button>
                  <button 
                    onClick={() => {
                      setShowCreateModal(false);
                      setShowEditModal(false);
                      resetModalState();
                    }}
                    className="flex-1 border border-zinc-800 py-3 text-[11px] uppercase tracking-wider hover:border-zinc-700 transition-colors"
                  >
                    CANCEL
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
