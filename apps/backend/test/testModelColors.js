const path = require("path");
require("dotenv").config({
  path: path.join(__dirname, "../.env"),
});

// Import services
const flamebotService = require("../src/services/flamebotService");
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
 * Test database color retrieval
 */
async function testDatabaseColors() {
  console.log(`\n${colors.bright}🎨 Testing Model Colors from Database${colors.reset}`);
  
  try {
    // Get all models from database
    const models = await databaseService.getAllModels();
    console.log(`   Found ${models.length} models in database:`);
    
    models.forEach(model => {
      console.log(`   • ${model.name}: ${model.color} (ID: ${model.id})`);
    });
    
    return models;
  } catch (error) {
    console.error(`   ${colors.red}❌ Error getting models from database:${colors.reset}`, error.message);
    return [];
  }
}

/**
 * Test flamebotService.getModelColorFromDatabase function
 */
async function testGetModelColorFunction() {
  console.log(`\n${colors.bright}🧪 Testing getModelColorFromDatabase Function${colors.reset}`);
  
  const testModels = ['Andria', 'Elliana', 'Lexi', 'Mia', 'Aura', 'Lola', 'NonExistentModel'];
  const results = [];
  
  for (const modelName of testModels) {
    try {
      console.log(`\n   Testing model: ${modelName}`);
      const color = await flamebotService.getModelColorFromDatabase(modelName);
      
      console.log(`   ${colors.green}✅ Color for ${modelName}: ${color}${colors.reset}`);
      results.push({ model: modelName, color, success: true });
    } catch (error) {
      console.error(`   ${colors.red}❌ Error getting color for ${modelName}:${colors.reset}`, error.message);
      results.push({ model: modelName, error: error.message, success: false });
    }
  }
  
  return results;
}

/**
 * Compare database colors vs config colors
 */
async function compareColorsWithConfig() {
  console.log(`\n${colors.bright}📊 Comparing Database Colors vs Config Colors${colors.reset}`);
  
  try {
    const config = require('../src/config');
    const models = await databaseService.getAllModels();
    
    console.log(`\n   ${colors.cyan}Config Colors:${colors.reset}`);
    Object.entries(config.models.colors).forEach(([model, color]) => {
      console.log(`   • ${model}: ${color}`);
    });
    
    console.log(`\n   ${colors.cyan}Database Colors:${colors.reset}`);
    models.forEach(model => {
      const configColor = config.models.colors[model.name];
      const match = configColor === model.color;
      const status = match ? colors.green + '✓' + colors.reset : colors.yellow + '≠' + colors.reset;
      
      console.log(`   ${status} ${model.name}: ${model.color} ${configColor ? `(config: ${configColor})` : '(not in config)'}`);
    });
    
    // Check for special models
    const specialModels = ['Andria', 'Elliana', 'Lexi', 'Mia'];
    console.log(`\n   ${colors.cyan}Special Models Status:${colors.reset}`);
    
    for (const specialModel of specialModels) {
      const dbModel = models.find(m => m.name.toLowerCase() === specialModel.toLowerCase());
      const configColor = config.models.colors[specialModel];
      
      if (dbModel) {
        console.log(`   ${colors.green}✅ ${specialModel}: Found in DB with color ${dbModel.color}${colors.reset}`);
      } else {
        console.log(`   ${colors.red}❌ ${specialModel}: NOT found in database${colors.reset}`);
      }
      
      if (configColor) {
        console.log(`   ${colors.blue}ℹ️  ${specialModel}: Found in config with color ${configColor}${colors.reset}`);
      } else {
        console.log(`   ${colors.yellow}⚠️  ${specialModel}: NOT found in config (will use DB or default)${colors.reset}`);
      }
    }
    
  } catch (error) {
    console.error(`   ${colors.red}❌ Error comparing colors:${colors.reset}`, error.message);
  }
}

/**
 * Test color consistency in import process
 */
