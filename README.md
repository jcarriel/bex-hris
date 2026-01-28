# BEX HRIS - Human Resources Information System

Sistema completo de Gestión de Recursos Humanos desarrollado con Node.js, TypeScript, React y SQLite.

## 🚀 Características Principales

### Backend
- ✅ **Validación robusta** con Zod
- ✅ **Gestión de beneficios** completa
- ✅ **Reportes avanzados** (nómina, asistencia, licencias, empleados)
- ✅ **Controles diarios automatizados** con cron jobs
- ✅ **Notificaciones** por email y app
- ✅ **Base de datos optimizada** con 30+ índices
- ✅ **Tests unitarios** con Jest
- ✅ **API RESTful** con 50+ endpoints

### Frontend
- ✅ **Componentes reutilizables** (Button, Card, Input, Modal, Table, AdvancedFilters, InfiniteScroll)
- ✅ **Tema light/dark** con persistencia
- ✅ **PWA** (Progressive Web App)
- ✅ **Offline support** con Service Worker
- ✅ **Interfaz moderna** con Tailwind CSS
- ✅ **Gestión de estado** con Zustand
- ✅ **Paginación mejorada** (Offset, Cursor, Infinite Scroll)
- ✅ **Filtros avanzados** (9 operadores diferentes)

## 📋 Requisitos

- Node.js 18+
- npm o yarn
- SQLite3

## 🔧 Instalación

### Backend

```bash
cd backend
npm install
npm run build
npm start
```

**Variables de entorno** (`.env`):
```
DATABASE_PATH=./data/hris.db
JWT_SECRET=tu_secreto_aqui
JWT_EXPIRATION=365d
RESEND_API_KEY=tu_api_key_aqui
EMAIL_FROM=noreply@tudominio.com
ADMIN_EMAIL=admin@tudominio.com
PORT=3000
```

### Frontend

```bash
cd frontend
npm install
npm start
```

Accede a `http://localhost:3000`

## 📚 Documentación de API

### Autenticación
```
POST   /api/auth/register          - Registrar usuario
POST   /api/auth/login             - Iniciar sesión
POST   /api/auth/change-password   - Cambiar contraseña
```

### Empleados
```
GET    /api/employees              - Listar empleados
POST   /api/employees              - Crear empleado
GET    /api/employees/:id          - Obtener empleado
PUT    /api/employees/:id          - Actualizar empleado
DELETE /api/employees/:id          - Eliminar empleado
POST   /api/employees/:id/terminate - Terminar empleado
GET    /api/employees/contracts/expiring - Contratos próximos a vencer
```

### Beneficios
```
GET    /api/benefits               - Listar beneficios
POST   /api/benefits               - Crear beneficio
GET    /api/benefits/:id           - Obtener beneficio
PUT    /api/benefits/:id           - Actualizar beneficio
DELETE /api/benefits/:id           - Eliminar beneficio
POST   /api/benefits/assign        - Asignar beneficio a empleado
GET    /api/benefits/employee/:employeeId - Beneficios de empleado
GET    /api/benefits/employee/:employeeId/total - Total de beneficios
```

### Reportes
```
POST   /api/reports/payroll        - Reporte de nómina
POST   /api/reports/attendance     - Reporte de asistencia
POST   /api/reports/leaves         - Reporte de licencias
POST   /api/reports/employees      - Reporte de empleados
```

### Controles Diarios
```
GET    /api/daily-controls         - Listar controles
POST   /api/daily-controls/:type/enable  - Habilitar control
POST   /api/daily-controls/:type/disable - Deshabilitar control
```

## 🧪 Testing

### Ejecutar tests
```bash
npm test
```

### Ver cobertura
```bash
npm run test:coverage
```

### Watch mode
```bash
npm run test:watch
```

## 📊 Estructura del Proyecto

