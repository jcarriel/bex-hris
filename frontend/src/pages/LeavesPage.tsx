import { useState, useEffect } from 'react';
import api from '../services/api';
import { useThemeStore } from '../stores/themeStore';
import InputField from '../components/InputField';
import DataTableAdvanced from '../components/DataTableAdvanced';
import { generateVacationDocument } from '../utils/vacationDocGenerator';

export default function LeavesPage() {
  const { theme } = useThemeStore();
  const [leaves, setLeaves] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedLeave, setSelectedLeave] = useState<any>(null);
  const [showLeaveDetail, setShowLeaveDetail] = useState(false);
  const [filterEmployee, setFilterEmployee] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [formData, setFormData] = useState({
    employeeId: '',
    employeeName: '',
    type: 'vacation',
    startDate: '',
    endDate: '',
    reason: '',
    document: null as File | null,
    vacationPeriod: '2024-2025',
    location: 'Naranjal',
  });
  const [lastCreatedLeave, setLastCreatedLeave] = useState<any>(null);
  const [showDownloadButton, setShowDownloadButton] = useState(false);

  const fetchEmployees = async () => {
    try {
      const response = await api.getEmployees(1, 1000);
      setEmployees(response.data.data.data || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const fetchLeaves = async () => {
    try {
      setLoading(true);
      const response = await api.client.get('/leaves');
      setLeaves(response.data.data || []);
    } catch (error) {
      console.error('Error fetching leaves:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
    fetchEmployees();
  }, []);

  const getFilteredLeaves = () => {
    let result = leaves.filter((l: any) => filterStatus === 'all' || l.status === filterStatus);

    if (filterEmployee) {
      result = result.filter((l: any) =>
        getEmployeeName(l.employeeId).toLowerCase().includes(filterEmployee.toLowerCase()) ||
        getEmployeeCedula(l.employeeId).toLowerCase().includes(filterEmployee.toLowerCase())
      );
    }

    if (filterType) {
      result = result.filter((l: any) => l.type === filterType);
    }

    if (filterDateFrom) {
      result = result.filter((l: any) => l.startDate >= filterDateFrom);
    }

    if (filterDateTo) {
      result = result.filter((l: any) => l.endDate <= filterDateTo);
    }

    return result;
  };

  // Manejar clicks en botones de acciones de licencias
  useEffect(() => {
    const handleActionClick = (e: any) => {
      const button = (e.target as HTMLElement).closest('.leave-btn');
      if (!button) return;

      const action = button.getAttribute('data-action');
      const leaveId = button.getAttribute('data-id');
      
      if (!leaveId) return;

      const leave = leaves.find((l: any) => l.id === leaveId);
      if (!leave) return;

      switch (action) {
        case 'view':
          handleViewLeave(leave);
          break;
        case 'approve':
          if (window.confirm(`¿Estás seguro de que deseas aprobar esta licencia?`)) {
            handleApprove(leaveId);
          }
          break;
        case 'download':
          if (leave.documentPath) {
            const link = document.createElement('a');
            link.href = leave.documentPath;
            link.download = `licencia_${leaveId}_documento`;
            link.click();
          }
          break;
        case 'print':
          handlePrintVacation(leave);
          break;
      }
    };

    document.addEventListener('click', handleActionClick, true);
    return () => document.removeEventListener('click', handleActionClick, true);
  }, [leaves]);

  const handleEmployeeSearch = (value: string) => {
    setEmployeeSearch(value);
    if (value.trim()) {
      const filtered = employees.filter((emp: any) =>
        emp.firstName?.toLowerCase().includes(value.toLowerCase()) ||
        emp.lastName?.toLowerCase().includes(value.toLowerCase()) ||
        emp.email?.toLowerCase().includes(value.toLowerCase()) ||
        emp.cedula?.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredEmployees(filtered);
      setShowSuggestions(true);
    } else {
      setFilteredEmployees([]);
      setShowSuggestions(false);
    }
  };

  const handleSelectEmployee = (employee: any) => {
    setFormData((prev) => ({
      ...prev,
      employeeId: employee.id,
      employeeName: `${employee.firstName} ${employee.lastName}`,
    }));
    setEmployeeSearch(`${employee.firstName} ${employee.lastName}`);
    setShowSuggestions(false);
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

      const response = await api.client.post('/leaves', {
        ...formData,
        days,
        status: 'pending',
      });


      setFormData({
        employeeId: '',
        employeeName: '',
        type: 'vacation',
        startDate: '',
        endDate: '',
        reason: '',
        document: null,
        vacationPeriod: '2024-2025',
        location: 'Naranjal',
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

  const getEmployeeName = (employeeId: string) => {
    const employee = employees.find((emp: any) => emp.id === employeeId);
    if (employee) {
      return `${employee.firstName} ${employee.lastName}`;
    }
    return employeeId;
  };

  const getEmployeeCedula = (employeeId: string) => {
    const employee = employees.find((emp: any) => emp.id === employeeId);
    if (employee) {
      return employee.cedula;
    }
    return employeeId;
  };

  const handleViewLeave = (leave: any) => {
    setSelectedLeave(leave);
    setShowLeaveDetail(true);
  };

  const handlePrintVacation = async (leave: any) => {
    try {
      const employee = employees.find((emp: any) => emp.id === leave.employeeId);
      if (employee && leave.type === 'vacation') {
        await generateVacationDocument({
          employeeName: `${employee.firstName} ${employee.lastName}`,
          employeeCedula: employee.cedula,
          companyName: 'COMPAÑÍA BIOEXPORTVAL S.A.S',
          companyManager: 'Ing. Jorge Luis Quiroz Castro',
          managerPosition: 'GERENTE GENERAL',
          vacationDays: leave.days,
          startDate: leave.startDate,
          endDate: leave.endDate,
          period: leave.vacationPeriod || '2024-2025',
          location: leave.location || 'Naranjal',
        });
      }
    } catch (error) {
      console.error('Error generating vacation document:', error);
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={() => setShowForm(!showForm)}
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
            <div style={{ position: 'relative' }}>
              <InputField
                label="Empleado"
                name="employeeName"
                value={employeeSearch}
                onChange={(e) => handleEmployeeSearch(e.target.value)}
                placeholder="Buscar por nombre, email o cédula..."
              />
              {showSuggestions && filteredEmployees.length > 0 && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  background: theme === 'light' ? 'white' : '#374151',
                  border: `1px solid ${theme === 'light' ? '#ddd' : '#4b5563'}`,
                  borderRadius: '5px',
                  maxHeight: '200px',
                  overflowY: 'auto',
                  zIndex: 10,
                  marginTop: '5px',
                  boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                }}>
                  {filteredEmployees.map((emp: any) => (
                    <div
                      key={emp.id}
                      onClick={() => handleSelectEmployee(emp)}
                      style={{
                        padding: '10px 12px',
                        cursor: 'pointer',
                        borderBottom: `1px solid ${theme === 'light' ? '#eee' : '#4b5563'}`,
                        color: theme === 'light' ? '#333' : '#e5e7eb',
                        background: theme === 'light' ? 'white' : '#374151',
                        transition: 'background 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = theme === 'light' ? '#f5f5f5' : '#4b5563';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = theme === 'light' ? 'white' : '#374151';
                      }}
                    >
                      <div style={{ fontWeight: '500' }}>{emp.firstName} {emp.lastName}</div>
                      <div style={{ fontSize: '12px', color: theme === 'light' ? '#666' : '#9ca3af' }}>
                        {emp.cedula} • {emp.email}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label style={{
                display: 'block',
                marginBottom: '6px',
                color: theme === 'light' ? '#555' : '#d1d5db',
                fontSize: '12px',
                fontWeight: '600',
                letterSpacing: '0.5px',
              }}>
                Tipo de Licencia
              </label>
              <select
                name="type"
                value={formData.type}
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  border: `1px solid ${theme === 'light' ? '#ddd' : '#374151'}`,
                  borderRadius: '5px',
                  fontSize: '13px',
                  boxSizing: 'border-box',
                  background: theme === 'light' ? 'white' : '#374151',
                  color: theme === 'light' ? '#333' : '#e5e7eb',
                }}
              >
                <option value="vacation">Vacaciones</option>
                <option value="sick">Enfermedad</option>
                <option value="personal">Personal</option>
                <option value="unpaid">Sin Pago</option>
              </select>
            </div>
            <InputField
              label="Fecha Inicio"
              name="startDate"
              type="date"
              value={formData.startDate}
              onChange={handleChange}
              required
            />
            <InputField
              label="Fecha Fin"
              name="endDate"
              type="date"
              value={formData.endDate}
              onChange={handleChange}
              required
            />
            {formData.type === 'vacation' && (
              <>
                <InputField
                  label="Período de Vacaciones"
                  name="vacationPeriod"
                  value={formData.vacationPeriod}
                  onChange={handleChange}
                  placeholder="Ej: 2024-2025"
                />
                <InputField
                  label="Ubicación"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  placeholder="Ej: Naranjal"
                />
              </>
            )}
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{
                display: 'block',
                marginBottom: '6px',
                color: theme === 'light' ? '#555' : '#d1d5db',
                fontSize: '12px',
                fontWeight: '600',
                letterSpacing: '0.5px',
              }}>
                Motivo
              </label>
              <textarea
                name="reason"
                placeholder="Ingrese el motivo de la licencia"
                value={formData.reason}
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  border: `1px solid ${theme === 'light' ? '#ddd' : '#374151'}`,
                  borderRadius: '5px',
                  fontSize: '13px',
                  boxSizing: 'border-box',
                  background: theme === 'light' ? 'white' : '#374151',
                  color: theme === 'light' ? '#333' : '#e5e7eb',
                  minHeight: '80px',
                  fontFamily: 'Arial, sans-serif',
                }}
              />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{
                display: 'block',
                marginBottom: '6px',
                color: theme === 'light' ? '#555' : '#d1d5db',
                fontSize: '12px',
                fontWeight: '600',
                letterSpacing: '0.5px',
              }}>
                Documento de Respaldo (Opcional)
              </label>
              <input
                type="file"
                onChange={(e) => setFormData({ ...formData, document: e.target.files?.[0] || null })}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  border: `1px solid ${theme === 'light' ? '#ddd' : '#374151'}`,
                  borderRadius: '5px',
                  fontSize: '13px',
                  boxSizing: 'border-box',
                  background: theme === 'light' ? 'white' : '#374151',
                  color: theme === 'light' ? '#333' : '#e5e7eb',
                  cursor: 'pointer',
                }}
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              />
              {formData.document && (
                <div style={{ marginTop: '8px', fontSize: '12px', color: '#667eea' }}>
                  ✓ {formData.document.name}
                </div>
              )}
            </div>
            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '10px' }}>
              <button
                type="submit"
                style={{
                  flex: 1,
                  padding: '12px',
                  background: '#00A86B',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#008C5A'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#00A86B'}
              >
                Registrar Licencia
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: theme === 'light' ? '#f0f0f0' : '#374151',
                  color: theme === 'light' ? '#333' : '#e5e7eb',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = theme === 'light' ? '#e0e0e0' : '#4b5563'}
                onMouseLeave={(e) => e.currentTarget.style.background = theme === 'light' ? '#f0f0f0' : '#374151'}
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <button
          onClick={() => setFilterStatus('all')}
          style={{
            padding: '8px 16px',
            background: filterStatus === 'all' ? '#00A86B' : theme === 'light' ? '#f0f0f0' : '#374151',
            color: filterStatus === 'all' ? 'white' : theme === 'light' ? '#333' : '#e5e7eb',
            border: 'none',
            borderRadius: '5px',
            transition: 'background 0.2s',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: filterStatus === 'all' ? '600' : '400',
          }}
          title="Ver todas las licencias"
        >
          Todas ({leaves.length})
        </button>
        <button
          onClick={() => setFilterStatus('pending')}
          style={{
            padding: '8px 16px',
            background: filterStatus === 'pending' ? '#00A86B' : theme === 'light' ? '#f0f0f0' : '#374151',
            color: filterStatus === 'pending' ? 'white' : theme === 'light' ? '#333' : '#e5e7eb',
            border: 'none',
            borderRadius: '5px',
            transition: 'background 0.2s',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: filterStatus === 'pending' ? '600' : '400',
          }}
          title="Ver licencias pendientes"
        >
          Pendientes ({leaves.filter((l: any) => l.status === 'pending').length})
        </button>
        <button
          onClick={() => setFilterStatus('approved')}
          style={{
            padding: '8px 16px',
            background: filterStatus === 'approved' ? '#00A86B' : theme === 'light' ? '#f0f0f0' : '#374151',
            color: filterStatus === 'approved' ? 'white' : theme === 'light' ? '#333' : '#e5e7eb',
            border: 'none',
            borderRadius: '5px',
            transition: 'background 0.2s',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: filterStatus === 'approved' ? '600' : '400',
          }}
          title="Ver licencias aprobadas"
        >
          Aprobadas ({leaves.filter((l: any) => l.status === 'approved').length})
        </button>
      </div>

      <div style={{ marginBottom: '20px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
        <InputField
          label="Buscar Empleado"
          name="filterEmployee"
          value={filterEmployee}
          onChange={(e) => setFilterEmployee(e.target.value)}
          placeholder="Nombre o cédula..."
        />
        <div>
          <label style={{
            display: 'block',
            marginBottom: '6px',
            color: theme === 'light' ? '#555' : '#d1d5db',
            fontSize: '12px',
            fontWeight: '600',
            letterSpacing: '0.5px',
          }}>
            Tipo de Licencia
          </label>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 10px',
              border: `1px solid ${theme === 'light' ? '#ddd' : '#374151'}`,
              borderRadius: '5px',
              fontSize: '13px',
              boxSizing: 'border-box',
              background: theme === 'light' ? 'white' : '#374151',
              color: theme === 'light' ? '#333' : '#e5e7eb',
            }}
          >
            <option value="">Todos los tipos</option>
            <option value="vacation">Vacaciones</option>
            <option value="sick">Enfermedad</option>
            <option value="personal">Personal</option>
            <option value="unpaid">Sin Pago</option>
          </select>
        </div>
        <InputField
          label="Desde"
          name="filterDateFrom"
          type="date"
          value={filterDateFrom}
          onChange={(e) => setFilterDateFrom(e.target.value)}
        />
        <InputField
          label="Hasta"
          name="filterDateTo"
          type="date"
          value={filterDateTo}
          onChange={(e) => setFilterDateTo(e.target.value)}
        />
      </div>

      {loading ? (
        <div style={{ padding: '20px', textAlign: 'center', color: theme === 'light' ? '#999' : '#9ca3af' }}>
          Cargando licencias...
        </div>
      ) : (
        <DataTableAdvanced
          columns={[
            {
              title: 'Empleado',
              data: null,
              render: (data, type, row) => {
                return `<div style="font-weight: 500;">${getEmployeeName(row.employeeId)}</div><div style="font-size: 12px; color: ${theme === 'light' ? '#666' : '#9ca3af'};">${getEmployeeCedula(row.employeeId)}</div>`;
              },
            },
            {
              title: 'Tipo',
              data: 'type',
              render: (data) => {
                const types: any = {
                  vacation: 'Vacaciones',
                  sick: 'Enfermedad',
                  personal: 'Personal',
                  unpaid: 'Sin Pago',
                };
                return types[data] || data;
              },
            },
            {
              title: 'Desde',
              data: 'startDate',
            },
            {
              title: 'Hasta',
              data: 'endDate',
            },
            {
              title: 'Días',
              data: 'days',
            },
            {
              title: 'Estado',
              data: 'status',
              render: (data) => {
                const bgColor = data === 'pending' ? '#fff3cd' : '#d4edda';
                const textColor = data === 'pending' ? '#856404' : '#155724';
                const text = data === 'pending' ? 'Pendiente' : 'Aprobado';
                return `<span style="background: ${bgColor}; color: ${textColor}; padding: 4px 8px; border-radius: 3px; font-size: 11px;">${text}</span>`;
              },
            },
            {
              title: 'Acciones',
              data: null,
              render: (data, type, row) => {
                const approveBtn = row.status === 'pending' 
                  ? `<button class="leave-btn approve-btn" data-id="${row.id}" data-action="approve" title="Aprobar licencia" style="padding: 4px 12px; background: #00A86B; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 12px;">Aprobar</button>`
                  : '';
                const downloadBtn = row.documentPath
                  ? `<button class="leave-btn download-btn" data-id="${row.id}" data-action="download" title="Descargar documento" style="padding: 4px 12px; background: #00A86B; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 12px;">📥 Doc</button>`
                  : '';
                const printBtn = row.type === 'vacation'
                  ? `<button class="leave-btn print-btn" data-id="${row.id}" data-action="print" title="Imprimir solicitud de vacaciones" style="padding: 4px 12px; background: #00A86B; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 12px;">🖨️ Imprimir</button>`
                  : '';
                return `<div style="display: flex; gap: 8px; flex-wrap: wrap;">
                  <button class="leave-btn view-btn" data-id="${row.id}" data-action="view" title="Ver detalles" style="padding: 4px 12px; background: #00A86B; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 12px;">Ver</button>
                  ${printBtn}
                  ${downloadBtn}
                  ${approveBtn}
                </div>`;
              },
            },
          ]}
          data={getFilteredLeaves()}
          pageLength={10}
        />
      )}

      {showLeaveDetail && selectedLeave && (
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
          padding: '20px',
        }}>
          <div style={{
            background: theme === 'light' ? 'white' : '#1f2937',
            borderRadius: '8px',
            padding: '30px',
            maxWidth: '500px',
            width: '100%',
            boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
            color: theme === 'light' ? '#333' : '#e5e7eb',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>Detalles de Licencia</h2>
              <button
                onClick={() => setShowLeaveDetail(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: theme === 'light' ? '#666' : '#9ca3af',
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'grid', gap: '15px' }}>
              <div>
                <label style={{ fontWeight: '600', fontSize: '12px', color: theme === 'light' ? '#666' : '#9ca3af' }}>
                  Empleado
                </label>
                <div style={{ fontSize: '14px', marginTop: '4px' }}>
                  {getEmployeeName(selectedLeave.employeeId)}
                </div>
              </div>

              <div>
                <label style={{ fontWeight: '600', fontSize: '12px', color: theme === 'light' ? '#666' : '#9ca3af' }}>
                  Cédula
                </label>
                <div style={{ fontSize: '14px', marginTop: '4px' }}>
                  {getEmployeeCedula(selectedLeave.employeeId)}
                </div>
              </div>

              <div>
                <label style={{ fontWeight: '600', fontSize: '12px', color: theme === 'light' ? '#666' : '#9ca3af' }}>
                  Tipo de Licencia
                </label>
                <div style={{ fontSize: '14px', marginTop: '4px' }}>
                  {selectedLeave.type === 'vacation' ? 'Vacaciones' : selectedLeave.type === 'sick' ? 'Enfermedad' : selectedLeave.type === 'personal' ? 'Personal' : 'Sin Pago'}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div>
                  <label style={{ fontWeight: '600', fontSize: '12px', color: theme === 'light' ? '#666' : '#9ca3af' }}>
                    Fecha Inicio
                  </label>
                  <div style={{ fontSize: '14px', marginTop: '4px' }}>
                    {selectedLeave.startDate}
                  </div>
                </div>
                <div>
                  <label style={{ fontWeight: '600', fontSize: '12px', color: theme === 'light' ? '#666' : '#9ca3af' }}>
                    Fecha Fin
                  </label>
                  <div style={{ fontSize: '14px', marginTop: '4px' }}>
                    {selectedLeave.endDate}
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div>
                  <label style={{ fontWeight: '600', fontSize: '12px', color: theme === 'light' ? '#666' : '#9ca3af' }}>
                    Días
                  </label>
                  <div style={{ fontSize: '14px', marginTop: '4px' }}>
                    {selectedLeave.days}
                  </div>
                </div>
                <div>
                  <label style={{ fontWeight: '600', fontSize: '12px', color: theme === 'light' ? '#666' : '#9ca3af' }}>
                    Estado
                  </label>
                  <div style={{ fontSize: '14px', marginTop: '4px' }}>
                    <span style={{
                      background: selectedLeave.status === 'pending' ? '#fff3cd' : '#d4edda',
                      color: selectedLeave.status === 'pending' ? '#856404' : '#155724',
                      padding: '4px 8px',
                      borderRadius: '3px',
                      fontSize: '12px',
                    }}>
                      {selectedLeave.status === 'pending' ? 'Pendiente' : 'Aprobado'}
                    </span>
                  </div>
                </div>
              </div>

              {selectedLeave.reason && (
                <div>
                  <label style={{ fontWeight: '600', fontSize: '12px', color: theme === 'light' ? '#666' : '#9ca3af' }}>
                    Motivo
                  </label>
                  <div style={{ fontSize: '14px', marginTop: '4px', padding: '10px', background: theme === 'light' ? '#f5f5f5' : '#374151', borderRadius: '4px' }}>
                    {selectedLeave.reason}
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '25px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowLeaveDetail(false)}
                style={{
                  padding: '8px 16px',
                  background: theme === 'light' ? '#f0f0f0' : '#374151',
                  color: theme === 'light' ? '#333' : '#e5e7eb',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                }}
              >
                Cerrar
              </button>
              {selectedLeave.status === 'pending' && (
                <button
                  onClick={() => {
                    handleApprove(selectedLeave.id);
                    setShowLeaveDetail(false);
                  }}
                  style={{
                    padding: '8px 16px',
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
                  Aprobar
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
