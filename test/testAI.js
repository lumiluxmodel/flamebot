const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

// Test configuration
const PORT = process.env.PORT || 3090;
const API_BASE_URL = `http://localhost:${PORT}/api/ai`;

// Sample usernames for testing
const sampleUsernames = {
    aura: {
        gram: [
            'auroravelgns', 'auroavelhxz', 'auraveliif', 'auroraveljsm',
            'velaoratnu', 'auroraveluxb', 'auroavelvih', 'velaorasco',
            'auroavelwso', 'auravelxcu', 'auravelfdm', 'velaurazxh',
            'velaoraahn', 'auroavelsue', 'auroraveldca', 'velaoranhw',
            'auroavelfxn', 'auravelghu', 'auravelhsa', 'velauraich',
            'velaorajnn', 'auroravellha', 'auroavelmsh', 'vauraruo',
            'velauraedc', 'auravyxw', 'velaorafke', 'vaurayox',
            'aurorawzg', 'auroasqu', 'auraambq', 'auraayqu',
            'auraaplu', 'auravelevz', 'velauraycq', 'mistress.toy8',
            'vaurakud', 'aurraehv', 'vaurakdc', 'auraarzi',
            'auravelxvo'
        ],
        snap: [
            'aura_snap1', 'aura_snap2', 'aura_snap3', 'aura_snap4'
        ]
    },
    lola: {
        gram: [
            'santinihqd', 'sanlolarnl', 'lolasanbsx', 'lolasankti',
            'sanlolauus', 'sanlolaevd', 'sanlolawnr', 'santinirsk',
            'santinibdr', 'lolasankcn', 'sanlolaudx', 'sanlolaeei',
            'lolaaxgd', 'santinihhn', 'santinirix', 'lolasanaji',
            'lolasankks', 'lolaafwu', 'lolaagqb', 'santinihps',
            'lolasaniry', 'lolaasnq', 'leanaceq', 'lolananlm',
            'leanabxr', 'lollaiyd', 'lelavije', 'lolanaclv',
            'lolasanfnr', 'lollaxyn', 'lelaiej', 'sanlolaslf',
            'santiynicra', 'leananyw', 'sanlolailo', 'leanazjb',
            'lolisnec', 'lolasanrxk', 'lolaairt', 'lolanacel',
            'lolasannkh', 'lollaxrd', 'lelaixz', 'lolaawnl',
            'lolisrac', 'lolasancgy', 'lolaamnu', 'leanawtq',
            'lolanaham', 'lollacne', 'lelaetd', 'lolanawzv',
            'lollarmn', 'santiniwgb', 'lollahmw', 'lolisrts',
            'sanlolaczo', 'leanawmg', 'lolasanrzy', 'lolaacgt',
            'lolanawtl', 'lolasanhzh', 'lolanamtv', 'lelrarmi'
        ],
        snap: [
            'lola_snap1', 'lola_snap2', 'lola_snap3', 'lola_snap4'
        ]
    },
    iris: {
        gram: [
            'bakerrcq', 'irisbaksnx', 'irisbaktxd', 'bakerisuik',
            'irisbaksqx', 'irisuac', 'irisbakxjl', 'irisbakasw',
            'irisbakbcd', 'bakeriscnj', 'bakerisdxq', 'irisiwg',
            'irisdyp', 'bakermvu', 'bakerinq', 'irisbakjxw',
            'irisbakkid', 'bakerislsj', 'bakerismcq', 'irisoxd',
            'bakerqsq'
        ],
        snap: [
            'iris_snap1', 'iris_snap2', 'iris_snap3', 'iris_snap4'
        ]
    }
};

async function checkServerRunning() {
    try {
        await axios.get(`http://localhost:${PORT}/api/accounts/health`);
        return true;
    } catch (error) {
        return false;
    }
}

async function setupUsernames() {
    console.log('\n📁 Setting up username files...\n');
    
    // Check if server is running
    const serverRunning = await checkServerRunning();
    if (!serverRunning) {
        console.error('❌ Server is not running! Please start the server first:');
        console.log('   npm run dev');
        process.exit(1);
    }
    
    for (const [model, channels] of Object.entries(sampleUsernames)) {
        for (const [channel, usernames] of Object.entries(channels)) {
            try {
                const response = await axios.post(`${API_BASE_URL}/usernames`, {
                    model,
                    channel,
                    usernames,
                    replace: true
                });
                
                console.log(`✅ Uploaded ${usernames.length} usernames for ${model}/${channel}`);
            } catch (error) {
                console.error(`❌ Error uploading ${model}/${channel}:`, error.response?.data || error.message);
            }
        }
    }
}

