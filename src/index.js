const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const config = require('./config');
const accountRoutes = require('./routes/accountRoutes');
const { errorHandler, notFoundHandler } = require('./middlewares/errorHandler');

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

// API routes
app.use('/api/accounts', accountRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Flamebot Backend API',
    version: '1.0.0',
    endpoints: {
      importAccount: 'POST /api/accounts/import',
      importMultiple: 'POST /api/accounts/import-multiple',
      getModels: 'GET /api/accounts/models',
      health: 'GET /api/accounts/health'
    }
  });
});

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
const PORT = config.server.port;
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════╗
║     Flamebot Backend Server           ║
╠═══════════════════════════════════════╣
║  🚀 Server running on port ${PORT}      ║
║  🌍 Environment: ${config.server.env}         ║
║  📍 Base URL: http://localhost:${PORT}  ║
╚═══════════════════════════════════════╝
  `);
});