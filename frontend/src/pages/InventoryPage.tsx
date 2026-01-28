import { useState, useEffect } from 'react';
import api from '../services/api';
import { showSuccess, showError, showConfirm } from '../utils/alertify';
import { useThemeStore } from '../stores/themeStore';

export default function InventoryPage() {
  const { theme } = useThemeStore();
  const [activeTab, setActiveTab] = useState('types');
  const [inventoryTypes, setInventoryTypes] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states
  const [typeFormData, setTypeFormData] = useState({ name: '', description: '' });
  const [itemFormData, setItemFormData] = useState({ name: '', description: '', typeId: '', quantity: '', minQuantity: '', maxQuantity: '', unit: '', location: '' });

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const [typesRes, itemsRes] = await Promise.all([
        api.client.get('/inventory-types'),
        api.client.get('/inventory'),
      ]);
      setInventoryTypes(typesRes.data.data || []);
      setInventoryItems(itemsRes.data.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      showError('Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  // ===== INVENTORY TYPES =====
  const handleTypeSubmit = async (e: any) => {
    e.preventDefault();
    try {
      if (editingId && activeTab === 'types') {
        await api.client.put(`/inventory-types/${editingId}`, typeFormData);
        showSuccess('Tipo de inventario actualizado exitosamente');
      } else {
        await api.client.post('/inventory-types', typeFormData);
        showSuccess('Tipo de inventario creado exitosamente');
      }
      setTypeFormData({ name: '', description: '' });
      setEditingId(null);
      setShowForm(false);
      fetchAllData();
    } catch (error) {
      console.error('Error:', error);
      showError(editingId ? 'Error al actualizar el tipo' : 'Error al crear el tipo');
    }
  };

  const editType = (type: any) => {
    setTypeFormData({ name: type.name, description: type.description });
    setEditingId(type.id);
    setActiveTab('types');
    setShowForm(true);
  };

  const deleteType = async (id: string) => {
    showConfirm('¿Estás seguro de que deseas eliminar este tipo?', async () => {
      try {
        await api.client.delete(`/inventory-types/${id}`);
        fetchAllData();
        showSuccess('Tipo de inventario eliminado exitosamente');
      } catch (error) {
        console.error('Error:', error);
        showError('Error al eliminar el tipo');
      }
    });
  };

  // ===== INVENTORY ITEMS =====
  const handleItemSubmit = async (e: any) => {
    e.preventDefault();
    try {
      if (editingId && activeTab === 'items') {
        await api.client.put(`/inventory/${editingId}`, {
          ...itemFormData,
          quantity: parseInt(itemFormData.quantity),
          minQuantity: parseInt(itemFormData.minQuantity),
          maxQuantity: itemFormData.maxQuantity ? parseInt(itemFormData.maxQuantity) : null,
        });
        showSuccess('Artículo actualizado exitosamente');
      } else {
        await api.client.post('/inventory', {
          ...itemFormData,
          quantity: parseInt(itemFormData.quantity),
          minQuantity: parseInt(itemFormData.minQuantity),
          maxQuantity: itemFormData.maxQuantity ? parseInt(itemFormData.maxQuantity) : null,
        });
        showSuccess('Artículo creado exitosamente');
      }
      setItemFormData({ name: '', description: '', typeId: '', quantity: '', minQuantity: '', maxQuantity: '', unit: '', location: '' });
      setEditingId(null);
      setShowForm(false);
      fetchAllData();
    } catch (error) {
      console.error('Error:', error);
      showError(editingId ? 'Error al actualizar el artículo' : 'Error al crear el artículo');
    }
  };

  const editItem = (item: any) => {
    setItemFormData({
      name: item.name,
      description: item.description,
      typeId: item.typeId,
      quantity: item.quantity.toString(),
      minQuantity: item.minQuantity.toString(),
      maxQuantity: item.maxQuantity?.toString() || '',
      unit: item.unit || '',
      location: item.location || '',
    });
    setEditingId(item.id);
    setActiveTab('items');
    setShowForm(true);
  };

  const deleteItem = async (id: string) => {
    showConfirm('¿Estás seguro de que deseas eliminar este artículo?', async () => {
      try {
        await api.client.delete(`/inventory/${id}`);
        fetchAllData();
        showSuccess('Artículo eliminado exitosamente');
      } catch (error) {
        console.error('Error:', error);
        showError('Error al eliminar el artículo');
      }
    });
  };

  const cancelEdit = () => {
    setTypeFormData({ name: '', description: '' });
    setItemFormData({ name: '', description: '', typeId: '', quantity: '', minQuantity: '', maxQuantity: '', unit: '', location: '' });
    setEditingId(null);
    setShowForm(false);
  };

  const tabs = [
    { id: 'items', label: 'Artículos', icon: '📦' },
    { id: 'types', label: 'Tipos de Inventario', icon: '📂' },
  ];

  if (loading) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Cargando...</div>;
  }

  return (
    <div style={{ padding: '20px' }}>
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

      {/* Add Button */}
      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={() => {
            if (editingId) {
              cancelEdit();
            }
            setShowForm(!showForm);
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
          {showForm ? '✕ Cancelar' : `+ Nuevo ${activeTab === 'types' ? 'Tipo' : 'Artículo'}`}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div style={{
          background: theme === 'light' ? 'white' : '#1f2937',
          padding: '20px',
          borderRadius: '8px',
          marginBottom: '20px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          border: `1px solid ${theme === 'light' ? '#eee' : '#374151'}`,
        }}>
          {activeTab === 'types' && (
            <>
              <h3 style={{ marginTop: 0, color: theme === 'light' ? '#333' : '#ffffff' }}>{editingId ? 'Editar Tipo' : 'Crear Tipo de Inventario'}</h3>
              <form onSubmit={handleTypeSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px' }}>
                <input
                  type="text"
                  placeholder="Nombre del Tipo"
                  value={typeFormData.name}
                  onChange={(e) => setTypeFormData({ ...typeFormData, name: e.target.value })}
                  required
                  style={{ padding: '10px', border: `1px solid ${theme === 'light' ? '#ddd' : '#374151'}`, borderRadius: '5px', fontSize: '14px', background: theme === 'light' ? 'white' : '#374151', color: theme === 'light' ? '#333' : '#ffffff' }}
                />
                <textarea
                  placeholder="Descripción"
                  value={typeFormData.description}
                  onChange={(e) => setTypeFormData({ ...typeFormData, description: e.target.value })}
                  style={{ padding: '10px', border: `1px solid ${theme === 'light' ? '#ddd' : '#374151'}`, borderRadius: '5px', fontSize: '14px', gridColumn: '1 / -1', minHeight: '80px', background: theme === 'light' ? 'white' : '#374151', color: theme === 'light' ? '#333' : '#ffffff' }}
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
                  {editingId ? '💾 Actualizar Tipo' : '💾 Guardar Tipo'}
                </button>
              </form>
            </>
          )}

          {activeTab === 'items' && (
            <>
              <h3 style={{ marginTop: 0, color: theme === 'light' ? '#333' : '#ffffff' }}>{editingId ? 'Editar Artículo' : 'Crear Artículo de Inventario'}</h3>
              <form onSubmit={handleItemSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px' }}>
                <input
                  type="text"
                  placeholder="Nombre del Artículo"
                  value={itemFormData.name}
                  onChange={(e) => setItemFormData({ ...itemFormData, name: e.target.value })}
                  required
                  style={{ padding: '10px', border: `1px solid ${theme === 'light' ? '#ddd' : '#374151'}`, borderRadius: '5px', fontSize: '14px', background: theme === 'light' ? 'white' : '#374151', color: theme === 'light' ? '#333' : '#ffffff' }}
                />
                <select
                  value={itemFormData.typeId}
                  onChange={(e) => setItemFormData({ ...itemFormData, typeId: e.target.value })}
                  required
                  style={{ padding: '10px', border: `1px solid ${theme === 'light' ? '#ddd' : '#374151'}`, borderRadius: '5px', fontSize: '14px', background: theme === 'light' ? 'white' : '#374151', color: theme === 'light' ? '#333' : '#ffffff' }}
                >
                  <option value="">Seleccionar Tipo</option>
                  {inventoryTypes.map((type: any) => (
                    <option key={type.id} value={type.id}>{type.name}</option>
                  ))}
                </select>
                <input
                  type="number"
                  placeholder="Cantidad"
                  value={itemFormData.quantity}
                  onChange={(e) => setItemFormData({ ...itemFormData, quantity: e.target.value })}
                  required
                  style={{ padding: '10px', border: `1px solid ${theme === 'light' ? '#ddd' : '#374151'}`, borderRadius: '5px', fontSize: '14px', background: theme === 'light' ? 'white' : '#374151', color: theme === 'light' ? '#333' : '#ffffff' }}
                />
                <input
                  type="number"
                  placeholder="Cantidad Mínima"
                  value={itemFormData.minQuantity}
                  onChange={(e) => setItemFormData({ ...itemFormData, minQuantity: e.target.value })}
                  style={{ padding: '10px', border: `1px solid ${theme === 'light' ? '#ddd' : '#374151'}`, borderRadius: '5px', fontSize: '14px', background: theme === 'light' ? 'white' : '#374151', color: theme === 'light' ? '#333' : '#ffffff' }}
                />
                <input
                  type="number"
                  placeholder="Cantidad Máxima"
                  value={itemFormData.maxQuantity}
                  onChange={(e) => setItemFormData({ ...itemFormData, maxQuantity: e.target.value })}
                  style={{ padding: '10px', border: `1px solid ${theme === 'light' ? '#ddd' : '#374151'}`, borderRadius: '5px', fontSize: '14px', background: theme === 'light' ? 'white' : '#374151', color: theme === 'light' ? '#333' : '#ffffff' }}
                />
                <input
                  type="text"
                  placeholder="Unidad (ej: pcs, kg, m)"
                  value={itemFormData.unit}
                  onChange={(e) => setItemFormData({ ...itemFormData, unit: e.target.value })}
                  style={{ padding: '10px', border: `1px solid ${theme === 'light' ? '#ddd' : '#374151'}`, borderRadius: '5px', fontSize: '14px', background: theme === 'light' ? 'white' : '#374151', color: theme === 'light' ? '#333' : '#ffffff' }}
                />
                <input
                  type="text"
                  placeholder="Ubicación"
                  value={itemFormData.location}
                  onChange={(e) => setItemFormData({ ...itemFormData, location: e.target.value })}
                  style={{ padding: '10px', border: `1px solid ${theme === 'light' ? '#ddd' : '#374151'}`, borderRadius: '5px', fontSize: '14px', background: theme === 'light' ? 'white' : '#374151', color: theme === 'light' ? '#333' : '#ffffff' }}
                />
                <textarea
                  placeholder="Descripción"
                  value={itemFormData.description}
                  onChange={(e) => setItemFormData({ ...itemFormData, description: e.target.value })}
                  style={{ padding: '10px', border: `1px solid ${theme === 'light' ? '#ddd' : '#374151'}`, borderRadius: '5px', fontSize: '14px', gridColumn: '1 / -1', minHeight: '80px', background: theme === 'light' ? 'white' : '#374151', color: theme === 'light' ? '#333' : '#ffffff' }}
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
                  {editingId ? '💾 Actualizar Artículo' : '💾 Guardar Artículo'}
                </button>
              </form>
            </>
          )}
        </div>
      )}

      {/* Tables */}
      <div style={{
        background: theme === 'light' ? 'white' : '#1f2937',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        overflow: 'hidden',
        border: `1px solid ${theme === 'light' ? '#eee' : '#374151'}`,
      }}>
        {activeTab === 'types' && (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: theme === 'light' ? '#f5f7fa' : '#374151', borderBottom: `2px solid ${theme === 'light' ? '#ddd' : '#374151'}` }}>
                <th style={{ padding: '12px', textAlign: 'left', color: theme === 'light' ? '#666' : '#9ca3af' }}>Nombre</th>
                <th style={{ padding: '12px', textAlign: 'left', color: theme === 'light' ? '#666' : '#9ca3af' }}>Descripción</th>
                <th style={{ padding: '12px', textAlign: 'left', color: theme === 'light' ? '#666' : '#9ca3af' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {inventoryTypes.length === 0 ? (
                <tr>
                  <td colSpan={3} style={{ padding: '20px', textAlign: 'center', color: theme === 'light' ? '#999' : '#9ca3af' }}>
                    No hay tipos de inventario registrados
                  </td>
                </tr>
              ) : (
                inventoryTypes.map((type: any) => (
                  <tr key={type.id} style={{ borderBottom: `1px solid ${theme === 'light' ? '#eee' : '#374151'}`, background: theme === 'light' ? 'white' : '#111827', color: theme === 'light' ? '#333' : '#ffffff' }}>
                    <td style={{ padding: '12px', color: theme === 'light' ? '#333' : '#ffffff' }}>{type.name}</td>
                    <td style={{ padding: '12px', color: theme === 'light' ? '#333' : '#ffffff' }}>{type.description || '-'}</td>
                    <td style={{ padding: '12px', display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => editType(type)}
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
                        onClick={() => deleteType(type.id)}
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

        {activeTab === 'items' && (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: theme === 'light' ? '#f5f7fa' : '#374151', borderBottom: `2px solid ${theme === 'light' ? '#ddd' : '#374151'}` }}>
                <th style={{ padding: '12px', textAlign: 'left', color: theme === 'light' ? '#666' : '#9ca3af' }}>Nombre</th>
                <th style={{ padding: '12px', textAlign: 'left', color: theme === 'light' ? '#666' : '#9ca3af' }}>Tipo</th>
                <th style={{ padding: '12px', textAlign: 'left', color: theme === 'light' ? '#666' : '#9ca3af' }}>Cantidad</th>
                <th style={{ padding: '12px', textAlign: 'left', color: theme === 'light' ? '#666' : '#9ca3af' }}>Mín/Máx</th>
                <th style={{ padding: '12px', textAlign: 'left', color: theme === 'light' ? '#666' : '#9ca3af' }}>Ubicación</th>
                <th style={{ padding: '12px', textAlign: 'left', color: theme === 'light' ? '#666' : '#9ca3af' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {inventoryItems.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '20px', textAlign: 'center', color: theme === 'light' ? '#999' : '#9ca3af' }}>
                    No hay artículos de inventario registrados
                  </td>
                </tr>
              ) : (
                inventoryItems.map((item: any) => {
                  const type = inventoryTypes.find((t: any) => t.id === item.typeId);
                  return (
                    <tr key={item.id} style={{ borderBottom: `1px solid ${theme === 'light' ? '#eee' : '#374151'}`, background: theme === 'light' ? 'white' : '#111827', color: theme === 'light' ? '#333' : '#ffffff' }}>
                      <td style={{ padding: '12px', color: theme === 'light' ? '#333' : '#ffffff' }}>{item.name}</td>
                      <td style={{ padding: '12px', color: theme === 'light' ? '#333' : '#ffffff' }}>{type?.name || '-'}</td>
                      <td style={{ padding: '12px', color: theme === 'light' ? '#333' : '#ffffff' }}>{item.quantity} {item.unit || ''}</td>
                      <td style={{ padding: '12px', color: theme === 'light' ? '#333' : '#ffffff' }}>{item.minQuantity}/{item.maxQuantity || '-'}</td>
                      <td style={{ padding: '12px', color: theme === 'light' ? '#333' : '#ffffff' }}>{item.location || '-'}</td>
                      <td style={{ padding: '12px', display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => editItem(item)}
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
                          onClick={() => deleteItem(item.id)}
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
