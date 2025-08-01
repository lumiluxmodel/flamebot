# Workflow System - Technical Documentation

## Overview
The Flamebot Workflow System is a sophisticated automation engine that manages account operations through structured workflows. The system uses a database-first architecture with distributed locking, cron-based scheduling, and transaction-safe operations.

## System Flow: Account Import → Workflow Automation

### 1. Entry Point: Account Import with Automation
**File**: `/src/controllers/accountController.js`
**Function**: `importAccount()` or `importMultipleAccounts()`
**Trigger**: POST request with `startAutomation: true`

```javascript
// Line 149-156
if (startAutomation && realAccountId) {
  workflowResult = await workflowManager.startAccountAutomation(
    realAccountId,
    workflowType  // default: "default"
  );
}
```

### 2. Workflow Manager Initialization
**File**: `/src/services/workflowManager.js`
**Function**: `startAccountAutomation(accountId, workflowType)`
**Line**: 90-124

**Process**:
1. Validates workflow manager is initialized
2. Loads account data from database (DATABASE-FIRST approach)
3. Validates account has required model/channel data
4. Delegates to workflow executor

```javascript
// Line 104
const accountData = await accountDatabaseService.loadAccountData(accountId);

// Line 120-124  
const result = await this.executor.startExecution(
  accountId,
  accountData,
  workflowType
);
```

### 3. Workflow Executor - Core Engine
**File**: `/src/services/workflowExecutorImproved.js` 
**Function**: `startExecution(accountId, accountData, workflowType)`
**Line**: 86-135

**Critical Process**:
1. **Distributed Locking**: Prevents multiple workflows for same account
2. **Workflow Definition Lookup**: Loads workflow from database
3. **Workflow Instance Creation**: Creates database record with transaction protection
4. **Execution Context Setup**: Prepares runtime environment
5. **First Step Execution**: Starts the workflow

```javascript
// Line 91 - Distributed lock
return await this.lockService.withLock(`workflow:${accountId}:start`, async () => {
  
  // Line 93 - Get workflow definition
  const workflowDef = await this.workflowDb.getWorkflowDefinition(workflowType);
  
  // Line 99 - Create workflow instance
  const workflowInstance = await this.workflowDb.createWorkflowInstance({
    accountId,
    workflowType,
    accountData,
    totalSteps: workflowDef.steps.length,
    executionContext: {}
  });
  
  // Line 129 - Start first step
  await this.processNextStep(execution);
});
```

### 4. Step Processing Engine
**File**: `/src/services/workflowExecutorImproved.js`
**Function**: `processNextStep(execution)`
**Line**: 170-235

**Step Execution Flow**:
1. **Step Validation**: Checks if more steps exist
2. **Distributed Locking**: Locks account for step execution  
3. **Step Execution**: Executes current step action
4. **Context Update**: Stores step results
5. **Progress Tracking**: Updates monitoring metrics
6. **Next Step Scheduling**: Schedules next step with delay

```javascript
// Line 175 - Lock for step execution
await this.lockService.executeStepWithLock(accountId, async () => {
  
  // Line 183 - Execute step
  const stepResult = await this.executeStep(execution, stepConfig);
  
  // Line 212-216 - Schedule next step
  const taskId = await this.schedulingService.scheduleNextStep(
    execution, 
    nextStep, 
    execution.currentStep
  );
});
```

### 5. Step Execution Service
**File**: `/src/services/workflowExecutionService.js`
**Function**: `executeStepAction(execution, stepConfig)`
**Line**: 24-76

**Supported Actions**:
- `add_prompt`: AI-generated prompts using account's model/channel
- `add_bio`: AI-generated bio content  
- `swipe_with_spectre`: Automated swiping with Spectre configuration
- `wait`: Delay execution
- `goto`: Jump to specific step (loop support)

```javascript
// Line 31-54 - Action dispatcher
switch (action) {
  case "add_prompt":
    result = await this.executeAddPrompt(execution, stepConfig);
    break;
  case "add_bio":
    result = await this.executeAddBio(execution, stepConfig);
    break;
  case "swipe_with_spectre":
    result = await this.executeSwipe(execution, stepConfig);
    break;
  case "wait":
    result = await this.executeWait(execution, stepConfig);
    break;
  case "goto":
    result = await this.executeGoto(execution, stepConfig);
    break;
}
```

### 6. Task Scheduling System
**File**: `/src/services/workflowSchedulingService.js`
**Function**: `scheduleNextStep(execution, stepConfig, stepIndex)`
**Line**: 41-70

**Scheduling Process**:
1. **Delay Calculation**: Processes step delay configuration
2. **Task ID Generation**: Creates unique task identifier
3. **Task Scheduler**: Registers with task scheduler
4. **Database Storage**: Persists scheduled task
5. **Workflow Update**: Updates workflow instance state

```javascript
// Line 51 - Create scheduled task in database
await this.workflowDb.createScheduledTask({
  taskId,
  workflowInstanceId: execution.workflowInstanceId,
  stepId: nextStep.id,
  action: "execute_workflow_step",
  scheduledFor: executeAt,
  payload: {
    accountId: execution.accountId,
    stepId: nextStep.id,
    stepConfig: nextStep,
  }
});
```

### 7. Cron-Based Task Execution
**File**: `/src/services/cronManager.js`
**Function**: `processDueTasks()`
**Line**: 303-347

