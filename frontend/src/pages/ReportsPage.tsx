import { useState, useEffect } from 'react';
import api from '../services/api';
import { useThemeStore } from '../stores/themeStore';

export default function ReportsPage() {
  const { theme } = useThemeStore();
  const [reportType, setReportType] = useState('payroll');
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (reportType) {
      fetchReport();
    }
  }, [reportType, period]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      let response;
      
      if (reportType === 'payroll') {
        response = await api.client.get(`/payroll/${period}`);
      } else if (reportType === 'attendance') {
        response = await api.client.get(`/attendance?startDate=${period}-01&endDate=${period}-31`);
      } else if (reportType === 'leaves') {
        response = await api.client.get('/leaves/pending');
      } else if (reportType === 'employees') {
        response = await api.getEmployees(1, 100);
        setData(response.data.data.data || []);
        setLoading(false);
        return;
      }
      
      setData(response.data.data || []);
    } catch (error) {
      console.error('Error fetching report:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = () => {
    const element = document.getElementById('report-content');
    if (element) {
      const printWindow = window.open('', '', 'height=600,width=800');
      if (printWindow) {
        printWindow.document.write('<html><head><title>Reporte</title></head><body>');
        printWindow.document.write(element.innerHTML);
        printWindow.document.write('</body></html>');
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

  const handleExportCSV = () => {
    let csv = '';
    
    if (reportType === 'payroll') {
      csv = 'Empleado,Salario Base,Bonificaciones,Deducciones,Impuestos,Neto\n';
      data.forEach((item: any) => {
        csv += `${item.employeeId},${item.baseSalary},${item.bonuses},${item.deductions},${item.taxes},${item.netSalary}\n`;
      });
    } else if (reportType === 'attendance') {
      csv = 'Empleado,Fecha,Entrada,Salida,Estado\n';
      data.forEach((item: any) => {
        csv += `${item.employeeId},${item.date},${item.checkIn},${item.checkOut},${item.status}\n`;
      });
    } else if (reportType === 'employees') {
      csv = 'Nombre,Email,Cédula,Salario,Estado\n';
      data.forEach((item: any) => {
        csv += `${item.firstName} ${item.lastName},${item.email},${item.cedula},${item.baseSalary},${item.status}\n`;
      });
    }

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte-${reportType}-${period}.csv`;
    a.click();
  };

  const getReportStats = () => {
    if (reportType === 'payroll') {
      const total = data.reduce((sum: number, item: any) => sum + (item.netSalary || 0), 0);
      const count = data.length;
      return { total, count, label: 'Nómina Total' };
    } else if (reportType === 'attendance') {
      const present = data.filter((item: any) => item.status === 'present').length;
      const absent = data.filter((item: any) => item.status === 'absent').length;
      return { present, absent, label: 'Asistencia' };
    } else if (reportType === 'leaves') {
      const pending = data.filter((item: any) => item.status === 'pending').length;
      const approved = data.filter((item: any) => item.status === 'approved').length;
      return { pending, approved, label: 'Licencias' };
    }
    return {};
  };

  const stats = getReportStats();

  return (
    <div style={{ padding: '20px' }}>
      <div style={{
        background: theme === 'light' ? 'white' : '#1f2937',
        padding: '20px',
        borderRadius: '8px',
        marginBottom: '20px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        border: `1px solid ${theme === 'light' ? '#eee' : '#374151'}`,
      }}>
        <h3 style={{ marginTop: 0, color: theme === 'light' ? '#333' : '#ffffff' }}>Generador de Reportes</h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', marginBottom: '20px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', color: theme === 'light' ? '#555' : '#d1d5db', fontSize: '14px' }}>
              Tipo de Reporte
            </label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                border: `1px solid ${theme === 'light' ? '#ddd' : '#374151'}`,
                borderRadius: '5px',
                fontSize: '14px',
                background: theme === 'light' ? 'white' : '#374151',
                color: theme === 'light' ? '#333' : '#ffffff',
              }}
            >
              <option value="payroll">Nómina</option>
              <option value="attendance">Asistencia</option>
              <option value="leaves">Licencias</option>
              <option value="employees">Empleados</option>
            </select>
          </div>

          {reportType !== 'employees' && (
            <div>
              <label style={{ display: 'block', marginBottom: '5px', color: theme === 'light' ? '#555' : '#d1d5db', fontSize: '14px' }}>
                Período
              </label>
              <input
                type="month"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: `1px solid ${theme === 'light' ? '#ddd' : '#374151'}`,
                  borderRadius: '5px',
                  fontSize: '14px',
                  background: theme === 'light' ? 'white' : '#374151',
                  color: theme === 'light' ? '#333' : '#ffffff',
                }}
              />
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
            <button
              onClick={handleExportPDF}
              style={{
                flex: 1,
                padding: '10px',
                background: '#667eea',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              📄 PDF
            </button>
            <button
              onClick={handleExportCSV}
              style={{
                flex: 1,
                padding: '10px',
                background: '#764ba2',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              📊 CSV
            </button>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px' }}>
          {reportType === 'payroll' && (
            <>
              <div style={{ background: theme === 'light' ? '#f5f7fa' : '#374151', padding: '15px', borderRadius: '5px' }}>
                <div style={{ color: theme === 'light' ? '#999' : '#9ca3af', fontSize: '12px' }}>Registros</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#667eea' }}>
                  {(stats as any).count || 0}
                </div>
              </div>
              <div style={{ background: theme === 'light' ? '#f5f7fa' : '#374151', padding: '15px', borderRadius: '5px' }}>
                <div style={{ color: theme === 'light' ? '#999' : '#9ca3af', fontSize: '12px' }}>Nómina Total</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#764ba2' }}>
                  ${((stats as any).total || 0).toLocaleString()}
                </div>
              </div>
            </>
          )}
          {reportType === 'attendance' && (
            <>
              <div style={{ background: theme === 'light' ? '#f5f7fa' : '#374151', padding: '15px', borderRadius: '5px' }}>
                <div style={{ color: theme === 'light' ? '#999' : '#9ca3af', fontSize: '12px' }}>Presentes</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#28a745' }}>
                  {(stats as any).present || 0}
                </div>
              </div>
              <div style={{ background: theme === 'light' ? '#f5f7fa' : '#374151', padding: '15px', borderRadius: '5px' }}>
                <div style={{ color: theme === 'light' ? '#999' : '#9ca3af', fontSize: '12px' }}>Ausentes</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#dc3545' }}>
                  {(stats as any).absent || 0}
                </div>
              </div>
            </>
          )}
          {reportType === 'leaves' && (
            <>
              <div style={{ background: theme === 'light' ? '#f5f7fa' : '#374151', padding: '15px', borderRadius: '5px' }}>
                <div style={{ color: theme === 'light' ? '#999' : '#9ca3af', fontSize: '12px' }}>Pendientes</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ffc107' }}>
                  {(stats as any).pending || 0}
                </div>
              </div>
              <div style={{ background: theme === 'light' ? '#f5f7fa' : '#374151', padding: '15px', borderRadius: '5px' }}>
                <div style={{ color: theme === 'light' ? '#999' : '#9ca3af', fontSize: '12px' }}>Aprobadas</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#28a745' }}>
                  {(stats as any).approved || 0}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Report Table */}
      <div
        id="report-content"
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
            Generando reporte...
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: theme === 'light' ? '#f5f7fa' : '#374151', borderBottom: `2px solid ${theme === 'light' ? '#eee' : '#374151'}` }}>
                {reportType === 'payroll' && (
                  <>
                    <th style={{ padding: '12px', textAlign: 'left', color: theme === 'light' ? '#666' : '#9ca3af' }}>Empleado</th>
                    <th style={{ padding: '12px', textAlign: 'left', color: theme === 'light' ? '#666' : '#9ca3af' }}>Salario Base</th>
                    <th style={{ padding: '12px', textAlign: 'left', color: theme === 'light' ? '#666' : '#9ca3af' }}>Bonificaciones</th>
                    <th style={{ padding: '12px', textAlign: 'left', color: theme === 'light' ? '#666' : '#9ca3af' }}>Deducciones</th>
                    <th style={{ padding: '12px', textAlign: 'left', color: theme === 'light' ? '#666' : '#9ca3af' }}>Impuestos</th>
                    <th style={{ padding: '12px', textAlign: 'left', color: theme === 'light' ? '#666' : '#9ca3af' }}>Neto</th>
                  </>
                )}
                {reportType === 'attendance' && (
                  <>
                    <th style={{ padding: '12px', textAlign: 'left', color: theme === 'light' ? '#666' : '#9ca3af' }}>Empleado</th>
                    <th style={{ padding: '12px', textAlign: 'left', color: theme === 'light' ? '#666' : '#9ca3af' }}>Fecha</th>
                    <th style={{ padding: '12px', textAlign: 'left', color: theme === 'light' ? '#666' : '#9ca3af' }}>Entrada</th>
                    <th style={{ padding: '12px', textAlign: 'left', color: theme === 'light' ? '#666' : '#9ca3af' }}>Salida</th>
                    <th style={{ padding: '12px', textAlign: 'left', color: theme === 'light' ? '#666' : '#9ca3af' }}>Estado</th>
                  </>
                )}
                {reportType === 'leaves' && (
                  <>
                    <th style={{ padding: '12px', textAlign: 'left', color: theme === 'light' ? '#666' : '#9ca3af' }}>Empleado</th>
                    <th style={{ padding: '12px', textAlign: 'left', color: theme === 'light' ? '#666' : '#9ca3af' }}>Tipo</th>
                    <th style={{ padding: '12px', textAlign: 'left', color: theme === 'light' ? '#666' : '#9ca3af' }}>Desde</th>
                    <th style={{ padding: '12px', textAlign: 'left', color: theme === 'light' ? '#666' : '#9ca3af' }}>Hasta</th>
                    <th style={{ padding: '12px', textAlign: 'left', color: theme === 'light' ? '#666' : '#9ca3af' }}>Días</th>
                    <th style={{ padding: '12px', textAlign: 'left', color: theme === 'light' ? '#666' : '#9ca3af' }}>Estado</th>
                  </>
                )}
                {reportType === 'employees' && (
                  <>
                    <th style={{ padding: '12px', textAlign: 'left', color: theme === 'light' ? '#666' : '#9ca3af' }}>Nombre</th>
                    <th style={{ padding: '12px', textAlign: 'left', color: theme === 'light' ? '#666' : '#9ca3af' }}>Email</th>
                    <th style={{ padding: '12px', textAlign: 'left', color: theme === 'light' ? '#666' : '#9ca3af' }}>Cédula</th>
                    <th style={{ padding: '12px', textAlign: 'left', color: theme === 'light' ? '#666' : '#9ca3af' }}>Salario</th>
                    <th style={{ padding: '12px', textAlign: 'left', color: theme === 'light' ? '#666' : '#9ca3af' }}>Estado</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
                    No hay datos para este reporte
                  </td>
                </tr>
              ) : (
                data.map((item: any, index: number) => (
                  <tr key={index} style={{ borderBottom: '1px solid #eee' }}>
                    {reportType === 'payroll' && (
                      <>
                        <td style={{ padding: '12px' }}>{item.employeeId}</td>
                        <td style={{ padding: '12px' }}>${item.baseSalary?.toLocaleString()}</td>
                        <td style={{ padding: '12px' }}>${item.bonuses?.toLocaleString()}</td>
                        <td style={{ padding: '12px' }}>${item.deductions?.toLocaleString()}</td>
                        <td style={{ padding: '12px' }}>${item.taxes?.toLocaleString()}</td>
                        <td style={{ padding: '12px', fontWeight: 'bold' }}>${item.netSalary?.toLocaleString()}</td>
                      </>
                    )}
                    {reportType === 'attendance' && (
                      <>
                        <td style={{ padding: '12px' }}>{item.employeeId}</td>
                        <td style={{ padding: '12px' }}>{item.date}</td>
                        <td style={{ padding: '12px' }}>{item.checkIn || '-'}</td>
                        <td style={{ padding: '12px' }}>{item.checkOut || '-'}</td>
                        <td style={{ padding: '12px' }}>{item.status}</td>
                      </>
                    )}
                    {reportType === 'leaves' && (
                      <>
                        <td style={{ padding: '12px' }}>{item.employeeId}</td>
                        <td style={{ padding: '12px' }}>{item.type}</td>
                        <td style={{ padding: '12px' }}>{item.startDate}</td>
                        <td style={{ padding: '12px' }}>{item.endDate}</td>
                        <td style={{ padding: '12px' }}>{item.days}</td>
                        <td style={{ padding: '12px' }}>{item.status}</td>
                      </>
                    )}
                    {reportType === 'employees' && (
                      <>
                        <td style={{ padding: '12px' }}>{item.firstName} {item.lastName}</td>
                        <td style={{ padding: '12px' }}>{item.email}</td>
                        <td style={{ padding: '12px' }}>{item.cedula}</td>
                        <td style={{ padding: '12px' }}>${item.baseSalary?.toLocaleString()}</td>
                        <td style={{ padding: '12px' }}>{item.status}</td>
                      </>
                    )}
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
