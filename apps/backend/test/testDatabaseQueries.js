const path = require('path');
require('dotenv').config({
    path: path.join(__dirname, '../.env')
});

const express = require('express');
const databaseService = require('../src/services/databaseService');

// Mock Express objects
const createMockReq = (body = {}, params = {}, query = {}) => ({
    body,
    params,
    query,
    headers: {}
});

const createMockRes = () => {
    const res = {
        status: function(code) {
            this.statusCode = code;
            return this;
        },
        json: function(data) {
            this.data = data;
            console.log(`Response (${this.statusCode || 200}):`, JSON.stringify(data, null, 2));
            return this;
        },
        send: function(data) {
            this.data = data;
            console.log(`Response (${this.statusCode || 200}):`, data);
            return this;
        }
    };
    return res;
};

async function testDatabaseQueries() {
    console.log('🔍 Testing Database Queries...\n');
    
    try {
        // Test 1: Select all models
        console.log('📋 MODELS TABLE:');
        console.log('================');
        const modelsQuery = 'SELECT * FROM models ORDER BY name';
        const modelsResult = await databaseService.query(modelsQuery);
        console.log('Models found:', modelsResult.rows.length);
        console.table(modelsResult.rows);
        console.log('\n');
        
        // Test 2: Select all channels
        console.log('📱 CHANNELS TABLE:');
        console.log('==================');
        const channelsQuery = 'SELECT * FROM channels ORDER BY name';
        const channelsResult = await databaseService.query(channelsQuery);
        console.log('Channels found:', channelsResult.rows.length);
        console.table(channelsResult.rows);
        console.log('\n');
        
        // Test 3: Show detailed info
        console.log('🔍 DETAILED INFORMATION:');
        console.log('========================');
        console.log('✅ Tables queried successfully!');
        console.log(`- Models table has ${modelsResult.rows.length} records`);
        console.log(`- Channels table has ${channelsResult.rows.length} records`);
        console.log('\n');
        
        console.log('✅ All database queries completed successfully!');
        
    } catch (error) {
        console.error('❌ Error during database queries:', error);
    } finally {
        // Close database connection
        await databaseService.close();
        console.log('🔒 Database connection closed.');
        process.exit(0);
    }
}

// Run the test
testDatabaseQueries(); 
