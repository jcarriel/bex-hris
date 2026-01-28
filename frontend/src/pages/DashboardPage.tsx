import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useThemeStore } from '../stores/themeStore';
import api from '../services/api';
import EmployeesPage from './EmployeesPage';
import PayrollPage from './PayrollPage';
import AttendancePage from './AttendancePage';
import LeavesPage from './LeavesPage';
import ReportsPage from './ReportsPage';
import AdministrationPage from './AdministrationPage';
import DocumentsPage from './DocumentsPage';
import InventoryPage from './InventoryPage';
import SettingsPage from './SettingsPage';
import DocumentGeneratorPage from './DocumentGeneratorPage';
import BulkUploadPage from './BulkUploadPage';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { logout, user } = useAuthStore((state: any) => ({
    logout: state.logout,
    user: state.user,
  }));
  const { theme } = useThemeStore();

  // Obtener el tab guardado o usar 'dashboard' por defecto
  const [activeTab, setActiveTab] = useState(() => {
    const savedTab = localStorage.getItem('activeTab');
    return savedTab || 'dashboard';
  });
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [stats, setStats] = useState([
    { title: 'Empleados Activos', value: '0', color: '#667eea' },
    { title: 'Nómina del Mes', value: '$0', color: '#764ba2' },
    { title: 'Licencias Pendientes', value: '0', color: '#f093fb' },
    { title: 'Asistencia Hoy', value: '0/0', color: '#4facfe' },
  ]);
  const [recentActivities, setRecentActivities] = useState<string[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [notificationSchedules, setNotificationSchedules] = useState<any[]>([]);

  // Guardar el tab activo en localStorage cuando cambia
  useEffect(() => {
    localStorage.setItem('activeTab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [empsRes, attendanceRes, tasksRes, leavesRes, notifRes] = await Promise.all([
        api.client.get('/employees'),
        api.client.get('/attendance'),
        api.client.get('/tasks').catch(() => ({ data: { data: [] } })),
        api.client.get('/leaves').catch(() => ({ data: { data: [] } })),
        api.client.get('/notification-schedules').catch(() => ({ data: { data: [] } })),
      ]);

      // Handle different response structures
      // For paginated responses, extract the data array from the nested structure
      let employees: any[] = [];
      if (Array.isArray(empsRes.data.data?.data)) {
        // Structure: { success, data: { data: [...], total, page, limit } }
        employees = empsRes.data.data.data;
      } else if (Array.isArray(empsRes.data.data)) {
        // Structure: { success, data: [...] }
        employees = empsRes.data.data;
      } else if (Array.isArray(empsRes.data.items)) {
        // Structure: { success, items: [...] }
        employees = empsRes.data.items;
      } else if (Array.isArray(empsRes.data)) {
        // Structure: [...] direct array
        employees = empsRes.data;
      }
      
      const attendance = Array.isArray(attendanceRes.data.data) ? attendanceRes.data.data :
                        Array.isArray(attendanceRes.data.items) ? attendanceRes.data.items :
                        Array.isArray(attendanceRes.data) ? attendanceRes.data : [];
      
      const allTasks = Array.isArray(tasksRes.data.data) ? tasksRes.data.data :
                      Array.isArray(tasksRes.data.items) ? tasksRes.data.items :
                      Array.isArray(tasksRes.data) ? tasksRes.data : [];
      
      const leaves = Array.isArray(leavesRes.data.data) ? leavesRes.data.data :
                    Array.isArray(leavesRes.data.items) ? leavesRes.data.items :
                    Array.isArray(leavesRes.data) ? leavesRes.data : [];

      const notifications = Array.isArray(notifRes.data.data) ? notifRes.data.data :
                           Array.isArray(notifRes.data.items) ? notifRes.data.items :
                           Array.isArray(notifRes.data) ? notifRes.data : [];

      // Calcular estadísticas
      const activeEmployees = Array.isArray(employees) ? employees.length : 0;
      const todayAttendance = Array.isArray(attendance) ? attendance.filter((a: any) => {
        const attendanceDate = new Date(a.date).toDateString();
        const today = new Date().toDateString();
        return attendanceDate === today && a.status === 'present';
      }).length : 0;

      const pendingLeaves = Array.isArray(leaves) ? leaves.filter((l: any) => l.status === 'pending').length : 0;

      // Filtrar tareas activas (creadas antes o hoy, y no completadas)
      const todayTasks = Array.isArray(allTasks) ? allTasks.filter((t: any) => {
        try {
          const taskCreatedDate = new Date(t.createdAt);
          const taskDueDate = new Date(t.dueDate);
          const today = new Date();
          
          // Mostrar tareas que:
          // 1. Fueron creadas en o antes de hoy
          // 2. Vencen en o después de hoy
          // 3. No están completadas
          const createdBeforeOrToday = taskCreatedDate <= today;
          const dueAfterOrToday = taskDueDate >= today;
          const notCompleted = t.status !== 'completed';
          
          return createdBeforeOrToday && dueAfterOrToday && notCompleted;
        } catch (e) {
          console.error('Error filtering task:', t, e);
          return false;
        }
      }) : [];

      setStats([
        { title: 'Empleados Activos', value: activeEmployees.toString(), color: '#667eea' },
        { title: 'Nómina del Mes', value: '$0', color: '#764ba2' },
        { title: 'Licencias Pendientes', value: pendingLeaves.toString(), color: '#f093fb' },
        { title: 'Asistencia Hoy', value: `${todayAttendance}/${activeEmployees}`, color: '#4facfe' },
      ]);

      setTasks(todayTasks);
      setNotificationSchedules(notifications.filter((n: any) => n.enabled));

      // Actividades recientes
      setRecentActivities([
        `✓ ${activeEmployees} empleados registrados en el sistema`,
        `✓ ${todayAttendance} empleados presentes hoy`,
        `✓ ${pendingLeaves} licencias pendientes de aprobación`,
        `✓ ${todayTasks.length} tareas para hoy`,
      ]);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  const toggleTaskCompletion = async (taskId: string) => {
    try {
      const task = tasks.find((t: any) => t.id === taskId);
      if (!task) return;

      const newStatus = task.status === 'completed' ? 'pending' : 'completed';
      await api.client.put(`/tasks/${taskId}`, { status: newStatus });

      // Recargar tareas
      fetchDashboardData();
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'employees', label: 'Empleados', icon: '👥' },
    { id: 'payroll', label: 'Nómina', icon: '💰' },
    { id: 'bulkUpload', label: 'Carga Masiva', icon: '📥' },
    { id: 'administration', label: 'Administración', icon: '⚙️' },
    { id: 'documents', label: 'Documentos', icon: '📄' },
    { id: 'documentGenerator', label: 'Generador de Docs', icon: '✍️' },
    { id: 'inventory', label: 'Inventario', icon: '📦' },
    { id: 'attendance', label: 'Asistencia', icon: '📋' },
    { id: 'leaves', label: 'Licencias', icon: '🏖️' },
    { id: 'reports', label: 'Reportes', icon: '📈' },
    { id: 'settings', label: 'Configuración', icon: '⚙️' },
  ];

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'system-ui, -apple-system, sans-serif', background: theme === 'light' ? '#f5f7fa' : '#111827' }}>
      {/* Sidebar */}
      <div style={{
        width: sidebarOpen ? '250px' : '0px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        padding: sidebarOpen ? '20px' : '0px',
        overflowY: 'auto',
        transition: 'width 0.3s ease, padding 0.3s ease',
        position: 'relative',
      }}>
        {sidebarOpen && (
          <>
            <h2 style={{ margin: '0 0 30px 0', fontSize: '24px' }}>BEX HRIS</h2>
            
            <nav>
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  style={{
                    width: '100%',
                    padding: '12px 15px',
                    background: activeTab === item.id ? 'rgba(255,255,255,0.2)' : 'transparent',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    marginBottom: '8px',
                    textAlign: 'left',
                    fontSize: '14px',
                    transition: 'background 0.3s',
                  }}
                >
                  {item.icon} {item.label}
                </button>
              ))}
            </nav>

            <div style={{ marginTop: '40px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.2)' }}>
              <div style={{ marginBottom: '15px', fontSize: '12px', opacity: 0.8 }}>
                Usuario: {user?.username || 'Admin'}
              </div>
              <button
                onClick={handleLogout}
                style={{
                  width: '100%',
                  padding: '10px',
                  background: 'rgba(255,255,255,0.2)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                Cerrar Sesión
              </button>
            </div>
          </>
        )}
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, overflowY: 'auto', background: theme === 'light' ? '#f5f7fa' : '#111827', position: 'relative' }}>
        {/* Header */}
        <div style={{
          background: theme === 'light' ? 'white' : '#1f2937',
          padding: '20px 30px',
          borderBottom: `1px solid ${theme === 'light' ? '#eee' : '#374151'}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                width: '40px',
                height: '40px',
                borderRadius: '5px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
                transition: 'all 0.3s ease',
              }}
              title={sidebarOpen ? 'Ocultar menú' : 'Mostrar menú'}
            >
              {sidebarOpen ? '✕' : '☰'}
            </button>
            <h1 style={{ margin: 0, color: theme === 'light' ? '#333' : '#e5e7eb', fontSize: '24px' }}>
              {menuItems.find(m => m.id === activeTab)?.label || 'Dashboard'}
            </h1>
          </div>
          <div style={{ fontSize: '14px', color: theme === 'light' ? '#666' : '#9ca3af' }}>
            {new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '30px' }}>
          {activeTab === 'dashboard' && (
            <div>
              <h2 style={{ color: theme === 'light' ? '#333' : '#e5e7eb', marginBottom: '20px' }}>Resumen General</h2>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '20px',
                marginBottom: '30px',
              }}>
                {stats.map((stat, index) => (
                  <div
                    key={index}
                    style={{
                      background: theme === 'light' ? 'white' : '#1f2937',
                      padding: '20px',
                      borderRadius: '8px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                      borderLeft: `4px solid ${stat.color}`,
                    }}
                  >
                    <div style={{ color: theme === 'light' ? '#999' : '#9ca3af', fontSize: '12px', marginBottom: '10px' }}>
                      {stat.title}
                    </div>
                    <div style={{ fontSize: '28px', fontWeight: 'bold', color: stat.color }}>
                      {stat.value}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{
                background: theme === 'light' ? 'white' : '#1f2937',
                padding: '20px',
                borderRadius: '8px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                border: `1px solid ${theme === 'light' ? '#eee' : '#374151'}`,
              }}>
                <h3 style={{ color: theme === 'light' ? '#333' : '#e5e7eb', marginTop: 0 }}>Actividades Recientes</h3>
                <div style={{ color: theme === 'light' ? '#999' : '#9ca3af', fontSize: '14px' }}>
                  {recentActivities.map((activity, index) => (
                    <p key={index}>{activity}</p>
                  ))}
                </div>
              </div>

              {/* Tareas Pendientes */}
              <div style={{
                background: theme === 'light' ? 'white' : '#1f2937',
                padding: '20px',
                borderRadius: '8px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                marginTop: '20px',
                border: `1px solid ${theme === 'light' ? '#eee' : '#374151'}`,
              }}>
                <h3 style={{ color: theme === 'light' ? '#333' : '#e5e7eb', marginTop: 0 }}>📋 Tareas Pendientes de Hoy</h3>
                {tasks.length === 0 ? (
                  <div style={{ color: theme === 'light' ? '#999' : '#9ca3af', fontSize: '14px', padding: '20px', textAlign: 'center' }}>
                    ✓ No hay tareas pendientes para hoy
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {tasks.map((task: any) => {
                      const isCompleted = task.status === 'completed';
                      return (
                      <div
                        key={task.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '12px',
                          background: isCompleted ? (theme === 'light' ? '#f0f0f0' : '#374151') : (theme === 'light' ? '#fafafa' : '#374151'),
                          borderRadius: '6px',
                          borderLeft: `4px solid ${isCompleted ? '#28a745' : '#0050b3'}`,
                          cursor: 'pointer',
                          transition: 'all 0.3s',
                        }}
                        onClick={() => toggleTaskCompletion(task.id)}
                      >
                        <input
                          type="checkbox"
                          checked={isCompleted}
                          onChange={() => toggleTaskCompletion(task.id)}
                          style={{
                            marginRight: '10px',
                            cursor: 'pointer',
                            width: '18px',
                            height: '18px',
                          }}
                        />
                        <span style={{
                          flex: 1,
                          textDecoration: isCompleted ? 'line-through' : 'none',
                          color: isCompleted ? (theme === 'light' ? '#999' : '#9ca3af') : (theme === 'light' ? '#333' : '#e5e7eb'),
                        }}>
                          {task.title || task.name}
                        </span>
                        {task.description && (
                          <div style={{
                            fontSize: '12px',
                            color: theme === 'light' ? '#999' : '#9ca3af',
                            marginTop: '4px',
                          }}>
                            {task.description}
                          </div>
                        )}
                      </div>
                    );
                    })}
                  </div>
                )}
              </div>

              {/* Notificaciones Programadas */}
              <div style={{
                background: theme === 'light' ? 'white' : '#1f2937',
                padding: '20px',
                borderRadius: '8px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                marginTop: '20px',
                border: `1px solid ${theme === 'light' ? '#eee' : '#374151'}`,
              }}>
                <h3 style={{ color: theme === 'light' ? '#333' : '#e5e7eb', marginTop: 0 }}>🔔 Notificaciones Programadas</h3>
                {notificationSchedules.length === 0 ? (
                  <div style={{ color: theme === 'light' ? '#999' : '#9ca3af', fontSize: '14px', padding: '20px', textAlign: 'center' }}>
                    No hay notificaciones programadas
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {notificationSchedules.map((notif: any) => {
                      const typeLabels: { [key: string]: string } = {
                        payroll: '📊 Nómina',
                        leaves: '📋 Licencias',
                        attendance: '✓ Asistencia',
                        contract_expiry: '📅 Contratos'
                      };
                      const dayLabel = notif.dayOfWeek 
                        ? `${notif.dayOfWeek.charAt(0).toUpperCase() + notif.dayOfWeek.slice(1)}`
                        : notif.dayOfMonth
                        ? `Día ${notif.dayOfMonth}`
                        : 'Diario';
                      return (
                        <div
                          key={notif.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            padding: '12px',
                            background: theme === 'light' ? '#f9f9f9' : '#374151',
                            borderRadius: '6px',
                            borderLeft: '4px solid #667eea',
                          }}
                        >
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: '500', color: theme === 'light' ? '#333' : '#e5e7eb' }}>
                              {typeLabels[notif.type] || notif.type}
                            </div>
                            <div style={{ fontSize: '12px', color: theme === 'light' ? '#999' : '#9ca3af', marginTop: '4px' }}>
                              {dayLabel} a las {String(notif.hour).padStart(2, '0')}:{String(notif.minute).padStart(2, '0')}
                              {notif.recipientEmail && ` → ${notif.recipientEmail}`}
                            </div>
                          </div>
                          <div style={{ fontSize: '12px', color: theme === 'light' ? '#666' : '#9ca3af' }}>
                            {(Array.isArray(notif.channels) ? notif.channels : JSON.parse(notif.channels || '[]')).join(', ')}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'employees' && <EmployeesPage />}
          {activeTab === 'payroll' && <PayrollPage />}
          {activeTab === 'bulkUpload' && <BulkUploadPage />}
          {activeTab === 'administration' && <AdministrationPage />}
          {activeTab === 'documents' && <DocumentsPage />}
          {activeTab === 'documentGenerator' && <DocumentGeneratorPage />}
          {activeTab === 'inventory' && <InventoryPage />}
          {activeTab === 'attendance' && <AttendancePage />}
          {activeTab === 'leaves' && <LeavesPage />}
          {activeTab === 'reports' && <ReportsPage />}
          {activeTab === 'settings' && <SettingsPage />}
        </div>
      </div>
    </div>
  );
}
