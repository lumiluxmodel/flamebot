// src/routes/actionsRoutes.js
const express = require('express');
const router = express.Router();
const actionsController = require('../controllers/actionsController');

// Async error wrapper
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

// ============================
// SWIPE ROUTES
// ============================

// Start swipe task
router.post('/swipe', asyncHandler(actionsController.startSwipe));

// Start swipe with wait for completion
router.post('/swipe-wait', asyncHandler(actionsController.startSwipeWithWait));

// Check swipe status
router.get('/swipe/status/:taskId', asyncHandler(actionsController.getSwipeStatus));

// Stop swipe task
router.post('/swipe/stop/:taskId', asyncHandler(actionsController.stopSwipe));

// ============================
// SPECTRE MODE ROUTES
// ============================

// Configure Spectre mode for single account (saves swiping config)
router.post('/spectre/enable', asyncHandler(actionsController.enableSpectre));

// Complete Spectre flow: Configure + Start Swipe
router.post('/spectre/flow', asyncHandler(actionsController.spectreSwipeFlow));

// Configure Spectre mode for multiple accounts
router.post('/spectre/bulk-enable', asyncHandler(actionsController.enableSpectreBulk));

// Check Spectre configuration status
router.get('/spectre/status/:taskId', asyncHandler(actionsController.getSpectreStatus));

// ============================
// BIO ROUTES
// ============================

// Update bio with custom text
router.post('/bio/update', asyncHandler(actionsController.updateBio));

// Generate and update bio with AI
router.post('/bio/generate-update', asyncHandler(actionsController.generateAndUpdateBio));

// Bulk bio update
router.post('/bio/bulk-update', asyncHandler(actionsController.updateBioBulk));

// Check bio update status
router.get('/bio/status/:taskId', asyncHandler(actionsController.getBioStatus));

// ============================
// PROMPT ROUTES
// ============================

// Update prompt with custom text
router.post('/prompt/update', asyncHandler(actionsController.updatePrompt));

// Generate and update prompt with AI
router.post('/prompt/generate-update', asyncHandler(actionsController.generateAndUpdatePrompt));

// Bulk prompt update
router.post('/prompt/bulk-update', asyncHandler(actionsController.updatePromptBulk));

// Check prompt update status
router.get('/prompt/status/:taskId', asyncHandler(actionsController.getPromptStatus));

// ============================
// COMBO ROUTES
// ============================

// Update both bio and prompt together
router.post('/bio-prompt/combo-update', asyncHandler(actionsController.updateBioPromptCombo));

// ============================
// INFO/HEALTH ROUTES
// ============================

// Actions service health check
router.get('/health', asyncHandler(async (req, res) => {
    res.json({
        success: true,
        service: 'Flamebot Actions Service',
        timestamp: new Date().toISOString(),
        endpoints: {
            swipe: {
                start: 'POST /api/actions/swipe',
                startWait: 'POST /api/actions/swipe-wait',
                status: 'GET /api/actions/swipe/status/:taskId',
                stop: 'POST /api/actions/swipe/stop/:taskId'
            },
            spectre: {
                enable: 'POST /api/actions/spectre/enable',
                bulkEnable: 'POST /api/actions/spectre/bulk-enable',
                status: 'GET /api/actions/spectre/status/:taskId'
            },
            bio: {
                update: 'POST /api/actions/bio/update',
                generateUpdate: 'POST /api/actions/bio/generate-update',
                bulkUpdate: 'POST /api/actions/bio/bulk-update',
                status: 'GET /api/actions/bio/status/:taskId'
            },
            prompt: {
                update: 'POST /api/actions/prompt/update',
                generateUpdate: 'POST /api/actions/prompt/generate-update',
                bulkUpdate: 'POST /api/actions/prompt/bulk-update',
                status: 'GET /api/actions/prompt/status/:taskId'
            },
            combo: {
                bioPrompt: 'POST /api/actions/bio-prompt/combo-update'
            }
        }
    });
}));

module.exports = router;