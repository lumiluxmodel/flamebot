# 📐 Coding Standards & Architecture Rules

## 🚨 GOLDEN RULE: Database is the Single Source of Truth

**NOTHING SHOULD BE HARDCODED. EVERYTHING MUST COME FROM THE DATABASE.**

## 🏗️ Architecture Principles

### 1. **Dependency Injection ONLY**
```javascript
// ✅ CORRECT - Using dependency injection
class WorkflowExecutor {
  constructor(executionService, schedulingService, databaseService) {
    this.executionService = executionService;
    this.schedulingService = schedulingService;
    this.databaseService = databaseService;
  }
}

// ❌ WRONG - Direct instantiation
class WorkflowExecutor {
  constructor() {
    this.executionService = new ExecutionService(); // NO!
    this.databaseService = require('./databaseService'); // NO!
  }
}
```

### 2. **Single Responsibility Principle**
Each service/class should do ONE thing only:
- `WorkflowExecutionService` → Executes steps
- `WorkflowSchedulingService` → Schedules tasks
- `WorkflowMonitoringService` → Monitors progress
- `WorkflowDatabaseService` → Database operations

**NEVER mix responsibilities in a single service.**

### 3. **Service Container Pattern**
All services must be registered in the container:
```javascript
// ✅ CORRECT
container.registerSingleton('myNewService', () => new MyNewService(
  container.get('databaseService'),
  container.get('otherDependency')
));

// ❌ WRONG
const myService = new MyNewService(); // NO!
```

## 💾 Database Rules

### 1. **NO Hardcoded Configurations**
```javascript
// ❌ WRONG - Hardcoded workflow
const workflows = {
  default: {
    steps: [...]
  }
};

// ✅ CORRECT - Load from database
const workflows = await this.databaseService.getAllWorkflowDefinitions();
```

### 2. **NO Hardcoded Values**
```javascript
// ❌ WRONG - Hardcoded models
const AVAILABLE_MODELS = ['Lola', 'Aura', 'Iris'];

// ✅ CORRECT - From database or environment
const models = process.env.AVAILABLE_MODELS.split(',');
// OR
const models = await this.databaseService.getAvailableModels();
```

### 3. **Dynamic Loading**
```javascript
// ✅ CORRECT - Everything loads dynamically
async loadWorkflowDefinitions() {
  const definitions = await this.workflowDb.getAllWorkflowDefinitions();
  this.workflowDefinitions.clear();
  
  for (const def of definitions) {
    if (def.is_active) {
      this.workflowDefinitions.set(def.type, def);
    }
  }
}
```

## 🔧 Service Creation Rules

### 1. **Constructor Injection Only**
```javascript
// ✅ CORRECT
class NewService {
  constructor(databaseService, configService) {
    this.db = databaseService;
    this.config = configService;
  }
}
```

### 2. **Extend EventEmitter for Observable Services**
```javascript
// ✅ CORRECT
class MonitoringService extends EventEmitter {
  constructor() {
    super();
    // ...
  }
  
  trackEvent(event) {
    this.emit('event:tracked', event);
  }
}
```

### 3. **Always Return Promises**
```javascript
// ✅ CORRECT
async performAction(data) {
  try {
    const result = await this.db.query(...);
    return { success: true, data: result };
  } catch (error) {
    throw error; // Let caller handle
  }
}
```

## 📝 Database Query Rules

### 1. **Use Parameterized Queries**
```javascript
// ✅ CORRECT
const result = await this.db.query(
  'SELECT * FROM workflows WHERE type = $1 AND is_active = $2',
  [workflowType, true]
);

// ❌ WRONG - SQL injection risk
const result = await this.db.query(
  `SELECT * FROM workflows WHERE type = '${workflowType}'`
);
```

### 2. **Parse JSONB Fields**
```javascript
// ✅ CORRECT - Handle PostgreSQL JSONB
return result.rows.map(row => ({
  ...row,
  steps: typeof row.steps === 'string' ? JSON.parse(row.steps) : row.steps,
  config: row.config ? (typeof row.config === 'string' ? JSON.parse(row.config) : row.config) : {}
}));
```

### 3. **Transaction Support**
```javascript
// ✅ CORRECT - Use transactions for multiple operations
async createWorkflowWithSteps(workflow, steps) {
  const client = await this.db.getClient();
  try {
    await client.query('BEGIN');
    const workflowResult = await client.query(...);
    const stepsResult = await client.query(...);
    await client.query('COMMIT');
    return { workflow: workflowResult, steps: stepsResult };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
```

## 🎯 Workflow Rules

### 1. **All Workflows from Database**
```javascript
// ❌ WRONG
if (workflowType === 'default') {
  return defaultWorkflowSteps; // NO!
}

// ✅ CORRECT
const workflowDef = await this.workflowDb.getWorkflowDefinition(workflowType);
if (!workflowDef) {
  throw new Error(`Workflow definition not found: ${workflowType}`);
}
```

