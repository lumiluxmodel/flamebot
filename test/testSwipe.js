require('dotenv').config();
const axios = require('axios');

// Test configuration
const PORT = process.env.PORT || 3090;
const API_BASE_URL = `http://localhost:${PORT}/api/actions`;

// ⚠️ CAMBIAR ESTOS ACCOUNT IDS POR REALES
const TEST_ACCOUNT_IDS = [
    "684ac67faa9ff42adb90e24a", // 👈 TU ACCOUNT ID 1
    "684ac2d648dea6a77a14fcc6"  // 👈 TU ACCOUNT ID 2 (opcional)
];

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

async function startSwipeTask(accountIds, taskName = null) {
    console.log(`\n${colors.bright}💕 Starting Swipe Task${colors.reset}`);
    console.log(`   Account IDs: ${accountIds.join(', ')}`);
    console.log(`   Accounts Count: ${accountIds.length}`);
    if (taskName) console.log(`   Task Name: ${taskName}`);
    
    try {
        const payload = {
            accountIds: accountIds,
            taskName: taskName
        };
        
        console.log(`   🚀 Starting swipe with saved Spectre configuration...`);
        const response = await axios.post(`${API_BASE_URL}/swipe`, payload);
        
        // Acceder al taskId correcto
        const taskId = response.data.data.taskId;
        
        console.log(`${colors.green}✅ Swipe task started successfully!${colors.reset}`);
        console.log(`   Task ID: ${colors.cyan}${taskId}${colors.reset}`);
        console.log(`   Accounts: ${accountIds.length}`);
        console.log(`   Message: ${response.data.message}`);
        
        return {
            taskId,
            success: true,
            accountIds,
            taskName
        };
    } catch (error) {
        console.error(`${colors.red}❌ Failed to start swipe task:${colors.reset}`, error.response?.data || error.message);
        return { success: false, error: error.message };
    }
}

async function checkActiveSwipeTasks() {
    console.log(`\n${colors.bright}📋 Checking Active Swipe Tasks${colors.reset}`);
    
    try {
        const response = await axios.get(`${API_BASE_URL}/swipe/active`);
        const activeTasks = response.data.data;
        
        console.log(`${colors.green}✅ Active tasks retrieved successfully!${colors.reset}`);
        console.log(`   Active Tasks Count: ${activeTasks.length}`);
        
        if (activeTasks.length > 0) {
            console.log(`\n   ${colors.bright}Active Tasks:${colors.reset}`);
            activeTasks.forEach((task, index) => {
                console.log(`   ${colors.cyan}Task ${index + 1}:${colors.reset}`);
                console.log(`     Task ID: ${task.task_id}`);
                console.log(`     Task Name: ${task.task_name || 'N/A'}`);
                console.log(`     Status: ${task.status}`);
                console.log(`     Account IDs: ${task.account_ids?.join(', ') || 'N/A'}`);
                console.log(`     Started At: ${task.started_at}`);
                console.log(`     Source: ${task.source}`);
                console.log('');
            });
        } else {
            console.log(`   ${colors.yellow}No active swipe tasks found${colors.reset}`);
        }
        
        return {
            success: true,
            count: activeTasks.length,
            tasks: activeTasks
        };
    } catch (error) {
        console.error(`${colors.red}❌ Failed to check active tasks:${colors.reset}`, error.response?.data || error.message);
        return { success: false, error: error.message };
    }
}

async function checkSwipeStatus(taskId) {
    console.log(`\n${colors.bright}📊 Checking Swipe Status${colors.reset}`);
    console.log(`   Task ID: ${colors.cyan}${taskId}${colors.reset}`);
    
    try {
        const response = await axios.get(`${API_BASE_URL}/swipe/status/${taskId}`);
        const status = response.data.data;
        
        console.log(`${colors.green}✅ Swipe status retrieved successfully!${colors.reset}`);
        console.log(`   Task ID: ${status.task_id}`);
        console.log(`   Celery Status: ${status.celery_status}`);
        console.log(`   DB Status: ${status.db_status || 'N/A'}`);
        console.log(`   Task Name: ${status.task_name || 'N/A'}`);
        console.log(`   Account IDs: ${status.account_ids?.join(', ') || 'N/A'}`);
        console.log(`   Started At: ${status.started_at || 'N/A'}`);
        
        if (status.progress) {
            console.log(`   Progress:`, JSON.stringify(status.progress, null, 2));
        }
        
        if (status.result) {
            console.log(`   Result:`, JSON.stringify(status.result, null, 2));
        }
        
        if (status.error) {
            console.log(`   ${colors.red}Error:${colors.reset}`, JSON.stringify(status.error, null, 2));
        }
        
        return {
            success: true,
            status: status.celery_status,
            data: status
        };
    } catch (error) {
        console.error(`${colors.red}❌ Failed to check swipe status:${colors.reset}`, error.response?.data || error.message);
        return { success: false, error: error.message };
    }
}

