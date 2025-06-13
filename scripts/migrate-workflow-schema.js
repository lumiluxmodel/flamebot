// scripts/migrate-workflow-schema.js - Complete Workflow Database Schema
require('dotenv').config();
const { Pool } = require('pg');

class WorkflowSchemaMigration {
    constructor() {
        const env = process.env.NODE_ENV || 'development';
        const dbConfig = {
            host: process.env.DB_HOST || 'yamabiko.proxy.rlwy.net',
            port: process.env.DB_PORT || 18827,
            database: process.env.DB_NAME || 'railway',
            user: process.env.DB_USER || 'postgres',
            password: process.env.DB_PASSWORD || 'pyZSoGjkpyNLzYnfFgRpoHdBGVsQgkie',
            ssl: {
                rejectUnauthorized: false
            }
        };
        
        this.pool = new Pool(dbConfig);
    }

    async runMigration() {
        console.log('🚀 Starting Workflow Database Schema Migration...\n');
        
        try {
            // Create all tables in correct order
            await this.createWorkflowDefinitionsTable();
            await this.createWorkflowInstancesTable();
            await this.createWorkflowExecutionLogTable();
            await this.createScheduledTasksTable();
            await this.createWorkflowStatsTable();
            
            // Create indexes for performance
            await this.createIndexes();
            
            // Insert default workflow definitions
            await this.insertDefaultWorkflowDefinitions();
            
            console.log('✅ Workflow Database Schema Migration completed successfully!\n');
            
        } catch (error) {
            console.error('❌ Migration failed:', error);
            throw error;
        } finally {
            await this.pool.end();
        }
    }

    async createWorkflowDefinitionsTable() {
        console.log('📊 Creating workflow_definitions table...');
        
        const query = `
            CREATE TABLE IF NOT EXISTS workflow_definitions (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL UNIQUE,
                type VARCHAR(50) NOT NULL UNIQUE,
                description TEXT,
                steps JSONB NOT NULL,
                config JSONB DEFAULT '{}',
                is_active BOOLEAN DEFAULT true,
                version INTEGER DEFAULT 1,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
            
            -- Trigger to update updated_at
            CREATE OR REPLACE FUNCTION update_updated_at_column()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.updated_at = CURRENT_TIMESTAMP;
                RETURN NEW;
            END;
            $$ language 'plpgsql';
            
            DROP TRIGGER IF EXISTS update_workflow_definitions_updated_at ON workflow_definitions;
            CREATE TRIGGER update_workflow_definitions_updated_at
                BEFORE UPDATE ON workflow_definitions
                FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        `;
        
        await this.pool.query(query);
        console.log('   ✅ workflow_definitions table created');
    }

    async createWorkflowInstancesTable() {
        console.log('📊 Creating workflow_instances table...');
        
        const query = `
            CREATE TABLE IF NOT EXISTS workflow_instances (
                id SERIAL PRIMARY KEY,
                workflow_id INTEGER REFERENCES workflow_definitions(id) ON DELETE CASCADE,
                account_id VARCHAR(100) NOT NULL, -- Flamebot account ID
                status VARCHAR(20) NOT NULL DEFAULT 'active',
                current_step INTEGER DEFAULT 0,
                total_steps INTEGER NOT NULL,
                progress_percentage INTEGER DEFAULT 0,
                account_data JSONB NOT NULL, -- Model, channel, etc.
                execution_context JSONB DEFAULT '{}', -- Runtime context
                next_action_at TIMESTAMP WITH TIME ZONE,
                next_task_id VARCHAR(100),
                retry_count INTEGER DEFAULT 0,
                max_retries INTEGER DEFAULT 3,
                started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                completed_at TIMESTAMP WITH TIME ZONE,
                failed_at TIMESTAMP WITH TIME ZONE,
                stopped_at TIMESTAMP WITH TIME ZONE,
                paused_at TIMESTAMP WITH TIME ZONE,
                resumed_at TIMESTAMP WITH TIME ZONE,
                last_error TEXT,
                final_error TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                
                CONSTRAINT valid_status CHECK (status IN ('active', 'completed', 'failed', 'stopped', 'paused')),
                CONSTRAINT unique_active_workflow_per_account UNIQUE (account_id, status) DEFERRABLE INITIALLY DEFERRED
            );
            
            DROP TRIGGER IF EXISTS update_workflow_instances_updated_at ON workflow_instances;
            CREATE TRIGGER update_workflow_instances_updated_at
                BEFORE UPDATE ON workflow_instances
                FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        `;
        
        await this.pool.query(query);
        console.log('   ✅ workflow_instances table created');
    }

    async createWorkflowExecutionLogTable() {
        console.log('📊 Creating workflow_execution_log table...');
        
        const query = `
            CREATE TABLE IF NOT EXISTS workflow_execution_log (
                id SERIAL PRIMARY KEY,
                workflow_instance_id INTEGER REFERENCES workflow_instances(id) ON DELETE CASCADE,
                step_id VARCHAR(100) NOT NULL,
                step_index INTEGER NOT NULL,
                action VARCHAR(50) NOT NULL,
                description TEXT,
                success BOOLEAN NOT NULL,
                result JSONB,
                error_message TEXT,
                duration_ms INTEGER,
                executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
            
            -- Create index separately
            CREATE INDEX IF NOT EXISTS idx_execution_log_workflow_and_time 
            ON workflow_execution_log(workflow_instance_id, executed_at DESC);
        `;
        
        await this.pool.query(query);
        console.log('   ✅ workflow_execution_log table created');
    }

