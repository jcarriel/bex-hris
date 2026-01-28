# Arquitectura del Sistema HRIS

## Visión General

El sistema BEX HRIS está diseñado con una arquitectura limpia y modular que separa claramente las responsabilidades en diferentes capas:

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React)                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Components  │  │    Pages     │  │    Stores    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            ↓ HTTP/REST
┌─────────────────────────────────────────────────────────────┐
│                    Backend (Express)                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Controllers  │  │   Services   │  │ Repositories │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│         ↓                ↓                    ↓              │
│  ┌──────────────────────────────────────────────────┐       │
│  │         Middleware & Utilities                   │       │
│  └──────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────┘
                            ↓ SQL
┌─────────────────────────────────────────────────────────────┐
│                   SQLite Database                           │
│  ┌──────────────────────────────────────────────────┐       │
│  │  Users | Employees | Payroll | Attendance | ... │       │
│  └──────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────┘
```

## Capas de la Aplicación

### 1. Capa de Presentación (Frontend)

**Ubicación**: `/frontend/src/`

**Responsabilidades**:
- Interfaz de usuario
- Validación de formularios
- Gestión de estado global (Zustand)
- Comunicación con el backend

**Componentes Principales**:
- **Pages**: Páginas principales (Dashboard, Empleados, Nómina, etc.)
- **Components**: Componentes reutilizables (formularios, tablas, modales)
- **Stores**: Estado global (autenticación, notificaciones)
- **Services**: Cliente HTTP para comunicarse con el backend
- **Hooks**: Custom hooks para lógica compartida

**Tecnologías**:
- React 18
- TypeScript
- React Router v6
- Zustand (estado global)
- TailwindCSS (estilos)
- shadcn/ui (componentes)

### 2. Capa de API (Backend)

**Ubicación**: `/backend/src/`

**Responsabilidades**:
- Manejo de requests HTTP
- Validación de datos
- Autenticación y autorización
- Orquestación de servicios

**Componentes Principales**:

#### Controllers
Manejan las requests HTTP y delegan la lógica a los servicios.

```typescript
// Ejemplo: EmployeeController
async create(req, res) {
  // Validar datos
  // Llamar al servicio
  // Retornar respuesta
}
```

#### Services
Contienen la lógica de negocio principal.

```typescript
// Ejemplo: EmployeeService
async createEmployee(data) {
  // Validar datos
  // Crear empleado
  // Enviar notificaciones
  // Retornar resultado
}
```

#### Repositories
Acceden a la base de datos y abstraen las queries SQL.

```typescript
// Ejemplo: EmployeeRepository
async create(data) {
  // Insertar en base de datos
  // Retornar empleado creado
}
```

#### Middleware
Validan y procesan requests antes de llegar a los controladores.

```typescript
// Ejemplo: authMiddleware
// Verifica JWT
// Extrae información del usuario
// Pasa al siguiente middleware
```

### 3. Capa de Datos (Base de Datos)

**Ubicación**: `./data/hris.db`

**Tipo**: SQLite (local)

**Tablas Principales**:
- `users`: Usuarios del sistema
- `employees`: Datos de empleados
- `departments`: Departamentos
- `positions`: Cargos de trabajo
- `payroll`: Nómina
- `attendance`: Asistencia
- `leaves`: Licencias y vacaciones
- `documents`: Documentos almacenados
- `notifications`: Notificaciones
- `audit_logs`: Auditoría de acciones

## Flujo de Datos

### Ejemplo: Crear un Empleado

```
1. Usuario completa formulario en Frontend
   ↓
2. Frontend valida datos localmente
   ↓
3. Frontend envía POST /api/employees con datos
   ↓
4. Backend recibe request en EmployeeController.create()
   ↓
5. Controller valida datos nuevamente
   ↓
6. Controller llama a EmployeeService.createEmployee()
   ↓
7. Service contiene lógica de negocio:
   - Generar número de empleado
   - Validar datos
   - Llamar a EmployeeRepository.create()
   ↓
8. Repository inserta en base de datos
   ↓
9. Service envía notificaciones (email, app)
   ↓
10. Service retorna empleado creado
    ↓
11. Controller retorna respuesta HTTP 201
    ↓
12. Frontend recibe respuesta y actualiza UI
```

## Sistema de Notificaciones

### Arquitectura Multi-Canal

```
NotificationService (Orquestador)
    ├── EmailProvider (Gmail)
    ├── AppNotificationProvider (Base de datos)
    ├── WhatsAppProvider (Preparado)
    └── TelegramProvider (Preparado)
```

### Flujo de Notificación

```
1. Evento en el sistema (ej: empleado creado)
   ↓
2. Service llama a NotificationService.sendViaMultipleChannels()
   ↓
3. NotificationService itera sobre canales configurados
   ↓
4. Para cada canal:
   - Verifica si está configurado
   - Llama al provider correspondiente
   - Registra resultado
   ↓
5. Retorna resultado de envío
```

## Autenticación y Autorización

### Flujo de Autenticación

```
1. Usuario envía credenciales (POST /api/auth/login)
   ↓
2. AuthController valida datos
   ↓
3. AuthService busca usuario en base de datos
   ↓
4. AuthService verifica contraseña con bcrypt
   ↓
5. AuthService genera JWT
   ↓
6. Frontend almacena JWT en localStorage
   ↓
7. Frontend incluye JWT en header Authorization de requests
   ↓
