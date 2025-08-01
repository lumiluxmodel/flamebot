// components/Overview.tsx
import React from 'react';
import { useWorkflowStats, useDashboardData, useSystemHealth, useModels } from '../lib/api';
import { LoadingSpinner, ErrorDisplay, AnimatedCounter, ScrollArea } from './common';

const Overview = () => {
  const { data: stats, loading: statsLoading, error: statsError, refetch: refetchStats } = useWorkflowStats();
  const { data: dashboardData, loading: dashboardLoading, error: dashboardError, refetch: refetchDashboard } = useDashboardData();
  const { data: healthData, loading: healthLoading } = useSystemHealth();
  const { data: modelsData, loading: modelsLoading } = useModels();

  // Color mapping for Tailwind JIT fix
  const colorMap = {
    yellow: { borderHover: 'hover:border-yellow-500/40', text: 'text-yellow-600 dark:text-yellow-500' },
    red: { borderHover: 'hover:border-red-500/40', text: 'text-red-600 dark:text-red-500' },
    emerald: { borderHover: 'hover:border-emerald-500/40', text: 'text-emerald-600 dark:text-emerald-500' }
  };

  if (statsLoading || dashboardLoading || healthLoading || modelsLoading) {
    return (
      <div className="space-y-8 md:space-y-16">
        <header className="animate-slide-up">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tighter mb-4 text-zinc-900 dark:text-white">
            DASHBOARD
          </h1>
          <div className="text-[10px] md:text-[11px] text-zinc-600 dark:text-zinc-500">
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
  const activeWorkflows = isNaN(stats.executor.activeExecutions) ? 0 : (stats.executor.activeExecutions || 0);
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
        <h1 className="text-4xl md:text-6xl font-bold tracking-tighter mb-4 text-zinc-900 dark:text-white">
          DASHBOARD
        </h1>
        <div className="text-[10px] md:text-[11px] text-zinc-600 dark:text-zinc-500 flex flex-wrap gap-2 md:gap-6">
          <span>STATUS: <span className={systemHealth === 'HEALTHY' && systemComponentsHealthy ? 'text-emerald-600 dark:text-emerald-500' : 'text-red-600 dark:text-red-500'}>{systemHealth}</span></span>
          <span className="text-yellow-600 dark:text-yellow-500 hidden md:inline">|</span>
          <span>UPTIME: {uptimeHours}H {uptimeMinutes}M</span>
          <span className="text-yellow-600 dark:text-yellow-500 hidden md:inline">|</span>
          <span>v2.0.1</span>
        </div>
      </header>

      {/* Main Content with Scroll */}
      <ScrollArea className="h-[600px] md:h-[700px]">
        <div className="space-y-8 md:space-y-16 pr-2">
          {/* Main Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16">
            <div className="relative animate-fade-in-scale cyber-card p-6 md:p-8">
              <div className="text-[10px] text-zinc-600 mb-4">ACTIVE_WORKFLOWS</div>
              <div className="text-5xl md:text-8xl font-bold text-zinc-900 dark:text-white">
                <AnimatedCounter value={activeWorkflows} />
              </div>
              <div className="text-[11px] text-zinc-600 dark:text-zinc-500 mt-2">CURRENTLY RUNNING</div>
              <div className="absolute top-0 right-0 w-8 h-8 border-t border-r border-yellow-500/30"></div>
            </div>
            
            <div className="animate-fade-in-scale cyber-card p-6 md:p-8" style={{ animationDelay: '0.2s' }}>
              <div className="text-[10px] text-zinc-600 mb-4">SUCCESS_RATE</div>
              <div className="text-5xl md:text-8xl font-bold text-yellow-600 dark:text-yellow-500">
                <AnimatedCounter value={successRate} />%
              </div>
              <div className="text-[11px] text-zinc-600 dark:text-zinc-500 mt-2">全て成功</div>
              <div className="absolute top-0 right-0 w-8 h-8 border-t border-r border-yellow-500/30"></div>
            </div>
          </div>

          {/* System Components */}
          <div>
            <div className="text-[10px] text-zinc-600 mb-6 flex items-center gap-4">
              <span>SYSTEM_COMPONENTS</span>
              <div className="flex-1 h-[1px] bg-gradient-to-r from-zinc-200 dark:from-zinc-900 via-yellow-500/20 to-zinc-200 dark:to-zinc-900"></div>
              <span className="text-yellow-600 dark:text-yellow-500">サイバー</span>
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

          {/* Database Statistics */}
          <div>
            <div className="text-[10px] text-zinc-600 mb-6 flex items-center gap-4">
              <span>DATABASE_STATISTICS</span>
              <div className="flex-1 h-[1px] bg-gradient-to-r from-zinc-200 dark:from-zinc-900 via-yellow-500/20 to-zinc-200 dark:to-zinc-900"></div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {[
                { label: 'TOTAL WORKFLOWS', value: stats.database.totalWorkflows, color: 'text-yellow-600 dark:text-yellow-500' },
                { label: 'COMPLETED', value: stats.database.completedWorkflows, color: 'text-emerald-600 dark:text-emerald-500' },
                { label: 'FAILED', value: stats.database.failedWorkflows, color: 'text-red-600 dark:text-red-500' },
                { label: 'ACCOUNTS AUTOMATED', value: stats.database.totalAccountsAutomated, color: 'text-blue-600 dark:text-blue-500' }
              ].map((stat, i) => (
                <div key={i} className="cyber-card p-4 text-center animate-fade-in-scale" style={{ animationDelay: `${i * 0.1}s` }}>
                  <div className={`text-2xl md:text-3xl font-bold mb-2 ${stat.color}`}>
                    <AnimatedCounter value={parseInt(stat.value)} />
                  </div>
                  <div className="text-[10px] text-zinc-600">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          {dashboardData.workflows.recentlyCompleted.length > 0 && (
            <div>
              <div className="text-[10px] text-zinc-600 mb-6 flex items-center gap-4">
                <span>RECENT_COMPLETIONS</span>
                <div className="flex-1 h-[1px] bg-gradient-to-r from-zinc-200 dark:from-zinc-900 via-yellow-500/20 to-zinc-200 dark:to-zinc-900"></div>
              </div>
              <div className="space-y-3">
                {dashboardData.workflows.recentlyCompleted.slice(0, 5).map((workflow, i) => (
                  <div key={i} className="cyber-card p-4 flex justify-between items-center animate-fade-in" style={{ animationDelay: `${i * 0.1}s` }}>
                    <div>
                      <div className="text-sm font-mono text-zinc-800 dark:text-white">{workflow.account_id.slice(-8)}</div>
                      <div className="text-[10px] text-zinc-600 dark:text-zinc-500">{workflow.workflow_type.toUpperCase()}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-emerald-600 dark:text-emerald-500 text-[10px]">● COMPLETED</div>
                      <div className="text-[10px] text-zinc-600 dark:text-zinc-500">
                        {Math.round(parseFloat(workflow.duration_ms) / 1000)}s
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Execution Statistics */}
          <div>
            <div className="text-[10px] text-zinc-600 mb-6 flex items-center gap-4">
              <span>EXECUTION_STATISTICS</span>
              <div className="flex-1 h-[1px] bg-gradient-to-r from-zinc-200 dark:from-zinc-900 via-yellow-500/20 to-zinc-200 dark:to-zinc-900"></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
              <div className="cyber-card p-6">
                <div className="text-[10px] text-zinc-600 mb-4">TOTAL EXECUTIONS</div>
                <div className="text-4xl font-bold text-yellow-600 dark:text-yellow-500 mb-2">
                  <AnimatedCounter value={parseInt(stats.executions.totalExecutions)} />
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-emerald-600 dark:text-emerald-500">Success: {stats.executions.successfulExecutions}</span>
                  <span className="text-red-600 dark:text-red-500">Failed: {stats.executions.failedExecutions}</span>
                </div>
              </div>
              
              <div className="cyber-card p-6">
                <div className="text-[10px] text-zinc-600 mb-4">AVG DURATION</div>
                <div className="text-4xl font-bold text-blue-600 dark:text-blue-500 mb-2">
                  {parseFloat(stats.executions.averageDurationMs).toFixed(1)}ms
                </div>
                <div className="text-[11px] text-zinc-600 dark:text-zinc-500">PER ACTION</div>
              </div>
            </div>
          </div>

          {/* Available Models */}
          {modelsData && (
            <div>
              <div className="text-[10px] text-zinc-600 mb-6 flex items-center gap-4">
                <span>AVAILABLE_MODELS</span>
                <div className="flex-1 h-[1px] bg-gradient-to-r from-zinc-200 dark:from-zinc-900 via-yellow-500/20 to-zinc-200 dark:to-zinc-900"></div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                {modelsData.models.map((model, i) => {
                  const color = modelsData.colors[model];
                  return (
                    <div 
                      key={i} 
                      className="cyber-card p-6 text-center hover:scale-105 transition-transform duration-300 animate-fade-in-scale group"
                      style={{ 
                        animationDelay: `${i * 0.1}s`,
                        borderColor: `${color}30`
                      }}
                    >
                      <div 
                        className="w-16 h-16 mx-auto mb-3 rounded-full flex items-center justify-center text-2xl font-bold"
                        style={{ 
                          backgroundColor: `${color}20`,
                          color: color
                        }}
                      >
                        {model.charAt(0)}
                      </div>
                      <div className="text-sm font-bold text-zinc-800 dark:text-white mb-1">{model}</div>
                      <div 
                        className="text-[10px] font-mono"
                        style={{ color: color }}
                      >
                        {color}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Barcode */}
          <div className="flex justify-center pt-8">
            <div className="text-center animate-fade-in">
              <div className="font-mono text-[10px] tracking-[0.3em] mb-2 opacity-40 dark:opacity-60">
                |||| || ||| |||| | || ||| |||| ||| | ||||
              </div>
              <div className="text-[10px] text-zinc-600">FLM-BOT-2025-001</div>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};

export default Overview;