async function testGeneratePrompt() {
    console.log('\n🧪 Testing single prompt generation...\n');
    
    const testCases = [
        { model: 'aura', channel: 'gram' },
        { model: 'lola', channel: 'snap' },
        { model: 'iris', channel: 'gram' }
    ];
    
    for (const testCase of testCases) {
        try {
            console.log(`\n📝 Generating prompt for ${testCase.model}/${testCase.channel}...`);
            
            const response = await axios.post(`${API_BASE_URL}/generate-prompt`, testCase);
            const data = response.data.data;
            
            console.log(`✅ Model: ${data.model}`);
            console.log(`📱 Channel: ${data.channel}`);
            console.log(`👤 Username: ${data.username}`);
            console.log(`💬 Visible Text: ${data.visibleText}`);
            console.log(`🔐 Obfuscated: ${data.obfuscatedText.substring(0, 50)}...`);
            console.log(`📊 Character count: ${data.visibleText.length}/40`);
            
            // Save to file for inspection
            const filename = `output_${data.model}_${data.channel}_${Date.now()}.txt`;
            await fs.writeFile(filename, data.obfuscatedText, 'utf-8');
            console.log(`💾 Saved to: ${filename}`);
            
        } catch (error) {
            console.error(`❌ Error:`, error.response?.data || error.message);
        }
    }
}

async function testGenerateMultiplePrompts() {
    console.log('\n🧪 Testing multiple prompts generation...\n');
    
    try {
        const response = await axios.post(`${API_BASE_URL}/generate-prompts`, {
            model: 'aura',
            channel: 'gram',
            count: 3
        });
        
        const data = response.data.data;
        console.log(`✅ Generated ${data.generated} prompts`);
        console.log(`❌ Failed: ${data.failed}`);
        
        data.prompts.forEach((prompt, index) => {
            console.log(`\n--- Prompt ${index + 1} ---`);
            console.log(`Username: ${prompt.username}`);
            console.log(`Text: ${prompt.visibleText}`);
        });
        
    } catch (error) {
        console.error('❌ Error:', error.response?.data || error.message);
    }
}

async function testGenerateBios() {
    console.log('\n🧪 Testing bio generation...\n');
    
    try {
        const response = await axios.post(`${API_BASE_URL}/generate-bios`, {
            count: 3
        });
        
        const data = response.data.data;
        console.log(`✅ Generated ${data.count} bios\n`);
        
        data.bios.forEach((bio, index) => {
            console.log(`\n=== Bio ${bio.id} ===`);
            console.log(`Characters: ${bio.characterCount}`);
            console.log(`Text:\n${bio.text}\n`);
            console.log('-'.repeat(50));
        });
        
        // Save bios to file
        const biosContent = data.bios.map(bio => bio.text).join('\n\n');
        await fs.writeFile('generated_bios.txt', biosContent, 'utf-8');
        console.log('\n💾 Bios saved to: generated_bios.txt');
        
    } catch (error) {
        console.error('❌ Error:', error.response?.data || error.message);
    }
}

async function testGetUsernameStats() {
    console.log('\n🧪 Testing username statistics...\n');
    
    try {
        const response = await axios.get(`${API_BASE_URL}/usernames/stats`);
        console.log('📊 Username Statistics:', JSON.stringify(response.data.data, null, 2));
    } catch (error) {
        console.error('❌ Error:', error.response?.data || error.message);
    }
}

async function runAllTests() {
    console.log(`
╔═══════════════════════════════════════╗
║       AI Service Test Suite           ║
╚═══════════════════════════════════════╝
    `);

    // Check if OPENAI_API_KEY is set
    if (!process.env.OPENAI_API_KEY) {
        console.error('❌ OPENAI_API_KEY not set in environment variables!');
        console.log('Please set it before running AI tests.');
        return;
    }

    await setupUsernames();
    await testGetUsernameStats();
    await testGeneratePrompt();
    await testGenerateMultiplePrompts();
    await testGenerateBios();

    console.log('\n✨ All tests completed!\n');
}

// Run tests based on command line argument
const testType = process.argv[2];

switch (testType) {
    case 'setup':
        setupUsernames();
        break;
    case 'prompt':
        testGeneratePrompt();
        break;
    case 'prompts':
        testGenerateMultiplePrompts();
        break;
    case 'bios':
        testGenerateBios();
        break;
    case 'stats':
        testGetUsernameStats();
        break;
    default:
        runAllTests();
}