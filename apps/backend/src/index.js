// src/index.js - Updated with ES Modules and Workflow Manager Initialization
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Routes with comprehensive mock endpoints
const accountRoutes = express.Router();
const workflowRoutes = express.Router();
const actionsRoutes = express.Router();

// Mock data generators
const generateMockWorkflow = (id) => ({
  id: `wf_${id}_${Date.now()}`,
  type: ['default', 'premium', 'boost'][Math.floor(Math.random() * 3)],
  status: ['running', 'paused', 'completed', 'error'][Math.floor(Math.random() * 4)],
  accountId: `acc_${Math.floor(Math.random() * 100)}`,
  model: ['eva_cute', 'alice_wild', 'sophia_elegant'][Math.floor(Math.random() * 3)],
  startTime: new Date(Date.now() - Math.random() * 86400000).toISOString(),
  duration: Math.floor(Math.random() * 7200000),
  progress: Math.floor(Math.random() * 100),
  currentStep: Math.floor(Math.random() * 5) + 1,
  totalSteps: 5,
  statistics: {
    swipes: Math.floor(Math.random() * 50),
    matches: Math.floor(Math.random() * 10),
    conversations: Math.floor(Math.random() * 5)
  }
});

const generateMockAlert = (id) => ({
  id: `alert_${id}`,
  severity: ['critical', 'error', 'warning', 'info'][Math.floor(Math.random() * 4)],
  message: [
    'Workflow execution timeout detected',
    'Rate limit exceeded for account',
    'Low success rate detected',
    'System health check completed'
  ][Math.floor(Math.random() * 4)],
  component: ['workflow-engine', 'rate-limiter', 'account-manager'][Math.floor(Math.random() * 3)],
  source: `system_${Math.floor(Math.random() * 5)}`,
  timestamp: new Date(Date.now() - Math.random() * 86400000).toISOString(),
  acknowledged: Math.random() > 0.5,
  acknowledgedAt: Math.random() > 0.5 ? new Date().toISOString() : null
});

// ==============================================
// ACCOUNT ROUTES
// ==============================================
accountRoutes.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Account service is healthy',
    timestamp: new Date().toISOString()
  });
});

accountRoutes.get('/', (req, res) => {
  const accounts = Array.from({ length: 15 }, (_, i) => ({
    id: `acc_${i + 1}`,
    model: ['eva_cute', 'alice_wild', 'sophia_elegant'][i % 3],
    status: ['active', 'paused', 'error'][Math.floor(Math.random() * 3)],
    lastActive: new Date(Date.now() - Math.random() * 86400000).toISOString(),
    statistics: {
      totalSwipes: Math.floor(Math.random() * 1000),
      matches: Math.floor(Math.random() * 50),
      conversations: Math.floor(Math.random() * 25)
    }
  }));

  res.json({
    success: true,
    data: accounts
  });
});

accountRoutes.post('/import', (req, res) => {
  const { model, cookie } = req.body;
  res.json({
    success: true,
    data: {
      accountId: `acc_${Date.now()}`,
      model,
      status: 'imported',
      timestamp: new Date().toISOString()
    }
  });
});

accountRoutes.post('/import-multiple', (req, res) => {
  const accounts = req.body.accounts || [];
  res.json({
    success: true,
    data: {
      successCount: Math.floor(accounts.length * 0.8),
      failedCount: Math.ceil(accounts.length * 0.2),
      imported: accounts.map((_, i) => `acc_${Date.now()}_${i}`)
    }
  });
});

accountRoutes.post('/import-with-workflow', (req, res) => {
  const { model, cookie, workflowType } = req.body;
  res.json({
    success: true,
    data: {
      import: {
        accountId: `acc_${Date.now()}`,
        model,
        status: 'imported'
      },
      workflow: {
        executionId: `wf_${Date.now()}`,
        type: workflowType,
        status: 'started'
      }
    }
  });
});

