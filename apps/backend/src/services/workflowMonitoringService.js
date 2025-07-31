// src/services/workflowMonitoringService.js - Database-First Workflow Monitoring Service

const EventEmitter = require("events");
const workflowMetricsService = require("./workflowMetricsService");

/**
 * WorkflowMonitoringService - Database-First Workflow Monitoring
 * REFACTORED: All metrics now stored in database via WorkflowMetricsService
 * Follows CODING_STANDARDS.md: Database is the Single Source of Truth
 */
class WorkflowMonitoringService extends EventEmitter {
  constructor() {
    super();
    
    // 🚀 DATABASE-FIRST: All metrics moved to WorkflowMetricsService
    // No more in-memory storage of metrics or active executions
    
    this.alertThresholds = {
      maxExecutionTime: 10 * 60 * 1000, // 10 minutes
      maxFailureRate: 0.3, // 30%
      maxRetryRate: 0.5, // 50%
      maxConcurrentExecutions: 100
    };

    // Health status (transient, can be in memory)
    this.healthStatus = {
      status: 'healthy', // healthy, warning, critical
      lastCheck: new Date(),
      issues: []
    };

    console.log("📊 Workflow Monitoring Service initialized (Database-First)");
  }

  /**
   * Start monitoring an execution (DATABASE-FIRST)
   * @param {string} executionId - Execution ID
   * @param {Object} executionInfo - Execution information
   */
  async startMonitoring(executionId, executionInfo) {
    // 🚀 DATABASE-FIRST: Record in database instead of memory
    await workflowMetricsService.recordExecutionStart(executionId, executionInfo);

    this.emit('execution:started', {
      executionId,
      accountId: executionInfo.accountId,
      workflowType: executionInfo.workflowType,
      startTime: Date.now()
    });

    console.log(`📊 Started monitoring execution: ${executionId} (stored in database)`);
  }

  /**
   * Update execution progress (DATABASE-FIRST)
   * @param {string} executionId - Execution ID
   * @param {Object} progressInfo - Progress information
   */
  async updateExecutionProgress(executionId, progressInfo) {
    // 🚀 DATABASE-FIRST: Update in database instead of memory
    await workflowMetricsService.updateExecutionProgress(executionId, progressInfo);

    this.emit('execution:progress', {
      executionId,
      currentStep: progressInfo.currentStep,
      totalSteps: progressInfo.totalSteps,
      progress: progressInfo.progress || 0,
      status: progressInfo.status || 'running'
    });

    console.log(`📊 Updated execution progress: ${executionId} (stored in database)`);
  }

  /**
   * Complete execution monitoring (DATABASE-FIRST)
   * @param {string} executionId - Execution ID
   * @param {boolean} success - Whether execution succeeded
   * @param {string} error - Error message if failed
   * @param {number} duration - Execution duration in ms
   */
  async completeExecution(executionId, success, error = null, duration = null) {
    // 🚀 DATABASE-FIRST: Record completion in database
    await workflowMetricsService.recordExecutionComplete(executionId, success, error, duration);

    this.emit('execution:completed', {
      executionId,
      success,
      duration,
      error
    });

    console.log(`📊 Completed monitoring execution: ${executionId} (${success ? 'SUCCESS' : 'FAILED'}) - Duration: ${duration}ms (stored in database)`);
  }

  /**
   * Record retry attempt (DATABASE-FIRST)
   * @param {string} executionId - Execution ID
   * @param {number} retryCount - Current retry count
   * @param {string} error - Error message that caused retry
   */
  async recordRetry(executionId, retryCount, error) {
    // Update the execution progress to reflect retry
    await this.updateExecutionProgress(executionId, {
      status: 'active', // Keep as active during retries
      retryCount,
      lastError: error
    });

    this.emit('execution:retry', {
      executionId,
      retryCount,
      error
    });

    console.log(`📊 Recorded retry attempt: ${executionId} (retry ${retryCount}) - stored in database`);
  }

  /**
   * Get execution metrics from database (replaces in-memory metrics)
   * @param {string} timeframe - Timeframe ('1h', '24h', '7d', '30d')
   * @returns {Promise<Object>} Execution metrics
   */
  async getExecutionMetrics(timeframe = '24h') {
    return await workflowMetricsService.getExecutionMetrics(timeframe);
  }

  /**
   * Get active executions from database (replaces in-memory Map)
   * @returns {Promise<Array>} Active executions
   */
  async getActiveExecutions() {
    return await workflowMetricsService.getActiveExecutions();
  }

  /**
   * Get execution statistics for monitoring dashboard
   * @returns {Promise<Object>} Statistics for dashboard
   */
  async getStatistics() {
    const metrics = await this.getExecutionMetrics('24h');
    const activeExecutions = await this.getActiveExecutions();

    return {
      totalExecutions: metrics.totalExecutions,
      successfulExecutions: metrics.successfulExecutions,
      failedExecutions: metrics.failedExecutions,
      activeExecutions: activeExecutions.length,
      averageExecutionTime: metrics.averageExecutionTime,
      successRate: metrics.successRate,
      isInitialized: true
    };
  }

  /**
   * Check system health based on database metrics
   * @returns {Promise<Object>} Health status
   */
  async checkHealth() {
    try {
      const metrics = await this.getExecutionMetrics('1h');
      const activeExecutions = await this.getActiveExecutions();
      
      const issues = [];
      let status = 'healthy';

      // Check failure rate
      if (metrics.totalExecutions > 0 && (metrics.failedExecutions / metrics.totalExecutions) > this.alertThresholds.maxFailureRate) {
        issues.push(`High failure rate: ${((metrics.failedExecutions / metrics.totalExecutions) * 100).toFixed(1)}%`);
        status = 'warning';
      }

      // Check concurrent executions
      if (activeExecutions.length > this.alertThresholds.maxConcurrentExecutions) {
        issues.push(`Too many concurrent executions: ${activeExecutions.length}`);
        status = 'critical';
      }

      // Check for stuck executions
      const now = Date.now();
      const stuckExecutions = activeExecutions.filter(exec => 
        now - exec.startTime > this.alertThresholds.maxExecutionTime
      );

      if (stuckExecutions.length > 0) {
        issues.push(`${stuckExecutions.length} executions running longer than ${this.alertThresholds.maxExecutionTime / 60000} minutes`);
        status = 'warning';
      }

      this.healthStatus = {
        status,
        lastCheck: new Date(),
        issues,
        metrics: {
          activeExecutions: activeExecutions.length,
          successRate: metrics.successRate,
          avgExecutionTime: metrics.averageExecutionTime
        }
      };

      return this.healthStatus;

    } catch (error) {
      console.error('❌ Error checking health:', error);
      this.healthStatus = {
        status: 'critical',
        lastCheck: new Date(),
        issues: [`Health check failed: ${error.message}`]
      };
      return this.healthStatus;
    }
  }

  /**
   * Get current health status (cached)
   * @returns {Object} Current health status
   */
  getHealthStatus() {
    return this.healthStatus;
  }

  /**
   * Get account performance metrics from database
   * @param {string} accountId - Account ID (optional)
   * @returns {Promise<Array>} Performance data
   */
  async getAccountPerformance(accountId = null) {
    return await workflowMetricsService.getAccountPerformance(accountId);
  }

  /**
   * Clean up old monitoring data
   * @param {number} daysToKeep - Days to keep in database
   */
  async cleanup(daysToKeep = 30) {
    return await workflowMetricsService.cleanOldLogs(daysToKeep);
  }
}

module.exports = new WorkflowMonitoringService();