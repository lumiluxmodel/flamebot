// src/services/workflowLockService.js - Database-First Distributed Locking Service

/**
 * WorkflowLockService - Handles distributed locking for workflow operations
 * Prevents race conditions in pause/resume and other critical operations
 */
class WorkflowLockService {
  constructor(databaseService) {
    this.db = databaseService;
    this.lockTimeout = 5 * 60 * 1000; // 5 minutes default
    this.instanceId = `wf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log(`🔒 Workflow Lock Service initialized with instance ID: ${this.instanceId}`);
  }

  /**
   * Acquire a distributed lock
   * @param {string} lockKey - Unique lock key
   * @param {number} timeoutSeconds - Lock timeout in seconds
   * @returns {Promise<boolean>} True if lock acquired
   */
  async acquireLock(lockKey, timeoutSeconds = 300) {
    try {
      const query = 'SELECT acquire_workflow_lock($1, $2, $3) as acquired';
      const result = await this.db.query(query, [lockKey, this.instanceId, timeoutSeconds]);
      
      const acquired = result.rows[0].acquired;
      
      if (acquired) {
        console.log(`🔒 Lock acquired: ${lockKey} by ${this.instanceId}`);
      } else {
        console.log(`⚠️ Failed to acquire lock: ${lockKey} (already held)`);
      }
      
      return acquired;
      
    } catch (error) {
      console.error(`❌ Error acquiring lock ${lockKey}:`, error);
      return false;
    }
  }

  /**
   * Release a distributed lock
   * @param {string} lockKey - Unique lock key
   * @returns {Promise<boolean>} True if lock released
   */
  async releaseLock(lockKey) {
    try {
      const query = 'SELECT release_workflow_lock($1, $2) as released';
      const result = await this.db.query(query, [lockKey, this.instanceId]);
      
      const released = result.rows[0].released;
      
      if (released) {
        console.log(`🔓 Lock released: ${lockKey} by ${this.instanceId}`);
      } else {
        console.log(`⚠️ Failed to release lock: ${lockKey} (not held by this instance)`);
      }
      
      return released;
      
    } catch (error) {
      console.error(`❌ Error releasing lock ${lockKey}:`, error);
      return false;
    }
  }

  /**
   * Check if a lock exists
   * @param {string} lockKey - Unique lock key
   * @returns {Promise<boolean>} True if lock exists
   */
  async hasLock(lockKey) {
    try {
      const query = 'SELECT has_workflow_lock($1) as exists';
      const result = await this.db.query(query, [lockKey]);
      
      return result.rows[0].exists;
      
    } catch (error) {
      console.error(`❌ Error checking lock ${lockKey}:`, error);
      return false;
    }
  }

  /**
   * Execute a function with a distributed lock
   * @param {string} lockKey - Unique lock key
   * @param {Function} fn - Function to execute while holding the lock
   * @param {number} timeoutSeconds - Lock timeout in seconds
   * @returns {Promise<*>} Result of the function
   */
  async withLock(lockKey, fn, timeoutSeconds = 300) {
    const acquired = await this.acquireLock(lockKey, timeoutSeconds);
    
    if (!acquired) {
      throw new Error(`Failed to acquire lock: ${lockKey}`);
    }

    try {
      console.log(`🔒 Executing function with lock: ${lockKey}`);
      const result = await fn();
      console.log(`✅ Function completed with lock: ${lockKey}`);
      return result;
      
    } finally {
      await this.releaseLock(lockKey);
    }
  }

  /**
   * Generate a workflow operation lock key
   * @param {string} accountId - Account ID
   * @param {string} operation - Operation type (pause, resume, stop, etc.)
   * @returns {string} Lock key
   */
  getWorkflowLockKey(accountId, operation) {
    return `workflow:${accountId}:${operation}`;
  }

  /**
   * Pause workflow with distributed lock protection
   * @param {string} accountId - Account ID
   * @param {Function} pauseFunction - Function to execute the pause
   * @returns {Promise<*>} Result of pause operation
   */
  async pauseWorkflowWithLock(accountId, pauseFunction) {
    const lockKey = this.getWorkflowLockKey(accountId, 'pause');
    return await this.withLock(lockKey, pauseFunction, 60); // 1 minute timeout for pause operations
  }

  /**
   * Resume workflow with distributed lock protection
   * @param {string} accountId - Account ID
   * @param {Function} resumeFunction - Function to execute the resume
   * @returns {Promise<*>} Result of resume operation
   */
  async resumeWorkflowWithLock(accountId, resumeFunction) {
    const lockKey = this.getWorkflowLockKey(accountId, 'resume');
    return await this.withLock(lockKey, resumeFunction, 60); // 1 minute timeout for resume operations
  }

  /**
   * Stop workflow with distributed lock protection
   * @param {string} accountId - Account ID
   * @param {Function} stopFunction - Function to execute the stop
   * @returns {Promise<*>} Result of stop operation
   */
  async stopWorkflowWithLock(accountId, stopFunction) {
    const lockKey = this.getWorkflowLockKey(accountId, 'stop');
    return await this.withLock(lockKey, stopFunction, 60); // 1 minute timeout for stop operations
  }

  /**
   * Execute workflow step with lock protection
   * @param {string} accountId - Account ID
   * @param {Function} stepFunction - Function to execute the step
   * @returns {Promise<*>} Result of step execution
   */
  async executeStepWithLock(accountId, stepFunction) {
    const lockKey = this.getWorkflowLockKey(accountId, 'execute');
    return await this.withLock(lockKey, stepFunction, 300); // 5 minutes timeout for step execution
  }

  /**
   * Clean up expired locks
   * @returns {Promise<number>} Number of locks cleaned up
   */
  async cleanupExpiredLocks() {
    try {
      const query = 'DELETE FROM workflow_locks WHERE expires_at < CURRENT_TIMESTAMP';
      const result = await this.db.query(query);
      
      const count = result.rowCount;
      if (count > 0) {
        console.log(`🧹 Cleaned up ${count} expired workflow locks`);
      }
      
      return count;
      
    } catch (error) {
      console.error('❌ Error cleaning up expired locks:', error);
      return 0;
    }
  }

  /**
   * Get lock statistics
   * @returns {Promise<Object>} Lock statistics
   */
  async getLockStats() {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_locks,
          COUNT(*) FILTER (WHERE expires_at > CURRENT_TIMESTAMP) as active_locks,
          COUNT(*) FILTER (WHERE expires_at <= CURRENT_TIMESTAMP) as expired_locks,
          COUNT(DISTINCT locked_by) as unique_instances
        FROM workflow_locks
      `;
      
      const result = await this.db.query(query);
      const stats = result.rows[0];
      
      return {
        instanceId: this.instanceId,
        totalLocks: parseInt(stats.total_locks) || 0,
        activeLocks: parseInt(stats.active_locks) || 0,
        expiredLocks: parseInt(stats.expired_locks) || 0,
        uniqueInstances: parseInt(stats.unique_instances) || 0
      };
      
    } catch (error) {
      console.error('❌ Error getting lock stats:', error);
      return { error: error.message };
    }
  }

  /**
   * Force release all locks held by this instance (cleanup on shutdown)
   * @returns {Promise<number>} Number of locks released
   */
  async releaseAllLocks() {
    try {
      const query = 'DELETE FROM workflow_locks WHERE locked_by = $1';
      const result = await this.db.query(query, [this.instanceId]);
      
      const count = result.rowCount;
      if (count > 0) {
        console.log(`🧹 Released ${count} locks held by instance ${this.instanceId}`);
      }
      
      return count;
      
    } catch (error) {
      console.error('❌ Error releasing all locks:', error);
      return 0;
    }
  }
}

module.exports = WorkflowLockService;