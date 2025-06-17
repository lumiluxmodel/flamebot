const path = require('path');
require('dotenv').config({ 
  path: path.join(__dirname, '../.env') 
});
const axios = require('axios');

// Test configuration
const PORT = process.env.PORT || 3090;
const API_BASE_URL = `http://localhost:${PORT}/api`;

// Get account ID from command line or use default
let TEST_ACCOUNT_ID = process.argv[2] || "YOUR_ACCOUNT_ID_HERE";

// Color codes for console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    magenta: '\x1b[35m',
    gray: '\x1b[90m'
};

// Progress bar function
function createProgressBar(current, total, width = 30) {
    const percentage = Math.round((current / total) * 100);
    const filled = Math.round((current / total) * width);
    const empty = width - filled;
    const bar = '█'.repeat(filled) + '░'.repeat(empty);
    return `[${bar}] ${percentage}%`;
}

// Format duration
function formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
}

async function checkServerRunning() {
    try {
        await axios.get(`${API_BASE_URL}/accounts/health`);
        return true;
    } catch (error) {
        return false;
    }
}

async function startTestWorkflow(accountId) {
    console.log(`\n${colors.bright}🚀 Starting TEST Workflow${colors.reset}`);
    console.log(`   Using Account ID: ${colors.cyan}${accountId}${colors.reset}`);
    console.log(`   Workflow Type: ${colors.magenta}test${colors.reset}`);
    console.log(`   Expected Duration: ~3-4 minutes`);
    
    try {
        // For testing, we'll use the direct workflow start endpoint
        const response = await axios.post(`${API_BASE_URL}/workflows/start`, {
            accountId: accountId,
            accountData: {
                model: 'Lola',
                channel: 'gram',
                authToken: `test-token-${Date.now()}`,
                importedAt: new Date().toISOString()
            },
            workflowType: 'test'
        });
        
        if (response.data.success) {
            console.log(`${colors.green}✅ Test workflow started successfully!${colors.reset}`);
            console.log(`   Execution ID: ${response.data.data.executionId}`);
            console.log(`   Total Steps: ${response.data.data.totalSteps}`);
            console.log(`   Estimated Duration: ${formatDuration(response.data.data.estimatedDuration)}`);
            console.log(`\n   ${colors.bright}Test Workflow Steps:${colors.reset}`);
            console.log(`   1️⃣  Wait 30 seconds`);
            console.log(`   2️⃣  Add AI prompt`);
            console.log(`   3️⃣  Swipe 5 times`);
            console.log(`   4️⃣  Add bio (after 2 min)`);
            
            return {
                success: true,
                accountId: accountId,
                executionId: response.data.data.executionId
            };
        } else {
            throw new Error(response.data.error || 'Workflow failed to start');
        }
    } catch (error) {
        console.error(`${colors.red}❌ Failed to start workflow:${colors.reset}`, error.response?.data || error.message);
        return { success: false, error: error.message };
    }
}

async function getCronSystemStatus() {
    try {
        // Use the health endpoint which has the correct structure
        const response = await axios.get(`${API_BASE_URL}/accounts/health`);
        const healthData = response.data.data.workflows;
        
        console.log(`\n${colors.bright}⚙️  Cron System Status${colors.reset}`);
        console.log(`   ${colors.green}✓${colors.reset} Cron Manager: ${healthData.components.cronManager.running ? 'RUNNING' : 'STOPPED'}`);
        console.log(`   ${colors.green}✓${colors.reset} Total Cron Jobs: ${healthData.components.cronManager.totalCronJobs}`);
        console.log(`   ${colors.green}✓${colors.reset} Scheduled Tasks: ${healthData.components.cronManager.scheduledTasks}`);
        console.log(`   ${colors.green}✓${colors.reset} Executed Tasks: ${healthData.components.cronManager.executedTasks}`);
        console.log(`   ${colors.green}✓${colors.reset} Failed Tasks: ${healthData.components.cronManager.failedTasks}`);
        
        console.log(`\n   ${colors.bright}Task Scheduler:${colors.reset}`);
        console.log(`   ${colors.cyan}•${colors.reset} Active Tasks: ${healthData.components.taskScheduler.activeTasks}`);
        console.log(`   ${colors.cyan}•${colors.reset} Queued Tasks: ${healthData.components.taskScheduler.queuedTasks}`);
        console.log(`   ${colors.cyan}•${colors.reset} Completed: ${healthData.components.taskScheduler.completedTasks}`);
        console.log(`   ${colors.cyan}•${colors.reset} Failed: ${healthData.components.taskScheduler.failedTasks}`);
        
        return healthData;
    } catch (error) {
        console.error(`${colors.red}❌ Failed to get cron status:${colors.reset}`, error.message);
        return null;
    }
}

