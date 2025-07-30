const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Silence all console.log from services during testing
const originalLog = console.log;
console.log = () => {};

const usernameService = require('../src/services/usernameService');
const databaseService = require('../src/services/databaseService');

// Restore console.log for test output only
console.log = originalLog;

/**
 * Username rotation test with REAL DATABASE DATA
 * Tests that usernames rotate correctly and cycle back to start
 */

describe('Username Rotation', () => {

  it('should rotate usernames correctly and cycle back to start', async () => {
    // Get REAL data from database
    const models = await databaseService.getAllModels();
    const channels = await databaseService.getAllChannels();
    
    // Find a model/channel combination that has usernames
    let testModel, testChannel, totalUsernames;
    
    for (const model of models) {
      for (const channel of channels) {
        try {
          const usernames = await usernameService.getAllUsernames(model.name, channel.name);
          if (usernames.length >= 3) { // Need at least 3 for meaningful rotation test
            testModel = model.name;
            testChannel = channel.name;
            totalUsernames = usernames.length;
            break;
          }
        } catch (error) {
          // Continue searching
        }
      }
      if (testModel) break;
    }
    
    if (!testModel) {
      throw new Error('No model/channel combination found with enough usernames for testing');
    }
    
    console.log(`🔄 TESTING ROTATION: ${testModel} / ${testChannel} (${totalUsernames} usernames)`);
    
    // Reset pointer to start from beginning
    await databaseService.query(
      'UPDATE username_pointers SET current_index = 0 WHERE model_id = (SELECT id FROM models WHERE name = $1) AND channel_id = (SELECT id FROM channels WHERE name = $2)',
      [testModel, testChannel]
    );
    
    const usedUsernames = [];
    const rotationResults = [];
    
    // Test full rotation + 2 extra to verify cycling
    const testCount = totalUsernames + 2;
    
    for (let i = 0; i < testCount; i++) {
      const result = await usernameService.getNextUsername(testModel, testChannel);
      
      usedUsernames.push(result.username);
      rotationResults.push({
        call: i + 1,
        username: result.username,
        index: result.index,
        total: result.total
      });
      
      console.log(`${i + 1}. Username: ${result.username} (index: ${result.index}/${result.total})`);
      
      // Verify total count is consistent
      expect(result.total).toBe(totalUsernames);
    }
    
    // Verify rotation worked correctly
    console.log('\n✅ ROTATION VERIFICATION:');
    
    // Check that we got the expected number of unique usernames in first cycle
    const firstCycle = usedUsernames.slice(0, totalUsernames);
    const uniqueInFirstCycle = new Set(firstCycle);
    console.log(`   First cycle: ${uniqueInFirstCycle.size} unique usernames out of ${totalUsernames}`);
    expect(uniqueInFirstCycle.size).toBe(totalUsernames);
    
    // Check that rotation cycled back to start
    const firstUsername = usedUsernames[0];
    const afterFullCycle = usedUsernames[totalUsernames];
    console.log(`   First username: "${firstUsername}"`);
    console.log(`   After full cycle: "${afterFullCycle}"`);
    expect(afterFullCycle).toBe(firstUsername);
    
    // Check second cycle continues correctly
    const secondInCycle = usedUsernames[totalUsernames + 1];
    const secondOriginal = usedUsernames[1];
    console.log(`   Second username original: "${secondOriginal}"`);
    console.log(`   Second username after cycle: "${secondInCycle}"`);
    expect(secondInCycle).toBe(secondOriginal);
    
    console.log('   ✅ Rotation cycles correctly back to start!');
    
  }, 60000);

  it('should handle concurrent rotation requests without duplicates', async () => {
    // Get REAL data from database  
    const models = await databaseService.getAllModels();
    const channels = await databaseService.getAllChannels();
    
    // Find a testable combination
    let testModel, testChannel;
    
    for (const model of models) {
      for (const channel of channels) {
        try {
          const usernames = await usernameService.getAllUsernames(model.name, channel.name);
          if (usernames.length >= 5) { // Need enough for concurrent testing
            testModel = model.name;
            testChannel = channel.name;
            break;
          }
        } catch (error) {
          // Continue searching
        }
      }
      if (testModel) break;
    }
    
    if (!testModel) {
      console.log('⏭️ Skipping concurrent test: Not enough usernames found');
      return;
    }
    
    console.log(`⚡ TESTING CONCURRENT ROTATION: ${testModel} / ${testChannel}`);
    
    // Make 5 concurrent requests
    const concurrentRequests = Array(5).fill(null).map(() => 
      usernameService.getNextUsername(testModel, testChannel)
    );
    
    const results = await Promise.all(concurrentRequests);
    
    // Check all requests succeeded
    expect(results).toHaveLength(5);
    results.forEach(result => {
      expect(result.username).toBeDefined();
      expect(result.index).toBeGreaterThanOrEqual(0);
      expect(result.total).toBeGreaterThan(0);
    });
    
    // Check for duplicates (should not happen with proper row locking)
    const usernames = results.map(r => r.username);
    const uniqueUsernames = new Set(usernames);
    
    console.log(`   Concurrent usernames: ${usernames.join(', ')}`);
    console.log(`   Unique count: ${uniqueUsernames.size}/${usernames.length}`);
    
    // All should be unique due to SELECT FOR UPDATE locking
    expect(uniqueUsernames.size).toBe(usernames.length);
    
    console.log('   ✅ No duplicates in concurrent requests!');
    
  }, 60000);

});