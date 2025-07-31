# 📚 Workflow System Documentation

## 🏗️ Architecture Overview

The workflow system is built with a **microservices architecture** using **dependency injection** and the **Single Responsibility Principle**. Each service handles one specific aspect of workflow execution.

### Core Services

```
┌─────────────────────────────────────────────────────────────┐
│                   WorkflowExecutorV2                        │
│                  (Factory & Entry Point)                    │
└─────────────────────┬───────────────────────────────────────┘
                      │
        ┌─────────────┴─────────────┐
        │  WorkflowServiceContainer │
        │    (Dependency Injection) │
        └─────────────┬─────────────┘
                      │
    ┌─────────────────┼─────────────────────────────────┐
    │                 │                                 │
┌───┴────┐    ┌──────┴──────┐    ┌────────────┐   ┌───┴────────┐
│Execution│    │ Scheduling  │    │ Monitoring │   │  Recovery  │
│Service  │    │  Service    │    │  Service   │   │  Service   │
└─────────┘    └─────────────┘    └────────────┘   └────────────┘
```

## 🚀 How Workflows Work

### 1. Workflow Definition

Workflows are stored in the `workflow_definitions` table with the following structure:

```javascript
{
  name: "Workflow Name",
  type: "workflow_type",  // Unique identifier
  description: "What this workflow does",
  steps: [
    {
      id: "unique_step_id",
      action: "step_action",
      delay: 0,              // Milliseconds to wait before execution
      // Action-specific parameters
    }
  ],
  is_active: true
}
```

### 2. Available Step Actions

#### **wait**
Pauses execution for a specified time.
```javascript
{
  id: "wait_30s",
  action: "wait",
  delay: 30000,
  description: "Wait 30 seconds"
}
```

#### **add_prompt**
Generates and adds an AI prompt to the account.
```javascript
{
  id: "add_prompt",
  action: "add_prompt",
  delay: 0,
  model: "Lola",      // Optional: defaults to account model
  channel: "gram",    // Optional: defaults to account channel
  critical: true      // Optional: fail workflow if this fails
}
```

#### **add_bio**
Generates and adds a bio to the account.
```javascript
{
  id: "add_bio",
  action: "add_bio",
  delay: 0,
  bio: "Custom bio",  // Optional: custom bio text
  critical: false
}
```

#### **swipe_with_spectre**
Performs automated swiping with Spectre integration.
```javascript
{
  id: "swipe_session",
  action: "swipe_with_spectre",
  delay: 0,
  swipeCount: 20,     // Number of swipes
  critical: true
}
```


#### **goto** ⭐ NEW!
Jumps to a specific step, enabling loops and conditional flows.
```javascript
{
  id: "loop_back",
  action: "goto",
  delay: 0,
  nextStep: "target_step_id",  // Required: ID of step to jump to
  description: "Loop back to swipe"
}
```

### 3. Workflow Execution Flow

1. **Start Execution**
   ```javascript
   const result = await workflowExecutor.startExecution(
     accountId,
     accountData,
     workflowType
   );
   ```

2. **Create Instance**: A new entry is created in `workflow_instances` table
3. **Process Steps**: Each step is executed sequentially
4. **Handle Delays**: Steps are scheduled based on their delay
5. **Track Progress**: Monitoring service tracks execution
6. **Complete/Fail**: Workflow completes or fails based on results

## 🔄 Goto Step - Creating Loops

The `goto` step enables powerful workflow patterns:

### Simple Loop
```javascript
steps: [
  { id: "start", action: "wait", delay: 1000 },
  { id: "swipe", action: "swipe_with_spectre", swipeCount: 10, delay: 0 },
  { id: "wait", action: "wait", delay: 60000 },
  { id: "loop", action: "goto", nextStep: "swipe", delay: 0 }
]
```
This creates: start → swipe → wait → loop back to swipe

### Conditional Skip
```javascript
steps: [
  { id: "check", action: "wait", delay: 0 },
  { id: "skip_to_end", action: "goto", nextStep: "finish", delay: 0 },
  { id: "middle_steps", action: "wait", delay: 5000 },
  { id: "finish", action: "add_bio", delay: 0 }
]
```

## 📁 Service Architecture Details

### WorkflowExecutorV2 (Factory)
- Entry point for all workflow operations
- Creates test scopes for testing
- Manages service container lifecycle

### WorkflowServiceContainer
- Implements dependency injection
- Manages service lifecycle
- Provides service resolution

### WorkflowExecutorRefactored
- Orchestrates workflow execution
- Loads definitions from database
- Manages execution state
- Coordinates between services

### WorkflowExecutionService
- Executes individual step actions
- Integrates with Flamebot API
- Handles step-specific logic

### WorkflowSchedulingService
- Schedules delayed steps
- Manages task timing
- Handles retry logic

### WorkflowMonitoringService
- Tracks execution progress
- Collects metrics
- Provides real-time status

### WorkflowRecoveryService
- Recovers interrupted workflows
- Handles system restarts
- Manages failure recovery

### WorkflowDatabaseService
- All database operations
- CRUD for definitions and instances
- Query optimization

