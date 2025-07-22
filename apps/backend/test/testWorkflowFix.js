const path = require("path");
require("dotenv").config({
  path: path.join(__dirname, "../.env"),
});

const workflowExecutor = require("../src/services/workflowExecutor");

/**
 * Test workflow fix for special models
 */
async function testWorkflowFix() {
  console.log('\n🔧 TESTING WORKFLOW FIX FOR SPECIAL MODELS\n');
  
  // Mock execution object (simulates real workflow state)
  const mockExecution = {
    accountId: "test_andria_123",
    accountData: {
      model: "Andria",  // Special model
      channel: "gram",
      authToken: "fake_token",
      importedAt: new Date().toISOString()
    }
  };
  
  // Mock step config for add_prompt
  const mockStepConfig = {
    id: "add_prompt",
    action: "add_prompt",
    description: "Add AI-generated prompt",
    critical: true
  };
  
  console.log(`🎯 Testing add_prompt step for special model: ${mockExecution.accountData.model}`);
  console.log(`   Account ID: ${mockExecution.accountId}`);
  console.log(`   Channel: ${mockExecution.accountData.channel}`);
  
  try {
    // Call the workflow executor's executeStepAction directly
    const result = await workflowExecutor.executeStepAction(mockExecution, mockStepConfig);
    
    console.log('\n✅ WORKFLOW FIX SUCCESSFUL!');
    console.log('📊 Result:');
    console.log(`   Action: ${result.action}`);
    console.log(`   Success: ${result.success}`);
    console.log(`   Visible Text: "${result.visibleText?.substring(0, 50)}..."`);
    console.log(`   Obfuscated Text: "${result.obfuscatedText?.substring(0, 50)}..."`);
    
    // Verify it's using special model content
    if (result.visibleText && result.visibleText.includes("An") && result.visibleText.includes("dri")) {
      console.log('\n🎉 SUCCESS: Special model Andria detected and used correctly!');
    } else {
      console.log('\n⚠️ WARNING: May not be using special model content');
    }
    
  } catch (error) {
    console.error('\n❌ WORKFLOW FIX FAILED:');
    console.error(`   Error: ${error.message}`);
    console.error(`   Stack: ${error.stack}`);
    
    // Check if it's the specific error we're trying to fix
    if (error.message.includes('No usernames available') || error.message.includes('getAccountData')) {
      console.log('\n🚨 This is the EXACT ERROR we were trying to fix!');
      console.log('   The fix needs more work...');
    }
  }
}

/**
 * Test multiple special models
 */
async function testAllSpecialModels() {
  console.log('\n🎯 TESTING ALL SPECIAL MODELS\n');
  
  const specialModels = ['Andria', 'Elliana', 'Lexi', 'Mia'];
  
  for (const model of specialModels) {
    console.log(`\n--- Testing ${model} ---`);
    
    const mockExecution = {
      accountId: `test_${model.toLowerCase()}_123`,
      accountData: {
        model: model,
        channel: "gram",
        authToken: "fake_token",
        importedAt: new Date().toISOString()
      }
    };
    
    const mockStepConfig = {
      id: "add_prompt",
      action: "add_prompt", 
      description: "Add AI-generated prompt",
      critical: true
    };
    
    try {
      const result = await workflowExecutor.executeStepAction(mockExecution, mockStepConfig);
      console.log(`✅ ${model}: Success - "${result.visibleText?.substring(0, 30)}..."`);
      
    } catch (error) {
      console.log(`❌ ${model}: Failed - ${error.message}`);
    }
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 300));
  }
}

// Run based on command line argument
const testType = process.argv[2];

switch (testType) {
  case "all":
    testAllSpecialModels();
    break;
  default:
    testWorkflowFix();
} 
