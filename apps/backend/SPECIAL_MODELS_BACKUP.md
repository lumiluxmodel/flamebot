# 🔥 SPECIAL MODELS BACKUP - PROMPT MANUAL FEATURE

**IMPORTANTE**: Este documento contiene TODA la información necesaria para restaurar la funcionalidad de **modelos especiales** (prompt manual) después de cambios en el código.

## 📋 PROBLEMA ORIGINAL

Los modelos especiales (`Andria`, `Elliana`, `Lexi`, `Mia`) no usaban correctamente el contenido predefinido de `prompt.json`. Parecía "random" - a veces usaba el prompt de Andria en otras cuentas.

**CAUSA**: Acceso incorrecto a la base de datos - usaba `accountData?.model` (undefined) en lugar de `accountData?.model_name`.

## 🎯 ESTADO ACTUAL FUNCIONAL

### 1. Archivo: `apps/backend/src/config/prompt.json`
```json
{
  "Andria": "O⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥F⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥:⁥ ⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥An⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥dri⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥aP it⁥⁥⁥⁥s f⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥re⁥⁥⁥⁥⁥⁥⁥⁥e",
  "Elliana": "O⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥F⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥:⁥ ⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥El⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥lia⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥naK it⁥⁥⁥⁥s f⁥⁥⁥⁥⁥⁥re⁥⁥⁥⁥⁥⁥⁥e",
  "Lexi": "O⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥F⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥:⁥ ⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥Pi⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥nkL⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥exi it⁥⁥⁥⁥s f⁥⁥⁥⁥⁥⁥⁥⁥re⁥⁥⁥⁥⁥⁥⁥⁥e",
  "Mia": "O⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥F⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥:⁥ ⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥Mi⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥aa⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥Y it⁥⁥⁥⁥s f⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥re⁥⁥⁥⁥⁥⁥⁥⁥e"
}
```

### 2. Archivo: `apps/backend/src/services/flamebotActionsService.js`

#### **FUNCIÓN updateBio() - LÍNEAS 25-50 APROX**
```javascript
async updateBio(accountId, bio = null) {
  console.log(`📝 Updating bio for account ${accountId}`);
  
  // Check if this is a special model that uses predefined content (case-insensitive)
  const specialModels = ['andria', 'elliana', 'lexi', 'mia'];
  const accountData = await this.getAccountData(accountId);
  const model = (accountData?.model_name || '').trim();  // ✅ IMPORTANTE: model_name NO model
  const normalizedModel = model.toLowerCase();
  
  console.log(`🔍 Debug BIO - Account data model_name: "${accountData?.model_name}", model: "${model}"`);
  
  if (specialModels.includes(normalizedModel)) {
    console.log(`🎯 Special model detected: ${model} - using predefined content`);
    const promptData = require('../config/prompt.json');
    // Accede a la clave con mayúscula inicial para el JSON
    const jsonKey = model.charAt(0).toUpperCase() + model.slice(1).toLowerCase();
    console.log(`🔑 Using JSON key: "${jsonKey}" for bio lookup`);
    bio = promptData[jsonKey];
    console.log(`✅ Using predefined bio for ${jsonKey}: "${bio?.substring(0, 50)}..."`);
    
    if (!bio) {
      console.error(`❌ No bio found for key "${jsonKey}" in prompt.json`);
      console.log(`Available keys:`, Object.keys(promptData));
    }
  } else if (!bio) {
    console.log('🤖 Generating new bio...');
    const bios = await aiService.generateBios(1);
    bio = bios[0].text;
    console.log(`✅ Generated bio: "${bio.substring(0, 50)}..."`);
  }
  
  // resto del código...
}
```

#### **FUNCIÓN updatePrompt() - LÍNEAS 86-125 APROX**
```javascript
async updatePrompt(accountId, model, channel, promptText = null) {
  console.log(`💬 Updating prompt for account ${accountId}`);
  
  let visibleText = promptText;
  let obfuscatedText;
  
  // Check if this is a special model that uses predefined content (case-insensitive)
  const specialModels = ['andria', 'elliana', 'lexi', 'mia'];
  
  // 🔧 FIX: Get model from database like updateBio does, with fallback to parameter
  const accountData = await this.getAccountData(accountId);
  const actualModel = (accountData?.model_name || model || '').trim();  // ✅ IMPORTANTE: model_name NO model
  const normalizedModel = actualModel.toLowerCase();
  
  console.log(`🔍 Debug - Account data model_name: "${accountData?.model_name}", fallback model: "${model}", actualModel: "${actualModel}"`);
  
  if (specialModels.includes(normalizedModel)) {
    console.log(`🎯 Special model detected: ${actualModel} - using predefined content`);
    const promptData = require('../config/prompt.json');
    // Accede a la clave con mayúscula inicial para el JSON
    const jsonKey = actualModel.charAt(0).toUpperCase() + actualModel.slice(1).toLowerCase();
    console.log(`🔑 Using JSON key: "${jsonKey}" for prompt lookup`);
    visibleText = promptData[jsonKey];
    obfuscatedText = promptData[jsonKey]; // Same content for obfuscated
    console.log(`✅ Using predefined prompt for ${jsonKey}: "${visibleText?.substring(0, 50)}..."`);
    
    if (!visibleText) {
      console.error(`❌ No prompt found for key "${jsonKey}" in prompt.json`);
      console.log(`Available keys:`, Object.keys(promptData));
    }
  } else if (!promptText) {
    console.log('🤖 Generating new prompt...');
    // Use the actual model for AI generation
    const finalModel = actualModel || model;
    const usernameData = await usernameService.getNextUsername(finalModel, channel);
    const promptData = await aiService.generatePrompt(finalModel, channel, usernameData.username);
    visibleText = promptData.visibleText;
    obfuscatedText = promptData.obfuscatedText;
    console.log(`✅ Generated prompt: "${visibleText}"`);
  }
  
  // resto del código...
}
```

