// src/routes/accountRoutes.js - Updated with Workflow Endpoints
const express = require('express');
const router = express.Router();

// Try to use real controller, fallback to mock if it fails
let accountController;
try {
  accountController = require('../controllers/accountController');
} catch (error) {
  console.log('⚠️ Using mock account controller due to:', error.message);
  accountController = require('../controllers/mockController');
}

// Async error wrapper
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

// ============================
// ACCOUNT IMPORT ROUTES (Updated with automation)
// ============================

// Import single account with automatic workflow start
router.post('/import', asyncHandler((req, res) => accountController.importAccount(req, res)));

// Import multiple accounts with automatic workflow start
router.post('/import-multiple', asyncHandler((req, res) => accountController.importMultipleAccounts(req, res)));

// ============================
// WORKFLOW MANAGEMENT ROUTES (NEW)
// ============================

// Get workflow status for specific account
router.get('/workflow/:accountId', asyncHandler((req, res) => accountController.getAccountWorkflowStatus(req, res)));

// Stop automation/workflow for specific account
router.post('/workflow/:accountId/stop', asyncHandler((req, res) => accountController.stopAccountAutomation(req, res)));

// Get all active workflows (for dashboard)
router.get('/workflows/active', asyncHandler((req, res) => accountController.getAllActiveWorkflows(req, res)));

// Get workflow statistics and health
router.get('/workflows/stats', asyncHandler((req, res) => accountController.getWorkflowStats(req, res)));

// Maintenance endpoints for workflow management
router.post('/workflows/pause-all', asyncHandler((req, res) => accountController.pauseAllWorkflows(req, res)));
router.post('/workflows/resume-all', asyncHandler((req, res) => accountController.resumeAllWorkflows(req, res)));

// Operaciones individuales de workflow
router.post('/workflow/:accountId/pause', asyncHandler((req, res) => accountController.pauseAccountWorkflow(req, res)));
router.post('/workflow/:accountId/resume', asyncHandler((req, res) => accountController.resumeAccountWorkflow(req, res)));
router.post('/workflow/:accountId/stop', asyncHandler((req, res) => accountController.stopAccountAutomation(req, res)));
router.get('/workflow/:accountId/details', asyncHandler((req, res) => accountController.getDetailedWorkflowStatus(req, res)));

// Operaciones bulk
router.post('/workflows/bulk', asyncHandler((req, res) => accountController.bulkWorkflowOperation(req, res)));

// Filtrar workflows por estado
router.get('/workflows/by-status', asyncHandler((req, res) => accountController.getWorkflowsByStatus(req, res)));

// ============================
// UTILITY ROUTES (Unchanged)
// ============================

// Get available models and colors
router.get('/models', (req, res) => accountController.getModels(req, res));

// Health check (now includes workflow status)
router.get('/health', asyncHandler((req, res) => accountController.healthCheck(req, res)));

module.exports = router;