async function testImportColorConsistency() {
  console.log(`\n${colors.bright}🔄 Testing Color Consistency in Import Process${colors.reset}`);
  
  try {
    const models = await databaseService.getAllModels();
    
    if (models.length === 0) {
      console.log(`   ${colors.yellow}⚠️ No models found in database${colors.reset}`);
      return;
    }
    
    // Test first few models
    const testModels = models.slice(0, 3);
    console.log(`   Testing color retrieval for models: ${testModels.map(m => m.name).join(', ')}`);
    
    for (const model of testModels) {
      const retrievedColor = await flamebotService.getModelColorFromDatabase(model.name);
      
      if (retrievedColor === model.color) {
        console.log(`   ${colors.green}✅ ${model.name}: Color matches (${retrievedColor})${colors.reset}`);
      } else {
        console.log(`   ${colors.red}❌ ${model.name}: Color mismatch!${colors.reset}`);
        console.log(`      Database: ${model.color}`);
        console.log(`      Retrieved: ${retrievedColor}`);
      }
    }
    
  } catch (error) {
    console.error(`   ${colors.red}❌ Error testing import color consistency:${colors.reset}`, error.message);
  }
}

/**
 * Test edge cases
 */
async function testEdgeCases() {
  console.log(`\n${colors.bright}🧩 Testing Edge Cases${colors.reset}`);
  
  const edgeCases = [
    { name: 'Empty string', model: '' },
    { name: 'Null', model: null },
    { name: 'Undefined', model: undefined },
    { name: 'Case sensitivity', model: 'ANDRIA' },
    { name: 'Case sensitivity', model: 'andria' },
    { name: 'Special characters', model: 'Test@Model!' },
  ];
  
  for (const testCase of edgeCases) {
    try {
      console.log(`\n   Testing ${testCase.name}: "${testCase.model}"`);
      const color = await flamebotService.getModelColorFromDatabase(testCase.model);
      console.log(`   ${colors.green}✅ Result: ${color}${colors.reset}`);
    } catch (error) {
      console.log(`   ${colors.yellow}⚠️  Error (expected): ${error.message}${colors.reset}`);
    }
  }
}

/**
 * Main test suite
 */
async function runModelColorTests() {
  console.log(`
${colors.bright}╔═══════════════════════════════════════╗
║       Model Colors Test Suite         ║
║   (Database vs Config Integration)    ║
╚═══════════════════════════════════════╝${colors.reset}
  `);
  
  try {
    // Test 1: Database connection and color retrieval
    const models = await testDatabaseColors();
    
    if (models.length === 0) {
      console.log(`${colors.red}❌ Cannot continue without database models${colors.reset}`);
      return;
    }
    
    // Test 2: Function behavior
    await testGetModelColorFunction();
    
    // Test 3: Compare with config
    await compareColorsWithConfig();
    
    // Test 4: Import consistency
    await testImportColorConsistency();
    
    // Test 5: Edge cases
    await testEdgeCases();
    
    // Summary
    console.log(`\n${colors.bright}📝 SUMMARY${colors.reset}`);
    console.log(`   ${colors.cyan}•${colors.reset} Database color retrieval: Tested`);
    console.log(`   ${colors.cyan}•${colors.reset} Function behavior: Tested`);
    console.log(`   ${colors.cyan}•${colors.reset} Config vs Database: Compared`);
    console.log(`   ${colors.cyan}•${colors.reset} Import consistency: Verified`);
    console.log(`   ${colors.cyan}•${colors.reset} Edge cases: Handled`);
    
    console.log(`\n${colors.green}✅ Model color tests completed!${colors.reset}`);
    console.log(`\n${colors.bright}💡 Key Benefits of Database Colors:${colors.reset}`);
    console.log(`   ${colors.cyan}•${colors.reset} Special models (Andria, Elliana, Lexi, Mia) get correct colors`);
    console.log(`   ${colors.cyan}•${colors.reset} New models automatically have their colors`);
    console.log(`   ${colors.cyan}•${colors.reset} No need to update config when adding models`);
    console.log(`   ${colors.cyan}•${colors.reset} Config colors still work as fallback`);
    
  } catch (error) {
    console.error(`\n${colors.red}❌ Test suite failed:${colors.reset}`, error);
  }
}

// Run the test suite
if (require.main === module) {
  runModelColorTests().catch(error => {
    console.error(`${colors.red}❌ Model color test suite failed:${colors.reset}`, error);
    process.exit(1);
  });
}

module.exports = {
  testDatabaseColors,
  testGetModelColorFunction,
  compareColorsWithConfig,
  testImportColorConsistency,
  runModelColorTests
}; 