// ==============================================
// WORKFLOW ROUTES
// ==============================================
workflowRoutes.get('/stats', (req, res) => {
  res.json({
    success: true,
    data: {
      activeExecutions: Math.floor(Math.random() * 10),
      totalExecutions: Math.floor(Math.random() * 100) + 50,
      successRate: Math.floor(Math.random() * 20) + 80,
      executor: {
        totalExecutions: Math.floor(Math.random() * 500) + 100,
        successRate: Math.floor(Math.random() * 15) + 85,
        averageExecutionTime: Math.floor(Math.random() * 3600000) + 1800000
      },
      cronSystem: {
        totalCronJobs: Math.floor(Math.random() * 5) + 2
      },
      taskScheduler: {
        queuedTasks: Math.floor(Math.random() * 20)
      },
      monitoring: {
        alerts: {
          unacknowledged: Math.floor(Math.random() * 3)
        }
      }
    }
  });
});

workflowRoutes.get('/active', (req, res) => {
  const workflows = Array.from({ length: 8 }, (_, i) => generateMockWorkflow(i + 1));
  res.json({
    success: true,
    data: workflows
  });
});

workflowRoutes.get('/health', (req, res) => {
  res.json({
    success: true,
    data: {
      uptime: Date.now() - 86400000,
      status: 'healthy',
      components: {
        database: { healthy: true, latency: Math.floor(Math.random() * 50) + 10 },
        'workflow-engine': { healthy: true, load: Math.floor(Math.random() * 50) + 20 },
        'rate-limiter': { healthy: true, remaining: Math.floor(Math.random() * 1000) + 500 }
      }
    }
  });
});

workflowRoutes.get('/definitions', (req, res) => {
  const definitions = [
    {
      type: 'default',
      name: 'Standard Workflow',
      description: 'Basic swiping and matching workflow',
      isActive: true,
      totalSteps: 5,
      estimatedDuration: 7200000,
      version: '1.0',
      steps: [
        { id: 'step1', action: 'add_bio', description: 'Update profile bio', delay: 5000, critical: false },
        { id: 'step2', action: 'add_prompt', description: 'Set conversation starters', delay: 3000, critical: false },
        { id: 'step3', action: 'swipe_with_spectre', description: 'Start intelligent swiping', delay: 1000, critical: true },
        { id: 'step4', action: 'activate_continuous_swipe', description: 'Enable continuous mode', delay: 0, critical: true },
        { id: 'step5', action: 'wait', description: 'Monitor and maintain', delay: 3600000, critical: false }
      ]
    },
    {
      type: 'premium',
      name: 'Premium Workflow',
      description: 'Advanced workflow with AI optimization',
      isActive: true,
      totalSteps: 7,
      estimatedDuration: 10800000,
      version: '1.2',
      steps: [
        { id: 'step1', action: 'spectre_config', description: 'Configure AI preferences', delay: 2000, critical: true },
        { id: 'step2', action: 'add_bio', description: 'AI-generated bio update', delay: 5000, critical: false },
        { id: 'step3', action: 'add_prompt', description: 'Personalized prompts', delay: 3000, critical: false },
        { id: 'step4', action: 'swipe_with_spectre', description: 'AI-powered swiping', delay: 1000, critical: true },
        { id: 'step5', action: 'activate_continuous_swipe', description: 'Premium continuous mode', delay: 0, critical: true },
        { id: 'step6', action: 'wait', description: 'Advanced monitoring', delay: 1800000, critical: false },
        { id: 'step7', action: 'wait', description: 'Performance optimization', delay: 1800000, critical: false }
      ]
    },
    {
      type: 'boost',
      name: 'Boost Campaign',
      description: 'Short intensive boost session',
      isActive: false,
      totalSteps: 3,
      estimatedDuration: 3600000,
      version: '1.0',
      steps: [
        { id: 'step1', action: 'spectre_config', description: 'Boost configuration', delay: 1000, critical: true },
        { id: 'step2', action: 'swipe_with_spectre', description: 'Intensive swiping', delay: 500, critical: true },
        { id: 'step3', action: 'wait', description: 'Cool down period', delay: 1800000, critical: false }
      ]
    }
  ];

  res.json({
    success: true,
    data: definitions
  });
});

workflowRoutes.post('/definitions', (req, res) => {
  const { name, type, description, steps } = req.body;
  res.json({
    success: true,
    data: {
      type,
      name,
      description,
      isActive: true,
      totalSteps: steps.length,
      estimatedDuration: steps.reduce((total, step) => total + (step.delay || 0), 0),
      version: '1.0',
      steps,
      createdAt: new Date().toISOString()
    }
  });
});