### 3. Scripts en `apps/backend/package.json`
```json
{
  "scripts": {
    "test:generation": "node test/testGenerationDirect.js",
    "test:special-models": "node test/testSpecialModels.js",
    "test:generation:bio": "node test/testGenerationDirect.js bio",
    "test:generation:prompt": "node test/testGenerationDirect.js prompt",
    "test:generation:all": "node test/testGenerationDirect.js -- --all",
    "test:models": "pnpm run test:special-models && pnpm run test:generation"
  }
}
```

## 🚨 CAMBIOS CRÍTICOS QUE HACER SI SE PIERDE

### 1. **CAMBIO PRINCIPAL** - En flamebotActionsService.js:

**❌ INCORRECTO (causa el bug):**
```javascript
const model = (accountData?.model || '').trim();
```

**✅ CORRECTO (fix):**
```javascript
const model = (accountData?.model_name || '').trim();
```

**POR QUÉ**: La base de datos devuelve `model_name`, no `model`. Sin este cambio, `model` será `undefined` y nunca detectará modelos especiales.

### 2. **MODELOS ESPECIALES** - Array en ambas funciones:
```javascript
const specialModels = ['andria', 'elliana', 'lexi', 'mia'];
```

### 3. **LÓGICA DE DETECCIÓN** - En ambas funciones:
```javascript
const normalizedModel = model.toLowerCase();
if (specialModels.includes(normalizedModel)) {
  // Usar contenido predefinido
  const promptData = require('../config/prompt.json');
  const jsonKey = model.charAt(0).toUpperCase() + model.slice(1).toLowerCase();
  // usar promptData[jsonKey]
}
```

### 4. **DEBUG LOGGING** - Para diagnosticar problemas:
```javascript
console.log(`🔍 Debug - Account data model_name: "${accountData?.model_name}", actualModel: "${actualModel}"`);
console.log(`🔑 Using JSON key: "${jsonKey}" for prompt lookup`);
```

## 🧪 TESTS PARA VERIFICAR

### Test Rápido:
```bash
cd apps/backend
npm run test:special-models
```

**Resultado esperado:**
```
✅ ALL TESTS PASSED! Special model fix is working correctly.
```

### Test Individual:
```bash
node test/testGenerationDirect.js prompt Andria gram
```

### Verificar Logs:
Debes ver:
```
🔍 Debug - Account data model_name: "Andria", actualModel: "Andria"
🔑 Using JSON key: "Andria" for prompt lookup
✅ Using predefined prompt for Andria: "O⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥F..."
```

## 🎯 CÓMO RESTAURAR DESPUÉS DE CAMBIOS

### 1. **Verificar que prompt.json existe y tiene las claves correctas**
### 2. **Aplicar los cambios en flamebotActionsService.js:**
   - Cambiar `model` por `model_name` en `getAccountData`
   - Añadir array `specialModels`
   - Añadir lógica de detección
   - Añadir debug logging
### 3. **Copiar los archivos de test:**
   - `test/testSpecialModels.js`
   - `test/testGenerationDirect.js`
   - `test/README.md`
### 4. **Actualizar package.json con scripts**
### 5. **Ejecutar test para verificar:** `npm run test:special-models`

## 💡 PUNTOS IMPORTANTES

- **Base de datos**: Devuelve `model_name`, NO `model`
- **Case sensitivity**: Modelos en BD pueden tener mayúsculas (Andria), array de comparación en minúsculas (andria)
- **JSON keys**: Usar `model.charAt(0).toUpperCase() + model.slice(1).toLowerCase()` para generar clave
- **Fallback**: updatePrompt tiene fallback al parámetro si BD no devuelve modelo
- **Debug**: Los logs son esenciales para diagnosticar si el modelo se detecta correctamente

## 🔄 FLUJO COMPLETO

1. Usuario importa cuenta con modelo "Andria"
2. Se guarda en BD como `model_name = "Andria"`
3. updatePrompt llama `getAccountData(accountId)`
4. BD devuelve `{ model_name: "Andria", ... }`
5. Código detecta `normalizedModel = "andria"` en array `specialModels`
6. Genera `jsonKey = "Andria"`
7. Busca `promptData["Andria"]` en prompt.json
8. Usa contenido predefinido en lugar de AI

**Si falla cualquier paso = comportamiento "random"** 
