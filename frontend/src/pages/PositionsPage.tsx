import { useState, useEffect } from 'react';
import api from '../services/api';

export default function PositionsPage() {
  const [positions, setPositions] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    departmentId: '',
    salaryMin: '',
    salaryMax: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [posRes, deptRes] = await Promise.all([
        api.client.get('/positions'),
        api.client.get('/departments'),
      ]);
      setPositions(posRes.data.data || []);
      setDepartments(deptRes.data.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      alert('Error al cargar los datos');
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
    
    if (!formData.departmentId) {
      alert('Por favor selecciona un departamento');
      return;
    }

    try {
      await api.client.post('/positions', {
        ...formData,
        salaryMin: parseFloat(formData.salaryMin),
        salaryMax: parseFloat(formData.salaryMax),
      });
      setFormData({
        name: '',
        description: '',
        departmentId: '',
        salaryMin: '',
        salaryMax: '',
      });
      setShowForm(false);
      fetchData();
      alert('Puesto creado exitosamente');
    } catch (error) {
      console.error('Error creating position:', error);
      alert('Error al crear el puesto');
    }
  };

  const deletePosition = async (id: string) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este puesto?')) return;
    try {
      await api.client.delete(`/positions/${id}`);
      fetchData();
      alert('Puesto eliminado exitosamente');
    } catch (error) {
      console.error('Error deleting position:', error);
      alert('Error al eliminar el puesto');
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
          {showForm ? '✕ Cancelar' : '+ Nuevo Puesto'}
        </button>
      </div>

      {showForm && (
        <div style={{
          background: 'white',
          padding: '20px',
          borderRadius: '8px',
          marginBottom: '20px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}>
          <h3 style={{ marginTop: 0 }}>Crear Puesto</h3>
          
          {departments.length === 0 && (
            <div style={{
              background: '#fff3cd',
              border: '1px solid #ffc107',
              color: '#856404',
              padding: '12px',
              borderRadius: '4px',
              marginBottom: '15px',
            }}>
              ⚠️ No hay departamentos registrados. Por favor crea un departamento primero.
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px' }}>
            <input
              type="text"
              name="name"
              placeholder="Nombre del Puesto"
              value={formData.name}
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
              name="departmentId"
              value={formData.departmentId}
              onChange={handleChange}
              required
              style={{
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '5px',
                fontSize: '14px',
              }}
            >
              <option value="">Seleccionar Centro de Costo</option>
              {departments.map((dept: any) => (
                <option key={dept.id} value={dept.id}>{dept.name}</option>
              ))}
            </select>
            <input
              type="number"
              name="salaryMin"
              placeholder="Salario Mínimo"
              value={formData.salaryMin}
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
              type="number"
              name="salaryMax"
              placeholder="Salario Máximo"
              value={formData.salaryMax}
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
              name="description"
              placeholder="Descripción"
              value={formData.description}
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
              disabled={departments.length === 0}
              style={{
                gridColumn: '1 / -1',
                padding: '10px',
                background: departments.length === 0 ? '#ccc' : '#667eea',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: departments.length === 0 ? 'not-allowed' : 'pointer',
                fontSize: '14px',
              }}
            >
              Guardar Puesto
            </button>
          </form>
        </div>
      )}

      <div style={{
        background: 'white',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        overflow: 'hidden',
      }}>
        {loading ? (
          <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
            Cargando Cargos...
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f5f7fa', borderBottom: '2px solid #eee' }}>
                <th style={{ padding: '12px', textAlign: 'left', color: '#666' }}>Nombre</th>
                <th style={{ padding: '12px', textAlign: 'left', color: '#666' }}>Departamento</th>
                <th style={{ padding: '12px', textAlign: 'left', color: '#666' }}>Salario Mín</th>
                <th style={{ padding: '12px', textAlign: 'left', color: '#666' }}>Salario Máx</th>
                <th style={{ padding: '12px', textAlign: 'left', color: '#666' }}>Descripción</th>
                <th style={{ padding: '12px', textAlign: 'left', color: '#666' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {positions.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
                    No hay Cargos registrados
                  </td>
                </tr>
              ) : (
                positions.map((pos: any) => {
                  const dept = departments.find((d: any) => d.id === pos.departmentId);
                  return (
                    <tr key={pos.id} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '12px' }}>{pos.name}</td>
                      <td style={{ padding: '12px' }}>{dept?.name || '-'}</td>
                      <td style={{ padding: '12px' }}>${pos.salaryMin?.toLocaleString()}</td>
                      <td style={{ padding: '12px' }}>${pos.salaryMax?.toLocaleString()}</td>
                      <td style={{ padding: '12px', fontSize: '12px', color: '#666' }}>
                        {pos.description || '-'}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <button
                          onClick={() => deletePosition(pos.id)}
                          style={{
                            padding: '4px 12px',
                            background: '#dc3545',
                            color: 'white',
                            border: 'none',
                            borderRadius: '3px',
                            cursor: 'pointer',
                            fontSize: '12px',
                          }}
                        >
                          🗑 Eliminar
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
