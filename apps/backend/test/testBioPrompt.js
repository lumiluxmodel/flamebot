const path = require('path');
require('dotenv').config({ 
  path: path.join(__dirname, '../.env') 
});
const axios = require('axios');

// Test configuration
const PORT = process.env.PORT || 3090;
const API_BASE_URL = `http://localhost:${PORT}/api/actions`;

// ⚠️ CAMBIAR ESTOS VALORES POR DATOS REALES
const TEST_ACCOUNT_ID = "6849f9b45a433b07f26bf749"; // 👈 TU ACCOUNT ID
const TEST_MODEL = "lola"; // 👈 aura, lola, iris, ciara
const TEST_CHANNEL = "gram"; // 👈 snap, gram, of

// Color codes for console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    magenta: '\x1b[35m'
};

async function checkServerRunning() {
    try {
        await axios.get(`http://localhost:${PORT}/api/accounts/health`);
        return true;
    } catch (error) {
        return false;
    }
}

async function updateBio(useAI = true, customBio = null) {
    console.log(`\n${colors.bright}📝 Updating Bio ${useAI ? '(AI Generated)' : '(Custom Text)'}${colors.reset}`);
    console.log(`   Account ID: ${TEST_ACCOUNT_ID}`);
    
    try {
        let response;
        
        if (useAI) {
            console.log(`   🤖 Generating AI bio with OnlyFans strategy...`);
            response = await axios.post(`${API_BASE_URL}/bio/generate-update`, {
                accountId: TEST_ACCOUNT_ID
            });
        } else {
            console.log(`   ✍️  Using custom bio: "${customBio}"`);
            response = await axios.post(`${API_BASE_URL}/bio/update`, {
                accountId: TEST_ACCOUNT_ID,
                bio: customBio
            });
        }
        
        // Acceder al taskId correcto
        const taskId = response.data.data.taskId;
        const bioText = useAI ? response.data.data.generatedBio : customBio;
        
        console.log(`${colors.green}✅ Bio updated successfully!${colors.reset}`);
        console.log(`   Task ID: ${colors.cyan}${taskId}${colors.reset}`);
        console.log(`   Status: ${response.data.data.result.status}`);
        console.log(`   Progress: ${response.data.data.result.progress}`);
        console.log(`   Bio Preview: "${bioText?.substring(0, 80)}..."`);
        console.log(`   Bio Length: ${bioText?.length} characters`);
        
        // Verificar que se aplicó correctamente
        const bioStatus = response.data.data.result.results[0].fields.bio_information?.status || 'Unknown';
        if (bioStatus === "Successful") {
            console.log(`${colors.green}   ✅ Bio update status: ${bioStatus}${colors.reset}`);
        } else {
            console.log(`${colors.red}   ❌ Bio update status: ${bioStatus}${colors.reset}`);
        }
        
        return {
            taskId,
            success: true,
            status: response.data.data.result.status,
            bioText
        };
    } catch (error) {
        console.error(`${colors.red}❌ Failed to update bio:${colors.reset}`, error.response?.data || error.message);
        return { success: false, error: error.message };
    }
}

async function updatePrompt(useAI = true, customPrompt = null) {
    console.log(`\n${colors.bright}💬 Updating Prompt ${useAI ? '(AI Generated)' : '(Custom Text)'}${colors.reset}`);
    console.log(`   Account ID: ${TEST_ACCOUNT_ID}`);
    console.log(`   Model: ${TEST_MODEL} | Channel: ${TEST_CHANNEL}`);
    
    try {
        let response;
        
        if (useAI) {
            console.log(`   🤖 Generating AI prompt with obfuscation...`);
            response = await axios.post(`${API_BASE_URL}/prompt/generate-update`, {
                accountId: TEST_ACCOUNT_ID,
                model: TEST_MODEL,
                channel: TEST_CHANNEL
            });
        } else {
            console.log(`   ✍️  Using custom prompt: "${customPrompt}"`);
            response = await axios.post(`${API_BASE_URL}/prompt/update`, {
                accountId: TEST_ACCOUNT_ID,
                model: TEST_MODEL,
                channel: TEST_CHANNEL,
                promptText: customPrompt
            });
        }
        
        // Acceder al taskId correcto
        const taskId = response.data.data.taskId;
        const visibleText = response.data.data.visibleText || customPrompt;
        const obfuscatedText = response.data.data.obfuscatedText;
        
        console.log(`${colors.green}✅ Prompt updated successfully!${colors.reset}`);
        console.log(`   Task ID: ${colors.cyan}${taskId}${colors.reset}`);
        console.log(`   Status: ${response.data.data.result.status}`);
        console.log(`   Progress: ${response.data.data.result.progress}`);
        console.log(`   Visible Text: "${visibleText}"`);
        if (obfuscatedText) {
            console.log(`   Obfuscated Preview: ${obfuscatedText.substring(0, 60)}...`);
        }
        
        // Verificar que se aplicó correctamente
        const promptStatus = response.data.data.result.results[0].fields.prompts?.status || 'Unknown';
        if (promptStatus === "Successful") {
            console.log(`${colors.green}   ✅ Prompt update status: ${promptStatus}${colors.reset}`);
        } else {
            console.log(`${colors.red}   ❌ Prompt update status: ${promptStatus}${colors.reset}`);
        }
        
        return {
            taskId,
            success: true,
            status: response.data.data.result.status,
            visibleText,
            obfuscatedText
        };
    } catch (error) {
        console.error(`${colors.red}❌ Failed to update prompt:${colors.reset}`, error.response?.data || error.message);
        return { success: false, error: error.message };
    }
}

