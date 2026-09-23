'use client';

import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import InlineLoading from '@/components/InlineLoading';

export default function MonitoringOlimpiadePage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCabang, setFilterCabang] = useState('Semua');
  const [cabangOptions, setCabangOptions] = useState<string[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/olimpiade-seni/monitoring');
      const json = await res.json();
      if (json.success) {
        setData(json.data);
        
        // Ekstrak cabang lomba unik
        const cabangs = Array.from(new Set(json.data.map((d: any) => d.cabang_lomba))).filter(Boolean).sort();
        setCabangOptions(cabangs as string[]);
      }
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'Gagal memuat data monitoring', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredData = filterCabang === 'Semua' 
    ? data 
    : data.filter(d => d.cabang_lomba === filterCabang);

  // Re-sort karena gabungan mungkin tidak urut per cabang
  const sortedData = [...filteredData].sort((a, b) => Number(b.rata_rata) - Number(a.rata_rata));

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ margin: '0 0 8px 0', color: '#0f172a' }}>Monitoring Pemenang (Live Score)</h2>
          <p style={{ margin: 0, color: '#64748b' }}>Klasemen nilai peserta Olimpiade & Lomba Seni secara real-time</p>
        </div>
        <button 
          onClick={fetchData}
          style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '10px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 }}
        >
          <i className={`fas fa-sync ${loading ? 'fa-spin' : ''}`}></i> Refresh
        </button>
      </div>

      <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '20px' }}>
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#334155' }}>Filter Cabang Lomba</label>
          <select 
            value={filterCabang} 
            onChange={(e) => setFilterCabang(e.target.value)}
            style={{ padding: '10px 15px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', minWidth: '300px' }}
          >
            <option value="Semua">Semua Cabang Lomba</option>
            {cabangOptions.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div style={{ padding: '40px 0', textAlign: 'center' }}>
            <InlineLoading message="Menghitung klasemen..." />
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', color: '#334155', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '15px' }}>Peringkat</th>
                  <th style={{ padding: '15px' }}>Nama Peserta</th>
                  <th style={{ padding: '15px' }}>Asal Sekolah</th>
                  {filterCabang === 'Semua' && <th style={{ padding: '15px' }}>Cabang Lomba</th>}
                  <th style={{ padding: '15px', textAlign: 'center' }}>Jumlah Juri</th>
                  <th style={{ padding: '15px', textAlign: 'right' }}>Nilai Rata-rata</th>
                </tr>
              </thead>
              <tbody>
                {sortedData.length === 0 ? (
                  <tr>
                    <td colSpan={filterCabang === 'Semua' ? 6 : 5} style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
                      Belum ada data nilai masuk.
                    </td>
                  </tr>
                ) : (
                  sortedData.map((d, i) => (
                    <tr key={d.id} style={{ borderBottom: '1px solid #e2e8f0', background: i === 0 ? '#fef9c3' : i === 1 ? '#f3f4f6' : i === 2 ? '#ffedd5' : 'transparent' }}>
                      <td style={{ padding: '15px', fontWeight: 'bold', color: i === 0 ? '#ca8a04' : i === 1 ? '#64748b' : i === 2 ? '#ea580c' : '#334155' }}>
                        {i === 0 ? <><i className="fas fa-trophy" style={{color: '#eab308'}}></i> 1</> : 
                         i === 1 ? <><i className="fas fa-medal" style={{color: '#94a3b8'}}></i> 2</> : 
                         i === 2 ? <><i className="fas fa-medal" style={{color: '#c2410c'}}></i> 3</> : 
                         i + 1}
                      </td>
                      <td style={{ padding: '15px', fontWeight: 600 }}>{d.nama}</td>
                      <td style={{ padding: '15px', color: '#64748b' }}>{d.asal_sekolah || '-'}</td>
                      {filterCabang === 'Semua' && <td style={{ padding: '15px', color: '#0ea5e9', fontWeight: 500 }}>{d.cabang_lomba}</td>}
                      <td style={{ padding: '15px', textAlign: 'center' }}>
                        <span style={{ background: '#e2e8f0', padding: '4px 10px', borderRadius: '20px', fontSize: '0.8rem' }}>
                          {d.jumlah_juri} Juri
                        </span>
                      </td>
                      <td style={{ padding: '15px', textAlign: 'right', fontWeight: 'bold', fontSize: '1.1rem', color: '#10b981' }}>
                        {d.rata_rata}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
