import { useState, useEffect } from 'react';
import api from '../services/api';
import { showSuccess, showError, showConfirm } from '../utils/alertify';

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      const response = await api.client.get('/departments');
      setDepartments(response.data.data || []);
    } catch (error) {
      console.error('Error fetching departments:', error);
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
      if (editingId) {
        await api.client.put(`/departments/${editingId}`, formData);
        showSuccess('Centro de Costo actualizado exitosamente');
      } else {
        await api.client.post('/departments', formData);
        showSuccess('Centro de Costo creado exitosamente');
      }
      setFormData({
        name: '',
        description: '',
      });
      setEditingId(null);
      setShowForm(false);
      fetchDepartments();
    } catch (error) {
      console.error('Error:', error);
      showError(editingId ? 'Error al actualizar el Centro de Costo' : 'Error al crear el Centro de Costo');
    }
  };

  const editDepartment = (dept: any) => {
    setFormData({
      name: dept.name,
      description: dept.description,
    });
    setEditingId(dept.id);
    setShowForm(true);
  };

  const cancelEdit = () => {
    setFormData({
      name: '',
      description: '',
    });
    setEditingId(null);
    setShowForm(false);
  };

  const deleteDepartment = async (id: string) => {
    showConfirm('¿Estás seguro de que deseas eliminar este Centro de Costo?', async () => {
      try {
        await api.client.delete(`/departments/${id}`);
        fetchDepartments();
        showSuccess('Centro de Costo eliminado exitosamente');
      } catch (error) {
        console.error('Error deleting department:', error);
        showError('Error al eliminar el Centro de Costo');
      }
    });
  };

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={() => editingId ? cancelEdit() : setShowForm(!showForm)}
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
          {showForm ? '✗ Cancelar' : '+ Nuevo Centro de Costo'}
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
          <h3 style={{ marginTop: 0 }}>{editingId ? 'Editar Centro de Costo' : 'Crear Centro de Costo'}</h3>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px' }}>
            <input
              type="text"
              name="name"
              placeholder="Nombre del Centro de Costo"
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
              {editingId ? '💾 Actualizar Centro de Costo' : '💾 Guardar Centro de Costo'}
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
            Cargando Centros de Costo...
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f5f7fa', borderBottom: '2px solid #eee' }}>
                <th style={{ padding: '12px', textAlign: 'left', color: '#666' }}>Nombre</th>
                <th style={{ padding: '12px', textAlign: 'left', color: '#666' }}>Descripción</th>
                <th style={{ padding: '12px', textAlign: 'left', color: '#666' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {departments.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
                    No hay Centros de Costo registrados
                  </td>
                </tr>
              ) : (
                departments.map((dept: any) => (
                  <tr key={dept.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '12px' }}>{dept.name}</td>
                    <td style={{ padding: '12px' }}>{dept.description || '-'}</td>
                    <td style={{ padding: '12px', display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => editDepartment(dept)}
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
                        ✏️ Editar
                      </button>
                      <button
                        onClick={() => deleteDepartment(dept.id)}
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
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
