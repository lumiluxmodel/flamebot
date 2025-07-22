const path = require("path");
require("dotenv").config({
  path: path.join(__dirname, "../.env"),
});

// Import controller directly
const aiController = require("../src/controllers/aiController");

/**
 * Mock Express response object
 */
function createMockResponse() {
  const res = {
    statusCode: 200,
    data: null,
    
    status(code) {
      this.statusCode = code;
      return this;
    },
    
    json(data) {
      this.data = data;
      this.headersSent = true;
      return this;
    }
  };
  
  return res;
}

/**
 * Generate prompt for a specific model
 */
async function generatePromptForModel(model, channel = "gram") {
  try {
    const req = { body: { model, channel } };
    const res = createMockResponse();
    
    await aiController.generatePrompt(req, res);
    
    if (res.data && res.data.success) {
      return {
        success: true,
        model: res.data.data.model || model,
        channel: res.data.data.channel || channel,
        prompt: res.data.data.visibleText,
        length: res.data.data.visibleText.length
      };
    } else {
      return {
        success: false,
        model,
        channel,
        error: res.data?.error || 'Unknown error'
      };
    }
  } catch (error) {
    return {
      success: false,
      model,
      channel,
      error: error.message
    };
  }
}

/**
 * Test all models and display results
 */
async function testAllPrompts() {
  console.log('\n🎯 GENERANDO PROMPTS DE TODOS LOS MODELOS\n');
  console.log('=' .repeat(80));
  
  // Modelos especiales que usan prompt.json
  const specialModels = ['Andria', 'Elliana', 'Lexi', 'Mia'];
  
  for (const model of specialModels) {
    console.log(`\n📝 MODELO: ${model}`);
    console.log('-'.repeat(50));
    
    const result = await generatePromptForModel(model);
    
    if (result.success) {
      console.log(`✅ Generación exitosa`);
      console.log(`📏 Longitud: ${result.length} caracteres`);
      console.log(`💬 Prompt generado:`);
      console.log(`"${result.prompt}"`);
    } else {
      console.log(`❌ Error: ${result.error}`);
    }
    
    console.log('-'.repeat(50));
    
    // Pequeña pausa entre modelos
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n' + '=' .repeat(80));
  console.log('🎉 PRUEBA COMPLETADA - Todos los prompts generados');
  console.log('=' .repeat(80) + '\n');
}

/**
 * Quick test - show only model names and prompts
 */
async function quickTest() {
  console.log('\n🚀 PRUEBA RÁPIDA - TODOS LOS MODELOS\n');
  
  const models = ['Andria', 'Elliana', 'Lexi', 'Mia'];
  
  for (const model of models) {
    const result = await generatePromptForModel(model);
    
    if (result.success) {
      console.log(`${model}: "${result.prompt}"`);
    } else {
      console.log(`${model}: ❌ Error - ${result.error}`);
    }
    
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  
  console.log('\n✅ Listo!\n');
}

/**
 * Show prompts with copyable format
 */
async function copyableTest() {
  console.log('\n📋 PROMPTS LISTOS PARA COPIAR\n');
  
  const models = ['Andria', 'Elliana', 'Lexi', 'Mia'];
  
  for (const model of models) {
    const result = await generatePromptForModel(model);
    
    if (result.success) {
      console.log(`\n🎯 ${model}:`);
      console.log(result.prompt);
    }
    
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  
  console.log('\n✅ Todos los prompts listados!\n');
}

// Ejecutar según argumento de línea de comandos
const testType = process.argv[2];

switch (testType) {
  case "quick":
    quickTest();
    break;
  case "copyable":
    copyableTest();
    break;
  default:
    testAllPrompts();
} 
