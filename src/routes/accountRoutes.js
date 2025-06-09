const express = require('express');
const router = express.Router();
const accountController = require('../controllers/accountController');

// Account routes - bind the context to preserve 'this'
router.post('/import', (req, res) => accountController.importAccount(req, res));
router.post('/import-multiple', (req, res) => accountController.importMultipleAccounts(req, res));

// Utility routes
router.get('/models', (req, res) => accountController.getModels(req, res));
router.get('/health', (req, res) => accountController.healthCheck(req, res));

module.exports = router;