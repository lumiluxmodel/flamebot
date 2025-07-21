const path = require("path");
require("dotenv").config({
  path: path.join(__dirname, "../.env"),
});

// Import the service directly to test our fixes with REAL data
const flamebotActionsService = require("../src/services/flamebotActionsService");
const databaseService = require("../src/services/databaseService");

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
 * Find real accounts in database with special models
 */
async function findSpecialModelAccounts() {
  console.log(`\n${colors.bright}🔍 Finding Real Accounts with Special Models${colors.reset}`);
  
  try {
    const specialModels = ['Andria', 'Elliana', 'Lexi', 'Mia'];
    const foundAccounts = {};
    
    // Get all models from database
    const allModels = await databaseService.getAllModels();
    console.log(`   Available models in DB: ${allModels.map(m => m.name).join(', ')}`);
    
    // Check each special model
    for (const modelName of specialModels) {
      console.log(`\n   🔎 Searching for accounts with model: ${modelName}`);
      
      const accounts = await databaseService.getActiveAccounts(modelName);
      
      if (accounts && accounts.length > 0) {
        foundAccounts[modelName] = accounts.map(acc => ({
          accountId: acc.flamebot_id,
          model_name: acc.model_name,
          model_color: acc.model_color,
          status: acc.status,
          created_at: acc.created_at
        }));
        
        console.log(`   ${colors.green}✅ Found ${accounts.length} account(s) with model ${modelName}${colors.reset}`);
        accounts.forEach((acc, i) => {
          console.log(`      ${i + 1}. ID: ${acc.flamebot_id} | Status: ${acc.status}`);
        });
      } else {
        console.log(`   ${colors.yellow}⚠️ No accounts found with model ${modelName}${colors.reset}`);
      }
    }
    
    return foundAccounts;
  } catch (error) {
    console.error(`   ${colors.red}❌ Error finding accounts:${colors.reset}`, error.message);
    return {};
  }
}

/**
 * Test updateBio with real account data
 */
async function testRealAccountBio(accountId, expectedModel) {
  console.log(`\n${colors.bright}📝 Testing Bio for Real Account: ${accountId}${colors.reset}`);
  console.log(`   Expected Model: ${expectedModel}`);
  
  try {
    // Test updateBio with real account data
    const result = await flamebotActionsService.updateBio(accountId);
    
    if (result && result.generatedBio) {
      console.log(`   ${colors.green}✅ Bio update successful!${colors.reset}`);
      console.log(`   Generated Bio: "${result.generatedBio.substring(0, 100)}..."`);
      console.log(`   Bio Length: ${result.generatedBio.length} characters`);
      
      // Check if it's using the predefined content from prompt.json
      const promptData = require('../src/config/prompt.json');
      const expectedBio = promptData[expectedModel];
      
      if (result.generatedBio === expectedBio) {
        console.log(`   ${colors.green}✓ CORRECT: Using predefined bio from prompt.json${colors.reset}`);
        return { success: true, accountId, model: expectedModel, usedPredefined: true };
      } else {
        console.log(`   ${colors.red}❌ WRONG: NOT using predefined bio from prompt.json${colors.reset}`);
        console.log(`   Expected: "${expectedBio?.substring(0, 50)}..."`);
        console.log(`   Got:      "${result.generatedBio.substring(0, 50)}..."`);
        return { success: false, accountId, model: expectedModel, usedPredefined: false, error: 'Wrong bio content' };
      }
    } else {
      console.log(`   ${colors.red}❌ Bio update failed - no bio generated${colors.reset}`);
      return { success: false, accountId, model: expectedModel, error: 'Bio generation failed' };
    }
  } catch (error) {
    console.error(`   ${colors.red}❌ Error testing bio for ${accountId}:${colors.reset}`, error.message);
    return { success: false, accountId, model: expectedModel, error: error.message };
  }
}

/**
 * Test updatePrompt with real account data
 */
