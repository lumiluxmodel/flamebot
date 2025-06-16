// Time formatting utilities
export const formatDuration = (milliseconds: number): string => {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
};

export const formatTimeAgo = (timestamp: Date): string => {
  const now = new Date();
  const diff = now.getTime() - timestamp.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'Just now';
};

// Status utilities
export const getStatusColor = (status: string): string => {
  switch (status) {
    case 'active':
    case 'success':
    case 'healthy':
      return '#00ff00';
    case 'warning':
    case 'paused':
      return '#ffff00';
    case 'error':
    case 'failed':
    case 'critical':
      return '#ff0000';
    case 'info':
    default:
      return '#00ffff';
  }
};

export const getStatusIcon = (type: string): string => {
  switch (type) {
    case 'success':
      return '✓';
    case 'error':
      return '✗';
    case 'warning':
      return '⚠';
    case 'info':
    default:
      return 'ℹ';
  }
};

// Data formatting utilities
export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${Math.round(bytes / Math.pow(k, i))}${sizes[i]}`;
};

export const formatPercentage = (value: number, total: number): string => {
  if (total === 0) return '0%';
  return `${Math.round((value / total) * 100)}%`;
};

// Validation utilities
export const isValidWorkflowType = (type: string): boolean => {
  return ['default', 'aggressive', 'test'].includes(type);
};

export const isValidStatus = (status: string): boolean => {
  return ['active', 'paused', 'completed', 'failed'].includes(status);
};

// API utilities
export const createApiUrl = (endpoint: string, baseUrl = '/api'): string => {
  return `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
}; 