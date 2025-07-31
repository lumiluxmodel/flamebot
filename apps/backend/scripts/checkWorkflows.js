const { Client } = require('pg');

async function checkWorkflows() {
  const client = new Client({
    host: 'yamabiko.proxy.rlwy.net',
    port: 18827,
    database: 'railway',
    user: 'postgres',
    password: 'pyZSoGjkpyNLzYnfFgRpoHdBGVsQgkie'
  });
  
  try {
    await client.connect();
    console.log('Connected to database\n');
    
    const result = await client.query(
      'SELECT id, type, name, is_active FROM workflow_definitions ORDER BY id'
    );
    
    console.log('Workflows in database:');
    console.log('====================');
    result.rows.forEach(row => {
      console.log(`ID: ${row.id} | Type: ${row.type} | Name: ${row.name} | Active: ${row.is_active}`);
    });
    
    console.log(`\nTotal workflows: ${result.rows.length}`);
    
    // Check specifically for test_2
    const test2 = result.rows.find(row => row.type === 'test_2');
    if (test2) {
      console.log('\n✅ test_2 workflow found!');
    } else {
      console.log('\n❌ test_2 workflow NOT found!');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

checkWorkflows();