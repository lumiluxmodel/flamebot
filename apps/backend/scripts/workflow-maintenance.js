// scripts/workflow-maintenance.js - Database Maintenance Script
require('dotenv').config();
const workflowDb = require('../src/services/workflowDatabaseService');

/**
 * Workflow Database Maintenance Script
 * Handles cleanup, statistics updates, and data maintenance
 */
class WorkflowMaintenance {
    constructor() {
        this.stats = {
            cleanedTasks: 0,
            updatedStats: 0,
            archivedWorkflows: 0,
            totalProcessed: 0
        };
    }

    /**
     * Run all maintenance tasks
     */
    async runMaintenance() {
        console.log('🧹 Starting Workflow Database Maintenance...\n');
        
        try {
            // Clean up old tasks
            await this.cleanupOldTasks();
            
            // Archive old completed workflows
            await this.archiveOldWorkflows();
            
            // Update daily statistics
            await this.updateDailyStatistics();
            
            // Cleanup execution logs
            await this.cleanupExecutionLogs();
            
            // Show summary
            this.showMaintenanceSummary();
            
        } catch (error) {
            console.error('❌ Maintenance failed:', error);
            throw error;
        }
    }

    /**
     * Clean up old completed/failed scheduled tasks
     */
    async cleanupOldTasks() {
        console.log('🗑️ Cleaning up old scheduled tasks...');
        
        try {
            // Clean up tasks older than 7 days
            const cleanedCount = await workflowDb.cleanupOldTasks(7);
            this.stats.cleanedTasks = cleanedCount;
            
            console.log(`   ✅ Cleaned up ${cleanedCount} old scheduled tasks`);
        } catch (error) {
            console.error('   ❌ Failed to cleanup old tasks:', error);
        }
    }

    /**
     * Archive old completed workflows (move to archive or delete)
     */
    async archiveOldWorkflows() {
        console.log('📦 Archiving old completed workflows...');
        
        try {
            // Get workflows older than 30 days that are completed/failed
            const query = `
                UPDATE workflow_instances 
                SET execution_context = jsonb_set(
                    COALESCE(execution_context, '{}'),
                    '{archived}',
                    'true'
                )
                WHERE status IN ('completed', 'failed', 'stopped')
                AND completed_at < CURRENT_TIMESTAMP - INTERVAL '30 days'
                AND (execution_context->>'archived' IS NULL OR execution_context->>'archived' != 'true')
            `;
            
            const result = await workflowDb.db.query(query);
            this.stats.archivedWorkflows = result.rowCount;
            
            console.log(`   ✅ Archived ${result.rowCount} old workflows`);
        } catch (error) {
            console.error('   ❌ Failed to archive old workflows:', error);
        }
    }

    /**
     * Update daily workflow statistics
     */
    async updateDailyStatistics() {
        console.log('📊 Updating daily workflow statistics...');
        
        try {
            // Update today's stats
            await workflowDb.updateDailyWorkflowStats(new Date());
            
            // Update yesterday's stats if needed
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            await workflowDb.updateDailyWorkflowStats(yesterday);
            
            this.stats.updatedStats = 2;
            console.log(`   ✅ Updated daily statistics for today and yesterday`);
        } catch (error) {
            console.error('   ❌ Failed to update daily statistics:', error);
        }
    }

    /**
     * Clean up old execution logs (keep only recent ones)
     */
    async cleanupExecutionLogs() {
        console.log('🗑️ Cleaning up old execution logs...');
        
        try {
            // Keep only last 1000 entries per workflow, delete older ones
            const query = `
                DELETE FROM workflow_execution_log 
                WHERE id NOT IN (
                    SELECT id FROM (
                        SELECT id, 
                               ROW_NUMBER() OVER (
                                   PARTITION BY workflow_instance_id 
                                   ORDER BY executed_at DESC
                               ) as rn
                        FROM workflow_execution_log
                    ) ranked 
                    WHERE rn <= 1000
                )
            `;
            
            const result = await workflowDb.db.query(query);
            console.log(`   ✅ Cleaned up ${result.rowCount} old execution log entries`);
        } catch (error) {
            console.error('   ❌ Failed to cleanup execution logs:', error);
        }
    }

    /**
     * Show maintenance summary
     */
    showMaintenanceSummary() {
        console.log('\n📋 Maintenance Summary:');
        console.log('=======================');
        console.log(`Scheduled Tasks Cleaned: ${this.stats.cleanedTasks}`);
        console.log(`Workflows Archived: ${this.stats.archivedWorkflows}`);
        console.log(`Daily Stats Updated: ${this.stats.updatedStats} days`);
        console.log('');
        console.log('✅ Maintenance completed successfully!');
    }

