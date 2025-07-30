# 🧪 Estrategia de Testing para Flamebot Backend

## 📋 Resumen Ejecutivo

Esta documentación define la estrategia integral de testing para el backend de Flamebot, incluyendo configuración de Jest, patrones de testing, cobertura de código y recomendaciones para mantener la calidad del software.

## 🎯 Objetivos de Testing

### **Objetivos Principales:**
1. **Prevenir regresiones** cuando se añaden nuevas features
2. **Validar funcionalidad crítica** (importación, IA, workflows)
3. **Facilitar refactoring** con confianza
4. **Documentar comportamiento** esperado del código
5. **Reducir bugs** en producción

### **Métricas de Éxito:**
- **Cobertura de código**: Mínimo 80%
- **Tests pasando**: 100% en CI/CD
- **Tiempo de ejecución**: < 30 segundos para suite completa
- **Flaky tests**: 0% (tests que fallan intermitentemente)

## 🏗️ Arquitectura de Testing

### **Estructura de Directorios:**
```
tests/
├── __tests__/              # Tests principales
│   ├── controllers/        # Tests de endpoints HTTP
│   ├── services/          # Tests de lógica de negocio
│   ├── utils/             # Tests de funciones auxiliares
│   └── integration/       # Tests de integración (futuro)
├── __mocks__/             # Mocks reutilizables
│   ├── express.js         # Mock de req/res
│   ├── config.js          # Configuración de test
│   └── services/          # Mocks de servicios externos
├── fixtures/              # Datos de prueba
├── setup.js               # Configuración global
└── teardown.js            # Limpieza post-tests
```

### **Tipos de Tests:**

#### **1. Tests Unitarios** (80% del total)
- **Alcance**: Funciones individuales, métodos de clase
- **Características**: Rápidos, aislados, determinísticos
- **Mocks**: Todas las dependencias externas

#### **2. Tests de Integración** (15% del total)
- **Alcance**: Interacción entre módulos
- **Características**: Más lentos, usan base de datos de test
- **Mocks**: Solo servicios externos (APIs)

#### **3. Tests E2E** (5% del total)
- **Alcance**: Flujos completos de usuario
- **Características**: Lentos, usan entorno completo
- **Mocks**: Mínimos, principalmente APIs externas

## ⚙️ Configuración de Jest

### **jest.config.js:**
```javascript
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: [
    '**/__tests__/**/*.js',
    '**/*.test.js',
    '**/*.spec.js'
  ],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/index.js',           // Archivo de entrada
    '!src/config/**',          // Configuración
    '!src/test/**',            // Tests antiguos
    '!src/scripts/**'          // Scripts de utilidad
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testTimeout: 30000,
  verbose: true,
  clearMocks: true,
  restoreMocks: true,
  resetMocks: true
};
```

### **Variables de Entorno de Test:**
```env
NODE_ENV=test
PORT=3001
DATABASE_URL=postgresql://user:password@localhost:5432/flamebot_test
FLAMEBOT_API_URL=http://localhost:3002/mock-api
FLAMEBOT_API_KEY=test-api-key
OPENAI_API_KEY=test-openai-key
LOG_LEVEL=error
DISABLE_CRON=true
```

## 🎨 Patrones de Testing

### **1. Tests de Controladores (HTTP)**

```javascript
describe('AccountController', () => {
  let req, res;

  beforeEach(() => {
    req = mockRequest();
    res = mockResponse();
  });

  describe('importAccount', () => {
    it('should import account successfully', async () => {
      // Arrange
      req.body = validAccountData;
      mockService.importAccount.mockResolvedValue(successResponse);

      // Act
      await controller.importAccount(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            accountId: expect.any(String)
          })
        })
      );
    });

    it('should handle validation errors', async () => {
      // Test error scenarios
    });
  });
});
```

### **2. Tests de Servicios (Lógica de Negocio)**

```javascript
describe('AIService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generatePrompt', () => {
    it('should generate prompt with correct format', async () => {
      // Mock OpenAI response
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: 'test prompt' } }]
      });

      const result = await aiService.generatePrompt('Lola', 'gram', 'user123');

      expect(result).toMatchObject({
        model: 'Lola',
        channel: 'gram',
        username: 'user123',
        visibleText: expect.any(String),
        obfuscatedText: expect.any(String)
      });
    });

    it('should handle API rate limits', async () => {
      mockOpenAI.chat.completions.create.mockRejectedValue(
        new Error('Rate limit exceeded')
      );

      await expect(
        aiService.generatePrompt('Lola', 'gram', 'user123')
      ).rejects.toThrow('OpenAI rate limit exceeded');
    });
  });
});
```

### **3. Tests de Workflows (Procesos Complejos)**

