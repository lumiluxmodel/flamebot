const path = require("path");
require("dotenv").config({
  path: path.join(__dirname, "../.env"),
});

// Import controller directly
const aiController = require("../src/controllers/aiController");

// Suppress console.log temporarily for cleaner output
const originalLog = console.log;
const originalError = console.error;

function suppressLogs() {
  console.log = () => {};
  console.error = () => {};
}

function restoreLogs() {
  console.log = originalLog;
  console.error = originalError;
}

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
 * Generate prompt for a specific model (silently)
 */
async function generatePromptSilently(model, channel = "gram") {
  try {
    suppressLogs();
    
    const req = { body: { model, channel } };
    const res = createMockResponse();
    
    await aiController.generatePrompt(req, res);
    
    restoreLogs();
    
    if (res.data && res.data.success) {
      return {
        success: true,
        model: model,
        channel: channel,
        prompt: res.data.data.visibleText,
        obfuscated: res.data.data.obfuscatedText,
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
    restoreLogs();
    return {
      success: false,
      model,
      channel,
      error: error.message
    };
  }
}

/**
 * Simple clean output
 */
async function simpleTest() {
  console.log('\n🎯 TODOS LOS PROMPTS - SALIDA LIMPIA\n');
  
  const models = ['Andria', 'Elliana', 'Lexi', 'Mia'];
  
  for (const model of models) {
    const result = await generatePromptSilently(model);
    
    if (result.success) {
      console.log(`${model}: "${result.prompt}"`);
    } else {
      console.log(`${model}: ❌ ${result.error}`);
    }
  }
  
  console.log('\n✅ Terminado\n');
}

/**
 * Copyable format - just the prompts
 */
async function copyableFormat() {
  console.log('\n📋 PROMPTS PARA COPIAR:\n');
  
  const models = ['Andria', 'Elliana', 'Lexi', 'Mia'];
  
  for (const model of models) {
    const result = await generatePromptSilently(model);
    
    if (result.success) {
      console.log(`🎯 ${model}:`);
      console.log(result.prompt);
      console.log(''); // Línea en blanco
    }
  }
}

/**
 * Just the text - no labels
 */
async function onlyText() {
  console.log('\n📝 SOLO LOS TEXTOS:\n');
  
  const models = ['Andria', 'Elliana', 'Lexi', 'Mia'];
  
  for (const model of models) {
    const result = await generatePromptSilently(model);
    
    if (result.success) {
      console.log(result.prompt);
      console.log('---');
    }
  }
}

/**
 * Detailed but clean
 */
async function detailedClean() {
  console.log('\n📊 INFORMACIÓN COMPLETA (LIMPIO)\n');
  console.log('=' .repeat(60));
  
  const models = ['Andria', 'Elliana', 'Lexi', 'Mia'];
  
  for (const model of models) {
    const result = await generatePromptSilently(model);
    
    if (result.success) {
      console.log(`\n📝 MODELO: ${model}`);
      console.log(`📏 Longitud: ${result.length} caracteres`);
      console.log(`💬 Prompt:`);
      console.log(`"${result.prompt}"`);
      console.log('-' .repeat(50));
    } else {
      console.log(`\n❌ ${model}: ${result.error}`);
    }
  }
  
  console.log('\n✅ Completado!\n');
}

// Ejecutar según argumento
const testType = process.argv[2];

switch (testType) {
  case "simple":
    simpleTest();
    break;
  case "copy":
    copyableFormat();
    break;
  case "text":
    onlyText();
    break;
  case "detailed":
    detailedClean();
    break;
  default:
    console.log('\n🎯 OPCIONES DISPONIBLES:\n');
    console.log('npm run test:clean-prompts:simple   - Modelo: "prompt"');
    console.log('npm run test:clean-prompts:copy     - Formato copiable');
    console.log('npm run test:clean-prompts:text     - Solo los textos');
    console.log('npm run test:clean-prompts:detailed - Información completa');
    console.log('\nEjemplo: npm run test:clean-prompts:simple\n');
} 
