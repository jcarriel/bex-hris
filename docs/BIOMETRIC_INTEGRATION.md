# Guía de Integración Biométrica

## Descripción General

El sistema HRIS está preparado para integrar datos de asistencia desde dispositivos biométricos. Esta guía explica cómo implementar la integración con tu dispositivo específico.

## Arquitectura de Integración

```
Dispositivo Biométrico
    ↓
API de Dispositivo / Exportación de Datos
    ↓
Servicio de Integración Biométrica (Backend)
    ↓
Base de Datos (Tabla: attendance)
    ↓
Frontend (Reportes y Dashboards)
```

## Opciones de Integración

### 1. API REST del Dispositivo

Si tu dispositivo biométrico proporciona una API REST:

```typescript
// backend/src/services/BiometricIntegrationService.ts

import axios from 'axios';
import AttendanceRepository from '@repositories/AttendanceRepository';

export class BiometricIntegrationService {
  private biometricApiUrl = process.env.BIOMETRIC_API_URL;
  private biometricApiKey = process.env.BIOMETRIC_API_KEY;

  async syncAttendanceData() {
    try {
      // Obtener datos del dispositivo
      const response = await axios.get(
        `${this.biometricApiUrl}/attendance`,
        {
          headers: {
            'Authorization': `Bearer ${this.biometricApiKey}`
          }
        }
      );

      const attendanceRecords = response.data;

      // Procesar y guardar en base de datos
      for (const record of attendanceRecords) {
        await this.processAttendanceRecord(record);
      }

      return {
        success: true,
        processed: attendanceRecords.length
      };
    } catch (error) {
      logger.error('Error syncing biometric data', error);
      throw error;
    }
  }

  private async processAttendanceRecord(record: any) {
    // Mapear datos del dispositivo a nuestro formato
    const attendance = {
      employeeId: record.employee_id,
      date: record.date,
      checkIn: record.check_in_time,
      checkOut: record.check_out_time,
      status: this.determineStatus(record),
      notes: `Sincronizado desde dispositivo biométrico`
    };

    // Guardar en base de datos
    await AttendanceRepository.create(attendance);
  }

  private determineStatus(record: any): string {
    if (!record.check_in_time) return 'absent';
    if (record.is_late) return 'late';
    return 'present';
  }
}
```

### 2. Importación de Archivo CSV/Excel

Si el dispositivo exporta datos en CSV:

```typescript
// backend/src/services/BiometricCSVImportService.ts

import fs from 'fs';
import csv from 'csv-parser';
import AttendanceRepository from '@repositories/AttendanceRepository';

export class BiometricCSVImportService {
  async importFromFile(filePath: string) {
    const records: any[] = [];

    return new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (row) => {
          records.push(row);
        })
        .on('end', async () => {
          try {
            await this.processRecords(records);
            resolve({ success: true, processed: records.length });
          } catch (error) {
            reject(error);
          }
        })
        .on('error', reject);
    });
  }

  private async processRecords(records: any[]) {
    for (const record of records) {
      const attendance = {
        employeeId: record.employee_id,
        date: record.date,
        checkIn: record.check_in,
        checkOut: record.check_out,
        status: record.status || 'present'
      };

      await AttendanceRepository.create(attendance);
    }
  }
}
```

### 3. Webhook del Dispositivo

Si el dispositivo puede enviar datos en tiempo real:

```typescript
// backend/src/controllers/BiometricWebhookController.ts

import { Request, Response } from 'express';
import AttendanceRepository from '@repositories/AttendanceRepository';

export class BiometricWebhookController {
  async receiveAttendanceData(req: Request, res: Response) {
    try {
      // Validar webhook token
      const token = req.headers['x-webhook-token'];
      if (token !== process.env.BIOMETRIC_WEBHOOK_TOKEN) {
        return res.status(401).json({ success: false, message: 'Invalid token' });
      }

      const { employee_id, check_in, check_out, date } = req.body;

      // Guardar en base de datos
      const attendance = await AttendanceRepository.create({
        employeeId: employee_id,
        date,
        checkIn: check_in,
        checkOut: check_out,
        status: 'present'
      });

      res.status(200).json({
        success: true,
        data: attendance
      });
    } catch (error) {
      logger.error('Error processing webhook', error);
      res.status(500).json({ success: false, message: 'Error processing data' });
    }
  }
}
```

## Configuración

### Variables de Entorno

Agrega a tu `.env`:

```
# Biometric Integration
BIOMETRIC_ENABLED=true
BIOMETRIC_API_URL=http://biometric-device:8080/api
BIOMETRIC_API_KEY=tu_api_key_aqui
BIOMETRIC_WEBHOOK_TOKEN=tu_webhook_token_aqui
BIOMETRIC_SYNC_INTERVAL=3600000
```

### Rutas de API

Agrega a tu `backend/src/index.ts`:

```typescript
import BiometricWebhookController from '@controllers/BiometricWebhookController';

// Webhook para recibir datos del dispositivo
app.post('/api/biometric/webhook', (req, res) =>
  BiometricWebhookController.receiveAttendanceData(req, res)
);

// Endpoint para sincronizar datos manualmente
app.post('/api/biometric/sync', authMiddleware, async (req, res) => {
  try {
    const result = await biometricService.syncAttendanceData();
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});
```

## Sincronización Automática

Para sincronizar datos automáticamente cada cierto tiempo:

