// src/services/workflowMonitoringService.js - Specialized Workflow Monitoring Service

const EventEmitter = require("events");

/**
 * WorkflowMonitoringService - Handles single responsibility of workflow monitoring and metrics
 * Separated from WorkflowExecutor to follow Single Responsibility Principle
 */
class WorkflowMonitoringService extends EventEmitter {
  constructor() {
    super();
    
    // Core metrics
    this.executionMetrics = {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      retryCount: 0,
      averageExecutionTime: 0,
      longestExecution: 0,
      shortestExecution: Infinity
    };

    // Performance tracking
    this.performanceMetrics = {
      executionTimes: [], // Keep last 100 execution times
      stepExecutionTimes: new Map(), // stepType -> [times]
      errorRates: new Map(), // stepType -> {total, errors}
      throughput: {
        lastHour: 0,
        last24Hours: 0,
        startTime: Date.now()
      }
    };

    // Active monitoring
    this.activeExecutions = new Map(); // executionId -> execution info
    this.executionHistory = []; // Keep last 1000 executions
    this.alertThresholds = {
      maxExecutionTime: 10 * 60 * 1000, // 10 minutes
      maxFailureRate: 0.3, // 30%
      maxRetryRate: 0.5, // 50%
      maxConcurrentExecutions: 100
    };

    // Health status
    this.healthStatus = {
      status: 'healthy', // healthy, warning, critical
      lastCheck: new Date(),
      issues: []
    };

    console.log("📊 Workflow Monitoring Service initialized");
  }

  /**
   * Start monitoring an execution
   * @param {string} executionId - Execution ID
   * @param {Object} executionInfo - Execution information
   */
  startMonitoring(executionId, executionInfo) {
    const monitoringInfo = {
      executionId,
      accountId: executionInfo.accountId,
      workflowType: executionInfo.workflowType,
      startTime: Date.now(),
      currentStep: 0,
      totalSteps: executionInfo.totalSteps,
      status: 'running',
      stepHistory: [],
      retryCount: 0
    };

    this.activeExecutions.set(executionId, monitoringInfo);
    this.executionMetrics.totalExecutions++;

    this.emit('execution:started', {
      executionId,
      accountId: executionInfo.accountId,
      workflowType: executionInfo.workflowType,
      startTime: monitoringInfo.startTime
    });

    console.log(`📊 Started monitoring execution: ${executionId}`);
  }

  /**
   * Update execution progress
   * @param {string} executionId - Execution ID
   * @param {Object} progressInfo - Progress information
   */
  updateExecutionProgress(executionId, progressInfo) {
    const monitoring = this.activeExecutions.get(executionId);
    if (!monitoring) {
      console.warn(`⚠️ No monitoring found for execution: ${executionId}`);
      return;
    }

    // Update progress
    monitoring.currentStep = progressInfo.currentStep || monitoring.currentStep;
    monitoring.status = progressInfo.status || monitoring.status;
    monitoring.lastUpdate = Date.now();

    // Track step completion
    if (progressInfo.completedStep) {
      monitoring.stepHistory.push({
        stepId: progressInfo.completedStep.stepId,
        stepType: progressInfo.completedStep.action,
        duration: progressInfo.completedStep.duration,
        success: progressInfo.completedStep.success,
        completedAt: Date.now()
      });

      // Update step performance metrics
      this.updateStepMetrics(
        progressInfo.completedStep.action,
        progressInfo.completedStep.duration,
        progressInfo.completedStep.success
      );
    }

    this.emit('execution:progress', {
      executionId,
      currentStep: monitoring.currentStep,
      totalSteps: monitoring.totalSteps,
      progress: Math.round((monitoring.currentStep / monitoring.totalSteps) * 100),
      status: monitoring.status
    });
  }

  /**
   * Complete execution monitoring
   * @param {string} executionId - Execution ID
   * @param {boolean} success - Whether execution succeeded
   * @param {string} error - Error message if failed
   */
  completeExecution(executionId, success, error = null) {
    const monitoring = this.activeExecutions.get(executionId);
    if (!monitoring) {
      console.warn(`⚠️ No monitoring found for execution: ${executionId}`);
      return;
    }

    const endTime = Date.now();
    const duration = endTime - monitoring.startTime;

    // Update metrics
    if (success) {
      this.executionMetrics.successfulExecutions++;
    } else {
      this.executionMetrics.failedExecutions++;
    }

    this.executionMetrics.retryCount += monitoring.retryCount;
    
    // Update execution time metrics
    this.updateExecutionTimeMetrics(duration);

    // Move to history
    const historyEntry = {
      ...monitoring,
      endTime,
      duration,
      success,
      error,
      completedAt: new Date()
    };

    this.executionHistory.unshift(historyEntry);
    
    // Keep only last 1000 executions
    if (this.executionHistory.length > 1000) {
      this.executionHistory = this.executionHistory.slice(0, 1000);
    }

    // Remove from active monitoring
    this.activeExecutions.delete(executionId);

    this.emit('execution:completed', {
      executionId,
      success,
      duration,
      error,
      stepCount: monitoring.stepHistory.length
    });

    console.log(`📊 Completed monitoring execution: ${executionId} (${success ? 'SUCCESS' : 'FAILED'}) - Duration: ${duration}ms`);
  }