workflowRoutes.get('/examples', (req, res) => {
  res.json({
    success: true,
    data: {
      quickStart: {
        name: 'Quick Start',
        type: 'quick_start',
        description: 'Simple 3-step workflow for beginners',
        steps: [
          { id: 'step1', action: 'add_bio', description: 'Set profile bio', delay: 5000, critical: false },
          { id: 'step2', action: 'swipe_with_spectre', description: 'Start swiping', delay: 1000, critical: true },
          { id: 'step3', action: 'wait', description: 'Wait and monitor', delay: 3600000, critical: false }
        ]
      },
      aggressive: {
        name: 'Aggressive Campaign',
        type: 'aggressive',
        description: 'High-speed swiping with minimal delays',
        steps: [
          { id: 'step1', action: 'spectre_config', description: 'Aggressive settings', delay: 1000, critical: true },
          { id: 'step2', action: 'activate_continuous_swipe', description: 'Continuous swiping', delay: 0, critical: true },
          { id: 'step3', action: 'wait', description: 'Monitor for issues', delay: 1800000, critical: false }
        ]
      }
    }
  });
});

workflowRoutes.post('/:id/pause', (req, res) => {
  res.json({ success: true, message: 'Workflow paused', id: req.params.id });
});

workflowRoutes.post('/:id/resume', (req, res) => {
  res.json({ success: true, message: 'Workflow resumed', id: req.params.id });
});

workflowRoutes.post('/:id/stop', (req, res) => {
  res.json({ success: true, message: 'Workflow stopped', id: req.params.id });
});

workflowRoutes.post('/stop-all', (req, res) => {
  res.json({ success: true, message: 'All workflows stopped' });
});

// ==============================================
// MONITORING ROUTES  
// ==============================================
workflowRoutes.get('/monitoring/dashboard', (req, res) => {
  res.json({
    success: true,
    data: {
      systemOverview: {
        activeWorkflows: Math.floor(Math.random() * 10),
        totalExecutions: Math.floor(Math.random() * 100) + 50,
        successRate: Math.floor(Math.random() * 20) + 80,
        avgDuration: "2.5h"
      },
      workflowDistribution: {
        default: Math.floor(Math.random() * 20) + 10,
        premium: Math.floor(Math.random() * 15) + 5,
        boost: Math.floor(Math.random() * 10) + 2
      },
      recentAlerts: Array.from({ length: 3 }, (_, i) => generateMockAlert(i + 1)),
      systemLoad: {
        cpu: Math.floor(Math.random() * 50) + 20,
        memory: Math.floor(Math.random() * 40) + 30,
        activeWorkflows: Math.floor(Math.random() * 8) + 2
      }
    }
  });
});

workflowRoutes.get('/monitoring/alerts', (req, res) => {
  const { severity, unacknowledged } = req.query;
  let alerts = Array.from({ length: 12 }, (_, i) => generateMockAlert(i + 1));
  
  if (severity && severity !== 'null') {
    alerts = alerts.filter(alert => alert.severity === severity);
  }
  
  if (unacknowledged === 'true') {
    alerts = alerts.filter(alert => !alert.acknowledged);
  }
  
  res.json({
    success: true,
    data: alerts
  });
});

workflowRoutes.post('/monitoring/alerts/:id/acknowledge', (req, res) => {
  res.json({
    success: true,
    message: 'Alert acknowledged',
    id: req.params.id,
    acknowledgedAt: new Date().toISOString()
  });
});

workflowRoutes.post('/monitoring/alerts/acknowledge-multiple', (req, res) => {
  const { alertIds } = req.body;
  res.json({
    success: true,
    message: `${alertIds.length} alerts acknowledged`,
    acknowledgedAt: new Date().toISOString()
  });
});

workflowRoutes.get('/monitoring/system-health', (req, res) => {
  res.json({
    success: true,
    data: {
      uptime: Date.now() - 86400000,
      status: 'healthy',
      components: {
        database: { healthy: true, latency: Math.floor(Math.random() * 50) + 10 },
        'workflow-engine': { healthy: true, load: Math.floor(Math.random() * 50) + 20 },
        'rate-limiter': { healthy: true, remaining: Math.floor(Math.random() * 1000) + 500 },
        'account-manager': { healthy: true, accounts: Math.floor(Math.random() * 50) + 20 }
      }
    }
  });
});