```typescript
// backend/src/services/BiometricSyncScheduler.ts

import cron from 'node-cron';
import BiometricIntegrationService from './BiometricIntegrationService';
import logger from '@utils/logger';

export class BiometricSyncScheduler {
  private biometricService = new BiometricIntegrationService();

  startScheduler() {
    // Ejecutar cada hora
    cron.schedule('0 * * * *', async () => {
      try {
        logger.info('Starting biometric data sync...');
        const result = await this.biometricService.syncAttendanceData();
        logger.info(`Biometric sync completed: ${result.processed} records`);
      } catch (error) {
        logger.error('Biometric sync failed', error);
      }
    });

    logger.info('Biometric sync scheduler started');
  }
}
```

## Mapeo de Datos

### Formato de Entrada (Dispositivo)

```json
{
  "employee_id": "EMP001",
  "date": "2024-01-15",
  "check_in_time": "08:30:00",
  "check_out_time": "17:30:00",
  "is_late": false,
  "temperature": 36.5
}
```

### Formato de Salida (Base de Datos)

```json
{
  "id": "uuid",
  "employeeId": "employee-uuid",
  "date": "2024-01-15",
  "checkIn": "08:30:00",
  "checkOut": "17:30:00",
  "status": "present",
  "notes": "Sincronizado desde dispositivo biométrico",
  "createdAt": "2024-01-15T08:30:00Z",
  "updatedAt": "2024-01-15T08:30:00Z"
}
```

## Validación de Datos

```typescript
// backend/src/utils/BiometricDataValidator.ts

export class BiometricDataValidator {
  static validateRecord(record: any): boolean {
    // Validar campos requeridos
    if (!record.employee_id || !record.date) {
      return false;
    }

    // Validar formato de fecha
    if (!this.isValidDate(record.date)) {
      return false;
    }

    // Validar formato de hora
    if (record.check_in_time && !this.isValidTime(record.check_in_time)) {
      return false;
    }

    return true;
  }

  private static isValidDate(date: string): boolean {
    return /^\d{4}-\d{2}-\d{2}$/.test(date);
  }

  private static isValidTime(time: string): boolean {
    return /^\d{2}:\d{2}:\d{2}$/.test(time);
  }
}
```

## Manejo de Errores

```typescript
// Errores comunes y soluciones

// 1. Dispositivo no disponible
try {
  const data = await fetchFromDevice();
} catch (error) {
  if (error.code === 'ECONNREFUSED') {
    logger.warn('Biometric device not available, will retry later');
    // Reintentar más tarde
  }
}

// 2. Datos duplicados
const existingRecord = await AttendanceRepository.findByEmployeeAndDate(
  employeeId,
  date
);

if (existingRecord) {
  // Actualizar en lugar de crear
  await AttendanceRepository.update(existingRecord.id, newData);
} else {
  // Crear nuevo registro
  await AttendanceRepository.create(newData);
}

// 3. Empleado no encontrado
const employee = await EmployeeRepository.findById(employeeId);
if (!employee) {
  logger.warn(`Employee ${employeeId} not found in system`);
  // Guardar en tabla de registros pendientes
}
```

## Testing

```typescript
// backend/src/tests/biometric.test.ts

import BiometricIntegrationService from '@services/BiometricIntegrationService';
import AttendanceRepository from '@repositories/AttendanceRepository';

describe('BiometricIntegrationService', () => {
  it('should sync attendance data from device', async () => {
    const service = new BiometricIntegrationService();
    const result = await service.syncAttendanceData();
    
    expect(result.success).toBe(true);
    expect(result.processed).toBeGreaterThan(0);
  });

  it('should validate attendance records', async () => {
    const record = {
      employee_id: 'EMP001',
      date: '2024-01-15',
      check_in_time: '08:30:00'
    };

    const isValid = BiometricDataValidator.validateRecord(record);
    expect(isValid).toBe(true);
  });
});
```

## Dispositivos Soportados

### Ejemplos de Integración

#### 1. ZKTeco (Muy común)

```typescript
// Usar librería: zktecojs
import ZKTeco from 'zktecojs';

const device = new ZKTeco({
  ip: '192.168.1.100',
  port: 5200
});

device.on('connect', async () => {
  const attendances = await device.getAttendances();
  // Procesar datos
});
```

#### 2. Hikvision

```typescript
// API REST
const response = await axios.get(
  'http://device-ip/ISAPI/AccessControl/AcsEvent?format=json',
  {
    auth: {
      username: 'admin',
      password: 'password'
    }
  }
);
```

#### 3. Dahua

```typescript
// Similar a Hikvision
const response = await axios.get(
  'http://device-ip/api/AccessControl/AcsEvent',
  {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  }
);
```

## Monitoreo y Logging

```typescript
// backend/src/services/BiometricMonitoringService.ts

export class BiometricMonitoringService {
  async logSyncAttempt(status: 'success' | 'failure', details: any) {
    await db.run(
      `INSERT INTO biometric_sync_logs (status, details, timestamp)
       VALUES (?, ?, ?)`,
      [status, JSON.stringify(details), new Date().toISOString()]
    );
  }

  async getLastSyncStatus() {
    return db.get(
      `SELECT * FROM biometric_sync_logs 
       ORDER BY timestamp DESC LIMIT 1`
    );
  }

  async getSyncHistory(days: number = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return db.all(
      `SELECT * FROM biometric_sync_logs 
       WHERE timestamp >= ? 
       ORDER BY timestamp DESC`,
      [startDate.toISOString()]
    );
  }
}
```

## Próximos Pasos

1. Identifica tu dispositivo biométrico
2. Consulta la documentación de su API
3. Implementa el servicio de integración correspondiente
4. Configura las variables de entorno
5. Prueba la sincronización
6. Configura la sincronización automática
7. Monitorea los logs

## Soporte

Para ayuda con la integración:
- Consulta la documentación de tu dispositivo
- Revisa los logs en `backend/logs/`
- Contacta al equipo de desarrollo
