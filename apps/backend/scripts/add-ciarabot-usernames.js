// scripts/add-ciarabot-usernames.js
const path = require('path');
require('dotenv').config({ 
  path: path.join(__dirname, '../.env') 
});

const databaseService = require('../src/services/databaseService');

// Sample usernames for CiaraBot
const CIARABOT_USERNAMES = {
  gram: [
    'ciara_sweetie',
    'ciara_angel', 
    'ciara_goddess',
    'ciara_princess',
    'ciara_baby',
    'ciara_mystique',
    'ciara_divine',
    'ciara_enchanting'
  ],
  of: [
    'ciarabot_exclusive',
    'ciara_premium',
    'ciara_vip_content',
    'ciara_private_show',
    'ciara_special_offer'
  ],
  snap: [
    'ciara_snaps',
    'ciara_moments',
    'ciara_stories',
    'ciara_quick_chat',
    'ciara_instant'
  ]
};

async function addCiaraBotUsernames() {
  console.log('🚀 Adding usernames for CiaraBot...\n');

  try {
    // Connect to database
    await databaseService.connect();
    console.log('✅ Connected to database');

    // Check if CiaraBot model exists
    const models = await databaseService.getAllModels();
    const ciaraBotModel = models.find(m => m.name.toLowerCase() === 'ciarabot');
    
    if (!ciaraBotModel) {
      console.error('❌ CiaraBot model not found in database!');
      console.log('Available models:', models.map(m => m.name).join(', '));
      return;
    }

    console.log(`✅ Found model: ${ciaraBotModel.name}`);

    // Get all channels
    const channels = await databaseService.getAllChannels();
    console.log(`✅ Found channels: ${channels.map(c => c.name).join(', ')}\n`);

    // Add usernames for each channel
    for (const channel of channels) {
      const channelName = channel.name;
      const usernames = CIARABOT_USERNAMES[channelName];

      if (!usernames || usernames.length === 0) {
        console.log(`⚠️  No usernames defined for ${ciaraBotModel.name}/${channelName}`);
        continue;
      }

      console.log(`📝 Adding ${usernames.length} usernames for ${ciaraBotModel.name}/${channelName}:`);
      usernames.forEach((username, i) => {
        console.log(`   ${i + 1}. ${username}`);
      });

      try {
        // Use replaceUsernames to ensure clean state
        const result = await databaseService.replaceUsernames(
          ciaraBotModel.name,
          channelName,
          usernames
        );

        console.log(`✅ Successfully added ${result.count} usernames for ${ciaraBotModel.name}/${channelName}\n`);
      } catch (error) {
        console.error(`❌ Error adding usernames for ${ciaraBotModel.name}/${channelName}:`, error.message);
      }
    }

    // Verify the usernames were added
    console.log('🔍 Verifying usernames were added correctly...\n');
    
    for (const channel of channels) {
      const channelName = channel.name;
      try {
        const savedUsernames = await databaseService.getAllUsernames(ciaraBotModel.name, channelName);
        console.log(`✅ ${ciaraBotModel.name}/${channelName}: ${savedUsernames.length} usernames`);
        
        if (savedUsernames.length > 0) {
          console.log(`   First username: ${savedUsernames[0]}`);
          
          // Test getting next username
          const nextUsername = await databaseService.getNextUsername(ciaraBotModel.name, channelName);
          console.log(`   Next username (test): ${nextUsername.username} (${nextUsername.index}/${nextUsername.total})`);
        }
      } catch (error) {
        console.error(`❌ Error verifying ${ciaraBotModel.name}/${channelName}:`, error.message);
      }
      console.log('');
    }

    console.log('🎉 CiaraBot usernames setup completed successfully!');
    console.log('\n💡 You can now run workflows with CiaraBot model.');

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    console.error(error);
  } finally {
    // Close database connection
    try {
      await databaseService.close();
      console.log('✅ Database connection closed');
    } catch (error) {
      console.error('Error closing database:', error.message);
    }
  }
}

// Run if called directly
if (require.main === module) {
  addCiaraBotUsernames().catch(console.error);
}

module.exports = { addCiaraBotUsernames, CIARABOT_USERNAMES }; 
