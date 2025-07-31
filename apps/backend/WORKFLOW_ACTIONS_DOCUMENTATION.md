# 📚 WORKFLOW ACTIONS - DOCUMENTACIÓN COMPLETA

## 🎯 INFORMACIÓN GENERAL

El sistema de workflows ha sido completamente actualizado para ser **DATABASE-FIRST**. Todas las configuraciones, límites y parámetros ahora se almacenan dinámicamente en la base de datos.

---

## 🔄 ACCIÓN: `goto`

### ✨ **NUEVA FUNCIONALIDAD MEJORADA**

La acción `goto` ahora soporta **loops infinitos** y **límites configurables** con tracking automático en base de datos.

### 📋 **Estructura JSON:**
```javascript
{
  "id": "unique_step_id",
  "action": "goto",
  "delay": 0,                           // Opcional: delay antes de ejecutar
  "nextStep": "target_step_id",         // REQUERIDO: ID del step destino
  "description": "Loop back to swipe",  // Opcional: descripción
  
  // 🆕 NUEVOS PARÁMETROS OPCIONALES:
  "infiniteAllowed": true,              // true = sin límite, false = usar maxIterations
  "maxIterations": 1000,                // Máximo número de iteraciones (si infiniteAllowed = false)
  "trackIterations": true               // true = guardar conteo en BD (recomendado)
}
```

### ⚙️ **Configuración por Defecto (Base de Datos):**
```json
{
  "default_max_iterations": 1000,
  "infinite_allowed": true,
  "track_iterations": true
}
```

### 🔢 **Comportamiento:**

#### **Caso 1: Loop Infinito (Recomendado)**
```javascript
{
  "id": "loop_forever",
  "action": "goto",
  "nextStep": "start_swipe",
  "infiniteAllowed": true        // ✅ Loop infinito permitido
}
```
- **Resultado**: El workflow puede hacer loops para siempre
- **Tracking**: Se guarda el número de iteraciones en `workflow_instances.goto_iterations`
- **Límite**: Ninguno

#### **Caso 2: Loop con Límite**
```javascript
{
  "id": "limited_retry",
  "action": "goto", 
  "nextStep": "retry_step",
  "infiniteAllowed": false,      // ❌ No infinito
  "maxIterations": 5             // ✅ Máximo 5 veces
}
```
- **Resultado**: Después de 5 iteraciones, lanza error y falla el workflow
- **Error**: `Goto loop limit exceeded: limited_retry_to_retry_step (5/5)`

#### **Caso 3: Usar Configuración Global**
```javascript
{
  "id": "default_loop",
  "action": "goto",
  "nextStep": "target_step"
  // Sin infiniteAllowed ni maxIterations = usa config de BD
}
```
- **Comportamiento**: Usa los valores de `system_config.workflow.goto_limits`

### 🗄️ **Almacenamiento en Base de Datos:**

#### **Tabla: `workflow_instances`**
```sql
-- Nueva columna para tracking de iteraciones
goto_iterations JSONB DEFAULT '{}'::jsonb

-- Ejemplo de contenido:
{
  "loop_forever_to_start_swipe": 1523,
  "limited_retry_to_retry_step": 3,
  "check_loop_to_validate": 45
}
```

#### **Tabla: `system_config`**
```sql
-- Configuración global de goto limits
key: 'workflow.goto_limits'
value: {
  "default_max_iterations": 1000,
  "infinite_allowed": true, 
  "track_iterations": true
}
```

### 🚨 **Validaciones UI:**

```javascript
// Validación para tu UI
function validateGotoStep(stepData) {
  // nextStep es obligatorio
  if (!stepData.nextStep) {
    return { valid: false, error: "nextStep es requerido" };
  }
  
  // Si infiniteAllowed = false, maxIterations debe existir
  if (stepData.infiniteAllowed === false && !stepData.maxIterations) {
    return { valid: false, error: "maxIterations requerido cuando infiniteAllowed = false" };
  }
  
  // maxIterations debe ser número positivo
  if (stepData.maxIterations && stepData.maxIterations <= 0) {
    return { valid: false, error: "maxIterations debe ser mayor a 0" };
  }
  
  return { valid: true };
}
```

---

## ⏳ ACCIÓN: `wait`

### 📋 **Estructura JSON:**
```javascript
{
  "id": "wait_step",
  "action": "wait",
  "delay": 30000,                    // REQUERIDO: tiempo en milisegundos
  "description": "Wait 30 seconds"   // Opcional: descripción
}
```

