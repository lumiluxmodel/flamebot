// test/testPromptDirect.js
require('dotenv').config();
const aiService = require('../src/services/aiService');
const usernameService = require('../src/services/usernameService');

async function testPromptGenerationDirect() {
    console.log('🔍 Testing Prompt Generation Directly (No HTTP)...\n');
    
    const testCases = [
        { model: 'aura', channel: 'gram' },
        { model: 'lola', channel: 'snap' },
        { model: 'iris', channel: 'gram' }
    ];
    
    for (const test of testCases) {
        console.log(`\n📝 Test: ${test.model}/${test.channel}`);
        console.log('='.repeat(50));
        
        try {
            // Step 1: Get username
            console.log('\n1️⃣ Getting username...');
            const usernameData = await usernameService.getNextUsername(test.model, test.channel);
            console.log(`   ✅ Username: ${usernameData.username}`);
            console.log(`   Index: ${usernameData.index}/${usernameData.total}`);
            
            // Step 2: Generate prompt
            console.log('\n2️⃣ Generating prompt with AI...');
            const promptData = await aiService.generatePrompt(
                test.model,
                test.channel,
                usernameData.username
            );
            
            console.log('\n3️⃣ Results:');
            console.log(`   Model: ${promptData.model}`);
            console.log(`   Channel: ${promptData.channel}`);
            console.log(`   Username: ${promptData.username}`);
            console.log(`   Visible Text: "${promptData.visibleText}"`);
            console.log(`   Character Count: ${promptData.visibleText.length}/40`);
            console.log(`   Obfuscated (first 50 chars): ${promptData.obfuscatedText.substring(0, 50)}...`);
            
            // Verify the output
            console.log('\n4️⃣ Verification:');
            const hasUsername = promptData.obfuscatedText.includes(promptData.username);
            console.log(`   Contains username: ${hasUsername ? '✅' : '❌'}`);
            
            const prefix = test.channel === 'gram' ? 'Grαm;' : 'Snαp;';
            const hasPrefix = promptData.obfuscatedText.includes(prefix);
            console.log(`   Contains prefix (${prefix}): ${hasPrefix ? '✅' : '❌'}`);
            
            const charCount = promptData.visibleText.length;
            const validLength = charCount <= 40;
            console.log(`   Valid length (≤40): ${validLength ? '✅' : '❌'} (${charCount} chars)`);
            
        } catch (error) {
            console.error(`\n❌ Error: ${error.message}`);
            console.error('Stack trace:', error.stack);
        }
    }
    
    console.log('\n\n✅ Direct test completed!\n');
}

// Run the test
testPromptGenerationDirect().catch(console.error);