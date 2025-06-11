const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const config = require('./config');
const accountRoutes = require('./routes/accountRoutes');
const aiRoutes = require('./routes/aiRoutes');

const { errorHandler, notFoundHandler } = require('./middlewares/errorHandler');
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

// API routes
app.use('/api/accounts', accountRoutes);
app.use('/api/ai', aiRoutes); 
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Root endpoint - serve dashboard
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/dashboard.html'));
});

// API info endpoint
app.get('/api', (req, res) => {
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
║                                       ║
║  📊 Dashboard UI:                     ║
║  👉 http://localhost:${PORT}              ║
║                                       ║
║  🔌 API Endpoints:                    ║
║  👉 http://localhost:${PORT}/api          ║
║                                       ║
║  📚 API Documentation:                ║
║  👉 http://localhost:${PORT}/api-docs     ║
╚═══════════════════════════════════════╝

Press CTRL+C to stop the server
  `);
});