**Cron Process** (runs every minute):
1. **Query Due Tasks**: Gets tasks scheduled for execution
2. **Task Status Update**: Marks as running
3. **Task Execution**: Delegates to task scheduler
4. **Result Handling**: Updates task status based on result
5. **Retry Logic**: Handles failures with exponential backoff

```javascript
// Line 305 - Get due tasks
const dueTasks = await workflowDb.getDueScheduledTasks();

// Line 311-317 - Process each task
for (const task of dueTasks) {
  await workflowDb.updateScheduledTask(task.task_id, 'running');
  const result = await this.executeWorkflowTask(task);
}
```

### 8. Task Scheduler Execution
**File**: `/src/services/taskScheduler.js`
**Function**: `executeTask(task)` → `executeWorkflowStep(task)`
**Line**: 53-123 → 130-139

**Task Execution**:
1. **Task Validation**: Checks executor exists for action
2. **Active Task Tracking**: Monitors concurrent executions
3. **Delegation**: Calls workflow executor for step execution
4. **Statistics Update**: Tracks execution metrics

```javascript
// Line 135-138 - Delegate to workflow executor
const workflowExecutor = require('./workflowExecutorV2');
return await workflowExecutor.executeWorkflowStep(payload);
```

### 9. Database Tables Used

#### Core Tables:
1. **`workflow_definitions`**: Stores workflow templates
   - `type`: Workflow identifier ("default", "test", etc.)
   - `steps`: JSONB array of step configurations
   - `config`: Additional workflow settings

2. **`workflow_instances`**: Active workflow executions
   - `account_id`: Associated account
   - `workflow_id`: Reference to definition
   - `status`: Current state (active, paused, completed, failed)
   - `current_step`: Current step index
   - `account_data`: JSONB account information
   - `execution_context`: JSONB runtime data

3. **`scheduled_tasks`**: Pending step executions
   - `task_id`: Unique task identifier
   - `workflow_instance_id`: Parent workflow
   - `step_id`: Step to execute
   - `action`: Action type
   - `scheduled_for`: Execution timestamp
   - `status`: Task state
   - `payload`: JSONB execution data

4. **`workflow_locks`**: Distributed locking
   - `lock_key`: Lock identifier
   - `locked_by`: Instance holding lock
   - `expires_at`: Lock expiration

5. **`accounts`**: Account data storage
   - `flamebot_id`: Account identifier
   - `model_id`: AI model reference
   - `channel_id`: Channel reference
   - Account credentials and configuration

## Available Workflows

### Default Workflow
**Type**: `default`
**Steps**:
1. **Initial Wait**: 2 hours delay after import
2. **Add Prompt**: AI-generated prompt using account model/channel  
3. **Wait**: 1 minute delay
4. **Swipe with Spectre**: Automated swiping
5. **Goto Loop**: Repeats swipe step
6. **Final Wait**: 13 hours delay

### Test Workflow  
**Type**: `test`
**Steps**:
1. **Wait**: 30 seconds
2. **Add Prompt**: AI prompt generation
3. **Test Swipe**: 5 swipes
4. **Add Bio**: After 2 minutes

### Aggressive Workflow
**Type**: `aggressive` 
**Steps**:
1. **Wait**: 5 minutes
2. **Add Prompt**: AI prompt
3. **First Swipe**: 15 swipes
4. **Add Bio**: After 1 hour
5. **Continuous Swipe**: 25-35 swipes every 30-60 minutes

## Key Functions Called

### SQL Functions:
- `acquire_workflow_lock(lock_key, instance_id, timeout)`: Distributed locking
- `release_workflow_lock(lock_key, instance_id)`: Lock release
- `has_workflow_lock(lock_key)`: Lock status check
- `has_active_workflow(account_id)`: Active workflow check

### Core Services:
- `workflowManager.startAccountAutomation()`: Entry point
- `workflowExecutorImproved.startExecution()`: Workflow initialization
- `workflowExecutorImproved.processNextStep()`: Step processing
- `workflowSchedulingService.scheduleNextStep()`: Task scheduling
- `workflowExecutionService.executeStepAction()`: Step execution
- `cronManager.processDueTasks()`: Scheduled task processing
- `taskScheduler.executeTask()`: Task execution
- `accountDatabaseService.loadAccountData()`: Account data loading

### External Service Calls:
- `flamebotActionsService.updatePrompt()`: Prompt updates
- `flamebotActionsService.updateBio()`: Bio updates  
- `flamebotActionsService.startSwipeTask()`: Swiping operations
- `aiService.generatePrompt()`: AI prompt generation
- `aiService.generateBio()`: AI bio generation

## Error Handling and Recovery

### Distributed Locking:
- Prevents concurrent workflow execution for same account
- Automatic lock expiration and cleanup
- Retry mechanisms for lock conflicts

### Database Transactions:
- Workflow instance creation with transaction protection
- Scheduled task creation with duplicate detection
- Rollback on failures

### Task Retry Logic:
- Exponential backoff for failed tasks
- Maximum retry attempts per task
- Graceful degradation on persistent failures

### Monitoring and Cleanup:
- Active workflow monitoring
- Automatic cleanup of expired locks
- Workflow instance state tracking
- Performance metrics collection

## Configuration Points

### Environment Variables:
- Database connection parameters
- Cron schedule configurations
- Lock timeout settings
- Retry attempt limits

### Workflow Definitions:
- Stored in `workflow_definitions` table
- JSONB step configurations
- Extensible action types
- Per-step critical flags

### System Limits:
- Maximum concurrent tasks: 10
- Default lock timeout: 5 minutes
- Task cleanup interval: 7 days
- Health check frequency: 5 minutes