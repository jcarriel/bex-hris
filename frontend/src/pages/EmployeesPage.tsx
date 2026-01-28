import { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import SearchFilter from '../components/SearchFilter';
import DataTable from '../components/DataTable';
import { showSuccess, showError, showConfirm } from '../utils/alertify';
import { useThemeStore } from '../stores/themeStore';

export default function EmployeesPage() {
  const { theme } = useThemeStore();
  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<any>({});
  const [departments, setDepartments] = useState<any[]>([]);
  const [positions, setPositions] = useState<any[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showDocumentsModal, setShowDocumentsModal] = useState(false);
  const [documents, setDocuments] = useState<any[]>([]);
  const [documentCategories, setDocumentCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [viewingPdf, setViewingPdf] = useState<{ id: string; fileName: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    cedula: '',
    phone: '',
    departmentId: '',
    positionId: '',
    hireDate: '',
    baseSalary: '',
    dateOfBirth: '',
    gender: '',
    maritalStatus: '',
    address: '',
    contractType: '',
    currentContract: '',
    contractEndDate: '',
  });

  const filterConfig = [
    { id: 'cedula', label: 'Cédula', type: 'text' as const, placeholder: 'Filtrar por cédula' },
    { id: 'status', label: 'Estado', type: 'select' as const, options: [
      { value: 'active', label: 'Activo' },
      { value: 'inactive', label: 'Inactivo' },
    ]},
    { id: 'contractType', label: 'Tipo de Contrato', type: 'select' as const, options: [
      { value: 'indefinite', label: 'Indefinido' },
      { value: 'fixed', label: 'Plazo Fijo' },
      { value: 'temporary', label: 'Temporal' },
      { value: 'intern', label: 'Practicante' },
    ]},
    { id: 'positionId', label: 'Cargo', type: 'select' as const, options: positions.map((p: any) => ({ value: p.id, label: p.name })) },
    { id: 'salaryRange', label: 'Rango de Salario', type: 'range' as const },
    { id: 'hireDateFrom', label: 'Fecha Ingreso Desde', type: 'date' as const },
    { id: 'hireDateTo', label: 'Fecha Ingreso Hasta', type: 'date' as const },
    { id: 'contractEndDateFrom', label: 'Fecha Terminación Desde', type: 'date' as const },
    { id: 'contractEndDateTo', label: 'Fecha Terminación Hasta', type: 'date' as const },
  ];

  useEffect(() => {
    fetchEmployees();
    fetchDepartments();
    fetchPositions();
  }, []);

  useEffect(() => {
    applyFiltersAndSearch();
  }, [employees, searchQuery, filters]);

  // Cargar Cargos cuando cambia el departamento seleccionado
  useEffect(() => {
    if (formData.departmentId) {
      const filteredPositions = positions.filter(
        (pos: any) => pos.departmentId === formData.departmentId
      );
      // Limpiar el puesto si no pertenece al nuevo departamento
      if (formData.positionId && !filteredPositions.find((p: any) => p.id === formData.positionId)) {
        setFormData((prev) => ({ ...prev, positionId: '' }));
      }
    } else {
      setFormData((prev) => ({ ...prev, positionId: '' }));
    }
  }, [formData.departmentId, positions]);

  const fetchDepartments = async () => {
    try {
      const response = await api.client.get('/departments');
      setDepartments(response.data.data || []);
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const fetchPositions = async () => {
    try {
      const response = await api.client.get('/positions');
      setPositions(response.data.data || []);
    } catch (error) {
      console.error('Error fetching positions:', error);
    }
  };

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const response = await api.getEmployees(1, 100);
      setEmployees(response.data.data.data || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFiltersAndSearch = () => {
    let result = [...employees];

    // Búsqueda por texto
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((emp: any) =>
        emp.firstName?.toLowerCase().includes(query) ||
        emp.lastName?.toLowerCase().includes(query) ||
        emp.email?.toLowerCase().includes(query) ||
        emp.cedula?.toLowerCase().includes(query)
      );
    }

    // Filtros
    if (filters.cedula) {
      result = result.filter((emp: any) => emp.cedula?.toLowerCase().includes(filters.cedula.toLowerCase()));
    }
    if (filters.status) {
      result = result.filter((emp: any) => emp.status === filters.status);
    }
    if (filters.contractType) {
      result = result.filter((emp: any) => emp.contractType === filters.contractType);
    }
    if (filters.positionId) {
      result = result.filter((emp: any) => emp.positionId === filters.positionId);
    }
    if (filters.salaryRange_min) {
      result = result.filter((emp: any) => emp.baseSalary >= parseFloat(filters.salaryRange_min));
    }
    if (filters.salaryRange_max) {
      result = result.filter((emp: any) => emp.baseSalary <= parseFloat(filters.salaryRange_max));
    }
    if (filters.hireDateFrom) {
      result = result.filter((emp: any) => emp.hireDate >= filters.hireDateFrom);
    }
    if (filters.hireDateTo) {
      result = result.filter((emp: any) => emp.hireDate <= filters.hireDateTo);
    }

    setFilteredEmployees(result);
  };

  const handleChange = (e: any) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    try {
      if (editingId) {
        // Actualizar empleado existente
        await api.client.put(`/employees/${editingId}`, {
          ...formData,
          baseSalary: parseFloat(formData.baseSalary),
        });
        showSuccess('Empleado actualizado exitosamente');
      } else {
        // Crear nuevo empleado
        await api.createEmployee({
          ...formData,
          baseSalary: parseFloat(formData.baseSalary),
          employeeNumber: `EMP-${Date.now()}`,
          status: 'active',
        });
        showSuccess('Empleado creado exitosamente');
      }
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        cedula: '',
        phone: '',
        departmentId: '',
        positionId: '',
        hireDate: '',
        baseSalary: '',
        dateOfBirth: '',
        gender: '',
        maritalStatus: '',
        address: '',
        contractType: '',
        currentContract: '',
        contractEndDate: '',
      });
      setEditingId(null);
      setShowForm(false);
      fetchEmployees();
    } catch (error) {
      console.error('Error:', error);
      showError(editingId ? 'Error al actualizar el empleado' : 'Error al crear el empleado');
    }
  };

  const openDocumentsModal = async (employee: any) => {
    setSelectedEmployee(employee);
    setShowDocumentsModal(true);
    await Promise.all([
      fetchEmployeeDocuments(employee.id),
      fetchDocumentCategories(),
    ]);
  };

  const fetchDocumentCategories = async () => {
    try {
      const response = await api.client.get('/document-categories');
      const categories = response.data.data || [];
      // Extraer solo los nombres de las categorías
      const categoryNames = categories.map((cat: any) => cat.name);
      setDocumentCategories(categoryNames);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchEmployeeDocuments = async (employeeId: string) => {
    try {
      const response = await api.client.get(`/documents/employee/${employeeId}`);
      const docs = response.data.data || [];
      setDocuments(docs);
      
      // Extraer categorías únicas
      const categoriesSet = new Set(docs.map((d: any) => d.documentType));
      const categories = Array.from(categoriesSet).sort();
      setDocumentCategories(categories as string[]);
    } catch (error) {
      console.error('Error fetching documents:', error);
    }
  };

  const handleDocumentFileSelect = (e: any) => {
    const files = Array.from(e.target.files || []) as File[];
    if (files.length === 0) {
      setSelectedFiles([]);
      return;
    }
    setSelectedFiles(files);
  };

  const handleDocumentUpload = async () => {
    if (selectedFiles.length === 0 || !selectedCategory) {
      showError('Por favor selecciona al menos un archivo y una categoría');
      return;
    }

    try {
      setUploadingDoc(true);
      let uploadedCount = 0;
      let failedCount = 0;

      for (const file of selectedFiles) {
        try {
          const formDataUpload = new FormData();
          formDataUpload.append('file', file);
          formDataUpload.append('employeeId', selectedEmployee.id);
          formDataUpload.append('documentType', selectedCategory);

          await api.client.post('/documents/upload', formDataUpload);
          uploadedCount++;
        } catch (error) {
          console.error(`Error uploading file ${file.name}:`, error);
          failedCount++;
        }
      }

      // Actualizar documentos y categorías
      await Promise.all([
        fetchEmployeeDocuments(selectedEmployee.id),
        fetchDocumentCategories(),
      ]);

      if (failedCount === 0) {
        showSuccess(`${uploadedCount} documento${uploadedCount !== 1 ? 's' : ''} subido${uploadedCount !== 1 ? 's' : ''} exitosamente`);
      } else {
        showError(`${uploadedCount} subido${uploadedCount !== 1 ? 's' : ''}, ${failedCount} fallido${failedCount !== 1 ? 's' : ''}`);
      }

      // Limpiar estados y input
      setSelectedFiles([]);
      setSelectedCategory('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error uploading documents:', error);
      showError('Error al subir los documentos');
    } finally {
      setUploadingDoc(false);
    }
  };

  const downloadDocument = async (docId: string) => {
    try {
      const response = await api.client.get(`/documents/${docId}/download`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `documento.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentElement?.removeChild(link);
    } catch (error) {
      console.error('Error downloading document:', error);
    }
  };

  const viewPdfDocument = async (docId: string, fileName: string) => {
    try {
      const response = await api.client.get(`/documents/${docId}/download`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      setViewingPdf({ id: docId, fileName });
      // Guardar la URL en sessionStorage para acceder desde el modal
      sessionStorage.setItem(`pdf_${docId}`, url);
    } catch (error) {
      console.error('Error viewing document:', error);
      showError('Error al abrir el documento');
    }
  };

  const deleteDocument = async (docId: string) => {
    showConfirm('¿Estás seguro de que deseas eliminar este documento?', async () => {
      try {
        await api.client.delete(`/documents/${docId}`);
        // Actualizar documentos y categorías
        await Promise.all([
          fetchEmployeeDocuments(selectedEmployee.id),
          fetchDocumentCategories(),
        ]);
        showSuccess('Documento eliminado exitosamente');
      } catch (error) {
        console.error('Error deleting document:', error);
        showError('Error al eliminar el documento');
      }
    });
  };

  return (
    <div style={{ padding: '20px' }}>
      <SearchFilter
        onSearch={setSearchQuery}
        onFilter={setFilters}
        filters={filterConfig}
        placeholder="Buscar por nombre, email o cédula..."
      />

      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
        <button
          onClick={() => {
            if (editingId) {
              setEditingId(null);
              setFormData({
                firstName: '',
                lastName: '',
                email: '',
                cedula: '',
                phone: '',
                departmentId: '',
                positionId: '',
                hireDate: '',
                baseSalary: '',
                dateOfBirth: '',
                gender: '',
                maritalStatus: '',
                address: '',
                contractType: '',
                currentContract: '',
                contractEndDate: '',
              });
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
          {showForm ? '✕ Cancelar' : '+ Nuevo Empleado'}
        </button>
        {/* <button
          onClick={() => {
            showConfirm('¿Estás seguro de que deseas limpiar la tabla de empleados? Esta acción no se puede deshacer.', async () => {
              try {
                await api.client.delete('/employees/clear');
                fetchEmployees();
                showSuccess('Tabla de empleados limpiada exitosamente');
              } catch (error) {
                console.error('Error clearing employees:', error);
                showError('Error al limpiar la tabla de empleados');
              }
            });
          }}
          style={{
            padding: '10px 20px',
            background: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          🗑 Limpiar Tabla
        </button> */}
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
          <h3 style={{ marginTop: 0, color: theme === 'light' ? '#333' : '#ffffff' }}>{editingId ? 'Editar Empleado' : 'Registrar Nuevo Empleado'}</h3>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px' }}>
            <input
              type="text"
              name="firstName"
              placeholder="Nombre"
              value={formData.firstName}
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
            <input
              type="text"
              name="lastName"
              placeholder="Apellido"
              value={formData.lastName}
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
            <input
              type="email"
              name="email"
              placeholder="Email (Opcional)"
              value={formData.email}
              onChange={handleChange}
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
              name="departmentId"
              value={formData.departmentId}
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
            >
              <option value="">Seleccionar Centro de Costo</option>
              {departments.map((dept: any) => (
                <option key={dept.id} value={dept.id}>{dept.name}</option>
              ))}
            </select>
            <select
              name="positionId"
              value={formData.positionId}
              onChange={handleChange}
              required
              disabled={!formData.departmentId}
              style={{
                padding: '10px',
                border: `1px solid ${theme === 'light' ? '#ddd' : '#374151'}`,
                borderRadius: '5px',
                fontSize: '14px',
                background: !formData.departmentId ? (theme === 'light' ? '#f0f0f0' : '#374151') : (theme === 'light' ? 'white' : '#374151'),
                color: theme === 'light' ? '#333' : '#ffffff',
                cursor: !formData.departmentId ? 'not-allowed' : 'pointer',
              }}
            >
              <option value="">
                {!formData.departmentId ? 'Selecciona un departamento primero' : 'Seleccionar Puesto'}
              </option>
              {positions
                .filter((pos: any) => pos.departmentId === formData.departmentId)
                .map((pos: any) => (
                  <option key={pos.id} value={pos.id}>{pos.name}</option>
                ))}
            </select>
            <input
              type="date"
              name="hireDate"
              value={formData.hireDate}
              onChange={handleChange}
              style={{
                padding: '10px',
                border: `1px solid ${theme === 'light' ? '#ddd' : '#374151'}`,
                borderRadius: '5px',
                fontSize: '14px',
                background: theme === 'light' ? 'white' : '#374151',
                color: theme === 'light' ? '#333' : '#ffffff',
              }}
            />
            <input
              type="number"
              name="baseSalary"
              placeholder="Salario Base"
              value={formData.baseSalary}
              onChange={handleChange}
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
              name="contractType"
              value={formData.contractType}
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
              <option value="">Tipo de Contrato</option>
              <option value="indefinite">Indefinido</option>
              <option value="fixed">Plazo Fijo</option>
              <option value="temporary">Temporal</option>
              <option value="intern">Practicante</option>
            </select>
            <input
              type="text"
              name="currentContract"
              placeholder="Contrato Actual"
              value={formData.currentContract}
              onChange={handleChange}
              style={{
                padding: '10px',
                border: `1px solid ${theme === 'light' ? '#ddd' : '#374151'}`,
                borderRadius: '5px',
                fontSize: '14px',
                background: theme === 'light' ? 'white' : '#374151',
                color: theme === 'light' ? '#333' : '#ffffff',
              }}
            />
            <input
              type="date"
              name="contractEndDate"
              placeholder="Fecha Terminación Contrato"
              value={formData.contractEndDate}
              onChange={handleChange}
              style={{
                padding: '10px',
                border: `1px solid ${theme === 'light' ? '#ddd' : '#374151'}`,
                borderRadius: '5px',
                fontSize: '14px',
                background: theme === 'light' ? 'white' : '#374151',
                color: theme === 'light' ? '#333' : '#ffffff',
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
              {editingId ? '💾 Actualizar Empleado' : '💾 Guardar Empleado'}
            </button>
          </form>
        </div>
      )}

      {loading ? (
        <div style={{ padding: '20px', textAlign: 'center', color: theme === 'light' ? '#999' : '#9ca3af' }}>
          Cargando empleados...
        </div>
      ) : (
        <DataTable
          columns={[
            {
              key: 'cedula',
              label: 'Cédula',
              sortable: true,
              render: (value) => value || '-',
            },
            {
              key: 'fullName',
              label: 'Apellidos-Nombres',
              sortable: true,
              render: (_, row) => `${row.lastName} ${row.firstName}`,
            },
            {
              key: 'contractType',
              label: 'Tipo Contrato',
              sortable: true,
              render: (value) => {
                const types: Record<string, string> = {
                  'indefinite': 'Indefinido',
                  'fixed': 'Plazo Fijo',
                  'temporary': 'Temporal',
                  'intern': 'Practicante',
                };
                return types[value] || '-';
              },
            },
            {
              key: 'currentContract',
              label: 'Contrato Actual',
              sortable: true,
              render: (value) => value || '-',
            },
            {
              key: 'contractEndDate',
              label: 'Fecha Terminación Contrato',
              sortable: true,
              render: (value) => value ? value.split('T')[0] : '-',
            },
            {
              key: 'positionId',
              label: 'Cargo',
              sortable: true,
              render: (value) => positions.find((p: any) => p.id === value)?.name || '-',
            },
            {
              key: 'departmentId',
              label: 'Centro de Costo',
              sortable: true,
              render: (value) => departments.find((d: any) => d.id === value)?.name || '-',
            },
            {
              key: 'baseSalary',
              label: 'Sueldo',
              sortable: true,
              render: (value) => `$${value?.toLocaleString() || '-'}`,
            },
            {
              key: 'hireDate',
              label: 'Fecha de Ingreso',
              sortable: true,
              render: (value) => value?.split('T')[0] || '-',
            },
            {
              key: 'dateOfBirth',
              label: 'Edad',
              sortable: true,
              render: (value) => {
                if (!value) return '-';
                const birthDate = new Date(value);
                const today = new Date();
                let age = today.getFullYear() - birthDate.getFullYear();
                const monthDiff = today.getMonth() - birthDate.getMonth();
                if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                  age--;
                }
                return age;
              },
            },
            {
              key: 'maritalStatus',
              label: 'Estado Civil',
              sortable: true,
              render: (value) => {
                const statuses: Record<string, string> = {
                  'single': 'Soltero',
                  'married': 'Casado',
                  'divorced': 'Divorciado',
                  'widowed': 'Viudo',
                };
                return statuses[value] || '-';
              },
            },
            {
              key: 'address',
              label: 'Procedencia',
              sortable: true,
              render: (value) => value || '-',
            },
            {
              key: 'status',
              label: 'Estado',
              sortable: true,
              render: (value) => (
                <span style={{
                  background: value === 'active' ? '#d4edda' : '#f8d7da',
                  color: value === 'active' ? '#155724' : '#721c24',
                  padding: '4px 8px',
                  borderRadius: '3px',
                  fontSize: '11px',
                }}>
                  {value === 'active' ? 'Activo' : 'Inactivo'}
                </span>
              ),
            },
          ]}
          data={filteredEmployees}
          pageSize={10}
          actions={(emp) => (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                onClick={() => openDocumentsModal(emp)}
                style={{
                  padding: '6px 12px',
                  background: '#667eea',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                📄 Documentos
              </button>
              <button
                onClick={() => {
                  setFormData({
                    firstName: emp.firstName,
                    lastName: emp.lastName,
                    email: emp.email,
                    cedula: emp.cedula,
                    phone: emp.phone || '',
                    departmentId: emp.departmentId,
                    positionId: emp.positionId,
                    hireDate: emp.hireDate?.split('T')[0] || '',
                    baseSalary: emp.baseSalary?.toString() || '',
                    dateOfBirth: emp.dateOfBirth?.split('T')[0] || '',
                    gender: emp.gender || '',
                    maritalStatus: emp.maritalStatus || '',
                    address: emp.address || '',
                    contractType: emp.contractType || '',
                    currentContract: emp.currentContract || '',
                    contractEndDate: emp.contractEndDate?.split('T')[0] || '',
                  });
                  setEditingId(emp.id);
                  setShowForm(true);
                }}
                style={{
                  padding: '6px 12px',
                  background: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                ✏️ Editar
              </button>
              <button
                onClick={() => {
                  showConfirm('¿Estás seguro de que deseas eliminar este empleado?', async () => {
                    try {
                      await api.client.delete(`/employees/${emp.id}`);
                      fetchEmployees();
                      showSuccess('Empleado eliminado exitosamente');
                    } catch (error) {
                      console.error('Error deleting employee:', error);
                      showError('Error al eliminar el empleado');
                    }
                  });
                }}
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
                🗑 Eliminar
              </button>
            </div>
          )}
        />
      )}

      {showDocumentsModal && selectedEmployee && (
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
        }}>
          <div style={{
            background: 'white',
            borderRadius: '8px',
            padding: '30px',
            maxWidth: '900px',
            maxHeight: '90vh',
            overflow: 'auto',
            width: '90%',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0 }}>Documentos - {selectedEmployee.firstName} {selectedEmployee.lastName}</h2>
              <button
                onClick={() => setShowDocumentsModal(false)}
                style={{
                  background: '#ddd',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '8px 12px',
                  cursor: 'pointer',
                  fontSize: '16px',
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ marginBottom: '20px', padding: '15px', background: '#f5f7fa', borderRadius: '8px' }}>
              <h4 style={{ margin: '0 0 15px 0' }}>Subir Nuevo Documento</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  style={{
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px',
                  }}
                >
                  <option value="">Seleccionar Categoría</option>
                  {documentCategories.map((cat: string, index: number) => (
                    <option key={`${cat}-${index}`} value={cat}>{cat}</option>
                  ))}
                </select>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={handleDocumentFileSelect}
                  disabled={uploadingDoc}
                  style={{
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px',
                  }}
                />
              </div>

              {/* Selected Files List */}
              {selectedFiles.length > 0 && (
                <div style={{ marginBottom: '15px', padding: '10px', background: 'white', borderRadius: '4px', border: '1px solid #ddd' }}>
                  <p style={{ margin: '0 0 8px 0', fontWeight: 'bold', fontSize: '12px', color: '#666' }}>
                    📁 {selectedFiles.length} archivo{selectedFiles.length !== 1 ? 's' : ''} seleccionado{selectedFiles.length !== 1 ? 's' : ''}:
                  </p>
                  <div style={{ display: 'grid', gap: '4px' }}>
                    {selectedFiles.map((file, index) => (
                      <div key={`${file.name}-${index}`} style={{ fontSize: '12px', color: '#333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>📄 {file.name} ({(file.size / 1024).toFixed(2)} KB)</span>
                        <button
                          onClick={() => setSelectedFiles(selectedFiles.filter((_, i) => i !== index))}
                          style={{
                            padding: '2px 8px',
                            background: '#dc3545',
                            color: 'white',
                            border: 'none',
                            borderRadius: '3px',
                            cursor: 'pointer',
                            fontSize: '11px',
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Upload Button */}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={handleDocumentUpload}
                  disabled={uploadingDoc || selectedFiles.length === 0 || !selectedCategory}
                  style={{
                    flex: 1,
                    padding: '10px 15px',
                    background: selectedFiles.length > 0 && selectedCategory && !uploadingDoc ? '#667eea' : '#ccc',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: selectedFiles.length > 0 && selectedCategory && !uploadingDoc ? 'pointer' : 'not-allowed',
                    fontSize: '14px',
                    fontWeight: 'bold',
                  }}
                >
                  {uploadingDoc ? '⏳ Subiendo...' : '✓ Subir Documentos'}
                </button>
                {selectedFiles.length > 0 && (
                  <button
                    onClick={() => {
                      setSelectedFiles([]);
                      setSelectedCategory('');
                    }}
                    disabled={uploadingDoc}
                    style={{
                      padding: '10px 15px',
                      background: '#6c757d',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '14px',
                    }}
                  >
                    ✕ Cancelar
                  </button>
                )}
              </div>
            </div>

            <div>
              <h4 style={{ margin: '0 0 20px 0' }}>Documentos por Categoría</h4>
              {documentCategories.length === 0 ? (
                <p style={{ color: '#999' }}>No hay documentos registrados</p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '15px' }}>
                  {documentCategories.map((category, index) => {
                    const categoryDocs = documents.filter((doc: any) => doc.documentType === category);
                    const isExpanded = expandedCategory === category;
                    
                    return (
                      <div
                        key={`${category}-${index}`}
                        onClick={() => setExpandedCategory(isExpanded ? null : category)}
                        style={{
                          padding: '20px',
                          border: '2px solid #667eea',
                          borderRadius: '8px',
                          background: isExpanded ? '#f0f4ff' : 'white',
                          cursor: 'pointer',
                          textAlign: 'center',
                          transition: 'all 0.3s ease',
                          boxShadow: isExpanded ? '0 4px 12px rgba(102, 126, 234, 0.2)' : '0 2px 4px rgba(0,0,0,0.1)',
                        }}
                      >
                        <div style={{ fontSize: '32px', marginBottom: '10px' }}>📁</div>
                        <h5 style={{ margin: '0 0 8px 0', color: '#667eea', fontSize: '14px', fontWeight: 'bold' }}>
                          {category}
                        </h5>
                        <p style={{ margin: 0, fontSize: '12px', color: '#999' }}>
                          {categoryDocs.length} archivo{categoryDocs.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Expanded Category View */}
              {expandedCategory && (
                <div style={{
                  marginTop: '30px',
                  padding: '20px',
                  background: '#f9f9f9',
                  borderRadius: '8px',
                  border: '2px solid #667eea',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h4 style={{ margin: 0, color: '#667eea' }}>📁 {expandedCategory}</h4>
                    <button
                      onClick={() => setExpandedCategory(null)}
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
                      ✕ Cerrar
                    </button>
                  </div>

                  {documents.filter((doc: any) => doc.documentType === expandedCategory).length === 0 ? (
                    <p style={{ color: '#999', textAlign: 'center' }}>No hay archivos en esta categoría</p>
                  ) : (
                    <div style={{ display: 'grid', gap: '10px' }}>
                      {documents
                        .filter((doc: any) => doc.documentType === expandedCategory)
                        .map((doc: any) => (
                          <div
                            key={doc.id}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '15px',
                              background: 'white',
                              borderRadius: '6px',
                              border: '1px solid #ddd',
                            }}
                          >
                            <div style={{ flex: 1 }}>
                              <p style={{ margin: '0 0 5px 0', fontWeight: 'bold', color: '#333' }}>
                                📄 {doc.fileName}
                              </p>
                              <p style={{ margin: 0, fontSize: '12px', color: '#999' }}>
                                {new Date(doc.createdAt).toLocaleDateString()} - {(doc.fileSize / 1024).toFixed(2)} KB
                              </p>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              {doc.fileName?.toLowerCase().endsWith('.pdf') && (
                                <button
                                  onClick={() => viewPdfDocument(doc.id, doc.fileName)}
                                  style={{
                                    padding: '6px 12px',
                                    background: '#0050b3',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '12px',
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  👁 Ver
                                </button>
                              )}
                              <button
                                onClick={() => downloadDocument(doc.id)}
                                style={{
                                  padding: '6px 12px',
                                  background: '#28a745',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  fontSize: '12px',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                ⬇ Descargar
                              </button>
                              <button
                                onClick={() => deleteDocument(doc.id)}
                                style={{
                                  padding: '6px 12px',
                                  background: '#dc3545',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  fontSize: '12px',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                🗑 Eliminar
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* PDF Viewer Modal */}
      {viewingPdf && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
        }}>
          <div style={{
            background: 'white',
            borderRadius: '8px',
            padding: '20px',
            maxWidth: '90vw',
            maxHeight: '90vh',
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h3 style={{ margin: 0 }}>📄 {viewingPdf.fileName}</h3>
              <button
                onClick={() => {
                  sessionStorage.removeItem(`pdf_${viewingPdf.id}`);
                  setViewingPdf(null);
                }}
                style={{
                  background: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '8px 12px',
                  cursor: 'pointer',
                  fontSize: '16px',
                }}
              >
                ✕
              </button>
            </div>
            <iframe
              src={sessionStorage.getItem(`pdf_${viewingPdf.id}`) || ''}
              style={{
                flex: 1,
                border: 'none',
                borderRadius: '4px',
                width: '100%',
              }}
              title="PDF Viewer"
            />
          </div>
        </div>
      )}
    </div>
  );
}
