import { useState, useEffect } from 'react';
import api from '../services/api';
import { showSuccess, showError, showConfirm } from '../utils/alertify';
import { useThemeStore } from '../stores/themeStore';
import NotificationsPage from './NotificationsPage';

export default function AdministrationPage() {
  const { theme } = useThemeStore();
  const [activeTab, setActiveTab] = useState('departments');
  const [departments, setDepartments] = useState([]);
  const [positions, setPositions] = useState([]);
  const [labors, setLabors] = useState([]);
  const [categories, setCategories] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states
  const [deptFormData, setDeptFormData] = useState({ name: '', description: '' });
  const [posFormData, setPosFormData] = useState({ name: '', description: '', departmentId: '', salaryMin: '', salaryMax: '' });
  const [laborFormData, setLaborFormData] = useState({ name: '', description: '', positionId: '' });
  const [catFormData, setCatFormData] = useState({ name: '', description: '' });
  const [taskFormData, setTaskFormData] = useState({ title: '', description: '', dueDate: '', priority: 'medium' });

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const [deptRes, posRes, catRes, tasksRes, empsRes] = await Promise.all([
        api.client.get('/departments'),
        api.client.get('/positions'),
        api.client.get('/document-categories'),
        api.client.get('/tasks'),
        api.client.get('/employees'),
      ]);
      setDepartments(deptRes.data.data || []);
      setPositions(posRes.data.data || []);
      setCategories(catRes.data.data || []);
      setTasks(tasksRes.data.data || []);
      setEmployees(empsRes.data.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      showError('Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  // ===== DEPARTMENTS =====
  const handleDeptSubmit = async (e: any) => {
    e.preventDefault();
    try {
      if (editingId && activeTab === 'departments') {
        await api.client.put(`/departments/${editingId}`, deptFormData);
        showSuccess('Centro de Costo actualizado exitosamente');
      } else {
        await api.client.post('/departments', deptFormData);
        showSuccess('Centro de Costo creado exitosamente');
      }
      setDeptFormData({ name: '', description: '' });
      setEditingId(null);
      setShowForm(false);
      fetchAllData();
    } catch (error) {
      console.error('Error:', error);
      showError(editingId ? 'Error al actualizar el Centro de Costo' : 'Error al crear el Centro de Costo');
    }
  };

  const editDepartment = (dept: any) => {
    setDeptFormData({ name: dept.name, description: dept.description || '' });
    setEditingId(dept.id);
    setActiveTab('departments');
    setShowForm(true);
  };

  const deleteDepartment = async (id: string) => {
    showConfirm('¿Estás seguro de que deseas eliminar este Centro de Costo?', async () => {
      try {
        await api.client.delete(`/departments/${id}`);
        fetchAllData();
        showSuccess('Centro de Costo eliminado exitosamente');
      } catch (error) {
        console.error('Error:', error);
        showError('Error al eliminar el Centro de Costo');
      }
    });
  };

  // ===== POSITIONS =====
  const handlePosSubmit = async (e: any) => {
    e.preventDefault();
    if (!posFormData.departmentId) {
      showError('Por favor selecciona un Centro de Costo');
      return;
    }
    try {
      if (editingId && activeTab === 'positions') {
        await api.client.put(`/positions/${editingId}`, {
          ...posFormData,
          salaryMin: parseFloat(posFormData.salaryMin),
          salaryMax: parseFloat(posFormData.salaryMax),
        });
        showSuccess('Puesto actualizado exitosamente');
      } else {
        await api.client.post('/positions', {
          ...posFormData,
          salaryMin: parseFloat(posFormData.salaryMin),
          salaryMax: parseFloat(posFormData.salaryMax),
        });
        showSuccess('Puesto creado exitosamente');
      }
      setPosFormData({ name: '', description: '', departmentId: '', salaryMin: '', salaryMax: '' });
      setEditingId(null);
      setShowForm(false);
      fetchAllData();
    } catch (error) {
      console.error('Error:', error);
      showError(editingId ? 'Error al actualizar el puesto' : 'Error al crear el puesto');
    }
  };

  const editPosition = (pos: any) => {
    setPosFormData({
      name: pos.name,
      description: pos.description || '',
      departmentId: pos.departmentId,
      salaryMin: pos.salaryMin?.toString() || '',
      salaryMax: pos.salaryMax?.toString() || '',
    });
    setEditingId(pos.id);
    setActiveTab('positions');
    setShowForm(true);
  };

  const deletePosition = async (id: string) => {
    showConfirm('¿Estás seguro de que deseas eliminar este puesto?', async () => {
      try {
        await api.client.delete(`/positions/${id}`);
        fetchAllData();
        showSuccess('Puesto eliminado exitosamente');
      } catch (error) {
        console.error('Error:', error);
        showError('Error al eliminar el puesto');
      }
    });
  };

  // ===== LABORS =====
  const handleLaborSubmit = async (e: any) => {
    e.preventDefault();
    if (!laborFormData.positionId) {
      showError('Por favor selecciona un Cargo');
      return;
    }
    try {
      if (editingId && activeTab === 'labors') {
        await api.client.put(`/labors/${editingId}`, laborFormData);
        showSuccess('Labor actualizada exitosamente');
      } else {
        await api.client.post('/labors', laborFormData);
        showSuccess('Labor creada exitosamente');
      }
      setLaborFormData({ name: '', description: '', positionId: '' });
      setEditingId(null);
      setShowForm(false);
      fetchAllData();
    } catch (error) {
      console.error('Error:', error);
      showError(editingId ? 'Error al actualizar la labor' : 'Error al crear la labor');
    }
  };

  const editLabor = (labor: any) => {
    setLaborFormData({
      name: labor.name,
      description: labor.description || '',
      positionId: labor.positionId,
    });
    setEditingId(labor.id);
    setActiveTab('labors');
    setShowForm(true);
  };

  const deleteLabor = async (id: string) => {
    showConfirm('¿Estás seguro de que deseas eliminar esta labor?', async () => {
      try {
        await api.client.delete(`/labors/${id}`);
        fetchAllData();
        showSuccess('Labor eliminada exitosamente');
      } catch (error) {
        console.error('Error:', error);
        showError('Error al eliminar la labor');
      }
    });
  };

  // ===== CATEGORIES =====
  const handleCatSubmit = async (e: any) => {
    e.preventDefault();
    try {
      if (editingId && activeTab === 'categories') {
        await api.client.put(`/document-categories/${editingId}`, catFormData);
        showSuccess('Categoría actualizada exitosamente');
      } else {
        await api.client.post('/document-categories', catFormData);
        showSuccess('Categoría creada exitosamente');
      }
      setCatFormData({ name: '', description: '' });
      setEditingId(null);
      setShowForm(false);
      fetchAllData();
    } catch (error) {
      console.error('Error:', error);
      showError(editingId ? 'Error al actualizar la categoría' : 'Error al crear la categoría');
    }
  };

  const editCategory = (cat: any) => {
    setCatFormData({ name: cat.name, description: cat.description || '' });
    setEditingId(cat.id);
    setActiveTab('categories');
    setShowForm(true);
  };

  const deleteCategory = async (id: string) => {
    showConfirm('¿Estás seguro de que deseas eliminar esta categoría?', async () => {
      try {
        await api.client.delete(`/document-categories/${id}`);
        fetchAllData();
        showSuccess('Categoría eliminada exitosamente');
      } catch (error) {
        console.error('Error:', error);
        showError('Error al eliminar la categoría');
      }
    });
  };

  // ===== TASKS =====
  const handleTaskSubmit = async (e: any) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.client.put(`/tasks/${editingId}`, taskFormData);
        showSuccess('Tarea actualizada exitosamente');
      } else {
        await api.client.post('/tasks', taskFormData);
        showSuccess('Tarea creada exitosamente');
      }
      fetchAllData();
      setShowForm(false);
      setTaskFormData({ title: '', description: '', dueDate: '', priority: 'medium' });
      setEditingId(null);
    } catch (error) {
      console.error('Error:', error);
      showError('Error al guardar la tarea');
    }
  };

  const editTask = (task: any) => {
    setTaskFormData({
      title: task.title,
      description: task.description || '',
      dueDate: task.dueDate,
      priority: task.priority || 'medium',
    });
    setEditingId(task.id);
    setActiveTab('tasks');
    setShowForm(true);
  };

  const deleteTask = async (id: string) => {
    showConfirm('¿Estás seguro de que deseas eliminar esta tarea?', async () => {
      try {
        await api.client.delete(`/tasks/${id}`);
        fetchAllData();
        showSuccess('Tarea eliminada exitosamente');
      } catch (error) {
        console.error('Error:', error);
        showError('Error al eliminar la tarea');
      }
    });
  };

  const tabs = [
    { id: 'departments', label: 'Centros de Costo', icon: '🏢' },
    { id: 'positions', label: 'Cargos', icon: '💼' },
    { id: 'labors', label: 'Labores', icon: '🎯' },
    { id: 'categories', label: 'Categorías de Documentos', icon: '📁' },
    { id: 'tasks', label: 'Tareas', icon: '📋' },
    { id: 'notifications', label: 'Notificaciones', icon: '🔔' },
  ];

  return (
    <div style={{ padding: '20px', background: theme === 'light' ? 'transparent' : 'transparent' }}>
      {/* Tabs */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: `2px solid ${theme === 'light' ? '#eee' : '#374151'}` }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '10px 20px',
              background: activeTab === tab.id ? '#667eea' : (theme === 'light' ? '#f5f7fa' : '#374151'),
              color: activeTab === tab.id ? 'white' : (theme === 'light' ? '#666' : '#9ca3af'),
              border: 'none',
              borderRadius: '5px 5px 0 0',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: activeTab === tab.id ? 'bold' : 'normal',
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Add Button - Only show for non-notifications tabs */}
      {activeTab !== 'notifications' && (
        <div style={{ marginBottom: '20px' }}>
          <button
            onClick={() => {
              if (editingId) {
                setEditingId(null);
                setDeptFormData({ name: '', description: '' });
                setPosFormData({ name: '', description: '', departmentId: '', salaryMin: '', salaryMax: '' });
                setCatFormData({ name: '', description: '' });
              }
              setShowForm(!showForm);
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
            {showForm ? '✕ Cancelar' : `+ Nuevo ${tabs.find((t) => t.id === activeTab)?.label.split(' ')[0]}`}
          </button>
        </div>
      )}

      {/* Forms */}
      {showForm && (
        <div style={{
          background: theme === 'light' ? 'white' : '#1f2937',
          padding: '20px',
          borderRadius: '8px',
          marginBottom: '20px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          border: `1px solid ${theme === 'light' ? '#eee' : '#374151'}`,
        }}>
          {activeTab === 'departments' && (
            <>
              <h3 style={{ marginTop: 0, color: theme === 'light' ? '#333' : '#e5e7eb' }}>{editingId ? 'Editar Centro de Costo' : 'Crear Centro de Costo'}</h3>
              <form onSubmit={handleDeptSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px' }}>
                <input
                  type="text"
                  placeholder="Nombre del Centro de Costo"
                  value={deptFormData.name}
                  onChange={(e) => setDeptFormData({ ...deptFormData, name: e.target.value })}
                  required
                  style={{ padding: '10px', border: `1px solid ${theme === 'light' ? '#ddd' : '#374151'}`, borderRadius: '5px', fontSize: '14px', background: theme === 'light' ? 'white' : '#374151', color: theme === 'light' ? '#333' : '#e5e7eb' }}
                />
                <textarea
                  placeholder="Descripción"
                  value={deptFormData.description}
                  onChange={(e) => setDeptFormData({ ...deptFormData, description: e.target.value })}
                  style={{ padding: '10px', border: `1px solid ${theme === 'light' ? '#ddd' : '#374151'}`, borderRadius: '5px', fontSize: '14px', gridColumn: '1 / -1', minHeight: '80px', background: theme === 'light' ? 'white' : '#374151', color: theme === 'light' ? '#333' : '#e5e7eb' }}
                />
                <button
                  type="submit"
                  style={{ gridColumn: '1 / -1', padding: '10px', background: '#00A86B', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '14px', fontWeight: '500', transition: 'background 0.2s' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#008C5A')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = '#00A86B')}
                >
                  Guardar Centro de Costo
                </button>
              </form>
            </>
          )}

          {activeTab === 'labors' && (
            <>
              <h3 style={{ marginTop: 0, color: theme === 'light' ? '#333' : '#e5e7eb' }}>{editingId ? 'Editar Labor' : 'Crear Labor'}</h3>
              {positions.length === 0 && (
                <div style={{ background: '#fff3cd', border: '1px solid #ffc107', color: '#856404', padding: '12px', borderRadius: '4px', marginBottom: '15px' }}>
                  ⚠️ No hay Cargos registrados. Por favor crea un Cargo primero.
                </div>
              )}
              <form onSubmit={handleLaborSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px' }}>
                <input
                  type="text"
                  placeholder="Nombre de la Labor"
                  value={laborFormData.name}
                  onChange={(e) => setLaborFormData({ ...laborFormData, name: e.target.value })}
                  required
                  style={{ padding: '10px', border: `1px solid ${theme === 'light' ? '#ddd' : '#374151'}`, borderRadius: '5px', fontSize: '14px', background: theme === 'light' ? 'white' : '#374151', color: theme === 'light' ? '#333' : '#e5e7eb' }}
                />
                <select
                  value={laborFormData.positionId}
                  onChange={(e) => setLaborFormData({ ...laborFormData, positionId: e.target.value })}
                  required
                  style={{ padding: '10px', border: `1px solid ${theme === 'light' ? '#ddd' : '#374151'}`, borderRadius: '5px', fontSize: '14px', background: theme === 'light' ? 'white' : '#374151', color: theme === 'light' ? '#333' : '#e5e7eb' }}
                >
                  <option value="">Seleccionar Cargo</option>
                  {positions.map((pos: any) => (
                    <option key={pos.id} value={pos.id}>{pos.name}</option>
                  ))}
                </select>
                <textarea
                  placeholder="Descripción"
                  value={laborFormData.description}
                  onChange={(e) => setLaborFormData({ ...laborFormData, description: e.target.value })}
                  style={{ padding: '10px', border: `1px solid ${theme === 'light' ? '#ddd' : '#374151'}`, borderRadius: '5px', fontSize: '14px', gridColumn: '1 / -1', minHeight: '80px', background: theme === 'light' ? 'white' : '#374151', color: theme === 'light' ? '#333' : '#e5e7eb' }}
                />
                <button
                  type="submit"
                  style={{ gridColumn: '1 / -1', padding: '10px', background: '#00A86B', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '14px', fontWeight: '500', transition: 'background 0.2s' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#008C5A')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = '#00A86B')}
                >
                  Guardar Labor
                </button>
              </form>
            </>
          )}

          {activeTab === 'positions' && (
            <>
              <h3 style={{ marginTop: 0, color: theme === 'light' ? '#333' : '#e5e7eb' }}>{editingId ? 'Editar Puesto' : 'Crear Puesto'}</h3>
              {departments.length === 0 && (
                <div style={{ background: '#fff3cd', border: '1px solid #ffc107', color: '#856404', padding: '12px', borderRadius: '4px', marginBottom: '15px' }}>
                  ⚠️ No hay Centros de Costo registrados. Por favor crea un Centro de Costo primero.
                </div>
              )}
              <form onSubmit={handlePosSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px' }}>
                <input
                  type="text"
                  placeholder="Nombre del Puesto"
                  value={posFormData.name}
                  onChange={(e) => setPosFormData({ ...posFormData, name: e.target.value })}
                  required
                  style={{ padding: '10px', border: `1px solid ${theme === 'light' ? '#ddd' : '#374151'}`, borderRadius: '5px', fontSize: '14px', background: theme === 'light' ? 'white' : '#374151', color: theme === 'light' ? '#333' : '#e5e7eb' }}
                />
                <select
                  value={posFormData.departmentId}
                  onChange={(e) => setPosFormData({ ...posFormData, departmentId: e.target.value })}
                  required
                  style={{ padding: '10px', border: `1px solid ${theme === 'light' ? '#ddd' : '#374151'}`, borderRadius: '5px', fontSize: '14px', background: theme === 'light' ? 'white' : '#374151', color: theme === 'light' ? '#333' : '#e5e7eb' }}
                >
                  <option value="">Seleccionar Centro de Costo</option>
                  {departments.map((dept: any) => (
                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                  ))}
                </select>
                <input
                  type="number"
                  placeholder="Salario Mínimo"
                  value={posFormData.salaryMin}
                  onChange={(e) => setPosFormData({ ...posFormData, salaryMin: e.target.value })}
                  required
                  style={{ padding: '10px', border: `1px solid ${theme === 'light' ? '#ddd' : '#374151'}`, borderRadius: '5px', fontSize: '14px', background: theme === 'light' ? 'white' : '#374151', color: theme === 'light' ? '#333' : '#e5e7eb' }}
                />
                <input
                  type="number"
                  placeholder="Salario Máximo"
                  value={posFormData.salaryMax}
                  onChange={(e) => setPosFormData({ ...posFormData, salaryMax: e.target.value })}
                  required
                  style={{ padding: '10px', border: `1px solid ${theme === 'light' ? '#ddd' : '#374151'}`, borderRadius: '5px', fontSize: '14px', background: theme === 'light' ? 'white' : '#374151', color: theme === 'light' ? '#333' : '#e5e7eb' }}
                />
                <textarea
                  placeholder="Descripción"
                  value={posFormData.description}
                  onChange={(e) => setPosFormData({ ...posFormData, description: e.target.value })}
                  style={{ padding: '10px', border: `1px solid ${theme === 'light' ? '#ddd' : '#374151'}`, borderRadius: '5px', fontSize: '14px', gridColumn: '1 / -1', minHeight: '80px', background: theme === 'light' ? 'white' : '#374151', color: theme === 'light' ? '#333' : '#e5e7eb' }}
                />
                <button
                  type="submit"
                  disabled={departments.length === 0}
                  style={{ gridColumn: '1 / -1', padding: '10px', background: departments.length === 0 ? '#ccc' : '#667eea', color: 'white', border: 'none', borderRadius: '5px', cursor: departments.length === 0 ? 'not-allowed' : 'pointer', fontSize: '14px' }}
                >
                  Guardar Puesto
                </button>
              </form>
            </>
          )}

          {activeTab === 'categories' && (
            <>
              <h3 style={{ marginTop: 0, color: theme === 'light' ? '#333' : '#e5e7eb' }}>{editingId ? 'Editar Categoría de Documento' : 'Crear Categoría de Documento'}</h3>
              <form onSubmit={handleCatSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px' }}>
                <input
                  type="text"
                  placeholder="Nombre de la Categoría"
                  value={catFormData.name}
                  onChange={(e) => setCatFormData({ ...catFormData, name: e.target.value })}
                  required
                  style={{ padding: '10px', border: `1px solid ${theme === 'light' ? '#ddd' : '#374151'}`, borderRadius: '5px', fontSize: '14px', background: theme === 'light' ? 'white' : '#374151', color: theme === 'light' ? '#333' : '#e5e7eb' }}
                />
                <textarea
                  placeholder="Descripción"
                  value={catFormData.description}
                  onChange={(e) => setCatFormData({ ...catFormData, description: e.target.value })}
                  style={{ padding: '10px', border: `1px solid ${theme === 'light' ? '#ddd' : '#374151'}`, borderRadius: '5px', fontSize: '14px', gridColumn: '1 / -1', minHeight: '80px', background: theme === 'light' ? 'white' : '#374151', color: theme === 'light' ? '#333' : '#e5e7eb' }}
                />
                <button
                  type="submit"
                  style={{ gridColumn: '1 / -1', padding: '10px', background: '#00A86B', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '14px', fontWeight: '500', transition: 'background 0.2s' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#008C5A')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = '#00A86B')}
                >
                  Guardar Categoría
                </button>
              </form>
            </>
          )}
        </div>
      )}

      {/* Tables */}
      <div style={{ background: theme === 'light' ? 'white' : '#1f2937', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', overflow: 'hidden', border: `1px solid ${theme === 'light' ? '#eee' : '#374151'}` }}>
        {loading ? (
          <div style={{ padding: '20px', textAlign: 'center', color: theme === 'light' ? '#999' : '#9ca3af' }}>Cargando datos...</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: theme === 'light' ? '#f5f7fa' : '#374151', borderBottom: `2px solid ${theme === 'light' ? '#eee' : '#374151'}` }}>
                {activeTab === 'departments' && (
                  <>
                    <th style={{ padding: '12px', textAlign: 'left', color: theme === 'light' ? '#666' : '#9ca3af' }}>Nombre</th>
                    <th style={{ padding: '12px', textAlign: 'left', color: theme === 'light' ? '#666' : '#9ca3af' }}>Descripción</th>
                    <th style={{ padding: '12px', textAlign: 'left', color: theme === 'light' ? '#666' : '#9ca3af' }}>Acciones</th>
                  </>
                )}
                {activeTab === 'labors' && (
                  <>
                    <th style={{ padding: '12px', textAlign: 'left', color: theme === 'light' ? '#666' : '#9ca3af' }}>Nombre</th>
                    <th style={{ padding: '12px', textAlign: 'left', color: theme === 'light' ? '#666' : '#9ca3af' }}>Cargo</th>
                    <th style={{ padding: '12px', textAlign: 'left', color: theme === 'light' ? '#666' : '#9ca3af' }}>Descripción</th>
                    <th style={{ padding: '12px', textAlign: 'left', color: theme === 'light' ? '#666' : '#9ca3af' }}>Acciones</th>
                  </>
                )}
                {activeTab === 'positions' && (
                  <>
                    <th style={{ padding: '12px', textAlign: 'left', color: theme === 'light' ? '#666' : '#9ca3af' }}>Nombre</th>
                    <th style={{ padding: '12px', textAlign: 'left', color: theme === 'light' ? '#666' : '#9ca3af' }}>Centro de Costo</th>
                    <th style={{ padding: '12px', textAlign: 'left', color: theme === 'light' ? '#666' : '#9ca3af' }}>Salario Mín</th>
                    <th style={{ padding: '12px', textAlign: 'left', color: theme === 'light' ? '#666' : '#9ca3af' }}>Salario Máx</th>
                    <th style={{ padding: '12px', textAlign: 'left', color: theme === 'light' ? '#666' : '#9ca3af' }}>Descripción</th>
                    <th style={{ padding: '12px', textAlign: 'left', color: theme === 'light' ? '#666' : '#9ca3af' }}>Acciones</th>
                  </>
                )}
                {activeTab === 'categories' && (
                  <>
                    <th style={{ padding: '12px', textAlign: 'left', color: theme === 'light' ? '#666' : '#9ca3af' }}>Nombre</th>
                    <th style={{ padding: '12px', textAlign: 'left', color: theme === 'light' ? '#666' : '#9ca3af' }}>Descripción</th>
                    <th style={{ padding: '12px', textAlign: 'left', color: theme === 'light' ? '#666' : '#9ca3af' }}>Acciones</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {activeTab === 'departments' && (
                <>
                  {departments.length === 0 ? (
                    <tr>
                      <td colSpan={3} style={{ padding: '20px', textAlign: 'center', color: theme === 'light' ? '#999' : '#9ca3af' }}>
                        No hay Centros de Costo registrados
                      </td>
                    </tr>
                  ) : (
                    departments.map((dept: any) => (
                      <tr key={dept.id} style={{ borderBottom: `1px solid ${theme === 'light' ? '#eee' : '#374151'}`, background: theme === 'light' ? 'white' : '#111827', color: theme === 'light' ? '#333' : '#e5e7eb' }}>
                        <td style={{ padding: '12px', color: theme === 'light' ? '#333' : '#ffffff' }}>{dept.name}</td>
                        <td style={{ padding: '12px', color: theme === 'light' ? '#333' : '#ffffff' }}>{dept.description || '-'}</td>
                        <td style={{ padding: '12px', display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => editDepartment(dept)}
                            style={{ padding: '4px 12px', background: '#00A86B', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '12px', transition: 'background 0.2s' }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = '#008C5A')}
                            onMouseLeave={(e) => (e.currentTarget.style.background = '#00A86B')}
                          >
                            ✏️ Editar
                          </button>
                          <button
                            onClick={() => deleteDepartment(dept.id)}
                            style={{ padding: '4px 12px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '12px' }}
                          >
                            🗑 Eliminar
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </>
              )}

              {activeTab === 'labors' && (
                <>
                  {labors.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ padding: '20px', textAlign: 'center', color: theme === 'light' ? '#999' : '#9ca3af' }}>
                        No hay labores registradas
                      </td>
                    </tr>
                  ) : (
                    labors.map((labor: any) => {
                      const pos = positions.find((p: any) => p.id === labor.positionId);
                      return (
                        <tr key={labor.id} style={{ borderBottom: `1px solid ${theme === 'light' ? '#eee' : '#374151'}`, background: theme === 'light' ? 'white' : '#111827' }}>
                          <td style={{ padding: '12px', color: theme === 'light' ? '#333' : '#ffffff' }}>{labor.name}</td>
                          <td style={{ padding: '12px', color: theme === 'light' ? '#333' : '#ffffff' }}>{pos?.name || '-'}</td>
                          <td style={{ padding: '12px', fontSize: '12px', color: theme === 'light' ? '#666' : '#9ca3af' }}>{labor.description || '-'}</td>
                          <td style={{ padding: '12px', display: 'flex', gap: '8px' }}>
                            <button
                              onClick={() => editLabor(labor)}
                              style={{ padding: '4px 12px', background: '#00A86B', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '12px', transition: 'background 0.2s' }}
                              onMouseEnter={(e) => (e.currentTarget.style.background = '#008C5A')}
                              onMouseLeave={(e) => (e.currentTarget.style.background = '#00A86B')}
                            >
                              ✏️ Editar
                            </button>
                            <button
                              onClick={() => deleteLabor(labor.id)}
                              style={{ padding: '4px 12px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '12px' }}
                            >
                              🗑 Eliminar
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </>
              )}

              {activeTab === 'positions' && (
                <>
                  {positions.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: '20px', textAlign: 'center', color: theme === 'light' ? '#999' : '#9ca3af' }}>
                        No hay Cargos registrados
                      </td>
                    </tr>
                  ) : (
                    positions.map((pos: any) => {
                      const dept = departments.find((d: any) => d.id === pos.departmentId);
                      return (
                        <tr key={pos.id} style={{ borderBottom: `1px solid ${theme === 'light' ? '#eee' : '#374151'}`, background: theme === 'light' ? 'white' : '#111827' }}>
                          <td style={{ padding: '12px', color: theme === 'light' ? '#333' : '#ffffff' }}>{pos.name}</td>
                          <td style={{ padding: '12px', color: theme === 'light' ? '#333' : '#ffffff' }}>{dept?.name || '-'}</td>
                          <td style={{ padding: '12px', color: theme === 'light' ? '#333' : '#ffffff' }}>${pos.salaryMin?.toLocaleString()}</td>
                          <td style={{ padding: '12px', color: theme === 'light' ? '#333' : '#ffffff' }}>${pos.salaryMax?.toLocaleString()}</td>
                          <td style={{ padding: '12px', fontSize: '12px', color: theme === 'light' ? '#666' : '#9ca3af' }}>{pos.description || '-'}</td>
                          <td style={{ padding: '12px', display: 'flex', gap: '8px' }}>
                            <button
                              onClick={() => editPosition(pos)}
                              style={{ padding: '4px 12px', background: '#00A86B', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '12px', transition: 'background 0.2s' }}
                              onMouseEnter={(e) => (e.currentTarget.style.background = '#008C5A')}
                              onMouseLeave={(e) => (e.currentTarget.style.background = '#00A86B')}
                            >
                              ✏️ Editar
                            </button>
                            <button
                              onClick={() => deletePosition(pos.id)}
                              style={{ padding: '4px 12px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '12px' }}
                            >
                              🗑 Eliminar
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </>
              )}

              {activeTab === 'categories' && (
                <>
                  {categories.length === 0 ? (
                    <tr>
                      <td colSpan={3} style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
                        No hay categorías registradas
                      </td>
                    </tr>
                  ) : (
                    categories.map((cat: any) => (
                      <tr key={cat.id} style={{ borderBottom: `1px solid ${theme === 'light' ? '#eee' : '#374151'}`, background: theme === 'light' ? 'white' : '#111827' }}>
                        <td style={{ padding: '12px', color: theme === 'light' ? '#333' : '#ffffff' }}>{cat.name}</td>
                        <td style={{ padding: '12px', color: theme === 'light' ? '#333' : '#ffffff' }}>{cat.description || '-'}</td>
                        <td style={{ padding: '12px', display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => editCategory(cat)}
                            style={{ padding: '4px 12px', background: '#00A86B', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '12px', transition: 'background 0.2s' }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = '#008C5A')}
                            onMouseLeave={(e) => (e.currentTarget.style.background = '#00A86B')}
                          >
                            ✏️ Editar
                          </button>
                          <button
                            onClick={() => deleteCategory(cat.id)}
                            style={{ padding: '4px 12px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '12px' }}
                          >
                            🗑 Eliminar
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </>
              )}
            </tbody>
          </table>
        )}

        {/* TASKS */}
        {activeTab === 'tasks' && (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: theme === 'light' ? '#f5f7fa' : '#374151', borderBottom: `2px solid ${theme === 'light' ? '#eee' : '#374151'}` }}>
                <th style={{ padding: '12px', textAlign: 'left', color: theme === 'light' ? '#666' : '#9ca3af' }}>Título</th>
                <th style={{ padding: '12px', textAlign: 'left', color: theme === 'light' ? '#666' : '#9ca3af' }}>Descripción</th>
                <th style={{ padding: '12px', textAlign: 'left', color: theme === 'light' ? '#666' : '#9ca3af' }}>Fecha Vencimiento</th>
                <th style={{ padding: '12px', textAlign: 'left', color: theme === 'light' ? '#666' : '#9ca3af' }}>Prioridad</th>
                <th style={{ padding: '12px', textAlign: 'left', color: theme === 'light' ? '#666' : '#9ca3af' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {showForm && activeTab === 'tasks' && (
                <>
                  <tr style={{ background: '#f9f9f9', borderBottom: '1px solid #eee' }}>
                    <td colSpan={5} style={{ padding: '15px' }}>
                      <form onSubmit={handleTaskSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <input
                          type="text"
                          placeholder="Título"
                          value={taskFormData.title}
                          onChange={(e) => setTaskFormData({ ...taskFormData, title: e.target.value })}
                          style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                          required
                        />
                        <input
                          type="datetime-local"
                          value={taskFormData.dueDate}
                          onChange={(e) => setTaskFormData({ ...taskFormData, dueDate: e.target.value })}
                          style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                          required
                        />
                        <textarea
                          placeholder="Descripción"
                          value={taskFormData.description}
                          onChange={(e) => setTaskFormData({ ...taskFormData, description: e.target.value })}
                          style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '4px', gridColumn: '1 / -1' }}
                          rows={3}
                        />
                        <select
                          value={taskFormData.priority}
                          onChange={(e) => setTaskFormData({ ...taskFormData, priority: e.target.value })}
                          style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '4px', gridColumn: '1 / -1' }}
                        >
                          <option value="low">Baja</option>
                          <option value="medium">Media</option>
                          <option value="high">Alta</option>
                        </select>
                        <button type="submit" style={{ padding: '8px 16px', background: '#00A86B', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', gridColumn: '1 / -1', fontWeight: '500', transition: 'background 0.2s' }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = '#008C5A')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = '#00A86B')}
                        >
                          {editingId ? '✏️ Actualizar' : '✚ Crear'}
                        </button>
                      </form>
                    </td>
                  </tr>
                </>
              )}
              {tasks.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
                    No hay tareas registradas
                  </td>
                </tr>
              ) : (
                <>
                  {tasks.map((task: any) => (
                    <tr key={task.id} style={{ borderBottom: `1px solid ${theme === 'light' ? '#eee' : '#374151'}`, background: theme === 'light' ? 'white' : '#111827' }}>
                      <td style={{ padding: '12px', color: theme === 'light' ? '#333' : '#ffffff' }}>{task.title}</td>
                      <td style={{ padding: '12px', fontSize: '13px', color: theme === 'light' ? '#666' : '#9ca3af' }}>{task.description || '-'}</td>
                      <td style={{ padding: '12px', fontSize: '13px', color: theme === 'light' ? '#333' : '#ffffff' }}>{new Date(task.dueDate).toLocaleDateString()}</td>
                      <td style={{ padding: '12px' }}>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '3px',
                          fontSize: '12px',
                          background: task.priority === 'high' ? '#ffebee' : task.priority === 'medium' ? '#fff3e0' : '#e8f5e9',
                          color: task.priority === 'high' ? '#c62828' : task.priority === 'medium' ? '#e65100' : '#2e7d32',
                        }}>
                          {task.priority === 'high' ? '🔴 Alta' : task.priority === 'medium' ? '🟡 Media' : '🟢 Baja'}
                        </span>
                      </td>
                      <td style={{ padding: '12px', display: 'flex', gap: '5px' }}>
                        <button
                          onClick={() => editTask(task)}
                          style={{ padding: '4px 12px', background: '#0050b3', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '12px' }}
                        >
                          ✏️ Editar
                        </button>
                        <button
                          onClick={() => deleteTask(task.id)}
                          style={{ padding: '4px 12px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '12px' }}
                        >
                          🗑 Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                </>
              )}
            </tbody>
          </table>
        )}

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <NotificationsPage />
        )}
      </div>
    </div>
  );
}
