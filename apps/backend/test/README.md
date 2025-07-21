# Flamebot Test Suite

Este directorio contiene varios tests para verificar la funcionalidad de Flamebot.

## 🆕 Nuevos Tests (Especiales)

### Test de Modelos Especiales
Verifica que los modelos especiales (Andria, Elliana, Lexi, Mia) usen correctamente el contenido predefinido de `prompt.json`.

#### **Test con Mock Data (para desarrollo):**
```bash
# Ejecutar test completo de modelos especiales (mock)
npm run test:special-models

# O ejecutar directamente
node test/testSpecialModels.js
```

#### **🆕 Test con Datos Reales (recomendado):**
```bash
# Ejecutar test con datos reales de la base de datos
npm run test:special-models-real

# O ejecutar directamente
node test/testSpecialModelsReal.js
```

**¿Qué verifica?**
- ✅ Que `updateBio` use el contenido correcto de `prompt.json` para modelos especiales
- ✅ Que `updatePrompt` use el contenido correcto de `prompt.json` para modelos especiales  
- ✅ Que los modelos normales (como Aura) sigan usando generación AI
- ✅ Que se acceda correctamente a `model_name` de la base de datos
- ✅ **NUEVO**: Funciona con cuentas reales importadas en tu base de datos

### Test de Generación Directa
Prueba los controladores de producción directamente sin pasar por APIs.

```bash
# Test completo de generación
npm run test:generation

# Solo test de bios
npm run test:generation:bio

# Solo test de prompts  
npm run test:generation:prompt

# Test de prompt específico
npm run test:generation:prompt aura gram

# Test de todas las combinaciones modelo/canal
npm run test:generation:all
```

**Opciones específicas:**
```bash
# Generar solo bios
node test/testGenerationDirect.js bio 3

# Generar prompt para modelo específico
node test/testGenerationDirect.js prompt Andria gram

# Mostrar solo texto ofuscado para copiar
node test/testGenerationDirect.js obfuscated Lexi of

# Generar múltiples prompts
node test/testGenerationDirect.js multiple lola of 5

# Test de rotación de usernames
node test/testGenerationDirect.js rotation iris snap
```

### Test de Generador de Prompts (prompt.json)
Verifica específicamente que los modelos especiales usen el contenido predefinido de `prompt.json` en lugar de generación por IA.

```bash
# Test básico - modelos especiales + modelo normal
npm run test:prompt-generator

# Test completo - todas las combinaciones modelo/canal especiales
npm run test:prompt-generator:all

# Test modelo especial específico
npm run test:prompt-generator:special Andria gram

# Test modelo normal (debe usar IA, no prompt.json)
npm run test:prompt-generator:normal Aura gram

# Mostrar solo contenido de prompt.json
npm run test:prompt-generator:show-json

# O ejecutar directamente
node test/testPromptGenerator.js
```

**¿Qué verifica?**
- ✅ **Modelos especiales** (Andria, Elliana, Lexi, Mia) usan texto exacto de `prompt.json`
- ✅ **Modelos normales** usan generación IA (no `prompt.json`)
- ✅ **Verificación de salida** - texto generado coincide con `prompt.json`
- ✅ **Texto ofuscado** se genera correctamente para modelos especiales
- ✅ **Todas las combinaciones** modelo/canal para prueba exhaustiva

**Resultados esperados:**
- Modelos especiales devuelven **texto exacto de `prompt.json`**
- Modelos normales devuelven **texto generado por IA** (diferente cada vez)
- Verificación muestra **PERFECT MATCH** para modelos especiales
- Texto ofuscado está **listo para copiar y usar**

### Test de Colores de Modelos
Verifica que los colores de los modelos se obtienen correctamente de la base de datos durante el import.

```bash
# Ejecutar test de colores de modelos
npm run test:model-colors

# O ejecutar directamente
node test/testModelColors.js
```

**¿Qué verifica?**
- ✅ Que se obtengan colores correctos de la base de datos
- ✅ Que los modelos especiales tengan colores correctos (no el default #44ab6c)
- ✅ Fallback al config si el modelo no está en BD
- ✅ Comportamiento con casos edge (modelos inexistentes, etc.)

### Test Combinado
Ejecuta tests para verificación completa:

```bash
# Test con mock data
npm run test:models

# Test con datos reales (recomendado)
npm run test:models-real

# Test completo: modelos especiales + colores
npm run test:complete
```

## 📋 Tests Existentes

### Test de AI
```bash
npm run test:ai
```

### Test de Import
```bash
npm run test:import  
```

### Test de Swipe
```bash
npm run test:swipe
```

### Test de Spectre
```bash
npm run test:spectre
```

### Test de Bio/Prompt (Legacy)
```bash
npm run test:bioprompt
```

### Todos los tests
```bash
npm run test:all
```

## 🔧 Solución de Problemas

### Error: OPENAI_API_KEY not found
Asegúrate de que tienes configurada la API key de OpenAI en tu `.env`:
```env
OPENAI_API_KEY=sk-...
```

### Error de base de datos
Verifica que el servicio de base de datos esté corriendo y configurado correctamente.

### Test de modelos especiales falla
1. Verifica que `prompt.json` existe y tiene las claves correctas: `Andria`, `Elliana`, `Lexi`, `Mia`
2. Revisa los logs de debug para ver qué modelo se está detectando desde la BD
3. Verifica que `getAccountData` devuelve `model_name` correctamente

## 📊 Interpretando Resultados

### Test de Modelos Especiales
- **✅ Verde**: El modelo especial está usando correctamente el contenido predefinido
- **❌ Rojo**: El modelo especial NO está usando el contenido predefinido (problema!)
- **⚠️ Amarillo**: Advertencia o comportamiento inesperado

### Debug Logs
Los logs de debug muestran:
```
🔍 Debug - Account data model_name: "Andria", fallback model: "aura", actualModel: "Andria"  
🔑 Using JSON key: "Andria" for prompt lookup
✅ Using predefined prompt for Andria: "O⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥F⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥:⁥ ⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥⁥An..."
```

Si ves que `model_name` es `undefined` o vacío, entonces hay un problema con la consulta a la base de datos.

## 🎯 Casos de Uso

### Para Desarrollo
```bash
# Verificar que tu fix funciona
npm run test:special-models

# Generar contenido real para testing
npm run test:generation:prompt Andria gram
```

### Para QA  
```bash
# Test completo antes de deployment
npm run test:models
npm run test:all
```

### Para Debugging
```bash
# Ver solo texto ofuscado específico
node test/testGenerationDirect.js obfuscated Elliana of

# Ver rotación de usernames
node test/testGenerationDirect.js rotation aura gram
```

## 📁 Archivos Generados

Los tests pueden generar archivos temporales:
- `obfuscated_[model]_[channel]_[timestamp].txt` - Texto ofuscado guardado para copiar
- Los archivos se guardan en el directorio `test/`

## 💡 Tips

1. **Ejecuta `test:special-models` primero** si estás verificando el fix de modelos especiales
2. **Usa argumentos específicos** para tests más rápidos y enfocados  
3. **Revisa los logs de debug** si algo no funciona como esperado
4. **Los tests usan mocks** para simular datos de BD, por lo que no afectan datos reales 
