// components/Workflows.tsx
import React, { useState } from 'react';
import { ChevronDown, ChevronUp, StopCircle, Play, Pause, ExternalLink, Trash2 } from 'lucide-react';
import { useActiveWorkflows, useActiveSwipeTasks, useWorkflowDetailedStatus, apiClient } from '../lib/api';
import { LoadingSpinner, ScrollArea, formatDelay, ClientOnlyIcon } from './common';

// Helper function to format elapsed time
const formatTimeElapsed = (milliseconds: number): string => {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
};

interface WorkflowCardProps {
  workflow: {
    executionId: string;
    accountId: string;
    workflowType: string;
    progress: number;
    status: 'active' | 'paused' | 'completed' | 'failed' | 'stopped';
    currentStep?: string;
    totalSteps?: number;
    startedAt: string;
    timeElapsed?: number;
    progressPercentage?: number;
    canResume?: boolean;
    canPause?: boolean;
    isPermanent?: boolean;
  };
  onRefresh?: () => void;
}

const WorkflowCard: React.FC<WorkflowCardProps> = ({ workflow, onRefresh }) => {
  const [expanded, setExpanded] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const { data: detailedStatus, loading: detailsLoading } = useWorkflowDetailedStatus(
    expanded ? workflow.accountId : '',
    3000
  );

  const handlePause = async () => {
    try {
      setActionLoading('pause');
      await apiClient.pauseWorkflow(workflow.accountId);
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error('Failed to pause workflow:', error);
      alert(`Failed to pause workflow: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleResume = async () => {
    try {
      setActionLoading('resume');
      await apiClient.resumeWorkflow(workflow.accountId);
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error('Failed to resume workflow:', error);
      alert(`Failed to resume workflow: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleStop = async (deleteData = false) => {
    const confirmMessage = deleteData 
      ? 'Are you sure you want to permanently stop and DELETE all data for this workflow? This cannot be undone!'
      : 'Are you sure you want to permanently stop this workflow? It will be archived and cannot be resumed.';
    
    if (!confirm(confirmMessage)) return;
    
    try {
      setActionLoading('stop');
      await apiClient.stopAccountWorkflow(workflow.accountId, deleteData);
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error('Failed to stop workflow:', error);
      alert(`Failed to stop workflow: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-emerald-600 dark:text-emerald-500';
      case 'paused': return 'text-yellow-600 dark:text-yellow-500';
      case 'failed': return 'text-red-600 dark:text-red-500';
      case 'completed': return 'text-blue-600 dark:text-blue-500';
      case 'stopped': return 'text-zinc-600 dark:text-zinc-500';
      default: return 'text-zinc-600 dark:text-zinc-500';
    }
  };

  const getBorderColor = (status: string) => {
    switch (status) {
      case 'active': return 'border-emerald-500/30';
      case 'paused': return 'border-yellow-500/30';
      case 'failed': return 'border-red-500/30';
      case 'completed': return 'border-blue-500/30';
      case 'stopped': return 'border-zinc-500/30';
      default: return 'border-zinc-500/30';
    }
  };

  // Determine which actions are available
  const canPause = workflow.status === 'active';
  const canResume = workflow.status === 'paused';
  const canStop = workflow.status === 'active' || workflow.status === 'paused';

  return (
    <div className={`cyber-card ${getBorderColor(workflow.status)} p-6 md:p-8 relative ${workflow.status === 'active' ? 'animate-pulse-border' : ''} mb-6`}>
      <div className="flex flex-col md:flex-row justify-between items-start mb-6 gap-4">
        <div className="flex-1">
          <div className="text-[10px] text-zinc-600 mb-2">EXECUTION_ID</div>
          <div className="font-mono text-sm text-zinc-800 dark:text-white break-all">{workflow.executionId}</div>
          <div className="text-[10px] text-zinc-600 dark:text-zinc-500 mt-1">Account: {workflow.accountId.slice(-8)}</div>
        </div>
        <div className="flex items-center gap-2">
          <div className={`text-[11px] ${getStatusColor(workflow.status)} pulse-dot`}>
            ● {workflow.status.toUpperCase()}
          </div>
          <a
            href={`https://flamebot-tin.com/accounts/${workflow.accountId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 text-blue-600 dark:text-blue-500 hover:text-blue-700 dark:hover:text-blue-400 transition-colors"
            title="View Account"
          >
            <ClientOnlyIcon>
              <ExternalLink className="w-4 h-4" />
            </ClientOnlyIcon>
          </a>
          
          {/* Action buttons based on status */}
          {canPause && (
            <button
              onClick={handlePause}
              disabled={actionLoading === 'pause'}
              className="p-2 text-yellow-600 dark:text-yellow-500 hover:text-yellow-700 dark:hover:text-yellow-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Pause Workflow"
            >
              <ClientOnlyIcon>
                {actionLoading === 'pause' ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <Pause className="w-4 h-4" />
                )}
              </ClientOnlyIcon>
            </button>
          )}
          
          {canResume && (
            <button
              onClick={handleResume}
              disabled={actionLoading === 'resume'}
              className="p-2 text-emerald-600 dark:text-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Resume Workflow"
            >
              <ClientOnlyIcon>
                {actionLoading === 'resume' ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
              </ClientOnlyIcon>
            </button>
          )}
          
          {canStop && (
            <div className="flex items-center">
              <button
                onClick={() => handleStop(false)}
                disabled={actionLoading === 'stop'}
                className="p-2 text-red-600 dark:text-red-500 hover:text-red-700 dark:hover:text-red-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Stop Workflow (Archive)"
              >
                <ClientOnlyIcon>
                  {actionLoading === 'stop' ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <StopCircle className="w-4 h-4" />
                  )}
                </ClientOnlyIcon>
              </button>
              <button
                onClick={() => handleStop(true)}
                disabled={actionLoading === 'stop'}
                className="p-2 text-red-700 dark:text-red-600 hover:text-red-800 dark:hover:text-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Stop & Delete Data"
              >
                <ClientOnlyIcon>
                  {actionLoading === 'stop' ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </ClientOnlyIcon>
              </button>
            </div>
          )}
          
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-2 text-zinc-600 dark:text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300 transition-colors"
          >
            <ClientOnlyIcon>
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </ClientOnlyIcon>
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 text-sm mb-6">
        <div>
          <div className="text-[10px] text-zinc-600 mb-2">TYPE</div>
          <div className="text-zinc-800 dark:text-white">{workflow.workflowType.toUpperCase()}</div>
        </div>
        <div>
          <div className="text-[10px] text-zinc-600 mb-2">PROGRESS</div>
          <div className="text-yellow-600 dark:text-yellow-500">{workflow.progress}%</div>
        </div>
        {!expanded ? (
          <>
            <div>
              <div className="text-[10px] text-zinc-600 mb-2">STARTED AT</div>
              <div className="text-zinc-800 dark:text-white">
                {new Date(workflow.startedAt).toLocaleString('es-CO', { timeZone: 'America/Bogota' })}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-zinc-600 mb-2">TIME ELAPSED</div>
              <div className="text-zinc-800 dark:text-white">
                {workflow.timeElapsed ? formatTimeElapsed(workflow.timeElapsed) : 'N/A'}
              </div>
            </div>
          </>
        ) : (
          <>
            <div>
              <div className="text-[10px] text-zinc-600 mb-2">CURRENT STEP</div>
              <div className="text-zinc-800 dark:text-white">
                {detailedStatus ? detailedStatus.currentStep : 'Loading...'}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-zinc-600 mb-2">STEPS</div>
              <div className="text-zinc-800 dark:text-white">
                {detailedStatus ? `${detailedStatus.currentStep}/${detailedStatus.totalSteps}` : 'Loading...'}
              </div>
            </div>
          </>
        )}
      </div>

      <div className="bg-zinc-200 dark:bg-zinc-950 h-2 w-full rounded-full overflow-hidden">
        <div 
          className={`h-full rounded-full transition-all duration-1000 ${
            workflow.status === 'failed' ? 'bg-red-500' :
            workflow.status === 'completed' ? 'bg-blue-500' :
            workflow.status === 'paused' ? 'bg-yellow-500' :
            workflow.status === 'stopped' ? 'bg-zinc-500' :
            'bg-gradient-to-r from-emerald-500 to-emerald-400'
          }`}
          style={{ width: `${workflow.progress}%` }}
        />
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="mt-6 pt-6 border-t border-zinc-200 dark:border-zinc-900 animate-fade-in">
          {detailsLoading ? (
            <div className="py-8">
              <LoadingSpinner />
            </div>
          ) : detailedStatus ? (
            <div className="space-y-6">
              {/* Details Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="text-[10px] text-zinc-600 mb-1">STARTED AT</div>
                  <div className="text-zinc-800 dark:text-white">
                    {new Date(detailedStatus.startedAt).toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-600 mb-1">LAST ACTIVITY</div>
                  <div className="text-zinc-800 dark:text-white">
                    {new Date(detailedStatus.lastActivity).toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-600 mb-1">RETRY COUNT</div>
                  <div className="text-zinc-800 dark:text-white">
                    {detailedStatus.retryCount}/{detailedStatus.maxRetries}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-600 mb-1">CONTINUOUS SWIPE</div>
                  <div className={detailedStatus.continuousSwipeActive ? 'text-emerald-600 dark:text-emerald-500' : 'text-zinc-600 dark:text-zinc-500'}>
                    {detailedStatus.continuousSwipeActive ? 'ACTIVE' : 'INACTIVE'}
                  </div>
                </div>
              </div>

              {/* Additional Status Info */}
              {(detailedStatus.pausedAt || detailedStatus.resumedAt || detailedStatus.stoppedAt) && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  {detailedStatus.pausedAt && (
                    <div>
                      <div className="text-[10px] text-zinc-600 mb-1">PAUSED AT</div>
                      <div className="text-zinc-800 dark:text-white">
                        {new Date(detailedStatus.pausedAt).toLocaleString()}
                      </div>
                    </div>
                  )}
                  {detailedStatus.resumedAt && (
                    <div>
                      <div className="text-[10px] text-zinc-600 mb-1">RESUMED AT</div>
                      <div className="text-zinc-800 dark:text-white">
                        {new Date(detailedStatus.resumedAt).toLocaleString()}
                      </div>
                    </div>
                  )}
                  {detailedStatus.stoppedAt && (
                    <div>
                      <div className="text-[10px] text-zinc-600 mb-1">STOPPED AT</div>
                      <div className="text-zinc-800 dark:text-white">
                        {new Date(detailedStatus.stoppedAt).toLocaleString()}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Next Step */}
              {detailedStatus.nextStep && (
                <div>
                  <div className="text-[10px] text-zinc-600 mb-3">NEXT STEP</div>
                  <div className="bg-zinc-100 dark:bg-zinc-900 p-4 rounded">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="text-sm font-mono text-yellow-600 dark:text-yellow-500 mb-1">
                          {detailedStatus.nextStep.action}
                        </div>
                        <div className="text-[11px] text-zinc-600 dark:text-zinc-500">
                          {detailedStatus.nextStep.description}
                        </div>
                      </div>
                      <div className="text-[11px] text-zinc-600">
                        Delay: {formatDelay(detailedStatus.nextStep.delay)}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Error Info */}
              {detailedStatus.lastError && (
                <div>
                  <div className="text-[10px] text-red-600 dark:text-red-500 mb-3">LAST ERROR</div>
                  <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 p-4 rounded">
                    <div className="text-sm text-red-800 dark:text-red-400 font-mono">
                      {detailedStatus.lastError}
                    </div>
                  </div>
                </div>
              )}

              {/* Execution Log */}
              <div>
                <div className="text-[10px] text-zinc-600 mb-3">EXECUTION LOG ({detailedStatus.executionLog.length})</div>
                <ScrollArea className="max-h-64">
                  <div className="space-y-2">
                    {detailedStatus.executionLog.map((log, i) => (
                      <div key={i} className="flex items-start gap-3 text-[11px] p-2 hover:bg-zinc-50 dark:hover:bg-zinc-950/50 rounded">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                          log.success ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-500' : 
                          'bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-500'
                        }`}>
                          {log.stepIndex + 1}
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between">
                            <span className="font-mono text-zinc-800 dark:text-white">{log.action}</span>
                            <span className={log.success ? 'text-emerald-600 dark:text-emerald-500' : 'text-red-600 dark:text-red-500'}>
                              {log.success ? 'SUCCESS' : 'FAILED'}
                            </span>
                          </div>
                          <div className="text-zinc-600 dark:text-zinc-500">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-zinc-600 dark:text-zinc-500">
              No detailed information available
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const Workflows: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState<'active' | 'paused' | 'completed' | 'failed' | 'stopped' | 'all'>('active');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedWorkflows, setSelectedWorkflows] = useState<string[]>([]);
  
  const { data: activeWorkflows, loading: activeLoading, summary, pagination, refetch } = useActiveWorkflows(
    10000, // 10 seconds refresh
    statusFilter,
    typeFilter || undefined,
    currentPage
  );
  const { data: activeSwipes } = useActiveSwipeTasks();
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Get unique workflow types from summary
  const workflowTypes = summary ? Object.keys(summary.byWorkflowType) : [];

  const handleBulkOperation = async (operation: 'pause' | 'resume' | 'stop') => {
    const accountIds = selectedWorkflows.length > 0 
      ? selectedWorkflows 
      : activeWorkflows?.map(w => w.accountId) || [];
    
    if (accountIds.length === 0) {
      alert('No workflows selected or available');
      return;
    }

    const confirmMessage = `Are you sure you want to ${operation} ${accountIds.length} workflow(s)?`;
    if (!confirm(confirmMessage)) return;
    
    try {
      setActionLoading(operation);
      const result = await apiClient.bulkWorkflowOperation(operation, accountIds);
      alert(result.message);
      setSelectedWorkflows([]);
      refetch();
    } catch (error) {
      console.error(`Failed to ${operation} workflows:`, error);
      alert(`Failed to ${operation} workflows`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleStopSwipeTask = async (taskId: string) => {
    try {
      setActionLoading(`stop_${taskId}`);
      await apiClient.stopSwipeTask(taskId);
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      console.error('Failed to stop swipe task:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const toggleWorkflowSelection = (accountId: string) => {
    setSelectedWorkflows(prev => 
      prev.includes(accountId) 
        ? prev.filter(id => id !== accountId)
        : [...prev, accountId]
    );
  };

  const selectAll = () => {
    if (activeWorkflows) {
      setSelectedWorkflows(activeWorkflows.map(w => w.accountId));
    }
  };

  const deselectAll = () => {
    setSelectedWorkflows([]);
  };

  if (activeLoading) {
    return (
      <div>
        <header className="mb-8 md:mb-12">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tighter mb-2 text-zinc-900 dark:text-white">WORKFLOWS</h1>
          <div className="text-[11px] text-zinc-600 dark:text-zinc-500">ACTIVE AUTOMATIONS</div>
        </header>
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div>
      <header className="mb-8 md:mb-12 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tighter mb-2 text-zinc-900 dark:text-white">WORKFLOWS</h1>
          <div className="text-[11px] text-zinc-600 dark:text-zinc-500">ACTIVE AUTOMATIONS</div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {selectedWorkflows.length > 0 && (
            <div className="text-[11px] text-zinc-600 dark:text-zinc-500 flex items-center mr-4">
              {selectedWorkflows.length} selected
            </div>
          )}
          <button 
            onClick={() => handleBulkOperation('pause')}
            disabled={actionLoading === 'pause' || (!selectedWorkflows.length && (!activeWorkflows || activeWorkflows.length === 0))}
            className="px-4 py-2 border border-yellow-500/30 text-yellow-600 dark:text-yellow-500 text-[11px] font-bold uppercase tracking-wider hover:bg-yellow-500/10 transition-all duration-300 flex items-center gap-2 disabled:opacity-50"
          >
            <ClientOnlyIcon>
              {actionLoading === 'pause' ? (
                <LoadingSpinner size="sm" />
              ) : (
                <Pause className="w-4 h-4" />
              )}
            </ClientOnlyIcon> PAUSE {selectedWorkflows.length > 0 ? 'SELECTED' : 'ALL'}
          </button>
          <button 
            onClick={() => handleBulkOperation('resume')}
            disabled={actionLoading === 'resume' || (!selectedWorkflows.length && (!activeWorkflows || activeWorkflows.length === 0))}
            className="px-4 py-2 border border-emerald-500/30 text-emerald-600 dark:text-emerald-500 text-[11px] font-bold uppercase tracking-wider hover:bg-emerald-500/10 transition-all duration-300 flex items-center gap-2 disabled:opacity-50"
          >
            <ClientOnlyIcon>
              {actionLoading === 'resume' ? (
                <LoadingSpinner size="sm" />
              ) : (
                <Play className="w-4 h-4" />
              )}
            </ClientOnlyIcon> RESUME {selectedWorkflows.length > 0 ? 'SELECTED' : 'ALL'}
          </button>
          <button 
            onClick={() => handleBulkOperation('stop')}
            disabled={actionLoading === 'stop' || (!selectedWorkflows.length && (!activeWorkflows || activeWorkflows.length === 0))}
            className="px-4 py-2 border border-red-500/30 text-red-600 dark:text-red-500 text-[11px] font-bold uppercase tracking-wider hover:bg-red-500/10 transition-all duration-300 flex items-center gap-2 disabled:opacity-50"
          >
            <ClientOnlyIcon>
              {actionLoading === 'stop' ? (
                <LoadingSpinner size="sm" />
              ) : (
                <StopCircle className="w-4 h-4" />
              )}
            </ClientOnlyIcon> STOP {selectedWorkflows.length > 0 ? 'SELECTED' : 'ALL'}
          </button>
        </div>
      </header>

      {/* Filters */}
      <div className="mb-6 p-4 cyber-card">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label className="text-[10px] text-zinc-600 block mb-2">STATUS FILTER</label>
            <select 
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as typeof statusFilter);
                setCurrentPage(1);
                setSelectedWorkflows([]);
              }}
              className="w-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-white focus:border-yellow-500/50 outline-none transition-colors"
            >
              <option value="active">Active Only</option>
              <option value="paused">Paused Only</option>
              <option value="completed">Completed Only</option>
              <option value="failed">Failed Only</option>
              <option value="stopped">Stopped Only</option>
              <option value="all">All Workflows</option>
            </select>
          </div>
          
          <div className="flex-1">
            <label className="text-[10px] text-zinc-600 block mb-2">WORKFLOW TYPE</label>
            <select 
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setCurrentPage(1);
                setSelectedWorkflows([]);
              }}
              className="w-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-white focus:border-yellow-500/50 outline-none transition-colors"
            >
              <option value="">All Types</option>
              {workflowTypes.map(type => (
                <option key={type} value={type}>{type.toUpperCase()}</option>
              ))}
            </select>
          </div>
          
          <div className="flex items-end gap-2">
            <button
              onClick={() => {
                setStatusFilter('active');
                setTypeFilter('');
                setCurrentPage(1);
                setSelectedWorkflows([]);
              }}
              className="px-4 py-2 text-[11px] text-zinc-600 hover:text-zinc-900 dark:hover:text-white transition-colors"
            >
              RESET FILTERS
            </button>
          </div>
        </div>
      </div>

      {/* Selection Controls */}
      {activeWorkflows && activeWorkflows.length > 0 && (
        <div className="mb-4 flex gap-2">
          <button
            onClick={selectAll}
            className="text-[11px] text-blue-600 hover:text-blue-700 dark:text-blue-500 dark:hover:text-blue-400 transition-colors"
          >
            SELECT ALL
          </button>
          <span className="text-zinc-400">|</span>
          <button
            onClick={deselectAll}
            className="text-[11px] text-blue-600 hover:text-blue-700 dark:text-blue-500 dark:hover:text-blue-400 transition-colors"
          >
            DESELECT ALL
          </button>
        </div>
      )}

      {/* Summary Stats */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="cyber-card p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-500">{summary.totalActive}</div>
            <div className="text-[10px] text-zinc-600">TOTAL ACTIVE</div>
          </div>
          <div className="cyber-card p-4 text-center">
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-500">
              {summary.byStatus.active || 0}
            </div>
            <div className="text-[10px] text-zinc-600">RUNNING</div>
          </div>
          <div className="cyber-card p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-500">
              {summary.byStatus.paused || 0}
            </div>
            <div className="text-[10px] text-zinc-600">PAUSED</div>
          </div>
          <div className="cyber-card p-4 text-center">
            <div className="text-2xl font-bold text-zinc-600 dark:text-zinc-500">
              {summary.byStatus.stopped || 0}
            </div>
            <div className="text-[10px] text-zinc-600">STOPPED</div>
          </div>
          <div className="cyber-card p-4 text-center">
            <div className="text-2xl font-bold text-red-600 dark:text-red-500">
              {summary.byStatus.failed || 0}
            </div>
            <div className="text-[10px] text-zinc-600">FAILED</div>
          </div>
        </div>
      )}

      <ScrollArea className="h-[400px] md:h-[600px]">
        <div className="space-y-6 md:space-y-8 pr-2">
          {/* Active Workflow Executions */}
          {activeWorkflows && activeWorkflows.length > 0 ? (
            <div>
              <div className="text-[10px] text-zinc-600 mb-4 flex items-center gap-4">
                <span>
                  {statusFilter === 'all' ? 'ALL' : statusFilter.toUpperCase()}_WORKFLOW_EXECUTIONS ({pagination?.total || activeWorkflows.length})
                </span>
                <div className="flex-1 h-[1px] bg-gradient-to-r from-yellow-500/20 to-transparent"></div>
              </div>
              {activeWorkflows.map((workflow) => (
                <div key={workflow.executionId} className="relative">
                  {/* Selection checkbox */}
                  <div className="absolute -left-8 top-8 flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedWorkflows.includes(workflow.accountId)}
                      onChange={() => toggleWorkflowSelection(workflow.accountId)}
                      className="w-4 h-4 text-yellow-600 bg-zinc-100 border-zinc-300 rounded focus:ring-yellow-500 dark:focus:ring-yellow-600 dark:ring-offset-zinc-800 focus:ring-2 dark:bg-zinc-700 dark:border-zinc-600"
                    />
                  </div>
                  <WorkflowCard workflow={workflow} onRefresh={refetch} />
                </div>
              ))}
              
              {/* Pagination */}
              {pagination && pagination.pages > 1 && (
                <div className="flex justify-center items-center gap-4 mt-8">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={!pagination.hasPrev}
                    className="px-4 py-2 text-[11px] border border-zinc-300 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    PREVIOUS
                  </button>
                  <span className="text-sm text-zinc-600 dark:text-zinc-500">
                    Page {pagination.page} of {pagination.pages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(prev => prev + 1)}
                    disabled={!pagination.hasNext}
                    className="px-4 py-2 text-[11px] border border-zinc-300 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    NEXT
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="cyber-card p-16 text-center">
              <div className="text-zinc-600 dark:text-zinc-500 mb-2">
                NO {statusFilter === 'all' ? '' : statusFilter.toUpperCase()} WORKFLOWS
                {typeFilter ? ` OF TYPE "${typeFilter.toUpperCase()}"` : ''}
              </div>
              <div className="text-[11px] text-zinc-600 dark:text-zinc-600">
                {statusFilter === 'active' ? 'All workflows are currently inactive' : 'No workflows match the selected filters'}
              </div>
            </div>
          )}

          {/* Active Swipe Tasks */}
          {activeSwipes && activeSwipes.length > 0 && (
            <div>
              <div className="text-[10px] text-zinc-600 mb-4 flex items-center gap-4">
                <span>ACTIVE_SWIPE_TASKS ({activeSwipes.length})</span>
                <div className="flex-1 h-[1px] bg-gradient-to-r from-blue-500/20 to-transparent"></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeSwipes.map((task) => (
                  <div key={task.task_id} className="cyber-card border-blue-500/20 p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="text-sm font-mono text-zinc-800 dark:text-white">{task.task_name}</div>
                        <div className="text-[10px] text-zinc-600 dark:text-zinc-500">
                          {task.account_ids.length} accounts • {task.status}
                        </div>
                      </div>
                      <button
                        onClick={() => handleStopSwipeTask(task.task_id)}
                        disabled={actionLoading === `stop_${task.task_id}`}
                        className="text-red-600 dark:text-red-500 hover:text-red-700 dark:hover:text-red-400 p-1 transition-colors disabled:opacity-50"
                      >
                        <ClientOnlyIcon>
                          {actionLoading === `stop_${task.task_id}` ? (
                            <LoadingSpinner size="sm" />
                          ) : (
                            <StopCircle className="w-4 h-4" />
                          )}
                        </ClientOnlyIcon>
                      </button>
                    </div>
                    <div className="text-[10px] text-zinc-600">
                      Started: {new Date(task.started_at).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default Workflows;
