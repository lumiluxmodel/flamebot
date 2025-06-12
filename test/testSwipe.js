require('dotenv').config();
const axios = require('axios');

// Test configuration
const PORT = process.env.PORT || 3090;
const API_BASE_URL = `http://localhost:${PORT}/api/actions`; // Asumiendo que crearemos esta ruta

// ⚠️ CAMBIAR ESTE ACCOUNT ID POR UNO REAL
const TEST_ACCOUNT_ID = "6849b7eeec6acd57f3efe0ff"; // 👈 CAMBIAR ESTO

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

async function testSingleSwipe() {
    console.log(`\n${colors.bright}💕 Test 1: Single Account Swipe${colors.reset}`);
    
    try {
        const response = await axios.post(`${API_BASE_URL}/swipe`, {
            accountIds: [TEST_ACCOUNT_ID],
            taskName: "Test Swipe Task"
        });
        
        console.log(`${colors.green}✅ Swipe task started successfully!${colors.reset}`);
        console.log(`   Task ID: ${response.data.taskId}`);
        console.log(`   Account ID: ${TEST_ACCOUNT_ID}`);
        console.log(`   Full response:`, JSON.stringify(response.data, null, 2));
        
        return response.data.taskId;
    } catch (error) {
        console.error(`${colors.red}❌ Failed:${colors.reset}`, error.response?.data || error.message);
        return null;
    }
}

async function testMultipleSwipe() {
    console.log(`\n${colors.bright}💕 Test 2: Multiple Accounts Swipe${colors.reset}`);
    
    // Ejemplo con múltiples accounts (cambiar por IDs reales)
    const multipleAccountIds = [
        TEST_ACCOUNT_ID,
        "OTRO_ACCOUNT_ID_1", // 👈 CAMBIAR ESTO
        "OTRO_ACCOUNT_ID_2"  // 👈 CAMBIAR ESTO
    ];
    
    try {
        const response = await axios.post(`${API_BASE_URL}/swipe`, {
            accountIds: multipleAccountIds,
            taskName: "Bulk Swipe Test"
        });
        
        console.log(`${colors.green}✅ Multiple swipe task started!${colors.reset}`);
        console.log(`   Task ID: ${response.data.taskId}`);
        console.log(`   Accounts: ${multipleAccountIds.length}`);
        console.log(`   Full response:`, JSON.stringify(response.data, null, 2));
        
        return response.data.taskId;
    } catch (error) {
        console.error(`${colors.red}❌ Failed:${colors.reset}`, error.response?.data || error.message);
        return null;
    }
}

