const path = require("path");
require("dotenv").config({
  path: path.join(__dirname, "../.env"),
});

// Import the service directly to test our fixes
const flamebotActionsService = require("../src/services/flamebotActionsService");

// Test configuration
const SPECIAL_MODELS = ['Andria', 'Elliana', 'Lexi', 'Mia'];
const TEST_ACCOUNT_ID = "test_account_special_models";

// Color codes for console output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
};

/**
 * Test updateBio for special models
 */
async function testSpecialModelBio(modelName) {
  console.log(`\n${colors.bright}📝 Testing Bio for Special Model: ${modelName}${colors.reset}`);
  
  try {
    // Mock account data that would come from database
    const originalGetAccountData = flamebotActionsService.getAccountData;
    flamebotActionsService.getAccountData = async (accountId) => {
      console.log(`   🔍 Mock: getAccountData called with ${accountId}`);
      return {
        model_name: modelName,  // This is what comes from DB
        channel: 'gram'
      };
    };

    // Call updateBio (will use mock account data)
    const result = await flamebotActionsService.updateBio(TEST_ACCOUNT_ID);
    
    // Restore original method
    flamebotActionsService.getAccountData = originalGetAccountData;
    
    if (result && result.generatedBio) {
      console.log(`   ${colors.green}✅ Bio generation successful!${colors.reset}`);
      console.log(`   Generated Bio: "${result.generatedBio.substring(0, 100)}..."`);
      console.log(`   Bio Length: ${result.generatedBio.length} characters`);
      
      // Check if it's using the predefined content from prompt.json
      const promptData = require('../src/config/prompt.json');
      const expectedBio = promptData[modelName];
      
      if (result.generatedBio === expectedBio) {
        console.log(`   ${colors.green}✓ Using correct predefined bio from prompt.json${colors.reset}`);
        return { success: true, model: modelName, usedPredefined: true };
      } else {
        console.log(`   ${colors.red}❌ NOT using predefined bio from prompt.json${colors.reset}`);
        console.log(`   Expected: "${expectedBio?.substring(0, 50)}..."`);
        console.log(`   Got:      "${result.generatedBio.substring(0, 50)}..."`);
        return { success: false, model: modelName, usedPredefined: false, error: 'Wrong bio content' };
      }
    } else {
      console.log(`   ${colors.red}❌ Bio generation failed${colors.reset}`);
      return { success: false, model: modelName, error: 'Generation failed' };
    }
  } catch (error) {
    console.error(`   ${colors.red}❌ Error testing bio for ${modelName}:${colors.reset}`, error.message);
    return { success: false, model: modelName, error: error.message };
  }
}

/**
 * Test updatePrompt for special models
 */
async function testSpecialModelPrompt(modelName) {
  console.log(`\n${colors.bright}💬 Testing Prompt for Special Model: ${modelName}${colors.reset}`);
  
  try {
    // Mock account data that would come from database
    const originalGetAccountData = flamebotActionsService.getAccountData;
    flamebotActionsService.getAccountData = async (accountId) => {
      console.log(`   🔍 Mock: getAccountData called with ${accountId}`);
      return {
        model_name: modelName,  // This is what comes from DB
        channel: 'gram'
      };
    };

    // Call updatePrompt (will use mock account data)
    const result = await flamebotActionsService.updatePrompt(TEST_ACCOUNT_ID, 'fallback_model', 'gram');
    
    // Restore original method
    flamebotActionsService.getAccountData = originalGetAccountData;
    
    if (result && (result.visibleText || result.obfuscatedText)) {
      console.log(`   ${colors.green}✅ Prompt generation successful!${colors.reset}`);
      console.log(`   Visible Text: "${result.visibleText}"`);
      console.log(`   Obfuscated Text: "${result.obfuscatedText?.substring(0, 100)}..."`);
      
      // Check if it's using the predefined content from prompt.json
      const promptData = require('../src/config/prompt.json');
      const expectedPrompt = promptData[modelName];
      
      if (result.visibleText === expectedPrompt || result.obfuscatedText === expectedPrompt) {
        console.log(`   ${colors.green}✓ Using correct predefined prompt from prompt.json${colors.reset}`);
        return { success: true, model: modelName, usedPredefined: true };
      } else {
        console.log(`   ${colors.red}❌ NOT using predefined prompt from prompt.json${colors.reset}`);
        console.log(`   Expected: "${expectedPrompt?.substring(0, 50)}..."`);
        console.log(`   Got Visible:    "${result.visibleText}"`);
        console.log(`   Got Obfuscated: "${result.obfuscatedText?.substring(0, 50)}..."`);
        return { success: false, model: modelName, usedPredefined: false, error: 'Wrong prompt content' };
      }
    } else {
      console.log(`   ${colors.red}❌ Prompt generation failed${colors.reset}`);
      return { success: false, model: modelName, error: 'Generation failed' };
    }
  } catch (error) {
    console.error(`   ${colors.red}❌ Error testing prompt for ${modelName}:${colors.reset}`, error.message);
    return { success: false, model: modelName, error: error.message };
  }
}