async function pollSwipeStatus(taskId, maxAttempts = 12, interval = 10000) {
    console.log(`\n${colors.bright}⏳ Polling Swipe Status (${maxAttempts} attempts, ${interval/1000}s interval)${colors.reset}`);
    console.log(`   Task ID: ${colors.cyan}${taskId}${colors.reset}`);
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        console.log(`\n   ${colors.yellow}Attempt ${attempt}/${maxAttempts}${colors.reset}`);
        
        const statusResult = await checkSwipeStatus(taskId);
        if (!statusResult.success) {
            console.log(`   ❌ Status check failed, stopping polling`);
            return statusResult;
        }
        
        const celeryStatus = statusResult.status;
        
        // SEGÚN TU LÓGICA PYTHON
        if (celeryStatus === 'SUCCESS') {
            console.log(`\n${colors.green}🎉 SWIPE TASK COMPLETED SUCCESSFULLY!${colors.reset}`);
            return statusResult;
        }
        
        if (celeryStatus === 'FAILURE') {
            console.log(`\n${colors.red}❌ SWIPE TASK FAILED!${colors.reset}`);
            return statusResult;
        }
        
        if (celeryStatus === 'REVOKED') {
            console.log(`\n${colors.yellow}🛑 SWIPE TASK WAS STOPPED/REVOKED!${colors.reset}`);
            return statusResult;
        }
        
        if (['PENDING', 'STARTED', 'PROGRESS', 'RETRY'].includes(celeryStatus)) {
            console.log(`   ⏳ Task is ${celeryStatus}...`);
            if (attempt < maxAttempts) {
                console.log(`   ⏰ Waiting ${interval/1000} seconds before next check...`);
                await new Promise(resolve => setTimeout(resolve, interval));
            }
        } else {
            console.log(`   ❓ Unknown status: ${celeryStatus}`);
            return statusResult;
        }
    }
    
    console.log(`\n${colors.yellow}⚠️ Polling timeout reached. Task might still be running.${colors.reset}`);
    return { success: true, status: 'TIMEOUT', message: 'Polling timeout' };
}

async function stopSwipeTask(taskId) {
    console.log(`\n${colors.bright}🛑 Stopping Swipe Task${colors.reset}`);
    console.log(`   Task ID: ${colors.cyan}${taskId}${colors.reset}`);
    
    try {
        const response = await axios.post(`${API_BASE_URL}/swipe/stop/${taskId}`);
        
        console.log(`${colors.green}✅ Stop request sent successfully!${colors.reset}`);
        console.log(`   Response:`, JSON.stringify(response.data, null, 2));
        
        return {
            success: true,
            data: response.data
        };
    } catch (error) {
        console.error(`${colors.red}❌ Failed to stop swipe task:${colors.reset}`, error.response?.data || error.message);
        return { success: false, error: error.message };
    }
}

