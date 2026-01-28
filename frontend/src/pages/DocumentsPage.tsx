import { useState, useEffect } from 'react';
import api from '../services/api';
import SearchFilter from '../components/SearchFilter';
import { useThemeStore } from '../stores/themeStore';

export default function DocumentsPage() {
  const { theme } = useThemeStore();
  const [documents, setDocuments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [filteredDocuments, setFilteredDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<any>({});
  const [uploadProgress, setUploadProgress] = useState(0);
  const [formData, setFormData] = useState({
    employeeId: '',
    documentType: 'Contrato',
    file: null as File | null,
  });

  const filterConfig = [
    {
      id: 'documentType',
      label: 'Tipo de Documento',
      type: 'select' as const,
      options: [
        { value: 'contract', label: 'Contrato' },
        { value: 'certificate', label: 'Certificado' },
        { value: 'identification', label: 'Identificación' },
        { value: 'diploma', label: 'Diploma' },
        { value: 'other', label: 'Otro' },
      ],
    },
    { id: 'employeeId', label: 'ID Empleado', type: 'text' as const, placeholder: 'Buscar por ID' },
  ];

  useEffect(() => {
    fetchAllData();
  }, []);

  useEffect(() => {
    applyFiltersAndSearch();
  }, [documents, searchQuery, filters]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const [docsRes, empsRes] = await Promise.all([
        api.client.get('/documents'),
        api.client.get('/employees'),
      ]);
      const docsData = docsRes.data.data || [];
      const empsData = empsRes.data.data || [];
      
      console.log('Documents:', docsData);
      console.log('Employees:', empsData);
      
      setDocuments(docsData);
      setEmployees(empsData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFiltersAndSearch = () => {
    let result = [...documents];

    // Búsqueda por texto
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((doc: any) =>
        doc.name?.toLowerCase().includes(query) ||
        doc.employeeId?.toLowerCase().includes(query)
      );
    }

    // Filtros
    if (filters.documentType) {
      result = result.filter((doc: any) => doc.type === filters.documentType);
    }
    if (filters.employeeId) {
      result = result.filter((doc: any) => doc.employeeId === filters.employeeId);
    }

    setFilteredDocuments(result);
  };

  const handleChange = (e: any) => {
    const { name, value, files } = e.target;
    if (name === 'file') {
      setFormData((prev) => ({ ...prev, file: files?.[0] || null }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (!formData.file) {
      alert('Por favor selecciona un archivo');
      return;
    }

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('employeeId', formData.employeeId);
      formDataToSend.append('documentType', formData.documentType);
      formDataToSend.append('file', formData.file);

      await api.client.post('/documents/upload', formDataToSend, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent: any) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setUploadProgress(percentCompleted);
        },
      });

      setFormData({
        employeeId: '',
        documentType: 'contract',
        file: null,
      });
      setUploadProgress(0);
      setShowForm(false);
      fetchAllData();
    } catch (error) {
      console.error('Error uploading document:', error);
      alert('Error al subir el documento');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este documento?')) {
      try {
        await api.client.delete(`/documents/${id}`);
        fetchAllData();
      } catch (error) {
        console.error('Error deleting document:', error);
      }
    }
  };

  const handleDownload = async (id: string, fileName: string) => {
    try {
      const response = await api.client.get(`/documents/${id}/download`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.parentElement?.removeChild(link);
    } catch (error) {
      console.error('Error downloading document:', error);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES');
  };

  return (
    <div style={{ padding: '20px' }}>
      <SearchFilter
        onSearch={setSearchQuery}
        onFilter={setFilters}
        filters={filterConfig}
        placeholder="Buscar por nombre de documento o empleado..."
      />

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
          {showForm ? '✕ Cancelar' : '+ Subir Documento'}
        </button>
      </div>

      {showForm && (
        <div
          style={{
            background: theme === 'light' ? 'white' : '#1f2937',
            padding: '20px',
            borderRadius: '8px',
            marginBottom: '20px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            border: `1px solid ${theme === 'light' ? '#eee' : '#374151'}`,
          }}
        >
          <h3 style={{ marginTop: 0, color: theme === 'light' ? '#333' : '#ffffff' }}>Subir Documento</h3>
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
                border: `1px solid ${theme === 'light' ? '#ddd' : '#374151'}`,
                borderRadius: '5px',
                fontSize: '14px',
                background: theme === 'light' ? 'white' : '#374151',
                color: theme === 'light' ? '#333' : '#ffffff',
              }}
            />
            <select
              name="documentType"
              value={formData.documentType}
              onChange={handleChange}
              style={{
                padding: '10px',
                border: `1px solid ${theme === 'light' ? '#ddd' : '#374151'}`,
                borderRadius: '5px',
                fontSize: '14px',
                background: theme === 'light' ? 'white' : '#374151',
                color: theme === 'light' ? '#333' : '#ffffff',
              }}
            >
              <option value="contract">Contrato</option>
              <option value="certificate">Certificado</option>
              <option value="identification">Identificación</option>
              <option value="diploma">Diploma</option>
              <option value="other">Otro</option>
            </select>
            <input
              type="file"
              name="file"
              onChange={handleChange}
              required
              style={{
                padding: '10px',
                border: `1px solid ${theme === 'light' ? '#ddd' : '#374151'}`,
                borderRadius: '5px',
                fontSize: '14px',
                gridColumn: '1 / -1',
                background: theme === 'light' ? 'white' : '#374151',
                color: theme === 'light' ? '#333' : '#ffffff',
              }}
            />
            {uploadProgress > 0 && uploadProgress < 100 && (
              <div style={{ gridColumn: '1 / -1' }}>
                <div style={{ fontSize: '12px', marginBottom: '5px', color: theme === 'light' ? '#333' : '#ffffff' }}>Progreso: {uploadProgress}%</div>
                <div
                  style={{
                    width: '100%',
                    height: '8px',
                    background: theme === 'light' ? '#eee' : '#374151',
                    borderRadius: '4px',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      background: '#667eea',
                      width: `${uploadProgress}%`,
                      transition: 'width 0.3s',
                    }}
                  />
                </div>
              </div>
            )}
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
              Subir Documento
            </button>
          </form>
        </div>
      )}

      <div
        style={{
          background: theme === 'light' ? 'white' : '#1f2937',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          overflow: 'hidden',
          border: `1px solid ${theme === 'light' ? '#eee' : '#374151'}`,
        }}
      >
        {loading ? (
          <div style={{ padding: '20px', textAlign: 'center', color: theme === 'light' ? '#999' : '#9ca3af' }}>
            Cargando documentos...
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: theme === 'light' ? '#f5f7fa' : '#374151', borderBottom: `2px solid ${theme === 'light' ? '#eee' : '#374151'}` }}>
                <th style={{ padding: '12px', textAlign: 'left', color: theme === 'light' ? '#666' : '#9ca3af' }}>Nombre</th>
                <th style={{ padding: '12px', textAlign: 'left', color: theme === 'light' ? '#666' : '#9ca3af' }}>Empleado</th>
                <th style={{ padding: '12px', textAlign: 'left', color: theme === 'light' ? '#666' : '#9ca3af' }}>Tipo</th>
                <th style={{ padding: '12px', textAlign: 'left', color: theme === 'light' ? '#666' : '#9ca3af' }}>Tamaño</th>
                <th style={{ padding: '12px', textAlign: 'left', color: theme === 'light' ? '#666' : '#9ca3af' }}>Fecha</th>
                <th style={{ padding: '12px', textAlign: 'left', color: theme === 'light' ? '#666' : '#9ca3af' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredDocuments.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '20px', textAlign: 'center', color: theme === 'light' ? '#999' : '#9ca3af' }}>
                    {documents.length === 0 ? 'No hay documentos registrados' : 'No hay resultados que coincidan con tu búsqueda'}
                  </td>
                </tr>
              ) : (
                filteredDocuments.map((doc: any) => {
                  const employee = Array.isArray(employees) ? employees.find((e: any) => e.id === doc.employeeId) : null;
                  const employeeName = employee ? `${employee.firstName} ${employee.lastName}` : 'Desconocido';
                  
                  return (
                  <tr key={doc.id} style={{ borderBottom: `1px solid ${theme === 'light' ? '#eee' : '#374151'}`, background: theme === 'light' ? 'white' : '#111827', color: theme === 'light' ? '#333' : '#ffffff' }}>
                    <td style={{ padding: '12px', fontWeight: '500', color: theme === 'light' ? '#333' : '#ffffff' }}>📄 {doc.fileName}</td>
                    <td style={{ padding: '12px', color: theme === 'light' ? '#333' : '#ffffff' }}>{employeeName}</td>
                    <td style={{ padding: '12px' }}>
                      <span
                        style={{
                          background: '#e7f3ff',
                          color: '#0050b3',
                          padding: '4px 8px',
                          borderRadius: '3px',
                          fontSize: '12px',
                        }}
                      >
                        {doc.documentType}
                      </span>
                    </td>
                    <td style={{ padding: '12px', color: theme === 'light' ? '#333' : '#ffffff' }}>{formatFileSize(doc.fileSize)}</td>
                    <td style={{ padding: '12px', fontSize: '13px', color: theme === 'light' ? '#666' : '#9ca3af' }}>
                      {formatDate(doc.createdAt)}
                    </td>
                    <td style={{ padding: '12px', display: 'flex', gap: '5px' }}>
                      <button
                        onClick={() => handleDownload(doc.id, doc.fileName)}
                        style={{
                          padding: '6px 12px',
                          background: '#28a745',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: '500',
                        }}
                      >
                        ⬇ Descargar
                      </button>
                      <button
                        onClick={() => handleDelete(doc.id)}
                        style={{
                          padding: '6px 12px',
                          background: '#dc3545',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: '500',
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
