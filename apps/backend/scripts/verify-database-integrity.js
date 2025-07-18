// scripts/verify-database-integrity.js
const path = require('path');
require('dotenv').config({ 
  path: path.join(__dirname, '../.env') 
});

const { Client } = require('pg');

const client = new Client({
  connectionString: "postgresql://postgres:vpCPQqusCTSPTsCYycRbvLtvfvPOAWLw@tramway.proxy.rlwy.net:42991/railway",
  ssl: {
    rejectUnauthorized: false
  }
});

async function verifyDatabaseIntegrity() {
  console.log('🔍 Verificando integridad de la base de datos...\n');

  try {
    await client.connect();
    console.log('✅ Conectado a la base de datos Railway\n');

    // 1. Verificar modelos
    console.log('📊 MODELOS:');
    console.log('=' .repeat(50));
    const modelsResult = await client.query('SELECT * FROM models ORDER BY name;');
    modelsResult.rows.forEach(model => {
      console.log(`ID: ${model.id} | Nombre: "${model.name}" | Color: ${model.color}`);
    });
    console.log(`Total modelos: ${modelsResult.rows.length}\n`);

    // 2. Verificar canales
    console.log('📡 CANALES:');
    console.log('=' .repeat(50));
    const channelsResult = await client.query('SELECT * FROM channels ORDER BY name;');
    channelsResult.rows.forEach(channel => {
      console.log(`ID: ${channel.id} | Nombre: "${channel.name}" | Prefijo: "${channel.prefix}" | Formato: "${channel.format}"`);
    });
    console.log(`Total canales: ${channelsResult.rows.length}\n`);

    // 3. Verificar usernames con JOIN para mostrar nombres reales
    console.log('👤 USERNAMES (con nombres de modelo/canal):');
    console.log('=' .repeat(80));
    const usernamesQuery = `
      SELECT 
        u.id,
        m.name as model_name,
        c.name as channel_name,
        u.username,
        u.model_id,
        u.channel_id,
        u.created_at
      FROM usernames u
      JOIN models m ON u.model_id = m.id
      JOIN channels c ON u.channel_id = c.id
      ORDER BY m.name, c.name, u.created_at
      LIMIT 20;
    `;
    
    const usernamesResult = await client.query(usernamesQuery);
    usernamesResult.rows.forEach(username => {
      console.log(`${username.model_name}/${username.channel_name}: "${username.username}" (IDs: ${username.model_id}/${username.channel_id})`);
    });
    console.log(`Mostrando 20 de ? usernames totales\n`);

    // 4. Contar usernames por modelo/canal
    console.log('📈 CONTEO DE USERNAMES POR MODELO/CANAL:');
    console.log('=' .repeat(60));
    const countQuery = `
      SELECT 
        m.name as model_name,
        c.name as channel_name,
        COUNT(u.id) as username_count,
        m.id as model_id,
        c.id as channel_id
      FROM models m
      CROSS JOIN channels c
      LEFT JOIN usernames u ON u.model_id = m.id AND u.channel_id = c.id
      GROUP BY m.id, m.name, c.id, c.name
      ORDER BY m.name, c.name;
    `;
    
    const countResult = await client.query(countQuery);
    countResult.rows.forEach(row => {
      const status = row.username_count > 0 ? '✅' : '❌';
      console.log(`${status} ${row.model_name}/${row.channel_name}: ${row.username_count} usernames (IDs: ${row.model_id}/${row.channel_id})`);
    });

    // 5. Verificar integridad de claves foráneas - usernames huérfanos
    console.log('\n🔍 VERIFICANDO INTEGRIDAD DE CLAVES FORÁNEAS:');
    console.log('=' .repeat(60));
    
    // Usernames con model_id inválido
    const orphanModelsQuery = `
      SELECT u.id, u.username, u.model_id, u.channel_id
      FROM usernames u
      LEFT JOIN models m ON u.model_id = m.id
      WHERE m.id IS NULL;
    `;
    const orphanModels = await client.query(orphanModelsQuery);
    console.log(`❓ Usernames con model_id inválido: ${orphanModels.rows.length}`);
    
    // Usernames con channel_id inválido
    const orphanChannelsQuery = `
      SELECT u.id, u.username, u.model_id, u.channel_id
      FROM usernames u
      LEFT JOIN channels c ON u.channel_id = c.id
      WHERE c.id IS NULL;
    `;
    const orphanChannels = await client.query(orphanChannelsQuery);
    console.log(`❓ Usernames con channel_id inválido: ${orphanChannels.rows.length}`);

    // 6. Verificar username_pointers
    console.log('\n🎯 POINTERS DE USERNAMES:');
    console.log('=' .repeat(60));
    const pointersQuery = `
      SELECT 
        up.id,
        m.name as model_name,
        c.name as channel_name,
        up.current_index,
        up.model_id,
        up.channel_id,
        up.updated_at
      FROM username_pointers up
      JOIN models m ON up.model_id = m.id
      JOIN channels c ON up.channel_id = c.id
      ORDER BY m.name, c.name;
    `;
    
    const pointersResult = await client.query(pointersQuery);
    pointersResult.rows.forEach(pointer => {
      console.log(`${pointer.model_name}/${pointer.channel_name}: index ${pointer.current_index} (IDs: ${pointer.model_id}/${pointer.channel_id})`);
    });
    console.log(`Total pointers: ${pointersResult.rows.length}`);

    // 7. Verificar si existen pointers sin usernames correspondientes
    console.log('\n🔍 POINTERS SIN USERNAMES:');
    console.log('=' .repeat(60));
    const pointersWithoutUsernamesQuery = `
      SELECT 
        up.id,
        m.name as model_name,
        c.name as channel_name,
        up.current_index,
        COUNT(u.id) as username_count
      FROM username_pointers up
      JOIN models m ON up.model_id = m.id
      JOIN channels c ON up.channel_id = c.id
      LEFT JOIN usernames u ON u.model_id = up.model_id AND u.channel_id = up.channel_id
      GROUP BY up.id, m.name, c.name, up.current_index
      HAVING COUNT(u.id) = 0;
    `;
    
    const pointersNoUsernames = await client.query(pointersWithoutUsernamesQuery);
    console.log(`❓ Pointers sin usernames: ${pointersNoUsernames.rows.length}`);
    pointersNoUsernames.rows.forEach(pointer => {
      console.log(`   ❌ ${pointer.model_name}/${pointer.channel_name}: pointer ${pointer.current_index} pero 0 usernames`);
    });

    // 8. Buscar específicamente CiaraBot
    console.log('\n🎯 BÚSQUEDA ESPECÍFICA - CiaraBot:');
    console.log('=' .repeat(60));
    
    // Buscar modelo CiaraBot (case insensitive)
    const ciaraBotQuery = `
      SELECT * FROM models WHERE LOWER(name) LIKE '%ciara%';
    `;
    const ciaraBotResult = await client.query(ciaraBotQuery);
    console.log(`Modelos que contienen "ciara": ${ciaraBotResult.rows.length}`);
    ciaraBotResult.rows.forEach(model => {
      console.log(`   📋 ID: ${model.id}, Nombre: "${model.name}", Color: ${model.color}`);
    });

    // Si encontramos CiaraBot, verificar sus usernames
    if (ciaraBotResult.rows.length > 0) {
      const ciaraModel = ciaraBotResult.rows[0];
      console.log(`\n🔍 Usernames para ${ciaraModel.name}:`);
      
      for (const channel of channelsResult.rows) {
        const ciaraUsernamesQuery = `
          SELECT COUNT(*) as count,
                 string_agg(username, ', ' ORDER BY created_at) as sample_usernames
          FROM (
            SELECT username, created_at 
            FROM usernames 
            WHERE model_id = $1 AND channel_id = $2
            ORDER BY created_at 
            LIMIT 3
          ) subquery;
        `;
        
        const ciaraUsernames = await client.query(ciaraUsernamesQuery, [ciaraModel.id, channel.id]);
        const count = parseInt(ciaraUsernames.rows[0].count);
        const samples = ciaraUsernames.rows[0].sample_usernames || [];
        
        const status = count > 0 ? '✅' : '❌';
        console.log(`   ${status} ${ciaraModel.name}/${channel.name}: ${count} usernames`);
        if (samples.length > 0) {
          console.log(`      Ejemplos: ${samples.join(', ')}`);
        }
      }
    }

    console.log('\n🎉 Verificación de integridad completada!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await client.end();
    console.log('\n✅ Conexión cerrada');
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  verifyDatabaseIntegrity().catch(console.error);
}

module.exports = { verifyDatabaseIntegrity }; 
