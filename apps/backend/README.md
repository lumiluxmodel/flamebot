# 🔥 Flamebot Backend - Sistema de Automatización para Tinder

## 📝 Descripción General

Flamebot Backend es un sistema completo de automatización para cuentas de Tinder que proporciona:

- **Importación automática de cuentas** con validación completa
- **Generación de contenido con IA** (bios y prompts personalizados)
- **Workflows automatizados** con programación cron
- **Dashboard web** para monitoreo en tiempo real
- **API REST completa** para todas las operaciones

## 🏗️ Arquitectura del Sistema

### Stack Tecnológico
- **Runtime**: Node.js 20+
- **Framework**: Express.js
- **Base de Datos**: PostgreSQL (con soporte SQLite para desarrollo)
- **IA**: OpenAI GPT-4o/GPT-3.5-turbo
- **Automatización**: node-cron
- **Testing**: Jest + Supertest
- **Logging**: Console (configurable a Winston)

### Estructura del Proyecto
```
apps/backend/
├── src/
│   ├── controllers/         # Manejadores de rutas HTTP
│   ├── services/           # Lógica de negocio y servicios externos
│   ├── routes/             # Definición de endpoints API
│   ├── config/             # Configuración de la aplicación
│   ├── middlewares/        # Middleware de Express
│   └── utils/              # Utilidades y helpers
├── tests/                  # Tests unitarios y de integración
├── public/                 # Dashboard web estático
└── scripts/               # Scripts de utilidad
```

## 🚀 Funcionalidades Principales

### 1. Gestión de Cuentas

#### **Importación Individual**
- Validación completa de datos de cuenta
- Soporte para múltiples formatos de entrada
- Inicio automático de workflows
- Retroalimentación en tiempo real

#### **Importación Masiva**
- Procesamiento por lotes eficiente
- Validación individual de cada cuenta
- Manejo de errores granular
- Estadísticas detalladas de importación

### 2. Generación de Contenido con IA

#### **Bios Personalizadas**
- Múltiples estilos y tonos
- Optimizadas para engagement masculino
- Límite de caracteres configurable
- Generación por lotes

#### **Prompts Dinámicos**
- Soporte para múltiples canales (Snap, Instagram, OnlyFans)
- Obfuscación de texto avanzada
- Personalización por modelo de IA
- Integración con base de datos de prefijos

### 3. Sistema de Workflows

#### **Tipos de Workflow**
- **Default**: Flujo estándar balanceado
- **Aggressive**: Mayor frecuencia de acciones
- **Test**: Para pruebas y desarrollo

#### **Automatización**
- Bio updates programados
- Generación de prompts automática
- Swipe campaigns inteligentes
- Activación de modo "Spectre"

### 4. Programación y Monitoreo

#### **Cron Jobs**
- Tareas programadas flexibles
- Recuperación automática de fallos
- Monitoreo de salud en tiempo real
- Logs detallados de ejecución

#### **Dashboard Web**
- Vista en tiempo real de workflows activos
- Estadísticas de rendimiento
- Control manual de workflows
- Health checks automáticos

## 🔧 API Reference

### Endpoints de Cuentas

#### `POST /api/accounts/import`
Importa una cuenta individual con configuración de workflow.

**Body Parameters:**
```json
{
  "authToken": "string (required)",
  "proxy": "string (required)",
  "model": "Lola|Aura|Ciara|Iris (required)",
  "location": "lat,lng (required)",
  "refreshToken": "string (required)",
  "deviceId": "string (required)",
  "persistentId": "string (required)",
  "channel": "gram|snap|of (optional, default: gram)",
  "startAutomation": "boolean (optional, default: true)",
  "workflowType": "default|aggressive|test (optional, default: default)"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Account imported successfully",
  "data": {
    "accountId": "account-uuid",
    "taskId": "task-uuid",
    "model": "Lola",
    "channel": "gram",
    "automation": {
      "enabled": true,
      "workflowType": "default",
      "started": true,
      "error": null
    }
  }
}
```

#### `POST /api/accounts/import-multiple`
Importa múltiples cuentas en una sola operación.

