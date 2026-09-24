'use client';

import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';

export default function BendaharaPerangkatUjian() {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(true);

  const [teachers, setTeachers] = useState<string[]>([]);
  const [columns, setColumns] = useState<{ id: string, name: string, nominal: number }[]>([]);
  const [dataMap, setDataMap] = useState<Record<string, Record<string, number>>>({});
  const [loadingData, setLoadingData] = useState(false);

  useEffect(() => {
    // Load data dari localstorage (jika ada)
    const savedCols = localStorage.getItem('bendahara_cols');
    const savedData = localStorage.getItem('bendahara_data');
    if (savedCols) setColumns(JSON.parse(savedCols));
    if (savedData) setDataMap(JSON.parse(savedData));

    // Fetch daftar guru
    if (isUnlocked) {
      setLoadingData(true);
      fetch('/api/guru')
        .then(res => res.json())
        .then(res => {
          if (res.success && res.data) {
            const names = res.data.map((g: any) => g.nama).filter(Boolean).sort();
            setTeachers(names);
          }
        })
        .finally(() => setLoadingData(false));
    }
  }, [isUnlocked]);

  // Simpan tiap kali ada perubahan
  useEffect(() => {
    if (columns.length > 0) localStorage.setItem('bendahara_cols', JSON.stringify(columns));
    if (Object.keys(dataMap).length > 0) localStorage.setItem('bendahara_data', JSON.stringify(dataMap));
  }, [columns, dataMap]);

  const handleAddColumn = async () => {
    const { value: formValues } = await Swal.fire({
      title: 'Tambah Kolom Opsional',
      html:
        '<input id="swal-input1" class="swal2-input" placeholder="Nama Kolom (Misal: Mengawas)">' +
        '<input id="swal-input2" type="number" class="swal2-input" placeholder="Nominal (Misal: 20000)">',
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Tambahkan',
      cancelButtonText: 'Batal',
      preConfirm: () => {
        const name = (document.getElementById('swal-input1') as HTMLInputElement).value;
        const nominalStr = (document.getElementById('swal-input2') as HTMLInputElement).value;
        if (!name || !nominalStr) {
          Swal.showValidationMessage('Nama kolom dan nominal wajib diisi!');
          return false;
        }
        return { name, nominal: parseInt(nominalStr, 10) };
      }
    });

    if (formValues) {
      const newCol = {
        id: 'col_' + Date.now(),
        name: formValues.name,
        nominal: formValues.nominal
      };
      setColumns([...columns, newCol]);
    }
  };

  const handleInputChange = (teacher: string, colId: string, val: string) => {
    const num = parseInt(val, 10) || 0;
    setDataMap(prev => ({
      ...prev,
      [teacher]: {
        ...(prev[teacher] || {}),
        [colId]: num
      }
    }));
  };

  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);
  };

  const calculateTotalRow = (teacher: string) => {
    let total = 0;
    const tData = dataMap[teacher] || {};
    columns.forEach(col => {
      const qty = tData[col.id] || 0;
      total += (qty * col.nominal);
    });
    return total;
  };

  const calculateTotalColumn = (colId: string) => {
    let total = 0;
    teachers.forEach(t => {
      total += (dataMap[t]?.[colId] || 0);
    });
    return total;
  };

  const calculateGrandTotal = () => {
    let grand = 0;
    teachers.forEach(t => {
      grand += calculateTotalRow(t);
    });
    return grand;
  };

  if (loading) return null;

  if (!isUnlocked) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh', background: '#f8fafc' }}>
        <form onSubmit={handleLogin} style={{ background: 'white', padding: '40px', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', width: '100%', maxWidth: '420px', border: '1px solid #f1f5f9' }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{ width: '64px', height: '64px', background: '#e0f2fe', borderRadius: '50%', display: 'inline-flex', justifyContent: 'center', alignItems: 'center', marginBottom: '16px', color: '#0284c7', fontSize: '24px' }}>
              <i className="fas fa-wallet"></i>
            </div>
            <h2 style={{ margin: 0, color: '#0f172a', fontSize: '1.5rem' }}>Login Bendahara</h2>
            <p style={{ margin: '8px 0 0 0', color: '#64748b', fontSize: '0.95rem' }}>Masukkan username khusus untuk mengakses fitur ini.</p>
          </div>
          
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: '#475569', fontWeight: 600, fontSize: '0.9rem' }}>Username</label>
            <input 
              type="text" 
              value={username} 
              onChange={e => setUsername(e.target.value)}
              style={{ width: '100%', padding: '14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem', outline: 'none', transition: 'border-color 0.2s' }}
              placeholder="Masukkan username"
              autoFocus
              required
            />
          </div>
          <button type="submit" style={{ width: '100%', padding: '14px', borderRadius: '8px', background: '#0284c7', color: 'white', border: 'none', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer', transition: 'background 0.2s', boxShadow: '0 4px 12px rgba(2, 132, 199, 0.2)' }}>
            Masuk <i className="fas fa-arrow-right" style={{ marginLeft: '8px' }}></i>
          </button>
        </form>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ margin: '0 0 8px 0', color: '#0f172a', fontSize: '1.8rem' }}>
            <i className="fas fa-wallet" style={{ color: '#0284c7', marginRight: '12px' }}></i>
            Dashboard Bendahara
          </h1>
          <p style={{ margin: 0, color: '#64748b' }}>Pengelolaan honor perangkat ujian</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            onClick={handleAddColumn}
            style={{ padding: '10px 16px', borderRadius: '8px', background: '#10b981', color: 'white', border: 'none', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <i className="fas fa-plus"></i> Tambah Kolom Honor
          </button>
          <button 
            onClick={handleLogout}
            style={{ padding: '10px 16px', borderRadius: '8px', background: 'white', color: '#ef4444', border: '1px solid #fca5a5', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <i className="fas fa-sign-out-alt"></i> Keluar
          </button>
        </div>
      </div>

      <div style={{ background: 'white', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', border: '1px solid #f1f5f9', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
            <thead style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
              <tr>
                <th style={{ padding: '16px', textAlign: 'center', color: '#475569', width: '60px' }}>No</th>
                <th style={{ padding: '16px', textAlign: 'left', color: '#475569', minWidth: '200px' }}>Nama Guru</th>
                {columns.map(col => (
                  <th key={col.id} style={{ padding: '16px', textAlign: 'center', color: '#475569', minWidth: '120px' }}>
                    <div style={{ fontSize: '0.95rem' }}>{col.name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#10b981', marginTop: '4px', fontWeight: 'normal' }}>
                      ({formatRupiah(col.nominal)})
                    </div>
                  </th>
                ))}
                <th style={{ padding: '16px', textAlign: 'right', color: '#0f172a', minWidth: '150px' }}>Total Honor</th>
              </tr>
            </thead>
            <tbody>
              {loadingData ? (
                <tr>
                  <td colSpan={columns.length + 3} style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                    <i className="fas fa-spinner fa-spin" style={{ marginRight: '8px' }}></i> Memuat data guru...
                  </td>
                </tr>
              ) : teachers.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + 3} style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                    Belum ada data guru.
                  </td>
                </tr>
              ) : (
                teachers.map((t, i) => (
                  <tr key={t} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px', textAlign: 'center', color: '#64748b' }}>{i + 1}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 500, color: '#334155' }}>{t}</td>
                    {columns.map(col => (
                      <td key={col.id} style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <input
                          type="number"
                          min="0"
                          value={dataMap[t]?.[col.id] || ''}
                          onChange={(e) => handleInputChange(t, col.id, e.target.value)}
                          style={{ width: '70px', padding: '8px', textAlign: 'center', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none' }}
                          placeholder="0"
                        />
                      </td>
                    ))}
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 'bold', color: '#0f172a', background: '#f8fafc' }}>
                      {formatRupiah(calculateTotalRow(t))}
                    </td>
                  </tr>
                ))
              )}
              {!loadingData && teachers.length > 0 && (
                <tr style={{ background: '#f1f5f9', borderTop: '2px solid #cbd5e1' }}>
                  <td colSpan={2} style={{ padding: '16px', textAlign: 'right', fontWeight: 'bold', color: '#0f172a' }}>
                    TOTAL KESELURUHAN
                  </td>
                  {columns.map(col => (
                    <td key={col.id} style={{ padding: '16px', textAlign: 'center', fontWeight: 'bold', color: '#0ea5e9' }}>
                      {calculateTotalColumn(col.id)} <span style={{ fontSize: '0.8rem', fontWeight: 'normal', color: '#64748b' }}>kali</span>
                    </td>
                  ))}
                  <td style={{ padding: '16px', textAlign: 'right', fontWeight: 'bold', color: '#0ea5e9', fontSize: '1.1rem' }}>
                    {formatRupiah(calculateGrandTotal())}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
