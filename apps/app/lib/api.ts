// lib/api.ts - API service para conectar con el backend
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3090/api';

// New types for additional APIs
export interface ModelData {
  models: string[];
  colors: Record<string, string>;
}

export interface ActiveSwipeTask {
  task_id: string;
  task_name: string;
  account_ids: string[];
  status: string;
  source: string;
  started_at: string;
}

// Enhanced workflow status with detailed info - UPDATED to match backend response
export interface WorkflowDetailedStatus {
  // Core execution data
  executionId: string;
  accountId: string;
  workflowType: string;
  status: 'active' | 'paused' | 'stopped' | 'completed' | 'failed';
  currentStep: number;
  totalSteps: number;
  progress: number;
  startedAt: string;
  lastActivity: string;
  retryCount: number;
  maxRetries: number;
  continuousSwipeActive: boolean;
  continuousSwipeTaskId: string | null;
  workflowInstanceId: number;
  nextActionAt: string;
  nextTaskId: string;
  
  // Timestamps
  completedAt: string | null;
  failedAt: string | null;
  stoppedAt: string | null;
  pausedAt: string | null;
  resumedAt: string | null;
  
  // Error info
  finalError: string | null;
  
  // Execution context
  executionContext: {
    startedAt: string;
    maxRetries: number;
    retryCount: number;
    currentStep: number;
    parallelStepIds: string[];
    hasParallelSteps: boolean;
  };
  
  // Account data
  accountData: {
    model: string;
    channel: string;
    authToken: string;
    importedAt: string;
  };
  
  // Workflow definition
  workflowDefinition: {
    name: string;
    description: string;
    steps: Array<{
      id: string;
      delay: number;
      action: string;
      critical: boolean;
      description: string;
    }>;
    config: Record<string, unknown>;
  };
  
  // Next step info
  nextStep: {
    id: string;
    delay: number;
    action: string;
    critical: boolean;
    description: string;
  };
  
  // Execution logs
  executionLogs: Array<{
    id?: string;
    executionId?: string;
    stepId: string;
    stepIndex: number;
    action: string;
    success: boolean;
    error?: string | null;
    timestamp: string;
    duration?: number;
    metadata?: Record<string, unknown>;
  }>;
  
  // Scheduled tasks
  scheduledTasks: Array<{
    taskId: string;
    stepId: string;
    action: string;
    status: string;
    scheduledFor: string;
    createdAt: string;
    completedAt: string | null;
    lastError: string | null;
    attempts: number;
  }>;
  
  // Memory scheduled tasks
  memoryScheduledTasks: Array<{
    stepId: string;
    taskId: string;
  }>;
  
  // Additional flags
  isInMemory: boolean;
}

// Alert types
export interface Alert {
  id: string;
  message: string;
  severity: 'critical' | 'error' | 'warning' | 'info';
  timestamp: string;
  acknowledged: boolean;
  source?: string;
}

export interface AlertSummary {
  total: number;
  unacknowledged: number;
  critical: number;
  warnings: number;
  errors: number;
}

// Workflow definition types
export interface WorkflowDefinition {
  id: string;
  type: string;
  name: string;
  description: string;
  totalSteps: number;
  estimatedDuration: number;
  version: string;
  isActive: boolean;
  steps: WorkflowStep[];
}

export interface WorkflowStep {
  stepNumber: number;
  id: string;
  action: string;
  description: string;
  delay: number;
  critical?: boolean;
  timeout?: number;
  config?: Record<string, unknown>;
}

// Completed workflow types
export interface CompletedWorkflow {
  account_id: string;
  workflow_type: string;
  completed_at: string;
  duration_ms: string;
}

export interface FailedWorkflow {
  account_id: string;
  workflow_type: string;
  failed_at: string;
  final_error: string;
}

// Component health types
export interface ComponentHealth {
  healthy: boolean;
  activeExecutions?: number;
  totalExecutions?: number;
  totalJobs?: number;
  executedTasks?: number;
  systemHealth?: string;
  alerts?: number;
}

