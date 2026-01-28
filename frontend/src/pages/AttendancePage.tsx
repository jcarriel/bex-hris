import { useState, useEffect } from 'react';
import api from '../services/api';
import { useThemeStore } from '../stores/themeStore';

export default function AttendancePage() {
  const { theme } = useThemeStore();
  const [attendances, setAttendances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    employeeId: '',
    date: new Date().toISOString().slice(0, 10),
    checkIn: '',
    checkOut: '',
    status: 'present',
  });

  useEffect(() => {
    fetchAttendances();
  }, [date]);

  const fetchAttendances = async () => {
    try {
      setLoading(true);
      const response = await api.client.get(`/attendance?employeeId=&startDate=${date}&endDate=${date}`);
      setAttendances(response.data.data || []);
    } catch (error) {
      console.error('Error fetching attendances:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: any) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    try {
      await api.client.post('/attendance', formData);
      setFormData({
        employeeId: '',
        date: new Date().toISOString().slice(0, 10),
        checkIn: '',
        checkOut: '',
        status: 'present',
      });
      setShowForm(false);
      fetchAttendances();
    } catch (error) {
      console.error('Error creating attendance:', error);
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'center' }}>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          style={{
            padding: '8px 12px',
            border: '1px solid #ddd',
            borderRadius: '5px',
            fontSize: '14px',
          }}
        />
        <button
          onClick={() => setShowForm(!showForm)}
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
          {showForm ? '✕ Cancelar' : '+ Registrar Asistencia'}
        </button>
      </div>

      {showForm && (
        <div style={{
          background: theme === 'light' ? 'white' : '#1f2937',
          padding: '20px',
          borderRadius: '8px',
          marginBottom: '20px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          border: `1px solid ${theme === 'light' ? '#eee' : '#374151'}`,
        }}>
          <h3 style={{ marginTop: 0 }}>Registrar Asistencia</h3>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px' }}>
            <input
              type="text"
              name="employeeId"
              placeholder="ID Empleado"
              value={formData.employeeId}
              onChange={handleChange}
              required
              style={{
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '5px',
                fontSize: '14px',
              }}
            />
            <input
              type="time"
              name="checkIn"
              value={formData.checkIn}
              onChange={handleChange}
              style={{
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '5px',
                fontSize: '14px',
              }}
            />
            <input
              type="time"
              name="checkOut"
              value={formData.checkOut}
              onChange={handleChange}
              style={{
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '5px',
                fontSize: '14px',
              }}
            />
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              style={{
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '5px',
                fontSize: '14px',
              }}
            >
              <option value="present">Presente</option>
              <option value="absent">Ausente</option>
              <option value="late">Retrasado</option>
              <option value="excused">Justificado</option>
            </select>
            <button
              type="submit"
              style={{
                gridColumn: '1 / -1',
                padding: '10px',
                background: '#667eea',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              Guardar Asistencia
            </button>
          </form>
        </div>
      )}

      <div style={{
        background: theme === 'light' ? 'white' : '#1f2937',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        overflow: 'hidden',
        border: `1px solid ${theme === 'light' ? '#eee' : '#374151'}`,
      }}>
        {loading ? (
          <div style={{ padding: '20px', textAlign: 'center', color: theme === 'light' ? '#999' : '#9ca3af' }}>
            Cargando asistencias...
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: theme === 'light' ? '#f5f7fa' : '#374151', borderBottom: `2px solid ${theme === 'light' ? '#eee' : '#374151'}` }}>
                <th style={{ padding: '12px', textAlign: 'left', color: theme === 'light' ? '#666' : '#9ca3af' }}>Empleado</th>
                <th style={{ padding: '12px', textAlign: 'left', color: theme === 'light' ? '#666' : '#9ca3af' }}>Entrada</th>
                <th style={{ padding: '12px', textAlign: 'left', color: theme === 'light' ? '#666' : '#9ca3af' }}>Salida</th>
                <th style={{ padding: '12px', textAlign: 'left', color: theme === 'light' ? '#666' : '#9ca3af' }}>Horas</th>
                <th style={{ padding: '12px', textAlign: 'left', color: theme === 'light' ? '#666' : '#9ca3af' }}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {attendances.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '20px', textAlign: 'center', color: theme === 'light' ? '#999' : '#9ca3af' }}>
                    No hay registros de asistencia para esta fecha
                  </td>
                </tr>
              ) : (
                attendances.map((att: any) => (
                  <tr key={att.id} style={{ borderBottom: `1px solid ${theme === 'light' ? '#eee' : '#374151'}`, background: theme === 'light' ? 'white' : '#111827', color: theme === 'light' ? '#333' : '#ffffff' }}>
                    <td style={{ padding: '12px', color: theme === 'light' ? '#333' : '#ffffff' }}>{att.employeeId}</td>
                    <td style={{ padding: '12px', color: theme === 'light' ? '#333' : '#ffffff' }}>{att.checkIn || '-'}</td>
                    <td style={{ padding: '12px', color: theme === 'light' ? '#333' : '#ffffff' }}>{att.checkOut || '-'}</td>
                    <td style={{ padding: '12px', color: theme === 'light' ? '#333' : '#ffffff' }}>8h</td>
                    <td style={{ padding: '12px' }}>
                      <span style={{
                        background: att.status === 'present' ? '#d4edda' : '#f8d7da',
                        color: att.status === 'present' ? '#155724' : '#721c24',
                        padding: '4px 8px',
                        borderRadius: '3px',
                        fontSize: '12px',
                      }}>
                        {att.status === 'present' ? 'Presente' : 'Ausente'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
