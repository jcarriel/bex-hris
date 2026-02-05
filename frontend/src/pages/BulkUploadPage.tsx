import { useState } from 'react';
import api from '../services/api';
import { useThemeStore } from '../stores/themeStore';
import alertify from 'alertifyjs';

export default function BulkUploadPage() {
  const { theme } = useThemeStore();
  const [activeTab, setActiveTab] = useState<'employees' | 'roles' | 'payroll' | 'marcacion'>('employees');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [processingMessage, setProcessingMessage] = useState('');
  const [showNotFoundReport, setShowNotFoundReport] = useState(false);
  const [notFoundEmployees, setNotFoundEmployees] = useState<any[]>([]);
  const [registeredEmployees, setRegisteredEmployees] = useState<any[]>([]);
  const [registrationErrors, setRegistrationErrors] = useState<any[]>([]);
  const [isRegistering, setIsRegistering] = useState(false);
  const [employeeStatus, setEmployeeStatus] = useState<'active' | 'inactive'>('active');

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar que sea un archivo Excel o CSV
    const validTypes = ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv'];
    if (!validTypes.includes(file.type)) {
      alertify.error('Por favor carga un archivo Excel (.xlsx, .xls) o CSV');
      return;
    }

    setUploadedFile(file);
    previewFile(file);
  };

  const previewFile = async (file: File) => {
    try {
      // Aquí se podría usar una librería como xlsx para leer el archivo
      // Por ahora, mostraremos un mensaje de que se cargó correctamente
      alertify.success('Archivo cargado. Listo para procesar.');
      setShowPreview(true);
    } catch (error) {
      alertify.error('Error al leer el archivo');
    }
  };

  const handleUpload = async () => {
    if (!uploadedFile) {
      alertify.error('Por favor selecciona un archivo');
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setProcessingMessage('Subiendo archivo...');

    try {
      const formData = new FormData();
      formData.append('file', uploadedFile);
      formData.append('type', activeTab);
      if (activeTab === 'employees') {
        formData.append('status', employeeStatus);
      }

      const response = await api.client.post('/bulk-upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent: any) => {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(progress);
          if (progress < 100) {
            setProcessingMessage(`Subiendo archivo... ${progress}%`);
          } else {
            setProcessingMessage('Procesando datos...');
          }
        },
      });

      if (response.data.success) {
        setProcessingMessage('');
        alertify.success(`${response.data.data.processedCount} registros importados exitosamente`);
        
        // Registrar automáticamente empleados no encontrados si es carga de nómina
        if (activeTab === 'payroll' && response.data.data.notFoundEmployees && response.data.data.notFoundEmployees.length > 0) {
          setNotFoundEmployees(response.data.data.notFoundEmployees);
          // Registrar automáticamente
          await handleRegisterNotFoundEmployees(response.data.data.notFoundEmployees);
        }
        
        if (response.data.data.errors && response.data.data.errors.length > 0) {
          alertify.warning(`${response.data.data.errors.length} registros con errores`);
        }
        setUploadedFile(null);
        setShowPreview(false);
        setUploadProgress(0);
      }
    } catch (error: any) {
      setProcessingMessage('');
      alertify.error(error.response?.data?.message || 'Error al cargar el archivo');
    } finally {
      setUploading(false);
      setProcessingMessage('');
    }
  };

  const handleRegisterNotFoundEmployees = async (employees?: any[]) => {
    setIsRegistering(true);
    const employeesToRegister = employees || notFoundEmployees;
    try {
      const response = await api.client.post('/employees/register-not-found', {
        employees: employeesToRegister,
      });

      if (response.data.success) {
        setRegisteredEmployees(response.data.data.registered || []);
        setRegistrationErrors(response.data.data.errors || []);
        setShowNotFoundReport(true);
        
        const registeredCount = response.data.data.registered?.length || 0;
        const errorCount = response.data.data.errors?.length || 0;
        
        alertify.success(`✓ ${registeredCount} empleados registrados automáticamente (no encontrados en la BD)`);
        if (errorCount > 0) {
          alertify.warning(`⚠️ ${errorCount} empleados con errores en el registro`);
        }
      }
    } catch (error: any) {
      alertify.error(error.response?.data?.message || 'Error al registrar empleados');
      console.error('Error registering employees:', error);
    } finally {
      setIsRegistering(false);
    }
  };

  const downloadTemplate = () => {
    // Crear un CSV de plantilla
    const template = activeTab === 'employees' 
      ? 'Apellidos,Nombres,Cedula,TipoContrato,ContratoActual,Cargo,Labor,CentroDeCosto,Sueldo,FechaNacimiento,Edad,Genero,FechaIngreso,Mes,Año,EstadoCivil,Procedencia,Direccion,FechaTerminacionContrato,Email,Telefono\n'
      : 'Empleado,Cedula,Rol,Mes,Año,Salario\n';
    
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(template));
    element.setAttribute('download', `plantilla_${activeTab}.csv`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    alertify.success('Plantilla descargada');
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2 style={{ color: theme === 'light' ? '#333' : '#e5e7eb', marginBottom: '20px' }}>
        Carga Masiva de Datos
      </h2>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: `2px solid ${theme === 'light' ? '#eee' : '#374151'}` }}>
        <button
          onClick={() => setActiveTab('employees')}
          style={{
            padding: '10px 20px',
            background: activeTab === 'employees' ? '#00A86B' : (theme === 'light' ? '#f5f7fa' : '#374151'),
            color: activeTab === 'employees' ? 'white' : (theme === 'light' ? '#666' : '#9ca3af'),
            border: 'none',
            borderRadius: '5px 5px 0 0',
            transition: 'background 0.2s',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: activeTab === 'employees' ? 'bold' : 'normal',
          }}
        >
          👥 Empleados
        </button>
        <button
          onClick={() => setActiveTab('roles')}
          style={{
            padding: '10px 20px',
            background: activeTab === 'roles' ? '#00A86B' : (theme === 'light' ? '#f5f7fa' : '#374151'),
            color: activeTab === 'roles' ? 'white' : (theme === 'light' ? '#666' : '#9ca3af'),
            border: 'none',
            borderRadius: '5px 5px 0 0',
            transition: 'background 0.2s',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: activeTab === 'roles' ? 'bold' : 'normal',
          }}
        >
          💼 Roles por Mes
        </button>
        <button
          onClick={() => setActiveTab('payroll')}
          style={{
            padding: '10px 20px',
            background: activeTab === 'payroll' ? '#00A86B' : (theme === 'light' ? '#f5f7fa' : '#374151'),
            color: activeTab === 'payroll' ? 'white' : (theme === 'light' ? '#666' : '#9ca3af'),
            border: 'none',
            borderRadius: '5px 5px 0 0',
            transition: 'background 0.2s',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: activeTab === 'payroll' ? 'bold' : 'normal',
          }}
        >
          📊 Nómina
        </button>
        <button
          onClick={() => setActiveTab('marcacion')}
          style={{
            padding: '10px 20px',
            background: activeTab === 'marcacion' ? '#00A86B' : (theme === 'light' ? '#f5f7fa' : '#374151'),
            color: activeTab === 'marcacion' ? 'white' : (theme === 'light' ? '#666' : '#9ca3af'),
            border: 'none',
            borderRadius: '5px 5px 0 0',
            transition: 'background 0.2s',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: activeTab === 'marcacion' ? 'bold' : 'normal',
          }}
        >
          ⏱️ Marcación
        </button>
      </div>

      {/* Content */}
      <div style={{
        background: theme === 'light' ? 'white' : '#1f2937',
        padding: '30px',
        borderRadius: '8px',
        border: `1px solid ${theme === 'light' ? '#eee' : '#374151'}`,
      }}>
        {activeTab === 'employees' && (
          <div>
            <h3 style={{ color: theme === 'light' ? '#333' : '#e5e7eb', marginBottom: '20px' }}>
              Importar Empleados
            </h3>
            <p style={{ color: theme === 'light' ? '#666' : '#9ca3af', marginBottom: '20px' }}>
              Carga un archivo Excel o CSV con la información de empleados. Descarga la plantilla para ver el formato requerido.
            </p>

            <div style={{ marginBottom: '20px', padding: '15px', background: theme === 'light' ? '#f5f7fa' : '#374151', borderRadius: '8px', border: `1px solid ${theme === 'light' ? '#ddd' : '#4b5563'}` }}>
              <label style={{ color: theme === 'light' ? '#333' : '#e5e7eb', fontWeight: '600', display: 'block', marginBottom: '10px' }}>
                Tipo de Empleado:
              </label>
              <div style={{ display: 'flex', gap: '15px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="employeeStatus"
                    value="active"
                    checked={employeeStatus === 'active'}
                    onChange={(e) => setEmployeeStatus(e.target.value as 'active' | 'inactive')}
                    style={{ cursor: 'pointer' }}
                  />
                  <span style={{ color: theme === 'light' ? '#333' : '#e5e7eb' }}>
                    👷 Trabajadores (Activos)
                  </span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="employeeStatus"
                    value="inactive"
                    checked={employeeStatus === 'inactive'}
                    onChange={(e) => setEmployeeStatus(e.target.value as 'active' | 'inactive')}
                    style={{ cursor: 'pointer' }}
                  />
                  <span style={{ color: theme === 'light' ? '#333' : '#e5e7eb' }}>
                    🚫 Extrabajadores (Inactivos)
                  </span>
                </label>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
              <button
                onClick={downloadTemplate}
                style={{
                  padding: '10px 20px',
                  background: '#17a2b8',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                📥 Descargar Plantilla
              </button>
            </div>

            <div
              style={{
                padding: '40px',
                border: `2px dashed ${theme === 'light' ? '#ddd' : '#4b5563'}`,
                borderRadius: '8px',
                textAlign: 'center',
                background: theme === 'light' ? '#f9f9f9' : '#374151',
                cursor: 'pointer',
                marginBottom: '20px',
              }}
              onClick={() => document.getElementById('fileInput')?.click()}
            >
              <input
                id="fileInput"
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
              <div style={{ fontSize: '32px', marginBottom: '10px' }}>📁</div>
              <div style={{ color: theme === 'light' ? '#333' : '#e5e7eb', fontWeight: '600', marginBottom: '5px' }}>
                {uploadedFile ? uploadedFile.name : 'Haz clic o arrastra un archivo'}
              </div>
              <div style={{ fontSize: '12px', color: theme === 'light' ? '#999' : '#9ca3af' }}>
                Formatos soportados: Excel (.xlsx, .xls) o CSV
              </div>
            </div>

            {processingMessage && (
              <div style={{
                padding: '15px',
                marginBottom: '20px',
                background: theme === 'light' ? '#e3f2fd' : '#1e3a5f',
                border: `1px solid ${theme === 'light' ? '#90caf9' : '#42a5f5'}`,
                borderRadius: '5px',
                color: theme === 'light' ? '#1565c0' : '#90caf9',
                textAlign: 'center',
                fontWeight: '500',
              }}>
                ⏳ {processingMessage}
              </div>
            )}

            {uploadedFile && (
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={handleUpload}
                  disabled={uploading}
                  style={{
                    padding: '10px 20px',
                    background: uploading ? '#ccc' : '#00A86B',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: uploading ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    transition: 'background 0.2s',
                  }}
                  onMouseEnter={(e) => !uploading && (e.currentTarget.style.background = '#008C5A')}
                  onMouseLeave={(e) => !uploading && (e.currentTarget.style.background = '#00A86B')}
                >
                  {uploading ? `Cargando... ${uploadProgress}%` : '✓ Cargar Empleados'}
                </button>
                <button
                  onClick={() => {
                    setUploadedFile(null);
                    setShowPreview(false);
                  }}
                  style={{
                    padding: '10px 20px',
                    background: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    fontSize: '14px',
                  }}
                >
                  ✕ Cancelar
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'roles' && (
          <div>
            <h3 style={{ color: theme === 'light' ? '#333' : '#e5e7eb', marginBottom: '20px' }}>
              Importar Roles por Mes
            </h3>
            <p style={{ color: theme === 'light' ? '#666' : '#9ca3af', marginBottom: '20px' }}>
              Carga un archivo Excel o CSV con la información de roles y salarios por mes. Descarga la plantilla para ver el formato requerido.
            </p>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
              <button
                onClick={downloadTemplate}
                style={{
                  padding: '10px 20px',
                  background: '#17a2b8',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                📥 Descargar Plantilla
              </button>
            </div>

            <div
              style={{
                padding: '40px',
                border: `2px dashed ${theme === 'light' ? '#ddd' : '#4b5563'}`,
                borderRadius: '8px',
                textAlign: 'center',
                background: theme === 'light' ? '#f9f9f9' : '#374151',
                cursor: 'pointer',
                marginBottom: '20px',
              }}
              onClick={() => document.getElementById('fileInput2')?.click()}
            >
              <input
                id="fileInput2"
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
              <div style={{ fontSize: '32px', marginBottom: '10px' }}>📁</div>
              <div style={{ color: theme === 'light' ? '#333' : '#e5e7eb', fontWeight: '600', marginBottom: '5px' }}>
                {uploadedFile ? uploadedFile.name : 'Haz clic o arrastra un archivo'}
              </div>
              <div style={{ fontSize: '12px', color: theme === 'light' ? '#999' : '#9ca3af' }}>
                Formatos soportados: Excel (.xlsx, .xls) o CSV
              </div>
            </div>

            {uploadedFile && (
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={handleUpload}
                  disabled={uploading}
                  style={{
                    padding: '10px 20px',
                    background: uploading ? '#ccc' : '#00A86B',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: uploading ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    transition: 'background 0.2s',
                  }}
                  onMouseEnter={(e) => !uploading && (e.currentTarget.style.background = '#008C5A')}
                  onMouseLeave={(e) => !uploading && (e.currentTarget.style.background = '#00A86B')}
                >
                  {uploading ? `Cargando... ${uploadProgress}%` : '✓ Cargar Roles'}
                </button>
                <button
                  onClick={() => {
                    setUploadedFile(null);
                    setShowPreview(false);
                  }}
                  style={{
                    padding: '10px 20px',
                    background: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    fontSize: '14px',
                  }}
                >
                  ✕ Cancelar
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'payroll' && (
          <div>
            <h3 style={{ color: theme === 'light' ? '#333' : '#e5e7eb', marginBottom: '20px' }}>
              Importar Nómina
            </h3>
            <p style={{ color: theme === 'light' ? '#666' : '#9ca3af', marginBottom: '20px' }}>
              Carga un archivo Excel (.xlsx) con la información de nómina. El archivo debe contener los 35 campos de nómina en el orden especificado.
            </p>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
              <button
                onClick={downloadTemplate}
                style={{
                  padding: '10px 20px',
                  background: '#17a2b8',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                📥 Descargar Plantilla
              </button>
            </div>

            <div
              style={{
                padding: '40px',
                border: `2px dashed ${theme === 'light' ? '#ddd' : '#4b5563'}`,
                borderRadius: '8px',
                textAlign: 'center',
                background: theme === 'light' ? '#f9f9f9' : '#374151',
                cursor: 'pointer',
                marginBottom: '20px',
              }}
              onClick={() => document.getElementById('fileInput3')?.click()}
            >
              <input
                id="fileInput3"
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
              <div style={{ fontSize: '32px', marginBottom: '10px' }}>📁</div>
              <div style={{ color: theme === 'light' ? '#333' : '#e5e7eb', fontWeight: '600', marginBottom: '5px' }}>
                {uploadedFile ? uploadedFile.name : 'Haz clic o arrastra un archivo'}
              </div>
              <div style={{ fontSize: '12px', color: theme === 'light' ? '#999' : '#9ca3af' }}>
                Formatos soportados: Excel (.xlsx, .xls)
              </div>
            </div>

            {uploadedFile && (
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={handleUpload}
                  disabled={uploading}
                  style={{
                    padding: '10px 20px',
                    background: uploading ? '#ccc' : '#00A86B',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: uploading ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    transition: 'background 0.2s',
                  }}
                  onMouseEnter={(e) => !uploading && (e.currentTarget.style.background = '#008C5A')}
                  onMouseLeave={(e) => !uploading && (e.currentTarget.style.background = '#00A86B')}
                >
                  {uploading ? `Cargando... ${uploadProgress}%` : '✓ Cargar Nómina'}
                </button>
                <button
                  onClick={() => {
                    setUploadedFile(null);
                    setShowPreview(false);
                  }}
                  style={{
                    padding: '10px 20px',
                    background: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    fontSize: '14px',
                  }}
                >
                  ✕ Cancelar
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'marcacion' && (
          <div>
            <h3 style={{ color: theme === 'light' ? '#333' : '#e5e7eb', marginBottom: '20px' }}>
              Importar Marcación (Asistencia)
            </h3>
            <p style={{ color: theme === 'light' ? '#666' : '#9ca3af', marginBottom: '20px' }}>
              Carga un archivo Excel (.xlsx) con los registros de marcación diaria. El archivo debe contener los campos: Id del Empleado, Nombres, Departamento, Mes, Fecha, Asistencia Diaria, Primera Marcación, Última Marcación, Tiempo Total.
            </p>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
              <button
                onClick={downloadTemplate}
                style={{
                  padding: '10px 20px',
                  background: '#17a2b8',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                📥 Descargar Plantilla
              </button>
            </div>

            <div
              style={{
                padding: '40px',
                border: `2px dashed ${theme === 'light' ? '#ddd' : '#4b5563'}`,
                borderRadius: '8px',
                textAlign: 'center',
                background: theme === 'light' ? '#f9f9f9' : '#374151',
                cursor: 'pointer',
                marginBottom: '20px',
              }}
              onClick={() => document.getElementById('fileInput4')?.click()}
            >
              <input
                id="fileInput4"
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
              <div style={{ fontSize: '32px', marginBottom: '10px' }}>📁</div>
              <div style={{ color: theme === 'light' ? '#333' : '#e5e7eb', fontWeight: '600', marginBottom: '5px' }}>
                {uploadedFile ? uploadedFile.name : 'Haz clic o arrastra un archivo'}
              </div>
              <div style={{ fontSize: '12px', color: theme === 'light' ? '#999' : '#9ca3af' }}>
                Formatos soportados: Excel (.xlsx, .xls)
              </div>
            </div>

            {processingMessage && (
              <div style={{
                padding: '15px',
                marginBottom: '20px',
                background: theme === 'light' ? '#e3f2fd' : '#1e3a5f',
                border: `1px solid ${theme === 'light' ? '#90caf9' : '#42a5f5'}`,
                borderRadius: '5px',
                color: theme === 'light' ? '#1565c0' : '#90caf9',
                textAlign: 'center',
                fontWeight: '500',
              }}>
                ⏳ {processingMessage}
              </div>
            )}

            {uploadedFile && (
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={handleUpload}
                  disabled={uploading}
                  style={{
                    padding: '10px 20px',
                    background: uploading ? '#ccc' : '#00A86B',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: uploading ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    transition: 'background 0.2s',
                  }}
                  onMouseEnter={(e) => !uploading && (e.currentTarget.style.background = '#008C5A')}
                  onMouseLeave={(e) => !uploading && (e.currentTarget.style.background = '#00A86B')}
                >
                  {uploading ? `Cargando... ${uploadProgress}%` : '✓ Cargar Marcación'}
                </button>
                <button
                  onClick={() => {
                    setUploadedFile(null);
                    setShowPreview(false);
                  }}
                  style={{
                    padding: '10px 20px',
                    background: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    fontSize: '14px',
                  }}
                >
                  ✕ Cancelar
                </button>
              </div>
            )}
          </div>
        )}

        {/* Modal de reporte de empleados no encontrados */}
        {showNotFoundReport && (
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
              background: theme === 'light' ? 'white' : '#1f2937',
              borderRadius: '8px',
              padding: '30px',
              maxWidth: '900px',
              maxHeight: '90vh',
              overflow: 'auto',
              boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
            }}>
              <div style={{ marginBottom: '20px' }}>
                <h2 style={{
                  margin: '0 0 10px 0',
                  color: theme === 'light' ? '#333' : '#fff',
                  fontSize: '20px',
                }}>
                  ⚠️ Empleados No Encontrados
                </h2>
                <p style={{
                  margin: '0',
                  color: theme === 'light' ? '#666' : '#9ca3af',
                  fontSize: '14px',
                }}>
                  {registeredEmployees.length > 0 
                    ? `${registeredEmployees.length} empleados registrados, ${notFoundEmployees.length - registeredEmployees.length} pendientes`
                    : `${notFoundEmployees.length} empleados no se encontraron en la base de datos`
                  }
                </p>
              </div>

              {/* Tabla de empleados no encontrados */}
              <div style={{
                background: theme === 'light' ? '#f8f9fa' : '#374151',
                borderRadius: '6px',
                padding: '15px',
                marginBottom: '20px',
                maxHeight: '300px',
                overflow: 'auto',
              }}>
                <h4 style={{
                  margin: '0 0 15px 0',
                  color: theme === 'light' ? '#333' : '#fff',
                  fontSize: '14px',
                }}>Empleados a Registrar</h4>
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '13px',
                }}>
                  <thead>
                    <tr style={{
                      borderBottom: `2px solid ${theme === 'light' ? '#ddd' : '#4b5563'}`,
                    }}>
                      <th style={{
                        padding: '10px',
                        textAlign: 'left',
                        color: theme === 'light' ? '#333' : '#fff',
                        fontWeight: '600',
                      }}>Cédula</th>
                      <th style={{
                        padding: '10px',
                        textAlign: 'left',
                        color: theme === 'light' ? '#333' : '#fff',
                        fontWeight: '600',
                      }}>Nombre</th>
                    </tr>
                  </thead>
                  <tbody>
                    {notFoundEmployees.map((emp: any, idx: number) => (
                      <tr key={idx} style={{
                        borderBottom: `1px solid ${theme === 'light' ? '#eee' : '#4b5563'}`,
                        background: idx % 2 === 0 ? (theme === 'light' ? '#fff' : '#1f2937') : (theme === 'light' ? '#f8f9fa' : '#374151'),
                      }}>
                        <td style={{
                          padding: '10px',
                          color: theme === 'light' ? '#333' : '#fff',
                          fontFamily: 'monospace',
                          fontWeight: '600',
                        }}>{emp.cedula}</td>
                        <td style={{
                          padding: '10px',
                          color: theme === 'light' ? '#666' : '#9ca3af',
                        }}>{emp.name || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Tabla de empleados registrados */}
              {registeredEmployees.length > 0 && (
                <div style={{
                  background: theme === 'light' ? '#d4edda' : '#1e3a1f',
                  borderRadius: '6px',
                  padding: '15px',
                  marginBottom: '20px',
                  maxHeight: '300px',
                  overflow: 'auto',
                  border: `1px solid ${theme === 'light' ? '#c3e6cb' : '#4ade80'}`,
                }}>
                  <h4 style={{
                    margin: '0 0 15px 0',
                    color: theme === 'light' ? '#155724' : '#86efac',
                    fontSize: '14px',
                  }}>✓ Empleados Registrados</h4>
                  <table style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: '13px',
                  }}>
                    <thead>
                      <tr style={{
                        borderBottom: `2px solid ${theme === 'light' ? '#c3e6cb' : '#4ade80'}`,
                      }}>
                        <th style={{
                          padding: '10px',
                          textAlign: 'left',
                          color: theme === 'light' ? '#155724' : '#86efac',
                          fontWeight: '600',
                        }}>Cédula</th>
                        <th style={{
                          padding: '10px',
                          textAlign: 'left',
                          color: theme === 'light' ? '#155724' : '#86efac',
                          fontWeight: '600',
                        }}>Nombre</th>
                        <th style={{
                          padding: '10px',
                          textAlign: 'left',
                          color: theme === 'light' ? '#155724' : '#86efac',
                          fontWeight: '600',
                        }}>Campos Faltantes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {registeredEmployees.map((emp: any, idx: number) => (
                        <tr key={idx} style={{
                          borderBottom: `1px solid ${theme === 'light' ? '#c3e6cb' : '#4ade80'}`,
                          background: idx % 2 === 0 
                            ? (theme === 'light' ? '#f1f8f4' : '#0f2818') 
                            : (theme === 'light' ? '#d4edda' : '#1e3a1f'),
                        }}>
                          <td style={{
                            padding: '10px',
                            color: theme === 'light' ? '#155724' : '#86efac',
                            fontFamily: 'monospace',
                            fontWeight: '600',
                          }}>{emp.cedula}</td>
                          <td style={{
                            padding: '10px',
                            color: theme === 'light' ? '#155724' : '#86efac',
                          }}>{emp.firstName} {emp.lastName}</td>
                          <td style={{
                            padding: '10px',
                            color: theme === 'light' ? '#856404' : '#fcd34d',
                            fontSize: '12px',
                          }}>
                            {emp.missingFields?.join(', ') || 'Ninguno'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Errores de registro */}
              {registrationErrors.length > 0 && (
                <div style={{
                  background: theme === 'light' ? '#f8d7da' : '#7c2d12',
                  borderRadius: '6px',
                  padding: '15px',
                  marginBottom: '20px',
                  border: `1px solid ${theme === 'light' ? '#f5c6cb' : '#ea580c'}`,
                }}>
                  <h4 style={{
                    margin: '0 0 10px 0',
                    color: theme === 'light' ? '#721c24' : '#fda29b',
                    fontSize: '14px',
                  }}>❌ Errores en Registro</h4>
                  {registrationErrors.map((err: any, idx: number) => (
                    <div key={idx} style={{
                      padding: '8px',
                      color: theme === 'light' ? '#721c24' : '#fda29b',
                      fontSize: '12px',
                      borderBottom: idx < registrationErrors.length - 1 ? `1px solid ${theme === 'light' ? '#f5c6cb' : '#ea580c'}` : 'none',
                    }}>
                      <strong>{err.cedula}</strong> - {err.error}
                    </div>
                  ))}
                </div>
              )}

              <div style={{
                background: theme === 'light' ? '#fff3cd' : '#78350f',
                border: `1px solid ${theme === 'light' ? '#ffc107' : '#b45309'}`,
                borderRadius: '6px',
                padding: '12px',
                marginBottom: '20px',
                fontSize: '13px',
                color: theme === 'light' ? '#856404' : '#fcd34d',
              }}>
                <strong>💡 Nota:</strong> Los empleados registrados tienen datos faltantes que debes completar en la sección → Empleados.
              </div>

              <div style={{
                display: 'flex',
                gap: '10px',
                justifyContent: 'flex-end',
              }}>
                {registeredEmployees.length > 0 && (
                  <button
                    onClick={() => {
                      // Descargar CSV con empleados registrados
                      const csv = 'Cédula,Nombre,Campos Faltantes\n' + registeredEmployees.map((e: any) => `${e.cedula},"${e.firstName} ${e.lastName}","${e.missingFields?.join(', ') || ''}"`).join('\n');
                      const element = document.createElement('a');
                      element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv));
                      element.setAttribute('download', 'empleados_registrados.csv');
                      element.style.display = 'none';
                      document.body.appendChild(element);
                      element.click();
                      document.body.removeChild(element);
                    }}
                    style={{
                      padding: '10px 20px',
                      background: '#17a2b8',
                      color: 'white',
                      border: 'none',
                      borderRadius: '5px',
                      cursor: 'pointer',
                      fontSize: '14px',
                    }}
                  >
                    📥 Descargar CSV
                  </button>
                )}
                <button
                  onClick={() => {
                    setShowNotFoundReport(false);
                    setRegisteredEmployees([]);
                    setRegistrationErrors([]);
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
                  ✓ Cerrar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
