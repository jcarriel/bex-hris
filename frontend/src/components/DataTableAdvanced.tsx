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

interface DataTableAdvancedProps {
  data: any[];
  columns: Column[];
  pageLength?: number;
  excludeColumns?: number[];
}

const DataTableAdvanced: React.FC<DataTableAdvancedProps> = ({
  data,
  columns,
  pageLength = 10,
  excludeColumns = [],
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

    // Inicializar DataTable
    try {
      dataTableRef.current = new window.DataTable(table, {
        data: data,
        columns: columns,
        pageLength: pageLength,
        searching: false,
        destroy: true,
        dom: '<"flex justify-between items-center mb-4"f<"flex gap-2"B>>rtip',
        buttons: [
          {
            extend: 'excelHtml5',
            text: '📊 Excel',
            className: 'px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium',
            title: 'Empleados',
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
            title: 'Empleados',
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
      isInitializedRef.current = true;
    } catch (e) {
      console.error('Error initializing DataTable:', e);
    }
  }, [data, columns, pageLength]);

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

export default DataTableAdvanced;