### ⚙️ **Timeouts Dinámicos (Base de Datos):**
- **Timeout base**: `delay + 30000ms` (30 segundos buffer)
- **Timeout máximo**: `86400000ms` (24 horas) 
- **Configuración**: `system_config.workflow.timeouts.max_wait_time`

### 🚨 **Validaciones UI:**
```javascript
function validateWaitStep(stepData) {
  if (!stepData.delay || stepData.delay < 0) {
    return { valid: false, error: "delay debe ser >= 0" };
  }
  
  if (stepData.delay > 24 * 60 * 60 * 1000) { // 24 horas
    return { valid: false, error: "delay máximo: 24 horas" };
  }
  
  return { valid: true };
}
```

---

## 🤖 ACCIÓN: `add_prompt`

### 📋 **Estructura JSON:**
```javascript
{
  "id": "add_prompt_step",
  "action": "add_prompt",
  "delay": 0,                        // Opcional: delay antes de ejecutar
  "model": "Lola",                   // Opcional: modelo específico
  "channel": "gram",                 // Opcional: canal específico  
  "critical": true,                  // Opcional: si falla, falla todo el workflow
  "description": "Add AI prompt"     // Opcional: descripción
}
```

### ⚙️ **Configuración Dinámica:**
- **Timeout**: `90000ms` (1.5 minutos) desde `system_config.workflow.timeouts.add_prompt`
- **Modelo por defecto**: Del account data
- **Canal por defecto**: Del account data

### 🚨 **Validaciones UI:**
```javascript
function validateAddPromptStep(stepData) {
  // Validar modelo si se especifica
  const validModels = ['Lola', 'Aura', 'Iris']; // Desde BD
  if (stepData.model && !validModels.includes(stepData.model)) {
    return { valid: false, error: "Modelo inválido" };
  }
  
  // Validar canal si se especifica  
  const validChannels = ['gram', 'tinder', 'bumble']; // Desde BD
  if (stepData.channel && !validChannels.includes(stepData.channel)) {
    return { valid: false, error: "Canal inválido" };
  }
  
  return { valid: true };
}
```

---

## 👤 ACCIÓN: `add_bio`

### 📋 **Estructura JSON:**
```javascript
{
  "id": "add_bio_step", 
  "action": "add_bio",
  "delay": 0,                        // Opcional: delay antes de ejecutar
  "bio": "Custom bio text",          // Opcional: bio personalizada
  "critical": false,                 // Opcional: si falla, continúa workflow
  "description": "Add profile bio"   // Opcional: descripción
}
```

### ⚙️ **Configuración Dinámica:**
- **Timeout**: `120000ms` (2 minutos) desde `system_config.workflow.timeouts.add_bio`
- **Bio por defecto**: Generada por AI si no se especifica

### 🚨 **Validaciones UI:**
```javascript
function validateAddBioStep(stepData) {
  // Validar longitud de bio personalizada
  if (stepData.bio && stepData.bio.length > 500) {
    return { valid: false, error: "Bio máximo 500 caracteres" };
  }
  
  return { valid: true };
}
```

---

## 💘 ACCIÓN: `swipe_with_spectre`

### 📋 **Estructura JSON:**
```javascript
{
  "id": "swipe_session",
  "action": "swipe_with_spectre", 
  "delay": 0,                        // Opcional: delay antes de ejecutar
  "swipeCount": 20,                  // REQUERIDO: número de swipes
  "critical": true,                  // Opcional: si falla, falla workflow
  "description": "Auto swipe session" // Opcional: descripción
}
```

### ⚙️ **Configuración Dinámica:**
- **Timeout**: `300000ms` (5 minutos) desde `system_config.workflow.timeouts.swipe_with_spectre`
- **Swipe mínimo**: 1
- **Swipe máximo**: 100 (configurable)

### 🚨 **Validaciones UI:**
```javascript
function validateSwipeStep(stepData) {
  if (!stepData.swipeCount || stepData.swipeCount < 1) {
    return { valid: false, error: "swipeCount debe ser >= 1" };
  }
  
  if (stepData.swipeCount > 100) {
    return { valid: false, error: "swipeCount máximo: 100" };
  }
  
  return { valid: true };
}
```

---

## ⚙️ CONFIGURACIONES GLOBALES