export interface SystemHealth {
  healthy: boolean;
  components: {
    workflowExecutor: ComponentHealth;
    cronManager: ComponentHealth;
    cronMonitor: ComponentHealth;
  };
  timestamp: string;
  uptime: number;
}

// Types para las respuestas del backend
export interface WorkflowStats {
  executor: {
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    activeExecutions: number;
    averageExecutionTime: number;
    successRate: number;
  };
  cronSystem: {
    isRunning: boolean;
    totalCronJobs: number;
    activeCronJobs: number;
    executedTasks: number;
    failedTasks: number;
    lastExecution: string | null;
  };
  taskScheduler: {
    activeTasks: number;
    completedTasks: number;
    failedTasks: number;
    queuedTasks: number;
    averageExecutionTime: number;
  };
  database: {
    totalWorkflows: string;
    activeWorkflows: string;
    completedWorkflows: string;
    failedWorkflows: string;
    averageCompletionHours: string;
    totalAccountsAutomated: string;
  };
  executions: {
    totalExecutions: string;
    successfulExecutions: string;
    failedExecutions: string;
    averageDurationMs: string;
    uniqueActions: string;
  };
  health: {
    systemHealth: string;
    successRate: number;
    failureRate: number;
    unacknowledgedAlerts: number;
  };
  generatedAt: string;
  uptime: number;
}

export interface ActiveWorkflow {
  executionId: string;
  accountId: string;
  workflowType: string;
  progress: number;
  status: 'active' | 'paused' | 'completed' | 'failed' | 'stopped';
  currentStep?: string;
  totalSteps?: number;
  startedAt: string;
  estimatedCompletion?: string;
  lastActivity?: string;
  timeElapsed?: number;
  progressPercentage?: number;
  isRunning?: boolean;
  canResume?: boolean;
  canPause?: boolean;
  isPermanent?: boolean;
}

export interface DashboardData {
  overview: {
    systemHealth: string;
    totalExecutions: number;
    successRate: number;
    avgExecutionTime: number;
    lastHealthCheck: string;
  };
  cronJobs: {
    total: number;
    running: number;
    failed: number;
  };
  tasks: {
    active: number;
    queued: number;
    completed: number;
    failed: number;
  };
  alerts: {
    recent: Alert[];
    summary: AlertSummary;
  };
  workflows: {
    active: number;
    byType: Record<string, number>;
    byStatus: Record<string, number>;
    recentlyCompleted: CompletedWorkflow[];
    recentlyFailed: FailedWorkflow[];
  };
  systemStatus: {
    workflowExecutor: boolean;
    cronManager: boolean;
    taskScheduler: boolean;
    database: boolean;
  };
  performance: {
    averageWorkflowDuration: number;
    workflowSuccessRate: number;
    systemLoad: {
      activeWorkflows: number;
      queuedTasks: number;
      scheduledTasks: number;
    };
  };
}

// New types for the enhanced endpoints
export interface BulkOperationResult {
  successful: string[];
  failed: Array<{
    accountId: string;
    error: string;
  }>;
  total: number;
}

export interface WorkflowsByStatusResult {
  workflows: Array<{
    accountId: string;
    status: string;
    workflowType: string;
    workflowName: string;
    currentStep: number;
    totalSteps: number;
    progress: number;
    startedAt: string;
    lastActivity: string;
    canPause: boolean;
    canResume: boolean;
    isPermanent: boolean;
  }>;
  count: number;
  filter: string;
}