async function testRealAccountPrompt(accountId, expectedModel) {
  console.log(`\n${colors.bright}💬 Testing Prompt for Real Account: ${accountId}${colors.reset}`);
  console.log(`   Expected Model: ${expectedModel}`);
  
  try {
    // Test updatePrompt with real account data
    const result = await flamebotActionsService.updatePrompt(accountId, 'fallback_model', 'gram');
    
    if (result && (result.visibleText || result.obfuscatedText)) {
      console.log(`   ${colors.green}✅ Prompt update successful!${colors.reset}`);
      console.log(`   Visible Text: "${result.visibleText}"`);
      console.log(`   Obfuscated Text: "${result.obfuscatedText?.substring(0, 100)}..."`);
      
      // Check if it's using the predefined content from prompt.json
      const promptData = require('../src/config/prompt.json');
      const expectedPrompt = promptData[expectedModel];
      
      if (result.visibleText === expectedPrompt || result.obfuscatedText === expectedPrompt) {
        console.log(`   ${colors.green}✓ CORRECT: Using predefined prompt from prompt.json${colors.reset}`);
        return { success: true, accountId, model: expectedModel, usedPredefined: true };
      } else {
        console.log(`   ${colors.red}❌ WRONG: NOT using predefined prompt from prompt.json${colors.reset}`);
        console.log(`   Expected: "${expectedPrompt?.substring(0, 50)}..."`);
        console.log(`   Got Visible:    "${result.visibleText}"`);
        console.log(`   Got Obfuscated: "${result.obfuscatedText?.substring(0, 50)}..."`);
        return { success: false, accountId, model: expectedModel, usedPredefined: false, error: 'Wrong prompt content' };
      }
    } else {
      console.log(`   ${colors.red}❌ Prompt update failed - no prompt generated${colors.reset}`);
      return { success: false, accountId, model: expectedModel, error: 'Prompt generation failed' };
    }
  } catch (error) {
    console.error(`   ${colors.red}❌ Error testing prompt for ${accountId}:${colors.reset}`, error.message);
    return { success: false, accountId, model: expectedModel, error: error.message };
  }
}

/**
 * Show current prompt.json content
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
 * Test database connection and model structure
 */
async function testDatabaseConnection() {
  console.log(`\n${colors.bright}🔌 Testing Database Connection${colors.reset}`);
  
  try {
    // Test basic connection
    const models = await databaseService.getAllModels();
    console.log(`   ${colors.green}✅ Database connected successfully${colors.reset}`);
    console.log(`   Found ${models.length} models in database:`);
    
    models.forEach(model => {
      console.log(`   • ${model.name} (ID: ${model.id}, Color: ${model.color})`);
    });
    
    // Test getAccountById structure
    console.log(`\n   ${colors.cyan}Testing getAccountById structure...${colors.reset}`);
    const sampleAccount = models.length > 0 ? await databaseService.getActiveAccounts(models[0].name) : [];
    
    if (sampleAccount && sampleAccount.length > 0) {
      const testAccount = sampleAccount[0];
      console.log(`   Sample account structure:`, {
        flamebot_id: testAccount.flamebot_id,
        model_name: testAccount.model_name,
        model_color: testAccount.model_color,
        status: testAccount.status
      });
      
      // Verify getAccountById returns model_name
      const accountData = await databaseService.getAccountById(testAccount.flamebot_id);
      if (accountData && accountData.model_name) {
        console.log(`   ${colors.green}✓ getAccountById returns model_name correctly: "${accountData.model_name}"${colors.reset}`);
      } else {
        console.log(`   ${colors.red}❌ getAccountById does NOT return model_name${colors.reset}`);
        console.log(`   Returned:`, Object.keys(accountData || {}));
      }
    } else {
      console.log(`   ${colors.yellow}⚠️ No accounts found to test structure${colors.reset}`);
    }
    
    return true;
  } catch (error) {
    console.error(`   ${colors.red}❌ Database connection failed:${colors.reset}`, error.message);
    return false;
  }
}

/**
 * Main test suite using real database data
 */