### 🗄️ **Tabla: `system_config`**

#### **Timeouts por Acción:**
```json
// key: 'workflow.timeouts'
{
  "add_bio": 120000,           // 2 minutos
  "add_prompt": 90000,         // 1.5 minutos  
  "swipe": 180000,             // 3 minutos
  "swipe_with_spectre": 300000, // 5 minutos
  "wait": 30000,               // 30 segundos buffer
  "default": 120000,           // 2 minutos por defecto
  "max_workflow_timeout": 86400000, // 24 horas máximo workflow
  "max_wait_time": 86400000    // 24 horas máximo wait
}
```

#### **Límites de Goto:**
```json
// key: 'workflow.goto_limits'  
{
  "default_max_iterations": 1000,
  "infinite_allowed": true,
  "track_iterations": true
}
```

#### **Configuración de Retry:**
```json
// key: 'workflow.retry'
{
  "max_retries": 3,
  "retry_backoff_ms": 30000,
  "max_retry_delay": 300000
}
```

#### **Monitoreo:**
```json
// key: 'workflow.monitoring'
{
  "max_execution_time": 600000,
  "max_failure_rate": 0.3,
  "max_retry_rate": 0.5, 
  "max_concurrent_executions": 100,
  "health_check_interval": 60000
}
```

---

## 🎯 EJEMPLO COMPLETO DE WORKFLOW

### **Workflow con Goto Infinito:**
```javascript
{
  "name": "Continuous Activity Loop",
  "type": "continuous_infinite", 
  "description": "Loop infinito de actividad",
  "steps": [
    {
      "id": "start",
      "action": "add_prompt",
      "delay": 0,
      "model": "Lola",
      "critical": true,
      "description": "Generar prompt inicial"
    },
    {
      "id": "swipe_session", 
      "action": "swipe_with_spectre",
      "delay": 0,
      "swipeCount": 15,
      "critical": true,
      "description": "Sesión de swipes"
    },
    {
      "id": "rest_period",
      "action": "wait", 
      "delay": 300000,
      "description": "Descanso de 5 minutos"
    },
    {
      "id": "infinite_loop",
      "action": "goto",
      "delay": 0,
      "nextStep": "swipe_session",
      "infiniteAllowed": true,        // ✅ INFINITO
      "trackIterations": true,        // ✅ TRACKING
      "description": "Loop infinito de swipes"
    }
  ],
  "config": {
    "maxRetries": 3,
    "allowLoops": true,
    "description": "Loop continuo sin límites"
  }
}
```

### **Workflow con Goto Limitado:**
```javascript
{
  "name": "Retry Limited Workflow",
  "type": "retry_limited",
  "description": "Workflow con límite de reintentos", 
  "steps": [
    {
      "id": "try_action",
      "action": "add_prompt",
      "delay": 0,
      "critical": false,
      "description": "Intentar acción"
    },
    {
      "id": "check_result",
      "action": "wait",
      "delay": 5000, 
      "description": "Esperar resultado"
    },
    {
      "id": "retry_loop",
      "action": "goto",
      "delay": 0,
      "nextStep": "try_action",
      "infiniteAllowed": false,       // ❌ NO INFINITO
      "maxIterations": 3,             // ✅ MÁXIMO 3 VECES
      "trackIterations": true,
      "description": "Reintentar máximo 3 veces"
    },
    {
      "id": "final_step",
      "action": "add_bio", 
      "delay": 0,
      "description": "Paso final después de reintentos"
    }
  ]
}
```

---

## 🔧 APIS PARA TU UI

### **Obtener Configuraciones:**
```javascript
// GET /api/system/config/workflow.timeouts
{
  "add_bio": 120000,
  "add_prompt": 90000,
  "swipe_with_spectre": 300000,
  // ...
}

// GET /api/system/config/workflow.goto_limits  
{
  "default_max_iterations": 1000,
  "infinite_allowed": true,
  "track_iterations": true
}
```

### **Obtener Estado de Workflow:**
```javascript
// GET /api/workflows/status/{accountId}
{
  "accountId": "test-account",
  "status": "active",
  "currentStep": 2,
  "totalSteps": 4,
  "progress": 50,
  "gotoIterations": {
    "infinite_loop_to_swipe_session": 45,
    "retry_loop_to_try_action": 2
  },
  "nextStep": {
    "id": "rest_period", 
    "action": "wait",
    "delay": 300000
  }
}
```

