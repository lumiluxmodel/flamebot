# 🔥 Flamebot v2.0 - Workflow Management System

Un sistema de gestión de workflows moderno construido con un monorepo usando TurboRepo, React + Vite para el frontend y Node.js/Express para el backend.

## 📁 Estructura del Proyecto

```
flamebot/
├── apps/
│   ├── frontend/          # React + Vite frontend
│   └── backend/           # Node.js/Express backend
├── packages/
│   └── shared/            # Tipos y utilidades compartidas
├── turbo.json            # Configuración de TurboRepo
└── package.json          # Dependencias del workspace raíz
```

## 🚀 Instalación y Configuración

### Prerequisitos
- Node.js >= 18
- npm >= 8

### Instalación
```bash
# Clonar el repositorio
git clone <repository-url>
cd flamebot

# Instalar dependencias del workspace raíz
npm install

# Instalar dependencias de todas las aplicaciones
npm run install:all

# Compilar el paquete compartido
npm run build:shared
```

## 💻 Comandos de Desarrollo

### Ejecutar todo el stack de desarrollo
```bash
# Ejecutar frontend y backend simultáneamente
npm run dev
```

### Ejecutar aplicaciones individualmente
```bash
# Solo frontend (puerto 3000)
npm run dev:frontend

# Solo backend (puerto 3090)
npm run dev:backend
```

### Comandos de construcción
```bash
# Construir todas las aplicaciones
npm run build

# Construir solo frontend
npm run build:frontend

# Construir solo backend
npm run build:backend
```

### Otros comandos útiles
```bash
# Linting
npm run lint

# Verificación de tipos
npm run type-check
```

## 🏗️ Arquitectura del Sistema

### Frontend (React + Vite)
- **Puerto**: 3000
- **Framework**: React 18 con Vite
- **UI**: Diseño terminal con tema Matrix/Cyberpunk
- **Estado**: React hooks para manejo de estado
- **API**: Axios para comunicación con el backend
- **Iconos**: Lucide React

### Backend (Node.js + Express)
- **Puerto**: 3090
- **Framework**: Express.js
- **API**: RESTful endpoints
- **Automatización**: Node-cron para tareas programadas
- **Middleware**: CORS, logging personalizado

### Paquete Compartido
- **Tipos**: TypeScript interfaces compartidas
- **Utilidades**: Funciones helper comunes
- **Validaciones**: Validadores de datos

## 🎨 Diseño y UI

El frontend mantiene el diseño original del terminal con:
- ASCII art header
- Barra de estado en tiempo real
- Sistema de pestañas (Dashboard, Workflows, Monitoring, etc.)
- Tema Matrix/Cyberpunk con efectos de glow verde
- Diseño responsive
- Animaciones y transiciones suaves

### Tabs Disponibles:
- **📊 Dashboard**: Vista general del sistema
- **🔄 Active Workflows**: Workflows en ejecución
- **📈 Monitoring**: Métricas y alertas del sistema
- **📚 Workflows**: Definiciones de workflows
- **💻 Console**: Terminal legacy

## 🔧 Configuración

### Proxy de API
El frontend tiene configurado un proxy en Vite para redirigir las peticiones `/api/*` al backend en el puerto 3090.

### Variables de Entorno
Crea archivos `.env` en cada aplicación según sea necesario:

```bash
# apps/frontend/.env
VITE_API_URL=http://localhost:3090

# apps/backend/.env
PORT=3090
NODE_ENV=development
```

## 🛠️ Desarrollo

### Agregar nuevas funcionalidades
1. **Tipos compartidos**: Agregar en `packages/shared/src/types.ts`
2. **Utilidades**: Agregar en `packages/shared/src/utils.ts`
3. **Componentes**: Crear en `apps/frontend/src/components/`
4. **API Routes**: Agregar en `apps/backend/src/routes/`

### Convenciones de código
- **Nombres de archivos**: PascalCase para componentes, camelCase para utilidades
- **Commits**: Usar conventional commits
- **ESLint**: Configurado para mantener consistencia

## 📦 Scripts Disponibles

### Workspace raíz
- `npm run dev` - Ejecutar frontend y backend
- `npm run build` - Construir todas las aplicaciones
- `npm run lint` - Linting de todo el proyecto
- `npm run type-check` - Verificación de tipos

### Frontend específico
- `npm run dev:frontend` - Solo frontend
- `npm run build:frontend` - Solo build del frontend

### Backend específico
- `npm run dev:backend` - Solo backend
- `npm run build:backend` - Solo build del backend

## 🚀 Despliegue

### Frontend
El frontend puede ser desplegado en cualquier hosting estático (Vercel, Netlify, etc.)

### Backend
El backend puede ser desplegado en plataformas como Railway, Heroku, o cualquier VPS.

## 🤝 Contribución

1. Fork el proyecto
2. Crear una rama para tu feature (`git checkout -b feature/amazing-feature`)
3. Commit tus cambios (`git commit -m 'Add amazing feature'`)
4. Push a la rama (`git push origin feature/amazing-feature`)
5. Abrir un Pull Request

## 📝 Licencia

Este proyecto está bajo la licencia MIT.

## 🆘 Soporte

Si tienes problemas o preguntas:
1. Revisa la documentación
2. Busca en los issues existentes
3. Crea un nuevo issue con detalles del problema 