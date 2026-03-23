import * as XLSX from 'xlsx'
import { api } from './api'

export type BulkUploadType = 'employees' | 'payroll' | 'roles' | 'attendance' | 'marcacion'

export interface BulkUploadError {
  row: number
  error: string
}

export interface BulkUploadResult {
  processedCount: number
  createdCount: number
  updatedCount: number
  errors: BulkUploadError[]
  notFoundEmployees?: { row: number; cedula: string; name: string }[]
  pendingPayrolls?: unknown[]
  pendingRecords?: unknown[]
  consolidatedPayrolls?: unknown[]
}

// ─── Column mapping: real Excel names → backend expected names ────────────────
const EMPLOYEE_COLUMN_MAP: Record<string, string> = {
  'n°': '',                          // skip
  'no.': '',
  'apellidos': 'Apellidos',
  'nombres': 'Nombres',
  'cédula': 'Cedula',
  'cedula': 'Cedula',
  'tipo de contrato': 'TipoContrato',
  'tipocontrato': 'TipoContrato',
  'contrato actual': 'ContratoActual',
  'contratoactual': 'ContratoActual',
  'cargo': 'Cargo',
  'labor': 'Labor',
  'centro de costo': 'CentroDeCosto',
  'centrodecosto': 'CentroDeCosto',
  'sueldo': 'Sueldo',
  'fecha de nacimiento': 'FechaNacimiento',
  'fechanacimiento': 'FechaNacimiento',
  'edad': 'Edad',
  'genero': 'Genero',
  'género': 'Genero',
  'f.ingreso': 'FechaIngreso',
  'fecha de ingreso': 'FechaIngreso',
  'fechaingreso': 'FechaIngreso',
  'mes': 'Mes',
  'año': 'Año',
  'estado civil': 'EstadoCivil',
  'estadocivil': 'EstadoCivil',
  'procedencia': 'Procedencia',
  'direccion de domicilio': 'Direccion',
  'dirección de domicilio': 'Direccion',
  'direccion': 'Direccion',
  'hijos': 'Hijos',
  'nivel academico': 'NivelAcademico',
  'nivel académico': 'NivelAcademico',
  'especialidad': 'Especialidad',
  'email': 'Email',
  'correo': 'Email',
  'telefono': 'Telefono',
  'teléfono': 'Telefono',
  'fecha de terminacion contrato': 'FechaTerminacionContrato',
  'fechaterminacioncontrato': 'FechaTerminacionContrato',
}

