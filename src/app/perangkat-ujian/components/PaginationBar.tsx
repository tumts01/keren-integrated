'use client';

interface PaginationBarProps {
  totalItems: number;
  currentPage: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  pageSizeOptions?: number[];
}

export default function PaginationBar({
  totalItems,
  currentPage,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [25, 50, 100]
}: PaginationBarProps) {
  if (totalItems <= 0) return null;

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const startIdx = (safePage - 1) * pageSize + 1;
  const endIdx = Math.min(totalItems, safePage * pageSize);

  // Tampilkan maksimal 5 tombol nomor halaman di sekitar halaman aktif
  const pageNumbers: (number | 'ellipsis-left' | 'ellipsis-right')[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pageNumbers.push(i);
  } else {
    pageNumbers.push(1);
    const left = Math.max(2, safePage - 1);
    const right = Math.min(totalPages - 1, safePage + 1);
    if (left > 2) pageNumbers.push('ellipsis-left');
    for (let i = left; i <= right; i++) pageNumbers.push(i);
    if (right < totalPages - 1) pageNumbers.push('ellipsis-right');
    pageNumbers.push(totalPages);
  }

  const navBtnStyle = (disabled: boolean, active = false): React.CSSProperties => ({
    padding: '5px 10px',
    minWidth: '32px',
    borderRadius: '6px',
    border: active ? '1px solid #0284c7' : '1px solid #cbd5e1',
    background: active ? '#0284c7' : disabled ? '#f8fafc' : 'white',
    color: active ? 'white' : disabled ? '#94a3b8' : '#334155',
    fontSize: '12.5px',
    fontWeight: active ? 700 : 600,
    cursor: disabled ? 'not-allowed' : 'pointer',
    lineHeight: 1.2
  });

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '10px',
        padding: '12px 14px',
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        marginTop: '12px',
        fontSize: '12.5px',
        color: '#475569'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        <span>
          Menampilkan <b>{startIdx}–{endIdx}</b> dari <b>{totalItems}</b> data
        </span>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <span>Tampilkan:</span>
          <select
            value={pageSize}
            onChange={e => {
              onPageSizeChange(Number(e.target.value));
              onPageChange(1);
            }}
            style={{
              padding: '4px 8px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              background: 'white',
              fontSize: '12.5px',
              color: '#1e293b',
              fontWeight: 600
            }}
          >
            {pageSizeOptions.map(opt => (
              <option key={opt} value={opt}>
                {opt} baris
              </option>
            ))}
          </select>
        </label>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => onPageChange(1)}
          disabled={safePage <= 1}
          style={navBtnStyle(safePage <= 1)}
          title="Halaman Pertama"
        >
          &laquo;
        </button>
        <button
          type="button"
          onClick={() => onPageChange(safePage - 1)}
          disabled={safePage <= 1}
          style={navBtnStyle(safePage <= 1)}
          title="Sebelumnya"
        >
          &lsaquo;
        </button>

        {pageNumbers.map((item, idx) =>
          typeof item === 'number' ? (
            <button
              key={item}
              type="button"
              onClick={() => onPageChange(item)}
              style={navBtnStyle(false, item === safePage)}
            >
              {item}
            </button>
          ) : (
            <span key={`${item}-${idx}`} style={{ padding: '0 4px', color: '#94a3b8' }}>
              ...
            </span>
          )
        )}

        <button
          type="button"
          onClick={() => onPageChange(safePage + 1)}
          disabled={safePage >= totalPages}
          style={navBtnStyle(safePage >= totalPages)}
          title="Berikutnya"
        >
          &rsaquo;
        </button>
        <button
          type="button"
          onClick={() => onPageChange(totalPages)}
          disabled={safePage >= totalPages}
          style={navBtnStyle(safePage >= totalPages)}
          title="Halaman Terakhir"
        >
          &raquo;
        </button>
      </div>
    </div>
  );
}
