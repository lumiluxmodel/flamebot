const axios = require('axios');

// Test configuration
const PORT = process.env.PORT || 3090; // Usando tu puerto 3090
const API_BASE_URL = `http://localhost:${PORT}/api/accounts`;

// Test account data (using the provided information)
const testAccount = {
  authToken: '9d2b1326-0286-4d10-a65c-dbb552614449',
  proxy: 'gate.nodemaven.com:1080:lumiluxmodels_gmail_com-country-us-zip-15202-sid-257407378079-ttl-24h-filter-high:hbif188pi7',
  model: 'Iris',
  location: '40.50529861450195,-80.06849670410156',
  refreshToken: 'eyJhbGciOiJIUzI1NiJ9.MTU0MTUxNzQ2NTE.azhSbgIGmaawxQTT5fiMHLu59FrlW06eMQZ88jzt-y0',
  deviceId: 'D5654DBD-452F-4BA3-9424-EBEE1BD73CC4',
  persistentId: 'a6bf872290eb42c5aa01916b9b3773c1'
};

// Test multiple accounts
const multipleAccounts = [
  testAccount,
  {
    authToken: 'test-auth-token-2',
    proxy: 'gate.nodemaven.com:1080:testuser2:testpass2',
    model: 'Aura'
  },
  {
    authToken: 'test-auth-token-3',
    proxy: 'gate.nodemaven.com:1080:testuser3:testpass3',
    model: 'Ciara'
  }
];

async function testSingleImport() {
  console.log('\n🧪 Testing single account import...\n');
  
  try {
    const response = await axios.post(`${API_BASE_URL}/import`, testAccount, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Success:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

async function testMultipleImport() {
  console.log('\n🧪 Testing multiple accounts import...\n');
  
  try {
    const response = await axios.post(`${API_BASE_URL}/import-multiple`, {
      accounts: multipleAccounts
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Success:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

async function testGetModels() {
  console.log('\n🧪 Testing get models...\n');
  
  try {
    const response = await axios.get(`${API_BASE_URL}/models`);
    console.log('✅ Available models:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

async function testHealthCheck() {
  console.log('\n🧪 Testing health check...\n');
  
  try {
    const response = await axios.get(`${API_BASE_URL}/health`);
    console.log('✅ Health status:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

async function runAllTests() {
  console.log(`
╔═══════════════════════════════════════╗
║     Flamebot Import Test Suite        ║
╚═══════════════════════════════════════╝
  `);

  await testHealthCheck();
  await testGetModels();
  await testSingleImport();
  await testMultipleImport();

  console.log('\n✨ All tests completed!\n');
}

// Run tests based on command line argument
const testType = process.argv[2];

switch (testType) {
  case 'single':
    testSingleImport();
    break;
  case 'multiple':
    testMultipleImport();
    break;
  case 'models':
    testGetModels();
    break;
  case 'health':
    testHealthCheck();
    break;
  default:
    runAllTests();
}