// ─── Date converter: M/D/YYYY → DD/MM/YYYY ────────────────────────────────────
function normalizeDate(value: unknown): string {
  if (!value) return ''
  const str = String(value).trim()

  // Already DD/MM/YYYY or DD-MM-YYYY
  if (/^\d{2}[\/\-]\d{2}[\/\-]\d{4}$/.test(str)) return str

  // M/D/YYYY or MM/DD/YYYY → DD/MM/YYYY
  const mdy = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/)
  if (mdy) {
    const [, m, d, y] = mdy
    return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`
  }

  // Excel serial number (XLSX sometimes returns dates as numbers)
  if (typeof value === 'number') {
    const date = XLSX.SSF.parse_date_code(value)
    if (date) {
      return `${String(date.d).padStart(2, '0')}/${String(date.m).padStart(2, '0')}/${date.y}`
    }
  }

  return str
}

// ─── Salary parser: "$ 461,62" → 461.62 ─────────────────────────────────────
function parseSueldo(value: unknown): number | string {
  if (typeof value === 'number') return value
  const str = String(value ?? '').trim()
  // Remove currency symbols, spaces, then replace comma decimal
  const cleaned = str.replace(/[$\s]/g, '').replace(',', '.')
  const num = parseFloat(cleaned)
  return isNaN(num) ? 0 : num
}

// ─── Find header row index (skip title/company rows) ────────────────────────
function findHeaderRow(rows: unknown[][]): number {
  const markers = ['apellidos', 'nombres', 'cedula', 'cédula']
  for (let i = 0; i < Math.min(rows.length, 6); i++) {
    const row = rows[i] as string[]
    const normalized = row.map((c) => String(c ?? '').toLowerCase().trim())
    if (markers.some((m) => normalized.includes(m))) return i
  }
  return 0
}

// ─── Find sheet by name (case-insensitive partial match, fallback to first) ───
function findSheet(wb: XLSX.WorkBook, keyword: string): XLSX.WorkSheet {
  const match = wb.SheetNames.find((n) =>
    n.toLowerCase().includes(keyword.toLowerCase()),
  )
  return wb.Sheets[match ?? wb.SheetNames[0]]
}

// ─── Employee Excel preprocessor ─────────────────────────────────────────────
async function preprocessEmployeeXlsx(file: File): Promise<File> {
  const buffer = await file.arrayBuffer()
  const wb = XLSX.read(buffer, { type: 'array', cellDates: false })
  const ws = findSheet(wb, 'trabajadores')

  const raw = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: '' }) as unknown[][]

  const headerRowIndex = findHeaderRow(raw)
  const originalHeaders = (raw[headerRowIndex] as string[]).map((h) =>
    String(h ?? '').trim(),
  )

  // Map original headers → backend names
  const mappedHeaders = originalHeaders.map((h) => {
    const key = h.toLowerCase()
    return COLUMN_MAP_LOOKUP(key)
  })

  const dataRows = raw.slice(headerRowIndex + 1)

  const processed: Record<string, unknown>[] = dataRows
    .filter((row) => (row as unknown[]).some((c) => c !== '' && c != null))
    .map((row) => {
      const obj: Record<string, unknown> = {}
      mappedHeaders.forEach((backendKey, i) => {
        if (!backendKey) return // skip empty-mapped (N°, etc.)
        let val = (row as unknown[])[i]

        if (backendKey === 'Sueldo') val = parseSueldo(val)
        if (backendKey === 'FechaNacimiento' || backendKey === 'FechaIngreso' ||
            backendKey === 'FechaTerminacionContrato') {
          val = normalizeDate(val)
        }

        obj[backendKey] = val ?? ''
      })
      return obj
    })

  // Write new workbook with clean mapped data
  const newWb = XLSX.utils.book_new()
  const newWs = XLSX.utils.json_to_sheet(processed)
  XLSX.utils.book_append_sheet(newWb, newWs, 'Empleados')

  const outBuffer = XLSX.write(newWb, { type: 'array', bookType: 'xlsx' })
  const blob = new Blob([outBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  return new File([blob], file.name, { type: blob.type })
}

function COLUMN_MAP_LOOKUP(key: string): string {
  if (key in EMPLOYEE_COLUMN_MAP) return EMPLOYEE_COLUMN_MAP[key]
  // Fallback: strip spaces/accents and try again
  const stripped = key.replace(/\s+/g, '').replace(/[áéíóú]/g, (c) =>
    ({ á: 'a', é: 'e', í: 'i', ó: 'o', ú: 'u' }[c] ?? c),
  )
  return EMPLOYEE_COLUMN_MAP[stripped] ?? ''
}

// ─── Service ──────────────────────────────────────────────────────────────────
export const bulkUploadService = {
  upload: async (
    type: BulkUploadType,
    file: File,
    extra?: Record<string, string>,
  ): Promise<BulkUploadResult> => {
    let fileToUpload = file

    // Preprocess employee Excel to normalize column names/formats
    if (type === 'employees') {
      fileToUpload = await preprocessEmployeeXlsx(file)
    }

    const form = new FormData()
    form.append('file', fileToUpload)
    form.append('type', type)
    if (extra) {
      Object.entries(extra).forEach(([k, v]) => form.append(k, v))
    }

    return api
      .post<{ success: boolean; data: BulkUploadResult }>('/bulk-upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data.data)
  },
}

// ─── Template definitions ─────────────────────────────────────────────────────
const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

export const TEMPLATES = {
  employees: {
    label: 'Empleados',
    ext: 'xlsx',
    mimeType: XLSX_MIME,
    sheetName: 'Empleados',
    // Real column names as they appear in the actual Excel
    columns: [
      'N°', 'Apellidos', 'Nombres', 'Cédula',
      'Tipo de Contrato', 'Contrato Actual',
      'Cargo', 'Labor', 'Centro de Costo', 'Sueldo',
      'Fecha de Nacimiento', 'Edad', 'Genero', 'F.Ingreso',
      'Mes', 'Año', 'Estado Civil', 'Procedencia',
      'Direccion de Domicilio', 'Hijos', 'Nivel Academico', 'Especialidad',
    ],
    example: [
      1, 'GARCÍA PÉREZ', 'JUAN CARLOS', '001-0000001-0',
      'INDEFINIDO', 'INDEFINIDO',
      'DESARROLLADOR BACKEND', 'PROGRAMADOR', 'Tecnología', '$ 45.000,00',
      '15/06/1990', 35, 'M', '01/03/2024',
      3, 2024, 'SOLTERO', 'SANTO DOMINGO',
      'AV. WINSTON CHURCHILL #1', 0, 'Universitario', 'Ingeniería en Sistemas',
    ],
    notes: [
      'La primera fila puede ser el nombre de la empresa (se detecta y omite automáticamente)',
      'Cédula requerida: se normaliza automáticamente (9 dígitos → se agrega 0 al inicio)',
      'Sueldo acepta formato "$  461,62" o "45000" — se parsea automáticamente',
      'Estado Civil: SOLTERO | CASADO | DIVORCIADO | VIUDO',
      'Departamento y Cargo se crean automáticamente si no existen',
    ],
  },
  payroll: {
    label: 'Nómina',
    ext: 'xlsx',
    mimeType: XLSX_MIME,
    sheetName: 'BASE',
    columns: [
      'AÑO', 'MES', 'CENTRO DE COSTO', 'APELLIDOS Y NOMBRES', 'CEDULA', 'CARGO',
      'FORMA DE PAGO', 'NUMERO DE CUENTA',
      'SUELDO BASE', 'DIAS LABORADO', 'NRO HORAS EXTRAS 50%', 'SUELDO GANADO',
      'BONIFICACION RESPONSABILIDAD', 'BONIFICACION PRODUCTIVIDAD', 'ALIMENTACION',
      'VALOR HORAS EXTRAS 50%', 'OTROS INGRESOS', 'DESCANSO MEDICO',
      'DECIMO TERCERO', 'DECIMO CUARTO', 'TOTAL INGRESOS',
      'VACACIONES', 'FONDOS DE RESERVA',
      'APORTE IESS', 'ANTICIPO', 'QUINCENA', 'DIAS NO LABORADOS',
      'IMPUESTO A LA RENTA', 'PRESTAMO IESS', 'PRESTAMO EMPRESARIAL',
      'EXTENSION CONYUGAL', 'OTROS DESCUENTOS', 'TOTAL EGRESOS', 'TOTAL A PAGAR',
    ],
    example: [
      2024, 'MARZO', 'Tecnología', 'GARCÍA JUAN CARLOS', '001-0000001-0', 'DESARROLLADOR BACKEND',
      'Transferencia', '12345678',
      45000, 23, 0, 45000,
      0, 0, 0, 0, 0, 0, 0, 0, 45000,
      0, 0,
      4957.5, 0, 0, 0, 0, 0, 0, 0, 0, 4957.5, 40042.5,
    ],
    notes: [
      'La hoja debe llamarse exactamente "BASE"',
      'MES puede ser número (1-12) o nombre (ENERO, FEBRERO…)',
      'Si el empleado ya tiene nómina en ese período, los valores se suman',
      'Los empleados no registrados quedan como pendientes',
      'CEDULA debe coincidir con el registro del empleado en el sistema',
    ],
  },
  marcacion: {
    label: 'Asistencia / Marcación',
    ext: 'xlsx',
    mimeType: XLSX_MIME,
    sheetName: 'Marcacion',
    columns: [
      'No.', 'Id del Empleado', 'Nombres', 'Departamento', 'Mes',
      'Fecha', 'Asistencia Diaria', 'Primera Marcación', 'Última Marcación', 'Tiempo Total',
    ],
    example: [
      1, '001-0000001-0', 'GARCÍA JUAN CARLOS', 'Tecnología', 3,
      '01-03-2024', 'Presente', '08:00', '17:00', '09:00:00',
    ],
    notes: [
      'Campos requeridos: Id del Empleado (cédula), Nombres, Fecha',
      'Fecha en formato DD-MM-YYYY',
      'Si ya existe registro para esa cédula+fecha, se reemplaza',
      'Empleados no encontrados quedan como registros pendientes',
    ],
  },
} as const

export type TemplateName = keyof typeof TEMPLATES

// ─── XLSX template generator ──────────────────────────────────────────────────
export function generateXlsxTemplate(type: TemplateName): void {
  const tmpl = TEMPLATES[type]
  const wb = XLSX.utils.book_new()

  const aoa: (string | number)[][] = []

  // Employees: add title row first
  if (type === 'employees') {
    aoa.push(['LISTADO DE TRABAJADORES'])
  }

  aoa.push(tmpl.columns as unknown as (string | number)[])
  if (tmpl.example.length) {
    aoa.push(tmpl.example as unknown as (string | number)[])
  }

  const ws = XLSX.utils.aoa_to_sheet(aoa)
  ws['!cols'] = (tmpl.columns as readonly string[]).map((col) => ({
    wch: Math.max(col.length + 2, 12),
  }))

  XLSX.utils.book_append_sheet(wb, ws, tmpl.sheetName)
  XLSX.writeFile(wb, `plantilla_${type}.xlsx`)
}

// ─── XLSX preview reader (handles title rows) ─────────────────────────────────
export async function readXlsxPreview(
  file: File,
  maxRows = 5,
  sheetKeyword?: string,
): Promise<{ headers: string[]; rows: (string | number | boolean)[][]; skippedRows: number }> {
  const buffer = await file.arrayBuffer()
  const wb = XLSX.read(buffer, { type: 'array' })
  const ws = sheetKeyword ? findSheet(wb, sheetKeyword) : wb.Sheets[wb.SheetNames[0]]

  const raw = XLSX.utils.sheet_to_json<(string | number | boolean)[]>(ws, {
    header: 1,
    defval: '',
  }) as (string | number | boolean)[][]

  const headerRowIndex = findHeaderRow(raw as unknown[][])
  const headers = (raw[headerRowIndex] ?? []) as string[]
  const rows = raw.slice(headerRowIndex + 1, headerRowIndex + 1 + maxRows)

  return { headers, rows, skippedRows: headerRowIndex }
}
