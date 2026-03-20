import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useThemeStore } from '../stores/themeStore';
import api from '../services/api';
import EmployeesPage from './EmployeesPage';
import PayrollPage from './PayrollPage';
import MarcacionPage from './MarcacionPage';
import LeavesPage from './LeavesPage';
import ReportsPage from './ReportsPage';
import AdministrationPage from './AdministrationPage';
import DocumentsPage from './DocumentsPage';
import SettingsPage from './SettingsPage';
import DocumentGeneratorPage from './DocumentGeneratorPage';
import BulkUploadPage from './BulkUploadPage';
import TasksPage from './TasksPage';
import RecurringTasksPage from './RecurringTasksPage';

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
    { title: 'Empleados Activos', value: '0', color: '#00A86B' },
    { title: 'Nómina del Mes Anterior', value: '$0', color: '#00A86B' },
    { title: 'Licencias Pendientes', value: '0', color: '#00A86B' },
    { title: 'Asistencia Hoy', value: '0/0', color: '#00A86B' },
  ]);
  const [recentActivities, setRecentActivities] = useState<string[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [notificationSchedules, setNotificationSchedules] = useState<any[]>([]);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [showTaskDetail, setShowTaskDetail] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [completionNotes, setCompletionNotes] = useState('');

  // Guardar el tab activo en localStorage cuando cambia
  useEffect(() => {
    localStorage.setItem('activeTab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Calcular mes anterior
      const today = new Date();
      const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1);
      const previousYear = lastMonth.getFullYear();
      const previousMonth = String(lastMonth.getMonth() + 1).padStart(2, '0');

      const [empsRes, attendanceRes, tasksRes, leavesRes, notifRes, payrollRes] = await Promise.all([
        api.client.get('/employees/count'),
        api.client.get('/attendance'),
        api.client.get('/tasks').catch(() => ({ data: { data: [] } })),
        api.client.get('/leaves').catch(() => ({ data: { data: [] } })),
        api.client.get('/notification-schedules').catch(() => ({ data: { data: [] } })),
        api.client.get(`/payroll/sum/${previousYear}/${previousMonth}`).catch(() => ({ data: { data: 0 } })),
      ]);

      let activeEmployees = 0;
      if (typeof empsRes.data.data === 'number') {
        // Structure: { success, data: count }
        activeEmployees = empsRes.data.data;
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

      // Obtener suma de nóminas del mes anterior
      let payrollSum = 0;
      if (typeof payrollRes.data.data === 'number') {
        payrollSum = payrollRes.data.data;
      }

      const todayAttendance = Array.isArray(attendance) ? attendance.filter((a: any) => {
        const attendanceDate = new Date(a.date).toDateString();
        const today = new Date().toDateString();
        return attendanceDate === today && a.status === 'present';
      }).length : 0;

      const pendingLeaves = Array.isArray(leaves) ? leaves.filter((l: any) => l.status === 'pending').length : 0;

      // Filtrar tareas por categoría
      const taskToday = new Date();
      taskToday.setHours(0, 0, 0, 0);
      
      const overdueTasks = Array.isArray(allTasks) ? allTasks.filter((t: any) => {
        try {
          const taskDueDate = new Date(t.dueDate);
          taskDueDate.setHours(0, 0, 0, 0);
          return taskDueDate < taskToday && t.status !== 'completed';
        } catch (e) {
          return false;
        }
      }) : [];
      
      const todayTasksList = Array.isArray(allTasks) ? allTasks.filter((t: any) => {
        try {
          const taskDueDate = new Date(t.dueDate);
          taskDueDate.setHours(0, 0, 0, 0);
          return taskDueDate.getTime() === taskToday.getTime() && t.status !== 'completed';
        } catch (e) {
          return false;
        }
      }) : [];
      
      const upcomingTasks = Array.isArray(allTasks) ? allTasks.filter((t: any) => {
        try {
          const taskDueDate = new Date(t.dueDate);
          taskDueDate.setHours(0, 0, 0, 0);
          return taskDueDate > taskToday && t.status !== 'completed';
        } catch (e) {
          return false;
        }
      }) : [];
      
      const allPendingTasks = [...overdueTasks, ...todayTasksList, ...upcomingTasks];

      setStats([
        { title: 'Empleados Activos', value: activeEmployees.toString(), color: '#00A86B' },
        { title: 'Nómina del Mes Anterior', value: `$${payrollSum.toLocaleString()}`, color: '#00A86B' },
        { title: 'Licencias Pendientes', value: pendingLeaves.toString(), color: '#00A86B' },
        { title: 'Asistencia Hoy', value: `${todayAttendance}/${activeEmployees}`, color: '#00A86B' },
      ]);

      setTasks(allPendingTasks);
      setNotificationSchedules(notifications.filter((n: any) => n.enabled));

      // Actividades recientes
      setRecentActivities([
        `✓ ${activeEmployees} empleados registrados en el sistema`,
        `✓ ${todayAttendance} empleados presentes hoy`,
        `✓ ${pendingLeaves} licencias pendientes de aprobación`,
        `✓ ${allPendingTasks.length} tareas pendientes`,
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

  const handleShowTaskDetail = (task: any) => {
    setSelectedTask(task);
    setShowTaskDetail(true);
  };

  const handleCompleteTaskWithNotes = async () => {
    if (!selectedTask) return;

    try {
      await api.client.put(`/tasks/${selectedTask.id}`, {
        status: 'completed',
        completionNotes: completionNotes,
      });

      setShowCompletionModal(false);
      setCompletionNotes('');
      setShowTaskDetail(false);
      fetchDashboardData();
    } catch (error) {
      console.error('Error completing task:', error);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'tasks', label: 'Tareas', icon: '📋' },
    { id: 'employees', label: 'Empleados', icon: '👥' },
    { id: 'payroll', label: 'Nómina', icon: '💰' },
    { id: 'marcacion', label: 'Marcación', icon: '⏱️' },
    { id: 'administration', label: 'Administración', icon: '⚙️' },
    { id: 'bulkUpload', label: 'Carga Masiva', icon: '📥' },
    // { id: 'documents', label: 'Documentos', icon: '📄' },
    // { id: 'documentGenerator', label: 'Generador de Docs', icon: '✍️' },
    // { id: 'leaves', label: 'Licencias', icon: '🏖️' },
    // { id: 'reports', label: 'Reportes', icon: '📈' },
    { id: 'settings', label: 'Configuración', icon: '⚙️' },
  ];

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'system-ui, -apple-system, sans-serif', background: theme === 'light' ? '#f5f7fa' : '#111827' }}>
      {/* Sidebar */}
      <div style={{
        width: sidebarOpen ? '250px' : '0px',
        background: '#00A86B',
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
                background: '#00A86B',
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
              onMouseEnter={(e) => (e.currentTarget.style.background = '#008C5A')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#00A86B')}
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

              {/* Tareas Pendientes - Mejorado con secciones */}
              <div style={{
                background: 'linear-gradient(135deg, #00A86B 0%, #008C5A 100%)',
                padding: '30px',
                borderRadius: '12px',
                boxShadow: '0 4px 15px rgba(0,0,0,0.15)',
                marginTop: '20px',
                color: 'white',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
                  <div>
                    <h3 style={{ margin: '0 0 5px 0', fontSize: '20px', fontWeight: '700' }}>📋 Tareas Pendientes</h3>
                    <p style={{ margin: 0, fontSize: '13px', opacity: 0.9 }}>Gestiona tus tareas pendientes</p>
                  </div>
                  <button
                    onClick={() => setActiveTab('tasks')}
                    style={{
                      padding: '10px 20px',
                      background: 'rgba(255,255,255,0.2)',
                      color: 'white',
                      border: '2px solid white',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: '600',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.3)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
                    }}
                  >
                    Ver todas →
                  </button>
                </div>

                {tasks.length === 0 ? (
                  <div style={{
                    padding: '40px 20px',
                    textAlign: 'center',
                    background: 'rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    border: '2px dashed rgba(255,255,255,0.3)',
                  }}>
                    <div style={{ fontSize: '32px', marginBottom: '10px' }}>✨</div>
                    <p style={{ margin: 0, fontSize: '15px', fontWeight: '500' }}>¡Excelente! No hay tareas pendientes</p>
                    <p style={{ margin: '5px 0 0 0', fontSize: '13px', opacity: 0.8 }}>Crea una nueva tarea en el módulo de Tareas</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {/* Tareas Vencidas */}
                    {(() => {
                      const taskToday = new Date();
                      taskToday.setHours(0, 0, 0, 0);
                      const overdue = tasks.filter((t: any) => {
                        const dueDate = new Date(t.dueDate);
                        dueDate.setHours(0, 0, 0, 0);
                        return dueDate < taskToday;
                      });
                      return overdue.length > 0 ? (
                        <div>
                          <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: '700', opacity: 0.9, textTransform: 'uppercase', letterSpacing: '0.5px' }}>🔴 Tareas Vencidas ({overdue.length})</h4>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {overdue.slice(0, 3).map((task: any) => (
                              <div key={task.id} style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                padding: '12px 14px',
                                background: 'rgba(255,0,0,0.15)',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                border: '1px solid rgba(255,0,0,0.3)',
                              }} onClick={() => handleShowTaskDetail(task)}>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontWeight: '600', fontSize: '13px', marginBottom: '3px' }}>{task.title}</div>
                                  <div style={{ fontSize: '11px', opacity: 0.8 }}>👤 {task.creatorName || task.creatorEmail || 'Sistema'}</div>
                                </div>
                                <span style={{ padding: '3px 8px', borderRadius: '3px', fontSize: '10px', fontWeight: '600', background: 'rgba(255,0,0,0.3)', whiteSpace: 'nowrap', marginLeft: '8px' }}>{task.priority === 'high' ? '🔴 Alta' : task.priority === 'medium' ? '🟡 Media' : '🟢 Baja'}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null;
                    })()}

                    {/* Tareas de Hoy */}
                    {(() => {
                      const taskToday = new Date();
                      taskToday.setHours(0, 0, 0, 0);
                      const today = tasks.filter((t: any) => {
                        const dueDate = new Date(t.dueDate);
                        dueDate.setHours(0, 0, 0, 0);
                        return dueDate.getTime() === taskToday.getTime();
                      });
                      return today.length > 0 ? (
                        <div>
                          <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: '700', opacity: 0.9, textTransform: 'uppercase', letterSpacing: '0.5px' }}>📅 Hoy ({today.length})</h4>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {today.slice(0, 3).map((task: any) => (
                              <div key={task.id} style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                padding: '12px 14px',
                                background: 'rgba(255,255,255,0.15)',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                border: '1px solid rgba(255,255,255,0.2)',
                              }} onClick={() => handleShowTaskDetail(task)}>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontWeight: '600', fontSize: '13px', marginBottom: '3px' }}>{task.title}</div>
                                  <div style={{ fontSize: '11px', opacity: 0.8 }}>👤 {task.creatorName || task.creatorEmail || 'Sistema'}</div>
                                </div>
                                <span style={{ padding: '3px 8px', borderRadius: '3px', fontSize: '10px', fontWeight: '600', background: task.priority === 'high' ? 'rgba(255,0,0,0.3)' : task.priority === 'medium' ? 'rgba(255,165,0,0.3)' : 'rgba(0,255,0,0.3)', whiteSpace: 'nowrap', marginLeft: '8px' }}>{task.priority === 'high' ? '🔴 Alta' : task.priority === 'medium' ? '🟡 Media' : '🟢 Baja'}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null;
                    })()}

                    {/* Tareas Próximas */}
                    {(() => {
                      const taskToday = new Date();
                      taskToday.setHours(0, 0, 0, 0);
                      const upcoming = tasks.filter((t: any) => {
                        const dueDate = new Date(t.dueDate);
                        dueDate.setHours(0, 0, 0, 0);
                        return dueDate > taskToday;
                      });
                      return upcoming.length > 0 ? (
                        <div>
                          <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: '700', opacity: 0.9, textTransform: 'uppercase', letterSpacing: '0.5px' }}>⏰ Próximas ({upcoming.length})</h4>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {upcoming.slice(0, 3).map((task: any) => (
                              <div key={task.id} style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                padding: '12px 14px',
                                background: 'rgba(255,255,255,0.1)',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                border: '1px solid rgba(255,255,255,0.15)',
                              }} onClick={() => handleShowTaskDetail(task)}>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontWeight: '600', fontSize: '13px', marginBottom: '3px' }}>{task.title}</div>
                                  <div style={{ fontSize: '11px', opacity: 0.8 }}>👤 {task.creatorName || task.creatorEmail || 'Sistema'} • 📅 {new Date(task.dueDate).toLocaleDateString('es-ES')}</div>
                                </div>
                                <span style={{ padding: '3px 8px', borderRadius: '3px', fontSize: '10px', fontWeight: '600', background: task.priority === 'high' ? 'rgba(255,0,0,0.3)' : task.priority === 'medium' ? 'rgba(255,165,0,0.3)' : 'rgba(0,255,0,0.3)', whiteSpace: 'nowrap', marginLeft: '8px' }}>{task.priority === 'high' ? '🔴 Alta' : task.priority === 'medium' ? '🟡 Media' : '🟢 Baja'}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null;
                    })()}
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

          {activeTab === 'tasks' && <TasksPage />}
          {activeTab === 'employees' && <EmployeesPage />}
          {activeTab === 'payroll' && <PayrollPage />}
          {activeTab === 'bulkUpload' && <BulkUploadPage />}
          {activeTab === 'administration' && <AdministrationPage />}
          {activeTab === 'documents' && <DocumentsPage />}
          {activeTab === 'documentGenerator' && <DocumentGeneratorPage />}
          {activeTab === 'marcacion' && <MarcacionPage />}
          {activeTab === 'leaves' && <LeavesPage />}
          {activeTab === 'reports' && <ReportsPage />}
          {activeTab === 'settings' && <SettingsPage />}

          {/* Modal de Detalle de Tarea */}
          {showTaskDetail && selectedTask && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
            }} onClick={() => setShowTaskDetail(false)}>
              <div style={{
                background: theme === 'light' ? 'white' : '#1f2937',
                borderRadius: '12px',
                padding: '30px',
                maxWidth: '500px',
                width: '90%',
                boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
              }} onClick={(e) => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                  <h2 style={{ margin: 0, color: theme === 'light' ? '#1f2937' : '#f3f4f6', fontSize: '22px' }}>
                    {selectedTask.title}
                  </h2>
                  <button
                    onClick={() => setShowTaskDetail(false)}
                    style={{
                      background: 'none',
                      border: 'none',
                      fontSize: '24px',
                      cursor: 'pointer',
                      color: theme === 'light' ? '#666' : '#9ca3af',
                    }}
                  >
                    ✕
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                  <span style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '600',
                    background: selectedTask.priority === 'high' ? '#fee2e2' : selectedTask.priority === 'medium' ? '#fef3c7' : '#dbeafe',
                    color: selectedTask.priority === 'high' ? '#991b1b' : selectedTask.priority === 'medium' ? '#92400e' : '#1e40af',
                  }}>
                    {selectedTask.priority === 'high' ? '🔴 Alta' : selectedTask.priority === 'medium' ? '🟡 Media' : '🟢 Baja'}
                  </span>
                  <span style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '600',
                    background: selectedTask.status === 'completed' ? '#dcfce7' : '#fef3c7',
                    color: selectedTask.status === 'completed' ? '#166534' : '#92400e',
                  }}>
                    {selectedTask.status === 'completed' ? '✅ Completada' : '⏳ Pendiente'}
                  </span>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <h3 style={{ margin: '0 0 8px 0', color: theme === 'light' ? '#666' : '#9ca3af', fontSize: '12px', textTransform: 'uppercase', fontWeight: '600' }}>Descripción</h3>
                  <p style={{ margin: 0, color: theme === 'light' ? '#333' : '#e5e7eb', lineHeight: '1.6' }}>
                    {selectedTask.description || 'Sin descripción'}
                  </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                  <div>
                    <h3 style={{ margin: '0 0 8px 0', color: theme === 'light' ? '#666' : '#9ca3af', fontSize: '12px', textTransform: 'uppercase', fontWeight: '600' }}>Fecha de Vencimiento</h3>
                    <p style={{ margin: 0, color: theme === 'light' ? '#333' : '#e5e7eb', fontSize: '14px', fontWeight: '500' }}>
                      📅 {new Date(selectedTask.dueDate).toLocaleDateString('es-ES')}
                    </p>
                  </div>
                  <div>
                    <h3 style={{ margin: '0 0 8px 0', color: theme === 'light' ? '#666' : '#9ca3af', fontSize: '12px', textTransform: 'uppercase', fontWeight: '600' }}>Creador</h3>
                    <p style={{ margin: 0, color: theme === 'light' ? '#333' : '#e5e7eb', fontSize: '14px', fontWeight: '500' }}>
                      👤 {selectedTask.creatorName || selectedTask.creatorEmail || 'Sistema'}
                    </p>
                  </div>
                </div>

                {selectedTask.createdAt && (
                  <div style={{ marginBottom: '20px', paddingTop: '20px', borderTop: `1px solid ${theme === 'light' ? '#eee' : '#374151'}` }}>
                    <p style={{ margin: 0, color: theme === 'light' ? '#999' : '#9ca3af', fontSize: '12px' }}>
                      Creada: {new Date(selectedTask.createdAt).toLocaleDateString('es-ES')} a las {new Date(selectedTask.createdAt).toLocaleTimeString('es-ES')}
                    </p>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                  <button
                    onClick={() => {
                      if (selectedTask.status === 'completed') {
                        toggleTaskCompletion(selectedTask.id);
                        setShowTaskDetail(false);
                      } else {
                        setShowCompletionModal(true);
                      }
                    }}
                    style={{
                      flex: 1,
                      padding: '10px 16px',
                      background: selectedTask.status === 'completed' ? '#fbbf24' : '#00A86B',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontWeight: '600',
                      fontSize: '14px',
                      transition: 'background 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = selectedTask.status === 'completed' ? '#f59e0b' : '#008C5A';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = selectedTask.status === 'completed' ? '#fbbf24' : '#00A86B';
                    }}
                  >
                    {selectedTask.status === 'completed' ? '↩️ Marcar como Pendiente' : '✅ Marcar como Completada'}
                  </button>
                  <button
                    onClick={() => setShowTaskDetail(false)}
                    style={{
                      padding: '10px 16px',
                      background: theme === 'light' ? '#e5e7eb' : '#374151',
                      color: theme === 'light' ? '#333' : '#e5e7eb',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontWeight: '600',
                      fontSize: '14px',
                      transition: 'background 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = theme === 'light' ? '#d1d5db' : '#4b5563';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = theme === 'light' ? '#e5e7eb' : '#374151';
                    }}
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Modal de Finalización con Notas */}
          {showCompletionModal && selectedTask && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1001,
            }} onClick={() => setShowCompletionModal(false)}>
              <div style={{
                background: theme === 'light' ? 'white' : '#1f2937',
                borderRadius: '12px',
                padding: '30px',
                maxWidth: '500px',
                width: '90%',
                boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
              }} onClick={(e) => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                  <h2 style={{ margin: 0, color: theme === 'light' ? '#1f2937' : '#f3f4f6', fontSize: '22px' }}>
                    ✅ Finalizar Tarea
                  </h2>
                  <button
                    onClick={() => setShowCompletionModal(false)}
                    style={{
                      background: 'none',
                      border: 'none',
                      fontSize: '24px',
                      cursor: 'pointer',
                      color: theme === 'light' ? '#666' : '#9ca3af',
                    }}
                  >
                    ✕
                  </button>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <p style={{ margin: '0 0 10px 0', color: theme === 'light' ? '#333' : '#e5e7eb', fontWeight: '500' }}>
                    Tarea: <strong>{selectedTask.title}</strong>
                  </p>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    color: theme === 'light' ? '#666' : '#9ca3af',
                    fontSize: '12px',
                    textTransform: 'uppercase',
                    fontWeight: '600',
                  }}>
                    Detalle Final (Opcional)
                  </label>
                  <textarea
                    value={completionNotes}
                    onChange={(e) => setCompletionNotes(e.target.value)}
                    placeholder="Agrega un detalle sobre cómo se completó la tarea..."
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '6px',
                      border: `1px solid ${theme === 'light' ? '#e5e7eb' : '#374151'}`,
                      background: theme === 'light' ? '#f9fafb' : '#111827',
                      color: theme === 'light' ? '#333' : '#e5e7eb',
                      fontFamily: 'inherit',
                      fontSize: '14px',
                      minHeight: '100px',
                      resize: 'vertical',
                    }}
                  />
                  <p style={{
                    margin: '8px 0 0 0',
                    fontSize: '12px',
                    color: theme === 'light' ? '#999' : '#9ca3af',
                  }}>
                    {completionNotes.length} caracteres
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                  <button
                    onClick={handleCompleteTaskWithNotes}
                    style={{
                      flex: 1,
                      padding: '12px 16px',
                      background: '#00A86B',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontWeight: '600',
                      fontSize: '14px',
                      transition: 'background 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#008C5A';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#00A86B';
                    }}
                  >
                    ✅ Finalizar Tarea
                  </button>
                  <button
                    onClick={() => setShowCompletionModal(false)}
                    style={{
                      padding: '12px 16px',
                      background: theme === 'light' ? '#e5e7eb' : '#374151',
                      color: theme === 'light' ? '#333' : '#e5e7eb',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontWeight: '600',
                      fontSize: '14px',
                      transition: 'background 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = theme === 'light' ? '#d1d5db' : '#4b5563';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = theme === 'light' ? '#e5e7eb' : '#374151';
                    }}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