    /**
     * Get maintenance statistics
     */
    async getMaintenanceStats() {
        console.log('📊 Getting maintenance statistics...\n');
        
        try {
            // Get workflow statistics
            const workflowStats = await workflowDb.getWorkflowStatistics();
            console.log('Workflow Statistics:');
            console.log(`  Active Workflows: ${workflowStats.active_workflows}`);
            console.log(`  Completed Workflows: ${workflowStats.completed_workflows}`);
            console.log(`  Failed Workflows: ${workflowStats.failed_workflows}`);
            console.log(`  Total Workflows: ${workflowStats.total_workflows}`);
            console.log(`  Average Completion Time: ${workflowStats.avg_completion_hours?.toFixed(2) || 'N/A'} hours`);
            console.log(`  Total Accounts Automated: ${workflowStats.total_accounts_automated}`);
            
            // Get execution statistics
            const execStats = await workflowDb.getExecutionStatistics();
            console.log('\nExecution Statistics:');
            console.log(`  Total Executions: ${execStats.total_executions}`);
            console.log(`  Successful Executions: ${execStats.successful_executions}`);
            console.log(`  Failed Executions: ${execStats.failed_executions}`);
            console.log(`  Average Duration: ${execStats.avg_duration_ms?.toFixed(0) || 'N/A'} ms`);
            console.log(`  Unique Actions: ${execStats.unique_actions}`);
            
            // Get database size info
            const sizeQuery = `
                SELECT 
                    schemaname,
                    tablename,
                    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
                    pg_relation_size(schemaname||'.'||tablename) AS size_bytes
                FROM pg_tables 
                WHERE tablename LIKE 'workflow%' OR tablename LIKE 'scheduled%'
                ORDER BY pg_relation_size(schemaname||'.'||tablename) DESC
            `;
            
            const sizeResult = await workflowDb.db.query(sizeQuery);
            console.log('\nDatabase Table Sizes:');
            sizeResult.rows.forEach(row => {
                console.log(`  ${row.tablename}: ${row.size}`);
            });
            
        } catch (error) {
            console.error('❌ Failed to get maintenance stats:', error);
        }
    }

    /**
     * Optimize database performance
     */
    async optimizeDatabase() {
        console.log('⚡ Optimizing database performance...\n');
        
        try {
            // Analyze tables to update statistics
            const tables = [
                'workflow_definitions',
                'workflow_instances', 
                'workflow_execution_log',
                'scheduled_tasks',
                'workflow_stats'
            ];
            
            for (const table of tables) {
                console.log(`   Analyzing ${table}...`);
                await workflowDb.db.query(`ANALYZE ${table}`);
            }
            
            // Vacuum tables to reclaim space
            console.log('\n   Running VACUUM on workflow tables...');
            for (const table of tables) {
                await workflowDb.db.query(`VACUUM ${table}`);
            }
            
            console.log('✅ Database optimization completed!');
            
        } catch (error) {
            console.error('❌ Database optimization failed:', error);
        }
    }

    /**
     * Backup workflow definitions
     */
    async backupWorkflowDefinitions() {
        console.log('💾 Backing up workflow definitions...');
        
        try {
            const definitions = await workflowDb.getAllWorkflowDefinitions();
            
            const fs = require('fs').promises;
            const path = require('path');
            
            const backupDir = path.join(__dirname, '../backups');
            await fs.mkdir(backupDir, { recursive: true });
            
            const backupFile = path.join(backupDir, `workflow-definitions-${new Date().toISOString().split('T')[0]}.json`);
            await fs.writeFile(backupFile, JSON.stringify(definitions, null, 2));
            
            console.log(`   ✅ Workflow definitions backed up to: ${backupFile}`);
            
        } catch (error) {
            console.error('   ❌ Failed to backup workflow definitions:', error);
        }
    }
}

// Command line interface
async function main() {
    const maintenance = new WorkflowMaintenance();
    const command = process.argv[2];
    
    try {
        switch (command) {
            case 'cleanup':
                await maintenance.cleanupOldTasks();
                break;
                
            case 'archive':
                await maintenance.archiveOldWorkflows();
                break;
                
            case 'stats':
                await maintenance.getMaintenanceStats();
                break;
                
            case 'optimize':
                await maintenance.optimizeDatabase();
                break;
                
            case 'backup':
                await maintenance.backupWorkflowDefinitions();
                break;
                
            case 'full':
            default:
                await maintenance.runMaintenance();
                break;
        }
        
        process.exit(0);
    } catch (error) {
        console.error('💥 Maintenance script failed:', error);
        process.exit(1);
    }
}

// Export for use in other scripts
module.exports = WorkflowMaintenance;

// Run if called directly
if (require.main === module) {
    main();
}