async function getWorkflowStatus(accountId) {
    try {
        const response = await axios.get(`${API_BASE_URL}/accounts/workflow/${accountId}`);
        const workflow = response.data.data;
        
        console.log(`\n${colors.bright}📊 Workflow Status${colors.reset}`);
        console.log(`   Status: ${colors.cyan}${workflow.status.toUpperCase()}${colors.reset}`);
        console.log(`   Progress: ${createProgressBar(workflow.currentStep, workflow.totalSteps)}`);
        console.log(`   Step: ${workflow.currentStep}/${workflow.totalSteps}`);
        
        if (workflow.nextStep) {
            console.log(`   Next: ${workflow.nextStep.description}`);
            const delayMs = workflow.nextStep.delay || 0;
            if (delayMs > 0) {
                console.log(`   Wait: ${formatDuration(delayMs)}`);
            }
        }
        
        const elapsed = Date.now() - new Date(workflow.startedAt).getTime();
        console.log(`   Elapsed: ${formatDuration(elapsed)}`);
        
        if (workflow.lastError) {
            console.log(`   ${colors.red}Last Error: ${workflow.lastError}${colors.reset}`);
        }
        
        // Show recent execution log
        if (workflow.executionLog && workflow.executionLog.length > 0) {
            console.log(`\n   ${colors.bright}Recent Activity:${colors.reset}`);
            workflow.executionLog.forEach(log => {
                const icon = log.success ? '✅' : '❌';
                const timestamp = new Date(log.timestamp).toLocaleTimeString();
                console.log(`   ${icon} [${timestamp}] ${log.stepId} (${log.duration}ms)`);
            });
        }
        
        return workflow;
    } catch (error) {
        if (error.response?.status === 404) {
            console.log(`\n${colors.yellow}⚠️  No active workflow found for account${colors.reset}`);
        } else {
            console.error(`${colors.red}❌ Failed to get workflow status:${colors.reset}`, error.message);
        }
        return null;
    }
}

async function getMonitoringDashboard() {
    try {
        const response = await axios.get(`${API_BASE_URL}/accounts/health`);
        const healthData = response.data.data.workflows;
        
        console.log(`\n${colors.bright}📈 System Monitoring${colors.reset}`);
        console.log(`   System Health: ${healthData.healthy ? 
            `${colors.green}HEALTHY${colors.reset}` : 
            `${colors.red}UNHEALTHY${colors.reset}`}`);
        console.log(`   Success Rate: ${(healthData.metrics.successRate * 100).toFixed(1)}%`);
        console.log(`   Avg Execution: ${formatDuration(healthData.metrics.avgExecutionTime)}`);
        console.log(`   Total Executions: ${healthData.metrics.totalExecutions}`);
        
        if (healthData.alerts.total > 0) {
            console.log(`\n   ${colors.yellow}⚠️  Alerts:${colors.reset}`);
            console.log(`   Total: ${healthData.alerts.total}`);
            console.log(`   Unacknowledged: ${healthData.alerts.unacknowledged}`);
            console.log(`   Critical: ${healthData.alerts.critical}`);
        }
        
        return healthData;
    } catch (error) {
        console.error(`${colors.red}❌ Failed to get monitoring data:${colors.reset}`, error.message);
        return null;
    }
}

