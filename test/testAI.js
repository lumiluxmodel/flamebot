require('dotenv').config();
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

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

async function checkEnvironment() {
    console.log('\n🔍 Checking environment...\n');
    
    let allGood = true;
    
    // Check server
    const serverRunning = await checkServerRunning();
    if (!serverRunning) {
        console.error(`${colors.red}❌ Server is not running!${colors.reset}`);
        console.log(`   Run: ${colors.cyan}npm run dev${colors.reset}`);
        allGood = false;
    } else {
        console.log(`${colors.green}✅ Server is running on port ${PORT}${colors.reset}`);
    }
    
    // Check OpenAI API key
    if (!process.env.OPENAI_API_KEY) {
        console.error(`${colors.red}❌ OPENAI_API_KEY not found in .env${colors.reset}`);
        allGood = false;
    } else {
        console.log(`${colors.green}✅ OpenAI API key configured${colors.reset}`);
    }
    
    // Check data directory
    const dataDir = path.join(__dirname, '../data/usernames');
    try {
        await fs.access(dataDir);
        console.log(`${colors.green}✅ Data directory exists${colors.reset}`);
    } catch {
        console.error(`${colors.red}❌ Data directory not found: ${dataDir}${colors.reset}`);
        allGood = false;
    }
    
    return allGood;
}

async function testGetUsernameStats() {
    console.log(`\n${colors.bright}🧪 Testing username statistics...${colors.reset}\n`);
    
    try {
        const response = await axios.get(`${API_BASE_URL}/usernames/stats`);
        const stats = response.data.data;
        
        console.log('📊 Current username statistics:');
        console.log('================================');
        
        for (const [model, channels] of Object.entries(stats)) {
            console.log(`\n${colors.cyan}${model.toUpperCase()}:${colors.reset}`);
            for (const [channel, data] of Object.entries(channels)) {
                if (data.exists) {
                    console.log(`  ${channel}: ${colors.green}${data.count} usernames${colors.reset} (current index: ${data.currentIndex})`);
                } else {
                    console.log(`  ${channel}: ${colors.red}No file found${colors.reset}`);
                }
            }
        }
        
        return stats;
    } catch (error) {
        console.error(`${colors.red}❌ Error getting stats:${colors.reset}`, error.response?.data || error.message);
        return null;
    }
}

async function testGeneratePrompt() {
    console.log(`\n${colors.bright}🧪 Testing single prompt generation...${colors.reset}\n`);
    
    // Get current stats to see what's available
    const stats = await testGetUsernameStats();
    if (!stats) {
        console.error('Cannot proceed without username stats');
        return;
    }
    
    // Test with available models
    const testCases = [];
    for (const [model, channels] of Object.entries(stats)) {
        for (const [channel, data] of Object.entries(channels)) {
            if (data.exists && data.count > 0) {
                testCases.push({ model, channel });
            }
        }
    }
    
    if (testCases.length === 0) {
        console.error(`${colors.red}❌ No usernames available for testing!${colors.reset}`);
        console.log('   Upload usernames first using the /api/ai/usernames endpoint');
        return;
    }
    
    // Test first 3 available combinations
    for (const testCase of testCases.slice(0, 3)) {
        try {
            console.log(`\n${colors.yellow}📝 Generating prompt for ${testCase.model}/${testCase.channel}...${colors.reset}`);
            
            const startTime = Date.now();
            const response = await axios.post(`${API_BASE_URL}/generate-prompt`, testCase);
            const endTime = Date.now();
            
            const data = response.data.data;
            
            console.log(`${colors.green}✅ Success!${colors.reset} (${endTime - startTime}ms)`);
            console.log(`   Model: ${colors.cyan}${data.model}${colors.reset}`);
            console.log(`   Channel: ${colors.cyan}${data.channel}${colors.reset}`);
            console.log(`   Username: ${colors.yellow}${data.username}${colors.reset}`);
            console.log(`   Visible Text: "${colors.bright}${data.visibleText}${colors.reset}"`);
            console.log(`   Character count: ${data.visibleText.length}/40`);
            console.log(`   Username rotation: ${data.usernameInfo.index + 1}/${data.usernameInfo.total}`);
            
            // Save to file for inspection
            const filename = `test_output_${data.model}_${data.channel}_${Date.now()}.txt`;
            await fs.writeFile(filename, data.obfuscatedText, 'utf-8');
            console.log(`   💾 Saved to: ${filename}`);
            
        } catch (error) {
            console.error(`${colors.red}❌ Error:${colors.reset}`, error.response?.data || error.message);
            if (error.code === 'ECONNRESET' || error.code === 'ECONNABORTED') {
                console.error('   Socket/Connection error - the server might have crashed');
                console.error('   Check server logs for details');
            }
        }
    }
}

