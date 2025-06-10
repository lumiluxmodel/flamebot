const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');

// Async error wrapper
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

// Health check for AI service
router.get('/health', asyncHandler(aiController.healthCheck));

// Prompt generation routes
router.post('/generate-prompt', asyncHandler(aiController.generatePrompt));
router.post('/generate-prompts', asyncHandler(aiController.generateMultiplePrompts));

// Bio generation routes
router.post('/generate-bios', asyncHandler(aiController.generateBios));

// Username management routes
router.post('/usernames', asyncHandler(aiController.uploadUsernames));
router.get('/usernames/:model/:channel', asyncHandler(aiController.getUsernames));
router.get('/usernames/stats', asyncHandler(aiController.getUsernameStats));

// Combined generation and upload
router.post('/generate-upload-prompt', asyncHandler(aiController.generateAndUploadPrompt));

module.exports = router;