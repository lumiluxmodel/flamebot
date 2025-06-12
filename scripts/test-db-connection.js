// scripts/test-db-connection.js
require('dotenv').config();
const db = require('../src/services/databaseService');

async function testConnection() {
    console.log('🔌 Testing Railway database connection...\n');
    
    try {
        // Test basic query
        console.log('📊 Testing basic query...');
        const result = await db.query('SELECT NOW()');
        console.log('✅ Connection successful!');
        console.log('   Server time:', result.rows[0].now);
        
        // Test models table
        console.log('\n📊 Checking models table...');
        const models = await db.query('SELECT * FROM models ORDER BY name');
        console.log(`✅ Found ${models.rows.length} models:`);
        models.rows.forEach(model => {
            console.log(`   - ${model.name} (${model.color})`);
        });
        
        // Test channels table
        console.log('\n📊 Checking channels table...');
        const channels = await db.query('SELECT * FROM channels ORDER BY name');
        console.log(`✅ Found ${channels.rows.length} channels:`);
        channels.rows.forEach(channel => {
            console.log(`   - ${channel.name} (${channel.format})`);
        });
        
        // Test accounts count
        console.log('\n📊 Checking accounts...');
        const accounts = await db.query('SELECT COUNT(*) FROM accounts');
        console.log(`✅ Total accounts: ${accounts.rows[0].count}`);
        
        // Test usernames count
        console.log('\n📊 Checking usernames...');
        const usernames = await db.query('SELECT COUNT(*) FROM usernames');
        console.log(`✅ Total usernames: ${usernames.rows[0].count}`);
        
        // Get stats
        console.log('\n📊 Database Summary:');
        console.log('====================');
        const stats = await db.getAccountStats();
        console.log(`Total Accounts: ${stats.total_accounts || 0}`);
        console.log(`Active Accounts: ${stats.active_accounts || 0}`);
        console.log(`Total Swipes: ${stats.total_swipes || 0}`);
        console.log(`Total Matches: ${stats.total_matches || 0}`);
        
        console.log('\n✨ Database connection test passed!');
        
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        console.error('\nCheck your .env file has correct Railway credentials:');
        console.error('DB_HOST=yamabiko.proxy.rlwy.net');
        console.error('DB_PORT=18827');
        console.error('DB_NAME=railway');
        console.error('DB_USER=postgres');
        console.error('DB_PASSWORD=pyZSoGjkpyNLzYnfFgRpoHdBGVsQgkie');
    } finally {
        await db.close();
        process.exit(0);
    }
}

testConnection();