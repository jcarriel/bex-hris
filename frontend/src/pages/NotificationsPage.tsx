import { useState, useEffect } from 'react';
import api from '../services/api';
import alertify from 'alertifyjs';
import { useThemeStore } from '../stores/themeStore';

export default function NotificationsPage() {
  const { theme } = useThemeStore();
  const [schedules, setSchedules] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    type: 'payroll',
    dayOfWeek: '',
    dayOfMonth: '',
    hour: 8,
    minute: 0,
    enabled: 1,
    channels: ['app', 'email'],
    recipientEmail: '',
    description: ''
  });

  useEffect(() => {
    fetchSchedules();
  }, []);

  const fetchSchedules = async () => {
    try {
      const res = await api.client.get('/notification-schedules');
      setSchedules(res.data.data || []);
    } catch (error) {
      console.error('Error fetching schedules:', error);
      alertify.error('Error al cargar configuraciones');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        type: formData.type,
        dayOfWeek: formData.dayOfWeek ? formData.dayOfWeek : null,
        dayOfMonth: formData.dayOfMonth ? parseInt(formData.dayOfMonth) : null,
        hour: formData.hour,
        minute: formData.minute,
        enabled: formData.enabled,
        channels: JSON.stringify(formData.channels),
        recipientEmail: formData.recipientEmail && formData.recipientEmail.trim() ? formData.recipientEmail.trim() : null,
        description: formData.description && formData.description.trim() ? formData.description.trim() : null
      };

      if (editingId) {
        await api.client.put(`/notification-schedules/${editingId}`, payload);
        alertify.success('Configuración actualizada');
      } else {
        await api.client.post('/notification-schedules', payload);
        alertify.success('Configuración creada');
      }

      fetchSchedules();
      setShowForm(false);
      setEditingId(null);
      resetForm();
    } catch (error) {
      console.error('Error:', error);
      alertify.error('Error al guardar configuración');
    }
  };

  const resetForm = () => {
    setFormData({
      type: 'payroll',
      dayOfWeek: '',
      dayOfMonth: '',
      hour: 8,
      minute: 0,
      enabled: 1,
      channels: ['app', 'email'],
      recipientEmail: '',
      description: ''
    });
  };

  const editSchedule = (schedule: any) => {
    setFormData({
      type: schedule.type,
      dayOfWeek: schedule.dayOfWeek || '',
      dayOfMonth: schedule.dayOfMonth ? String(schedule.dayOfMonth) : '',
      hour: schedule.hour !== undefined && schedule.hour !== null ? Number(schedule.hour) : 8,
      minute: schedule.minute !== undefined && schedule.minute !== null ? Number(schedule.minute) : 0,
      enabled: schedule.enabled,
      channels: Array.isArray(schedule.channels) ? schedule.channels : JSON.parse(schedule.channels || '[]'),
      recipientEmail: schedule.recipientEmail || '',
      description: schedule.description || ''
    });
    setEditingId(schedule.id);
    setShowForm(true);
  };

  const deleteSchedule = async (id: string) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar esta configuración?')) {
      try {
        await api.client.delete(`/notification-schedules/${id}`);
        alertify.success('Configuración eliminada');
        fetchSchedules();
      } catch (error) {
        console.error('Error:', error);
        alertify.error('Error al eliminar configuración');
      }
    }
  };

  const toggleChannel = (channel: string) => {
    setFormData({
      ...formData,
      channels: formData.channels.includes(channel)
        ? formData.channels.filter(c => c !== channel)
        : [...formData.channels, channel]
    });
  };

  const getTypeLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      payroll: 'Nómina',
      leaves: 'Licencias',
      attendance: 'Asistencia',
      contract_expiry: 'Contratos Próximos a Vencer'
    };
    return labels[type] || type;
  };

  const getDayLabel = (schedule: any) => {
    if (schedule.dayOfWeek) {
      const days: { [key: string]: string } = {
        monday: 'Lunes',
        tuesday: 'Martes',
        wednesday: 'Miércoles',
        thursday: 'Jueves',
        friday: 'Viernes',
        saturday: 'Sábado',
        sunday: 'Domingo'
      };
      return days[schedule.dayOfWeek] || schedule.dayOfWeek;
    } else if (schedule.dayOfMonth) {
      return `Día ${schedule.dayOfMonth} del mes`;
    }
    return 'Todos los días';
  };

  return (
      <div style={{ padding: '20px' }}>
        <div style={{ marginBottom: '20px' }}>
          <button
            onClick={() => {
              setShowForm(!showForm);
              if (showForm) resetForm();
              setEditingId(null);
            }}
            style={{
              padding: '10px 20px',
              background: '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            {showForm ? '✕ Cancelar' : '+ Nueva Notificación'}
          </button>
        </div>

      {showForm && (
        <div style={{
          background: theme === 'light' ? 'white' : '#1f2937',
          padding: '20px',
          borderRadius: '8px',
          marginBottom: '20px',
          border: `1px solid ${theme === 'light' ? '#eee' : '#374151'}`
        }}>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: theme === 'light' ? '#333' : '#e5e7eb' }}>Tipo de Notificación</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                style={{ width: '100%', padding: '8px', border: `1px solid ${theme === 'light' ? '#ddd' : '#374151'}`, borderRadius: '4px', background: theme === 'light' ? 'white' : '#374151', color: theme === 'light' ? '#333' : '#ffffff' }}
              >
                <option value="payroll">Nómina</option>
                <option value="leaves">Licencias</option>
                <option value="attendance">Asistencia</option>
                <option value="contract_expiry">Contratos Próximos a Vencer</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: theme === 'light' ? '#333' : '#e5e7eb' }}>Frecuencia</label>
              <select
                value={formData.dayOfWeek ? 'weekly' : formData.dayOfMonth ? 'monthly' : 'daily'}
                onChange={(e) => {
                  if (e.target.value === 'weekly') {
                    setFormData({ ...formData, dayOfWeek: 'monday', dayOfMonth: '' });
                  } else if (e.target.value === 'monthly') {
                    setFormData({ ...formData, dayOfWeek: '', dayOfMonth: '1' });
                  } else {
                    setFormData({ ...formData, dayOfWeek: '', dayOfMonth: '' });
                  }
                }}
                style={{ width: '100%', padding: '8px', border: `1px solid ${theme === 'light' ? '#ddd' : '#374151'}`, borderRadius: '4px', background: theme === 'light' ? 'white' : '#374151', color: theme === 'light' ? '#333' : '#ffffff' }}
              >
                <option value="daily">Todos los días</option>
                <option value="weekly">Semanalmente</option>
                <option value="monthly">Mensualmente</option>
              </select>
            </div>

            {formData.dayOfWeek && (
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: theme === 'light' ? '#333' : '#e5e7eb' }}>Día de la Semana</label>
                <select
                  value={formData.dayOfWeek}
                  onChange={(e) => setFormData({ ...formData, dayOfWeek: e.target.value })}
                  style={{ width: '100%', padding: '8px', border: `1px solid ${theme === 'light' ? '#ddd' : '#374151'}`, borderRadius: '4px', background: theme === 'light' ? 'white' : '#374151', color: theme === 'light' ? '#333' : '#ffffff' }}
                >
                  <option value="monday">Lunes</option>
                  <option value="tuesday">Martes</option>
                  <option value="wednesday">Miércoles</option>
                  <option value="thursday">Jueves</option>
                  <option value="friday">Viernes</option>
                  <option value="saturday">Sábado</option>
                  <option value="sunday">Domingo</option>
                </select>
              </div>
            )}

            {formData.dayOfMonth && (
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: theme === 'light' ? '#333' : '#e5e7eb' }}>Día del Mes</label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={formData.dayOfMonth || ''}
                  onChange={(e) => setFormData({ ...formData, dayOfMonth: e.target.value })}
                  style={{ width: '100%', padding: '8px', border: `1px solid ${theme === 'light' ? '#ddd' : '#374151'}`, borderRadius: '4px', background: theme === 'light' ? 'white' : '#374151', color: theme === 'light' ? '#333' : '#ffffff' }}
                />
              </div>
            )}

            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: theme === 'light' ? '#333' : '#e5e7eb' }}>Hora</label>
              <input
                type="number"
                min="0"
                max="23"
                value={formData.hour || 0}
                onChange={(e) => setFormData({ ...formData, hour: parseInt(e.target.value) || 0 })}
                style={{ width: '100%', padding: '8px', border: `1px solid ${theme === 'light' ? '#ddd' : '#374151'}`, borderRadius: '4px', background: theme === 'light' ? 'white' : '#374151', color: theme === 'light' ? '#333' : '#ffffff' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: theme === 'light' ? '#333' : '#e5e7eb' }}>Minuto</label>
              <input
                type="number"
                min="0"
                max="59"
                value={formData.minute || 0}
                onChange={(e) => setFormData({ ...formData, minute: parseInt(e.target.value) || 0 })}
                style={{ width: '100%', padding: '8px', border: `1px solid ${theme === 'light' ? '#ddd' : '#374151'}`, borderRadius: '4px', background: theme === 'light' ? 'white' : '#374151', color: theme === 'light' ? '#333' : '#ffffff' }}
              />
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold', color: theme === 'light' ? '#333' : '#e5e7eb' }}>Canales de Envío</label>
              <div style={{ display: 'flex', gap: '15px' }}>
                {['app', 'email', 'whatsapp', 'telegram'].map(channel => (
                  <label key={channel} style={{ display: 'flex', alignItems: 'center', gap: '5px', color: theme === 'light' ? '#333' : '#e5e7eb' }}>
                    <input
                      type="checkbox"
                      checked={formData.channels.includes(channel)}
                      onChange={() => toggleChannel(channel)}
                    />
                    {channel.charAt(0).toUpperCase() + channel.slice(1)}
                  </label>
                ))}
              </div>
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: theme === 'light' ? '#333' : '#e5e7eb' }}>Email Destino</label>
              <input
                type="email"
                value={formData.recipientEmail}
                onChange={(e) => setFormData({ ...formData, recipientEmail: e.target.value })}
                placeholder="ejemplo@empresa.com"
                style={{ width: '100%', padding: '8px', border: `1px solid ${theme === 'light' ? '#ddd' : '#374151'}`, borderRadius: '4px', background: theme === 'light' ? 'white' : '#374151', color: theme === 'light' ? '#333' : '#ffffff' }}
              />
              <div style={{ fontSize: '12px', color: theme === 'light' ? '#999' : '#9ca3af', marginTop: '5px' }}>
                Email donde se enviarán las notificaciones
              </div>
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: theme === 'light' ? '#333' : '#e5e7eb' }}>Descripción</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descripción opcional"
                style={{ width: '100%', padding: '8px', border: `1px solid ${theme === 'light' ? '#ddd' : '#374151'}`, borderRadius: '4px', minHeight: '80px', background: theme === 'light' ? 'white' : '#374151', color: theme === 'light' ? '#333' : '#ffffff' }}
              />
            </div>

            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '10px' }}>
              <button
                type="submit"
                style={{
                  padding: '10px 20px',
                  background: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                {editingId ? '✏️ Actualizar' : '✚ Crear'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                  setEditingId(null);
                }}
                style={{
                  padding: '10px 20px',
                  background: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: theme === 'light' ? '#f5f7fa' : '#374151', borderBottom: `2px solid ${theme === 'light' ? '#eee' : '#374151'}` }}>
              <th style={{ padding: '12px', textAlign: 'left', color: theme === 'light' ? '#666' : '#9ca3af' }}>Tipo</th>
              <th style={{ padding: '12px', textAlign: 'left', color: theme === 'light' ? '#666' : '#9ca3af' }}>Frecuencia</th>
              <th style={{ padding: '12px', textAlign: 'left', color: theme === 'light' ? '#666' : '#9ca3af' }}>Hora</th>
              <th style={{ padding: '12px', textAlign: 'left', color: theme === 'light' ? '#666' : '#9ca3af' }}>Email Destino</th>
              <th style={{ padding: '12px', textAlign: 'left', color: theme === 'light' ? '#666' : '#9ca3af' }}>Canales</th>
              <th style={{ padding: '12px', textAlign: 'left', color: theme === 'light' ? '#666' : '#9ca3af' }}>Estado</th>
              <th style={{ padding: '12px', textAlign: 'left', color: theme === 'light' ? '#666' : '#9ca3af' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {schedules.map((schedule) => (
              <tr key={schedule.id} style={{ borderBottom: `1px solid ${theme === 'light' ? '#eee' : '#374151'}`, background: theme === 'light' ? 'white' : '#111827' }}>
                <td style={{ padding: '12px', color: theme === 'light' ? '#333' : '#ffffff' }}>{getTypeLabel(schedule.type)}</td>
                <td style={{ padding: '12px', color: theme === 'light' ? '#333' : '#ffffff' }}>{getDayLabel(schedule)}</td>
                <td style={{ padding: '12px', color: theme === 'light' ? '#333' : '#ffffff' }}>{String(schedule.hour).padStart(2, '0')}:{String(schedule.minute).padStart(2, '0')}</td>
                <td style={{ padding: '12px', fontSize: '12px', color: theme === 'light' ? '#666' : '#9ca3af' }}>
                  {schedule.recipientEmail || '-'}
                </td>
                <td style={{ padding: '12px', color: theme === 'light' ? '#333' : '#ffffff' }}>
                  {(Array.isArray(schedule.channels) ? schedule.channels : JSON.parse(schedule.channels || '[]')).join(', ')}
                </td>
                <td style={{ padding: '12px' }}>
                  <span style={{
                    padding: '4px 8px',
                    borderRadius: '3px',
                    fontSize: '12px',
                    background: schedule.enabled ? '#d4edda' : '#f8d7da',
                    color: schedule.enabled ? '#155724' : '#721c24'
                  }}>
                    {schedule.enabled ? '✓ Activo' : '✕ Inactivo'}
                  </span>
                </td>
                <td style={{ padding: '12px', display: 'flex', gap: '5px' }}>
                  <button
                    onClick={() => editSchedule(schedule)}
                    style={{
                      padding: '4px 12px',
                      background: '#0050b3',
                      color: 'white',
                      border: 'none',
                      borderRadius: '3px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    ✏️ Editar
                  </button>
                  <button
                    onClick={() => deleteSchedule(schedule.id)}
                    style={{
                      padding: '4px 12px',
                      background: '#dc3545',
                      color: 'white',
                      border: 'none',
                      borderRadius: '3px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    🗑 Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {schedules.length === 0 && !showForm && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
          No hay configuraciones de notificaciones. Crea una nueva.
        </div>
      )}
    </div>
  );
}