async function testSwipeStatus(taskId) {
    if (!taskId) {
        console.log(`\n${colors.yellow}⚠️ No task ID provided for status check${colors.reset}`);
        return;
    }
    
    console.log(`\n${colors.bright}📊 Test 3: Check Swipe Status${colors.reset}`);
    
    try {
        const response = await axios.get(`${API_BASE_URL}/swipe/status/${taskId}`);
        
        console.log(`${colors.green}✅ Status retrieved successfully!${colors.reset}`);
        console.log(`   Task ID: ${taskId}`);
        console.log(`   Status: ${response.data.celery_status}`);
        console.log(`   Full response:`, JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.error(`${colors.red}❌ Failed:${colors.reset}`, error.response?.data || error.message);
    }
}

async function testStopSwipe(taskId) {
    if (!taskId) {
        console.log(`\n${colors.yellow}⚠️ No task ID provided for stop test${colors.reset}`);
        return;
    }
    
    console.log(`\n${colors.bright}🛑 Test 4: Stop Swipe Task${colors.reset}`);
    
    try {
        const response = await axios.post(`${API_BASE_URL}/swipe/stop/${taskId}`);
        
        console.log(`${colors.green}✅ Swipe task stopped successfully!${colors.reset}`);
        console.log(`   Task ID: ${taskId}`);
        console.log(`   Full response:`, JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.error(`${colors.red}❌ Failed:${colors.reset}`, error.response?.data || error.message);
    }
}

async function testSwipeWithWait() {
    console.log(`\n${colors.bright}⏳ Test 5: Swipe with Wait for Completion${colors.reset}`);
    
    try {
        const response = await axios.post(`${API_BASE_URL}/swipe-wait`, {
            accountIds: [TEST_ACCOUNT_ID],
            taskName: "Test Swipe with Wait",
            waitForCompletion: true
        });
        
        console.log(`${colors.green}✅ Swipe completed!${colors.reset}`);
        console.log(`   Task ID: ${response.data.taskId}`);
        console.log(`   Final Status: ${response.data.finalStatus}`);
        console.log(`   Full response:`, JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.error(`${colors.red}❌ Failed:${colors.reset}`, error.response?.data || error.message);
    }
}

async function validateAccountId() {
    if (TEST_ACCOUNT_ID === "TU_ACCOUNT_ID_AQUI") {
        console.log(`${colors.red}❌ ERROR: You need to change TEST_ACCOUNT_ID!${colors.reset}`);
        console.log(`   Edit this file and replace "TU_ACCOUNT_ID_AQUI" with a real account ID.`);
        return false;
    }
    return true;
}

async function runAllTests() {
    console.log(`
${colors.bright}╔═══════════════════════════════════════╗
║       Flamebot Swipe Test Suite       ║
║         Testing Swipe Functions       ║
╚═══════════════════════════════════════╝${colors.reset}
    `);

    // Validate account ID
    if (!(await validateAccountId())) {
        process.exit(1);
    }

    // Check if server is running
    const serverRunning = await checkServerRunning();
    if (!serverRunning) {
        console.error(`${colors.red}❌ Server is not running!${colors.reset}`);
        console.log(`   Run: ${colors.cyan}npm run dev${colors.reset} or ${colors.cyan}npm start${colors.reset}`);
        process.exit(1);
    }

    console.log(`${colors.green}✅ Environment OK${colors.reset}`);
    console.log(`${colors.cyan}🎯 Testing with Account ID: ${TEST_ACCOUNT_ID}${colors.reset}\n`);

    // Run tests
    const taskId1 = await testSingleSwipe();
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds

    await testSwipeStatus(taskId1);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second

    const taskId2 = await testMultipleSwipe();
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds

    await testSwipeStatus(taskId2);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second

    await testSwipeWithWait();
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second

    // Optional: Stop the tasks (uncomment if needed)
    // await testStopSwipe(taskId1);
    // await testStopSwipe(taskId2);

    console.log(`\n${colors.green}✨ All swipe tests completed!${colors.reset}`);
    console.log(`\n${colors.bright}Notes:${colors.reset}`);
    console.log(`   • Check Flamebot dashboard for actual swipe activity`);
    console.log(`   • Task IDs can be used to monitor progress`);
    console.log(`   • Uncomment stop tests if you want to test stopping tasks`);
    console.log(`   • Make sure your account has valid Tinder data\n`);
}

// Run tests based on command line argument
const testType = process.argv[2];

switch (testType) {
    case 'single':
        validateAccountId().then(valid => valid && testSingleSwipe());
        break;
    case 'multiple':
        validateAccountId().then(valid => valid && testMultipleSwipe());
        break;
    case 'status':
        const taskId = process.argv[3];
        if (taskId) {
            testSwipeStatus(taskId);
        } else {
            console.log(`${colors.red}❌ Please provide task ID: npm run test:swipe status TASK_ID${colors.reset}`);
        }
        break;
    case 'stop':
        const stopTaskId = process.argv[3];
        if (stopTaskId) {
            testStopSwipe(stopTaskId);
        } else {
            console.log(`${colors.red}❌ Please provide task ID: npm run test:swipe stop TASK_ID${colors.reset}`);
        }
        break;
    case 'wait':
        validateAccountId().then(valid => valid && testSwipeWithWait());
        break;
    default:
        runAllTests();
}