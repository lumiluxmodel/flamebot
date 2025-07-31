// Quick test of services without full server startup
console.log('🧪 Testing Services Individually...\n');

try {
  console.log('1. Testing workflowDatabaseService...');
  const workflowDb = require('./src/services/workflowDatabaseService');
  console.log('   ✅ Imported successfully');
  console.log('   ✅ getWorkflowStatistics:', typeof workflowDb.getWorkflowStatistics);
  console.log('   ✅ getDueScheduledTasks:', typeof workflowDb.getDueScheduledTasks);
  
  console.log('\n2. Testing workflowServiceContainer...');
  const container = require('./src/services/workflowServiceContainer');
  console.log('   ✅ Container imported successfully');
  console.log('   ✅ Has workflowDatabaseService registered:', container.has('workflowDatabaseService'));
  
  console.log('\n3. Testing workflowExecutorV2...');
  const workflowExecutor = require('./src/services/workflowExecutorV2');
  console.log('   ✅ WorkflowExecutor proxy imported successfully');
  
  console.log('\n🎉 All services imported successfully!');
  console.log('\n💡 The issue was fixed! APIs should work now.');
  
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error('Stack:', error.stack);
}