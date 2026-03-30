import { createBrowserRouter, Navigate } from 'react-router-dom'
import { useAuthStore, firstAccessiblePath } from '@/store/authStore'
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
import { NovedadesPage } from '@/pages/bienestar/NovedadesPage'
import { CargaMasivaPage } from '@/pages/carga-masiva/CargaMasivaPage'
import { TablasPage } from '@/pages/tablas/TablasPage'
import { UsuariosPage } from '@/pages/usuarios/UsuariosPage'
import { CasillerosPage } from '@/pages/casilleros/CasillerosPage'
import { MayordomosPage } from '@/pages/mayordomos/MayordomosPage'
import { BiometricoPage } from '@/pages/biometrico/BiometricoPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { PrivateRoute } from './PrivateRoute'

function R({ module, children }: { module: string; children: React.ReactNode }) {
  return <PrivateRoute module={module}>{children}</PrivateRoute>
}

function RootRedirect() {
  const user = useAuthStore((s) => s.user)
  return <Navigate to={firstAccessiblePath(user?.permissions, user?.rol)} replace />
}

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
      { index: true, element: <RootRedirect /> },
      { path: 'dashboard',      element: <R module="dashboard">      <DashboardPage />     </R> },
      { path: 'empleados',      element: <R module="empleados">      <EmpleadosPage />     </R> },
      { path: 'empleados/:id',  element: <R module="empleados">      <EmpleadoDetallePage /></R> },
      { path: 'nomina',         element: <R module="nomina">         <NominaPage />        </R> },
      { path: 'asistencia',     element: <R module="asistencia">     <AsistenciaPage />    </R> },
      { path: 'eventos',        element: <R module="eventos">        <EventosPage />       </R> },
      { path: 'tareas',         element: <R module="tareas">         <TareasPage />        </R> },
      { path: 'reclutamiento',  element: <R module="reclutamiento">  <ReclutamientoPage /> </R> },
      { path: 'configuracion',  element: <R module="configuracion">  <ConfiguracionPage /> </R> },
      { path: 'fuerza-laboral', element: <R module="fuerza-laboral"> <FuerzaLaboralPage /> </R> },
      {
        path: 'bienestar',
        element: <R module="bienestar"><BienestarLayout /></R>,
        children: [
          { index: true, element: <Navigate to="/bienestar/vacaciones" replace /> },
          { path: 'vacaciones',     element: <VacacionesPage /> },
          { path: 'permisos',       element: <PermisosPage /> },
          { path: 'trabajo-social', element: <TrabSocialPage /> },
          { path: 'novedades',      element: <NovedadesPage /> },
        ],
      },
      { path: 'casilleros',     element: <R module="casilleros">     <CasillerosPage />    </R> },
      { path: 'mayordomos',     element: <R module="mayordomos">     <MayordomosPage />    </R> },
      { path: 'carga-masiva',   element: <R module="carga-masiva">   <CargaMasivaPage />   </R> },
      { path: 'biometrico',     element: <R module="admin">          <BiometricoPage />    </R> },
      { path: 'tablas',         element: <R module="tablas">         <TablasPage />        </R> },
      { path: 'usuarios',       element: <PrivateRoute module="admin"><UsuariosPage />     </PrivateRoute> },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
])