    async createScheduledTasksTable() {
        console.log('📊 Creating scheduled_tasks table...');
        
        const query = `
            CREATE TABLE IF NOT EXISTS scheduled_tasks (
                id SERIAL PRIMARY KEY,
                task_id VARCHAR(100) NOT NULL UNIQUE,
                workflow_instance_id INTEGER REFERENCES workflow_instances(id) ON DELETE CASCADE,
                step_id VARCHAR(100) NOT NULL,
                action VARCHAR(50) NOT NULL,
                scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
                status VARCHAR(20) NOT NULL DEFAULT 'scheduled',
                payload JSONB DEFAULT '{}',
                attempts INTEGER DEFAULT 0,
                max_attempts INTEGER DEFAULT 3,
                last_attempt_at TIMESTAMP WITH TIME ZONE,
                last_error TEXT,
                completed_at TIMESTAMP WITH TIME ZONE,
                cancelled_at TIMESTAMP WITH TIME ZONE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                
                CONSTRAINT valid_task_status CHECK (status IN ('scheduled', 'running', 'completed', 'failed', 'cancelled'))
            );
            
            DROP TRIGGER IF EXISTS update_scheduled_tasks_updated_at ON scheduled_tasks;
            CREATE TRIGGER update_scheduled_tasks_updated_at
                BEFORE UPDATE ON scheduled_tasks
                FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        `;
        
        await this.pool.query(query);
        console.log('   ✅ scheduled_tasks table created');
    }

    async createWorkflowStatsTable() {
        console.log('📊 Creating workflow_stats table...');
        
        const query = `
            CREATE TABLE IF NOT EXISTS workflow_stats (
                id SERIAL PRIMARY KEY,
                date DATE NOT NULL,
                total_workflows INTEGER DEFAULT 0,
                active_workflows INTEGER DEFAULT 0,
                completed_workflows INTEGER DEFAULT 0,
                failed_workflows INTEGER DEFAULT 0,
                stopped_workflows INTEGER DEFAULT 0,
                total_steps_executed INTEGER DEFAULT 0,
                successful_steps INTEGER DEFAULT 0,
                failed_steps INTEGER DEFAULT 0,
                avg_workflow_duration_hours DECIMAL(10,2),
                total_accounts_automated INTEGER DEFAULT 0,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                
                UNIQUE(date)
            );
            
            DROP TRIGGER IF EXISTS update_workflow_stats_updated_at ON workflow_stats;
            CREATE TRIGGER update_workflow_stats_updated_at
                BEFORE UPDATE ON workflow_stats
                FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        `;
        
        await this.pool.query(query);
        console.log('   ✅ workflow_stats table created');
    }

    async createIndexes() {
        console.log('📊 Creating indexes for performance...');
        
        const indexes = [
            // Workflow instances indexes
            'CREATE INDEX IF NOT EXISTS idx_workflow_instances_account_id ON workflow_instances(account_id)',
            'CREATE INDEX IF NOT EXISTS idx_workflow_instances_status ON workflow_instances(status)',
            'CREATE INDEX IF NOT EXISTS idx_workflow_instances_next_action ON workflow_instances(next_action_at) WHERE status = \'active\'',
            'CREATE INDEX IF NOT EXISTS idx_workflow_instances_started_at ON workflow_instances(started_at DESC)',
            
            // Scheduled tasks indexes
            'CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_scheduled_for ON scheduled_tasks(scheduled_for) WHERE status = \'scheduled\'',
            'CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_task_id ON scheduled_tasks(task_id)',
            'CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_status ON scheduled_tasks(status)',
            
            // Execution log indexes
            'CREATE INDEX IF NOT EXISTS idx_execution_log_workflow_instance ON workflow_execution_log(workflow_instance_id)',
            'CREATE INDEX IF NOT EXISTS idx_execution_log_executed_at ON workflow_execution_log(executed_at DESC)',
            
            // Workflow stats indexes
            'CREATE INDEX IF NOT EXISTS idx_workflow_stats_date ON workflow_stats(date DESC)'
        ];
        
        for (const indexQuery of indexes) {
            await this.pool.query(indexQuery);
        }
        
        console.log('   ✅ Performance indexes created');
    }