**Body Parameters:**
```json
{
  "accounts": [
    {
      "authToken": "string",
      "proxy": "string",
      "model": "string",
      // ... resto de campos como import individual
    }
  ],
  "startAutomation": true,
  "workflowType": "default"
}
```

### Endpoints de IA

#### `POST /api/ai/generate-prompt`
Genera un prompt personalizado para un canal específico.

**Body Parameters:**
```json
{
  "model": "Lola|Aura|Ciara|Iris",
  "channel": "gram|snap|of",
  "username": "string"
}
```

#### `POST /api/ai/generate-bios`
Genera múltiples bios optimizadas.

**Body Parameters:**
```json
{
  "count": 5
}
```

### Endpoints de Workflows

#### `GET /api/workflows/active`
Obtiene todos los workflows activos con estadísticas.

#### `GET /api/workflows/account/:accountId/status`
Obtiene el estado detallado de un workflow específico.

#### `POST /api/workflows/account/:accountId/pause`
Pausa temporalmente un workflow.

#### `POST /api/workflows/account/:accountId/resume`
Reanuda un workflow pausado.

#### `DELETE /api/workflows/account/:accountId/stop`
Detiene permanentemente un workflow.

**Body Parameters:**
```json
{
  "deleteData": false
}
```

### Endpoints de Acciones

#### `POST /api/actions/swipe`
Ejecuta una campaña de swipes.

#### `POST /api/actions/update-bio`
Actualiza la bio de una cuenta.

#### `POST /api/actions/update-prompt`
Actualiza el prompt de una cuenta.

#### `POST /api/actions/enable-spectre`
Activa el modo spectre en una cuenta.

## 🧪 Testing

### Estructura de Tests
```
tests/
├── __tests__/              # Tests principales
│   ├── controllers/        # Tests de controladores
│   ├── services/          # Tests de servicios
│   └── utils/             # Tests de utilidades
├── __mocks__/             # Mocks reutilizables
└── setup.js               # Configuración global de tests
```

### Comandos de Testing
```bash
# Ejecutar todos los tests
pnpm test

# Tests con coverage
pnpm test:coverage

# Tests en modo watch
pnpm test:watch

# Tests unitarios específicos
pnpm test:unit

# Tests con output detallado
pnpm test:verbose
```

### Cobertura de Tests

#### **Servicios Testeados:**
- ✅ **AIService**: Generación de contenido con OpenAI
- ✅ **AccountController**: Importación y gestión de cuentas
- ✅ **WorkflowManager**: Automatización y workflows (parcial)

#### **Funcionalidades Cubiertas:**
- Generación de prompts y bios
- Importación individual y masiva
- Validación de datos de entrada
- Manejo de errores de API
- Estados de workflow básicos

## 🔧 Configuración

### Variables de Entorno

#### **Servidor**
```env
PORT=3000
NODE_ENV=development
```

#### **APIs Externas**
```env
FLAMEBOT_API_KEY=your-flamebot-api-key
FLAMEBOT_API_BASE_URL=https://api.flamebot-tin.com
OPENAI_API_KEY=your-openai-api-key
```

#### **Base de Datos**
```env
DATABASE_URL=postgresql://user:password@localhost:5432/flamebot
```

#### **Modelos IA**
```env
MODEL_LOLA=lola-personality-instructions
MODEL_AURA=aura-personality-instructions
MODEL_CIARA=ciara-personality-instructions
MODEL_IRIS=iris-personality-instructions
```

### Configuración de Desarrollo

1. **Instalar dependencias:**
   ```bash
   pnpm install
   ```

2. **Configurar variables de entorno:**
   ```bash
   cp .env.example .env
   # Editar .env con tus credenciales
   ```

3. **Ejecutar en modo desarrollo:**
   ```bash
   pnpm dev
   ```

4. **Ejecutar tests:**
   ```bash
   pnpm test
   ```

## 📊 Monitoreo y Logs

### Health Checks
- **Endpoint**: `GET /api/accounts/health`
- **Verifica**: API de Flamebot, OpenAI, Base de datos, Workflows
- **Respuesta**: Estado de cada servicio + timestamp

### Logging
```javascript
// Configuración actual (Console)
console.log("✅ Success message");
console.error("❌ Error message");
console.warn("⚠️ Warning message");

// Recomendado: Migrar a Winston
const logger = require('./config/logger');
logger.info('Success message');
logger.error('Error message');
```

