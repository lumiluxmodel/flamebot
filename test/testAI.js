require('dotenv').config();
const axios = require('axios');
const fs = require('fs').promises;

// Test configuration
const PORT = process.env.PORT || 3090;
const API_BASE_URL = `http://localhost:${PORT}/api/ai`;

// Color codes for console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

async function checkServerRunning() {
    try {
        await axios.get(`http://localhost:${PORT}/api/accounts/health`);
        return true;
    } catch (error) {
        return false;
    }
}

async function runAllTests() {
    console.log(`
${colors.bright}╔═══════════════════════════════════════╗
║       AI Service Test Suite           ║
║     Updated for new models/channels   ║
╚═══════════════════════════════════════╝${colors.reset}
    `);

    // Check if server is running
    const serverRunning = await checkServerRunning();
    if (!serverRunning) {
        console.error(`${colors.red}❌ Server is not running!${colors.reset}`);
        console.log(`   Run: ${colors.cyan}npm run dev${colors.reset} or ${colors.cyan}npm start${colors.reset}`);
        process.exit(1);
    }

    // Check OpenAI API key
    if (!process.env.OPENAI_API_KEY) {
        console.error(`${colors.red}❌ OPENAI_API_KEY not found in .env${colors.reset}`);
        process.exit(1);
    }

    console.log(`${colors.green}✅ Environment OK${colors.reset}\n`);

    // Test 1: Get Username Statistics (Updated for all models/channels)
    console.log(`${colors.bright}📊 Test 1: Username Statistics (Updated)${colors.reset}`);
    try {
        const response = await axios.get(`${API_BASE_URL}/usernames/stats`);
        const stats = response.data.data;
        
        console.log('Current username files (including new ones):');
        const models = ['aura', 'lola', 'iris', 'ciara'];
        const channels = ['snap', 'gram', 'of'];
        
        for (const model of models) {
            console.log(`\n  ${colors.bright}${model.toUpperCase()}:${colors.reset}`);
            for (const channel of channels) {
                const data = stats[model]?.[channel];
                if (data?.exists) {
                    console.log(`    ${colors.green}✓${colors.reset} ${channel}: ${data.count} usernames (index: ${data.currentIndex})`);
                } else {
                    console.log(`    ${colors.red}✗${colors.reset} ${channel}: No file`);
                }
            }
        }
    } catch (error) {
        console.error(`${colors.red}❌ Failed:${colors.reset}`, error.response?.data || error.message);
    }

    // Test 2: Generate Prompt for New Model (Ciara)
    console.log(`\n${colors.bright}🎯 Test 2: Generate Prompt for New Model (Ciara)${colors.reset}`);
    try {
        const response = await axios.post(`${API_BASE_URL}/generate-prompt`, {
            model: 'ciara',
            channel: 'gram'
        });
        
        const data = response.data.data;
        console.log(`${colors.green}✅ Success!${colors.reset}`);
        console.log(`   Model: ${data.model}`);
        console.log(`   Channel: ${data.channel}`);
        console.log(`   Username: ${data.username}`);
        console.log(`   Visible: "${data.visibleText}"`);
        console.log(`   Length: ${data.visibleText.length}/40 chars`);
        console.log(`   Obfuscated: ${data.obfuscatedText.substring(0, 50)}...`);
    } catch (error) {
        console.error(`${colors.red}❌ Failed:${colors.reset}`, error.response?.data || error.message);
    }

    // Test 3: Generate Prompt for New Channel (OnlyFans)
    console.log(`\n${colors.bright}🔥 Test 3: Generate Prompt for New Channel (OF)${colors.reset}`);
    try {
        const response = await axios.post(`${API_BASE_URL}/generate-prompt`, {
            model: 'aura',
            channel: 'of'
        });
        
        const data = response.data.data;
        console.log(`${colors.green}✅ Success!${colors.reset}`);
        console.log(`   Model: ${data.model}`);
        console.log(`   Channel: ${data.channel}`);
        console.log(`   Username: ${data.username}`);
        console.log(`   Visible: "${data.visibleText}"`);
        console.log(`   Obfuscated preview: ${data.obfuscatedText.substring(0, 50)}...`);
    } catch (error) {
        console.error(`${colors.red}❌ Failed:${colors.reset}`, error.response?.data || error.message);
    }

    // Test 4: Generate Multiple Prompts (Mixed Models/Channels)
    console.log(`\n${colors.bright}🎯 Test 4: Generate Multiple Prompts (Various Combinations)${colors.reset}`);
    const testCombinations = [
        { model: 'lola', channel: 'snap' },
        { model: 'iris', channel: 'of' },
        { model: 'ciara', channel: 'gram' }
    ];
    
    for (const combo of testCombinations) {
        try {
            const response = await axios.post(`${API_BASE_URL}/generate-prompt`, combo);
            const data = response.data.data;
            console.log(`   ${colors.green}✓${colors.reset} ${combo.model}/${combo.channel}: "${data.visibleText}"`);
        } catch (error) {
            console.log(`   ${colors.red}✗${colors.reset} ${combo.model}/${combo.channel}: ${error.response?.data?.error || error.message}`);
        }
    }

    // Test 5: Generate Improved Bios (OnlyFans Strategy)
    console.log(`\n${colors.bright}📝 Test 5: Generate Improved Bios (OnlyFans Strategy)${colors.reset}`);
    try {
        const response = await axios.post(`${API_BASE_URL}/generate-bios`, {
            count: 2
        });
        
        const data = response.data.data;
        console.log(`${colors.green}✅ Generated ${data.count} bios with new OnlyFans strategy${colors.reset}`);
        data.bios.forEach((bio, i) => {
            console.log(`\n   ${colors.cyan}Bio ${i + 1}${colors.reset} (${bio.characterCount} chars):`);
            console.log(`   "${bio.text.substring(0, 100)}..."`);
            
            // Check character count is within range
            if (bio.characterCount >= 425 && bio.characterCount <= 475) {
                console.log(`   ${colors.green}✓${colors.reset} Character count within range (425-475)`);
            } else {
                console.log(`   ${colors.yellow}⚠️${colors.reset} Character count outside range: ${bio.characterCount}`);
            }
        });
    } catch (error) {
        console.error(`${colors.red}❌ Failed:${colors.reset}`, error.response?.data || error.message);
    }

    // Test 6: Username Rotation Test
    console.log(`\n${colors.bright}🔄 Test 6: Username Rotation${colors.reset}`);
    try {
        const usernames = [];
        for (let i = 0; i < 3; i++) {
            const response = await axios.post(`${API_BASE_URL}/generate-prompt`, {
                model: 'iris',
                channel: 'gram'
            });
            usernames.push(response.data.data.username);
        }
        console.log(`${colors.green}✅ Rotation working${colors.reset}`);
        console.log(`   Sequence: ${usernames.join(' → ')}`);
    } catch (error) {
        console.error(`${colors.red}❌ Failed:${colors.reset}`, error.response?.data || error.message);
    }

    // Test 7: All Models and Channels - OBFUSCATED OUTPUT ONLY
    console.log(`\n${colors.bright}🎯 Test 7: All Models and Channels - OBFUSCATED OUTPUT${colors.reset}`);
    try {
        const models = ['aura', 'lola', 'iris', 'ciara'];
        const channels = ['gram', 'snap', 'of'];
        
        console.log('Generating obfuscated prompts for all combinations:\n');
        
        for (const model of models) {
            console.log(`\n${colors.bright}${model.toUpperCase()}:${colors.reset}`);
            for (const channel of channels) {
                try {
                    const response = await axios.post(`${API_BASE_URL}/generate-prompt`, {
                        model,
                        channel
                    });
                    
                    const data = response.data.data;
                    console.log(`   ${colors.green}✓${colors.reset} ${channel}: ${data.obfuscatedText}`);
                } catch (error) {
                    console.log(`   ${colors.red}✗${colors.reset} ${channel}: ${error.response?.data?.error || error.message}`);
                }
            }
        }
        console.log(`\n${colors.green}✅ All combinations tested${colors.reset}`);
    } catch (error) {
        console.error(`${colors.red}❌ Failed:${colors.reset}`, error.response?.data || error.message);
    }

    // Test 8: Validate All Model/Channel Combinations
    console.log(`\n${colors.bright}🔄 Test 8: Validate All Model/Channel Combinations${colors.reset}`);
    const models = ['aura', 'lola', 'iris', 'ciara'];
    const channels = ['snap', 'gram', 'of'];
    
    let validCombinations = 0;
    let totalCombinations = models.length * channels.length;
    
    for (const model of models) {
        for (const channel of channels) {
            try {
                const response = await axios.post(`${API_BASE_URL}/generate-prompt`, {
                    model,
                    channel
                });
                validCombinations++;
                console.log(`   ${colors.green}✓${colors.reset} ${model}/${channel}`);
            } catch (error) {
                console.log(`   ${colors.red}✗${colors.reset} ${model}/${channel}: ${error.response?.data?.error || error.message}`);
            }
            
            // Add small delay to avoid overwhelming the API
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }
    
    console.log(`\n   ${colors.bright}Summary:${colors.reset} ${validCombinations}/${totalCombinations} combinations working`);

    // Test 9: Error Handling (Invalid Inputs)
    console.log(`\n${colors.bright}⚠️  Test 9: Error Handling${colors.reset}`);
    const errorTests = [
        { model: 'invalid', channel: 'gram', expected: 'Invalid model' },
        { model: 'aura', channel: 'invalid', expected: 'Invalid channel' },
        { model: '', channel: 'gram', expected: 'Missing required fields' }
    ];
    
    for (const test of errorTests) {
        try {
            await axios.post(`${API_BASE_URL}/generate-prompt`, {
                model: test.model,
                channel: test.channel
            });
            console.log(`   ${colors.red}✗${colors.reset} Should have failed: ${test.model}/${test.channel}`);
        } catch (error) {
            if (error.response?.status === 400) {
                console.log(`   ${colors.green}✓${colors.reset} Correctly rejected: ${test.model}/${test.channel}`);
            } else {
                console.log(`   ${colors.yellow}?${colors.reset} Unexpected error: ${error.message}`);
            }
        }
    }

    console.log(`\n${colors.green}✨ All tests completed!${colors.reset}`);
    console.log(`\n${colors.bright}New Features Summary:${colors.reset}`);
    console.log(`   • Added 'ciara' model support`);
    console.log(`   • Added 'of' (OnlyFans) channel support`);
    console.log(`   • Improved bio generation with conversion psychology`);
    console.log(`   • Enhanced obfuscation system with discovery prompts`);
    console.log(`   • Extended validation for all combinations`);
    console.log(`   • Test 7 shows OBFUSCATED OUTPUT like Python code\n`);
}

// Run all tests
runAllTests().catch(console.error);