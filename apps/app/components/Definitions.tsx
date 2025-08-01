// components/Definitions.tsx
import React, { useState } from 'react';
import { Plus, Edit2, Copy, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { useWorkflowDefinitions, apiClient } from '../lib/api';
import { LoadingSpinner, ScrollArea, formatDelay, ClientOnlyIcon } from './common';
import WorkflowModal from './WorkflowModal';
import { useAlert } from './AlertSystem';

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
  isActive?: boolean;
  config?: {
    maxRetries?: number;
    retryBackoffMs?: number;
    timeoutMs?: number;
  };
}

const Definitions: React.FC = () => {
  const { data: workflowDefinitions, loading: definitionsLoading, refetch: refetchDefinitions } = useWorkflowDefinitions();
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<Workflow | null>(null);
  const { showError, showConfirm } = useAlert();

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
      'default': 'text-yellow-600 dark:text-yellow-500',
      'aggressive': 'text-red-600 dark:text-red-500',
      'test': 'text-emerald-600 dark:text-emerald-500',
      'premium': 'text-blue-600 dark:text-blue-500'
    };
    return accentMapping[type] || 'text-zinc-600 dark:text-zinc-500';
  };

  // Transform backend data to frontend format
  const transformedDefinitions = workflowDefinitions.map(def => ({
    type: def.type,
    name: def.name,
    description: def.description,
    duration: formatDelay(def.estimatedDuration),
    color: getWorkflowColor(def.type),
    accent: getWorkflowAccent(def.type),
    isActive: def.isActive,
    steps: def.steps.map(step => ({
      id: step.id,
      action: step.action,
      delay: step.delay,
      description: step.description,
      swipeCount: step.config?.swipeCount as number | undefined,
      minSwipes: step.config?.minSwipes as number | undefined,
      maxSwipes: step.config?.maxSwipes as number | undefined,
      minIntervalMs: step.config?.minIntervalMs as number | undefined,
      maxIntervalMs: step.config?.maxIntervalMs as number | undefined,
      critical: step.critical,
      timeout: step.timeout
    }))
  }));

  const handleCloneWorkflow = async (workflow: Workflow) => {
    const newType = `${workflow.type}_clone_${Date.now()}`;
    const newName = `${workflow.name} (Clone)`;
    
    try {
      setActionLoading(`clone_${workflow.type}`);
      await apiClient.cloneWorkflowDefinition(workflow.type, {
        newType,
        newName,
        newDescription: `${workflow.description} (Cloned)`
      });
      await refetchDefinitions();
    } catch (error) {
      console.error('Failed to clone workflow:', error);
      showError('Clone Failed', 'Failed to clone workflow. Check console for details.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteWorkflow = async (workflow: Workflow) => {
    showConfirm({
      title: 'Delete Workflow',
      message: `Are you sure you want to delete "${workflow.name}"? This action cannot be undone.`,
      type: 'danger',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      onConfirm: async () => {
        try {
          setActionLoading(`delete_${workflow.type}`);
          await apiClient.deleteWorkflowDefinition(workflow.type);
          await refetchDefinitions();
        } catch (error) {
          console.error('Failed to delete workflow:', error);
          showError('Delete Failed', 'Failed to delete workflow. Check console for details.');
        } finally {
          setActionLoading(null);
        }
      }
    });
  };

  const handleToggleStatus = async (workflow: Workflow) => {
    try {
      setActionLoading(`toggle_${workflow.type}`);
      await apiClient.toggleWorkflowDefinitionStatus(workflow.type, !workflow.isActive);
      await refetchDefinitions();
    } catch (error) {
      console.error('Failed to toggle workflow status:', error);
      showError('Toggle Failed', 'Failed to toggle workflow status. Check console for details.');
    } finally {
      setActionLoading(null);
    }
  };

  const openCreateModal = () => {
    setEditingWorkflow(null);
    setShowCreateModal(true);
  };

  const openEditModal = (workflow: Workflow) => {
    setEditingWorkflow(workflow);
    setShowEditModal(true);
  };

  const closeModals = () => {
    setShowCreateModal(false);
    setShowEditModal(false);
    setEditingWorkflow(null);
  };

  if (definitionsLoading) {
    return (
      <div>
        <header className="mb-8 md:mb-12">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tighter mb-2 text-zinc-900 dark:text-white">DEFINITIONS</h1>
          <div className="text-[11px] text-zinc-600 dark:text-zinc-500">WORKFLOW TEMPLATES</div>
        </header>
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div>
      <header className="mb-8 md:mb-12 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tighter mb-2 text-zinc-900 dark:text-white">DEFINITIONS</h1>
          <div className="text-[11px] text-zinc-600 dark:text-zinc-500">WORKFLOW TEMPLATES</div>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={openCreateModal}
            className="px-6 py-3 bg-yellow-500 text-black text-[11px] font-bold uppercase tracking-wider hover:bg-yellow-400 transition-all duration-300 flex items-center justify-center gap-2 cyber-button"
          >
            <ClientOnlyIcon>
              <Plus className="w-4 h-4" />
            </ClientOnlyIcon> CREATE NEW
          </button>
        </div>
      </header>

      <ScrollArea className="h-[400px] md:h-[600px]">
        <div className="space-y-6 md:space-y-8 pr-2">
          <div>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-2">
              <div className="text-[10px] text-zinc-600 flex items-center gap-4">
                <span>AVAILABLE_DEFINITIONS ({transformedDefinitions.length})</span>
                <div className="flex-1 h-[1px] bg-gradient-to-r from-yellow-500/20 to-transparent"></div>
              </div>
              <div className="text-[10px] text-yellow-600 dark:text-yellow-500">サイバー サイバー サイバー</div>
            </div>
            
            <div className="space-y-6 md:space-y-8">
              {transformedDefinitions.map((workflow, i) => (
                <div 
                  key={i} 
                  className={`cyber-card ${workflow.color} p-6 md:p-8 hover:border-opacity-60 transition-all duration-300 animate-fade-in-up group ${
                    !workflow.isActive ? 'opacity-60' : ''
                  }`}
                  style={{ animationDelay: `${i * 0.1}s` }}
                >
                  <div className="flex flex-col md:flex-row justify-between items-start mb-6 gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="text-[10px] text-zinc-600">TYPE_{String(i+1).padStart(2, '0')}</div>
                        {!workflow.isActive && (
                          <span className="text-[9px] bg-zinc-200 dark:bg-zinc-800 px-2 py-1 rounded text-zinc-600 dark:text-zinc-400">
                            INACTIVE
                          </span>
                        )}
                      </div>
                      <div className="text-xl md:text-2xl font-bold mb-2 text-zinc-900 dark:text-white group-hover:text-yellow-600 dark:group-hover:text-yellow-500 transition-colors">
                        {workflow.type.toUpperCase()}
                      </div>
                      <div className="text-[11px] text-zinc-600 dark:text-zinc-500">{workflow.description}</div>
                    </div>
                    <div className="flex gap-2">
                      {[
                        { 
                          icon: workflow.isActive ? ToggleRight : ToggleLeft, 
                          color: workflow.isActive ? 'text-emerald-600 dark:text-emerald-500' : 'text-zinc-600 dark:text-zinc-500',
                          colorHover: workflow.isActive ? 'hover:text-emerald-700 dark:hover:text-emerald-400' : 'hover:text-zinc-700 dark:hover:text-zinc-400',
                          onClick: () => handleToggleStatus(workflow),
                          loading: actionLoading === `toggle_${workflow.type}`,
                          title: workflow.isActive ? 'Deactivate Workflow' : 'Activate Workflow'
                        },
                        { 
                          icon: Copy, 
                          color: 'text-blue-600 dark:text-blue-500', 
                          colorHover: 'hover:text-blue-700 dark:hover:text-blue-400',
                          onClick: () => handleCloneWorkflow(workflow),
                          loading: actionLoading === `clone_${workflow.type}`,
                          title: 'Clone Workflow'
                        },
                        { 
                          icon: Edit2, 
                          color: 'text-yellow-600 dark:text-yellow-500', 
                          colorHover: 'hover:text-yellow-700 dark:hover:text-yellow-400',
                          onClick: () => openEditModal(workflow),
                          title: 'Edit Workflow'
                        },
                        { 
                          icon: Trash2, 
                          color: 'text-red-600 dark:text-red-500',
                          colorHover: 'hover:text-red-700 dark:hover:text-red-400',
                          onClick: () => handleDeleteWorkflow(workflow),
                          loading: actionLoading === `delete_${workflow.type}`,
                          title: 'Delete Workflow',
                          disabled: ['default', 'aggressive', 'test'].includes(workflow.type)
                        }
                      ].map((action, j) => {
                        const IconComponent = action.icon;
                        return (
                          <button 
                            key={j}
                            onClick={action.onClick}
                            disabled={action.disabled || action.loading}
                            title={action.title}
                            className={`p-2 ${action.color} ${action.colorHover} transition-all duration-300 hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed`}
                          >
                            <ClientOnlyIcon>
                              {action.loading ? (
                                <LoadingSpinner size="sm" />
                              ) : (
                                <IconComponent className="w-4 h-4" />
                              )}
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
                      <div className="text-zinc-800 dark:text-white">{workflow.duration}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-zinc-600 mb-1">VERSION</div>
                      <div className="text-zinc-800 dark:text-white">v1.0</div>
                    </div>
                  </div>

                  {/* Step Details */}
                  <div className="border-t border-zinc-200 dark:border-zinc-900 pt-6">
                    <div className="text-[10px] text-zinc-600 mb-4">WORKFLOW_STEPS</div>
                    <div className="space-y-3">
                      {workflow.steps.map((step, j) => (
                        <div key={j} className="flex items-center gap-4 text-[11px] hover:bg-zinc-50 dark:hover:bg-zinc-950/50 p-2 rounded transition-colors">
                          <div className={`w-6 h-6 rounded-full border ${workflow.color} flex items-center justify-center flex-shrink-0`}>
                            <span className="text-[9px] text-zinc-700 dark:text-zinc-300">{j+1}</span>
                          </div>
                          <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-4">
                            <span className="text-zinc-600 dark:text-zinc-400">{step.description}</span>
                            <span className={`font-mono ${workflow.accent}`}>{step.action}</span>
                            <span className="text-zinc-600">{formatDelay(step.delay)}</span>
                          </div>
                          {step.critical && (
                            <div className="text-red-600 dark:text-red-500 text-[9px] font-bold">CRITICAL</div>
                          )}
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

      {/* Create/Edit Workflow Modal */}
      {(showCreateModal || showEditModal) && (
        <WorkflowModal
          isOpen={showCreateModal || showEditModal}
          isEdit={showEditModal}
          editingWorkflow={editingWorkflow}
          onClose={closeModals}
        />
      )}
    </div>
  );
};

export default Definitions;