```javascript
describe('WorkflowManager', () => {
  beforeEach(() => {
    workflowManager.isInitialized = true;
  });

  describe('startAccountAutomation', () => {
    it('should start complete automation workflow', async () => {
      // Mock all workflow dependencies
      mockDatabase.createWorkflow.mockResolvedValue({ id: 'workflow-123' });
      mockScheduler.scheduleWorkflowTasks.mockResolvedValue({ success: true });
      mockExecutor.startExecution.mockResolvedValue({ success: true });

      const result = await workflowManager.startAccountAutomation(
        'account-456',
        accountData,
        'default'
      );

      // Verify complete workflow setup
      expect(mockDatabase.createWorkflow).toHaveBeenCalledWith(
        expect.objectContaining({
          accountId: 'account-456',
          type: 'default'
        })
      );
      expect(mockScheduler.scheduleWorkflowTasks).toHaveBeenCalled();
      expect(mockExecutor.startExecution).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });
  });
});
```

## 🎯 Cobertura de Testing

### **Estado Actual:**

#### ✅ **Completamente Testeado:**
- **AIService**: 16/16 tests pasando
  - Generación de prompts y bios
  - Manejo de errores de OpenAI
  - Obfuscación de texto
  - Validación de límites de caracteres

- **AccountController**: 25/25 tests pasando
  - Importación individual y masiva
  - Validación de datos
  - Manejo de workflows
  - Health checks

#### 🟡 **Parcialmente Testeado:**
- **WorkflowManager**: 7/31 tests pasando
  - Tests básicos funcionando
  - Necesita mocking más sofisticado
  - Faltan tests de edge cases

#### ❌ **Sin Tests:**
- **FlamebotService**: API externa
- **DatabaseService**: Acceso a datos
- **CronManager**: Programación de tareas
- **WorkflowExecutor**: Ejecución de workflows

### **Prioridades de Testing:**

#### **Alta Prioridad:**
1. **FlamebotService** - Integración crítica con API externa
2. **DatabaseService** - Acceso a datos críticos
3. **WorkflowExecutor** - Lógica de automatización central

#### **Media Prioridad:**
4. **CronManager** - Programación de tareas
5. **Routes** - Endpoints de API
6. **Formatters** - Validación y transformación

#### **Baja Prioridad:**
7. **Config** - Configuración estática
8. **Middlewares** - Funciones simples
9. **Utils** - Funciones auxiliares

## 🔧 Comandos de Testing

### **Scripts Disponibles:**
```bash
# Tests básicos
pnpm test                    # Ejecutar todos los tests
pnpm test:watch             # Modo watch para desarrollo
pnpm test:coverage          # Con reporte de cobertura
pnpm test:verbose           # Output detallado

# Tests específicos
pnpm test:unit              # Solo tests unitarios
pnpm test aiService         # Test específico por nombre
pnpm test controllers/      # Tests de un directorio

# Coverage y reportes
pnpm test:coverage:html     # Reporte HTML interactivo
pnpm test:coverage:lcov     # Para herramientas CI/CD
```

### **Flujo de Desarrollo:**
```bash
# 1. Desarrollo con tests en watch mode
pnpm test:watch

# 2. Antes de commit, verificar coverage
pnpm test:coverage

# 3. En CI/CD, tests completos con timeout
pnpm test --ci --maxWorkers=2 --coverage
```

## 🎭 Estrategias de Mocking

### **1. Servicios Externos (APIs):**
```javascript
// Mock OpenAI completamente
jest.mock('openai', () => ({
  OpenAI: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn()
      }
    }
  }))
}));
```

### **2. Base de Datos:**
```javascript
// Mock database service
jest.mock('../../../src/services/databaseService', () => ({
  createWorkflow: jest.fn(),
  updateWorkflow: jest.fn(),
  getWorkflow: jest.fn(),
  deleteWorkflow: jest.fn()
}));
```

### **3. Configuración:**
```javascript
// Mock config con datos de test
jest.mock('../../../src/config', () => ({
  server: { port: 3001, env: 'test' },
  flamebot: { apiKey: 'test-key', baseUrl: 'http://test-api' },
  openai: { apiKey: 'test-openai-key' }
}));
```

### **4. Express Request/Response:**
```javascript
const mockRequest = (options = {}) => ({
  body: options.body || {},
  params: options.params || {},
  query: options.query || {},
  headers: options.headers || {}
});

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};
```

## 📊 Métricas y Monitoreo

### **Coverage Targets:**
```javascript
// jest.config.js
coverageThreshold: {
  global: {
    branches: 80,      // Cobertura de branches
    functions: 80,     // Cobertura de funciones
    lines: 80,         // Cobertura de líneas
    statements: 80     // Cobertura de declaraciones
  },
  // Por directorio
  'src/controllers/': {
    functions: 90,
    lines: 90
  },
  'src/services/': {
    functions: 85,
    lines: 85
  }
}
```

