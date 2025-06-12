// src/index.js - Updated with Workflow Manager Initialization
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const config = require('./config');

// Services
const workflowManager = require('./services/workflowManager');

// Routes
const accountRoutes = require('./routes/accountRoutes');
const aiRoutes = require('./routes/aiRoutes');
const actionsRoutes = require('./routes/actionsRoutes');

// Middleware
const { errorHandler, notFoundHandler } = require('./middlewares/errorHandler');

// Swagger
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./flamebot-api-openapi.json');

// Create Express app
const app = express();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: '*', // Configure according to your needs
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use(morgan('dev'));

// Serve static files (dashboard)
app.use(express.static(path.join(__dirname, '../public')));
app.use('/css', express.static(path.join(__dirname, '../public/css')));
app.use('/js', express.static(path.join(__dirname, '../public/js')));

// API routes
app.use('/api/accounts', accountRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/actions', actionsRoutes);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Root endpoint - serve dashboard
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/terminal.html'));
});

// API info endpoint (updated with workflow endpoints)
app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'Flamebot Backend API with Workflow Automation',
    version: '1.0.0',
    features: [
      'Account Import with Auto-Workflow',
      'AI-Powered Bio & Prompt Generation',
      'Automated Swipe Campaigns',
      'Real-time Workflow Monitoring',
      'Scalable Multi-Account Management'
    ],
    endpoints: {
      // Account endpoints (updated)
      importAccount: 'POST /api/accounts/import',
      importMultiple: 'POST /api/accounts/import-multiple',
      getModels: 'GET /api/accounts/models',
      accountHealth: 'GET /api/accounts/health',
      
      // Workflow endpoints (NEW)
      getWorkflowStatus: 'GET /api/accounts/workflow/:accountId',
      stopWorkflow: 'POST /api/accounts/workflow/:accountId/stop',
      getActiveWorkflows: 'GET /api/accounts/workflows/active',
      getWorkflowStats: 'GET /api/accounts/workflows/stats',
      pauseWorkflows: 'POST /api/accounts/workflows/pause-all',
      resumeWorkflows: 'POST /api/accounts/workflows/resume-all',
      
      // AI endpoints
      generatePrompt: 'POST /api/ai/generate-prompt',
      generateBios: 'POST /api/ai/generate-bios',
      aiHealth: 'GET /api/ai/health',
      
      // Actions endpoints
      swipe: 'POST /api/actions/swipe',
      spectreEnable: 'POST /api/actions/spectre/enable',
      bioUpdate: 'POST /api/actions/bio/update',
      promptUpdate: 'POST /api/actions/prompt/update',
      actionsHealth: 'GET /api/actions/health'
    }
  });
});

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// ============================
// SERVER STARTUP WITH WORKFLOW MANAGER
// ============================

async function startServer() {
  const PORT = config.server.port;
  
  try {
    console.log(`
╔═══════════════════════════════════════╗
║     Flamebot Backend Server           ║
║        WITH WORKFLOW AUTOMATION       ║
╠═══════════════════════════════════════╣
║  🚀 Starting server...                ║
║  🌍 Environment: ${config.server.env.padEnd(19)}║
╚═══════════════════════════════════════╝
    `);

    // Initialize Workflow Manager BEFORE starting server
    console.log('🤖 Initializing Workflow Manager...');
    await workflowManager.initialize();

    // Start Express server
    const server = app.listen(PORT, () => {
      console.log(`
╔═══════════════════════════════════════╗
║          🎉 SERVER READY 🎉           ║
╠═══════════════════════════════════════╣
║  🚀 Server running on port ${PORT}      ║
║  🌍 Environment: ${config.server.env}         ║
║  🤖 Workflow Engine: ACTIVE          ║
║                                       ║
║  📊 Dashboard UI:                     ║
║  👉 http://localhost:${PORT}              ║
║                                       ║
║  🔌 API Endpoints:                    ║
║  👉 http://localhost:${PORT}/api          ║
║                                       ║
║  📚 API Documentation:                ║
║  👉 http://localhost:${PORT}/api-docs     ║
║                                       ║
║  ⚡ Workflow Management:              ║
║  👉 http://localhost:${PORT}/api/accounts/workflows/active ║
║                                       ║
║  🎯 Features:                         ║
║  • Automatic workflow start on import║
║  • AI-powered bio & prompt generation║
║  • Scheduled swipe campaigns         ║
║  • Real-time monitoring              ║
║  • Multi-account automation          ║
╚═══════════════════════════════════════╝

🔥 Ready to automate Tinder accounts!
📝 Import accounts and workflows will start automatically.
📊 Monitor active workflows in the dashboard.

Press CTRL+C to stop the server
      `);
    });

    // Graceful shutdown handling
    const gracefulShutdown = async (signal) => {
      console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
      
      try {
        // Stop accepting new connections
        server.close(() => {
          console.log('✅ HTTP server closed');
        });

        // Shutdown workflow manager
        console.log('🤖 Shutting down Workflow Manager...');
        await workflowManager.shutdown();

        console.log('✅ Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        console.error('❌ Error during shutdown:', error);
        process.exit(1);
      }
    };

    // Setup signal handlers
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', async (error) => {
      console.error('💥 Uncaught Exception:', error);
      await gracefulShutdown('UNCAUGHT_EXCEPTION');
    });

    process.on('unhandledRejection', async (reason, promise) => {
      console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
      await gracefulShutdown('UNHANDLED_REJECTION');
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();
