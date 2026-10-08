import React, { useState, useRef, useEffect } from 'react';

interface Option {
  value: string;
  label: string;
  subLabel?: string;
}

interface SearchableSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function SearchableSelect({ options, value, onChange, placeholder = 'Pilih...' }: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    } else {
      setSearch('');
    }
  }, [isOpen]);

  const selectedOpt = options.find(o => o.value === value);
  
  const filtered = options.filter(o => 
    o.label.toLowerCase().includes(search.toLowerCase()) || 
    (o.subLabel && o.subLabel.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div ref={wrapperRef} style={{ position: 'relative', width: '100%', marginBottom: '10px' }}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        style={{ 
          padding: '10px 14px', 
          border: '1px solid #cbd5e1', 
          borderRadius: '8px', 
          background: 'white', 
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.9rem',
          color: selectedOpt ? '#1e293b' : '#94a3b8'
        }}
      >
        <span>
          {selectedOpt ? (
            <>
              {selectedOpt.label} {selectedOpt.subLabel && <span style={{ color: '#64748b', fontSize: '0.8rem', marginLeft: 6 }}>({selectedOpt.subLabel})</span>}
            </>
          ) : placeholder}
        </span>
        <i className={`fas fa-chevron-${isOpen ? 'up' : 'down'}`} style={{ color: '#cbd5e1', fontSize: '0.8rem' }}></i>
      </div>

      {isOpen && (
        <div style={{ 
          position: 'absolute', 
          top: '100%', 
          left: 0, 
          right: 0, 
          zIndex: 50, 
          marginTop: '4px',
          background: 'white',
          border: '1px solid #cbd5e1',
          borderRadius: '8px',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
          overflow: 'hidden'
        }}>
          <div style={{ padding: '8px', borderBottom: '1px solid #f1f5f9' }}>
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Ketik untuk mencari..."
              style={{ 
                width: '100%', 
                padding: '8px 12px', 
                border: '1px solid #e2e8f0', 
                borderRadius: '4px',
                outline: 'none',
                fontSize: '0.9rem'
              }}
            />
          </div>
          <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
            {filtered.length > 0 ? filtered.map(o => (
              <div 
                key={o.value}
                onClick={() => {
                  onChange(o.value);
                  setIsOpen(false);
                }}
                onMouseOver={e => e.currentTarget.style.background = '#f8fafc'}
                onMouseOut={e => e.currentTarget.style.background = 'white'}
                style={{ 
                  padding: '10px 14px', 
                  cursor: 'pointer',
                  borderBottom: '1px solid #f8fafc',
                  fontSize: '0.9rem',
                  color: '#1e293b',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <span>{o.label}</span>
                {o.subLabel && <span style={{ color: '#94a3b8', fontSize: '0.8rem', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>{o.subLabel}</span>}
              </div>
            )) : (
              <div style={{ padding: '15px', textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem' }}>
                Pencarian tidak ditemukan
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
