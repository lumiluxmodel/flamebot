# 🧪 Real Testing Guide - Prompt Generation

## 📋 Overview

Sistema de testing REAL sin mocks que usa:
- ✅ **Real OpenAI API calls** 
- ✅ **Real PostgreSQL database transactions**
- ✅ **Real username rotation with concurrency**
- ✅ **Real channel strategies**
- ❌ **NO mocks, stubs, or fake data**

## 🗂️ Test Structure

```
📁 tests/
├── 📁 real/
│   └── promptGeneration.real.test.js     # Jest tests with real data
├── 📁 __tests__/ (REMOVED)               # Old mock tests deleted
└── 📁 manual/ (REMOVED)                  # Old manual tests deleted

📁 scripts/
├── setup-test-data.js                    # Real test data setup
└── run-real-tests.js                     # Test runner

📁 test/ (legacy)
└── testGeneration.js                     # Direct controller tests
```

## 🔄 Complete Workflow

### **HTTP Request Flow**
```
POST /api/ai/generate-prompt
  ↓
aiController.generatePrompt()
  ↓  
promptOrchestratorService.generatePrompt()
  ↓
[Validation] → [Username Rotation] → [AI Generation] → [Channel Strategy]
  ↓
Real OpenAI API Call → Real DB Transaction → Formatted Response
```

### **Files Involved**
1. **`src/controllers/aiController.js`** - HTTP layer
2. **`src/services/promptOrchestratorService.js`** - Coordination
3. **`src/services/usernameService.js`** - Username rotation
4. **`src/services/databaseService.js`** - DB with row locking
5. **`src/services/aiService.js`** - OpenAI integration
6. **`src/services/channelStrategyService.js`** - Formatting

## 🎯 How to Run Tests

### **1. Setup Prerequisites**
```bash
# Required environment variables in .env
OPENAI_API_KEY=sk-your-key-here
DB_HOST=your-db-host
DB_NAME=your-db-name
DB_USER=your-db-user
DB_PASSWORD=your-db-password
```

### **2. Setup Test Data**
```bash
npm run test:setup-data
```

### **3. Run Real Tests**
```bash
# Complete test suite
npm run test:real

# With coverage
npm run test:real:coverage

# Fast (skip legacy tests)
npm run test:real:fast

# Individual components
npm run test:generation:prompt TestModel gram
npm run test:generation:bio 3
npm run test:generation:batch TestModel snap 5
```

## 📊 What Gets Tested

### **Database Integration**
- ✅ Real PostgreSQL connection
- ✅ Transaction rollback on errors
- ✅ Row locking for concurrency
- ✅ Username rotation without duplicates

### **OpenAI Integration**
- ✅ Real API calls to gpt-4o
- ✅ Fallback to gpt-3.5-turbo
- ✅ Rate limit handling
- ✅ Timeout management

### **Channel Strategies**
- ✅ Gram: 40 chars, remove emojis, `Grαm;` prefix
- ✅ Snap: 35 chars, aggressive cleaning, `Snαp;` prefix  
- ✅ OF: 50 chars, allow emojis, `OF;` prefix

### **Concurrency Testing**
- ✅ Multiple simultaneous requests
- ✅ No duplicate usernames
- ✅ Proper username rotation
- ✅ Database transaction integrity

### **End-to-End Flow**
- ✅ HTTP request → Database → OpenAI → Response
- ✅ Complete orchestration
- ✅ Error handling at all levels
- ✅ Timeout scenarios

## 🔍 Test Examples

### **Real Username Rotation Test**
```javascript
// Makes 5 concurrent requests
const promises = Array(5).fill(null).map(() => 
  usernameService.getNextUsername(TEST_MODEL, 'gram')
);

const results = await Promise.all(promises);

// Verifies no duplicates (tests row locking)
const usernames = results.map(r => r.username);
const uniqueUsernames = new Set(usernames);
expect(uniqueUsernames.size).toBe(usernames.length);
```