## 🗄️ Database Schema

### workflow_definitions
```sql
id              SERIAL PRIMARY KEY
name            VARCHAR(100) NOT NULL
type            VARCHAR(50) UNIQUE NOT NULL
description     TEXT
steps           JSONB NOT NULL
config          JSONB DEFAULT '{}'
is_active       BOOLEAN DEFAULT true
version         INTEGER DEFAULT 1
created_at      TIMESTAMP
updated_at      TIMESTAMP
```

### workflow_instances
```sql
id                SERIAL PRIMARY KEY
workflow_id       INTEGER REFERENCES workflow_definitions(id)
account_id        VARCHAR(100) NOT NULL
status            VARCHAR(20) CHECK (status IN ('active','completed','failed','stopped','paused'))
current_step      INTEGER DEFAULT 0
total_steps       INTEGER NOT NULL
account_data      JSONB
execution_context JSONB DEFAULT '{}'
started_at        TIMESTAMP
completed_at      TIMESTAMP
error_message     TEXT
-- Additional tracking fields
```

## 🧪 Testing Workflows

### Unit Tests
```javascript
// Test individual step execution
const executionService = testScope.getService('workflowExecutionService');
const result = await executionService.executeStepAction(execution, stepConfig);
```

### Integration Tests
```javascript
// Test complete workflow execution
const result = await testScope.getWorkflowExecutor().startExecution(
  accountId,
  accountData,
  workflowType
);
```

### Creating Test Workflows
```javascript
// Use scripts/createTestWorkflow.js to add test workflows
const { Client } = require('pg');
// ... create workflow in database
```

## 🚦 Workflow States

- **active**: Currently executing
- **completed**: Finished successfully
- **failed**: Encountered an error
- **stopped**: Manually stopped
- **paused**: Temporarily paused

## 🛠️ Common Operations

### Start a Workflow
```javascript
POST /api/workflows/execute
{
  "accountId": "account-123",
  "workflowType": "default"
}
```

### Check Status
```javascript
GET /api/workflows/status/{accountId}
```

### Stop Execution
```javascript
POST /api/workflows/{accountId}/stop
```

### List Active Workflows
```javascript
GET /api/workflows/active
```

## 📊 Monitoring & Metrics

The monitoring service tracks:
- Execution duration
- Step completion rates
- Error frequencies
- Loop iterations
- Performance metrics

## 🔧 Configuration

### Environment Variables
```env
DB_HOST=your-database-host
DB_PORT=5432
DB_NAME=your-database
DB_USER=postgres
DB_PASSWORD=your-password
```

### Workflow Configuration
Workflows support optional config:
```javascript
config: {
  maxRetries: 3,
  retryDelay: 60000,
  allowLoops: true,
  maxLoopIterations: 10
}
```

## 🎯 Best Practices

1. **Use meaningful step IDs**: Make them descriptive
2. **Set appropriate delays**: Don't overload the system
3. **Handle failures**: Use `critical: false` for non-essential steps
4. **Test thoroughly**: Use the test scope for testing
5. **Monitor execution**: Check logs and metrics
6. **Document workflows**: Add clear descriptions

## 🚨 Important Notes

- Workflows are **account-specific**: Only one active workflow per account
- Steps execute **sequentially** unless marked as `parallel: true`
- **Goto loops** have built-in infinite loop protection
- All times are in **milliseconds**
- Database uses **PostgreSQL** with JSONB support

## 📚 Example Workflows

### Basic Linear Workflow
```javascript
{
  name: "Basic Onboarding",
  type: "onboarding",
  steps: [
    { id: "wait_initial", action: "wait", delay: 30000 },
    { id: "add_prompt", action: "add_prompt", delay: 0 },
    { id: "wait_before_bio", action: "wait", delay: 60000 },
    { id: "add_bio", action: "add_bio", delay: 0 },
    { id: "first_swipe", action: "swipe_with_spectre", swipeCount: 20, delay: 0 }
  ]
}
```

### Loop Workflow with Goto
```javascript
{
  name: "Continuous Activity",
  type: "continuous_loop",
  steps: [
    { id: "start", action: "add_prompt", delay: 0 },
    { id: "swipe_session", action: "swipe_with_spectre", swipeCount: 15, delay: 0 },
    { id: "rest", action: "wait", delay: 300000 }, // 5 minutes
    { id: "loop", action: "goto", nextStep: "swipe_session", delay: 0 }
  ]
}
```

### Advanced Workflow with Parallel Steps
```javascript
{
  name: "Advanced Automation",
  type: "advanced",
  steps: [
    { id: "setup", action: "wait", delay: 10000 },
    { id: "prompt", action: "add_prompt", delay: 0 },
    { id: "activate_auto", action: "activate_continuous_swipe", delay: 0 },
    // These run in parallel to the main flow
    { id: "update_bio_later", action: "add_bio", delay: 7200000, parallel: true },
    { id: "refresh_prompt", action: "add_prompt", delay: 14400000, parallel: true }
  ]
}
```

---

This documentation represents the current state of the workflow system with all refactoring completed and the new `goto` functionality fully implemented and tested.