### 2. **Dynamic Step Execution**
```javascript
// ✅ CORRECT - No hardcoded step logic
async executeStepAction(execution, stepConfig) {
  switch (stepConfig.action) {
    case 'wait':
      return await this.executeWait(execution, stepConfig);
    case 'goto':
      return await this.executeGoto(execution, stepConfig);
    // ... other actions
    default:
      throw new Error(`Unknown step action: ${stepConfig.action}`);
  }
}
```

### 3. **Configuration from Database**
```javascript
// ✅ CORRECT
const workflowConfig = workflowDef.config || {};
const maxRetries = workflowConfig.maxRetries || 3;
const retryDelay = workflowConfig.retryDelay || 60000;
```

## 🚫 What NOT to Do

### 1. **NO Hardcoded Workflows**
```javascript
// ❌ ABSOLUTELY WRONG
const DEFAULT_WORKFLOW = {
  steps: [
    { id: 'wait', action: 'wait', delay: 30000 },
    { id: 'prompt', action: 'add_prompt', delay: 0 }
  ]
};
```

### 2. **NO Direct Service Imports**
```javascript
// ❌ WRONG
const flamebotService = require('./flamebotService');
flamebotService.doSomething();

// ✅ CORRECT
constructor(flamebotService) {
  this.flamebotService = flamebotService;
}
```

### 3. **NO Global State**
```javascript
// ❌ WRONG
let activeWorkflows = {}; // Global variable

// ✅ CORRECT
class WorkflowManager {
  constructor() {
    this.activeWorkflows = new Map(); // Instance property
  }
}
```

### 4. **NO Hardcoded Delays/Timings**
```javascript
// ❌ WRONG
setTimeout(() => {
  executeNext();
}, 30000); // Hardcoded 30 seconds

// ✅ CORRECT
setTimeout(() => {
  executeNext();
}, stepConfig.delay); // From database
```

## 📊 Data Flow Rules

### 1. **Database → Service → Controller → API**
```
Database (PostgreSQL)
    ↓
Service Layer (Business Logic)
    ↓
Controller Layer (Request Handling)
    ↓
API Response
```

### 2. **Never Skip Layers**
```javascript
// ❌ WRONG - Controller accessing database directly
router.post('/workflow', async (req, res) => {
  const result = await db.query('INSERT INTO workflows...'); // NO!
});

// ✅ CORRECT - Through service layer
router.post('/workflow', async (req, res) => {
  const result = await workflowService.createWorkflow(req.body);
  res.json(result);
});
```

## 🧪 Testing Rules

### 1. **Use Test Scope**
```javascript
// ✅ CORRECT
const testScope = workflowExecutor.createTestScope();
await testScope.initialize();
const service = testScope.getService('workflowExecutionService');
```

### 2. **Mock External Services Only**
```javascript
// ✅ CORRECT - Mock only external APIs
jest.mock('../services/flamebotActionsService');

// Use real database service with test data
const workflowDef = await workflowDb.getWorkflowDefinition('test_workflow');
```

## 🔐 Security Rules

### 1. **Validate All Input**
```javascript
// ✅ CORRECT
if (!workflowType || typeof workflowType !== 'string') {
  throw new Error('Invalid workflow type');
}
```

### 2. **Never Log Sensitive Data**
```javascript
// ✅ CORRECT
console.log(`Processing account: ${accountId}`);

// ❌ WRONG
console.log(`Account data: ${JSON.stringify(accountData)}`); // May contain sensitive info
```

## 📚 Configuration Management

### 1. **Environment Variables for Infrastructure**
```javascript
// ✅ CORRECT - Infrastructure config
const dbConfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME
};
```

### 2. **Database for Business Logic**
```javascript
// ✅ CORRECT - Business rules from database
const workflowRules = await this.db.getWorkflowRules();
const modelConfigs = await this.db.getModelConfigurations();
```

## ✅ Checklist for New Features

Before adding any new feature:

1. ✅ Is all configuration coming from the database?
2. ✅ Are you using dependency injection?
3. ✅ Is the service single-responsibility?
4. ✅ Are you following the existing patterns?
5. ✅ Have you avoided hardcoding ANY values?
6. ✅ Is the service registered in the container?
7. ✅ Are you handling errors properly?
8. ✅ Have you added appropriate logging?
9. ✅ Is the code testable with the test scope?
10. ✅ Have you updated the database schema if needed?

## 🚀 Adding New Services

### Step 1: Create Service
```javascript
// src/services/myNewService.js
class MyNewService {
  constructor(databaseService, configService) {
    this.db = databaseService;
    this.config = configService;
  }
  
  async performAction(data) {
    // Implementation
  }
}

module.exports = MyNewService;
```

### Step 2: Register in Container
```javascript
// In workflowServiceContainer.js
container.registerSingleton('myNewService', () => 
  new MyNewService(
    container.get('databaseService'),
    container.get('configService')
  )
);
```

### Step 3: Use in Other Services
```javascript
// In another service
constructor(myNewService) {
  this.myNewService = myNewService;
}
```

## ⚠️ FINAL WARNING

**The database is the ONLY source of truth. If you find yourself typing any configuration, workflow definition, or business rule directly in code, STOP and put it in the database instead.**

Remember: The code should be a generic engine that executes what's defined in the database, not a place where business logic is hardcoded.