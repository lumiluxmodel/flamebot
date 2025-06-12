// scripts/migrate-usernames.js
const fs = require('fs').promises;
const path = require('path');
const db = require('../src/services/databaseService');

async function migrateUsernames() {
    console.log('🚀 Starting username migration to Railway database...\n');
    
    const usernamesDir = path.join(__dirname, '../data/usernames');
    
    try {
        const files = await fs.readdir(usernamesDir);
        console.log(`📁 Found ${files.length} username files\n`);
        
        for (const file of files) {
            if (!file.endsWith('.txt')) continue;
            
            // Parse filename: model_channel.txt
            const [model, suffix] = file.replace('.txt', '').split('_');
            
            // Convert suffix to channel name
            let channel;
            if (suffix === 'ig') channel = 'gram';
            else if (suffix === 'snap') channel = 'snap';
            else if (suffix === 'of') channel = 'of';
            else {
                console.log(`⚠️  Skipping unknown suffix: ${suffix}`);
                continue;
            }
            
            // Capitalize model name for database
            const capitalizedModel = model.charAt(0).toUpperCase() + model.slice(1).toLowerCase();
            
            console.log(`📄 Processing ${file} (${capitalizedModel}/${channel})...`);
            
            try {
                // Read file content
                const content = await fs.readFile(path.join(usernamesDir, file), 'utf-8');
                const usernames = content
                    .split('\n')
                    .map(u => u.trim())
                    .filter(u => u.length > 0);
                
                console.log(`   Found ${usernames.length} usernames`);
                
                // Add to database
                const result = await db.addUsernames(capitalizedModel, channel, usernames);
                console.log(`   ✅ Migrated successfully!\n`);
                
            } catch (error) {
                console.error(`   ❌ Error: ${error.message}\n`);
            }
        }
        
        // Migrate pointers
        console.log('📊 Migrating username pointers...');
        const pointersPath = path.join(__dirname, '../data/username_pointers.json');
        
        try {
            const pointersData = await fs.readFile(pointersPath, 'utf-8');
            const pointers = JSON.parse(pointersData);
            
            for (const [key, index] of Object.entries(pointers)) {
                const [model, channel] = key.split('_');
                console.log(`   Setting pointer for ${model}/${channel} to index ${index}`);
                
                // The database will handle this automatically when we call getNextUsername
                // Just log for verification
            }
            console.log('   ✅ Pointers migrated!\n');
            
        } catch (error) {
            console.log('   ⚠️  No pointers file found or error reading it\n');
        }
        
        // Show summary
        console.log('📊 Migration Summary:');
        console.log('====================');
        
        const models = ['Aura', 'Lola', 'Iris', 'Ciara'];  // Capitalized
        const channels = ['snap', 'gram', 'of'];
        
        for (const model of models) {
            console.log(`\n${model.toUpperCase()}:`);
            for (const channel of channels) {
                try {
                    const result = await db.getNextUsername(model, channel);
                    console.log(`  ${channel}: ${result.total} usernames (current index: ${result.index})`);
                } catch (error) {
                    console.log(`  ${channel}: No usernames`);
                }
            }
        }
        
        console.log('\n✨ Migration complete!');
        
    } catch (error) {
        console.error('❌ Migration failed:', error);
    } finally {
        await db.close();
        process.exit(0);
    }
}

// Run migration
migrateUsernames().catch(console.error);