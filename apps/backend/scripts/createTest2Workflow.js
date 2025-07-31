// scripts/createTest2Workflow.js
// Simple script to create test_2 workflow

const { Client } = require('pg');
require('dotenv').config();

async function createWorkflow() {
  const client = new Client({
    host: 'yamabiko.proxy.rlwy.net',
    port: 18827,
    database: 'railway',
    user: 'postgres',
    password: 'pyZSoGjkpyNLzYnfFgRpoHdBGVsQgkie'
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // First check what workflows exist
    const checkResult = await client.query(
      "SELECT type, name FROM workflow_definitions ORDER BY id"
    );
    console.log('\nExisting workflows:', checkResult.rows);

    // Define the steps
    const steps = [
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
    ];

    // Delete if exists
    await client.query(
      "DELETE FROM workflow_definitions WHERE type = 'test_2'"
    );

    // Insert new workflow
    const insertResult = await client.query(
      `INSERT INTO workflow_definitions 
       (name, type, description, steps, is_active) 
       VALUES ($1, $2, $3, $4::jsonb, $5) 
       RETURNING id`,
      [
        'Test Workflow 2 - Goto Loop Test',
        'test_2',
        'Test workflow for verifying goto functionality with a simple loop',
        JSON.stringify(steps),
        true
      ]
    );

    console.log('\n✅ Workflow created with ID:', insertResult.rows[0].id);

    // Verify it was created
    const verifyResult = await client.query(
      "SELECT id, type, name, jsonb_array_length(steps) as step_count FROM workflow_definitions WHERE type = 'test_2'"
    );
    
    console.log('\nCreated workflow:', verifyResult.rows[0]);

    // Show the steps
    const stepsResult = await client.query(
      "SELECT jsonb_pretty(steps) as steps FROM workflow_definitions WHERE type = 'test_2'"
    );
    console.log('\nWorkflow steps:\n', stepsResult.rows[0].steps);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
    console.log('\nConnection closed');
  }
}

createWorkflow();