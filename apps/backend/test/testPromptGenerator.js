const path = require("path");
const fs = require("fs");
require("dotenv").config({
  path: path.join(__dirname, "../.env"),
});

// Import controllers and services directly (same as production)
const aiController = require("../src/controllers/aiController");

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
 * Mock Express response object
 */
function createMockResponse() {
  const res = {
    statusCode: 200,
    headers: {},
    headersSent: false,
    data: null,
    
    status(code) {
      this.statusCode = code;
      return this;
    },
    
    json(data) {
      this.data = data;
      this.headersSent = true;
      return this;
    },
    
    setHeader(name, value) {
      this.headers[name] = value;
      return this;
    }
  };
  
  return res;
}

/**
 * Load and show prompt.json content
 */
function showPromptJsonContent() {
  console.log(`\n${colors.bright}📋 Content from prompt.json:${colors.reset}`);
  try {
    const promptData = require("../src/config/prompt.json");
    Object.keys(promptData).forEach(key => {
      console.log(`\n   ${colors.cyan}${key}:${colors.reset}`);
      console.log(`   "${promptData[key]}"`);
      console.log(`   ${colors.yellow}Length: ${promptData[key].length} characters${colors.reset}`);
    });
    return promptData;
  } catch (error) {
    console.error(`${colors.red}❌ Error loading prompt.json:${colors.reset}`, error.message);
    return null;
  }
}

/**
 * Test prompt generation for special models using production controller
 */
