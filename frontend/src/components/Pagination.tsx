interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  itemsPerPage: number;
  onItemsPerPageChange?: (items: number) => void;
  totalItems: number;
}

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  itemsPerPage,
  onItemsPerPageChange,
  totalItems,
}: PaginationProps) {
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);

      if (currentPage > 3) {
        pages.push('...');
      }

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push('...');
      }

      pages.push(totalPages);
    }

    return pages;
  };

  return (
    <div style={{
      background: 'white',
      padding: '15px',
      borderRadius: '8px',
      marginTop: '20px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: '15px',
    }}>
      <div style={{ fontSize: '14px', color: '#666' }}>
        Mostrando {startItem} a {endItem} de {totalItems} resultados
      </div>

      {onItemsPerPageChange && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label style={{ fontSize: '14px', color: '#666' }}>Elementos por página:</label>
          <select
            value={itemsPerPage}
            onChange={(e) => onItemsPerPageChange(parseInt(e.target.value))}
            style={{
              padding: '6px 10px',
              border: '1px solid #ddd',
              borderRadius: '5px',
              fontSize: '14px',
            }}
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      )}

      <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          style={{
            padding: '6px 10px',
            border: '1px solid #ddd',
            background: currentPage === 1 ? '#f5f5f5' : 'white',
            borderRadius: '5px',
            cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
            fontSize: '12px',
            opacity: currentPage === 1 ? 0.5 : 1,
          }}
        >
          ⏮ Primera
        </button>

        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          style={{
            padding: '6px 10px',
            border: '1px solid #ddd',
            background: currentPage === 1 ? '#f5f5f5' : 'white',
            borderRadius: '5px',
            cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
            fontSize: '12px',
            opacity: currentPage === 1 ? 0.5 : 1,
          }}
        >
          ◀ Anterior
        </button>

        {getPageNumbers().map((page, index) => (
          <button
            key={index}
            onClick={() => typeof page === 'number' && onPageChange(page)}
            disabled={page === '...' || page === currentPage}
            style={{
              padding: '6px 10px',
              border: page === currentPage ? '2px solid #667eea' : '1px solid #ddd',
              background: page === currentPage ? '#667eea' : 'white',
              color: page === currentPage ? 'white' : '#333',
              borderRadius: '5px',
              cursor: page === '...' || page === currentPage ? 'default' : 'pointer',
              fontSize: '12px',
              fontWeight: page === currentPage ? 'bold' : 'normal',
            }}
          >
            {page}
          </button>
        ))}

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          style={{
            padding: '6px 10px',
            border: '1px solid #ddd',
            background: currentPage === totalPages ? '#f5f5f5' : 'white',
            borderRadius: '5px',
            cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
            fontSize: '12px',
            opacity: currentPage === totalPages ? 0.5 : 1,
          }}
        >
          Siguiente ▶
        </button>

        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          style={{
            padding: '6px 10px',
            border: '1px solid #ddd',
            background: currentPage === totalPages ? '#f5f5f5' : 'white',
            borderRadius: '5px',
            cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
            fontSize: '12px',
            opacity: currentPage === totalPages ? 0.5 : 1,
          }}
        >
          Última ⏭
        </button>
      </div>
    </div>
  );
}
