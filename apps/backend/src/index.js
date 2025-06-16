// src/index.js - Updated with ES Modules and Workflow Manager Initialization
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Routes (temporary mock routes until we fix the actual route files)
const accountRoutes = express.Router();
const workflowRoutes = express.Router();

// Mock route handlers for now
accountRoutes.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Account service is healthy',
    timestamp: new Date().toISOString()
  });
});

workflowRoutes.get('/stats', (req, res) => {
  res.json({
    success: true,
    data: {
      activeExecutions: Math.floor(Math.random() * 10),
      totalExecutions: Math.floor(Math.random() * 100) + 50,
      successRate: Math.floor(Math.random() * 20) + 80,
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

workflowRoutes.get('/monitoring/dashboard', (req, res) => {
  res.json({
    success: true,
    data: {
      systemOverview: {
        activeWorkflows: Math.floor(Math.random() * 10),
        totalExecutions: Math.floor(Math.random() * 100) + 50,
        successRate: Math.floor(Math.random() * 20) + 80,
        avgDuration: "2.5h"
      }
    }
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
      accountHealth: 'GET /api/accounts/health',
      getWorkflowStats: 'GET /api/workflows/stats',
      getDashboard: 'GET /api/workflows/monitoring/dashboard'
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
