// test/testOpenAI.js
require('dotenv').config();
const { OpenAI } = require('openai');

async function testOpenAIConnection() {
    console.log('🔍 Testing OpenAI Connection...\n');
    
    // Check if API key exists
    if (!process.env.OPENAI_API_KEY) {
        console.error('❌ OPENAI_API_KEY not found in .env file');
        return;
    }
    
    console.log('✅ API Key found');
    console.log(`   Key starts with: ${process.env.OPENAI_API_KEY.substring(0, 10)}...`);
    console.log(`   Key length: ${process.env.OPENAI_API_KEY.length} characters\n`);
    
    // Initialize OpenAI client
    const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
    });
    
    try {
        console.log('📡 Making test request to OpenAI...\n');
        
        const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo", // Using cheaper model for testing
            messages: [
                { role: "system", content: "You are a helpful assistant." },
                { role: "user", content: "Say 'Hello, API is working!' in exactly 5 words." }
            ],
            max_tokens: 20
        });
        
        console.log('✅ Success! OpenAI API is working');
        console.log(`   Response: "${response.choices[0].message.content}"`);
        console.log(`   Model used: ${response.model}`);
        console.log(`   Usage: ${response.usage.total_tokens} tokens`);
        
    } catch (error) {
        console.error('❌ OpenAI API Error:');
        console.error(`   Error type: ${error.constructor.name}`);
        console.error(`   Message: ${error.message}`);
        
        if (error.response) {
            console.error(`   Status: ${error.response.status}`);
            console.error(`   Status Text: ${error.response.statusText}`);
            console.error(`   Error data:`, error.response.data);
        }
        
        if (error.message.includes('401')) {
            console.error('\n⚠️  This usually means your API key is invalid or expired');
        } else if (error.message.includes('429')) {
            console.error('\n⚠️  This means you\'ve hit the rate limit');
        } else if (error.message.includes('insufficient_quota')) {
            console.error('\n⚠️  This means you don\'t have credits in your OpenAI account');
        }
    }
}

// Run the test
testOpenAIConnection();