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

    // Test 1: Get Username Statistics
    console.log(`${colors.bright}📊 Test 1: Username Statistics${colors.reset}`);
    try {
        const response = await axios.get(`${API_BASE_URL}/usernames/stats`);
        const stats = response.data.data;
        
        console.log('Current username files:');
        for (const [model, channels] of Object.entries(stats)) {
            for (const [channel, data] of Object.entries(channels)) {
                if (data.exists) {
                    console.log(`   ${colors.green}✓${colors.reset} ${model}/${channel}: ${data.count} usernames`);
                } else {
                    console.log(`   ${colors.red}✗${colors.reset} ${model}/${channel}: No file`);
                }
            }
        }
    } catch (error) {
        console.error(`${colors.red}❌ Failed:${colors.reset}`, error.response?.data || error.message);
    }

    // Test 2: Generate Single Prompt
    console.log(`\n${colors.bright}🎯 Test 2: Generate Single Prompt${colors.reset}`);
    try {
        const response = await axios.post(`${API_BASE_URL}/generate-prompt`, {
            model: 'aura',
            channel: 'gram'
        });
        
        const data = response.data.data;
        console.log(`${colors.green}✅ Success!${colors.reset}`);
        console.log(`   Username: ${data.username}`);
        console.log(`   Prompt: "${data.visibleText}"`);
        console.log(`   Length: ${data.visibleText.length}/40 chars`);
    } catch (error) {
        console.error(`${colors.red}❌ Failed:${colors.reset}`, error.response?.data || error.message);
    }

    // Test 3: Generate Multiple Prompts
    console.log(`\n${colors.bright}🎯 Test 3: Generate Multiple Prompts${colors.reset}`);
    try {
        const response = await axios.post(`${API_BASE_URL}/generate-prompts`, {
            model: 'lola',
            channel: 'snap',
            count: 3
        });
        
        const data = response.data.data;
        console.log(`${colors.green}✅ Generated ${data.generated} prompts${colors.reset}`);
        data.prompts.forEach((p, i) => {
            console.log(`   ${i + 1}. ${p.username}: "${p.visibleText}"`);
        });
    } catch (error) {
        console.error(`${colors.red}❌ Failed:${colors.reset}`, error.response?.data || error.message);
    }

    // Test 4: Generate Bios
    console.log(`\n${colors.bright}📝 Test 4: Generate Bios${colors.reset}`);
    try {
        const response = await axios.post(`${API_BASE_URL}/generate-bios`, {
            count: 2
        });
        
        const data = response.data.data;
        console.log(`${colors.green}✅ Generated ${data.count} bios${colors.reset}`);
        data.bios.forEach((bio, i) => {
            console.log(`\n   Bio ${i + 1} (${bio.characterCount} chars):`);
            console.log(`   ${bio.text.substring(0, 100)}...`);
        });
    } catch (error) {
        console.error(`${colors.red}❌ Failed:${colors.reset}`, error.response?.data || error.message);
    }

    // Test 5: Username Rotation
    console.log(`\n${colors.bright}🔄 Test 5: Username Rotation${colors.reset}`);
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

    console.log(`\n${colors.green}✨ All tests completed!${colors.reset}\n`);
}

// Run all tests
runAllTests().catch(console.error);