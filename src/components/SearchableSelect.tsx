import React, { useState, useRef, useEffect, useMemo } from 'react';

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
    if (isOpen) {
      setTimeout(() => {
        if (inputRef.current) inputRef.current.focus();
      }, 50);
    } else {
      setSearch('');
    }
  }, [isOpen]);

  const selectedOpt = options.find(o => o.value === value);
  
  const searchWords = useMemo(() => {
    return search.toLowerCase().trim().split(/\s+/).filter(Boolean);
  }, [search]);

  const filtered = useMemo(() => {
    if (searchWords.length === 0) return options.slice(0, 50); // Batasi render awal 50 item agar super cepat
    return options.filter(o => {
      const target = `${o.label} ${o.subLabel || ''} ${o.value}`.toLowerCase();
      return searchWords.every(word => target.includes(word));
    }).slice(0, 100); // Batasi maksimal 100 hasil pencarian
  }, [options, searchWords]);

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
        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {selectedOpt ? (
            <>
              {selectedOpt.label} {selectedOpt.subLabel && <span style={{ color: '#64748b', fontSize: '0.8rem', marginLeft: 6 }}>({selectedOpt.subLabel})</span>}
            </>
          ) : placeholder}
        </span>
        <i className={`fas fa-chevron-${isOpen ? 'up' : 'down'}`} style={{ color: '#94a3b8', fontSize: '0.8rem', marginLeft: '8px' }}></i>
      </div>

      {isOpen && (
        <div style={{ 
          position: 'absolute', 
          top: '100%', 
          left: 0, 
          right: 0, 
          zIndex: 9999, 
          marginTop: '4px',
          background: 'white',
          border: '1px solid #cbd5e1',
          borderRadius: '8px',
          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.15)',
          overflow: 'hidden'
        }}>
          <div style={{ padding: '8px', borderBottom: '1px solid #f1f5f9' }}>
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Ketik nama siswa, kelas, atau NIS..."
              style={{ 
                width: '100%', 
                padding: '9px 12px', 
                border: '1.5px solid #10b981', 
                borderRadius: '6px',
                outline: 'none',
                fontSize: '0.9rem',
                boxSizing: 'border-box'
              }}
            />
          </div>
          <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
            {filtered.length > 0 ? (
              filtered.map((o, idx) => (
                <div 
                  key={`${o.value}_${idx}`}
                  onClick={() => {
                    onChange(o.value);
                    setIsOpen(false);
                    setSearch('');
                  }}
                  onMouseOver={e => e.currentTarget.style.background = '#f0fdf4'}
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
                  <span style={{ fontWeight: 600 }}>{o.label}</span>
                  {o.subLabel && (
                    <span style={{ color: '#0369a1', fontSize: '0.8rem', background: '#e0f2fe', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                      {o.subLabel}
                    </span>
                  )}
                </div>
              ))
            ) : (
              <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem' }}>
                <i className="fas fa-search" style={{ marginBottom: '6px', fontSize: '1.2rem', display: 'block', opacity: 0.5 }}></i>
                Tidak ditemukan siswa dengan kata kunci "{search}"
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
