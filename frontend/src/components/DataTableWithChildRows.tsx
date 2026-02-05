import React, { useEffect, useRef, useCallback } from 'react';

declare global {
  interface Window {
    $: any;
    jQuery: any;
    DataTable: any;
  }
}

interface Column {
  title: string;
  data: string;
  render?: (data: any, type: string, row: any) => string;
}

interface DataTableWithChildRowsProps {
  data: any[];
  columns: Column[];
  childColumns?: Column[];
  pageLength?: number;
  excludeColumns?: number[];
  groupBy?: string;
  childRowsRender?: (row: any) => React.ReactNode;
  calculateSummary?: (records: any[]) => { totalDays: number; attendanceDays: number; totalHours?: number; totalMinutes?: number; totalTimeFormatted?: string; diasSinSalida?: number; diasSinEntrada?: number; diasConExceso?: number; totalDiasLaborables?: number };
}

const DataTableWithChildRows: React.FC<DataTableWithChildRowsProps> = ({
  data,
  columns,
  childColumns,
  pageLength = 10,
  excludeColumns = [],
  groupBy = 'cedula',
  childRowsRender,
  calculateSummary,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const dataTableRef = useRef<any>(null);
  const isInitializedRef = useRef(false);

  const destroyTable = useCallback(() => {
    if (dataTableRef.current) {
      try {
        dataTableRef.current.destroy(true);
      } catch (e) {
        // Ignorar errores de destrucción
      }
      dataTableRef.current = null;
    }
    isInitializedRef.current = false;
  }, []);

  const initTable = useCallback(() => {
    if (!containerRef.current || !window.DataTable || isInitializedRef.current) return;

    // Limpiar contenedor
    containerRef.current.innerHTML = '';

    // Crear tabla HTML
    const table = document.createElement('table');
    table.className = 'display compact stripe hover cell-border';
    table.style.width = '100%';

    // Crear thead
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    
    // Agregar columna para expandir/contraer
    const thExpand = document.createElement('th');
    thExpand.textContent = '';
    thExpand.style.width = '30px';
    headerRow.appendChild(thExpand);
    
    columns.forEach((col) => {
      const th = document.createElement('th');
      th.textContent = col.title;
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Crear tbody vacío
    const tbody = document.createElement('tbody');
    table.appendChild(tbody);

    // Agregar tabla al contenedor
    containerRef.current.appendChild(table);

    // Agrupar datos por empleado (cedula)
    const groupedData: { [key: string]: any[] } = {};
    data.forEach((row) => {
      const key = row[groupBy];
      if (!groupedData[key]) {
        groupedData[key] = [];
      }
      groupedData[key].push(row);
    });

    // Crear datos para la tabla con primera fila por empleado
    const tableData = Object.values(groupedData).map((group) => {
      const firstRow = group[0];
      const summary = calculateSummary ? calculateSummary(group) : { totalDays: group.length, attendanceDays: 0 };
      return {
        ...firstRow,
        totalDays: summary.totalDays,
        attendanceDays: summary.attendanceDays,
        totalTimeFormatted: summary.totalTimeFormatted || '',
        _childRows: group.slice(1),
        _allRows: group,
      };
    });

    // Inicializar DataTable
    try {
      dataTableRef.current = new window.DataTable(table, {
        data: tableData,
        columns: [
          {
            className: 'dt-control',
            orderable: false,
            data: null,
            defaultContent: '<span style="cursor: pointer; font-size: 16px;">▶</span>',
            width: '30px',
          },
          ...columns,
        ],
        pageLength: pageLength,
        searching: false,
        destroy: true,
        dom: '<"flex justify-between items-center mb-4"f<"flex gap-2"B>>rtip',
        buttons: [
          {
            extend: 'excelHtml5',
            text: '📊 Excel',
            className: 'px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium',
            title: 'Marcación',
            exportOptions: {
              columns: excludeColumns.length > 0 
                ? `:not(:nth-child(${excludeColumns.map(i => i + 1).join('), :not(:nth-child(')}))`
                : ':visible',
            },
          },
          {
            extend: 'pdfHtml5',
            text: '📋 PDF',
            className: 'px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm font-medium',
            title: 'Marcación',
            exportOptions: {
              columns: excludeColumns.length > 0 
                ? `:not(:nth-child(${excludeColumns.map(i => i + 1).join('), :not(:nth-child(')}))`
                : ':visible',
            },
          },
          {
            extend: 'print',
            text: '🖨️ Imprimir',
            className: 'px-3 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm font-medium',
            exportOptions: {
              columns: excludeColumns.length > 0 
                ? `:not(:nth-child(${excludeColumns.map(i => i + 1).join('), :not(:nth-child(')}))`
                : ':visible',
            },
          },
        ],
        language: {
          lengthMenu: '_MENU_ total por pagina',
          info: 'Viendo _START_ a _END_ de _TOTAL_ registros',
          infoEmpty: 'No hay registros disponibles',
          infoFiltered: '(filtrado de _MAX_ registros totales)',
          paginate: {
            first: '«',
            last: '»',
            next: '›',
            previous: '‹',
          },
          emptyTable: 'No hay datos disponibles',
          zeroRecords: 'No se encontraron registros coincidentes',
        },
      });

      // Manejar click en filas para expandir/contraer
      table.addEventListener('click', (e: any) => {
        const target = e.target as HTMLElement;
        const tr = target.closest('tr');
        
        if (target.classList.contains('dt-control') || target.parentElement?.classList.contains('dt-control')) {
          const row = dataTableRef.current.row(tr);
          
          if (row.child.isShown()) {
            row.child.hide();
            const span = target.tagName === 'SPAN' ? target : target.querySelector('span');
            if (span) span.textContent = '▶';
            if (tr) tr.style.background = '';
          } else {
            const childData = row.data()._allRows;
            const summary = calculateSummary ? calculateSummary(childData) : { totalDays: childData.length, attendanceDays: 0, diasSinSalida: 0, diasConExceso: 0, totalDiasLaborables: 0 };
            const colsToUse = childColumns || columns;
            
            // Crear contenedor para child rows
            const childContainer = document.createElement('div');
            childContainer.style.padding = '15px';
            childContainer.style.background = '#f9fafb';
            
            // Crear resumen del empleado
            const summaryDiv = document.createElement('div');
            summaryDiv.style.marginBottom = '15px';
            summaryDiv.style.padding = '15px';
            summaryDiv.style.background = '#f0f9ff';
            summaryDiv.style.borderRadius = '6px';
            summaryDiv.style.borderLeft = '4px solid #0284c7';
            
            let summaryHTML = `
              <div style="font-weight: 600; color: #0c4a6e; margin-bottom: 10px; font-size: 14px;">📊 Resumen del Período</div>
              <div style="color: #0c4a6e; font-size: 13px; display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px;">
                <div><span style="margin-right: 8px;">📅</span>Total de días: <strong>${summary.totalDays}</strong>${summary.totalDiasLaborables ? ` / ${summary.totalDiasLaborables}` : ''}</div>
            `;
            
            if (summary.diasSinSalida !== undefined) {
              summaryHTML += `<div><span style="margin-right: 8px;">🔴</span>Sin Salida: <strong>${summary.diasSinSalida}</strong></div>`;
            }
            
            if ((summary as any).diasSinEntrada !== undefined) {
              summaryHTML += `<div><span style="margin-right: 8px;">🟡</span>Sin Entrada: <strong>${(summary as any).diasSinEntrada}</strong></div>`;
            }
            
            if (summary.diasConExceso !== undefined) {
              summaryHTML += `<div><span style="margin-right: 8px;">🟠</span>Horas Exceso: <strong>${summary.diasConExceso}</strong></div>`;
            }
            
            summaryHTML += `</div>`;
            summaryDiv.innerHTML = summaryHTML;
            childContainer.appendChild(summaryDiv);
            
            // Crear tabla de child rows
            const childTable = document.createElement('table');
            childTable.style.width = '100%';
            childTable.style.borderCollapse = 'collapse';
            
            // Header
            const childThead = document.createElement('thead');
            const childHeaderRow = document.createElement('tr');
            childHeaderRow.style.background = '#1e293b';
            childHeaderRow.style.color = 'white';
            
            colsToUse.forEach((col) => {
              const th = document.createElement('th');
              th.textContent = col.title;
              th.style.padding = '12px';
              th.style.textAlign = 'left';
              th.style.borderBottom = '2px solid #0284c7';
              th.style.fontWeight = '600';
              th.style.fontSize = '13px';
              childHeaderRow.appendChild(th);
            });
            childThead.appendChild(childHeaderRow);
            childTable.appendChild(childThead);
            
            // Body
            const childTbody = document.createElement('tbody');
            childData.forEach((childRow: any, index: number) => {
              const childTr = document.createElement('tr');
              childTr.style.background = index % 2 === 0 ? '#f1f5f9' : 'white';
              childTr.style.borderBottom = '1px solid #e2e8f0';
              childTr.onmouseover = () => { childTr.style.background = '#e0f2fe'; };
              childTr.onmouseout = () => { childTr.style.background = index % 2 === 0 ? '#f1f5f9' : 'white'; };
              
              colsToUse.forEach((col) => {
                const td = document.createElement('td');
                let cellData = childRow[col.data];
                
                if (col.render) {
                  cellData = col.render(cellData, 'display', childRow);
                } else if (col.data === 'date' && cellData) {
                  cellData = new Date(cellData).toLocaleDateString('es-ES');
                }
                
                td.innerHTML = cellData || '-';
                td.style.padding = '10px 12px';
                td.style.fontSize = '13px';
                childTr.appendChild(td);
              });
              childTbody.appendChild(childTr);
            });
            childTable.appendChild(childTbody);
            
            childContainer.appendChild(childTable);
            
            row.child(childContainer).show();
            const span = target.tagName === 'SPAN' ? target : target.querySelector('span');
            if (span) span.textContent = '▼';
            if (tr) {
              tr.style.background = '#dbeafe';
              tr.style.fontWeight = '600';
            }
          }
        }
      });

      isInitializedRef.current = true;
    } catch (e) {
      console.error('Error initializing DataTable:', e);
    }
  }, [data, columns, childColumns, pageLength, groupBy, calculateSummary]);

  useEffect(() => {
    // Esperar a que DataTable esté disponible
    const checkAndInit = () => {
      if (window.DataTable) {
        destroyTable();
        initTable();
      } else {
        setTimeout(checkAndInit, 100);
      }
    };

    checkAndInit();

    return () => {
      destroyTable();
      // Limpiar contenedor al desmontar
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [data, columns, pageLength, destroyTable, initTable]);

  return <div ref={containerRef} style={{ width: '100%' }} />;
};

export default DataTableWithChildRows;
