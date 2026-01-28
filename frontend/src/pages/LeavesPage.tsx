import { useState, useEffect } from 'react';
import api from '../services/api';
import { useThemeStore } from '../stores/themeStore';

export default function LeavesPage() {
  const { theme } = useThemeStore();
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    employeeId: '',
    type: 'vacation',
    startDate: '',
    endDate: '',
    reason: '',
  });

  useEffect(() => {
    fetchLeaves();
  }, []);

  const fetchLeaves = async () => {
    try {
      setLoading(true);
      const response = await api.client.get('/leaves/pending');
      setLeaves(response.data.data || []);
    } catch (error) {
      console.error('Error fetching leaves:', error);
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
      const startDate = new Date(formData.startDate);
      const endDate = new Date(formData.endDate);
      const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      await api.client.post('/leaves', {
        ...formData,
        days,
        status: 'pending',
      });

      setFormData({
        employeeId: '',
        type: 'vacation',
        startDate: '',
        endDate: '',
        reason: '',
      });
      setShowForm(false);
      fetchLeaves();
    } catch (error) {
      console.error('Error creating leave:', error);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await api.client.post(`/leaves/${id}/approve`, {});
      fetchLeaves();
    } catch (error) {
      console.error('Error approving leave:', error);
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ marginBottom: '20px' }}>
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
          {showForm ? '✕ Cancelar' : '+ Solicitar Licencia'}
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
          <h3 style={{ marginTop: 0 }}>Solicitar Licencia</h3>
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
            <select
              name="type"
              value={formData.type}
              onChange={handleChange}
              style={{
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '5px',
                fontSize: '14px',
              }}
            >
              <option value="vacation">Vacaciones</option>
              <option value="sick">Enfermedad</option>
              <option value="personal">Personal</option>
              <option value="unpaid">Sin Pago</option>
            </select>
            <input
              type="date"
              name="startDate"
              value={formData.startDate}
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
              type="date"
              name="endDate"
              value={formData.endDate}
              onChange={handleChange}
              required
              style={{
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '5px',
                fontSize: '14px',
              }}
            />
            <textarea
              name="reason"
              placeholder="Motivo"
              value={formData.reason}
              onChange={handleChange}
              style={{
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '5px',
                fontSize: '14px',
                gridColumn: '1 / -1',
                minHeight: '80px',
              }}
            />
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
              Solicitar Licencia
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
            Cargando licencias...
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: theme === 'light' ? '#f5f7fa' : '#374151', borderBottom: `2px solid ${theme === 'light' ? '#eee' : '#374151'}` }}>
                <th style={{ padding: '12px', textAlign: 'left', color: theme === 'light' ? '#666' : '#9ca3af' }}>Empleado</th>
                <th style={{ padding: '12px', textAlign: 'left', color: theme === 'light' ? '#666' : '#9ca3af' }}>Tipo</th>
                <th style={{ padding: '12px', textAlign: 'left', color: theme === 'light' ? '#666' : '#9ca3af' }}>Desde</th>
                <th style={{ padding: '12px', textAlign: 'left', color: theme === 'light' ? '#666' : '#9ca3af' }}>Hasta</th>
                <th style={{ padding: '12px', textAlign: 'left', color: theme === 'light' ? '#666' : '#9ca3af' }}>Días</th>
                <th style={{ padding: '12px', textAlign: 'left', color: theme === 'light' ? '#666' : '#9ca3af' }}>Estado</th>
                <th style={{ padding: '12px', textAlign: 'left', color: theme === 'light' ? '#666' : '#9ca3af' }}>Acción</th>
              </tr>
            </thead>
            <tbody>
              {leaves.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '20px', textAlign: 'center', color: theme === 'light' ? '#999' : '#9ca3af' }}>
                    No hay licencias pendientes
                  </td>
                </tr>
              ) : (
                leaves.map((leave: any) => (
                  <tr key={leave.id} style={{ borderBottom: `1px solid ${theme === 'light' ? '#eee' : '#374151'}`, background: theme === 'light' ? 'white' : '#111827', color: theme === 'light' ? '#333' : '#ffffff' }}>
                    <td style={{ padding: '12px', color: theme === 'light' ? '#333' : '#ffffff' }}>{leave.employeeId}</td>
                    <td style={{ padding: '12px', color: theme === 'light' ? '#333' : '#ffffff' }}>
                      {leave.type === 'vacation' ? 'Vacaciones' : leave.type === 'sick' ? 'Enfermedad' : 'Personal'}
                    </td>
                    <td style={{ padding: '12px' }}>{leave.startDate}</td>
                    <td style={{ padding: '12px' }}>{leave.endDate}</td>
                    <td style={{ padding: '12px' }}>{leave.days}</td>
                    <td style={{ padding: '12px' }}>
                      <span style={{
                        background: leave.status === 'pending' ? '#fff3cd' : '#d4edda',
                        color: leave.status === 'pending' ? '#856404' : '#155724',
                        padding: '4px 8px',
                        borderRadius: '3px',
                        fontSize: '12px',
                      }}>
                        {leave.status === 'pending' ? 'Pendiente' : 'Aprobado'}
                      </span>
                    </td>
                    <td style={{ padding: '12px' }}>
                      {leave.status === 'pending' && (
                        <button
                          onClick={() => handleApprove(leave.id)}
                          style={{
                            padding: '4px 12px',
                            background: '#28a745',
                            color: 'white',
                            border: 'none',
                            borderRadius: '3px',
                            cursor: 'pointer',
                            fontSize: '12px',
                          }}
                        >
                          Aprobar
                        </button>
                      )}
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