### Métricas de Workflow
```javascript
{
  "stats": {
    "active": 15,
    "paused": 3,
    "stopped": 2,
    "total": 20
  },
  "health": {
    "healthy": true,
    "initialized": true,
    "timestamp": "2023-01-01T00:00:00.000Z"
  }
}
```

## 🐛 Problemas Conocidos y Mejoras

### **Issues Identificados:**

1. **Console.log en Exceso** (324+ instancias)
   - **Impacto**: Performance y logs desordenados
   - **Solución**: Migrar a Winston/Bunyan

2. **Mock Data en Producción**
   - **Archivos**: `mockController.js`
   - **Solución**: Eliminar completamente

3. **Manejo de Errores Inconsistente**
   - **Problema**: Errores tragados silenciosamente
   - **Solución**: Middleware global de errores

4. **Falta de Rate Limiting**
   - **Riesgo**: Abuse de API
   - **Solución**: Implementar express-rate-limit

5. **Credenciales Hardcodeadas**
   - **Archivo**: `databaseService.js`
   - **Solución**: Validación estricta de ENV vars

### **Mejoras Sugeridas:**

#### **Corto Plazo:**
- [ ] Implementar Winston para logging
- [ ] Remover todos los console.log
- [ ] Añadir validación con Joi/Zod
- [ ] Implementar rate limiting
- [ ] Crear middleware de error handling global

#### **Mediano Plazo:**
- [ ] Añadir autenticación JWT
- [ ] Implementar circuit breakers
- [ ] Añadir métricas con Prometheus
- [ ] Documentar API con Swagger
- [ ] Implementar health checks avanzados

#### **Largo Plazo:**
- [ ] Migrar a TypeScript
- [ ] Implementar microservicios
- [ ] Añadir cache con Redis
- [ ] Implementar event sourcing
- [ ] Añadir monitoring con DataDog/NewRelic

## 🚦 Estados de Workflow

### **Estados Principales:**
- **`active`**: Ejecutándose normalmente
- **`paused`**: Pausado temporalmente (reanudable)
- **`stopped`**: Detenido permanentemente
- **`failed`**: Error crítico en ejecución
- **`completed`**: Finalizado exitosamente

### **Transiciones de Estado:**
```
active → paused (reversible)
active → stopped (permanente)
active → failed (requiere intervención)
paused → active (manual)
paused → stopped (manual)
stopped → [no hay transiciones]
```

## 📈 Métricas y KPIs

### **Métricas de Importación:**
- Cuentas importadas exitosamente vs. fallidas
- Tiempo promedio de importación
- Tasa de éxito de validación

### **Métricas de IA:**
- Prompts generados por minuto
- Bios generadas por modelo
- Tasa de éxito de OpenAI API

### **Métricas de Workflow:**
- Workflows activos simultáneos
- Tiempo de ejecución promedio
- Tasa de finalización exitosa

## 🔒 Seguridad

### **Implementado:**
- Helmet.js para headers de seguridad
- CORS configurado
- Validación básica de entrada

### **Pendiente:**
- Autenticación/Autorización
- Rate limiting
- Input sanitization
- API key rotation
- Audit logging

## 🤝 Contribución

### **Convenciones de Código:**
- Usar `const`/`let` en lugar de `var`
- Nombres descriptivos para funciones y variables
- Comentarios JSDoc para funciones públicas
- Manejo explícito de errores async/await

### **Testing:**
- Tests unitarios obligatorios para nuevas funciones
- Coverage mínimo del 80%
- Mocks para servicios externos
- Tests de integración para endpoints críticos

### **Commits:**
```bash
# Formato recomendado
git commit -m "feat: add bio generation with custom models"
git commit -m "fix: resolve workflow memory leak issue"
git commit -m "test: add unit tests for AIService"
```

---

## 📞 Soporte

Para reportar bugs o solicitar features:
1. Revisar [issues existentes](https://github.com/your-repo/issues)
2. Crear nuevo issue con template apropiado
3. Incluir logs relevantes y pasos para reproducir

**Mantenido por el equipo de Flamebot** 🔥