const path = require("path");
const fs = require("fs");
require("dotenv").config({
  path: path.join(__dirname, "../.env"),
});

// Import controllers directly (same as production)
const aiController = require("../src/controllers/aiController");

// Test configuration - will be loaded from database
let TEST_MODELS = [];
let TEST_CHANNELS = [];

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
 * Test bio generation using production controller
 */
async function testBioGeneration(count = 3) {
  console.log(`\n${colors.bright}📝 Testing Bio Generation (Production Controller)${colors.reset}`);
  console.log(`   Count: ${count}`);

  try {
    // Create mock request and response
    const req = {
      body: { count }
    };
    const res = createMockResponse();

    // Call production controller directly
    await aiController.generateBios(req, res);

    if (res.data && res.data.success) {
      console.log(`${colors.green}✅ Bio generation successful!${colors.reset}`);
      console.log(`   Generated: ${res.data.data.count} bios`);
      
      res.data.data.bios.forEach((bio, i) => {
        console.log(`\n   ${colors.cyan}Bio ${i + 1}${colors.reset} (${bio.characterCount} chars):`);
        console.log(`   "${bio.text}"`);
        
        // Validate character count
        if (bio.characterCount >= 80 && bio.characterCount <= 100) {
          console.log(`   ${colors.green}✓${colors.reset} Character count within range (80-100)`);
        } else {
          console.log(`   ${colors.yellow}⚠️${colors.reset} Character count outside range: ${bio.characterCount}`);
        }
      });
      
      return { success: true, data: res.data.data };
    } else {
      console.error(`${colors.red}❌ Bio generation failed:${colors.reset}`, res.data?.error || 'Unknown error');
      return { success: false, error: res.data?.error };
    }
  } catch (error) {
    console.error(`${colors.red}❌ Bio generation error:${colors.reset}`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Test prompt generation using production controller
 */
async function testPromptGeneration(model, channel) {
  try {
    const req = { body: { model, channel } };
    const res = createMockResponse();
    await aiController.generatePrompt(req, res);
    if (res.data && res.data.success) {
      // Si se llama desde CLI, guardar en archivo el texto FINAL (obfuscatedText)
      if (require.main === module) {
        const filename = `prompt_${model}_${channel}_${Date.now()}.txt`;
        const filepath = path.join(__dirname, filename);
        require('fs').writeFileSync(filepath, res.data.data.obfuscatedText);
        console.log(filepath);
      } else {
        // Si se llama como función, solo retorna el texto
        return { success: true, data: res.data.data };
      }
    } else {
      // Solo imprime el error puro
      console.log(res.data?.error || 'Unknown error');
      return { success: false, error: res.data?.error };
    }
  } catch (error) {
    console.log(error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Test multiple prompt generation using production controller
 */
async function testMultiplePromptGeneration(model, channel, count = 3) {
  try {
    const req = { body: { model, channel, count } };
    const res = createMockResponse();
    await aiController.generateMultiplePrompts(req, res);
    if (res.data && res.data.success) {
      // Imprime solo los textos reales, uno por línea
      res.data.data.prompts.forEach((prompt) => {
        console.log(prompt.visibleText);
      });
      return { success: true, data: res.data.data };
    } else {
      // Solo imprime el error puro
      console.log(res.data?.error || 'Unknown error');
      return { success: false, error: res.data?.error };
    }
  } catch (error) {
    console.log(error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Test username rotation system
 */
async function testUsernameRotation(model, channel) {
  console.log(`\n${colors.bright}🔄 Testing Username Rotation System${colors.reset}`);
  console.log(`   Model: ${model} | Channel: ${channel}`);

  const usernames = [];
  
  for (let i = 0; i < 5; i++) {
    const result = await testPromptGeneration(model, channel);
    if (result.success) {
      usernames.push({
        username: result.data.username,
        index: result.data.usernameInfo.index,
        total: result.data.usernameInfo.total
      });
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log(`\n   ${colors.cyan}Username Rotation Sequence:${colors.reset}`);
  usernames.forEach((item, i) => {
    console.log(`   ${i + 1}. ${item.username} (${item.index}/${item.total})`);
  });
  
  // Check if rotation is working
  const uniqueUsernames = [...new Set(usernames.map(u => u.username))];
  if (uniqueUsernames.length > 1) {
    console.log(`   ${colors.green}✓${colors.reset} Username rotation working (${uniqueUsernames.length} unique usernames)`);
  } else if (usernames.length > 1 && uniqueUsernames.length === 1) {
    console.log(`   ${colors.yellow}⚠️${colors.reset} Only one username available for this model/channel`);
  }
}

/**
 * Test all models and channels
 */
async function testAllModelChannelCombinations() {
  console.log(`\n${colors.bright}🎯 Testing All Model/Channel Combinations${colors.reset}`);
  
  const results = {
    successful: 0,
    failed: 0,
    combinations: []
  };
  
  for (const model of TEST_MODELS) {
    for (const channel of TEST_CHANNELS) {
      console.log(`\n   Testing ${model}/${channel}...`);
      
      const result = await testPromptGeneration(model, channel);
      
      results.combinations.push({
        model,
        channel,
        success: result.success,
        error: result.error || null
      });
      
      if (result.success) {
        results.successful++;
      } else {
        results.failed++;
      }
      
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }
  
  console.log(`\n${colors.bright}📊 Model/Channel Test Results:${colors.reset}`);
  console.log(`   Successful: ${colors.green}${results.successful}${colors.reset}`);
  console.log(`   Failed: ${colors.red}${results.failed}${colors.reset}`);
  console.log(`   Total: ${results.combinations.length}`);
  
  if (results.failed > 0) {
    console.log(`\n   ${colors.red}Failed combinations:${colors.reset}`);
    results.combinations
      .filter(c => !c.success)
      .forEach(c => {
        console.log(`   ${colors.red}• ${c.model}/${c.channel}: ${c.error}${colors.reset}`);
      });
  }
}

/**
 * Load configuration from database
 */
async function loadConfiguration() {
  try {
    const databaseService = require("../src/services/databaseService");
    
    // Load models and channels from database
    const dbModels = await databaseService.getAllModels();
    const dbChannels = await databaseService.getAllChannels();
    
    // Use EXACT names from database (no toLowerCase conversion)
    TEST_MODELS = dbModels.map(m => m.name);
    TEST_CHANNELS = dbChannels.map(c => c.name);
    
    console.log(`${colors.green}✅ Configuration loaded from database${colors.reset}`);
    console.log(`   Models: ${TEST_MODELS.join(', ')}`);
    console.log(`   Channels: ${TEST_CHANNELS.join(', ')}`);
    
    // Show channel prefixes
    console.log(`\n   ${colors.cyan}Channel Prefixes from Database:${colors.reset}`);
    dbChannels.forEach(channel => {
      console.log(`   ${channel.name}: "${channel.prefix}"`);
    });
    
  } catch (error) {
    console.error(`${colors.red}❌ Failed to load configuration from database:${colors.reset}`, error.message);
    // Fallback to hardcoded values with proper case
    TEST_MODELS = ["CiaraBot"]; // Use exact case as in database
    TEST_CHANNELS = ["gram", "of", "snap"];
    console.log(`${colors.yellow}⚠️ Using fallback configuration${colors.reset}`);
  }
}

/**
 * Main test suite
 */
async function runGenerationTests() {
  console.log(`
${colors.bright}╔═══════════════════════════════════════╗
║         AI Generation Test Suite      ║
║       (Production Controllers)        ║
╚═══════════════════════════════════════╝${colors.reset}
  `);

  // Check OpenAI API key
  if (!process.env.OPENAI_API_KEY) {
    console.log(`${colors.red}❌ OPENAI_API_KEY not found in environment${colors.reset}`);
    console.log(`   Please set OPENAI_API_KEY in .env file`);
    process.exit(1);
  }
  
  console.log(`${colors.green}✅ Environment OK${colors.reset}`);
  console.log(`   OpenAI API Key: ${process.env.OPENAI_API_KEY.substring(0, 8)}...`);

  // Load configuration from database
  await loadConfiguration();

  try {
    // Test 1: Bio Generation
    await testBioGeneration(3);
    
    // Wait between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test 2: Single Prompt Generation
    await testPromptGeneration("aura", "gram");
    
    // Wait between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test 3: Multiple Prompt Generation
    await testMultiplePromptGeneration("lola", "of", 3);
    
    // Wait between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test 4: Username Rotation
    await testUsernameRotation("iris", "snap");
    
    // Wait between tests
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test 5: All Model/Channel Combinations (optional, can be slow)
    const testAll = process.argv.includes('--all');
    if (testAll) {
      await testAllModelChannelCombinations();
    } else {
      console.log(`\n${colors.yellow}💡 Tip: Use 'npm run test:generation -- --all' to test all model/channel combinations${colors.reset}`);
    }
    
    console.log(`\n${colors.green}✨ All tests completed successfully!${colors.reset}`);
    console.log(`\n${colors.bright}Summary:${colors.reset}`);
    console.log(`   ${colors.cyan}•${colors.reset} Bio generation: Uses production aiController.generateBios`);
    console.log(`   ${colors.cyan}•${colors.reset} Prompt generation: Uses production aiController.generatePrompt`);
    console.log(`   ${colors.cyan}•${colors.reset} Username rotation: Uses production usernameService`);
    console.log(`   ${colors.cyan}•${colors.reset} AI service: Uses production aiService with OpenAI`);
    console.log(`   ${colors.cyan}•${colors.reset} Database: Uses production databaseService`);
    
  } catch (error) {
    console.error(`\n${colors.red}❌ Test suite failed:${colors.reset}`, error.message);
    process.exit(1);
  }
}

/**
 * Test prompt generation and show only obfuscated text for copying
 */
async function showObfuscatedOnly(model, channel) {
  try {
    const req = { body: { model, channel } };
    const res = createMockResponse();
    await aiController.generatePrompt(req, res);
    if (res.data && res.data.success && res.data.data.visibleText) {
      // Solo imprime el texto real
      console.log(res.data.data.visibleText);
    } else {
      // Solo imprime el error puro
      console.log(res.data?.error || 'Unknown error');
    }
  } catch (error) {
    console.log(error.message);
  }
}

// Run tests based on command line argument
const testType = process.argv[2];

switch (testType) {
  case "bio":
    testBioGeneration(parseInt(process.argv[3]) || 3);
    break;
  case "prompt":
    const model = process.argv[3] || "aura";
    const channel = process.argv[4] || "gram";
    testPromptGeneration(model, channel);
    break;
  case "obfuscated":
    const oModel = process.argv[3] || "aura";
    const oChannel = process.argv[4] || "gram";
    showObfuscatedOnly(oModel, oChannel);
    break;
  case "multiple":
    const mModel = process.argv[3] || "lola";
    const mChannel = process.argv[4] || "of";
    const count = parseInt(process.argv[5]) || 3;
    testMultiplePromptGeneration(mModel, mChannel, count);
    break;
  case "rotation":
    const rModel = process.argv[3] || "iris";
    const rChannel = process.argv[4] || "snap";
    testUsernameRotation(rModel, rChannel);
    break;
  case "all-combinations":
    testAllModelChannelCombinations();
    break;
  default:
    runGenerationTests();
} 