    async insertDefaultWorkflowDefinitions() {
        console.log('📊 Inserting default workflow definitions...');
        
        const defaultWorkflow = {
            name: 'Default Account Automation',
            type: 'default',
            description: 'Standard workflow for new accounts with 1h wait, prompt, swipes, and bio after 24h',
            steps: [
                {
                    id: 'wait_after_import',
                    action: 'wait',
                    delay: 60 * 60 * 1000, // 1 hour
                    description: 'Wait 1 hour after import'
                },
                {
                    id: 'add_prompt',
                    action: 'add_prompt',
                    delay: 0,
                    description: 'Add AI-generated prompt'
                },
                {
                    id: 'wait_before_first_swipe',
                    action: 'wait',
                    delay: 15 * 60 * 1000, // 15 minutes
                    description: 'Wait 15 minutes before first swipe'
                },
                {
                    id: 'first_swipe_10',
                    action: 'swipe',
                    swipeCount: 10,
                    description: 'First swipe session - 10 swipes'
                },
                {
                    id: 'wait_before_second_swipe',
                    action: 'wait',
                    delay: 60 * 60 * 1000, // 1 hour
                    description: 'Wait 1 hour before second swipe'
                },
                {
                    id: 'second_swipe_20',
                    action: 'swipe',
                    swipeCount: 20,
                    description: 'Second swipe session - 20 swipes'
                },
                {
                    id: 'wait_before_third_swipe',
                    action: 'wait',
                    delay: 60 * 60 * 1000, // 1 hour
                    description: 'Wait 1 hour before third swipe'
                },
                {
                    id: 'third_swipe_20',
                    action: 'swipe',
                    swipeCount: 20,
                    description: 'Third swipe session - 20 swipes'
                },
                {
                    id: 'continuous_swipe_mode',
                    action: 'continuous_swipe',
                    minSwipes: 20,
                    maxSwipes: 30,
                    minInterval: 90 * 60 * 1000, // 90 minutes
                    maxInterval: 180 * 60 * 1000, // 180 minutes
                    description: 'Continuous random swipes 20-30 every 90-180 min'
                },
                {
                    id: 'add_bio_after_24h',
                    action: 'add_bio',
                    delay: 24 * 60 * 60 * 1000, // 24 hours from start
                    description: 'Add AI-generated bio after 24 hours'
                }
            ]
        };

        const aggressiveWorkflow = {
            name: 'Aggressive Account Automation',
            type: 'aggressive',
            description: 'Faster workflow for testing with reduced delays',
            steps: [
                {
                    id: 'wait_after_import',
                    action: 'wait',
                    delay: 5 * 60 * 1000, // 5 minutes
                    description: 'Wait 5 minutes after import'
                },
                {
                    id: 'add_prompt',
                    action: 'add_prompt',
                    delay: 0,
                    description: 'Add AI-generated prompt'
                },
                {
                    id: 'first_swipe_15',
                    action: 'swipe',
                    swipeCount: 15,
                    description: 'First swipe session - 15 swipes'
                },
                {
                    id: 'add_bio_fast',
                    action: 'add_bio',
                    delay: 60 * 60 * 1000, // 1 hour
                    description: 'Add bio after 1 hour'
                },
                {
                    id: 'continuous_swipe_mode',
                    action: 'continuous_swipe',
                    minSwipes: 25,
                    maxSwipes: 35,
                    minInterval: 30 * 60 * 1000, // 30 minutes
                    maxInterval: 60 * 60 * 1000, // 60 minutes
                    description: 'Continuous swipes 25-35 every 30-60 min'
                }
            ]
        };

        const testWorkflow = {
            name: 'Test Workflow',
            type: 'test',
            description: 'Very fast workflow for development testing',
            steps: [
                {
                    id: 'wait_after_import',
                    action: 'wait',
                    delay: 30 * 1000, // 30 seconds
                    description: 'Wait 30 seconds after import'
                },
                {
                    id: 'add_prompt',
                    action: 'add_prompt',
                    delay: 0,
                    description: 'Add AI-generated prompt'
                },
                {
                    id: 'test_swipe_5',
                    action: 'swipe',
                    swipeCount: 5,
                    description: 'Test swipe session - 5 swipes'
                },
                {
                    id: 'add_bio_test',
                    action: 'add_bio',
                    delay: 2 * 60 * 1000, // 2 minutes
                    description: 'Add bio after 2 minutes'
                }
            ]
        };

        const workflows = [defaultWorkflow, aggressiveWorkflow, testWorkflow];
        
        for (const workflow of workflows) {
            await this.pool.query(`
                INSERT INTO workflow_definitions (name, type, description, steps)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (type) DO UPDATE SET
                    name = EXCLUDED.name,
                    description = EXCLUDED.description,
                    steps = EXCLUDED.steps,
                    updated_at = CURRENT_TIMESTAMP
            `, [workflow.name, workflow.type, workflow.description, JSON.stringify(workflow.steps)]);
        }
        
        console.log('   ✅ Default workflow definitions inserted');
    }

    async query(text, params) {
        const start = Date.now();
        try {
            const res = await this.pool.query(text, params);
            const duration = Date.now() - start;
            console.log(`   📊 Query executed: ${duration}ms, ${res.rowCount} rows`);
            return res;
        } catch (error) {
            console.error('   ❌ Query error:', error);
            throw error;
        }
    }
}

// Run migration if called directly
if (require.main === module) {
    const migration = new WorkflowSchemaMigration();
    migration.runMigration()
        .then(() => {
            console.log('🎉 Migration completed successfully!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 Migration failed:', error);
            process.exit(1);
        });
}

module.exports = WorkflowSchemaMigration;
