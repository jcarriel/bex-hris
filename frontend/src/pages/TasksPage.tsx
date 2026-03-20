import { useState, useEffect } from 'react';
import api from '../services/api';
import { useThemeStore } from '../stores/themeStore';
import { showSuccess, showError } from '../utils/alertify';

interface Task {
  id: string;
  title: string;
  description?: string;
  dueDate: string;
  status: 'pending' | 'completed';
  priority: 'low' | 'medium' | 'high';
  createdBy?: string;
  creatorName?: string;
  creatorEmail?: string;
  createdAt: string;
  updatedAt: string;
}

type TabType = 'overdue' | 'today' | 'upcoming' | 'completed';

export default function TasksPage() {
  const { theme } = useThemeStore();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('today');
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [stats, setStats] = useState({ total: 0, pending: 0, completed: 0, today: 0, completionRate: 0 });
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    dueDate: new Date().toISOString().split('T')[0],
    priority: 'medium' as 'low' | 'medium' | 'high',
  });

  useEffect(() => {
    fetchTasks();
    fetchStats();
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const response = await api.client.get('/tasks');
      const tasksData = response.data.data || [];
      setTasks(tasksData);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      showError('Error al cargar tareas');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.client.get('/tasks/stats');
      setStats(response.data.data || {});
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const getLocalDateString = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const getTodayLocalString = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const getOverdueTasks = () => {
    const todayStr = getTodayLocalString();
    return tasks.filter(t => {
      const taskDateStr = getLocalDateString(t.dueDate);
      return taskDateStr < todayStr && t.status === 'pending';
    });
  };

  const getTodayTasks = () => {
    const todayStr = getTodayLocalString();
    return tasks.filter(t => {
      const taskDateStr = getLocalDateString(t.dueDate);
      return taskDateStr === todayStr && t.status === 'pending';
    });
  };

  const getUpcomingTasks = () => {
    const todayStr = getTodayLocalString();
    return tasks.filter(t => {
      const taskDateStr = getLocalDateString(t.dueDate);
      return taskDateStr > todayStr && t.status === 'pending';
    });
  };

  const getCompletedTasks = () => {
    return tasks.filter(t => t.status === 'completed').sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  };

  const handleSaveTask = async () => {
    if (!formData.title.trim()) {
      showError('El título es obligatorio');
      return;
    }

    try {
      const payload = {
        ...formData,
        dueDate: `${formData.dueDate}T12:00:00.000Z`,
      };
      if (editingTask) {
        await api.client.put(`/tasks/${editingTask.id}`, payload);
        showSuccess('Tarea actualizada exitosamente');
      } else {
        await api.client.post('/tasks', payload);
        showSuccess('Tarea creada exitosamente');
      }
      fetchTasks();
      fetchStats();
      setShowModal(false);
      resetForm();
    } catch (error) {
      console.error('Error saving task:', error);
      showError('Error al guardar tarea');
    }
  };

  const handleToggleTask = async (taskId: string, currentStatus: string) => {
    try {
      if (currentStatus === 'pending') {
        await api.client.put(`/tasks/${taskId}/complete`);
        showSuccess('Tarea completada');
      } else {
        await api.client.put(`/tasks/${taskId}/pending`);
        showSuccess('Tarea marcada como pendiente');
      }
      fetchTasks();
      fetchStats();
    } catch (error) {
      console.error('Error updating task:', error);
      showError('Error al actualizar tarea');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar esta tarea?')) return;

    try {
      await api.client.delete(`/tasks/${taskId}`);
      fetchTasks();
      fetchStats();
      showSuccess('Tarea eliminada exitosamente');
    } catch (error) {
      console.error('Error deleting task:', error);
      showError('Error al eliminar tarea');
    }
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description || '',
      dueDate: task.dueDate.split('T')[0],
      priority: task.priority,
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      dueDate: new Date().toISOString().split('T')[0],
      priority: 'medium',
    });
    setEditingTask(null);
  };

  const renderTaskList = (taskList: Task[]) => {
    if (taskList.length === 0) {
      return (
        <div style={{
          padding: '40px 20px',
          textAlign: 'center',
          color: theme === 'light' ? '#999' : '#9ca3af',
        }}>
          <p style={{ fontSize: '16px', marginBottom: '10px' }}>📭 No hay tareas</p>
          <p style={{ fontSize: '14px' }}>
            {activeTab === 'overdue' && 'No hay tareas vencidas'}
            {activeTab === 'today' && 'Crea una nueva tarea para hoy'}
            {activeTab === 'upcoming' && 'No hay tareas próximas'}
            {activeTab === 'completed' && 'Aún no has completado tareas'}
          </p>
        </div>
      );
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {taskList.map((task) => (
          <div
            key={task.id}
            style={{
              padding: '16px',
              border: `1px solid ${theme === 'light' ? '#e5e7eb' : '#374151'}`,
              borderRadius: '8px',
              background: theme === 'light' ? '#ffffff' : '#1f2937',
              display: 'flex',
              gap: '12px',
              alignItems: 'flex-start',
              transition: 'all 0.2s',
              opacity: task.status === 'completed' ? 0.7 : 1,
            }}
          >
            <input
              type="checkbox"
              checked={task.status === 'completed'}
              onChange={() => handleToggleTask(task.id, task.status)}
              style={{
                marginTop: '4px',
                cursor: 'pointer',
                width: '20px',
                height: '20px',
              }}
            />
            <div style={{ flex: 1 }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '4px',
              }}>
                <h4 style={{
                  margin: 0,
                  fontSize: '15px',
                  fontWeight: '600',
                  color: theme === 'light' ? '#1f2937' : '#f3f4f6',
                  textDecoration: task.status === 'completed' ? 'line-through' : 'none',
                }}>
                  {task.title}
                </h4>
                <span style={{
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: '600',
                  background: task.priority === 'high' ? '#fee2e2' : task.priority === 'medium' ? '#fef3c7' : '#dbeafe',
                  color: task.priority === 'high' ? '#991b1b' : task.priority === 'medium' ? '#92400e' : '#1e40af',
                }}>
                  {task.priority === 'high' ? '🔴 Alta' : task.priority === 'medium' ? '🟡 Media' : '🟢 Baja'}
                </span>
              </div>
              {task.description && (
                <p style={{
                  margin: '4px 0',
                  fontSize: '13px',
                  color: theme === 'light' ? '#666' : '#d1d5db',
                  lineHeight: '1.4',
                }}>
                  {task.description}
                </p>
              )}
              <div style={{
                display: 'flex',
                gap: '16px',
                fontSize: '12px',
                color: theme === 'light' ? '#999' : '#9ca3af',
                marginTop: '8px',
                flexWrap: 'wrap',
              }}>
                <span>📅 {new Date(task.dueDate).toLocaleDateString('es-ES')}</span>
                {task.creatorName && (
                  <span>👤 Creado por: <strong>{task.creatorName}</strong></span>
                )}
                {task.creatorEmail && !task.creatorName && (
                  <span>👤 Creado por: <strong>{task.creatorEmail}</strong></span>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => handleEditTask(task)}
                style={{
                  padding: '6px 12px',
                  background: '#00A86B',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                ✏️
              </button>
              <button
                onClick={() => handleDeleteTask(task.id)}
                style={{
                  padding: '6px 12px',
                  background: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                🗑️
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const todayTasks = getTodayTasks();
  const upcomingTasks = getUpcomingTasks();
  const completedTasks = getCompletedTasks();

  return (
    <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{
        marginBottom: '30px',
        padding: '20px',
        background: 'linear-gradient(135deg, #00A86B 0%, #008C5A 100%)',
        borderRadius: '12px',
        color: 'white',
      }}>
        <h1 style={{ margin: '0 0 15px 0', fontSize: '28px', fontWeight: '700' }}>
          📋 Tareas Colaborativas
        </h1>
        <p style={{ margin: '0 0 20px 0', fontSize: '14px', opacity: 0.9 }}>
          Gestiona tareas compartidas con tu equipo
        </p>
        
        {/* Stats */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '15px',
        }}>
          <div style={{ background: 'rgba(255,255,255,0.2)', padding: '12px', borderRadius: '8px' }}>
            <div style={{ fontSize: '24px', fontWeight: '700' }}>{stats.total}</div>
            <div style={{ fontSize: '12px', opacity: 0.9 }}>Total de tareas</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.2)', padding: '12px', borderRadius: '8px' }}>
            <div style={{ fontSize: '24px', fontWeight: '700' }}>{stats.pending}</div>
            <div style={{ fontSize: '12px', opacity: 0.9 }}>Pendientes</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.2)', padding: '12px', borderRadius: '8px' }}>
            <div style={{ fontSize: '24px', fontWeight: '700' }}>{stats.completed}</div>
            <div style={{ fontSize: '12px', opacity: 0.9 }}>Completadas</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.2)', padding: '12px', borderRadius: '8px' }}>
            <div style={{ fontSize: '24px', fontWeight: '700' }}>{stats.completionRate}%</div>
            <div style={{ fontSize: '12px', opacity: 0.9 }}>Progreso</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '20px',
        borderBottom: `2px solid ${theme === 'light' ? '#e5e7eb' : '#374151'}`,
      }}>
        {(['overdue', 'today', 'upcoming', 'completed'] as TabType[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '12px 20px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              color: activeTab === tab ? '#00A86B' : theme === 'light' ? '#999' : '#9ca3af',
              borderBottom: activeTab === tab ? '3px solid #00A86B' : 'none',
              transition: 'all 0.2s',
            }}
          >
            {tab === 'overdue' && `🔴 Vencidas (${getOverdueTasks().length})`}
            {tab === 'today' && `📅 Hoy (${todayTasks.length})`}
            {tab === 'upcoming' && `📆 Próximas (${upcomingTasks.length})`}
            {tab === 'completed' && `✅ Completadas (${completedTasks.length})`}
          </button>
        ))}
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          style={{
            marginLeft: 'auto',
            padding: '12px 20px',
            background: '#00A86B',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600',
            transition: 'background 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#008C5A')}
          onMouseLeave={(e) => (e.currentTarget.style.background = '#00A86B')}
        >
          ➕ Nueva Tarea
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: theme === 'light' ? '#999' : '#9ca3af' }}>
          Cargando tareas...
        </div>
      ) : (
        <>
          {activeTab === 'overdue' && renderTaskList(getOverdueTasks())}
          {activeTab === 'today' && renderTaskList(todayTasks)}
          {activeTab === 'upcoming' && renderTaskList(upcomingTasks)}
          {activeTab === 'completed' && renderTaskList(completedTasks)}
        </>
      )}

      {/* Modal */}
      {showModal && (
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
          padding: '20px',
        }}>
          <div style={{
            background: theme === 'light' ? 'white' : '#1f2937',
            borderRadius: '12px',
            padding: '30px',
            maxWidth: '500px',
            width: '100%',
            boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
          }}>
            <h2 style={{
              margin: '0 0 20px 0',
              fontSize: '20px',
              fontWeight: '700',
              color: theme === 'light' ? '#1f2937' : '#f3f4f6',
            }}>
              {editingTask ? '✏️ Editar Tarea' : '➕ Nueva Tarea'}
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: '600',
                  marginBottom: '6px',
                  color: theme === 'light' ? '#333' : '#e5e7eb',
                }}>
                  Título *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Ej: Revisar reportes de nómina"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: `1px solid ${theme === 'light' ? '#d1d5db' : '#4b5563'}`,
                    borderRadius: '6px',
                    fontSize: '14px',
                    background: theme === 'light' ? '#ffffff' : '#111827',
                    color: theme === 'light' ? '#1f2937' : '#f3f4f6',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: '600',
                  marginBottom: '6px',
                  color: theme === 'light' ? '#333' : '#e5e7eb',
                }}>
                  Descripción (opcional)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Detalles adicionales..."
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: `1px solid ${theme === 'light' ? '#d1d5db' : '#4b5563'}`,
                    borderRadius: '6px',
                    fontSize: '14px',
                    background: theme === 'light' ? '#ffffff' : '#111827',
                    color: theme === 'light' ? '#1f2937' : '#f3f4f6',
                    minHeight: '100px',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box',
                    resize: 'vertical',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: '600',
                    marginBottom: '6px',
                    color: theme === 'light' ? '#333' : '#e5e7eb',
                  }}>
                    Fecha de Vencimiento
                  </label>
                  <input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: `1px solid ${theme === 'light' ? '#d1d5db' : '#4b5563'}`,
                      borderRadius: '6px',
                      fontSize: '14px',
                      background: theme === 'light' ? '#ffffff' : '#111827',
                      color: theme === 'light' ? '#1f2937' : '#f3f4f6',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: '600',
                    marginBottom: '6px',
                    color: theme === 'light' ? '#333' : '#e5e7eb',
                  }}>
                    Prioridad
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: `1px solid ${theme === 'light' ? '#d1d5db' : '#4b5563'}`,
                      borderRadius: '6px',
                      fontSize: '14px',
                      background: theme === 'light' ? '#ffffff' : '#111827',
                      color: theme === 'light' ? '#1f2937' : '#f3f4f6',
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value="low">🟢 Baja</option>
                    <option value="medium">🟡 Media</option>
                    <option value="high">🔴 Alta</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                <button
                  onClick={handleSaveTask}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: '#00A86B',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600',
                    transition: 'background 0.2s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#008C5A')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = '#00A86B')}
                >
                  💾 Guardar
                </button>
                <button
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: theme === 'light' ? '#e5e7eb' : '#374151',
                    color: theme === 'light' ? '#1f2937' : '#f3f4f6',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600',
                    transition: 'background 0.2s',
                  }}
                >
                  ✕ Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
