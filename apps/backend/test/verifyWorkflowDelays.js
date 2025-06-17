// test/verifyWorkflowDelays.js
// Script para verificar y arreglar los delays en las definiciones de workflow

const path = require('path');
require('dotenv').config({ 
  path: path.join(__dirname, '../.env') 
});

const workflowDb = require('../src/services/workflowDatabaseService');

async function verifyAndFixDelays() {
    console.log('🔍 Verificando delays en workflow definitions...\n');
    
    try {
        // Obtener todas las definiciones
        const definitions = await workflowDb.getAllWorkflowDefinitions();
        
        for (const def of definitions) {
            console.log(`📋 Workflow: ${def.type} (${def.name})`);
            console.log(`   Total steps: ${def.steps.length}`);
            
            let hasInvalidDelays = false;
            const fixedSteps = def.steps.map((step, index) => {
                const originalDelay = step.delay;
                const parsedDelay = parseInt(step.delay) || 0;
                
                if (isNaN(parsedDelay) || originalDelay !== parsedDelay) {
                    console.log(`   ❌ Step ${index + 1} (${step.id}): Invalid delay = "${originalDelay}" → Fixed to: ${parsedDelay}`);
                    hasInvalidDelays = true;
                    return { ...step, delay: parsedDelay };
                } else {
                    console.log(`   ✅ Step ${index + 1} (${step.id}): Delay OK = ${parsedDelay}ms (${parsedDelay/1000}s)`);
                    return step;
                }
            });
            
            // Si hay delays inválidos, actualizar la definición
            if (hasInvalidDelays) {
                console.log(`\n   🔧 Actualizando definición con delays corregidos...`);
                
                await workflowDb.upsertWorkflowDefinition({
                    name: def.name,
                    type: def.type,
                    description: def.description,
                    steps: fixedSteps,
                    config: def.config || {}
                });
                
                console.log(`   ✅ Workflow "${def.type}" actualizado!\n`);
            } else {
                console.log(`   ✅ Todos los delays son válidos!\n`);
            }
        }
        
        console.log('✨ Verificación completada!');
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        process.exit(0);
    }
}

// Ejecutar verificación
verifyAndFixDelays();