/**
 * Test non-special model to ensure normal AI generation still works
 */
async function testNormalModelPrompt() {
  console.log(`\n${colors.bright}🤖 Testing Normal Model (AI Generation)${colors.reset}`);
  
  try {
    // Mock account data for a normal model (not in special list)
    const originalGetAccountData = flamebotActionsService.getAccountData;
    flamebotActionsService.getAccountData = async (accountId) => {
      console.log(`   🔍 Mock: getAccountData called with ${accountId}`);
      return {
        model_name: 'Aura',  // Normal model, not in special list
        channel: 'gram'
      };
    };

    // Call updatePrompt
    const result = await flamebotActionsService.updatePrompt(TEST_ACCOUNT_ID, 'Aura', 'gram');
    
    // Restore original method
    flamebotActionsService.getAccountData = originalGetAccountData;
    
    if (result && result.visibleText) {
      console.log(`   ${colors.green}✅ Normal model prompt generation successful!${colors.reset}`);
      console.log(`   Visible Text: "${result.visibleText}"`);
      console.log(`   Prompt Length: ${result.visibleText.length} characters`);
      
      // Check that it's NOT using predefined content (should be AI generated)
      const promptData = require('../src/config/prompt.json');
      const isFromPromptJson = Object.values(promptData).includes(result.visibleText);
      
      if (!isFromPromptJson) {
        console.log(`   ${colors.green}✓ Using AI generation (not predefined content)${colors.reset}`);
        return { success: true, model: 'Aura', usedAI: true };
      } else {
        console.log(`   ${colors.yellow}⚠️ Unexpectedly using predefined content${colors.reset}`);
        return { success: true, model: 'Aura', usedAI: false, warning: 'Used predefined when should use AI' };
      }
    } else {
      console.log(`   ${colors.red}❌ Normal model prompt generation failed${colors.reset}`);
      return { success: false, model: 'Aura', error: 'Generation failed' };
    }
  } catch (error) {
    console.error(`   ${colors.red}❌ Error testing normal model:${colors.reset}`, error.message);
    return { success: false, model: 'Aura', error: error.message };
  }
}

/**
 * Show the content of prompt.json for reference
 */
function showPromptJsonContent() {
  console.log(`\n${colors.bright}📋 Current prompt.json Content:${colors.reset}`);
  
  try {
    const promptData = require('../src/config/prompt.json');
    
    console.log(`   ${colors.cyan}Available Keys:${colors.reset} ${Object.keys(promptData).join(', ')}`);
    
    Object.entries(promptData).forEach(([key, value]) => {
      console.log(`\n   ${colors.yellow}${key}:${colors.reset}`);
      console.log(`   "${value.substring(0, 100)}..."`);
      console.log(`   Length: ${value.length} characters`);
    });
  } catch (error) {
    console.error(`   ${colors.red}❌ Error reading prompt.json:${colors.reset}`, error.message);
  }
}

/**
 * Main test suite for special models
 */