### **Validar Workflow antes de Guardar:**
```javascript
// POST /api/workflows/validate
{
  "workflow": { /* workflow definition */ },
  "response": {
    "valid": true,
    "errors": [],
    "warnings": [
      "Step 'infinite_loop' permite loops infinitos",
      "Step 'retry_loop' tiene límite de 3 iteraciones"
    ]
  }
}
```

---

## 🚨 VALIDACIONES GENERALES PARA UI

### **Validación de Step IDs:**
```javascript
function validateStepIds(workflow) {
  const stepIds = workflow.steps.map(s => s.id);
  const duplicates = stepIds.filter((id, index) => stepIds.indexOf(id) !== index);
  
  if (duplicates.length > 0) {
    return { valid: false, error: `Step IDs duplicados: ${duplicates.join(', ')}` };
  }
  
  return { valid: true };
}
```

### **Validación de Goto Targets:**
```javascript
function validateGotoTargets(workflow) {
  const stepIds = workflow.steps.map(s => s.id);
  const gotoSteps = workflow.steps.filter(s => s.action === 'goto');
  
  for (const gotoStep of gotoSteps) {
    if (!stepIds.includes(gotoStep.nextStep)) {
      return { 
        valid: false, 
        error: `Goto step '${gotoStep.id}' apunta a step inexistente: '${gotoStep.nextStep}'`
      };
    }
  }
  
  return { valid: true };
}
```

### **Validación de Loops Circulares:**
```javascript
function detectCircularLoops(workflow) {
  // Detectar loops que podrían ser problemáticos
  const warnings = [];
  const gotoSteps = workflow.steps.filter(s => s.action === 'goto');
  
  for (const gotoStep of gotoSteps) {
    if (gotoStep.infiniteAllowed === true) {
      warnings.push(`Step '${gotoStep.id}' permite loops infinitos`);
    } else if (gotoStep.maxIterations > 100) {
      warnings.push(`Step '${gotoStep.id}' permite ${gotoStep.maxIterations} iteraciones (alto)`);
    }
  }
  
  return { warnings };
}
```

---

## 📱 COMPONENTES UI SUGERIDOS

### **Goto Step Editor:**
```jsx
function GotoStepEditor({ stepData, onChange }) {
  return (
    <div>
      <input 
        placeholder="Target Step ID"
        value={stepData.nextStep || ''}
        onChange={e => onChange({...stepData, nextStep: e.target.value})}
        required
      />
      
      <label>
        <input 
          type="checkbox"
          checked={stepData.infiniteAllowed !== false}
          onChange={e => onChange({
            ...stepData, 
            infiniteAllowed: e.target.checked,
            maxIterations: e.target.checked ? undefined : 10
          })}
        />
        Permitir loops infinitos
      </label>
      
      {stepData.infiniteAllowed === false && (
        <input 
          type="number"
          placeholder="Max iterations"
          value={stepData.maxIterations || 10}
          onChange={e => onChange({...stepData, maxIterations: parseInt(e.target.value)})}
          min="1"
          max="1000"
        />
      )}
      
      <small>
        {stepData.infiniteAllowed !== false 
          ? "⚠️ Este step puede hacer loops para siempre"
          : `✅ Limitado a ${stepData.maxIterations || 10} iteraciones`
        }
      </small>
    </div>
  );
}
```

---

## 🎉 RESUMEN PARA UI

### ✅ **Cambios Principales:**
1. **Goto Steps**: Ahora soportan `infiniteAllowed` y `maxIterations`
2. **Timeouts**: Dinámicos desde base de datos
3. **Tracking**: Todas las iteraciones se guardan en BD
4. **Validaciones**: Más estrictas y específicas
5. **Configuración**: Todo configurable desde `system_config`

### 📊 **Datos a Mostrar en UI:**
- **Goto iterations**: Cuántas veces ha ejecutado cada loop
- **Step timeouts**: Timeouts dinámicos por acción
- **Workflow progress**: Progreso real desde BD
- **Configuration**: Configuraciones globales editables

### 🚨 **Alertas a Implementar:**
- Warning cuando `infiniteAllowed = true`
- Error cuando `nextStep` no existe
- Warning cuando `maxIterations > 100`
- Info sobre tracking automático de iterations

¡Con esta documentación tienes toda la información para actualizar tu UI correctamente! 🎯