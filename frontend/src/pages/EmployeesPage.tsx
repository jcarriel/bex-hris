import { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import SearchFilter from '../components/SearchFilter';
import DataTableAdvanced from '../components/DataTableAdvanced';
import InputField from '../components/InputField';
import SelectField from '../components/SelectField';
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

  // Manejar clicks en botones de acciones
  useEffect(() => {
    const handleActionClick = (e: any) => {
      const button = (e.target as HTMLElement).closest('.action-btn');
      if (!button) return;

      const action = button.getAttribute('data-action');
      const employeeId = button.getAttribute('data-id');
      
      if (!employeeId) return;

      const employee = filteredEmployees.find((emp: any) => emp.id === employeeId);
      if (!employee) return;

      switch (action) {
        case 'docs':
          openDocumentsModal(employee);
          break;
        case 'edit':
          handleEditEmployee(employee);
          break;
        case 'delete':
          handleDeleteEmployee(employee);
          break;
      }
    };

    // Agregar listener al documento
    document.addEventListener('click', handleActionClick);
    return () => document.removeEventListener('click', handleActionClick);
  }, [filteredEmployees]);

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
      const response = await api.getEmployees(1, 500);
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
    if (filters.salaryRange_min && !isNaN(parseFloat(filters.salaryRange_min))) {
      result = result.filter((emp: any) => emp.baseSalary >= parseFloat(filters.salaryRange_min));
    }
    if (filters.salaryRange_max && !isNaN(parseFloat(filters.salaryRange_max))) {
      result = result.filter((emp: any) => emp.baseSalary <= parseFloat(filters.salaryRange_max));
    }
    if (filters.hireDateFrom) {
      result = result.filter((emp: any) => emp.hireDate && emp.hireDate.split('T')[0] >= filters.hireDateFrom);
    }
    if (filters.hireDateTo) {
      result = result.filter((emp: any) => emp.hireDate && emp.hireDate.split('T')[0] <= filters.hireDateTo);
    }
    if (filters.contractEndDateFrom) {
      result = result.filter((emp: any) => emp.contractEndDate && emp.contractEndDate.split('T')[0] >= filters.contractEndDateFrom);
    }
    if (filters.contractEndDateTo) {
      result = result.filter((emp: any) => emp.contractEndDate && emp.contractEndDate.split('T')[0] <= filters.contractEndDateTo);
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

  const handleEditEmployee = (employee: any) => {
    setFormData({
      firstName: employee.firstName || '',
      lastName: employee.lastName || '',
      email: employee.email || '',
      cedula: employee.cedula || '',
      phone: employee.phone || '',
      departmentId: employee.departmentId || '',
      positionId: employee.positionId || '',
      hireDate: employee.hireDate?.split('T')[0] || '',
      baseSalary: employee.baseSalary?.toString() || '',
      dateOfBirth: employee.dateOfBirth?.split('T')[0] || '',
      gender: employee.gender || '',
      maritalStatus: employee.maritalStatus || '',
      address: employee.address || '',
      contractType: employee.contractType || '',
      currentContract: employee.currentContract || '',
      contractEndDate: employee.contractEndDate?.split('T')[0] || '',
    });
    setEditingId(employee.id);
    setShowForm(true);
  };

  const handleDeleteEmployee = (employee: any) => {
    showConfirm(`¿Estás seguro de que deseas eliminar a ${employee.firstName} ${employee.lastName}?`, async () => {
      try {
        await api.client.delete(`/employees/${employee.id}`);
        showSuccess('Empleado eliminado exitosamente');
        fetchEmployees();
      } catch (error) {
        console.error('Error deleting employee:', error);
        showError('Error al eliminar el empleado');
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
          {showForm ? '✕ Cancelar' : '+ Nuevo Empleado'}
        </button>

        <button
          onClick={() => {
            showConfirm('¿Estás seguro de que deseas eliminar todos los empleados? Esta acción no se puede deshacer.', async () => {
              try {
                setLoading(true);
                await api.client.delete('/employees/clear');
                await fetchEmployees();
                showSuccess('Todos los empleados han sido eliminados exitosamente');
              } catch (error) {
                console.error('Error clearing employees:', error);
                showError('Error al eliminar los empleados');
              } finally {
                setLoading(false);
              }
            });
          }}
          disabled={loading}
          style={{
            padding: '10px 20px',
            background: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            opacity: loading ? 0.6 : 1,
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => !loading && (e.currentTarget.style.background = '#bb2d3b')}
          onMouseLeave={(e) => (e.currentTarget.style.background = '#dc3545')}
        >
          🗑️ Eliminar todos los Empleados
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
          <h3 style={{ marginTop: 0, color: theme === 'light' ? '#333' : '#ffffff' }}>{editingId ? 'Editar Empleado' : 'Registrar Nuevo Empleado'}</h3>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px' }}>
            <InputField
              label="Nombre"
              name="firstName"
              type="text"
              value={formData.firstName}
              onChange={handleChange}
              required
            />
            <InputField
              label="Apellido"
              name="lastName"
              type="text"
              value={formData.lastName}
              onChange={handleChange}
              required
            />
            <InputField
              label="Email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
            />
            <SelectField
              label="Centro de Costo"
              name="departmentId"
              value={formData.departmentId}
              onChange={handleChange}
              options={departments.map((dept: any) => ({ value: dept.id, label: dept.name }))}
              placeholder="Seleccionar Centro de Costo"
              required
            />
            <SelectField
              label="Puesto"
              name="positionId"
              value={formData.positionId}
              onChange={handleChange}
              options={positions
                .filter((pos: any) => pos.departmentId === formData.departmentId)
                .map((pos: any) => ({ value: pos.id, label: pos.name }))}
              placeholder={!formData.departmentId ? 'Selecciona un centro de costo primero' : 'Seleccionar Puesto'}
              required
              disabled={!formData.departmentId}
            />
            <InputField
              label="Fecha de Ingreso"
              name="hireDate"
              type="date"
              value={formData.hireDate}
              onChange={handleChange}
            />
            <InputField
              label="Salario Base"
              name="baseSalary"
              type="number"
              value={formData.baseSalary}
              onChange={handleChange}
            />
            <SelectField
              label="Tipo de Contrato"
              name="contractType"
              value={formData.contractType}
              onChange={handleChange}
              options={[
                { value: 'indefinite', label: 'Indefinido' },
                { value: 'fixed', label: 'Plazo Fijo' },
                { value: 'temporary', label: 'Temporal' },
                { value: 'intern', label: 'Practicante' },
              ]}
              placeholder="Seleccionar Tipo de Contrato"
            />
            <InputField
              label="Contrato Actual"
              name="currentContract"
              type="text"
              value={formData.currentContract}
              onChange={handleChange}
            />
            <InputField
              label="Fecha Terminación Contrato"
              name="contractEndDate"
              type="date"
              value={formData.contractEndDate}
              onChange={handleChange}
            />
            <button
              type="submit"
              style={{
                gridColumn: '1 / -1',
                padding: '10px',
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
          <DataTableAdvanced
            columns={[
            {
              title: 'Cédula',
              data: 'cedula',
              render: (data) => data || '-',
            },
            {
              title: 'Apellidos-Nombres',
              data: 'firstName',
              render: (data, type, row) => `${row.lastName} ${row.firstName}`,
            },
            {
              title: 'Tipo Contrato',
              data: 'contractType',
              render: (data) => {
                const types: Record<string, string> = {
                  'indefinite': 'Indefinido',
                  'fixed': 'Plazo Fijo',
                  'temporary': 'Temporal',
                  'intern': 'Practicante',
                };
                return types[data] || '-';
              },
            },
            {
              title: 'Contrato Actual',
              data: 'currentContract',
              render: (data) => data || '-',
            },
            {
              title: 'Cargo',
              data: 'positionId',
              render: (data) => positions.find((p: any) => p.id === data)?.name || '-',
            },
            {
              title: 'Centro de Costo',
              data: 'departmentId',
              render: (data) => departments.find((d: any) => d.id === data)?.name || '-',
            },
            {
              title: 'Sueldo',
              data: 'baseSalary',
              render: (data) => `$${data?.toLocaleString() || '-'}`,
            },
            {
              title: 'Fecha de Ingreso',
              data: 'hireDate',
              render: (data) => data?.split('T')[0] || '-',
            },
            {
              title: 'Estado',
              data: 'status',
              render: (data) => {
                const bgColor = data === 'active' ? '#d4edda' : '#f8d7da';
                const textColor = data === 'active' ? '#155724' : '#721c24';
                const text = data === 'active' ? 'Activo' : 'Inactivo';
                return `<span style="background: ${bgColor}; color: ${textColor}; padding: 4px 8px; border-radius: 3px; font-size: 11px;">${text}</span>`;
              },
            },
            {
              title: 'Acciones',
              data: null,
              render: (data, type, row) => {
                return `<div style="display: flex; gap: 8px; flex-wrap: wrap;">
                  <button class="action-btn docs-btn" data-id="${row.id}" data-action="docs">📄</button>
                  <button class="action-btn edit-btn" data-id="${row.id}" data-action="edit">✏️</button>
                  <button class="action-btn delete-btn" data-id="${row.id}" data-action="delete">🗑</button>
                </div>`;
              },
            },
          ]}
          data={filteredEmployees}
          pageLength={12}
          excludeColumns={[9]}
          />
      )}

      <div style={{ marginTop: '20px', color: theme === 'light' ? '#666' : '#9ca3af', fontSize: '14px' }}>
        Total de registros: <strong>{filteredEmployees.length}</strong>
      </div>
      
      <style>{`
        .action-btn {
          padding: 6px 12px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
          transition: all 0.2s ease;
        }
        
        .docs-btn {
          background: #00A86B;
          color: white;
        }
        
        .docs-btn:hover {
          background: #008C5A;
        }
        
        .edit-btn {
          background: #00A86B;
          color: white;
        }
        
        .edit-btn:hover {
          background: #008C5A;
        }
        
        .delete-btn {
          background: #dc3545;
          color: white;
        }
        
        .delete-btn:hover {
          background: #c82333;
        }
      `}</style>

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
                    background: selectedFiles.length > 0 && selectedCategory && !uploadingDoc ? '#00A86B' : '#ccc',
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
                          boxShadow: isExpanded ? '0 4px 12px rgba(0, 140, 90, 0.2)' : '0 2px 4px rgba(0,0,0,0.1)',
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
