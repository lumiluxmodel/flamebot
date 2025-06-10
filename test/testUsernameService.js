// test/testUsernameService.js
require('dotenv').config();
const path = require('path');
const fs = require('fs').promises;
const usernameService = require('../src/services/usernameService');

async function testUsernameService() {
    console.log('🔍 Testing Username Service Directly...\n');
    
    // Test 1: Check data directory
    console.log('📁 Test 1: Checking data directory structure');
    const dataDir = path.join(__dirname, '../data');
    const usernamesDir = path.join(dataDir, 'usernames');
    
    try {
        const dataDirExists = await fs.access(dataDir).then(() => true).catch(() => false);
        const usernamesDirExists = await fs.access(usernamesDir).then(() => true).catch(() => false);
        
        console.log(`   Data directory exists: ${dataDirExists ? '✅' : '❌'}`);
        console.log(`   Usernames directory exists: ${usernamesDirExists ? '✅' : '❌'}`);
        
        if (usernamesDirExists) {
            const files = await fs.readdir(usernamesDir);
            console.log(`   Files found: ${files.join(', ')}`);
        }
    } catch (error) {
        console.error('   Error checking directories:', error.message);
    }
    
    // Test 2: Test loading usernames
    console.log('\n📖 Test 2: Loading usernames from files');
    const testCases = [
        { model: 'aura', channel: 'gram' },
        { model: 'aura', channel: 'snap' },
        { model: 'lola', channel: 'gram' },
        { model: 'iris', channel: 'gram' }
    ];
    
    for (const test of testCases) {
        console.log(`\n   Testing ${test.model}/${test.channel}:`);
        try {
            const usernames = await usernameService.loadUsernames(test.model, test.channel);
            console.log(`   ✅ Loaded ${usernames.length} usernames`);
            if (usernames.length > 0) {
                console.log(`   First: "${usernames[0]}"`);
                console.log(`   Last: "${usernames[usernames.length - 1]}"`);
            }
        } catch (error) {
            console.error(`   ❌ Error: ${error.message}`);
        }
    }
    
    // Test 3: Test pointer management
    console.log('\n🎯 Test 3: Testing pointer management');
    try {
        const pointers = await usernameService.loadPointers();
        console.log('   Current pointers:', JSON.stringify(pointers, null, 2));
    } catch (error) {
        console.error('   Error loading pointers:', error.message);
    }
    
    // Test 4: Test getNextUsername
    console.log('\n🔄 Test 4: Testing getNextUsername rotation');
    const model = 'aura';
    const channel = 'gram';
    
    try {
        console.log(`\n   Getting 5 consecutive usernames for ${model}/${channel}:`);
        for (let i = 0; i < 5; i++) {
            const result = await usernameService.getNextUsername(model, channel);
            console.log(`   ${i + 1}. Username: "${result.username}" (index: ${result.index}/${result.total})`);
        }
    } catch (error) {
        console.error(`   ❌ Error in getNextUsername: ${error.message}`);
        console.error('   Stack:', error.stack);
    }
    
    // Test 5: Check file encoding
    console.log('\n🔤 Test 5: Checking file encoding and content');
    try {
        const filePath = path.join(usernamesDir, 'aura_ig.txt');
        const content = await fs.readFile(filePath, 'utf-8');
        console.log(`   File size: ${content.length} bytes`);
        console.log(`   First 100 chars: "${content.substring(0, 100).replace(/\n/g, '\\n')}"`);
        
        // Check for BOM or weird characters
        const hasBOM = content.charCodeAt(0) === 0xFEFF;
        console.log(`   Has BOM: ${hasBOM ? '⚠️ YES' : '✅ NO'}`);
        
        // Check line endings
        const hasWindowsLineEndings = content.includes('\r\n');
        const hasUnixLineEndings = content.includes('\n') && !hasWindowsLineEndings;
        console.log(`   Line endings: ${hasWindowsLineEndings ? 'Windows (\\r\\n)' : hasUnixLineEndings ? 'Unix (\\n)' : 'Unknown'}`);
    } catch (error) {
        console.error('   Error checking file encoding:', error.message);
    }
    
    console.log('\n✅ Test completed!\n');
}

// Run the test
testUsernameService().catch(console.error);