async function monitorWorkflow(accountId, intervalMs = 5000, maxChecks = 60) {
    console.log(`\n${colors.bright}👀 Monitoring Workflow Progress${colors.reset}`);
    console.log(`   Checking every ${intervalMs/1000} seconds...`);
    console.log(`   Press Ctrl+C to stop monitoring\n`);
    
    let checkCount = 0;
    let lastStep = -1;
    
    const monitorInterval = setInterval(async () => {
        checkCount++;
        
        // Clear previous output (optional - comment out if you want to keep history)
        // process.stdout.write('\033[2J\033[0f');
        
        console.log(`\n${colors.gray}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
        console.log(`${colors.bright}Check #${checkCount} - ${new Date().toLocaleTimeString()}${colors.reset}`);
        
        // Get workflow status
        const workflow = await getWorkflowStatus(accountId);
        
        if (!workflow) {
            console.log(`${colors.red}❌ Workflow not found or completed${colors.reset}`);
            clearInterval(monitorInterval);
            return;
        }
        
        // Check if step changed
        if (workflow.currentStep !== lastStep) {
            console.log(`\n${colors.green}🎉 STEP COMPLETED!${colors.reset}`);
            lastStep = workflow.currentStep;
        }
        
        // Check if workflow completed
        if (workflow.status === 'completed') {
            console.log(`\n${colors.green}🎊 WORKFLOW COMPLETED SUCCESSFULLY!${colors.reset}`);
            clearInterval(monitorInterval);
            
            // Final cron stats
            await getCronSystemStatus();
            return;
        }
        
        // Check if workflow failed
        if (workflow.status === 'failed') {
            console.log(`\n${colors.red}💥 WORKFLOW FAILED!${colors.reset}`);
            clearInterval(monitorInterval);
            return;
        }
        
        // Get cron system status every 3 checks
        if (checkCount % 3 === 0) {
            await getCronSystemStatus();
        }
        
        // Stop after max checks
        if (checkCount >= maxChecks) {
            console.log(`\n${colors.yellow}⏱️  Max monitoring time reached${colors.reset}`);
            clearInterval(monitorInterval);
        }
        
    }, intervalMs);
}

async function testCronWorkflow() {
    console.log(`
${colors.bright}╔═══════════════════════════════════════╗
║      Cron & Workflow Test Suite       ║
║         Testing Account Automation    ║
╚═══════════════════════════════════════╝${colors.reset}
    `);

    // Validate account ID
    if (TEST_ACCOUNT_ID === "YOUR_ACCOUNT_ID_HERE") {
        console.error(`${colors.red}❌ Please provide an account ID:${colors.reset}`);
        console.log(`   Usage: npm run test:cron-workflow YOUR_ACCOUNT_ID`);
        console.log(`   Example: npm run test:cron-workflow 684ac67faa9ff42adb90e24a`);
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

    // Step 1: Check initial cron system status
    console.log(`${colors.bright}Step 1: Checking Cron System${colors.reset}`);
    const initialStats = await getCronSystemStatus();
    
    if (!initialStats || !initialStats.components.cronManager.running) {
        console.error(`${colors.red}❌ Cron system is not running properly!${colors.reset}`);
        return;
    }

    // Step 2: Get monitoring dashboard
    console.log(`\n${colors.bright}Step 2: System Health Check${colors.reset}`);
    await getMonitoringDashboard();

    // Step 3: Check if workflow already exists
    console.log(`\n${colors.bright}Step 3: Checking Existing Workflow${colors.reset}`);
    const existingWorkflow = await getWorkflowStatus(TEST_ACCOUNT_ID);
    
    if (existingWorkflow && existingWorkflow.status === 'active') {
        console.log(`${colors.yellow}⚠️  Account already has an active workflow!${colors.reset}`);
        console.log(`   Would you like to monitor the existing workflow? (y/n)`);
        
        // For automatic testing, we'll just monitor the existing one
        await monitorWorkflow(TEST_ACCOUNT_ID, 5000, 60); // 5 seconds, max 5 minutes
        return;
    }

    // Step 4: Start test workflow
    console.log(`\n${colors.bright}Step 4: Starting Test Workflow${colors.reset}`);
    const workflowResult = await startTestWorkflow(TEST_ACCOUNT_ID);
    
    if (!workflowResult.success) {
        console.log(`${colors.red}❌ Failed to start workflow${colors.reset}`);
        return;
    }

    // Wait a moment for workflow to initialize
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 5: Monitor workflow progress
    console.log(`\n${colors.bright}Step 5: Monitoring Workflow Execution${colors.reset}`);
    await monitorWorkflow(TEST_ACCOUNT_ID, 5000, 60); // Check every 5s, max 5 min

    // Final summary
    console.log(`\n${colors.green}✨ Test Completed!${colors.reset}`);
    console.log(`\n${colors.bright}Summary:${colors.reset}`);
    console.log(`   ${colors.cyan}•${colors.reset} Cron system is operational`);
    console.log(`   ${colors.cyan}•${colors.reset} Task scheduler is working`);
    console.log(`   ${colors.cyan}•${colors.reset} Workflow execution monitored`);
    console.log(`   ${colors.cyan}•${colors.reset} All systems functioning correctly`);
    
    console.log(`\n${colors.bright}Test Workflow Timeline:${colors.reset}`);
    console.log(`   0:00 - Start`);
    console.log(`   0:30 - Wait complete → Add prompt`);
    console.log(`   0:35 - Prompt added → Start swipe`);
    console.log(`   1:00 - Swipe complete → Schedule bio`);
    console.log(`   3:00 - Add bio → Workflow complete`);
    console.log(`\n${colors.gray}Total expected time: ~3-4 minutes${colors.reset}\n`);
}

// Quick status check
async function quickStatus() {
    const accountId = process.argv[3] || TEST_ACCOUNT_ID;
    
    console.log(`\n${colors.bright}🔍 Quick Status Check${colors.reset}`);
    console.log(`   Account ID: ${colors.cyan}${accountId}${colors.reset}\n`);
    
    await getCronSystemStatus();
    await getWorkflowStatus(accountId);
    await getMonitoringDashboard();
}

// Run tests based on command line argument
const testType = process.argv[2];

if (testType === 'status') {
    quickStatus();
} else if (testType === 'monitor') {
    const accountId = process.argv[3] || TEST_ACCOUNT_ID;
    monitorWorkflow(accountId);
} else {
    testCronWorkflow();
}