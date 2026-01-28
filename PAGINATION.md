# Guía de Paginación - BEX HRIS

Este documento describe las tres estrategias de paginación implementadas en la aplicación.

## 📋 Tabla de Contenidos

1. [Paginación Offset-Based](#paginación-offset-based)
2. [Cursor-Based Pagination](#cursor-based-pagination)
3. [Filtros Avanzados](#filtros-avanzados)
4. [Infinite Scroll](#infinite-scroll)

---

## Paginación Offset-Based

### Descripción
Paginación tradicional usando offset y limit. Ideal para navegación por páginas.

### Backend

```typescript
// Endpoint
GET /api/employees?offset=0&limit=10&sortBy=createdAt&sortOrder=asc

// Respuesta
{
  "data": [...],
  "pagination": {
    "total": 150,
    "limit": 10,
    "offset": 0,
    "hasMore": true
  }
}
```

### Frontend

```tsx
import { usePagination } from '@/hooks';

function EmployeeList() {
  const fetchEmployees = async (offset, limit, filters) => {
    const response = await fetch(`/api/employees?offset=${offset}&limit=${limit}`);
    return response.json();
  };

  const {
    data,
    total,
    currentPage,
    limit,
    isLoading,
    nextPage,
    prevPage,
    goToPage,
    setFilters,
  } = usePagination(fetchEmployees, { limit: 10 });

  return (
    <div>
      <Table columns={columns} data={data} loading={isLoading} />
      
      <div className="flex gap-2">
        <button onClick={prevPage}>Anterior</button>
        <span>Página {currentPage}</span>
        <button onClick={nextPage}>Siguiente</button>
      </div>
    </div>
  );
}
```

### Ventajas
✅ Navegación directa a página específica
✅ Conocer el total de resultados
✅ Fácil de implementar
✅ Compatible con SEO

### Desventajas
❌ Lento con grandes datasets
❌ Problema de offset con datos en movimiento
❌ No ideal para infinite scroll

---

## Cursor-Based Pagination

### Descripción
Paginación usando cursores. Ideal para infinite scroll y APIs de alto rendimiento.

### Backend

```typescript
// Endpoint
GET /api/employees/cursor?cursor=abc123&limit=20

// Respuesta
{
  "data": [...],
  "pagination": {
    "total": 150,
    "limit": 20,
    "hasMore": true,
    "nextCursor": "xyz789",
    "prevCursor": "abc123"
  }
}
```

### Frontend

```tsx
import { useCursorPagination } from '@/hooks';
import { InfiniteScroll } from '@/components';

function EmployeeList() {
  const fetchEmployees = async (cursor, limit, filters) => {
    const params = new URLSearchParams({
      ...(cursor && { cursor }),
      limit: limit?.toString() || '20',
    });
    const response = await fetch(`/api/employees/cursor?${params}`);
    return response.json();
  };

  const {
    data,
    total,
    isLoading,
    hasMore,
    loadMore,
  } = useCursorPagination(fetchEmployees, { limit: 20 });

  return (
    <InfiniteScroll
      onLoadMore={loadMore}
      isLoading={isLoading}
      hasMore={hasMore}
    >
      <Table columns={columns} data={data} />
    </InfiniteScroll>
  );
}
```

### Ventajas
✅ Excelente para infinite scroll
✅ Rápido incluso con millones de registros
✅ Consistente con datos en movimiento
✅ Ideal para APIs móviles

### Desventajas
❌ No puedes saltar a página específica
❌ No conoces el total exacto
❌ Más complejo de implementar

---

## Filtros Avanzados

### Descripción
Sistema flexible de filtros que soporta múltiples tipos de búsqueda.

### Tipos de Filtros

```typescript
// Búsqueda simple (texto)
{ firstName: 'John' }

// Búsqueda exacta
{ status: { operator: 'eq', value: 'active' } }

// Búsqueda por rango
{ salary: { operator: 'between', value: { min: 1000, max: 5000 } } }

// Búsqueda en lista
{ status: { operator: 'in', value: ['active', 'inactive'] } }

// Comparación
{ salary: { operator: 'gte', value: 3000 } }
```

### Frontend

```tsx
import { AdvancedFilters } from '@/components';

function EmployeeList() {
  const filterFields = [
    { 
      name: 'firstName', 
      label: 'Nombre', 
      type: 'text',
      placeholder: 'Buscar por nombre'
    },
    { 
      name: 'status', 
      label: 'Estado', 
      type: 'select',
      options: [
        { value: 'active', label: 'Activo' },
        { value: 'inactive', label: 'Inactivo' },
      ]
    },
    { 
      name: 'salary', 
      label: 'Salario', 
      type: 'range'
    },
    { 
      name: 'hireDate', 
      label: 'Fecha de Contratación', 
      type: 'date'
    },
  ];

  const handleApplyFilters = (filters) => {
    // Enviar filtros a API
    setFilters(filters);
  };

  return (
    <>
      <AdvancedFilters
        fields={filterFields}
        onApply={handleApplyFilters}
        onReset={() => setFilters({})}
      />
      {/* Mostrar resultados */}
    </>
  );
}
```

### Operadores Soportados

| Operador | Descripción | Ejemplo |
|----------|-------------|---------|
| `like` | Búsqueda parcial | `{ name: { operator: 'like', value: 'john' } }` |
| `eq` | Igualdad | `{ status: { operator: 'eq', value: 'active' } }` |
| `ne` | No igual | `{ status: { operator: 'ne', value: 'inactive' } }` |
| `gt` | Mayor que | `{ salary: { operator: 'gt', value: 5000 } }` |
| `gte` | Mayor o igual | `{ salary: { operator: 'gte', value: 5000 } }` |
| `lt` | Menor que | `{ salary: { operator: 'lt', value: 5000 } }` |
| `lte` | Menor o igual | `{ salary: { operator: 'lte', value: 5000 } }` |
| `in` | En lista | `{ status: { operator: 'in', value: ['active', 'inactive'] } }` |
| `between` | Rango | `{ salary: { operator: 'between', value: { min: 1000, max: 5000 } } }` |

---

## Infinite Scroll

### Descripción
Componente que carga más datos automáticamente cuando el usuario llega al final de la lista.

### Uso

```tsx
import { InfiniteScroll } from '@/components';
import { useCursorPagination } from '@/hooks';

function EmployeeList() {
  const { data, isLoading, hasMore, loadMore } = useCursorPagination(fetchFn);

  return (
    <InfiniteScroll
      onLoadMore={loadMore}
      isLoading={isLoading}
      hasMore={hasMore}
      loadingComponent={<div>Cargando...</div>}
      endComponent={<div>No hay más datos</div>}
    >
      <div>
        {data.map(item => (
          <div key={item.id}>{item.name}</div>
        ))}
      </div>
    </InfiniteScroll>
  );
}
```

### Props

| Prop | Tipo | Descripción |
|------|------|-------------|
| `onLoadMore` | `() => void` | Callback cuando se debe cargar más |
| `isLoading` | `boolean` | Si está cargando |
| `hasMore` | `boolean` | Si hay más datos |
| `loadingComponent` | `ReactNode` | Componente personalizado de carga |
| `endComponent` | `ReactNode` | Componente cuando no hay más datos |

---

## Comparación de Estrategias

| Aspecto | Offset | Cursor | Infinite |
|--------|--------|--------|----------|
| **Performance** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Facilidad** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Navegación** | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐ |
| **UX Móvil** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Escalabilidad** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

---

## Mejores Prácticas

### 1. Elige la Estrategia Correcta
- **Offset**: Cuando necesitas navegación por página (admin panels)
- **Cursor**: Cuando necesitas infinite scroll (feeds, timelines)
- **Ambas**: Implementa ambas para máxima flexibilidad

### 2. Optimiza Queries
```sql
-- Usa índices
CREATE INDEX idx_employees_status ON employees(status);
CREATE INDEX idx_employees_createdAt ON employees(createdAt);

-- Limita resultados
SELECT * FROM employees LIMIT 100;
```

### 3. Caché Resultados
```typescript
// Implementar caché en cliente
const cache = new Map();
const cacheKey = `employees_${offset}_${limit}`;
if (cache.has(cacheKey)) {
  return cache.get(cacheKey);
}
```

### 4. Manejo de Errores
```typescript
try {
  const data = await fetchEmployees(offset, limit);
} catch (error) {
  // Mostrar error al usuario
  // Reintentar después
}
```

### 5. Validación de Entrada
```typescript
// Validar offset y limit
const limit = Math.min(Math.max(limit || 10, 1), 100);
const offset = Math.max(offset || 0, 0);
```

---

## Ejemplos Completos

Ver `/src/examples/PaginationExample.tsx` para ejemplos completos de:
- Paginación offset-based
- Cursor-based pagination
- Filtros avanzados
- Infinite scroll

---

## Troubleshooting

### Problema: Infinite scroll no carga más datos
**Solución**: Verifica que `hasMore` sea `true` y que `loadMore` esté siendo llamado.

### Problema: Filtros no funcionan
**Solución**: Asegúrate de que los nombres de campos coincidan con las columnas de la BD.

### Problema: Performance lenta
**Solución**: Usa cursor-based pagination y agrega índices en la BD.

---

**Última actualización:** Enero 2026