async function testSwipeFlow() {
    console.log(`
${colors.bright}╔═══════════════════════════════════════╗
║       Flamebot Swipe Test Suite       ║
║       Simple Start & Monitor Test     ║
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
    console.log(`${colors.cyan}💕 Testing with Account IDs: ${TEST_ACCOUNT_IDS.join(', ')}${colors.reset}\n`);

    // Test 1: Check active tasks before starting
    console.log(`${colors.cyan}📋 Checking active tasks before starting...${colors.reset}`);
    await checkActiveSwipeTasks();

    // Test 2: Start swipe task
    const swipeResult = await startSwipeTask(TEST_ACCOUNT_IDS, "Test Swipe Task");
    if (!swipeResult.success) {
        console.log(`${colors.red}❌ Swipe start failed - stopping test${colors.reset}`);
        return;
    }

    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Test 3: Check status once
    await checkSwipeStatus(swipeResult.taskId);

    // Test 4: Check active tasks after starting
    console.log(`${colors.cyan}📋 Checking active tasks after starting...${colors.reset}`);
    await checkActiveSwipeTasks();

    // Test 5: Poll status (reduced attempts for testing)
    console.log(`\n${colors.yellow}📊 Starting status polling...${colors.reset}`);
    const finalStatus = await pollSwipeStatus(swipeResult.taskId, 6, 10000); // 6 attempts, 10s each = 1 minute max

    // Test 6: Optional stop (uncomment if you want to test stopping)
    /*
    if (finalStatus.status === 'STARTED' || finalStatus.status === 'PROGRESS') {
        console.log(`\n${colors.yellow}🛑 Task still running, testing stop functionality...${colors.reset}`);
        await stopSwipeTask(swipeResult.taskId);
        
        // Check status after stop
        await new Promise(resolve => setTimeout(resolve, 2000));
        await checkSwipeStatus(swipeResult.taskId);
    }
    */

    // Summary
    console.log(`\n${colors.green}✨ Swipe Test Completed!${colors.reset}`);
    console.log(`\n${colors.bright}Test Summary:${colors.reset}`);
    console.log(`   ${colors.cyan}•${colors.reset} Swipe task started successfully`);
    console.log(`   ${colors.cyan}•${colors.reset} Used saved Spectre configuration from accounts`);
    console.log(`   ${colors.cyan}•${colors.reset} Final status: ${finalStatus.status || 'Unknown'}`);
    console.log(`\n${colors.bright}Next Steps:${colors.reset}`);
    console.log(`   1. Check Flamebot dashboard to see swipe activity`);
    console.log(`   2. Monitor progress in real-time`);
    console.log(`   3. Use Task ID ${swipeResult.taskId} to check status later`);
    console.log(`\n${colors.bright}Important:${colors.reset}`);
    console.log(`   • Swipe uses the Spectre configuration saved on each account`);
    console.log(`   • Make sure accounts have Spectre mode configured first`);
    console.log(`   • You can stop tasks manually if needed\n`);
}

// Test single status check
async function testStatusCheck() {
    const taskId = process.argv[3];
    if (!taskId) {
        console.log(`${colors.red}❌ Please provide task ID: node test/testSwipe.js status TASK_ID${colors.reset}`);
        return;
    }
    
    await checkSwipeStatus(taskId);
}

// Test stop functionality
async function testStopTask() {
    const taskId = process.argv[3];
    if (!taskId) {
        console.log(`${colors.red}❌ Please provide task ID: node test/testSwipe.js stop TASK_ID${colors.reset}`);
        return;
    }
    
    await stopSwipeTask(taskId);
}

// Test active tasks
async function testActiveTasks() {
    console.log(`\n${colors.bright}📋 Active Tasks Test${colors.reset}`);
    await checkActiveSwipeTasks();
}

// Quick start test
async function testQuickStart() {
    const accountIds = TEST_ACCOUNT_IDS.slice(0, 1); // Just first account
    
    console.log(`\n${colors.bright}🚀 Quick Start Test${colors.reset}`);
    const result = await startSwipeTask(accountIds, "Quick Test");
    if (result.success) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        await checkSwipeStatus(result.taskId);
    }
}

// Validate account IDs
function validateAccountIds() {
    if (TEST_ACCOUNT_IDS.includes("684ac67faa9ff42adb90e24a") && TEST_ACCOUNT_IDS.includes("684ac2d648dea6a77a14fcc6")) {
        console.log(`${colors.green}✅ Using example account IDs - they look valid!${colors.reset}`);
        return true;
    }
    
    if (TEST_ACCOUNT_IDS.some(id => id.includes('ACCOUNT_ID'))) {
        console.log(`${colors.red}❌ Please replace example account IDs with real ones!${colors.reset}`);
        return false;
    }
    
    return true;
}

// Run tests based on command line argument
const testType = process.argv[2];

if (!validateAccountIds()) {
    process.exit(1);
}

switch (testType) {
    case 'quick':
        testQuickStart();
        break;
    case 'active':
        testActiveTasks();
        break;
    case 'status':
        testStatusCheck();
        break;
    case 'stop':
        testStopTask();
        break;
    default:
        testSwipeFlow();
}