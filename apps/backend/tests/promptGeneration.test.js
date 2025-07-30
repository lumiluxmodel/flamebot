const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Silence all console.log from services during testing
const originalLog = console.log;
console.log = () => {};

const aiController = require('../src/controllers/aiController');
const databaseService = require('../src/services/databaseService');

// Restore console.log for test output only
console.log = originalLog;

/**
 * Simple prompt generation test with REAL DATABASE DATA ONLY
 * NO HARDCODED VALUES - uses whatever exists in your database
 */

function createMockResponse() {
  const res = {
    statusCode: 200,
    data: null,
    
    status(code) {
      this.statusCode = code;
      return this;
    },
    
    json(data) {
      this.data = data;
      return this;
    }
  };
  
  return res;
}

describe('Prompt Generation', () => {
  
  it('should generate prompt with different channels', async () => {
    // Get REAL data from database (silently)
    const models = await databaseService.getAllModels();
    const channels = await databaseService.getAllChannels();
    
    // Test multiple channels
    const testCases = [
      { model: models[0].name, channel: channels[1].name }, // Second channel (of)
      { model: models[1].name, channel: channels[2].name }, // Third channel (snap)
    ];
    
    for (const testCase of testCases) {
      console.log(`\n🎯 TESTING: ${testCase.model} / ${testCase.channel}`);
      
      const req = { body: testCase };
      const res = createMockResponse();
      
      await aiController.generatePrompt(req, res);
      
      // Show only relevant info
      console.log(`✅ STATUS: ${res.statusCode}`);
      if (res.statusCode === 200) {
        const data = res.data.data;
        console.log(`📱 CHANNEL: ${data.channel}`);
        console.log(`👤 USERNAME: ${data.username}`);
        console.log(`💬 TEXT: "${data.visibleText}"`);
        console.log(`🔒 OBFUSCATED: "${data.obfuscatedText}"`);
      } else {
        console.log(`❌ ERROR: ${res.data.error}`);
      }
      
      expect(res.statusCode).toBe(200);
    }
    
  }, 120000);
  
});