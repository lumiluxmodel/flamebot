const path = require('path');
require('dotenv').config({ 
  path: path.join(__dirname, '../.env') 
});
const axios = require('axios');

// Test configuration
const PORT = process.env.PORT || 3090;
const API_BASE_URL = `http://localhost:${PORT}/api/actions`;

// ⚠️ CAMBIAR ESTE ACCOUNT ID POR UNO REAL
const TEST_ACCOUNT_ID = "684ac3d172a9d307fa3e9995"; // 👈 TU ACCOUNT ID

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

async function configureSpectre(maxLikes) {
    console.log(`\n${colors.bright}👻 Configuring Spectre Mode (${maxLikes} likes)${colors.reset}`);
    console.log(`   Account ID: ${TEST_ACCOUNT_ID}`);
    console.log(`   Max Likes: ${maxLikes}`);
    console.log(`   Parameters: sleep_time: 10, like_percentage: 40, forcematching`);
    
    try {
        const response = await axios.post(`${API_BASE_URL}/spectre/enable`, {
            accountId: TEST_ACCOUNT_ID,
            maxLikes: maxLikes
        });
        
        // 🎯 ARREGLO: acceder al taskId correcto
        const taskId = response.data.data.taskId; // <-- ARREGLADO
        
        console.log(`${colors.green}✅ Spectre mode configured successfully!${colors.reset}`);
        console.log(`   Task ID: ${colors.cyan}${taskId}${colors.reset}`);
        console.log(`   Status: ${response.data.data.result.status}`);
        console.log(`   Progress: ${response.data.data.result.progress}`);
        console.log(`   Account Tag: ${response.data.data.result.results[0].account_tag}`);
        
        // Verificar que se configuró correctamente
        const swipingStatus = response.data.data.result.results[0].fields.swiping.status;
        if (swipingStatus === "Successful") {
            console.log(`${colors.green}   ✅ Swiping configuration: ${swipingStatus}${colors.reset}`);
        } else {
            console.log(`${colors.red}   ❌ Swiping configuration failed: ${swipingStatus}${colors.reset}`);
        }
        
        return {
            taskId,
            success: true,
            status: response.data.data.result.status,
            spectreConfig: response.data.data.spectreConfig
        };
    } catch (error) {
        console.error(`${colors.red}❌ Failed to configure Spectre:${colors.reset}`, error.response?.data || error.message);
        return { success: false, error: error.message };
    }
}

async function verifySpectreConfig(taskId) {
    console.log(`\n${colors.bright}📊 Verifying Spectre Configuration${colors.reset}`);
    console.log(`   Task ID: ${colors.cyan}${taskId}${colors.reset}`);
    
    try {
        const response = await axios.get(`${API_BASE_URL}/spectre/status/${taskId}`);
        
        console.log(`${colors.green}✅ Configuration verified successfully!${colors.reset}`);
        console.log(`   Task Status: ${response.data.data.status}`);
        console.log(`   Progress: ${response.data.data.progress}`);
        console.log(`   Successful: ${response.data.data.successful}`);
        console.log(`   Failed: ${response.data.data.failed}`);
        
        if (response.data.data.results && response.data.data.results.length > 0) {
            const result = response.data.data.results[0];
            console.log(`   Account: ${result.account_tag}`);
            console.log(`   Swiping Status: ${result.fields.swiping.status}`);
        }
        
        return {
            success: true,
            verified: response.data.data.status === 'COMPLETED'
        };
    } catch (error) {
        console.error(`${colors.red}❌ Failed to verify configuration:${colors.reset}`, error.response?.data || error.message);
        return { success: false, error: error.message };
    }
}

async function testSpectreFlow() {
    console.log(`
${colors.bright}╔═══════════════════════════════════════╗
║       Flamebot Spectre Test Suite     ║
║     Simple Configure & Verify Test    ║
╚═══════════════════════════════════════╝${colors.reset}
    `);

    // Check if server is running
    const serverRunning = await checkServerRunning();
    if (!serverRunning) {
        console.error(`${colors.red}❌ Server is not running!${colors.reset}`);
        console.log(`   Run: ${colors.cyan}npm run dev${colors.reset} or ${colors.cyan}npm start${colors.reset}`);
        process.exit(1);
    }

    console.log(`${colors.green}✅ Environment OK${colors.reset}`);
    console.log(`${colors.magenta}🎯 Testing with Account ID: ${TEST_ACCOUNT_ID}${colors.reset}\n`);

    // Test 1: Configure Spectre with 50 likes
    const result1 = await configureSpectre(50);
    if (!result1.success) {
        console.log(`${colors.red}❌ Test failed - stopping${colors.reset}`);
        return;
    }

    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Verify configuration
    await verifySpectreConfig(result1.taskId);

    // Test 2: Change to 30 likes (simulate your flow)
    console.log(`\n${colors.yellow}🔄 Changing configuration to 30 likes...${colors.reset}`);
    const result2 = await configureSpectre(30);
    if (!result2.success) {
        console.log(`${colors.red}❌ Change test failed${colors.reset}`);
        return;
    }

    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Verify new configuration
    await verifySpectreConfig(result2.taskId);

    // Summary
    console.log(`\n${colors.green}✨ Spectre Test Completed!${colors.reset}`);
    console.log(`\n${colors.bright}Configuration Applied:${colors.reset}`);
    console.log(`   ${colors.cyan}•${colors.reset} mode: "spectre"`);
    console.log(`   ${colors.cyan}•${colors.reset} sleep_time: 10`);
    console.log(`   ${colors.cyan}•${colors.reset} max_likes: 30 (final)`);
    console.log(`   ${colors.cyan}•${colors.reset} swipe_until: "like_quantity"`);
    console.log(`   ${colors.cyan}•${colors.reset} swiping_type: "forcematching"`);
    console.log(`   ${colors.cyan}•${colors.reset} like_percentage: 40`);
    console.log(`   ${colors.cyan}•${colors.reset} force_matching_config: {"mode": "like_and_dislike", "failure_action": "retry_until_matched"}`);
    console.log(`\n${colors.bright}Next Steps:${colors.reset}`);
    console.log(`   1. Check Flamebot dashboard to see the saved configuration`);
    console.log(`   2. Start a swipe task to use this Spectre configuration`);
    console.log(`   3. The account will swipe with these exact parameters\n`);
}

// Test different configurations
async function testCustomLikes() {
    const likes = process.argv[3] ? parseInt(process.argv[3]) : 25;
    
    console.log(`\n${colors.bright}🎯 Custom Likes Test: ${likes} likes${colors.reset}`);
    
    const result = await configureSpectre(likes);
    if (result.success) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        await verifySpectreConfig(result.taskId);
    }
}

// Run tests based on command line argument
const testType = process.argv[2];

switch (testType) {
    case 'custom':
        testCustomLikes();
        break;
    case 'verify':
        const taskId = process.argv[3];
        if (taskId) {
            verifySpectreConfig(taskId);
        } else {
            console.log(`${colors.red}❌ Please provide task ID: npm run test:spectre verify TASK_ID${colors.reset}`);
        }
        break;
    default:
        testSpectreFlow();
}