// Mock configuration for tests
module.exports = {
  server: {
    port: 3001,
    env: 'test'
  },
  flamebot: {
    apiKey: 'test-api-key',
    baseUrl: 'http://localhost:3002/mock-api',
    endpoints: {
      addTinderCards: '/api/add-tinder-cards',
      editAccountConfig: '/api/edit-account-config',
      updateBio: '/api/update-bio',
      startSwipe: '/api/start-swipe'
    }
  },
  models: {
    available: ['Lola', 'Aura', 'Ciara', 'Iris'],
    colors: {
      Lola: '#FF69B4',
      Aura: '#9370DB',
      Ciara: '#20B2AA',
      Iris: '#FFD700'
    }
  },
  openai: {
    apiKey: 'test-openai-key'
  },
  database: {
    host: 'localhost',
    port: 5432,
    database: 'flamebot_test',
    username: 'test',
    password: 'test'
  }
};