async function runRealSpecialModelsTest() {
  console.log(`
${colors.bright}╔═══════════════════════════════════════╗
║   Real Special Models Test Suite      ║
║      (Using Real Database Data)       ║
╚═══════════════════════════════════════╝${colors.reset}
  `);
  
  // Test 1: Database connection
  const dbConnected = await testDatabaseConnection();
  if (!dbConnected) {
    console.log(`${colors.red}❌ Cannot continue without database connection${colors.reset}`);
    process.exit(1);
  }
  
  // Test 2: Show prompt.json content
  showPromptJsonContent();
  
  // Test 3: Find real accounts with special models
  const specialAccounts = await findSpecialModelAccounts();
  
  if (Object.keys(specialAccounts).length === 0) {
    console.log(`\n${colors.yellow}⚠️ No accounts found with special models in database${colors.reset}`);
    console.log(`   ${colors.cyan}💡 Import accounts with models: Andria, Elliana, Lexi, or Mia to test${colors.reset}`);
    return;
  }
  
  const results = {
    bioTests: [],
    promptTests: []
  };
  
  // Test 4: Test Bio functionality for found accounts
  console.log(`\n${colors.bright}=== REAL BIO TESTS ===${colors.reset}`);
  for (const [modelName, accounts] of Object.entries(specialAccounts)) {
    // Test first account for each model
    const firstAccount = accounts[0];
    const bioResult = await testRealAccountBio(firstAccount.accountId, modelName);
    results.bioTests.push(bioResult);
    
    // Wait between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Test 5: Test Prompt functionality for found accounts
  console.log(`\n${colors.bright}=== REAL PROMPT TESTS ===${colors.reset}`);
  for (const [modelName, accounts] of Object.entries(specialAccounts)) {
    // Test first account for each model
    const firstAccount = accounts[0];
    const promptResult = await testRealAccountPrompt(firstAccount.accountId, modelName);
    results.promptTests.push(promptResult);
    
    // Wait between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Test 6: Generate summary report
  console.log(`\n${colors.bright}📊 REAL DATA TEST RESULTS SUMMARY${colors.reset}`);
  
  const bioSuccessful = results.bioTests.filter(t => t.success && t.usedPredefined).length;
  const bioFailed = results.bioTests.filter(t => !t.success || !t.usedPredefined).length;
  
  console.log(`\n   ${colors.cyan}Bio Tests (Real Data):${colors.reset}`);
  console.log(`   Successful: ${colors.green}${bioSuccessful}${colors.reset}/${results.bioTests.length}`);
  console.log(`   Failed: ${colors.red}${bioFailed}${colors.reset}/${results.bioTests.length}`);
  
  const promptSuccessful = results.promptTests.filter(t => t.success && t.usedPredefined).length;
  const promptFailed = results.promptTests.filter(t => !t.success || !t.usedPredefined).length;
  
  console.log(`\n   ${colors.cyan}Prompt Tests (Real Data):${colors.reset}`);
  console.log(`   Successful: ${colors.green}${promptSuccessful}${colors.reset}/${results.promptTests.length}`);
  console.log(`   Failed: ${colors.red}${promptFailed}${colors.reset}/${results.promptTests.length}`);
  
  // Show failures
  if (bioFailed > 0) {
    console.log(`\n   ${colors.red}Failed bio tests:${colors.reset}`);
    results.bioTests
      .filter(t => !t.success || !t.usedPredefined)
      .forEach(t => {
        console.log(`   ${colors.red}• ${t.accountId} (${t.model}): ${t.error || 'Not using predefined content'}${colors.reset}`);
      });
  }
  
  if (promptFailed > 0) {
    console.log(`\n   ${colors.red}Failed prompt tests:${colors.reset}`);
    results.promptTests
      .filter(t => !t.success || !t.usedPredefined)
      .forEach(t => {
        console.log(`   ${colors.red}• ${t.accountId} (${t.model}): ${t.error || 'Not using predefined content'}${colors.reset}`);
      });
  }
  
  // Overall result
  const allTestsSuccessful = (bioSuccessful === results.bioTests.length) && 
                            (promptSuccessful === results.promptTests.length) && 
                            results.bioTests.length > 0 && 
                            results.promptTests.length > 0;
  
  console.log(`\n${colors.bright}🎯 FINAL RESULT:${colors.reset}`);
  if (allTestsSuccessful) {
    console.log(`   ${colors.green}✅ ALL REAL DATA TESTS PASSED! Special model fix is working with real database data.${colors.reset}`);
  } else if (results.bioTests.length === 0 && results.promptTests.length === 0) {
    console.log(`   ${colors.yellow}⚠️ NO TESTS RUN: No special model accounts found in database${colors.reset}`);
  } else {
    console.log(`   ${colors.red}❌ SOME TESTS FAILED: Check the logs above for details${colors.reset}`);
  }
  
  console.log(`\n${colors.bright}💡 Next Steps:${colors.reset}`);
  console.log(`   ${colors.cyan}•${colors.reset} If no accounts found: Import accounts with special models (Andria, Elliana, Lexi, Mia)`);
  console.log(`   ${colors.cyan}•${colors.reset} If tests pass: The prompt manual feature is working correctly with real data!`);
  console.log(`   ${colors.cyan}•${colors.reset} If tests fail: Check the debug logs for model detection issues`);
}

// Run the test suite
if (require.main === module) {
  runRealSpecialModelsTest().catch(error => {
    console.error(`${colors.red}❌ Real data test suite failed:${colors.reset}`, error);
    process.exit(1);
  });
}

module.exports = {
  findSpecialModelAccounts,
  testRealAccountBio,
  testRealAccountPrompt,
  runRealSpecialModelsTest
}; 
