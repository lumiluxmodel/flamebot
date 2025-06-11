require('dotenv').config();

const config = {
  server: {
    port: process.env.PORT || 3000,
    env: process.env.NODE_ENV || 'development'
  },
  flamebot: {
    apiKey: process.env.FLAMEBOT_API_KEY,
    baseUrl: process.env.FLAMEBOT_API_BASE_URL || 'https://api.flamebot-tin.com',
    endpoints: {
      addTinderCards: '/api/add-tinder-cards',
      editAccountConfig: '/api/edit-account-config',
      updateBio: '/api/update-bio',
      startSwipe: '/api/start-swipe'
    }
  },
  models: {
    available: process.env.AVAILABLE_MODELS?.split(',') || ['Lola', 'Aura', 'Ciara', 'Iris'],
    colors: {
      Lola: '#e00000',
      Aura: '#23d100',
      Ciara: '#295eff',
      Iris: '#ffb3f5'
    }
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY
  }
};

// Validate required configuration
if (!config.flamebot.apiKey) {
  throw new Error('FLAMEBOT_API_KEY is required in environment variables');
}

module.exports = config;