async function testSpecialModelPromptGeneration(model, channel = "gram") {
  console.log(`\n${colors.bright}🎯 Testing Special Model Prompt Generation${colors.reset}`);
  console.log(`   Model: ${colors.cyan}${model}${colors.reset} | Channel: ${colors.yellow}${channel}${colors.reset}`);

  try {
    // Create mock request and response
    const req = {
      body: { model, channel }
    };
    const res = createMockResponse();

    // Call production controller directly
    await aiController.generatePrompt(req, res);

    if (res.data && res.data.success) {
      console.log(`${colors.green}✅ Prompt generation successful!${colors.reset}`);
      
      const result = res.data.data;
      
      console.log(`\n   ${colors.bright}📊 Result Details:${colors.reset}`);
      console.log(`   Model: ${result.model}`);
      console.log(`   Channel: ${result.channel}`);
      console.log(`   Username: ${result.username}`);
      console.log(`   Username Info: ${result.usernameInfo.index}/${result.usernameInfo.total}`);
      
      console.log(`\n   ${colors.bright}📝 Generated Text:${colors.reset}`);
      console.log(`   Visible Text: "${result.visibleText}"`);
      console.log(`   Length: ${result.visibleText.length} characters`);
      
      if (result.obfuscatedText) {
        console.log(`\n   ${colors.bright}🔒 Obfuscated Text:${colors.reset}`);
        console.log(`   "${result.obfuscatedText}"`);
        console.log(`   Length: ${result.obfuscatedText.length} characters`);
        
        // Show copyable version
        console.log(`\n   ${colors.yellow}📋 COPYABLE OBFUSCATED TEXT:${colors.reset}`);
        console.log(`${colors.cyan}${result.obfuscatedText}${colors.reset}`);
        console.log(`   ${colors.yellow}📋 END COPYABLE TEXT${colors.reset}`);
      }
      
      return { success: true, data: result };
    } else {
      console.error(`${colors.red}❌ Prompt generation failed:${colors.reset}`, res.data?.error || 'Unknown error');
      return { success: false, error: res.data?.error };
    }
  } catch (error) {
    console.error(`${colors.red}❌ Prompt generation error:${colors.reset}`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Test normal model to ensure it generates AI content (not prompt.json)
 */
async function testNormalModelPromptGeneration(model, channel = "gram") {
  console.log(`\n${colors.bright}🤖 Testing Normal Model Prompt Generation (Should use AI)${colors.reset}`);
  console.log(`   Model: ${colors.cyan}${model}${colors.reset} | Channel: ${colors.yellow}${channel}${colors.reset}`);

  try {
    const req = { body: { model, channel } };
    const res = createMockResponse();
    await aiController.generatePrompt(req, res);

    if (res.data && res.data.success) {
      const result = res.data.data;
      console.log(`${colors.green}✅ Normal model prompt generation successful!${colors.reset}`);
      console.log(`   Generated AI text: "${result.visibleText}"`);
      console.log(`   Length: ${result.visibleText.length} characters`);
      return { success: true, data: result };
    } else {
      console.error(`${colors.red}❌ Normal model generation failed:${colors.reset}`, res.data?.error);
      return { success: false, error: res.data?.error };
    }
  } catch (error) {
    console.error(`${colors.red}❌ Normal model generation error:${colors.reset}`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Verify that special model output matches prompt.json
 */
function verifySpecialModelOutput(model, generatedText, promptData) {
  const expectedText = promptData[model];
  
  console.log(`\n   ${colors.bright}🔍 Verification for ${model}:${colors.reset}`);
  console.log(`   Expected: "${expectedText}"`);
  console.log(`   Generated: "${generatedText}"`);
  
  if (generatedText === expectedText) {
    console.log(`   ${colors.green}✅ PERFECT MATCH! Using correct prompt.json content${colors.reset}`);
    return true;
  } else {
    console.log(`   ${colors.red}❌ MISMATCH! Not using prompt.json content${colors.reset}`);
    console.log(`   ${colors.yellow}This indicates the special model detection is not working${colors.reset}`);
    return false;
  }
}

/**
 * Test all special models
 */
async function testAllSpecialModels() {
  console.log(`\n${colors.bright}🎯 Testing All Special Models with Prompt.json${colors.reset}`);
  
  const specialModels = ['Andria', 'Elliana', 'Lexi', 'Mia'];
  const channels = ['gram', 'of', 'snap'];
  const promptData = require("../src/config/prompt.json");
  
  const results = {
    successful: 0,
    failed: 0,
    verified: 0,
    tests: []
  };
  
  for (const model of specialModels) {
    for (const channel of channels) {
      console.log(`\n   Testing ${model}/${channel}...`);
      
      const result = await testSpecialModelPromptGeneration(model, channel);
      
      if (result.success) {
        results.successful++;
        
        // Verify the output matches prompt.json
        const isMatch = verifySpecialModelOutput(model, result.data.visibleText, promptData);
        if (isMatch) {
          results.verified++;
        }
        
        results.tests.push({
          model,
          channel,
          success: true,
          verified: isMatch,
          output: result.data.visibleText
        });
      } else {
        results.failed++;
        results.tests.push({
          model,
          channel,
          success: false,
          verified: false,
          error: result.error
        });
      }
      
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  console.log(`\n${colors.bright}📊 Special Models Test Results:${colors.reset}`);
  console.log(`   Successful: ${colors.green}${results.successful}${colors.reset}`);
  console.log(`   Failed: ${colors.red}${results.failed}${colors.reset}`);
  console.log(`   Verified (matching prompt.json): ${colors.cyan}${results.verified}${colors.reset}`);
  console.log(`   Total tests: ${results.tests.length}`);
  
  if (results.failed > 0) {
    console.log(`\n   ${colors.red}Failed tests:${colors.reset}`);
    results.tests
      .filter(t => !t.success)
      .forEach(t => {
        console.log(`   ${colors.red}• ${t.model}/${t.channel}: ${t.error}${colors.reset}`);
      });
  }
  
  if (results.verified < results.successful) {
    console.log(`\n   ${colors.yellow}⚠️ Some successful tests didn't match prompt.json content${colors.reset}`);
    results.tests
      .filter(t => t.success && !t.verified)
      .forEach(t => {
        console.log(`   ${colors.yellow}• ${t.model}/${t.channel}: Generated different content${colors.reset}`);
      });
  }
  
  return results;
}

/**
 * Main test suite
 */
async function runPromptGeneratorTests() {
  console.log(`\n${colors.bright}╔═══════════════════════════════════════╗\n║      Prompt Generator Test Suite      ║\n║     (Special Models & prompt.json)    ║\n╚═══════════════════════════════════════╝${colors.reset}\n`);

  // Check OpenAI API key
  if (!process.env.OPENAI_API_KEY) {
    console.log(`${colors.red}❌ OPENAI_API_KEY not found in environment${colors.reset}`);
    console.log(`   Please set OPENAI_API_KEY in .env file`);
    process.exit(1);
  }
  
  console.log(`${colors.green}✅ Environment OK${colors.reset}`);
  console.log(`   OpenAI API Key: ${process.env.OPENAI_API_KEY.substring(0, 8)}...`);

  try {
    // Show prompt.json content first
    const promptData = showPromptJsonContent();
    if (!promptData) {
      console.log(`${colors.red}❌ Cannot continue without prompt.json${colors.reset}`);
      process.exit(1);
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test individual special models
    console.log(`\n${colors.bright}🔍 Individual Special Model Tests:${colors.reset}`);
    
    await testSpecialModelPromptGeneration("Andria", "gram");
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await testSpecialModelPromptGeneration("Elliana", "of");
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await testSpecialModelPromptGeneration("Lexi", "snap");
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await testSpecialModelPromptGeneration("Mia", "gram");
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test normal model for comparison
    await testNormalModelPromptGeneration("Aura", "gram");
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test all combinations
    const testAll = process.argv.includes('--all');
    if (testAll) {
      await testAllSpecialModels();
    } else {
      console.log(`\n${colors.yellow}💡 Tip: Use '--all' to test all model/channel combinations${colors.reset}`);
    }
    
    console.log(`\n${colors.green}✨ Prompt generator tests completed!${colors.reset}`);
    console.log(`\n${colors.bright}Summary:${colors.reset}`);
    console.log(`   ${colors.cyan}•${colors.reset} Special models should use prompt.json content`);
    console.log(`   ${colors.cyan}•${colors.reset} Normal models should use AI generation`);
    console.log(`   ${colors.cyan}•${colors.reset} Obfuscated text should match visible text for special models`);
    
  } catch (error) {
    console.error(`\n${colors.red}❌ Test suite failed:${colors.reset}`, error.message);
    process.exit(1);
  }
}

// Run tests based on command line argument
const testType = process.argv[2];

switch (testType) {
  case "special":
    const model = process.argv[3] || "Andria";
    const channel = process.argv[4] || "gram";
    testSpecialModelPromptGeneration(model, channel);
    break;
  case "normal":
    const nModel = process.argv[3] || "Aura";
    const nChannel = process.argv[4] || "gram";
    testNormalModelPromptGeneration(nModel, nChannel);
    break;
  case "show-json":
    showPromptJsonContent();
    break;
  case "all-special":
    testAllSpecialModels();
    break;
  default:
    runPromptGeneratorTests();
} 
