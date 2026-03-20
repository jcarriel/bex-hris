import { useState, useEffect } from 'react';
import api from '../services/api';
import { useThemeStore } from '../stores/themeStore';
import { showSuccess, showError } from '../utils/alertify';

interface RecurringTask {
  id: string;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high';
  dayOfWeek: number;
  isActive: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

const DAYS_OF_WEEK = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export default function RecurringTasksPage() {
  const { theme } = useThemeStore();
  const [recurringTasks, setRecurringTasks] = useState<RecurringTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState<RecurringTask | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    dayOfWeek: 1,
    priority: 'medium' as 'low' | 'medium' | 'high',
  });

  useEffect(() => {
    fetchRecurringTasks();
  }, []);

  const fetchRecurringTasks = async () => {
    try {
      setLoading(true);
      const response = await api.client.get('/recurring-tasks');
      setRecurringTasks(response.data.data || []);
    } catch (error) {
      console.error('Error fetching recurring tasks:', error);
      showError('Error al cargar tareas recurrentes');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTask = async () => {
    if (!formData.title.trim()) {
      showError('El título es requerido');
      return;
    }

    try {
      if (editingTask) {
        await api.client.put(`/recurring-tasks/${editingTask.id}`, formData);
        showSuccess('Tarea recurrente actualizada');
      } else {
        await api.client.post('/recurring-tasks', formData);
        showSuccess('Tarea recurrente creada');
      }
      resetForm();
      setShowModal(false);
      fetchRecurringTasks();
    } catch (error) {
      console.error('Error saving recurring task:', error);
      showError('Error al guardar tarea recurrente');
    }
  };

  const handleDeleteTask = async (id: string) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar esta tarea recurrente?')) {
      return;
    }

    try {
      await api.client.delete(`/recurring-tasks/${id}`);
      showSuccess('Tarea recurrente eliminada');
      fetchRecurringTasks();
    } catch (error) {
      console.error('Error deleting recurring task:', error);
      showError('Error al eliminar tarea recurrente');
    }
  };

  const handleToggleActive = async (task: RecurringTask) => {
    try {
      await api.client.post(`/recurring-tasks/${task.id}/toggle`);
      showSuccess(task.isActive ? 'Tarea desactivada' : 'Tarea activada');
      fetchRecurringTasks();
    } catch (error) {
      console.error('Error toggling recurring task:', error);
      showError('Error al cambiar estado de tarea');
    }
  };

  const handleEditTask = (task: RecurringTask) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description || '',
      dayOfWeek: task.dayOfWeek,
      priority: task.priority,
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      dayOfWeek: 1,
      priority: 'medium',
    });
    setEditingTask(null);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'rgba(255,0,0,0.3)';
      case 'medium':
        return 'rgba(255,165,0,0.3)';
      case 'low':
        return 'rgba(0,255,0,0.3)';
      default:
        return 'rgba(100,100,100,0.3)';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'high':
        return '🔴 Alta';
      case 'medium':
        return '🟡 Media';
      case 'low':
        return '🟢 Baja';
      default:
        return priority;
    }
  };

  const thStyle: React.CSSProperties = { padding: '12px', textAlign: 'left', color: theme === 'light' ? '#666' : '#9ca3af' };
  const tdStyle: React.CSSProperties = { padding: '12px', color: theme === 'light' ? '#333' : '#ffffff' };
  const btnEdit: React.CSSProperties = { padding: '4px 12px', background: '#00A86B', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '12px', transition: 'background 0.2s' };
  const btnDelete: React.CSSProperties = { padding: '4px 12px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '12px' };
  const btnToggle = (isActive: number): React.CSSProperties => ({ padding: '4px 12px', background: isActive ? '#fbbf24' : '#10b981', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '12px', transition: 'background 0.2s' });

  return (
    <>
      <div style={{ marginBottom: '20px', display: 'flex', marginTop: '20px' }}>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          style={{
            padding: '10px 20px',
            background: '#00A86B',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            transition: 'background 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#008C5A')}
          onMouseLeave={(e) => (e.currentTarget.style.background = '#00A86B')}
        >
          + Nueva Tarea Recurrente
        </button>
      </div>

      <div style={{ background: theme === 'light' ? 'white' : '#1f2937', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', overflow: 'hidden', border: `1px solid ${theme === 'light' ? '#eee' : '#374151'}` }}>
        {loading ? (
          <div style={{ padding: '20px', textAlign: 'center', color: theme === 'light' ? '#999' : '#9ca3af' }}>Cargando datos...</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: theme === 'light' ? '#f5f7fa' : '#374151', borderBottom: `2px solid ${theme === 'light' ? '#eee' : '#374151'}` }}>
                <th style={thStyle}>Título</th>
                <th style={thStyle}>Descripción</th>
                <th style={thStyle}>Día</th>
                <th style={thStyle}>Prioridad</th>
                <th style={thStyle}>Estado</th>
                <th style={thStyle}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {recurringTasks.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '20px', textAlign: 'center', color: theme === 'light' ? '#999' : '#9ca3af' }}>
                    No hay tareas recurrentes registradas
                  </td>
                </tr>
              ) : (
                recurringTasks.map((task) => (
                  <tr key={task.id} style={{ borderBottom: `1px solid ${theme === 'light' ? '#eee' : '#374151'}`, background: theme === 'light' ? 'white' : '#111827', opacity: task.isActive ? 1 : 0.6 }}>
                    <td style={{ ...tdStyle, fontWeight: '500' }}>{task.title}</td>
                    <td style={tdStyle}>{task.description || '-'}</td>
                    <td style={tdStyle}>{DAYS_OF_WEEK[task.dayOfWeek]}</td>
                    <td style={tdStyle}>
                      <span style={{ padding: '3px 8px', borderRadius: '3px', fontSize: '11px', fontWeight: '600', background: getPriorityColor(task.priority) }}>
                        {getPriorityLabel(task.priority)}
                      </span>
                    </td>
                    <td style={tdStyle}>{task.isActive ? '✅ Activa' : '❌ Inactiva'}</td>
                    <td style={{ ...tdStyle, display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => handleEditTask(task)}
                        style={btnEdit}
                        onMouseEnter={(e) => (e.currentTarget.style.background = '#008C5A')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = '#00A86B')}
                      >
                        ✏️ Editar
                      </button>
                      <button
                        onClick={() => handleToggleActive(task)}
                        style={btnToggle(task.isActive)}
                      >
                        {task.isActive ? '⏸️ Desactivar' : '▶️ Activar'}
                      </button>
                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        style={btnDelete}
                      >
                        🗑 Eliminar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

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
          }} onClick={() => setShowModal(false)}>
            <div style={{
              background: theme === 'light' ? 'white' : '#1f2937',
              borderRadius: '12px',
              padding: '25px',
              maxWidth: '450px',
              width: '90%',
              boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
            }} onClick={(e) => e.stopPropagation()}>
              <h3 style={{ margin: '0 0 18px 0', fontSize: '18px', fontWeight: '700' }}>
                {editingTask ? '✏️ Editar Tarea Recurrente' : '➕ Nueva Tarea Recurrente'}
              </h3>

              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '12px',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  color: theme === 'light' ? '#666' : '#9ca3af',
                }}>
                  Título
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Ej: Revisión de reportes"
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '6px',
                    border: `1px solid ${theme === 'light' ? '#e5e7eb' : '#374151'}`,
                    background: theme === 'light' ? '#f9fafb' : '#111827',
                    color: theme === 'light' ? '#333' : '#e5e7eb',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '12px',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  color: theme === 'light' ? '#666' : '#9ca3af',
                }}>
                  Descripción
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descripción de la tarea..."
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '6px',
                    border: `1px solid ${theme === 'light' ? '#e5e7eb' : '#374151'}`,
                    background: theme === 'light' ? '#f9fafb' : '#111827',
                    color: theme === 'light' ? '#333' : '#e5e7eb',
                    fontSize: '14px',
                    minHeight: '80px',
                    resize: 'vertical',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontSize: '12px',
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    color: theme === 'light' ? '#666' : '#9ca3af',
                  }}>
                    Día de la Semana
                  </label>
                  <select
                    value={formData.dayOfWeek}
                    onChange={(e) => setFormData({ ...formData, dayOfWeek: parseInt(e.target.value) })}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '6px',
                      border: `1px solid ${theme === 'light' ? '#e5e7eb' : '#374151'}`,
                      background: theme === 'light' ? '#f9fafb' : '#111827',
                      color: theme === 'light' ? '#333' : '#e5e7eb',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                    }}
                  >
                    {DAYS_OF_WEEK.map((day, index) => (
                      <option key={index} value={index}>{day}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontSize: '12px',
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    color: theme === 'light' ? '#666' : '#9ca3af',
                  }}>
                    Prioridad
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '6px',
                      border: `1px solid ${theme === 'light' ? '#e5e7eb' : '#374151'}`,
                      background: theme === 'light' ? '#f9fafb' : '#111827',
                      color: theme === 'light' ? '#333' : '#e5e7eb',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value="low">🟢 Baja</option>
                    <option value="medium">🟡 Media</option>
                    <option value="high">🔴 Alta</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={handleSaveTask}
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
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#008C5A')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = '#00A86B')}
                >
                  {editingTask ? '💾 Actualizar' : '➕ Crear'}
                </button>
                <button
                  onClick={() => {
                    resetForm();
                    setShowModal(false);
                  }}
                  style={{
                    flex: 1,
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
    </>
  );
}
