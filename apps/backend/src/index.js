// src/index.js - Backend Server with Real Routes Integration
const express = require('express');
const cors = require('cors');
const path = require('path');

// Import route files (existing structure)
const accountRoutes = require('./routes/accountRoutes');
const workflowRoutes = require('./routes/workflowRoutes');
const actionsRoutes = require('./routes/actionsRoutes');
const aiRoutes = require('./routes/aiRoutes');

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

// Serve static files (if needed)
// app.use(express.static(path.join(__dirname, '../../../public')));

// API routes
app.use('/api/accounts', accountRoutes);
app.use('/api/workflows', workflowRoutes);
app.use('/api/actions', actionsRoutes);
app.use('/api/ai', aiRoutes);

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
      // Account Management (from accountRoutes.js)
      accountHealth: 'GET /api/accounts/health',
      getModels: 'GET /api/accounts/models',
      importAccount: 'POST /api/accounts/import',
      importMultiple: 'POST /api/accounts/import-multiple',
      getAccountWorkflow: 'GET /api/accounts/workflow/:accountId',
      stopAccountAutomation: 'POST /api/accounts/workflow/:accountId/stop',
      getAllActiveWorkflows: 'GET /api/accounts/workflows/active',
      getWorkflowStats: 'GET /api/accounts/workflows/stats',
      pauseAllWorkflows: 'POST /api/accounts/workflows/pause-all',
      resumeAllWorkflows: 'POST /api/accounts/workflows/resume-all',
      
      // Workflow Management (from workflowRoutes.js)
      startWorkflow: 'POST /api/workflows/start',
      getWorkflowStatus: 'GET /api/workflows/status/:accountId',
      stopWorkflow: 'POST /api/workflows/stop/:accountId',
      getActiveWorkflows: 'GET /api/workflows/active',
      getWorkflowDefinitions: 'GET /api/workflows/definitions',
      getWorkflowDefinition: 'GET /api/workflows/definitions/:type',
      createDefinition: 'POST /api/workflows/definitions',
      
      // Actions Management (from actionsRoutes.js)
      startSwipe: 'POST /api/actions/swipe',
      getSwipeStatus: 'GET /api/actions/swipe/status/:taskId',
      stopSwipe: 'POST /api/actions/swipe/stop/:taskId',
      getActiveSwipes: 'GET /api/actions/swipe/active',
      enableSpectre: 'POST /api/actions/spectre/enable',
      updateBio: 'POST /api/actions/bio/update',
      updatePrompt: 'POST /api/actions/prompt/update',
      actionsHealth: 'GET /api/actions/health',
      
      // AI Services (from aiRoutes.js)
      aiHealth: 'GET /api/ai/health'
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
