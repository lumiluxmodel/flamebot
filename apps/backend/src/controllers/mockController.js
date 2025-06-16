// Mock Controller for Test Endpoints
// This provides simple successful responses for frontend tests

const mockController = {
  // Account Controller Mock Methods
  getModels: (req, res) => {
    res.json({
      success: true,
      data: {
        models: ['eva_cute', 'alice_wild', 'sophia_elegant', 'miranda_fun', 'jessica_smart'],
        colors: {
          eva_cute: '#e00000',
          alice_wild: '#23d100',
          sophia_elegant: '#295eff',
          miranda_fun: '#ffb3f5',
          jessica_smart: '#ff9500'
        }
      }
    });
  },

  importAccount: (req, res) => {
    const { model, cookie } = req.body;
    res.json({
      success: true,
      data: {
        accountId: `acc_${Date.now()}`,
        model: model || 'eva_cute',
        status: 'imported',
        timestamp: new Date().toISOString()
      }
    });
  },

  importMultipleAccounts: (req, res) => {
    const accounts = req.body.accounts || [];
    res.json({
      success: true,
      data: {
        successCount: Math.floor(accounts.length * 0.9),
        failedCount: Math.ceil(accounts.length * 0.1),
        imported: accounts.map((_, i) => `acc_${Date.now()}_${i}`)
      }
    });
  },

  healthCheck: (req, res) => {
    res.json({
      success: true,
      service: 'Account Service',
      timestamp: new Date().toISOString(),
      status: 'healthy'
    });
  },

  // Actions Controller Mock Methods
  startSwipe: (req, res) => {
    const { accountId, model } = req.body;
    res.json({
      success: true,
      data: {
        taskId: `swipe_${Date.now()}`,
        accountId: accountId || 'test_account',
        model: model || 'eva_cute',
        status: 'started',
        timestamp: new Date().toISOString()
      }
    });
  },

  getSwipeStatus: (req, res) => {
    const { taskId } = req.params;
    res.json({
      success: true,
      data: {
        taskId,
        status: 'active',
        progress: 45,
        swipesCount: 123,
        matchesCount: 12,
        runtime: '00:15:30'
      }
    });
  },

  stopSwipe: (req, res) => {
    const { taskId } = req.params;
    res.json({
      success: true,
      data: {
        taskId,
        status: 'stopped',
        stoppedAt: new Date().toISOString()
      }
    });
  },

  enableSpectre: (req, res) => {
    const { accountId, model } = req.body;
    res.json({
      success: true,
      data: {
        taskId: `spectre_${Date.now()}`,
        accountId: accountId || 'test_account',
        model: model || 'eva_cute',
        status: 'configured',
        spectreEnabled: true,
        timestamp: new Date().toISOString()
      }
    });
  },

  updateBio: (req, res) => {
    const { accountId, bio } = req.body;
    res.json({
      success: true,
      data: {
        taskId: `bio_${Date.now()}`,
        accountId: accountId || 'test_account',
        bio: bio || 'Updated bio content',
        status: 'updated',
        timestamp: new Date().toISOString()
      }
    });
  },

  generateAndUpdateBio: (req, res) => {
    const { accountId, model } = req.body;
    res.json({
      success: true,
      data: {
        taskId: `bio_gen_${Date.now()}`,
        accountId: accountId || 'test_account',
        model: model || 'eva_cute',
        generatedBio: 'AI-generated bio content for modern dating',
        status: 'generated_and_updated',
        timestamp: new Date().toISOString()
      }
    });
  },

  updatePrompt: (req, res) => {
    const { accountId, prompt } = req.body;
    res.json({
      success: true,
      data: {
        taskId: `prompt_${Date.now()}`,
        accountId: accountId || 'test_account',
        prompt: prompt || 'Updated prompt content',
        status: 'updated',
        timestamp: new Date().toISOString()
      }
    });
  },

  generateAndUpdatePrompt: (req, res) => {
    const { accountId, model } = req.body;
    res.json({
      success: true,
      data: {
        taskId: `prompt_gen_${Date.now()}`,
        accountId: accountId || 'test_account',
        model: model || 'eva_cute',
        generatedPrompt: 'AI-generated conversation starter',
        status: 'generated_and_updated',
        timestamp: new Date().toISOString()
      }
    });
  },

  // AI Controller Mock Methods
  healthCheck: (req, res) => {
    res.json({
      success: true,
      data: {
        service: 'AI Service',
        openaiConfigured: true,
        timestamp: new Date().toISOString(),
        openaiConnection: 'CONNECTED',
        models: ['gpt-3.5-turbo', 'gpt-4']
      }
    });
  }
};

module.exports = mockController; 