async function testGenerateMultiplePrompts() {
    console.log(`\n${colors.bright}🧪 Testing multiple prompts generation...${colors.reset}\n`);
    
    try {
        const response = await axios.post(`${API_BASE_URL}/generate-prompts`, {
            model: 'aura',
            channel: 'gram',
            count: 3
        });
        
        const data = response.data.data;
        console.log(`${colors.green}✅ Generated ${data.generated} prompts${colors.reset}`);
        
        if (data.failed > 0) {
            console.log(`${colors.red}❌ Failed: ${data.failed}${colors.reset}`);
        }
        
        data.prompts.forEach((prompt, index) => {
            console.log(`\n--- Prompt ${index + 1} ---`);
            console.log(`Username: ${colors.yellow}${prompt.username}${colors.reset}`);
            console.log(`Text: "${colors.bright}${prompt.visibleText}${colors.reset}"`);
            console.log(`Rotation: ${prompt.usernameInfo.index + 1}/${prompt.usernameInfo.total}`);
        });
        
        // Verify usernames are rotating
        const usernames = data.prompts.map(p => p.username);
        const uniqueUsernames = [...new Set(usernames)];
        console.log(`\n${colors.cyan}Username rotation: ${uniqueUsernames.length} unique usernames used${colors.reset}`);
        
    } catch (error) {
        console.error(`${colors.red}❌ Error:${colors.reset}`, error.response?.data || error.message);
    }
}

async function testGenerateBios() {
    console.log(`\n${colors.bright}🧪 Testing bio generation...${colors.reset}\n`);
    
    try {
        const startTime = Date.now();
        const response = await axios.post(`${API_BASE_URL}/generate-bios`, {
            count: 3
        });
        const endTime = Date.now();
        
        const data = response.data.data;
        console.log(`${colors.green}✅ Generated ${data.count} bios in ${endTime - startTime}ms${colors.reset}\n`);
        
        data.bios.forEach((bio, index) => {
            console.log(`\n${colors.cyan}=== Bio ${bio.id} ===${colors.reset}`);
            console.log(`Characters: ${bio.characterCount} ${bio.characterCount >= 300 && bio.characterCount <= 400 ? colors.green + '✓' : colors.red + '✗'}${colors.reset}`);
            console.log(`Text:\n${colors.bright}${bio.text}${colors.reset}\n`);
            console.log('-'.repeat(50));
            
            // Check for CTA
            const ctaPhrases = ['scroll', 'look around', 'middle', 'keep going', 'curious'];
            const hasCTA = ctaPhrases.some(phrase => bio.text.toLowerCase().includes(phrase));
            console.log(`CTA present: ${hasCTA ? colors.green + '✓' : colors.red + '✗'}${colors.reset}`);
        });
        
        // Save bios to file
        const biosContent = data.bios.map(bio => bio.text).join('\n\n===\n\n');
        const filename = `test_generated_bios_${Date.now()}.txt`;
        await fs.writeFile(filename, biosContent, 'utf-8');
        console.log(`\n💾 Bios saved to: ${filename}`);
        
    } catch (error) {
        console.error(`${colors.red}❌ Error:${colors.reset}`, error.response?.data || error.message);
    }
}

async function testUsernameRotation() {
    console.log(`\n${colors.bright}🧪 Testing username rotation...${colors.reset}\n`);
    
    const model = 'aura';
    const channel = 'gram';
    
    try {
        console.log('Testing 5 consecutive calls to verify rotation...\n');
        
        const usernames = [];
        for (let i = 0; i < 5; i++) {
            const response = await axios.post(`${API_BASE_URL}/generate-prompt`, { model, channel });
            const data = response.data.data;
            usernames.push(data.username);
            console.log(`Call ${i + 1}: ${colors.yellow}${data.username}${colors.reset} (index: ${data.usernameInfo.index})`);
        }
        
        // Check if usernames are rotating properly
        const uniqueUsernames = [...new Set(usernames)];
        if (uniqueUsernames.length === 5) {
            console.log(`\n${colors.green}✅ Username rotation working correctly${colors.reset}`);
        } else {
            console.log(`\n${colors.yellow}⚠️  Some usernames repeated (might be normal if list is short)${colors.reset}`);
        }
        
    } catch (error) {
        console.error(`${colors.red}❌ Error:${colors.reset}`, error.response?.data || error.message);
    }
}

async function runAllTests() {
    console.log(`
${colors.bright}╔═══════════════════════════════════════╗
║       AI Service Test Suite           ║
╚═══════════════════════════════════════╝${colors.reset}
    `);

    // Check environment first
    const envOk = await checkEnvironment();
    if (!envOk) {
        console.log(`\n${colors.red}Please fix the issues above before running tests.${colors.reset}\n`);
        process.exit(1);
    }

    // Run all tests
    await testGetUsernameStats();
    await testGeneratePrompt();
    await testGenerateMultiplePrompts();
    await testGenerateBios();
    await testUsernameRotation();

    console.log(`\n${colors.green}✨ All tests completed!${colors.reset}\n`);
}

// Run tests based on command line argument
const testType = process.argv[2];

switch (testType) {
    case 'stats':
        checkEnvironment().then(ok => ok && testGetUsernameStats());
        break;
    case 'prompt':
        checkEnvironment().then(ok => ok && testGeneratePrompt());
        break;
    case 'prompts':
        checkEnvironment().then(ok => ok && testGenerateMultiplePrompts());
        break;
    case 'bios':
        checkEnvironment().then(ok => ok && testGenerateBios());
        break;
    case 'rotation':
        checkEnvironment().then(ok => ok && testUsernameRotation());
        break;
    default:
        runAllTests();
}