### **Real OpenAI API Test** 
```javascript
// Actual API call
const response = await aiService.generateText(
  "You are a helpful assistant.", 
  "Say 'Hello World' in a casual way.", 
  20
);

// Verifies real response
expect(response).toBeDefined();
expect(typeof response).toBe('string');
```

### **Real Channel Strategy Test**
```javascript
// Real formatting without mocks
const formatted = channelStrategyService.formatText(
  'gram', 
  "test message with emojis 😊", 
  'testuser'
);

// Verifies actual strategy applied
expect(formatted).toMatch(/^Grαm;testuser/);
```

## 📈 Test Results Format

### **Single Prompt Generation**
```json
{
  "success": true,
  "data": {
    "model": "TestModel",
    "channel": "gram", 
    "username": "testuser1",
    "visibleText": "shoot ur shot if i dont reply",
    "obfuscatedText": "Grαm;testuser1 shoot ur shot if i dont reply",
    "usernameInfo": {
      "username": "testuser1",
      "index": 0,
      "total": 5,
      "nextIndex": 1
    },
    "requestId": "TestModel-gram-1705312200000",
    "generatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

## 🗄️ Test Data Structure

### **Models**
- Aura, Lola, Iris, Ciara (production)
- TestModel (testing only)

### **Channels**  
- `gram`: `Grαm;` prefix, 40 char limit
- `snap`: `Snαp;` prefix, 35 char limit
- `of`: `OF;` prefix, 50 char limit

### **Usernames**
```javascript
'TestModel': {
  'gram': ['testuser1', 'testuser2', 'testuser3', 'testuser4', 'testuser5'],
  'snap': ['snaptest1', 'snaptest2', 'snaptest3'],
  'of': ['oftest1', 'oftest2', 'oftest3', 'oftest4']
}
```

## 🚨 Error Scenarios Tested

### **Real Error Handling**
- ❌ Missing OpenAI API key → 500 error
- ❌ Invalid model/channel → 400 error with suggestions
- ❌ No usernames available → 500 error
- ❌ OpenAI rate limit → 429 error (no retry)
- ❌ Database connection loss → 500 error with rollback
- ❌ Request timeout → 408 error

## 🎛️ Configuration

### **Test Timeouts**
- Single tests: 60 seconds (for real API calls)
- Batch tests: 120 seconds
- Setup/cleanup: 30 seconds

### **Concurrency**
- Username rotation: Up to 5 concurrent requests
- Batch generation: Max 3 concurrent (to avoid rate limits)

## 🧹 Cleanup

### **Automatic Cleanup**
```bash
# After each test run
npm run test:clean-data

# Verify cleanup worked
npm run test:verify-data
```

### **Manual Cleanup**
```bash
# Remove only test data
node scripts/setup-test-data.js clean

# Full verification
node scripts/setup-test-data.js verify
```

## 📋 Command Reference

```bash
# Data Management
npm run test:setup-data        # Setup test data
npm run test:clean-data        # Clean test data
npm run test:verify-data       # Verify data state

# Real Testing
npm run test:real              # Full real test suite
npm run test:real:coverage     # With coverage report
npm run test:real:fast         # Skip legacy tests

# Direct Generation Testing
npm run test:generation        # Interactive test menu
npm run test:generation:prompt # Single prompt
npm run test:generation:bio    # Bio generation
npm run test:generation:batch  # Batch prompts

# Legacy Tests (still available)
npm run test:old:ai           # Old AI tests
npm run test:old:all          # All old tests
```

## ✨ Benefits

### **Real Testing Advantages**
1. **🔒 Confidence** - Tests actual production code paths
2. **🐛 Bug Detection** - Finds real integration issues
3. **⚡ Performance** - Tests actual API response times
4. **🔄 Concurrency** - Verifies real database locking
5. **📊 Accuracy** - Tests real OpenAI responses
6. **🎯 Coverage** - Complete end-to-end validation

### **No More Mock Issues**
- ❌ Mock data doesn't match real responses
- ❌ Mocks hide integration problems  
- ❌ Fake data doesn't test real scenarios
- ❌ Stubs can get out of sync with real APIs
- ❌ Mock responses don't test rate limits
- ❌ Fake databases don't test concurrency