### **CI/CD Integration:**
```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '20'
      - run: pnpm install
      - run: pnpm test:coverage
      - uses: codecov/codecov-action@v1
        with:
          file: ./coverage/lcov.info
```

## 🐛 Testing de Casos Edge

### **Errores de Red:**
```javascript
it('should handle network timeouts', async (done) => {
  const timeoutError = new Error('Network timeout');
  timeoutError.code = 'ECONNABORTED';
  
  mockAxios.post.mockRejectedValue(timeoutError);
  
  const result = await service.callExternalAPI();
  expect(result.success).toBe(false);
  expect(result.error).toContain('timeout');
  done();
}, 10000);
```

### **Rate Limiting:**
```javascript
it('should handle rate limiting with exponential backoff', async () => {
  const rateLimitError = new Error('Rate limit exceeded');
  rateLimitError.response = { status: 429 };
  
  mockAPI.mockRejectedValueOnce(rateLimitError)
         .mockResolvedValueOnce({ success: true });
  
  const result = await service.callAPI();
  expect(result.success).toBe(true);
  expect(mockAPI).toHaveBeenCalledTimes(2);
});
```

### **Memory Leaks:**
```javascript
describe('memory management', () => {
  let initialMemory;
  
  beforeAll(() => {
    initialMemory = process.memoryUsage().heapUsed;
  });
  
  afterAll(() => {
    global.gc && global.gc(); // Force garbage collection if available
    const finalMemory = process.memoryUsage().heapUsed;
    const memoryIncrease = finalMemory - initialMemory;
    
    // Warn if memory increased significantly
    if (memoryIncrease > 10 * 1024 * 1024) { // 10MB
      console.warn(`Memory increased by ${memoryIncrease / 1024 / 1024}MB`);
    }
  });
});
```

## 🚀 Mejores Prácticas

### **1. Estructura de Tests:**
```javascript
describe('FeatureName', () => {
  // Setup
  beforeEach(() => {
    // Reset mocks, initialize test data
  });

  describe('methodName', () => {
    it('should handle success case', () => {
      // Arrange, Act, Assert
    });

    it('should handle error case', () => {
      // Test error scenarios
    });

    it('should handle edge cases', () => {
      // Test boundary conditions
    });
  });
});
```

### **2. Naming Conventions:**
- **Descriptivo**: `should import account when valid data provided`
- **Específico**: `should throw ValidationError when authToken is missing`
- **Actionable**: `should retry API call when rate limited`

### **3. Aserciones Efectivas:**
```javascript
// ❌ Evitar aserciones genéricas
expect(result).toBeTruthy();

// ✅ Aserciones específicas
expect(result).toEqual({
  success: true,
  accountId: expect.stringMatching(/^acc-\d+$/),
  createdAt: expect.any(String)
});
```

### **4. Test Data Management:**
```javascript
// fixtures/accounts.js
export const validAccount = {
  authToken: 'valid-token',
  proxy: 'http://proxy.example.com',
  model: 'Lola',
  // ... más campos
};

export const invalidAccount = {
  ...validAccount,
  authToken: null // Invalid
};
```

## 🔮 Roadmap de Testing

### **Fase 1: Fundación (Actual)**
- ✅ Configuración de Jest
- ✅ Tests de AIService
- ✅ Tests de AccountController
- 🟡 Tests de WorkflowManager (parcial)

### **Fase 2: Cobertura Completa**
- [ ] Tests de FlamebotService
- [ ] Tests de DatabaseService
- [ ] Tests de CronManager
- [ ] Tests de WorkflowExecutor
- [ ] Tests de Routes

### **Fase 3: Testing Avanzado**
- [ ] Tests de integración con DB real
- [ ] Tests E2E con Supertest
- [ ] Performance testing
- [ ] Load testing
- [ ] Chaos engineering

### **Fase 4: Automatización**
- [ ] CI/CD pipeline completo
- [ ] Automated regression testing
- [ ] Visual regression testing
- [ ] Security testing automation

## 📚 Recursos y Referencias

### **Documentación:**
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest GitHub](https://github.com/visionmedia/supertest)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)

### **Herramientas Recomendadas:**
- **Coverage**: Istanbul (incluido en Jest)
- **Mocking**: Jest mocks + Manual mocks
- **HTTP Testing**: Supertest
- **Database Testing**: Jest con DB en memoria
- **Visual Testing**: Jest-image-snapshot (futuro)

### **Patrones Útiles:**
- **AAA Pattern**: Arrange, Act, Assert
- **Given-When-Then**: BDD style testing
- **Test Doubles**: Mocks, Stubs, Spies, Fakes
- **Page Object Model**: Para tests E2E (futuro)

---

**Esta estrategia de testing asegura que el backend de Flamebot mantenga alta calidad y confiabilidad mientras evoluciona con nuevas features.** 🧪✨