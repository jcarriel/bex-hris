import { useEffect, useRef, useState } from 'react';
import $ from 'jquery';
import 'datatables.net-dt';

interface Column {
  title: string;
  data: string;
  render?: (data: any, type: string, row: any) => string;
  width?: string;
  className?: string;
}

interface UseDataTableOptions {
  pageLength?: number;
  searching?: boolean;
  paging?: boolean;
  ordering?: boolean;
  info?: boolean;
  responsive?: boolean;
  [key: string]: any;
}

export const useDataTable = (
  tableRef: React.RefObject<HTMLTableElement>,
  data: any[],
  columns: Column[],
  options: UseDataTableOptions = {}
) => {
  const dataTableRef = useRef<any>(null);
  const [selectedRows, setSelectedRows] = useState<any[]>([]);

  useEffect(() => {
    if (!tableRef.current) return;

    // Destruir tabla anterior si existe
    if (dataTableRef.current) {
      try {
        dataTableRef.current.DataTable().destroy();
      } catch (e) {
        console.warn('Error destroying DataTable:', e);
      }
    }

    // Crear nueva instancia de DataTable
    const table = $(tableRef.current).DataTable({
      data: data,
      columns: columns,
      pageLength: options.pageLength || 10,
      searching: options.searching !== false,
      paging: options.paging !== false,
      ordering: options.ordering !== false,
      info: options.info !== false,
      responsive: options.responsive !== false,
      language: {
        search: 'Buscar:',
        lengthMenu: 'Mostrar _MENU_ registros por página',
        info: 'Mostrando _START_ a _END_ de _TOTAL_ registros',
        infoEmpty: 'No hay registros disponibles',
        infoFiltered: '(filtrado de _MAX_ registros totales)',
        paginate: {
          first: 'Primero',
          last: 'Último',
          next: 'Siguiente',
          previous: 'Anterior',
        },
        emptyTable: 'No hay datos disponibles en la tabla',
        zeroRecords: 'No se encontraron registros coincidentes',
      },
      dom: 'lfrtip',
      ...options,
    });

    dataTableRef.current = table;

    return () => {
      if (dataTableRef.current) {
        try {
          dataTableRef.current.DataTable().destroy();
        } catch (e) {
          console.warn('Error destroying DataTable on cleanup:', e);
        }
      }
    };
  }, [data, columns, options, tableRef]);

  const getSelectedRows = () => {
    if (!dataTableRef.current) return [];
    const rows = dataTableRef.current.DataTable().rows({ selected: true }).data();
    return Array.from(rows) as any[];
  };

  const clearSelection = () => {
    if (dataTableRef.current) {
      dataTableRef.current.DataTable().rows({ selected: true }).deselect();
      setSelectedRows([]);
    }
  };

  const selectAll = () => {
    if (dataTableRef.current) {
      dataTableRef.current.DataTable().rows().select();
      const rows = dataTableRef.current.DataTable().rows().data();
      setSelectedRows(Array.from(rows) as any[]);
    }
  };

  const reload = (newData?: any[]) => {
    if (dataTableRef.current) {
      const table = dataTableRef.current.DataTable();
      if (newData) {
        table.clear().rows.add(newData).draw();
      } else {
        table.draw();
      }
    }
  };

  return {
    dataTableRef,
    selectedRows,
    getSelectedRows,
    clearSelection,
    selectAll,
    reload,
  };
};