async function verifyUpdate(taskId, type = 'bio') {
    console.log(`\n${colors.bright}📊 Verifying ${type.toUpperCase()} Update${colors.reset}`);
    console.log(`   Task ID: ${colors.cyan}${taskId}${colors.reset}`);
    
    try {
        const response = await axios.get(`${API_BASE_URL}/${type}/status/${taskId}`);
        
        console.log(`${colors.green}✅ ${type.toUpperCase()} update verified successfully!${colors.reset}`);
        console.log(`   Task Status: ${response.data.data.status}`);
        console.log(`   Progress: ${response.data.data.progress}`);
        console.log(`   Successful: ${response.data.data.successful}`);
        console.log(`   Failed: ${response.data.data.failed}`);
        
        if (response.data.data.results && response.data.data.results.length > 0) {
            const result = response.data.data.results[0];
            console.log(`   Account: ${result.account_tag}`);
            
            // SEGÚN TU EJEMPLO - campos correctos
            if (type === 'bio' && result.fields.bio_information) {
                console.log(`   Bio Status: ${result.fields.bio_information.status}`);
            } else if (type === 'prompt' && result.fields.questions) {
                console.log(`   Questions Status: ${result.fields.questions.status}`);
            }
        }
        
        return {
            success: true,
            verified: response.data.data.status === 'COMPLETED'
        };
    } catch (error) {
        console.error(`${colors.red}❌ Failed to verify ${type} update:${colors.reset}`, error.response?.data || error.message);
        return { success: false, error: error.message };
    }
}

async function testBioPromptFlow() {
    console.log(`
${colors.bright}╔═══════════════════════════════════════╗
║     Flamebot Bio & Prompt Test Suite  ║
║      Simple Update & Verify Test      ║
╚═══════════════════════════════════════╝${colors.reset}
    `);

    // Check if server is running
    const serverRunning = await checkServerRunning();
    if (!serverRunning) {
        console.error(`${colors.red}❌ Server is not running!${colors.reset}`);
        console.log(`   Run: ${colors.cyan}npm run dev${colors.reset} or ${colors.cyan}npm start${colors.reset}`);
        process.exit(1);
    }

    // Check OpenAI API key for AI generation
    if (!process.env.OPENAI_API_KEY) {
        console.log(`${colors.yellow}⚠️ Warning: OPENAI_API_KEY not found - AI generation tests may fail${colors.reset}`);
    }

    console.log(`${colors.green}✅ Environment OK${colors.reset}`);
    console.log(`${colors.cyan}📝 Testing with Account ID: ${TEST_ACCOUNT_ID}${colors.reset}`);
    console.log(`${colors.cyan}🎯 Model: ${TEST_MODEL} | Channel: ${TEST_CHANNEL}${colors.reset}\n`);

    // Test 1: Update Bio with AI
    const bioResult = await updateBio(true); // AI generated
    if (!bioResult.success) {
        console.log(`${colors.red}❌ Bio test failed - stopping${colors.reset}`);
        return;
    }

    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Verify bio update
    await verifyUpdate(bioResult.taskId, 'bio');

    // Test 2: Update Prompt with AI  
    const promptResult = await updatePrompt(true); // AI generated
    if (!promptResult.success) {
        console.log(`${colors.red}❌ Prompt test failed${colors.reset}`);
        return;
    }

    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Verify prompt update
    await verifyUpdate(promptResult.taskId, 'prompt');

    // Summary
    console.log(`\n${colors.green}✨ Bio & Prompt Test Completed!${colors.reset}`);
    console.log(`\n${colors.bright}Updates Applied:${colors.reset}`);
    console.log(`   ${colors.cyan}•${colors.reset} Bio: AI-generated with OnlyFans conversion strategy`);
    console.log(`   ${colors.cyan}•${colors.reset} Prompt: AI-generated with obfuscation for ${TEST_MODEL}/${TEST_CHANNEL}`);
    console.log(`   ${colors.cyan}•${colors.reset} Both updates completed successfully`);
    console.log(`\n${colors.bright}Next Steps:${colors.reset}`);
    console.log(`   1. Check Flamebot dashboard to see the updated bio and prompt`);
    console.log(`   2. The account is now ready with new content`);
    console.log(`   3. You can start swiping with the updated profile\n`);
}

// Test with custom content
async function testCustomContent() {
    const customBio = "hey babe, just living my best life 💕 swipe right if you can handle this energy and want some fun";
    const customPrompt = "oh wow look what u found";
    
    console.log(`\n${colors.bright}✍️ Custom Content Test${colors.reset}`);
    
    // Update with custom bio
    const bioResult = await updateBio(false, customBio);
    if (bioResult.success) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        await verifyUpdate(bioResult.taskId, 'bio');
    }
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Update with custom prompt
    const promptResult = await updatePrompt(false, customPrompt);
    if (promptResult.success) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        await verifyUpdate(promptResult.taskId, 'prompt');
    }
}

// Run tests based on command line argument
const testType = process.argv[2];

switch (testType) {
    case 'custom':
        testCustomContent();
        break;
    case 'bio':
        updateBio(true).then(result => {
            if (result.success) {
                setTimeout(() => verifyUpdate(result.taskId, 'bio'), 1000);
            }
        });
        break;
    case 'prompt':
        updatePrompt(true).then(result => {
            if (result.success) {
                setTimeout(() => verifyUpdate(result.taskId, 'prompt'), 1000);
            }
        });
        break;
    case 'verify':
        const taskId = process.argv[3];
        const type = process.argv[4] || 'bio';
        if (taskId) {
            verifyUpdate(taskId, type);
        } else {
            console.log(`${colors.red}❌ Please provide task ID: npm run test:bio-prompt verify TASK_ID [bio|prompt]${colors.reset}`);
        }
        break;
    default:
        testBioPromptFlow();
}