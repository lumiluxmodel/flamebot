// System Status Types
export interface SystemStatus {
  healthy: boolean;
  workflowCount: number;
  alertCount: number;
  currentTime: string;
}

// Workflow Types
export interface WorkflowStats {
  activeExecutions: number;
  totalExecutions: number;
  successRate: number;
  cronSystem?: {
    totalCronJobs: number;
  };
  taskScheduler?: {
    queuedTasks: number;
  };
  monitoring?: {
    alerts?: {
      unacknowledged: number;
    };
  };
}

export interface WorkflowExecution {
  id: string;
  accountId: string;
  type: 'default' | 'aggressive' | 'test';
  status: 'active' | 'paused' | 'completed' | 'failed';
  startTime: Date;
  endTime?: Date;
  duration?: number;
  currentStep?: string;
  error?: string;
}

// Alert Types
export interface Alert {
  id: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  timestamp: Date;
  acknowledged: boolean;
  source?: string;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Tab Navigation Types
export interface Tab {
  id: string;
  label: string;
  icon: any; // For Lucide React icons
}

// Activity Timeline Types
export interface ActivityItem {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  description: string;
  meta?: string;
  timestamp: Date;
}

// Dashboard Data Types
export interface DashboardData {
  systemOverview: {
    activeWorkflows: number;
    totalExecutions: number;
    successRate: number;
    avgDuration: string;
  };
  workflowDistribution: {
    default: number;
    aggressive: number;
    test: number;
  };
  systemPerformance: {
    cronJobs: number;
    queuedTasks: number;
    memoryUsage: string;
    uptime: string;
  };
  recentAlerts: Alert[];
  recentActivity: ActivityItem[];
} 