```
BEX-HRIS/
├── backend/
│   ├── src/
│   │   ├── controllers/        - Controladores de rutas
│   │   ├── services/           - Lógica de negocio
│   │   ├── repositories/       - Acceso a datos
│   │   ├── middleware/         - Middleware Express
│   │   ├── validators/         - Esquemas Zod
│   │   ├── notifications/      - Sistema de notificaciones
│   │   ├── config/             - Configuración
│   │   ├── utils/              - Utilidades
│   │   └── index.ts            - Punto de entrada
│   ├── jest.config.js          - Configuración de tests
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── components/         - Componentes reutilizables
    │   ├── pages/              - Páginas principales
    │   ├── stores/             - Estado global (Zustand)
    │   ├── services/           - Servicios API
    │   ├── App.tsx             - Componente raíz
    │   └── index.tsx           - Punto de entrada
    ├── public/
    │   ├── service-worker.js   - Service Worker para PWA
    │   ├── manifest.json       - Manifest de PWA
    │   └── index.html
    └── package.json
```

## 🎨 Componentes Frontend

### Button
```tsx
<Button variant="primary" size="md" loading={false}>
  Guardar
</Button>
```

### Card
```tsx
<Card hoverable shadow="md">
  Contenido
</Card>
```

### Input
```tsx
<Input 
  label="Email" 
  type="email" 
  error={error}
  helperText="Ingresa tu email"
/>
```

### Modal
```tsx
<Modal isOpen={open} onClose={handleClose} title="Título">
  Contenido del modal
</Modal>
```

### Table
```tsx
<Table 
  columns={columns} 
  data={data}
  hoverable
  striped
/>
```

### ThemeToggle
```tsx
<ThemeToggle />
```

## 🌙 Tema Light/Dark

El tema se persiste automáticamente en localStorage. Para cambiar:

```tsx
import { useThemeStore } from './stores/themeStore';

function MyComponent() {
  const { theme, toggleTheme } = useThemeStore();
  
  return (
    <button onClick={toggleTheme}>
      Tema actual: {theme}
    </button>
  );
}
```

## 📱 PWA (Progressive Web App)

La aplicación es una PWA completa con:
- ✅ Service Worker para offline support
- ✅ Manifest.json para instalación
- ✅ Caché de recursos
- ✅ Sincronización en background

### Instalar como app
1. Abre la aplicación en el navegador
2. Haz clic en "Instalar" o "Agregar a pantalla de inicio"
3. ¡Listo! Ahora puedes usar la app sin conexión

## 🔐 Seguridad

- ✅ Contraseñas hasheadas con bcryptjs
- ✅ JWT para autenticación
- ✅ Validación de entrada con Zod
- ✅ CORS configurado
- ✅ Helmet para headers de seguridad

## 📈 Performance

- ✅ 30+ índices en base de datos
- ✅ Caché de Service Worker
- ✅ Compresión de respuestas
- ✅ Lazy loading de componentes
- ✅ Optimización de queries

## 🚀 Despliegue

### Backend (Heroku, Railway, etc.)
```bash
npm run build
npm start
```

### Frontend (Netlify, Vercel, etc.)
```bash
npm run build
# Desplegar carpeta 'build'
```

## 📝 Licencia

MIT

## 👥 Contribuciones

Las contribuciones son bienvenidas. Por favor:
1. Fork el proyecto
2. Crea una rama para tu feature
3. Commit tus cambios
4. Push a la rama
5. Abre un Pull Request

## 📞 Soporte

Para reportar bugs o sugerir features, abre un issue en GitHub.

---

**Última actualización:** Enero 2026



/backend: npm run dev
/frontend: npm start



Despliegue Netlify FrontEnd
cd /home/jacarriel/Repositories/BEX-HRIS/frontend && npm run build
cd /home/jacarriel/Repositories/BEX-HRIS/frontend && npx netlify sites:create --name bex-hris
cd /home/jacarriel/Repositories/BEX-HRIS/frontend && npx netlify deploy --prod --dir=build


Despliegue Netlify BackEnd
cd /home/jacarriel/Repositories/BEX-HRIS/backend && npm run build 2>&1 | tail -50


