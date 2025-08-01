// components/WorkflowModal.tsx
import React, { useState, useEffect } from 'react';
import { X, Plus } from 'lucide-react';
import { apiClient } from '../lib/api';
import { ScrollArea, formatDelay, parseDelay, ClientOnlyIcon } from './common';
import { useAlert } from './AlertSystem';

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

interface WorkflowModalProps {
  isOpen: boolean;
  isEdit: boolean;
  editingWorkflow: Workflow | null;
  onClose: () => void;
}

const WorkflowModal: React.FC<WorkflowModalProps> = ({ isOpen, isEdit, editingWorkflow, onClose }) => {
  const [workflowName, setWorkflowName] = useState('');
  const [workflowType, setWorkflowType] = useState('');
  const [workflowDescription, setWorkflowDescription] = useState('');
  const [workflowSteps, setWorkflowSteps] = useState<WorkflowStep[]>([]);
  const [saving, setSaving] = useState(false);
  const { showError, showWarning } = useAlert();

  // Action options with their required fields
  const actionOptions = [
    { value: 'wait', label: 'Wait', fields: ['delay'] },
    { value: 'add_prompt', label: 'Add Prompt', fields: ['delay', 'critical', 'timeout'] },
    { value: 'add_bio', label: 'Add Bio', fields: ['delay'] },
    { value: 'swipe_with_spectre', label: 'Swipe with Spectre', fields: ['delay', 'swipeCount'] },
    { value: 'activate_continuous_swipe', label: 'Continuous Swipe', fields: ['delay', 'minSwipes', 'maxSwipes', 'minIntervalMs', 'maxIntervalMs'] }
  ];

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      if (isEdit && editingWorkflow) {
        setWorkflowName(editingWorkflow.name);
        setWorkflowType(editingWorkflow.type);
        setWorkflowDescription(editingWorkflow.description);
        setWorkflowSteps([...editingWorkflow.steps]);
      } else {
        resetForm();
      }
    }
  }, [isOpen, isEdit, editingWorkflow]);

  const resetForm = () => {
    setWorkflowName('');
    setWorkflowType('');
    setWorkflowDescription('');
    setWorkflowSteps([]);
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

  const handleSave = async () => {
    if (!workflowName || !workflowType || !workflowDescription) {
      showWarning('Missing Information', 'Please fill in all required fields');
      return;
    }

    if (workflowSteps.length === 0) {
      showWarning('No Steps', 'Please add at least one step');
      return;
    }

    try {
      setSaving(true);
      
      const workflowData = {
        name: workflowName,
        type: workflowType,
        description: workflowDescription,
        steps: workflowSteps.map(step => ({
          id: step.id,
          action: step.action,
          description: step.description,
          delay: step.delay,
          critical: step.critical,
          timeout: step.timeout,
          swipeCount: step.swipeCount,
          minSwipes: step.minSwipes,
          maxSwipes: step.maxSwipes,
          minIntervalMs: step.minIntervalMs,
          maxIntervalMs: step.maxIntervalMs
        }))
      };

      if (isEdit) {
        await apiClient.updateWorkflowDefinition(workflowType, workflowData);
      } else {
        await apiClient.createWorkflowDefinition(workflowData);
      }

      onClose();
      // Refresh the page to see changes
      window.location.reload();
    } catch (error) {
      console.error('Failed to save workflow:', error);
      showError('Save Failed', 'Failed to save workflow. Please check the console for details.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-zinc-950/95 backdrop-blur-xl border border-zinc-300 dark:border-yellow-500/20 max-w-4xl w-full max-h-[90vh] overflow-auto animate-fade-in-scale shadow-2xl dark:shadow-none">
        <div className="p-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-xl md:text-2xl font-bold mb-1 text-zinc-900 dark:text-white">
                {isEdit ? 'EDIT WORKFLOW' : 'CREATE WORKFLOW'}
              </h2>
              <div className="text-[10px] text-zinc-600 dark:text-zinc-500">
                {isEdit ? 'ワークフローを編集' : '新しいワークフローを作成'}
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="text-zinc-600 hover:text-zinc-900 dark:hover:text-white transition-colors p-1"
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
                <label className="text-[10px] text-zinc-600 block mb-2">WORKFLOW_NAME *</label>
                <input 
                  type="text" 
                  placeholder="Custom Workflow"
                  value={workflowName}
                  onChange={(e) => setWorkflowName(e.target.value)}
                  className="w-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 px-4 py-3 text-sm text-zinc-900 dark:text-white focus:border-yellow-500/50 outline-none transition-colors"
                />
              </div>

              <div>
                <label className="text-[10px] text-zinc-600 block mb-2">TYPE_IDENTIFIER *</label>
                <input 
                  type="text" 
                  placeholder="custom_workflow"
                  value={workflowType}
                  onChange={(e) => setWorkflowType(e.target.value)}
                  disabled={isEdit}
                  className="w-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 px-4 py-3 text-sm font-mono text-zinc-900 dark:text-white focus:border-yellow-500/50 outline-none transition-colors disabled:opacity-50"
                />
                {isEdit && (
                  <div className="text-[9px] text-zinc-600 dark:text-zinc-500 mt-1">Type cannot be changed when editing</div>
                )}
              </div>
            </div>

            <div>
              <label className="text-[10px] text-zinc-600 block mb-2">DESCRIPTION *</label>
              <textarea 
                placeholder="Describe your workflow..."
                value={workflowDescription}
                onChange={(e) => setWorkflowDescription(e.target.value)}
                className="w-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 px-4 py-3 text-sm text-zinc-900 dark:text-white h-20 focus:border-yellow-500/50 outline-none resize-none transition-colors"
              />
            </div>

            {/* Workflow Steps */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <label className="text-[10px] text-zinc-600">WORKFLOW_STEPS ({workflowSteps.length})</label>
                <button 
                  onClick={addStep}
                  className="text-[10px] text-yellow-600 dark:text-yellow-500 hover:text-yellow-700 dark:hover:text-yellow-400 flex items-center gap-1 transition-colors"
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
                      <div key={i} className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-6 h-6 rounded-full border border-yellow-500/50 flex items-center justify-center text-[9px] text-yellow-600 dark:text-yellow-500 flex-shrink-0">
                            {i + 1}
                          </div>
                          <select 
                            value={step.action}
                            onChange={(e) => updateStep(i, 'action', e.target.value)}
                            className="bg-white dark:bg-zinc-800 text-xs text-zinc-900 dark:text-white px-3 py-2 outline-none border border-zinc-300 dark:border-zinc-700 focus:border-yellow-500/50 transition-colors"
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
                            className="flex-1 bg-white dark:bg-zinc-800 px-3 py-2 text-xs text-zinc-900 dark:text-white outline-none border border-zinc-300 dark:border-zinc-700 focus:border-yellow-500/50 transition-colors"
                          />
                          <button 
                            onClick={() => removeStep(i)}
                            className="text-red-600 dark:text-red-500 hover:text-red-700 dark:hover:text-red-400 p-1 transition-colors"
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
                              <label className="text-[9px] text-zinc-600 dark:text-zinc-500 block mb-1">DELAY</label>
                              <input 
                                type="text" 
                                placeholder="60s, 5m, 1h"
                                value={formatDelay(step.delay)}
                                onChange={(e) => updateStep(i, 'delay', parseDelay(e.target.value))}
                                className="w-full bg-white dark:bg-zinc-800 px-2 py-1 text-xs text-zinc-900 dark:text-white outline-none border border-zinc-300 dark:border-zinc-700 focus:border-yellow-500/50 transition-colors"
                              />
                            </div>
                          )}

                          {selectedAction?.fields.includes('swipeCount') && (
                            <div>
                              <label className="text-[9px] text-zinc-600 dark:text-zinc-500 block mb-1">SWIPE COUNT</label>
                              <input 
                                type="number" 
                                placeholder="10"
                                value={step.swipeCount || ''}
                                onChange={(e) => updateStep(i, 'swipeCount', parseInt(e.target.value) || 0)}
                                className="w-full bg-white dark:bg-zinc-800 px-2 py-1 text-xs text-zinc-900 dark:text-white outline-none border border-zinc-300 dark:border-zinc-700 focus:border-yellow-500/50 transition-colors"
                              />
                            </div>
                          )}

                          {selectedAction?.fields.includes('minSwipes') && (
                            <>
                              <div>
                                <label className="text-[9px] text-zinc-600 dark:text-zinc-500 block mb-1">MIN SWIPES</label>
                                <input 
                                  type="number" 
                                  placeholder="25"
                                  value={step.minSwipes || ''}
                                  onChange={(e) => updateStep(i, 'minSwipes', parseInt(e.target.value) || 0)}
                                  className="w-full bg-white dark:bg-zinc-800 px-2 py-1 text-xs text-zinc-900 dark:text-white outline-none border border-zinc-300 dark:border-zinc-700 focus:border-yellow-500/50 transition-colors"
                                />
                              </div>
                              <div>
                                <label className="text-[9px] text-zinc-600 dark:text-zinc-500 block mb-1">MAX SWIPES</label>
                                <input 
                                  type="number" 
                                  placeholder="40"
                                  value={step.maxSwipes || ''}
                                  onChange={(e) => updateStep(i, 'maxSwipes', parseInt(e.target.value) || 0)}
                                  className="w-full bg-white dark:bg-zinc-800 px-2 py-1 text-xs text-zinc-900 dark:text-white outline-none border border-zinc-300 dark:border-zinc-700 focus:border-yellow-500/50 transition-colors"
                                />
                              </div>
                            </>
                          )}

                          {selectedAction?.fields.includes('minIntervalMs') && (
                            <>
                              <div>
                                <label className="text-[9px] text-zinc-600 dark:text-zinc-500 block mb-1">MIN INTERVAL</label>
                                <input 
                                  type="text" 
                                  placeholder="2h"
                                  value={formatDelay(step.minIntervalMs || 0)}
                                  onChange={(e) => updateStep(i, 'minIntervalMs', parseDelay(e.target.value))}
                                  className="w-full bg-white dark:bg-zinc-800 px-2 py-1 text-xs text-zinc-900 dark:text-white outline-none border border-zinc-300 dark:border-zinc-700 focus:border-yellow-500/50 transition-colors"
                                />
                              </div>
                              <div>
                                <label className="text-[9px] text-zinc-600 dark:text-zinc-500 block mb-1">MAX INTERVAL</label>
                                <input 
                                  type="text" 
                                  placeholder="4h"
                                  value={formatDelay(step.maxIntervalMs || 0)}
                                  onChange={(e) => updateStep(i, 'maxIntervalMs', parseDelay(e.target.value))}
                                  className="w-full bg-white dark:bg-zinc-800 px-2 py-1 text-xs text-zinc-900 dark:text-white outline-none border border-zinc-300 dark:border-zinc-700 focus:border-yellow-500/50 transition-colors"
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
                              <label className="text-[9px] text-zinc-600 dark:text-zinc-500">CRITICAL</label>
                            </div>
                          )}

                          {selectedAction?.fields.includes('timeout') && (
                            <div>
                              <label className="text-[9px] text-zinc-600 dark:text-zinc-500 block mb-1">TIMEOUT</label>
                              <input 
                                type="text" 
                                placeholder="2m"
                                value={step.timeout ? formatDelay(step.timeout) : ''}
                                onChange={(e) => updateStep(i, 'timeout', parseDelay(e.target.value))}
                                className="w-full bg-white dark:bg-zinc-800 px-2 py-1 text-xs text-zinc-900 dark:text-white outline-none border border-zinc-300 dark:border-zinc-700 focus:border-yellow-500/50 transition-colors"
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

            {/* Action Buttons */}
            <div className="flex flex-col md:flex-row gap-3 pt-4">
              <button 
                onClick={handleSave}
                disabled={saving}
                className="flex-1 bg-yellow-500 text-black py-3 text-[11px] font-bold uppercase tracking-wider hover:bg-yellow-400 transition-all duration-300 cyber-button disabled:opacity-50"
              >
                {saving ? 'SAVING...' : (isEdit ? 'UPDATE' : 'CREATE')}
              </button>
              <button 
                onClick={onClose}
                disabled={saving}
                className="flex-1 border border-zinc-300 dark:border-zinc-800 py-3 text-[11px] uppercase tracking-wider hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:border-zinc-400 dark:hover:border-zinc-700 transition-colors disabled:opacity-50"
              >
                CANCEL
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkflowModal;
