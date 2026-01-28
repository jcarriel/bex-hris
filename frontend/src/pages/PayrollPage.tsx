import { useState, useEffect } from 'react';
import api from '../services/api';
import DataTable from '../components/DataTable';
import { useThemeStore } from '../stores/themeStore';
import { showSuccess, showError } from '../utils/alertify';
import generatePayrollPDF, { generateMultiplePayrollPDFsAsOne } from '../utils/payrollPdfGenerator';

export default function PayrollPage() {
  const { theme } = useThemeStore();
  const [payrolls, setPayrolls] = useState([]);
  const [filteredPayrolls, setFilteredPayrolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(2025);
  const [month, setMonth] = useState(12);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [selectedPayroll, setSelectedPayroll] = useState<any>(null);
  const [showPayrollDetail, setShowPayrollDetail] = useState(false);
  const [selectedForPrint, setSelectedForPrint] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [pdfProgress, setPdfProgress] = useState<{ current: number; total: number } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  useEffect(() => {
    fetchPayrolls();
  }, [year, month]);

  useEffect(() => {
    applyFilters();
  }, [payrolls, searchQuery, statusFilter, departmentFilter]);

  const fetchPayrolls = async () => {
    try {
      setLoading(true);
      const response = await api.client.get(`/payroll/period/${year}/${month}`);
      const data = response.data.data || [];
      setPayrolls(data);
    } catch (error) {
      console.error('Error fetching payrolls:', error);
      showError('Error al cargar nóminas');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let result = [...payrolls];

    // Filtro de búsqueda por nombre o cédula
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((p: any) =>
        p.employeeName?.toLowerCase().includes(query) ||
        p.cedula?.toLowerCase().includes(query)
      );
    }

    // Filtro por estado
    if (statusFilter) {
      result = result.filter((p: any) => p.status === statusFilter);
    }

    // Filtro por departamento
    if (departmentFilter) {
      result = result.filter((p: any) => p.departmentId === departmentFilter);
    }

    setFilteredPayrolls(result);
  };

  const departments = Array.from(new Set(payrolls.map((p: any) => p.departmentId))).filter(Boolean);

  const handleDeletePayroll = async (id: string) => {
    try {
      await api.client.delete(`/payroll/${id}`);
      fetchPayrolls();
      showSuccess('Nómina eliminada exitosamente');
    } catch (error) {
      console.error('Error deleting payroll:', error);
      showError('Error al eliminar nómina');
    }
  };

  const handleClearPayrolls = async () => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar TODAS las nóminas? Esta acción no se puede deshacer.')) {
      return;
    }
    try {
      await api.client.delete('/payroll/clear');
      setPayrolls([]);
      setFilteredPayrolls([]);
      showSuccess('Todas las nóminas han sido eliminadas');
    } catch (error) {
      console.error('Error clearing payrolls:', error);
      showError('Error al eliminar nóminas');
    }
  };

  const handleTogglePayrollSelection = (payrollId: string) => {
    const newSelected = new Set(selectedForPrint);
    if (newSelected.has(payrollId)) {
      newSelected.delete(payrollId);
    } else {
      newSelected.add(payrollId);
    }
    setSelectedForPrint(newSelected);
    setSelectAll(newSelected.size === filteredPayrolls.length && filteredPayrolls.length > 0);
  };

  const handleSelectAllToggle = () => {
    if (selectAll) {
      setSelectedForPrint(new Set());
      setSelectAll(false);
    } else {
      const allIds = new Set(filteredPayrolls.map((p: any) => p.id));
      setSelectedForPrint(allIds);
      setSelectAll(true);
    }
  };

  const handlePrintSelected = () => {
    if (selectedForPrint.size === 0) {
      showError('Por favor selecciona al menos un rol de pago');
      return;
    }

    const payrollsToPrint = filteredPayrolls.filter((p: any) => selectedForPrint.has(p.id));
    setPdfProgress({ current: 0, total: payrollsToPrint.length });
    generateMultiplePayrollPDFsAsOne(payrollsToPrint, undefined, (current, total) => {
      setPdfProgress({ current, total });
      if (current === total) {
        setTimeout(() => setPdfProgress(null), 1000);
      }
    });
  };

  const handlePrintAllFiltered = () => {
    if (filteredPayrolls.length === 0) {
      showError('No hay roles de pago para imprimir');
      return;
    }

    setPdfProgress({ current: 0, total: filteredPayrolls.length });
    generateMultiplePayrollPDFsAsOne(filteredPayrolls, undefined, (current, total) => {
      setPdfProgress({ current, total });
      if (current === total) {
        setTimeout(() => setPdfProgress(null), 1000);
      }
    });
  };

  const handlePrintSingle = (payroll: any) => {
    generatePayrollPDF(payroll);
    showSuccess('Generando PDF...');
  };

  return (
    <div style={{ padding: '20px' }}>
      {/* Filtros principales */}
      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
        <select
          value={month}
          onChange={(e) => setMonth(parseInt(e.target.value))}
          style={{
            padding: '8px 12px',
            border: `1px solid ${theme === 'light' ? '#ddd' : '#374151'}`,
            borderRadius: '5px',
            fontSize: '14px',
            background: theme === 'light' ? 'white' : '#374151',
            color: theme === 'light' ? '#333' : '#ffffff',
          }}
        >
          {Array.from({ length: 12 }, (_, i) => (
            <option key={i + 1} value={i + 1}>
              {new Date(2024, i).toLocaleString('es-ES', { month: 'long' })}
            </option>
          ))}
        </select>
        <select
          value={year}
          onChange={(e) => setYear(parseInt(e.target.value))}
          style={{
            padding: '8px 12px',
            border: `1px solid ${theme === 'light' ? '#ddd' : '#374151'}`,
            borderRadius: '5px',
            fontSize: '14px',
            background: theme === 'light' ? 'white' : '#374151',
            color: theme === 'light' ? '#333' : '#ffffff',
          }}
        >
          {Array.from({ length: 5 }, (_, i) => {
            const y = new Date().getFullYear() - i;
            return (
              <option key={y} value={y}>
                {y}
              </option>
            );
          })}
        </select>
        <button
          onClick={handleClearPayrolls}
          style={{
            padding: '8px 16px',
            background: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            marginLeft: 'auto',
          }}
          title="Eliminar todas las nóminas"
        >
          🗑️ Limpiar Tabla
        </button>
      </div>

      {/* Filtros avanzados */}
      <div style={{
        marginBottom: '20px',
        padding: '15px',
        background: theme === 'light' ? '#f8f9fa' : '#1f2937',
        borderRadius: '8px',
        display: 'flex',
        gap: '12px',
        alignItems: 'center',
        flexWrap: 'wrap',
      }}>
        <input
          type="text"
          placeholder="🔍 Buscar por nombre o cédula..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            padding: '8px 12px',
            border: `1px solid ${theme === 'light' ? '#ddd' : '#374151'}`,
            borderRadius: '5px',
            fontSize: '14px',
            background: theme === 'light' ? 'white' : '#374151',
            color: theme === 'light' ? '#333' : '#ffffff',
            flex: 1,
            minWidth: '200px',
          }}
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{
            padding: '8px 12px',
            border: `1px solid ${theme === 'light' ? '#ddd' : '#374151'}`,
            borderRadius: '5px',
            fontSize: '14px',
            background: theme === 'light' ? 'white' : '#374151',
            color: theme === 'light' ? '#333' : '#ffffff',
          }}
        >
          <option value="">Todos los estados</option>
          <option value="draft">Borrador</option>
          <option value="processed">Procesado</option>
          <option value="paid">Pagado</option>
        </select>
        <select
          value={departmentFilter}
          onChange={(e) => setDepartmentFilter(e.target.value)}
          style={{
            padding: '8px 12px',
            border: `1px solid ${theme === 'light' ? '#ddd' : '#374151'}`,
            borderRadius: '5px',
            fontSize: '14px',
            background: theme === 'light' ? 'white' : '#374151',
            color: theme === 'light' ? '#333' : '#ffffff',
          }}
        >
          <option value="">Todos los departamentos</option>
          {departments.map((dept: any) => (
            <option key={dept} value={dept}>
              {dept}
            </option>
          ))}
        </select>
        <button
          onClick={() => {
            setSearchQuery('');
            setStatusFilter('');
            setDepartmentFilter('');
          }}
          style={{
            padding: '8px 12px',
            background: theme === 'light' ? '#6c757d' : '#4b5563',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          ↺ Limpiar filtros
        </button>
        <button
          onClick={handlePrintSelected}
          disabled={selectedForPrint.size === 0}
          style={{
            padding: '8px 16px',
            background: selectedForPrint.size === 0 ? '#ccc' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: selectedForPrint.size === 0 ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: '500',
          }}
          title={`Imprimir ${selectedForPrint.size} rol(es) seleccionado(s)`}
        >
          🖨️  ({selectedForPrint.size})
        </button>
        <button
          onClick={handlePrintAllFiltered}
          disabled={filteredPayrolls.length === 0}
          style={{
            padding: '8px 16px',
            background: filteredPayrolls.length === 0 ? '#ccc' : '#17a2b8',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: filteredPayrolls.length === 0 ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: '500',
          }}
          title={`Imprimir todos los ${filteredPayrolls.length} rol(es) del período`}
        >
          📋 Imprimir Todo
        </button>
        <span style={{
          fontSize: '13px',
          color: theme === 'light' ? '#666' : '#9ca3af',
          marginLeft: 'auto',
        }}>
          {filteredPayrolls.length} de {payrolls.length} registros
        </span>
      </div>

      {loading ? (
        <div style={{ padding: '20px', textAlign: 'center', color: theme === 'light' ? '#999' : '#9ca3af' }}>
          Cargando nóminas...
        </div>
      ) : (
        <DataTable
          onPageChange={(page) => setCurrentPage(page)}
          columns={[
            {
              key: 'select',
              label: (() => {
                const startIdx = (currentPage - 1) * pageSize;
                const endIdx = startIdx + pageSize;
                const currentPagePayrolls = filteredPayrolls.slice(startIdx, endIdx);
                const currentPageIds = new Set(currentPagePayrolls.map((p: any) => p.id));
                const allCurrentPageSelected = currentPagePayrolls.length > 0 && 
                  currentPagePayrolls.every((p: any) => selectedForPrint.has(p.id));
                const someCurrentPageSelected = currentPagePayrolls.some((p: any) => selectedForPrint.has(p.id));

                return (
                  <input
                    type="checkbox"
                    checked={allCurrentPageSelected}
                    ref={(el) => {
                      if (el) {
                        (el as any).indeterminate = someCurrentPageSelected && !allCurrentPageSelected;
                      }
                    }}
                    onChange={() => {
                      if (allCurrentPageSelected) {
                        const newSelected = new Set(selectedForPrint);
                        currentPageIds.forEach(id => newSelected.delete(id));
                        setSelectedForPrint(newSelected);
                      } else {
                        const newSelected = new Set(selectedForPrint);
                        currentPageIds.forEach(id => newSelected.add(id));
                        setSelectedForPrint(newSelected);
                      }
                    }}
                    style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                    title="Seleccionar/deseleccionar todos de esta página"
                  />
                );
              })() as any,
              render: (_, payroll) => (
                <input
                  type="checkbox"
                  checked={selectedForPrint.has(payroll.id)}
                  onChange={() => handleTogglePayrollSelection(payroll.id)}
                  style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                />
              ),
            },
            {
              key: 'employeeName',
              label: 'Empleado',
              sortable: true,
              render: (value) => value || '-',
            },
            {
              key: 'cedula',
              label: 'Cédula',
              sortable: true,
              render: (value) => value || '-',
            },
            {
              key: 'baseSalary',
              label: 'Sueldo Base',
              sortable: true,
              render: (value) => `$${value?.toLocaleString() || '-'}`,
            },
            {
              key: 'totalIncome',
              label: 'Total Ingresos',
              sortable: true,
              render: (value) => `$${value?.toLocaleString() || '-'}`,
            },
            {
              key: 'totalDeductions',
              label: 'Total Egresos',
              sortable: true,
              render: (value) => `$${value?.toLocaleString() || '-'}`,
            },
            {
              key: 'totalToPay',
              label: 'Total a Pagar',
              sortable: true,
              render: (value) => `$${value?.toLocaleString() || '-'}`,
            },
            {
              key: 'status',
              label: 'Estado',
              sortable: true,
              render: (value) => (
                <span style={{
                  background: value === 'paid' ? '#d4edda' : '#fff3cd',
                  color: value === 'paid' ? '#155724' : '#856404',
                  padding: '4px 8px',
                  borderRadius: '3px',
                  fontSize: '11px',
                }}>
                  {value === 'paid' ? 'Pagado' : value === 'processed' ? 'Procesado' : 'Borrador'}
                </span>
              ),
            },
            {
              key: 'actions',
              label: 'Acciones',
              render: (_, payroll) => (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => {
                      setSelectedPayroll(payroll);
                      setShowPayrollDetail(true);
                    }}
                    style={{
                      padding: '6px 12px',
                      background: '#007bff',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px',
                    }}
                  >
                    👁 Ver
                  </button>
                  <button
                    onClick={() => handlePrintSingle(payroll)}
                    style={{
                      padding: '6px 12px',
                      background: '#28a745',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px',
                    }}
                    title="Descargar PDF"
                  >
                    🖨 PDF
                  </button>
                  <button
                    onClick={() => {
                      const confirmed = window.confirm('¿Estás seguro de que deseas eliminar esta nómina?');
                      if (confirmed) {
                        handleDeletePayroll(payroll.id);
                      }
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
              ),
            },
          ]}
          data={filteredPayrolls}
          pageSize={15}
        />
      )}

      {/* Modal de detalle de nómina */}
      {showPayrollDetail && selectedPayroll && (
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
            background: 'white',
            borderRadius: '8px',
            padding: '50px',
            maxWidth: '800px',
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
            fontFamily: 'Arial, sans-serif',
            color: '#333',
          }}>
            {/* Encabezado */}
            <div style={{
              textAlign: 'center',
              marginBottom: '40px',
              borderBottom: '3px solid #333',
              paddingBottom: '25px',
            }}>
              <h2 style={{
                margin: '0 0 5px 0',
                color: '#333',
                fontSize: '22px',
                fontWeight: '700',
                letterSpacing: '1px',
              }}>
                ROL DE PAGO INDIVIDUAL
              </h2>
              <p style={{
                margin: '10px 0 5px 0',
                color: '#333',
                fontSize: '13px',
                fontWeight: '600',
              }}>
                EMPLEADO: {selectedPayroll.employeeName?.toUpperCase()}
              </p>
              <p style={{
                margin: '5px 0 0 0',
                color: '#333',
                fontSize: '12px',
              }}>
                C.I.: {selectedPayroll.cedula} • PERÍODO: {selectedPayroll.month}/{selectedPayroll.year}
              </p>
            </div>

            {/* Contenido Principal - Dos Columnas */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '40px',
              marginBottom: '30px',
            }}>
              {/* INGRESOS */}
              <div>
                <h3 style={{
                  margin: '0 0 12px 0',
                  color: '#d4a574',
                  fontSize: '13px',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  borderBottom: '2px solid #d4a574',
                  paddingBottom: '8px',
                }}>
                  INGRESOS
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {[
                    { label: 'SUELDO', value: selectedPayroll.baseSalary },
                    { label: 'FONDOS RESERVA', value: selectedPayroll.reserveFunds || 0 },
                    { label: 'DÉCIMO TERCERO', value: selectedPayroll.twelfthSalary || 0 },
                    { label: 'DÉCIMO CUARTO', value: selectedPayroll.fourteenthSalary || 0 },
                    { label: 'BONIFICACION', value: selectedPayroll.responsibilityBonus || 0 },
                    { label: 'PRODUCTIVIDAD', value: selectedPayroll.productivityBonus || 0 },
                    { label: 'VACACIONES', value: selectedPayroll.vacation || 0 },
                    { label: 'ALIM (ART 14 LEY SEG SOCIAL)', value: selectedPayroll.foodAllowance || 0 },
                    { label: 'OTROS INGRESOS', value: selectedPayroll.otherIncome || 0 },
                  ].filter(item => item.value && item.value > 0).map((item, idx) => (
                    <div key={idx} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '11px',
                      color: '#333',
                      paddingBottom: '4px',
                    }}>
                      <span style={{ fontWeight: '500', color: '#666' }}>{item.label}</span>
                      <span style={{ fontWeight: '600', color: '#d4a574' }}>{item.value?.toFixed(2) || '0.00'}</span>
                    </div>
                  ))}
                </div>
                <div style={{
                  marginTop: '10px',
                  paddingTop: '8px',
                  borderTop: '2px solid #d4a574',
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '12px',
                  fontWeight: '700',
                  color: '#d4a574',
                }}>
                  <span>Total Ingresos</span>
                  <span>${((selectedPayroll.baseSalary || 0) + (selectedPayroll.reserveFunds || 0) + (selectedPayroll.twelfthSalary || 0) + (selectedPayroll.fourteenthSalary || 0) + (selectedPayroll.responsibilityBonus || 0) + (selectedPayroll.productivityBonus || 0) + (selectedPayroll.foodAllowance || 0) + (selectedPayroll.otherIncome || 0) + (selectedPayroll.vacation || 0)).toFixed(2)}</span>
                </div>
              </div>

              {/* EGRESOS */}
              <div>
                <h3 style={{
                  margin: '0 0 12px 0',
                  color: '#c85a54',
                  fontSize: '13px',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  borderBottom: '2px solid #c85a54',
                  paddingBottom: '8px',
                }}>
                  EGRESOS
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {[
                    { label: 'QUINCENA', value: selectedPayroll.advance || 0 },
                    { label: '9.45% IESS', value: selectedPayroll.iessContribution || 0 },
                    { label: 'Impuesto a la Renta', value: selectedPayroll.incomeTax || 0 },
                    { label: 'Préstamo IESS', value: selectedPayroll.iessLoan || 0 },
                    { label: 'Préstamo Empresarial', value: selectedPayroll.companyLoan || 0 },
                    { label: 'Extensión Conyugal', value: selectedPayroll.spouseExtension || 0 },
                    { label: 'Días No Laborados', value: selectedPayroll.nonWorkDays || 0 },
                    { label: 'Otros Descuentos', value: selectedPayroll.otherDeductions || 0 },
                    { label: 'Alimentación', value: selectedPayroll.foodDeduction || 0 },
                  ].filter(item => item.value && item.value > 0).map((item, idx) => (
                    <div key={idx} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '11px',
                      color: '#333',
                      paddingBottom: '4px',
                    }}>
                      <span style={{ fontWeight: '500', color: '#666' }}>{item.label}</span>
                      <span style={{ fontWeight: '600', color: '#c85a54' }}>{item.value?.toFixed(2) || '0.00'}</span>
                    </div>
                  ))}
                </div>
                <div style={{
                  marginTop: '10px',
                  paddingTop: '8px',
                  borderTop: '2px solid #c85a54',
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '12px',
                  fontWeight: '700',
                  color: '#c85a54',
                }}>
                  <span>Total Egresos</span>
                  <span>${((selectedPayroll.advance || 0) + (selectedPayroll.iessContribution || 0) + (selectedPayroll.incomeTax || 0) + (selectedPayroll.iessLoan || 0) + (selectedPayroll.companyLoan || 0) + (selectedPayroll.spouseExtension || 0) + (selectedPayroll.nonWorkDays || 0) + (selectedPayroll.otherDeductions || 0) + (selectedPayroll.foodDeduction || 0)).toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Total a Recibir */}
            <div style={{
              marginBottom: '40px',
              paddingTop: '20px',
              borderTop: '3px solid #333',
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '14px',
              fontWeight: '700',
              color: '#333',
            }}>
              <span>TOTAL A RECIBIR</span>
              <span style={{ fontSize: '16px' }}>${(
                ((selectedPayroll.baseSalary || 0) + (selectedPayroll.reserveFunds || 0) + (selectedPayroll.twelfthSalary || 0) + (selectedPayroll.fourteenthSalary || 0) + (selectedPayroll.responsibilityBonus || 0) + (selectedPayroll.productivityBonus || 0) + (selectedPayroll.foodAllowance || 0) + (selectedPayroll.otherIncome || 0)) + (selectedPayroll.vacation || 0) -
                ((selectedPayroll.advance || 0) + (selectedPayroll.iessContribution || 0) + (selectedPayroll.incomeTax || 0) + (selectedPayroll.iessLoan || 0) + (selectedPayroll.companyLoan || 0) + (selectedPayroll.spouseExtension || 0) + (selectedPayroll.nonWorkDays || 0) + (selectedPayroll.otherDeductions || 0) + (selectedPayroll.foodDeduction || 0))
              ).toFixed(2)}</span>
            </div>

            {/* Botones */}
            <div style={{
              display: 'flex',
              gap: '10px',
              marginTop: '20px',
              justifyContent: 'flex-end',
            }}>
              <button
                onClick={() => setShowPayrollDetail(false)}
                style={{
                  padding: '10px 20px',
                  background: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                ✓ Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Progreso PDF */}
      {pdfProgress && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999,
        }}>
          <div style={{
            background: theme === 'light' ? 'white' : '#1f2937',
            padding: '40px',
            borderRadius: '10px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            minWidth: '400px',
            textAlign: 'center',
          }}>
            <h2 style={{
              margin: '0 0 20px 0',
              fontSize: '18px',
              fontWeight: 'bold',
              color: theme === 'light' ? '#333' : '#ffffff',
            }}>
              Generando PDF
            </h2>
            
            <div style={{
              marginBottom: '20px',
              fontSize: '14px',
              color: theme === 'light' ? '#666' : '#d1d5db',
            }}>
              {pdfProgress.current} de {pdfProgress.total} roles procesados
            </div>

            {/* Barra de progreso */}
            <div style={{
              width: '100%',
              height: '8px',
              background: theme === 'light' ? '#e5e7eb' : '#374151',
              borderRadius: '4px',
              overflow: 'hidden',
              marginBottom: '20px',
            }}>
              <div style={{
                height: '100%',
                background: '#007bff',
                width: `${(pdfProgress.current / pdfProgress.total) * 100}%`,
                transition: 'width 0.3s ease',
              }} />
            </div>

            {/* Porcentaje */}
            <div style={{
              fontSize: '12px',
              color: theme === 'light' ? '#999' : '#9ca3af',
              marginBottom: '20px',
            }}>
              {Math.round((pdfProgress.current / pdfProgress.total) * 100)}%
            </div>

            {/* Spinner */}
            <div style={{
              display: 'inline-block',
              width: '30px',
              height: '30px',
              border: '3px solid ' + (theme === 'light' ? '#e5e7eb' : '#374151'),
              borderTop: '3px solid #007bff',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }} />

            <style>{`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        </div>
      )}
    </div>
  );
}