8. authMiddleware verifica JWT en cada request protegido
```

### JWT Payload

```json
{
  "id": "user-uuid",
  "username": "admin",
  "email": "admin@example.com",
  "iat": 1234567890,
  "exp": 1234654290
}
```

## Patrones de Diseño

### 1. Repository Pattern
Abstrae el acceso a datos, permitiendo cambiar la base de datos sin afectar la lógica de negocio.

```typescript
// Interface
interface IRepository<T> {
  create(data: T): Promise<T>;
  findById(id: string): Promise<T | null>;
  update(id: string, data: Partial<T>): Promise<T | null>;
  delete(id: string): Promise<boolean>;
}

// Implementación
class EmployeeRepository implements IRepository<Employee> {
  // Implementación
}
```

### 2. Service Layer Pattern
Centraliza la lógica de negocio, separándola de los controladores.

```typescript
class EmployeeService {
  async createEmployee(data) {
    // Validación
    // Lógica de negocio
    // Llamadas a repositorio
    // Notificaciones
  }
}
```

### 3. Dependency Injection
Los servicios reciben sus dependencias en lugar de crearlas.

```typescript
// En lugar de:
class EmployeeService {
  private repo = new EmployeeRepository();
}

// Hacemos:
class EmployeeService {
  constructor(private repo: EmployeeRepository) {}
}
```

### 4. Provider Pattern (Notificaciones)
Permite agregar nuevos canales de notificación sin modificar código existente.

```typescript
interface INotificationProvider {
  send(payload: NotificationPayload): Promise<boolean>;
  isConfigured(): boolean;
}

class NotificationService {
  private providers: Map<string, INotificationProvider>;
  
  registerProvider(channel: string, provider: INotificationProvider) {
    this.providers.set(channel, provider);
  }
}
```

## Manejo de Errores

### Estrategia de Errores

```
1. Validación en Frontend
   - Validación de tipos
   - Validación de campos requeridos
   - Feedback inmediato al usuario

2. Validación en Backend
   - Validación de entrada
   - Validación de lógica de negocio
   - Respuestas HTTP apropiadas

3. Manejo de Excepciones
   - Try-catch en servicios
   - Logging de errores
   - Respuestas de error consistentes
```

### Formato de Respuesta de Error

```json
{
  "success": false,
  "message": "Descripción del error",
  "error": "Detalles técnicos (solo en desarrollo)"
}
```

## Seguridad

### Medidas Implementadas

1. **Autenticación JWT**
   - Tokens con expiración
   - Validación en cada request protegido

2. **Hashing de Contraseñas**
   - bcryptjs con salt rounds

3. **CORS**
   - Configurado para permitir solo orígenes autorizados

4. **Helmet**
   - Headers de seguridad HTTP

5. **Validación de Entrada**
   - Validación en backend
   - Sanitización de datos

6. **Auditoría**
   - Registro de acciones en audit_logs
   - Quién, qué, cuándo

## Escalabilidad

### Consideraciones Futuras

1. **Base de Datos**
   - Migrar de SQLite a PostgreSQL
   - Implementar índices
   - Optimizar queries

2. **Caché**
   - Redis para sesiones
   - Redis para datos frecuentes

3. **Colas de Mensajes**
   - Bull/RabbitMQ para notificaciones asincrónicas
   - Procesamiento en background

4. **Microservicios**
   - Separar nómina en servicio independiente
   - Separar reportes en servicio independiente

5. **Frontend**
   - Code splitting
   - Lazy loading de componentes
   - Service workers

## Convenciones de Código

### Nombres de Archivos
- Controllers: `*Controller.ts`
- Services: `*Service.ts`
- Repositories: `*Repository.ts`
- Interfaces: `I*.ts`

### Estructura de Carpetas
```
src/
├── config/          # Configuración
├── controllers/     # Controladores
├── services/        # Servicios
├── repositories/    # Repositorios
├── middleware/      # Middleware
├── notifications/   # Notificaciones
├── utils/           # Utilidades
├── types/           # Tipos TypeScript
└── index.ts         # Punto de entrada
```

### Nomenclatura de Variables
- Constantes: `UPPER_SNAKE_CASE`
- Variables: `camelCase`
- Clases: `PascalCase`
- Interfaces: `IPascalCase`

## Testing (Futuro)

### Estrategia de Testing

```
Unit Tests
├── Services
├── Repositories
└── Utilities

Integration Tests
├── API endpoints
├── Database operations
└── Notifications

E2E Tests
├── Login flow
├── Employee CRUD
└── Payroll generation
```

## Deployment

### Estructura de Deployment

```
Windows PC (Local)
├── Backend (Node.js)
│   ├── Port: 3000
│   └── Database: ./data/hris.db
└── Frontend (React)
    └── Port: 3000 (development)
```

### Variables de Entorno

**Backend (.env)**
```
DATABASE_PATH=./data/hris.db
JWT_SECRET=clave_secreta
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=email@gmail.com
SMTP_PASSWORD=contraseña_app
PORT=3000
NODE_ENV=production
```

**Frontend (.env)**
```
REACT_APP_API_URL=http://localhost:3000/api
REACT_APP_APP_NAME=BEX HRIS
```

## Documentación Adicional

- [README.md](../README.md) - Guía de instalación y uso
- [BIOMETRIC_INTEGRATION.md](./BIOMETRIC_INTEGRATION.md) - Integración biométrica
- [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) - Documentación de API
