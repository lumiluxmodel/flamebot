// scripts/move-usernames-snap-to-gram.js
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

async function moveUsernamesSnapToGram() {
  console.log('🔄 Moviendo usernames de CiaraBot/snap → CiaraBot/gram...\n');

  try {
    await client.connect();
    console.log('✅ Conectado a la base de datos Railway\n');

    // 1. Verificar datos actuales
    console.log('📊 ESTADO ACTUAL:');
    console.log('=' .repeat(50));
    
    const currentStatsQuery = `
      SELECT 
        m.name as model_name,
        c.name as channel_name,
        COUNT(u.id) as username_count
      FROM models m
      CROSS JOIN channels c
      LEFT JOIN usernames u ON u.model_id = m.id AND u.channel_id = c.id
      WHERE m.name = 'CiaraBot'
      GROUP BY m.name, c.name, m.id, c.id
      ORDER BY c.name;
    `;
    
    const currentStats = await client.query(currentStatsQuery);
    currentStats.rows.forEach(row => {
      console.log(`${row.model_name}/${row.channel_name}: ${row.username_count} usernames`);
    });

    // 2. Obtener IDs de modelo y canales
    const modelQuery = "SELECT id, name FROM models WHERE name = 'CiaraBot'";
    const modelResult = await client.query(modelQuery);
    
    if (modelResult.rows.length === 0) {
      console.error('❌ CiaraBot model not found!');
      return;
    }
    
    const modelId = modelResult.rows[0].id;
    console.log(`\n✅ Model ID: ${modelId}`);

    const channelsQuery = "SELECT id, name FROM channels WHERE name IN ('snap', 'gram')";
    const channelsResult = await client.query(channelsQuery);
    
    const snapChannel = channelsResult.rows.find(c => c.name === 'snap');
    const gramChannel = channelsResult.rows.find(c => c.name === 'gram');
    
    if (!snapChannel || !gramChannel) {
      console.error('❌ snap or gram channel not found!');
      return;
    }
    
    console.log(`✅ Snap Channel ID: ${snapChannel.id}`);
    console.log(`✅ Gram Channel ID: ${gramChannel.id}`);

    // 3. Obtener usernames de snap
    const snapUsernamesQuery = `
      SELECT username, created_at 
      FROM usernames 
      WHERE model_id = $1 AND channel_id = $2 
      ORDER BY created_at;
    `;
    
    const snapUsernames = await client.query(snapUsernamesQuery, [modelId, snapChannel.id]);
    console.log(`\n📋 Encontrados ${snapUsernames.rows.length} usernames en CiaraBot/snap:`);
    snapUsernames.rows.forEach((row, i) => {
      console.log(`   ${i + 1}. ${row.username}`);
    });

    if (snapUsernames.rows.length === 0) {
      console.log('⚠️ No hay usernames en snap para mover');
      return;
    }

    // 4. Verificar si ya existen usernames en gram
    const gramUsernamesQuery = `
      SELECT COUNT(*) as count FROM usernames 
      WHERE model_id = $1 AND channel_id = $2;
    `;
    
    const gramCount = await client.query(gramUsernamesQuery, [modelId, gramChannel.id]);
    const existingGramCount = parseInt(gramCount.rows[0].count);
    
    if (existingGramCount > 0) {
      console.log(`\n⚠️ Ya existen ${existingGramCount} usernames en CiaraBot/gram`);
      console.log('¿Deseas reemplazarlos? (Continuando automáticamente...)');
    }

    // 5. Comenzar transacción para mover usernames
    await client.query('BEGIN');
    
    try {
      // Eliminar usernames existentes en gram
      if (existingGramCount > 0) {
        await client.query(
          'DELETE FROM usernames WHERE model_id = $1 AND channel_id = $2',
          [modelId, gramChannel.id]
        );
        console.log(`\n🗑️ Eliminados ${existingGramCount} usernames existentes en gram`);
      }

      // Mover usernames de snap a gram (UPDATE)
      const moveQuery = `
        UPDATE usernames 
        SET channel_id = $1 
        WHERE model_id = $2 AND channel_id = $3;
      `;
      
      const moveResult = await client.query(moveQuery, [gramChannel.id, modelId, snapChannel.id]);
      console.log(`\n✅ Movidos ${moveResult.rowCount} usernames de snap → gram`);

      // Actualizar/crear pointer para gram
      const createPointerQuery = `
        INSERT INTO username_pointers (model_id, channel_id, current_index) 
        VALUES ($1, $2, 0)
        ON CONFLICT (model_id, channel_id) 
        DO UPDATE SET current_index = 0, updated_at = CURRENT_TIMESTAMP;
      `;
      
      await client.query(createPointerQuery, [modelId, gramChannel.id]);
      console.log('✅ Pointer para gram actualizado/creado');

      // Eliminar pointer de snap si no tiene usernames
      await client.query(
        'DELETE FROM username_pointers WHERE model_id = $1 AND channel_id = $2',
        [modelId, snapChannel.id]
      );
      console.log('✅ Pointer de snap eliminado');

      await client.query('COMMIT');
      console.log('\n🎉 Transacción completada exitosamente!');

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }

    // 6. Verificar resultado final
    console.log('\n📊 ESTADO FINAL:');
    console.log('=' .repeat(50));
    
    const finalStats = await client.query(currentStatsQuery);
    finalStats.rows.forEach(row => {
      const status = row.username_count > 0 ? '✅' : '❌';
      console.log(`${status} ${row.model_name}/${row.channel_name}: ${row.username_count} usernames`);
    });

    // 7. Probar obtener username de gram
    console.log('\n🧪 PRUEBA - Obtener username de CiaraBot/gram:');
    console.log('=' .repeat(50));
    
    const testQuery = `
      SELECT u.username, up.current_index
      FROM usernames u
      JOIN username_pointers up ON up.model_id = u.model_id AND up.channel_id = u.channel_id
      WHERE u.model_id = $1 AND u.channel_id = $2
      ORDER BY u.created_at
      LIMIT 1 OFFSET up.current_index;
    `;
    
    const testResult = await client.query(testQuery, [modelId, gramChannel.id]);
    if (testResult.rows.length > 0) {
      console.log(`✅ Próximo username: "${testResult.rows[0].username}" (index: ${testResult.rows[0].current_index})`);
    } else {
      console.log('❌ No se pudo obtener username de prueba');
    }

    console.log('\n🎉 ¡Migración completada! Ahora puedes usar CiaraBot/gram');

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
  moveUsernamesSnapToGram().catch(console.error);
}

module.exports = { moveUsernamesSnapToGram }; 