// API client class
class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
        ...options,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'API request failed');
      }

      return data.data;
    } catch (error) {
      console.error(`API Error (${endpoint}):`, error);
      throw error;
    }
  }

  // Workflow endpoints
  async getWorkflowStats(): Promise<WorkflowStats> {
    return this.request<WorkflowStats>('/workflows/stats');
  }

  async getActiveWorkflows(
    page = 1, 
    limit = 50, 
    status: 'active' | 'paused' | 'completed' | 'failed' | 'stopped' | 'all' = 'active',
    workflowType?: string
  ): Promise<{
    executions: ActiveWorkflow[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
    summary: {
      totalActive: number;
      byWorkflowType: Record<string, number>;
      byStatus: Record<string, number>;
    };
  }> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      status: status
    });
    
    if (workflowType) {
      params.append('workflowType', workflowType);
    }
    
    return this.request(`/workflows/active?${params.toString()}`);
  }

  async getDashboardData(): Promise<DashboardData> {
    return this.request<DashboardData>('/workflows/monitoring/dashboard');
  }

  async getSystemHealth(): Promise<SystemHealth> {
    return this.request<SystemHealth>('/workflows/health');
  }

  async getAlerts(unacknowledged = false, limit = 50): Promise<{
    alerts: Alert[];
    summary: AlertSummary;
  }> {
    return this.request(`/workflows/monitoring/alerts?unacknowledged=${unacknowledged}&limit=${limit}`);
  }

  async acknowledgeAlert(alertId: string): Promise<{
    alertId: string;
    acknowledgedAt: Date;
  }> {
    return this.request(`/workflows/monitoring/alerts/${alertId}/acknowledge`, {
      method: 'POST',
    });
  }

  // Test workflow
  async startTestWorkflow(accountId?: string, workflowType = 'test'): Promise<{
    executionId: string;
    accountId: string;
    workflowType: string;
    totalSteps: number;
    estimatedDuration: number;
    estimatedCompletionTime: string;
    status: string;
  }> {
    return this.request('/workflows/test', {
      method: 'POST',
      body: JSON.stringify({ accountId, workflowType }),
    });
  }

  // Workflow definitions
  async getWorkflowDefinitions(): Promise<{
    definitions: WorkflowDefinition[];
    total: number;
    availableTypes: string[];
  }> {
    return this.request('/workflows/definitions');
  }

  async createWorkflowDefinition(workflow: {
    name: string;
    type: string;
    description: string;
    steps: Omit<WorkflowStep, 'stepNumber'>[];
    config?: Record<string, unknown>;
  }): Promise<{
    id: string;
    type: string;
    name: string;
    version: string;
    totalSteps: number;
    estimatedDuration: number;
  }> {
    return this.request('/workflows/definitions', {
      method: 'POST',
      body: JSON.stringify(workflow),
    });
  }

  async updateWorkflowDefinition(type: string, workflow: {
    name?: string;
    description?: string;
    steps?: Omit<WorkflowStep, 'stepNumber'>[];
    config?: Record<string, unknown>;
  }): Promise<{
    id: string;
    type: string;
    name: string;
    version: string;
    previousVersion: string;
  }> {
    return this.request(`/workflows/definitions/${type}`, {
      method: 'PUT',
      body: JSON.stringify(workflow),
    });
  }

  // Account endpoints
  async importAccount(accountData: {
    model: string;
    channel: string;
    authToken: string;
    workflowType?: string;
  }): Promise<{
    success: boolean;
    accountId: string;
    workflowStarted: boolean;
    executionId?: string;
  }> {
    return this.request('/accounts/import', {
      method: 'POST',
      body: JSON.stringify(accountData),
    });
  }

  // Enhanced workflow status endpoint - NEW VERSION
  async getWorkflowDetailedStatus(accountId: string): Promise<WorkflowDetailedStatus> {
    return this.request(`/accounts/workflow/${accountId}/details`);
  }

  // NEW: Pause workflow
  async pauseWorkflow(accountId: string): Promise<{
    accountId: string;
    status: string;
    canResume: boolean;
    success: boolean;
    message: string;
  }> {
    return this.request(`/accounts/workflow/${accountId}/pause`, {
      method: 'POST',
    });
  }

  // NEW: Resume workflow
  async resumeWorkflow(accountId: string): Promise<{
    accountId: string;
    status: string;
    success: boolean;
    message: string;
    currentStep?: number;
    totalSteps?: number;
  }> {
    return this.request(`/accounts/workflow/${accountId}/resume`, {
      method: 'POST',
    });
  }

  // UPDATED: Stop workflow with delete option
  async stopAccountWorkflow(accountId: string, deleteData = false): Promise<{
    accountId: string;
    status: string;
    permanent: boolean;
    deleted: boolean;
    success: boolean;
    message: string;
    cannotResume: boolean;
  }> {
    return this.request(`/accounts/workflow/${accountId}/stop`, {
      method: 'POST',
      body: JSON.stringify({ deleteData }),
    });
  }

  // NEW: Bulk operations
  async bulkWorkflowOperation(operation: 'pause' | 'resume' | 'stop', accountIds: string[]): Promise<{
    message: string;
    results: BulkOperationResult;
  }> {
    return this.request('/accounts/workflows/bulk', {
      method: 'POST',
      body: JSON.stringify({ operation, accountIds }),
    });
  }

  // NEW: Get workflows by status
  async getWorkflowsByStatus(status?: 'active' | 'paused' | 'stopped'): Promise<WorkflowsByStatusResult> {
    const endpoint = status 
      ? `/accounts/workflows/by-status?status=${status}`
      : '/accounts/workflows/by-status';
    return this.request(endpoint);
  }

  // Existing endpoints remain the same...
  async getModels(): Promise<ModelData> {
    return this.request<ModelData>('/accounts/models');
  }

  async getActiveSwipeTasks(): Promise<{
    tasks: ActiveSwipeTask[];
    total: number;
  }> {
    const data = await this.request<ActiveSwipeTask[]>('/actions/swipe/active');
    return {
      tasks: Array.isArray(data) ? data : [],
      total: Array.isArray(data) ? data.length : 0
    };
  }

  async getAllActiveWorkflows(): Promise<{
    workflows: ActiveWorkflow[];
    summary: {
      totalActive: number;
      byType: Record<string, number>;
      byStatus: Record<string, number>;
    };
  }> {
    return this.request('/accounts/workflows/active');
  }

  async getWorkflowStatsFromAccounts(): Promise<WorkflowStats> {
    return this.request<WorkflowStats>('/accounts/workflows/stats');
  }

  // DEPRECATED: Use bulkWorkflowOperation instead
  async pauseAllWorkflows(): Promise<{ message: string; affectedWorkflows: number }> {
    return this.request('/accounts/workflows/pause-all', {
      method: 'POST',
    });
  }

  // DEPRECATED: Use bulkWorkflowOperation instead
  async resumeAllWorkflows(): Promise<{ message: string; affectedWorkflows: number }> {
    return this.request('/accounts/workflows/resume-all', {
      method: 'POST',
    });
  }

  // Workflow definition management
  async cloneWorkflowDefinition(sourceType: string, cloneData: {
    newType: string;
    newName: string;
    newDescription?: string;
  }): Promise<{
    sourceType: string;
    newType: string;
    name: string;
    version: string;
    totalSteps: number;
  }> {
    return this.request(`/workflows/definitions/${sourceType}/clone`, {
      method: 'POST',
      body: JSON.stringify(cloneData),
    });
  }

  async deleteWorkflowDefinition(type: string): Promise<{
    type: string;
    name: string;
  }> {
    return this.request(`/workflows/definitions/${type}`, {
      method: 'DELETE',
    });
  }

  async toggleWorkflowDefinitionStatus(type: string, active: boolean): Promise<{
    type: string;
    name: string;
    active: boolean;
  }> {
    return this.request(`/workflows/definitions/${type}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ active }),
    });
  }

  async getWorkflowExamples(): Promise<Record<string, {
    name: string;
    type: string;
    description: string;
    steps: Array<{
      id: string;
      action: string;
      delay: number;
      description: string;
      [key: string]: unknown;
    }>;
    config?: Record<string, unknown>;
  }>> {
    return this.request('/workflows/examples');
  }

  // Actions endpoints
  async stopSwipeTask(taskId: string): Promise<{ message: string }> {
    return this.request(`/actions/swipe/stop/${taskId}`, {
      method: 'POST',
    });
  }

  async stopAllSwipeTasks(): Promise<{ message: string; stoppedTasks: number }> {
    return this.request('/actions/swipe/stop-all', {
      method: 'POST',
    });
  }

  async startSwipeTask(accountIds: string[], taskName?: string): Promise<{
    taskId: string;
    message: string;
    accountCount: number;
  }> {
    return this.request('/actions/swipe', {
      method: 'POST',
      body: JSON.stringify({ accountIds, taskName }),
    });
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// React hooks para usar con los datos
import { useState, useEffect, useCallback } from 'react';

export function useWorkflowStats(refreshInterval = 5000) {
  const [data, setData] = useState<WorkflowStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const stats = await apiClient.getWorkflowStats();
      setData(stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch stats');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    
    if (refreshInterval > 0) {
      const interval = setInterval(fetchData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchData, refreshInterval]);

  return { data, loading, error, refetch: fetchData };
}

export function useActiveWorkflows(
  refreshInterval = 10000,
  status: 'active' | 'paused' | 'completed' | 'failed' | 'stopped' | 'all' = 'active',
  workflowType?: string,
  page = 1,
  limit = 50
) {
  const [data, setData] = useState<ActiveWorkflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<{
    totalActive: number;
    byWorkflowType: Record<string, number>;
    byStatus: Record<string, number>;
  } | null>(null);
  const [pagination, setPagination] = useState<{
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  } | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const result = await apiClient.getActiveWorkflows(page, limit, status, workflowType);
      setData(result.executions);
      setSummary(result.summary);
      setPagination(result.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch workflows');
    } finally {
      setLoading(false);
    }
  }, [page, limit, status, workflowType]);

  useEffect(() => {
    fetchData();
    
    if (refreshInterval > 0) {
      const interval = setInterval(fetchData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchData, refreshInterval]);

  return { data, loading, error, summary, pagination, refetch: fetchData };
}

export function useDashboardData(refreshInterval = 10000) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const dashboard = await apiClient.getDashboardData();
      setData(dashboard);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    
    if (refreshInterval > 0) {
      const interval = setInterval(fetchData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchData, refreshInterval]);

  return { data, loading, error, refetch: fetchData };
}

export function useSystemHealth(refreshInterval = 30000) {
  const [data, setData] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const health = await apiClient.getSystemHealth();
      setData(health);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch health data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    
    if (refreshInterval > 0) {
      const interval = setInterval(fetchData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchData, refreshInterval]);

  return { data, loading, error, refetch: fetchData };
}

// New hooks for additional APIs
export function useModels() {
  const [data, setData] = useState<ModelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const models = await apiClient.getModels();
      setData(models);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch models');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

export function useActiveSwipeTasks(refreshInterval = 5000) {
  const [data, setData] = useState<ActiveSwipeTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const result = await apiClient.getActiveSwipeTasks();
      setData(result.tasks);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch active swipe tasks');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    
    if (refreshInterval > 0) {
      const interval = setInterval(fetchData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchData, refreshInterval]);

  return { data, loading, error, refetch: fetchData };
}

export function useWorkflowDefinitions() {
  const [data, setData] = useState<WorkflowDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const result = await apiClient.getWorkflowDefinitions();
      setData(result.definitions);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch workflow definitions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

export function useWorkflowDetailedStatus(accountId: string, refreshInterval = 3000) {
  const [data, setData] = useState<WorkflowDetailedStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!accountId) return;
    
    try {
      setError(null);
      const status = await apiClient.getWorkflowDetailedStatus(accountId);
      setData(status);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch workflow status');
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  useEffect(() => {
    fetchData();
    
    if (refreshInterval > 0 && accountId) {
      const interval = setInterval(fetchData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchData, refreshInterval, accountId]);

  return { data, loading, error, refetch: fetchData };
}

// NEW: Hook for workflows by status
export function useWorkflowsByStatus(status?: 'active' | 'paused' | 'stopped', refreshInterval = 10000) {
  const [data, setData] = useState<WorkflowsByStatusResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const result = await apiClient.getWorkflowsByStatus(status);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch workflows by status');
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    fetchData();
    
    if (refreshInterval > 0) {
      const interval = setInterval(fetchData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchData, refreshInterval]);

  return { data, loading, error, refetch: fetchData };
}