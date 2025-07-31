// scripts/createTestWorkflow.js
// Script to create test_2 workflow definition for testing goto functionality

const { Client } = require('pg');
require('dotenv').config();

const workflowDefinition = {
  name: "Test Workflow 2 - Goto Loop Test",
  type: "test_2",
  description: "Test workflow for verifying goto functionality with a simple loop",
  steps: [
    {
      id: "wait_after_import",
      action: "wait",
      description: "Wait 30 seconds after import",
      delay: 15000,
      critical: false
    },
    {
      id: "add_prompt",
      action: "add_prompt",
      description: "Add AI-generated prompt",
      delay: 0,
      critical: false
    },
    {
      id: "wait-1753962612199",
      action: "wait",
      description: "Wait step",
      delay: 60000
    },
    {
      id: "goto-1753962626530",
      action: "goto",
      description: "Go to step",
      delay: 0,
      nextStep: "wait-1753962612199"
    },
    {
      id: "swipe_with_spectre-1753963073589",
      action: "swipe_with_spectre",
      description: "Swipe action",
      delay: 0,
      swipeCount: 1
    }
  ]
};

async function createTestWorkflow() {
  const client = new Client({
    host: process.env.DB_HOST || 'yamabiko.proxy.rlwy.net',
    port: process.env.DB_PORT || 18827,
    database: process.env.DB_NAME || 'railway',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'pyZSoGjkpyNLzYnfFgRpoHdBGVsQgkie'
  });
  
  try {
    // Connect to database
    await client.connect();
    console.log('🔗 Connected to PostgreSQL database');

    // Check if workflow already exists
    const existingResult = await client.query(
      'SELECT id FROM workflow_definitions WHERE type = $1',
      [workflowDefinition.type]
    );

    if (existingResult.rows.length > 0) {
      console.log('⚠️ Workflow test_2 already exists, updating...');
      
      // Update existing workflow
      await client.query(
        'UPDATE workflow_definitions SET name = $1, description = $2, steps = $3, updated_at = NOW() WHERE type = $4',
        [
          workflowDefinition.name,
          workflowDefinition.description,
          JSON.stringify(workflowDefinition.steps),
          workflowDefinition.type
        ]
      );
      
      console.log('✅ Workflow test_2 updated successfully');
    } else {
      // Insert new workflow
      await client.query(
        'INSERT INTO workflow_definitions (name, type, description, steps, is_active, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())',
        [
          workflowDefinition.name,
          workflowDefinition.type,
          workflowDefinition.description,
          JSON.stringify(workflowDefinition.steps),
          true
        ]
      );
      
      console.log('✅ Workflow test_2 created successfully');
    }

    // Verify the workflow was created/updated
    const result = await client.query(
      'SELECT * FROM workflow_definitions WHERE type = $1',
      [workflowDefinition.type]
    );

    if (result.rows.length > 0) {
      const workflow = result.rows[0];
      console.log('\n📋 Workflow Details:');
      console.log('ID:', workflow.id);
      console.log('Name:', workflow.name);
      console.log('Type:', workflow.type);
      console.log('Description:', workflow.description);
      console.log('Active:', workflow.is_active);
      console.log('\n📝 Steps:');
      
      const steps = JSON.parse(workflow.steps);
      steps.forEach((step, index) => {
        console.log(`${index + 1}. ${step.id} (${step.action})`);
        if (step.action === 'goto') {
          console.log(`   ↪ Goes to: ${step.nextStep}`);
        }
      });
    }

  } catch (error) {
    console.error('❌ Error creating test workflow:', error);
    process.exit(1);
  } finally {
    await client.end();
    console.log('\n🔒 Database connection closed');
  }
}

// Run the script
console.log('🚀 Creating test_2 workflow definition...\n');
createTestWorkflow();