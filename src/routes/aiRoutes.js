const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');

// Prompt generation routes
router.post('/generate-prompt', (req, res) => aiController.generatePrompt(req, res));
router.post('/generate-prompts', (req, res) => aiController.generateMultiplePrompts(req, res));

// Bio generation routes
router.post('/generate-bios', (req, res) => aiController.generateBios(req, res));

// Username management routes
router.post('/usernames', (req, res) => aiController.uploadUsernames(req, res));
router.get('/usernames/:model/:channel', (req, res) => aiController.getUsernames(req, res));
router.get('/usernames/stats', (req, res) => aiController.getUsernameStats(req, res));

// Combined generation and upload
router.post('/generate-upload-prompt', (req, res) => aiController.generateAndUploadPrompt(req, res));

module.exports = router;