import { createBrowserRouter, Navigate } from 'react-router-dom'
import { MainLayout } from '@/components/layout/MainLayout'
import { LoginPage } from '@/pages/auth/LoginPage'
import { DashboardPage } from '@/pages/dashboard/DashboardPage'
import { EmpleadosPage } from '@/pages/empleados/EmpleadosPage'
import { EmpleadoDetallePage } from '@/pages/empleados/EmpleadoDetallePage'
import { NominaPage } from '@/pages/nomina/NominaPage'
import { AsistenciaPage } from '@/pages/asistencia/AsistenciaPage'
import { ReclutamientoPage } from '@/pages/reclutamiento/ReclutamientoPage'
import { ConfiguracionPage } from '@/pages/configuracion/ConfiguracionPage'
import { EventosPage } from '@/pages/eventos/EventosPage'
import { TareasPage } from '@/pages/tareas/TareasPage'
import { FuerzaLaboralPage } from '@/pages/fuerza-laboral/FuerzaLaboralPage'
import { BienestarLayout } from '@/pages/bienestar/BienestarLayout'
import { VacacionesPage } from '@/pages/bienestar/VacacionesPage'
import { PermisosPage } from '@/pages/bienestar/PermisosPage'
import { TrabSocialPage } from '@/pages/bienestar/TrabSocialPage'
import { CargaMasivaPage } from '@/pages/carga-masiva/CargaMasivaPage'
import { TablasPage } from '@/pages/tablas/TablasPage'
import { UsuariosPage } from '@/pages/usuarios/UsuariosPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { PrivateRoute } from './PrivateRoute'

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: (
      <PrivateRoute>
        <MainLayout />
      </PrivateRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard',          element: <DashboardPage /> },
      { path: 'empleados',          element: <EmpleadosPage /> },
      { path: 'empleados/:id',      element: <EmpleadoDetallePage /> },
      { path: 'nomina',             element: <NominaPage /> },
      { path: 'asistencia',         element: <AsistenciaPage /> },
      { path: 'eventos',            element: <EventosPage /> },
      { path: 'tareas',             element: <TareasPage /> },
      { path: 'reclutamiento',      element: <ReclutamientoPage /> },
      { path: 'configuracion',      element: <ConfiguracionPage /> },
      { path: 'fuerza-laboral',     element: <FuerzaLaboralPage /> },
      {
        path: 'bienestar',
        element: <BienestarLayout />,
        children: [
          { index: true, element: <Navigate to="/bienestar/vacaciones" replace /> },
          { path: 'vacaciones',     element: <VacacionesPage /> },
          { path: 'permisos',       element: <PermisosPage /> },
          { path: 'trabajo-social', element: <TrabSocialPage /> },
        ],
      },
      { path: 'carga-masiva',       element: <CargaMasivaPage /> },
      { path: 'tablas',             element: <TablasPage /> },
      { path: 'usuarios',           element: <PrivateRoute module="usuarios"><UsuariosPage /></PrivateRoute> },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
])