  /**
   * Record execution retry
   * @param {string} executionId - Execution ID
   * @param {number} retryCount - Current retry count
   * @param {string} reason - Retry reason
   */
  recordRetry(executionId, retryCount, reason) {
    const monitoring = this.activeExecutions.get(executionId);
    if (monitoring) {
      monitoring.retryCount = retryCount;
      monitoring.lastRetry = {
        count: retryCount,
        reason,
        timestamp: Date.now()
      };
    }

    this.emit('execution:retry', {
      executionId,
      retryCount,
      reason,
      timestamp: Date.now()
    });

    console.log(`🔄 Recorded retry ${retryCount} for execution: ${executionId} - Reason: ${reason}`);
  }

  /**
   * Update step execution metrics
   * @param {string} stepType - Type of step
   * @param {number} duration - Execution duration in ms
   * @param {boolean} success - Whether step succeeded
   */
  updateStepMetrics(stepType, duration, success) {
    // Track execution times by step type
    if (!this.performanceMetrics.stepExecutionTimes.has(stepType)) {
      this.performanceMetrics.stepExecutionTimes.set(stepType, []);
    }
    
    const times = this.performanceMetrics.stepExecutionTimes.get(stepType);
    times.push(duration);
    
    // Keep only last 100 times per step type
    if (times.length > 100) {
      times.shift();
    }

    // Track error rates by step type
    if (!this.performanceMetrics.errorRates.has(stepType)) {
      this.performanceMetrics.errorRates.set(stepType, { total: 0, errors: 0 });
    }
    
    const errorRate = this.performanceMetrics.errorRates.get(stepType);
    errorRate.total++;
    if (!success) {
      errorRate.errors++;
    }
  }

  /**
   * Update execution time metrics
   * @param {number} duration - Execution duration in ms
   */
  updateExecutionTimeMetrics(duration) {
    // Add to performance tracking
    this.performanceMetrics.executionTimes.push({
      duration,
      timestamp: Date.now()
    });

    // Keep only last 100 execution times
    if (this.performanceMetrics.executionTimes.length > 100) {
      this.performanceMetrics.executionTimes.shift();
    }

    // Update min/max/average
    if (duration > this.executionMetrics.longestExecution) {
      this.executionMetrics.longestExecution = duration;
    }
    if (duration < this.executionMetrics.shortestExecution) {
      this.executionMetrics.shortestExecution = duration;
    }

    // Recalculate average
    const recentTimes = this.performanceMetrics.executionTimes.map(e => e.duration);
    this.executionMetrics.averageExecutionTime = recentTimes.length > 0 
      ? Math.round(recentTimes.reduce((a, b) => a + b, 0) / recentTimes.length)
      : 0;
  }

  /**
   * Get comprehensive monitoring statistics
   * @returns {Object} Complete monitoring statistics
   */
  getMonitoringStats() {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);
    const oneDayAgo = now - (24 * 60 * 60 * 1000);

    // Calculate throughput
    const lastHourExecutions = this.executionHistory.filter(e => 
      e.completedAt && e.completedAt.getTime() > oneHourAgo
    ).length;

    const last24HourExecutions = this.executionHistory.filter(e => 
      e.completedAt && e.completedAt.getTime() > oneDayAgo
    ).length;

    // Calculate failure rates
    const totalCompleted = this.executionMetrics.successfulExecutions + this.executionMetrics.failedExecutions;
    const failureRate = totalCompleted > 0 ? this.executionMetrics.failedExecutions / totalCompleted : 0;
    const retryRate = totalCompleted > 0 ? this.executionMetrics.retryCount / totalCompleted : 0;

