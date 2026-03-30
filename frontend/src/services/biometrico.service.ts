import axios from 'axios'
import { useAuthStore } from '@/store/authStore'

// ─── Config ───────────────────────────────────────────────────────────────────

export interface BiometricoConfig {
  baseUrl: string
  username: string
  password: string
}

const CONFIG_KEY = 'biometrico_config'

export function getBiometricoConfig(): BiometricoConfig {
  try {
    const raw = localStorage.getItem(CONFIG_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return { baseUrl: 'http://localhost:8081', username: 'admin', password: '' }
}

export function saveBiometricoConfig(cfg: BiometricoConfig) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg))
}

// ─── Cliente axios dedicado (sin interceptor de logout de nuestra app) ────────

const BACKEND = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api'

function bioClient(utToken: string, utBaseUrl: string) {
  const ourToken = useAuthStore.getState().token
  return axios.create({
    baseURL: BACKEND,
    timeout: 15000,
    headers: {
      Authorization:         `Bearer ${ourToken}`,
      'X-Biometrico-Target': utBaseUrl,
      'X-Biometrico-Token':  utToken,
      'Content-Type':        'application/json',
    },
  })
}

function bioClientNoToken(utBaseUrl: string) {
  const ourToken = useAuthStore.getState().token
  return axios.create({
    baseURL: BACKEND,
    timeout: 10000,
    headers: {
      Authorization:         `Bearer ${ourToken}`,
      'X-Biometrico-Target': utBaseUrl,
      'Content-Type':        'application/json',
    },
  })
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UTTerminal {
  id: number
  sn: string
  alias: string
  ip_address: string
  is_connect: boolean
  last_activity: string | null
  firmware_version: string
  platform: string
  device_name: string
  user_count: number
  fp_count: number
  face_count: number
}

export interface UTEmployee {
  id: string
  emp_code: string
  first_name: string
  last_name: string | null
  hire_date: string | null
  dept_name: string
  department: number
  position: number
  position_name: string
}

export interface UTDepartment {
  id: number
  dept_code: string
  dept_name: string
}

export interface UTPosition {
  id: number
  position_code: string
  position_name: string
}

export interface UTEmployeeFormData {
  emp_code: string
  first_name: string
  last_name: string
  hire_date: string
  department: number | ''
  position: number | ''
}

export interface UTFirstLastRecord {
  emp_code:    string
  first_name:  string
  last_name:   string | null
  dept_name:   string
  position_name: string
  att_date:    string
  weekday:     string
  first_punch: string | null
  last_punch:  string | null
  total_time:  string
}

export interface UTTransaction {
  id: number
  emp_code: string
  punch_time: string
  punch_state: string
  verify_type: number
  terminal_sn: string
  terminal_alias: string
  upload_time: string
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export async function biometricoLogin(cfg: BiometricoConfig): Promise<string> {
  const client = bioClientNoToken(cfg.baseUrl)
  const res = await client.post('/biometrico/auth', {
    username: cfg.username,
    password: cfg.password,
  })
  return res.data.token ?? res.data.access
}

// ─── Terminales ───────────────────────────────────────────────────────────────

export async function getTerminals(token: string, baseUrl: string): Promise<UTTerminal[]> {
  const client = bioClient(token, baseUrl)
  const res = await client.get('/biometrico/proxy/iclock/api/terminals/', {
    params: { page: 1, page_size: 100 },
  })
  return res.data.data ?? res.data.results ?? res.data
}

// ─── Empleados del biométrico ─────────────────────────────────────────────────

export async function getBioEmployees(
  token: string,
  baseUrl: string,
  page = 1,
): Promise<{ count: number; results: UTEmployee[] }> {
  const client = bioClient(token, baseUrl)
  const res = await client.get('/biometrico/proxy/personnel/api/employees/', {
    params: { page, page_size: 50 },
  })
  const d = res.data
  return {
    count:   d.count ?? 0,
    results: d.data ?? d.results ?? [],
  }
}

// ─── CRUD empleados biométrico ────────────────────────────────────────────────

export async function getBioDepartments(token: string, baseUrl: string): Promise<UTDepartment[]> {
  const client = bioClient(token, baseUrl)
  const res = await client.get('/biometrico/proxy/personnel/api/departments/', { params: { page: 1, page_size: 200 } })
  const d = res.data
  return d.data ?? d.results ?? []
}

export async function getBioPositions(token: string, baseUrl: string): Promise<UTPosition[]> {
  const client = bioClient(token, baseUrl)
  const res = await client.get('/biometrico/proxy/personnel/api/positions/', { params: { page: 1, page_size: 200 } })
  const d = res.data
  return d.data ?? d.results ?? []
}

export async function createBioEmployee(token: string, baseUrl: string, data: UTEmployeeFormData): Promise<UTEmployee> {
  const client = bioClient(token, baseUrl)
  const res = await client.post('/biometrico/proxy/personnel/api/employees/', data)
  return res.data
}

export async function updateBioEmployee(token: string, baseUrl: string, id: string, data: Partial<UTEmployeeFormData>): Promise<UTEmployee> {
  const client = bioClient(token, baseUrl)
  const res = await client.patch(`/biometrico/proxy/personnel/api/employees/${id}/`, data)
  return res.data
}

export async function deleteBioEmployee(token: string, baseUrl: string, id: string): Promise<void> {
  const client = bioClient(token, baseUrl)
  await client.delete(`/biometrico/proxy/personnel/api/employees/${id}/`)
}

// ─── Reporte primera/última marcación ────────────────────────────────────────

export interface FirstLastFilters {
  start_date: string
  end_date:   string
  emp_code?:  string
  page?:      number
  page_size?: number
}

export async function getFirstLastReport(
  token: string,
  baseUrl: string,
  filters: FirstLastFilters,
): Promise<{ count: number; results: UTFirstLastRecord[] }> {
  const client = bioClient(token, baseUrl)
  const params = {
    page:       filters.page ?? 1,
    page_size:  filters.page_size ?? 100,
    start_date: filters.start_date,
    end_date:   filters.end_date,
    ...(filters.emp_code && { emp_code: filters.emp_code }),
  }
  const res = await client.get('/biometrico/proxy/att/api/firstLastReport/', { params })
  const d = res.data
  return {
    count:   d.count ?? d.data?.length ?? 0,
    results: d.data ?? d.results ?? d,
  }
}

// ─── Transacciones raw ────────────────────────────────────────────────────────

export async function getTransactions(
  token: string,
  baseUrl: string,
  params: { start_time?: string; end_time?: string; emp_code?: string; page?: number; page_size?: number },
): Promise<{ count: number; results: UTTransaction[] }> {
  const client = bioClient(token, baseUrl)
  const res = await client.get('/biometrico/proxy/iclock/api/transactions/', {
    params: { page: 1, page_size: 100, ...params },
  })
  const d = res.data
  return {
    count:   d.count ?? 0,
    results: d.data ?? d.results ?? [],
  }
}

// ─── Reporte genérico ────────────────────────────────────────────────────────

export async function getReport(
  token: string,
  baseUrl: string,
  path: string,
  params: Record<string, any>,
): Promise<{ count: number; results: any[] }> {
  const client = bioClient(token, baseUrl)
  const res = await client.get(`/biometrico/proxy${path}`, { params })
  const d = res.data
  return {
    count:   d.count ?? d.data?.length ?? 0,
    results: d.data ?? d.results ?? [],
  }
}

// ─── Explorador genérico ──────────────────────────────────────────────────────

export async function probeUrl(
  token: string,
  baseUrl: string,
  path: string,
  params?: Record<string, string>,
): Promise<any> {
  const client = bioClient(token, baseUrl)
  const res = await client.get(`/biometrico/proxy${path}`, { params })
  return res.data
}

// ─── Endpoints descubiertos (para referencia) ─────────────────────────────────
export const UT_ENDPOINTS = {
  // Dispositivos
  terminals:    '/iclock/api/terminals/',
  transactions: '/iclock/api/transactions/',
  biodatas:     '/iclock/api/biodatas/',
  // Personal
  employees:    '/personnel/api/employees/',
  departments:  '/personnel/api/departments/',
  positions:    '/personnel/api/positions/',
  // Reportes de asistencia
  firstLastReport:          '/att/api/firstLastReport/',
  dailypunchdetailsReport:  '/att/api/dailypunchdetailsReport/',
  manuallogs:               '/att/api/manuallogs/',
  lateReport:               '/att/api/lateReport/',
  absentReport:             '/att/api/absentReport/',
  overtimeReport:           '/att/api/overtimeReport/',
  monthlyAttDetailsReport:  '/att/api/monthlyAttDetailsReport/',
} as const
