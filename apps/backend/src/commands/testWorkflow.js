// src/commands/testWorkflow.js
const workflowManager = require('../services/workflowManager');

/**
 * Test workflow command to be executed within the server process
 * Usage: Add this to your server startup or call it via a special endpoint
 */
async function testWorkflowCommand(accountId, workflowType = 'test') {
    try {
        console.log(`\n🧪 TEST WORKFLOW COMMAND`);
        console.log(`   Account ID: ${accountId}`);
        console.log(`   Workflow Type: ${workflowType}`);
        
        // Ensure workflow manager is initialized
        if (!workflowManager.isInitialized) {
            console.log('⚙️ Initializing workflow manager...');
            await workflowManager.initialize();
        }
        
        // Test account data
        const accountData = {
            model: 'Aura',
            channel: 'gram',
            authToken: 'test_token_' + Date.now(),
            importedAt: new Date().toISOString()
        };
        
        // Start workflow
        const result = await workflowManager.startAccountAutomation(
            accountId,
            accountData,
            workflowType
        );
        
        if (result.success) {
            console.log(`\n✅ Workflow started successfully!`);
            console.log(`   Execution ID: ${result.executionId}`);
            console.log(`   Total Steps: ${result.totalSteps}`);
            console.log(`   Estimated Duration: ${result.estimatedDuration}ms`);
            
            // Show initial status
            const status = workflowManager.getAccountWorkflowStatus(accountId);
            if (status) {
                console.log(`\n📊 Current Status:`);
                console.log(`   Progress: ${status.progress}%`);
                console.log(`   Current Step: ${status.currentStep}/${status.totalSteps}`);
                if (status.nextStep) {
                    console.log(`   Next Step: ${status.nextStep.description}`);
                    console.log(`   Next Execution: ${new Date(Date.now() + (status.nextStep.delay || 0)).toLocaleString()}`);
                }
            }
            
            return { success: true, result };
        } else {
            console.error(`\n❌ Failed to start workflow: ${result.error}`);
            return { success: false, error: result.error };
        }
        
    } catch (error) {
        console.error(`\n❌ Test workflow error:`, error);
        return { success: false, error: error.message };
    }
}

// Export the function
module.exports = testWorkflowCommand;

// If running directly (for testing)
if (require.main === module) {
    const accountId = process.argv[2] || `test_${Date.now()}`;
    const workflowType = process.argv[3] || 'test';
    
    console.log('🚀 Running test workflow command...');
    
    testWorkflowCommand(accountId, workflowType)
        .then(result => {
            console.log('\n✅ Test completed:', result);
            process.exit(0);
        })
        .catch(error => {
            console.error('\n❌ Test failed:', error);
            process.exit(1);
        });
}