// ==============================================
// ACTIONS ROUTES
// ==============================================
actionsRoutes.get('/tasks', (req, res) => {
  const tasks = Array.from({ length: 6 }, (_, i) => ({
    id: `task_${i + 1}`,
    type: ['swipe', 'bio_update', 'prompt_update'][i % 3],
    status: ['active', 'completed', 'pending'][Math.floor(Math.random() * 3)],
    accountId: `acc_${Math.floor(Math.random() * 20) + 1}`,
    progress: Math.floor(Math.random() * 100),
    startTime: new Date(Date.now() - Math.random() * 3600000).toISOString(),
    estimatedCompletion: new Date(Date.now() + Math.random() * 3600000).toISOString()
  }));

  res.json({
    success: true,
    data: tasks
  });
});

actionsRoutes.get('/models', (req, res) => {
  res.json({
    success: true,
    data: ['eva_cute', 'alice_wild', 'sophia_elegant', 'miranda_fun', 'jessica_smart']
  });
});

// Create Express app
const app = express();

// CORS configuration
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, '../../../public')));

// API routes
app.use('/api/accounts', accountRoutes);
app.use('/api/workflows', workflowRoutes);
app.use('/api/actions', actionsRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Flamebot Backend API v2.0',
    version: '2.0.0',
    status: 'running'
  });
});

// API info endpoint
app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'Flamebot Backend API with Workflow Automation',
    version: '2.0.0',
    features: [
      'Account Import with Auto-Workflow',
      'AI-Powered Bio & Prompt Generation',
      'Automated Swipe Campaigns',
      'Real-time Workflow Monitoring',
      'Scalable Multi-Account Management'
    ],
    endpoints: {
      // Account Management
      accountHealth: 'GET /api/accounts/health',
      getAccounts: 'GET /api/accounts',
      importAccount: 'POST /api/accounts/import',
      importMultiple: 'POST /api/accounts/import-multiple',
      importWithWorkflow: 'POST /api/accounts/import-with-workflow',
      
      // Workflow Management
      getWorkflowStats: 'GET /api/workflows/stats',
      getActiveWorkflows: 'GET /api/workflows/active',
      getWorkflowHealth: 'GET /api/workflows/health',
      getDefinitions: 'GET /api/workflows/definitions',
      createDefinition: 'POST /api/workflows/definitions',
      getExamples: 'GET /api/workflows/examples',
      pauseWorkflow: 'POST /api/workflows/:id/pause',
      resumeWorkflow: 'POST /api/workflows/:id/resume',
      stopWorkflow: 'POST /api/workflows/:id/stop',
      stopAllWorkflows: 'POST /api/workflows/stop-all',
      
      // Monitoring & Alerts
      getDashboard: 'GET /api/workflows/monitoring/dashboard',
      getAlerts: 'GET /api/workflows/monitoring/alerts',
      acknowledgeAlert: 'POST /api/workflows/monitoring/alerts/:id/acknowledge',
      acknowledgeMultiple: 'POST /api/workflows/monitoring/alerts/acknowledge-multiple',
      getSystemHealth: 'GET /api/workflows/monitoring/system-health',
      
      // Actions & Tasks
      getTasks: 'GET /api/actions/tasks',
      getModels: 'GET /api/actions/models'
    }
  });
});

// Error handling
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found'
  });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

// Start server
async function startServer() {
  const PORT = process.env.PORT || 3090;
  
  try {
    console.log(`
╔═══════════════════════════════════════╗
║     Flamebot Backend Server v2.0      ║
║        WITH WORKFLOW AUTOMATION       ║
╠═══════════════════════════════════════╣
║  🚀 Starting server...                ║
╚═══════════════════════════════════════╝
    `);

    const server = app.listen(PORT, () => {
      console.log(`
╔═══════════════════════════════════════╗
║          🎉 SERVER READY 🎉           ║
╠═══════════════════════════════════════╣
║  🚀 Server running on port ${PORT}      ║
║  🌍 Environment: development          ║
║                                       ║
║  📊 API Endpoints:                    ║
║  👉 http://localhost:${PORT}/api          ║
║  👉 http://localhost:${PORT}/api/accounts/health ║
║  👉 http://localhost:${PORT}/api/workflows/stats ║
║                                       ║
║  🔥 Ready for frontend connection!    ║
╚═══════════════════════════════════════╝

Press CTRL+C to stop the server
      `);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('🛑 Shutting down gracefully...');
      server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      console.log('🛑 Shutting down gracefully...');
      server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();