async function runSpecialModelsTest() {
  console.log(`
${colors.bright}╔═══════════════════════════════════════╗
║       Special Models Test Suite       ║
║     (Testing model_name DB fix)       ║
╚═══════════════════════════════════════╝${colors.reset}
  `);
  
  // Show prompt.json content first
  showPromptJsonContent();
  
  const results = {
    bioTests: [],
    promptTests: [],
    normalModelTest: null
  };
  
  console.log(`\n${colors.bright}🎯 Testing Special Models: ${SPECIAL_MODELS.join(', ')}${colors.reset}`);
  
  // Test Bio functionality for each special model
  console.log(`\n${colors.bright}=== BIO TESTS ===${colors.reset}`);
  for (const model of SPECIAL_MODELS) {
    const bioResult = await testSpecialModelBio(model);
    results.bioTests.push(bioResult);
    
    // Wait between tests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Test Prompt functionality for each special model
  console.log(`\n${colors.bright}=== PROMPT TESTS ===${colors.reset}`);
  for (const model of SPECIAL_MODELS) {
    const promptResult = await testSpecialModelPrompt(model);
    results.promptTests.push(promptResult);
    
    // Wait between tests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Test normal model to ensure AI generation still works
  console.log(`\n${colors.bright}=== NORMAL MODEL TEST ===${colors.reset}`);
  const normalResult = await testNormalModelPrompt();
  results.normalModelTest = normalResult;
  
  // Generate summary report
  console.log(`\n${colors.bright}📊 TEST RESULTS SUMMARY${colors.reset}`);
  
  // Bio test summary
  const bioSuccessful = results.bioTests.filter(t => t.success && t.usedPredefined).length;
  const bioFailed = results.bioTests.filter(t => !t.success || !t.usedPredefined).length;
  
  console.log(`\n   ${colors.cyan}Bio Tests:${colors.reset}`);
  console.log(`   Successful: ${colors.green}${bioSuccessful}${colors.reset}/${SPECIAL_MODELS.length}`);
  console.log(`   Failed: ${colors.red}${bioFailed}${colors.reset}/${SPECIAL_MODELS.length}`);
  
  if (bioFailed > 0) {
    console.log(`   ${colors.red}Failed bio tests:${colors.reset}`);
    results.bioTests
      .filter(t => !t.success || !t.usedPredefined)
      .forEach(t => {
        console.log(`   ${colors.red}• ${t.model}: ${t.error || 'Not using predefined content'}${colors.reset}`);
      });
  }
  
  // Prompt test summary
  const promptSuccessful = results.promptTests.filter(t => t.success && t.usedPredefined).length;
  const promptFailed = results.promptTests.filter(t => !t.success || !t.usedPredefined).length;
  
  console.log(`\n   ${colors.cyan}Prompt Tests:${colors.reset}`);
  console.log(`   Successful: ${colors.green}${promptSuccessful}${colors.reset}/${SPECIAL_MODELS.length}`);
  console.log(`   Failed: ${colors.red}${promptFailed}${colors.reset}/${SPECIAL_MODELS.length}`);
  
  if (promptFailed > 0) {
    console.log(`   ${colors.red}Failed prompt tests:${colors.reset}`);
    results.promptTests
      .filter(t => !t.success || !t.usedPredefined)
      .forEach(t => {
        console.log(`   ${colors.red}• ${t.model}: ${t.error || 'Not using predefined content'}${colors.reset}`);
      });
  }
  
  // Normal model test summary
  console.log(`\n   ${colors.cyan}Normal Model Test (AI Generation):${colors.reset}`);
  if (results.normalModelTest.success) {
    console.log(`   ${colors.green}✅ AI generation working for normal models${colors.reset}`);
    if (results.normalModelTest.warning) {
      console.log(`   ${colors.yellow}⚠️ ${results.normalModelTest.warning}${colors.reset}`);
    }
  } else {
    console.log(`   ${colors.red}❌ AI generation failed for normal models${colors.reset}`);
  }
  
  // Overall result
  const allTestsSuccessful = (bioSuccessful === SPECIAL_MODELS.length) && 
                            (promptSuccessful === SPECIAL_MODELS.length) && 
                            results.normalModelTest.success;
  
  console.log(`\n${colors.bright}🎯 OVERALL RESULT:${colors.reset}`);
  if (allTestsSuccessful) {
    console.log(`   ${colors.green}✅ ALL TESTS PASSED! Special model fix is working correctly.${colors.reset}`);
  } else {
    console.log(`   ${colors.red}❌ SOME TESTS FAILED. The fix may need more work.${colors.reset}`);
  }
  
  console.log(`\n${colors.bright}💡 Next Steps:${colors.reset}`);
  console.log(`   ${colors.cyan}•${colors.reset} If tests pass: The model_name DB fix is working`);
  console.log(`   ${colors.cyan}•${colors.reset} If tests fail: Check the debug logs for model detection issues`);
  console.log(`   ${colors.cyan}•${colors.reset} Use this test with real imported accounts to verify in production`);
}

// Run the test suite
if (require.main === module) {
  runSpecialModelsTest().catch(error => {
    console.error(`${colors.red}❌ Test suite failed:${colors.reset}`, error);
    process.exit(1);
  });
}

module.exports = {
  testSpecialModelBio,
  testSpecialModelPrompt,
  testNormalModelPrompt,
  runSpecialModelsTest
}; 