    // Get step performance summary
    const stepPerformance = {};
    for (const [stepType, times] of this.performanceMetrics.stepExecutionTimes) {
      const errorInfo = this.performanceMetrics.errorRates.get(stepType) || { total: 0, errors: 0 };
      stepPerformance[stepType] = {
        averageTime: times.length > 0 ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0,
        minTime: times.length > 0 ? Math.min(...times) : 0,
        maxTime: times.length > 0 ? Math.max(...times) : 0,
        executionCount: times.length,
        errorRate: errorInfo.total > 0 ? errorInfo.errors / errorInfo.total : 0
      };
    }

    return {
      service: 'WorkflowMonitoringService',
      timestamp: now,
      
      // Core metrics
      executionMetrics: {
        ...this.executionMetrics,
        failureRate: Math.round(failureRate * 100) / 100,
        retryRate: Math.round(retryRate * 100) / 100
      },

      // Active monitoring
      activeExecutions: {
        count: this.activeExecutions.size,
        executions: Array.from(this.activeExecutions.values()).map(e => ({
          executionId: e.executionId,
          accountId: e.accountId,
          workflowType: e.workflowType,
          currentStep: e.currentStep,
          totalSteps: e.totalSteps,
          runtime: now - e.startTime,
          retryCount: e.retryCount
        }))
      },

      // Throughput
      throughput: {
        lastHour: lastHourExecutions,
        last24Hours: last24HourExecutions,
        perMinuteLast24h: Math.round(last24HourExecutions / (24 * 60))
      },

      // Step performance
      stepPerformance,

      // Health status
      healthStatus: this.checkHealthStatus()
    };
  }

  /**
   * Check system health status
   * @returns {Object} Health status
   */
  checkHealthStatus() {
    const issues = [];
    let status = 'healthy';

    // Check concurrent executions
    if (this.activeExecutions.size > this.alertThresholds.maxConcurrentExecutions) {
      issues.push(`High concurrent executions: ${this.activeExecutions.size}`);
      status = 'warning';
    }

    // Check failure rate
    const totalCompleted = this.executionMetrics.successfulExecutions + this.executionMetrics.failedExecutions;
    const failureRate = totalCompleted > 0 ? this.executionMetrics.failedExecutions / totalCompleted : 0;
    
    if (failureRate > this.alertThresholds.maxFailureRate) {
      issues.push(`High failure rate: ${Math.round(failureRate * 100)}%`);
      status = 'critical';
    }

    // Check retry rate
    const retryRate = totalCompleted > 0 ? this.executionMetrics.retryCount / totalCompleted : 0;
    
    if (retryRate > this.alertThresholds.maxRetryRate) {
      issues.push(`High retry rate: ${Math.round(retryRate * 100)}%`);
      if (status !== 'critical') status = 'warning';
    }

    // Check for long-running executions
    const now = Date.now();
    for (const [executionId, monitoring] of this.activeExecutions) {
      const runtime = now - monitoring.startTime;
      if (runtime > this.alertThresholds.maxExecutionTime) {
        issues.push(`Long-running execution: ${executionId} (${Math.round(runtime / 1000)}s)`);
        if (status !== 'critical') status = 'warning';
      }
    }

    this.healthStatus = {
      status,
      lastCheck: new Date(),
      issues
    };

    return this.healthStatus;
  }

  /**
   * Get execution details by ID
   * @param {string} executionId - Execution ID
   * @returns {Object|null} Execution details
   */
  getExecutionDetails(executionId) {
    // Check active executions first
    const active = this.activeExecutions.get(executionId);
    if (active) {
      return {
        ...active,
        isActive: true,
        runtime: Date.now() - active.startTime
      };
    }

    // Check history
    const historical = this.executionHistory.find(e => e.executionId === executionId);
    if (historical) {
      return {
        ...historical,
        isActive: false
      };
    }

    return null;
  }

  /**
   * Clean up old monitoring data
   * @param {number} maxAgeMs - Maximum age in milliseconds
   */
  cleanupMonitoringData(maxAgeMs = 7 * 24 * 60 * 60 * 1000) { // 7 days default
    const cutoff = Date.now() - maxAgeMs;
    
    // Clean execution history
    const originalLength = this.executionHistory.length;
    this.executionHistory = this.executionHistory.filter(e => 
      e.completedAt && e.completedAt.getTime() > cutoff
    );

    // Clean performance data
    this.performanceMetrics.executionTimes = this.performanceMetrics.executionTimes.filter(e => 
      e.timestamp > cutoff
    );

    const cleanedCount = originalLength - this.executionHistory.length;
    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned up ${cleanedCount} old monitoring records`);
    }

    return cleanedCount;
  }
}

module.exports = new WorkflowMonitoringService();