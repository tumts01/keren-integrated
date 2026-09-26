'use client';

import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';

export default function BendaharaPerangkatUjian() {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(true);

  const [apiTeachers, setApiTeachers] = useState<string[]>([]);
  const [manualTeachers, setManualTeachers] = useState<string[]>([]);
  const [columns, setColumns] = useState<{ id: string, name: string, nominal: number, type?: 'plus' | 'minus', inputType?: 'multiplier' | 'direct' }[]>([]);
  const [dataMap, setDataMap] = useState<Record<string, Record<string, number>>>({});
  const [loadingData, setLoadingData] = useState(false);

  const [namaUjian, setNamaUjian] = useState('SUMATIF AKHIR SEMESTER GENAP');
  const [tahunUjian, setTahunUjian] = useState('TAHUN 2025 / 2026');
  const [printMode, setPrintMode] = useState<string[]>([]);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  const teachers = [...apiTeachers, ...manualTeachers];

  useEffect(() => {
    // Cek session di localStorage (sederhana)
    const session = localStorage.getItem('bendahara_pu_session');
    if (session === 'unlocked') {
      setIsUnlocked(true);
    }
    setLoading(false);

    // Load data dari localstorage (sebagai backup / initial load cepat)
    const savedCols = localStorage.getItem('bendahara_cols');
    const savedData = localStorage.getItem('bendahara_data');
    const savedConfig = localStorage.getItem('bendahara_config');
    
    if (savedCols) setColumns(JSON.parse(savedCols));
    if (savedData) setDataMap(JSON.parse(savedData));
    if (savedConfig) {
      const parsed = JSON.parse(savedConfig);
      if (parsed.namaUjian) setNamaUjian(parsed.namaUjian);
      if (parsed.tahunUjian) setTahunUjian(parsed.tahunUjian);
      if (parsed.manualTeachers) setManualTeachers(parsed.manualTeachers);
    }

    // Fetch dari Supabase Database
    fetch('/api/bendahara')
      .then(res => res.json())
      .then(res => {
        if (res.success && res.data) {
          // Jika DB ada isinya, timpa local storage
          if (res.data.columns && res.data.columns.length > 0) {
            setColumns(res.data.columns);
            setDataMap(res.data.data_map || {});
            if (res.data.config?.namaUjian) setNamaUjian(res.data.config.namaUjian);
            if (res.data.config?.tahunUjian) setTahunUjian(res.data.config.tahunUjian);
            if (res.data.config?.manualTeachers) setManualTeachers(res.data.config.manualTeachers);
          }
        }
      })
      .finally(() => {
        setIsDataLoaded(true);
      });
  }, []);

  useEffect(() => {
    // Fetch daftar guru
    if (isUnlocked && apiTeachers.length === 0) {
      setLoadingData(true);
      fetch('/api/guru')
        .then(res => res.json())
        .then(res => {
          if (res.success && res.data) {
            const names = res.data
              .filter((g: any) => g.status?.toLowerCase() !== 'tidak aktif')
              .map((g: any) => g.nama)
              .filter(Boolean);
            setApiTeachers(names);
          }
        })
        .finally(() => setLoadingData(false));
    }
  }, [isUnlocked, apiTeachers.length]);

  // Simpan tiap kali ada perubahan (Debounce 1 detik ke Database)
  useEffect(() => {
    if (!isDataLoaded) return;

    if (columns.length > 0) localStorage.setItem('bendahara_cols', JSON.stringify(columns));
    if (Object.keys(dataMap).length > 0) localStorage.setItem('bendahara_data', JSON.stringify(dataMap));
    localStorage.setItem('bendahara_config', JSON.stringify({ namaUjian, tahunUjian, manualTeachers }));

    const timer = setTimeout(() => {
      fetch('/api/bendahara', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ columns, dataMap, config: { namaUjian, tahunUjian, manualTeachers } })
      }).catch(err => console.error('Failed to sync bendahara data:', err));
    }, 1500);

    return () => clearTimeout(timer);
  }, [columns, dataMap, namaUjian, tahunUjian, manualTeachers, isDataLoaded]);

  const [isPrintTandaTerima, setIsPrintTandaTerima] = useState(false);

  useEffect(() => {
    if (printMode.length > 0) {
      setTimeout(() => {
        window.print();
        setPrintMode([]);
      }, 500);
    }
  }, [printMode]);

  useEffect(() => {
    if (isPrintTandaTerima) {
      setTimeout(() => {
        window.print();
        setIsPrintTandaTerima(false);
      }, 500);
    }
  }, [isPrintTandaTerima]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === 'kayarayahahaha') {
      localStorage.setItem('bendahara_pu_session', 'unlocked');
      setIsUnlocked(true);
      Swal.fire({
        icon: 'success',
        title: 'Login Berhasil',
        text: 'Selamat datang, Bendahara!',
        timer: 1500,
        showConfirmButton: false
      });
    } else {
      Swal.fire('Akses Ditolak', 'Username salah!', 'error');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('bendahara_pu_session');
    setIsUnlocked(false);
    setUsername('');
  };

  const handleAddColumn = async () => {
    const { value: formValues } = await Swal.fire({
      title: 'Tambah Kolom',
      html:
        '<input id="swal-input1" class="swal2-input" placeholder="Nama Kolom (Misal: Mengawas/Tabungan)">' +
        '<select id="swal-input4" class="swal2-input" style="width: 84%; height: 44px; margin-top: 15px;" onchange="document.getElementById(\'swal-input2\').style.display = this.value === \'direct\' ? \'none\' : \'block\'">' +
        '  <option value="multiplier">Isian Frekuensi (x Nominal Tetap)</option>' +
        '  <option value="direct">Isian Nominal Bebas (Langsung Rp)</option>' +
        '</select>' +
        '<input id="swal-input2" type="number" class="swal2-input" placeholder="Nominal Tetap (Misal: 20000)">' +
        '<select id="swal-input3" class="swal2-input" style="width: 84%; height: 44px; margin-top: 15px;">' +
        '  <option value="plus">Penambahan (+)</option>' +
        '  <option value="minus">Pengurangan / Potongan (-)</option>' +
        '</select>',
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Tambahkan',
      cancelButtonText: 'Batal',
      preConfirm: () => {
        const name = (document.getElementById('swal-input1') as HTMLInputElement).value;
        const inputType = (document.getElementById('swal-input4') as HTMLSelectElement).value;
        const isDirect = inputType === 'direct';
        const nominalStr = (document.getElementById('swal-input2') as HTMLInputElement).value;
        const type = (document.getElementById('swal-input3') as HTMLSelectElement).value;
        
        if (!name || (!isDirect && !nominalStr)) {
          Swal.showValidationMessage('Nama kolom dan nominal wajib diisi!');
          return false;
        }
        return { name, nominal: isDirect ? 1 : parseInt(nominalStr, 10), type: type as 'plus' | 'minus', inputType: inputType as 'multiplier' | 'direct' };
      }
    });

    if (formValues) {
      const newCol = {
        id: 'col_' + Date.now(),
        name: formValues.name,
        nominal: formValues.nominal,
        type: formValues.type,
        inputType: formValues.inputType
      };
      setColumns([...columns, newCol]);
    }
  };

  const handleAddManualTeacher = async () => {
    const { value: name } = await Swal.fire({
      title: 'Tambah Nama Manual',
      input: 'text',
      inputPlaceholder: 'Masukkan nama lengkap...',
      showCancelButton: true,
      confirmButtonText: 'Tambahkan',
      cancelButtonText: 'Batal',
      inputValidator: (value) => {
        if (!value) {
          return 'Nama tidak boleh kosong!';
        }
      }
    });

    if (name) {
      setManualTeachers(prev => [...prev, name.trim()]);
    }
  };

  const handleDeleteColumn = (colId: string) => {
    Swal.fire({
      title: 'Hapus Kolom?',
      text: 'Semua nominal guru pada kolom ini akan hilang!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#cbd5e1',
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal'
    }).then((result) => {
      if (result.isConfirmed) {
        setColumns(prev => prev.filter(c => c.id !== colId));
        setDataMap(prev => {
          const newData = { ...prev };
          Object.keys(newData).forEach(teacher => {
            if (newData[teacher]) {
              const teacherData = { ...newData[teacher] };
              delete teacherData[colId];
              newData[teacher] = teacherData;
            }
          });
          return newData;
        });
      }
    });
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
      const isMinus = col.type === 'minus';
      total += (qty * col.nominal) * (isMinus ? -1 : 1);
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
    <div style={{ padding: '24px', maxWidth: '100%', margin: '0 auto' }}>
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
            onClick={() => { if (teachers.length > 0) setPrintMode(teachers); }}
            style={{ padding: '10px 16px', borderRadius: '8px', background: '#0284c7', color: 'white', border: 'none', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <i className="fas fa-print"></i> Cetak Semua Slip
          </button>
          <button 
            onClick={() => { if (teachers.length > 0) setIsPrintTandaTerima(true); }}
            style={{ padding: '10px 16px', borderRadius: '8px', background: '#6366f1', color: 'white', border: 'none', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <i className="fas fa-file-signature"></i> Cetak Tanda Terima
          </button>
          <button 
            onClick={handleAddColumn}
            style={{ padding: '10px 16px', borderRadius: '8px', background: '#10b981', color: 'white', border: 'none', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <i className="fas fa-plus"></i> Tambah Kolom
          </button>
          <button 
            onClick={handleAddManualTeacher}
            style={{ padding: '10px 16px', borderRadius: '8px', background: '#f59e0b', color: 'white', border: 'none', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <i className="fas fa-user-plus"></i> Tambah Nama
          </button>
          <button 
            onClick={handleLogout}
            style={{ padding: '10px 16px', borderRadius: '8px', background: 'white', color: '#ef4444', border: '1px solid #fca5a5', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <i className="fas fa-sign-out-alt"></i> Keluar
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', background: 'white', padding: '16px', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontSize: '0.85rem', color: '#64748b', marginBottom: '4px', fontWeight: 'bold' }}>Nama Ujian (Untuk Kop Slip)</label>
          <input type="text" value={namaUjian} onChange={(e) => setNamaUjian(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }} placeholder="Misal: SUMATIF AKHIR SEMESTER GENAP" />
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontSize: '0.85rem', color: '#64748b', marginBottom: '4px', fontWeight: 'bold' }}>Tahun Ajaran</label>
          <input type="text" value={tahunUjian} onChange={(e) => setTahunUjian(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }} placeholder="Misal: TAHUN 2025 / 2026" />
        </div>
      </div>

      <div style={{ background: 'white', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', border: '1px solid #f1f5f9', overflow: 'hidden' }}>
        <div style={{ overflow: 'auto', maxHeight: 'calc(100vh - 250px)' }}>
          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, minWidth: '800px' }}>
            <thead style={{ background: '#f8fafc' }}>
              <tr>
                <th style={{ padding: '16px', textAlign: 'center', color: '#475569', width: '60px', position: 'sticky', top: 0, left: 0, backgroundColor: '#f8fafc', zIndex: 30, borderBottom: '2px solid #e2e8f0' }}>No</th>
                <th style={{ padding: '16px', textAlign: 'left', color: '#475569', minWidth: '200px', position: 'sticky', top: 0, left: '60px', backgroundColor: '#f8fafc', zIndex: 30, borderRight: '2px solid #e2e8f0', borderBottom: '2px solid #e2e8f0' }}>Nama Guru</th>
                {columns.map(col => (
                  <th key={col.id} style={{ padding: '16px', textAlign: 'center', color: '#475569', minWidth: '120px', position: 'sticky', top: 0, backgroundColor: '#f8fafc', zIndex: 20, borderBottom: '2px solid #e2e8f0' }}>
                    <div style={{ fontSize: '0.95rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                      {col.name}
                      <button onClick={() => handleDeleteColumn(col.id)} style={{ border: 'none', background: 'transparent', color: '#fca5a5', cursor: 'pointer', padding: 0 }} title="Hapus Kolom">
                        <i className="fas fa-times"></i>
                      </button>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: col.type === 'minus' ? '#ef4444' : '#10b981', marginTop: '4px', fontWeight: 'normal' }}>
                      {col.inputType === 'direct' ? '(Nominal Bebas)' : `(${col.type === 'minus' ? '-' : '+'}${formatRupiah(col.nominal)})`}
                    </div>
                  </th>
                ))}
                <th style={{ padding: '16px', textAlign: 'right', color: '#0f172a', minWidth: '150px', position: 'sticky', top: 0, backgroundColor: '#f8fafc', zIndex: 20, borderBottom: '2px solid #e2e8f0' }}>Total Honor</th>
                <th style={{ padding: '16px', textAlign: 'center', color: '#475569', minWidth: '80px', position: 'sticky', top: 0, backgroundColor: '#f8fafc', zIndex: 20, borderBottom: '2px solid #e2e8f0' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loadingData ? (
                <tr>
                  <td colSpan={columns.length + 4} style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                    <i className="fas fa-spinner fa-spin" style={{ marginRight: '8px' }}></i> Memuat data guru...
                  </td>
                </tr>
              ) : teachers.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + 4} style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                    Belum ada data guru.
                  </td>
                </tr>
              ) : (
                teachers.map((t, i) => (
                  <tr key={t}>
                    <td style={{ padding: '12px 16px', textAlign: 'center', color: '#64748b', position: 'sticky', left: 0, backgroundColor: 'white', zIndex: 5, borderBottom: '1px solid #f1f5f9' }}>{i + 1}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 500, color: '#334155', position: 'sticky', left: '60px', backgroundColor: 'white', zIndex: 5, borderRight: '2px solid #e2e8f0', borderBottom: '1px solid #f1f5f9' }}>{t}</td>
                    {columns.map(col => (
                      <td key={col.id} style={{ padding: '12px 16px', textAlign: 'center', borderBottom: '1px solid #f1f5f9' }}>
                        <input
                          type="number"
                          min="0"
                          value={dataMap[t]?.[col.id] || ''}
                          onChange={(e) => handleInputChange(t, col.id, e.target.value)}
                          style={{ 
                            width: col.inputType === 'direct' ? '110px' : '70px', padding: '8px', textAlign: 'center', borderRadius: '6px', 
                            border: col.type === 'minus' ? '1px solid #fca5a5' : '1px solid #cbd5e1', 
                            color: col.type === 'minus' ? '#ef4444' : 'inherit',
                            outline: 'none',
                            backgroundColor: col.type === 'minus' ? '#fef2f2' : 'white'
                          }}
                          placeholder="0"
                        />
                      </td>
                    ))}
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 'bold', color: '#0f172a', backgroundColor: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                      {formatRupiah(calculateTotalRow(t))}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', borderBottom: '1px solid #f1f5f9' }}>
                      <button onClick={() => setPrintMode([t])} style={{ padding: '6px 12px', borderRadius: '6px', background: '#e2e8f0', border: 'none', cursor: 'pointer', fontSize: '0.85rem', color: '#334155', fontWeight: 'bold' }} title="Cetak Slip">
                        <i className="fas fa-print"></i>
                      </button>
                    </td>
                  </tr>
                ))
              )}
              {!loadingData && teachers.length > 0 && (
                <tr style={{ background: '#f1f5f9', borderTop: '2px solid #cbd5e1' }}>
                  <td colSpan={2} style={{ padding: '16px', textAlign: 'right', fontWeight: 'bold', color: '#0f172a', position: 'sticky', left: 0, background: '#f1f5f9', zIndex: 10, borderRight: '2px solid #cbd5e1' }}>
                    TOTAL KESELURUHAN
                  </td>
                  {columns.map(col => (
                    <td key={col.id} style={{ padding: '16px', textAlign: 'center', fontWeight: 'bold', color: col.type === 'minus' ? '#ef4444' : '#0ea5e9' }}>
                      {col.inputType === 'direct' ? formatRupiah(calculateTotalColumn(col.id)) : (
                        <>{calculateTotalColumn(col.id)} <span style={{ fontSize: '0.8rem', fontWeight: 'normal', color: '#64748b' }}>kali</span></>
                      )}
                    </td>
                  ))}
                  <td style={{ padding: '16px', textAlign: 'right', fontWeight: 'bold', color: '#0ea5e9', fontSize: '1.1rem' }}>
                    {formatRupiah(calculateGrandTotal())}
                  </td>
                  <td></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {printMode.length > 0 && (
        <div id="print-area" style={{ background: 'white', color: 'black', fontFamily: 'Arial, sans-serif' }}>
          <style>{`
            @media print {
              body * { visibility: hidden; }
              #print-area, #print-area * { visibility: visible; }
              #print-area { position: absolute; left: 0; top: 0; width: 100%; display: flex; flex-wrap: wrap; gap: 0.5cm; }
              @page { size: 215mm 330mm; margin: 0.5cm; }
            }
          `}</style>
          {printMode.map(t => {
            const plusCols = columns.filter(c => c.type !== 'minus');
            const minusCols = columns.filter(c => c.type === 'minus');
            let jumlah = 0;
            let counter = 1;
            return (
              <div key={t} style={{ width: '9cm', height: '10cm', border: '2px solid black', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', fontSize: '10px', overflow: 'hidden', pageBreakInside: 'avoid' }}>
                <div style={{ background: '#92D050', textAlign: 'center', padding: '4px', borderBottom: '2px solid black' }}>
                  <div style={{ fontWeight: 'bold', color: '#002060', fontSize: '12px', marginBottom: '2px' }}>INSENTIF</div>
                  <div style={{ fontWeight: 'bold', color: '#002060', fontSize: '11px', marginBottom: '2px' }}>{namaUjian.toUpperCase()}</div>
                  <div style={{ color: '#002060', fontSize: '10px' }}>{tahunUjian.toUpperCase()}</div>
                </div>
                <div style={{ textAlign: 'center', fontWeight: 'bold', color: '#002060', padding: '4px', borderBottom: '2px solid black', fontSize: '11px' }}>
                  {t}
                </div>
                <div style={{ flex: 1, padding: '2px 4px', display: 'flex', flexDirection: 'column' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <tbody>
                      {plusCols.map(c => {
                         const qty = dataMap[t]?.[c.id] || 0;
                         const amount = c.inputType === 'direct' ? qty : qty * c.nominal;
                         jumlah += amount;
                         return (
                           <tr key={c.id}>
                             <td style={{ width: '15px', textAlign: 'right', paddingRight: '4px' }}>{counter++}</td>
                             <td style={{ color: '#002060' }}>{c.name}</td>
                             <td style={{ width: '10px', textAlign: 'center' }}>:</td>
                             <td style={{ width: '20px', textAlign: 'center' }}>{c.inputType === 'multiplier' && qty > 0 ? qty : '-'}</td>
                             <td style={{ width: '15px' }}>Rp</td>
                             <td style={{ textAlign: 'right' }}>{amount === 0 ? '-' : amount.toLocaleString('id-ID')}</td>
                           </tr>
                         )
                      })}
                      <tr style={{ borderTop: '2px solid black', borderBottom: '2px solid black', fontWeight: 'bold', color: '#002060' }}>
                         <td colSpan={2}>Jumlah</td>
                         <td style={{ textAlign: 'center' }}>:</td>
                         <td></td>
                         <td>Rp</td>
                         <td style={{ textAlign: 'right' }}>{jumlah.toLocaleString('id-ID')}</td>
                      </tr>
                      {minusCols.map(c => {
                         const qty = dataMap[t]?.[c.id] || 0;
                         const amount = c.inputType === 'direct' ? qty : qty * c.nominal;
                         return (
                           <tr key={c.id}>
                             <td style={{ width: '15px', textAlign: 'right', paddingRight: '4px' }}>{counter++}</td>
                             <td style={{ color: '#002060' }}>{c.name}</td>
                             <td style={{ width: '10px', textAlign: 'center' }}>:</td>
                             <td style={{ width: '20px', textAlign: 'center' }}>{c.inputType === 'multiplier' && qty > 0 ? qty : '-'}</td>
                             <td style={{ width: '15px' }}>Rp</td>
                             <td style={{ textAlign: 'right' }}>{amount === 0 ? '-' : amount.toLocaleString('id-ID')}</td>
                           </tr>
                         )
                      })}
                    </tbody>
                  </table>
                </div>
                <div style={{ borderTop: '3px double black', padding: '4px', display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', color: '#002060', fontSize: '12px' }}>
                   <div>Diterima</div>
                   <div>: Rp {(jumlah - minusCols.reduce((acc, c) => acc + (c.inputType === 'direct' ? (dataMap[t]?.[c.id] || 0) : (dataMap[t]?.[c.id] || 0) * c.nominal), 0)).toLocaleString('id-ID')}</div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {isPrintTandaTerima && (
        <div id="print-area-tanda-terima" style={{ background: 'white', color: 'black', fontFamily: 'Arial, sans-serif' }}>
          <style>{`
            @media print {
              body * { visibility: hidden; }
              #print-area-tanda-terima, #print-area-tanda-terima * { visibility: visible; }
              #print-area-tanda-terima { position: absolute; left: 0; top: 0; width: 100%; display: block; }
              #print-area-tanda-terima table, #print-area-tanda-terima th, #print-area-tanda-terima td { border: 1px solid black; }
              @page { size: 330mm 215mm; margin: 1cm; }
            }
          `}</style>
          
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <h2 style={{ margin: 0, textTransform: 'uppercase', fontSize: '18px' }}>TANDA TERIMA INSENTIF</h2>
            <h3 style={{ margin: '4px 0', fontSize: '16px' }}>{namaUjian.toUpperCase()}</h3>
            <p style={{ margin: 0, fontSize: '14px' }}>{tahunUjian.toUpperCase()}</p>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
            <thead style={{ background: '#f1f5f9' }}>
              <tr>
                <th style={{ padding: '8px 4px', textAlign: 'center', width: '30px' }}>No</th>
                <th style={{ padding: '8px 4px', textAlign: 'left', minWidth: '150px' }}>Nama Guru</th>
                {columns.map(col => (
                  <th key={col.id} style={{ padding: '8px 4px', textAlign: 'center' }}>
                    {col.name}<br/>
                    <span style={{ fontSize: '9px', fontWeight: 'normal' }}>
                      {col.inputType === 'direct' ? '(Nominal Bebas)' : `(${col.type === 'minus' ? '-' : '+'}${formatRupiah(col.nominal)})`}
                    </span>
                  </th>
                ))}
                <th style={{ padding: '8px 4px', textAlign: 'right' }}>Total Honor</th>
                <th style={{ padding: '8px 4px', textAlign: 'center', width: '100px' }}>Tanda Tangan</th>
              </tr>
            </thead>
            <tbody>
              {teachers.map((t, i) => (
                <tr key={t}>
                  <td style={{ padding: '10px 4px', textAlign: 'center' }}>{i + 1}</td>
                  <td style={{ padding: '10px 4px', fontWeight: 500 }}>{t}</td>
                  {columns.map(col => (
                    <td key={col.id} style={{ padding: '10px 4px', textAlign: 'center' }}>
                      {col.inputType === 'direct' 
                        ? formatRupiah(dataMap[t]?.[col.id] || 0)
                        : (dataMap[t]?.[col.id] || '')}
                    </td>
                  ))}
                  <td style={{ padding: '10px 4px', textAlign: 'right', fontWeight: 'bold' }}>
                    {formatRupiah(calculateTotalRow(t))}
                  </td>
                  <td style={{ padding: '10px 4px', position: 'relative', height: '45px' }}>
                    <div style={{ position: 'absolute', top: '6px', left: i % 2 === 0 ? '6px' : '40px', fontSize: '11px' }}>
                      {i + 1}.
                    </div>
                  </td>
                </tr>
              ))}
              <tr style={{ background: '#f1f5f9', fontWeight: 'bold' }}>
                <td colSpan={2} style={{ padding: '8px 4px', textAlign: 'right' }}>TOTAL KESELURUHAN</td>
                {columns.map(col => (
                  <td key={col.id} style={{ padding: '8px 4px', textAlign: 'center' }}>
                    {col.inputType === 'direct' ? formatRupiah(calculateTotalColumn(col.id)) : calculateTotalColumn(col.id)}
                  </td>
                ))}
                <td style={{ padding: '8px 4px', textAlign: 'right' }}>
                  {formatRupiah(teachers.reduce((acc, t) => acc + calculateTotalRow(t), 0))}
                </td>
                <td></td>
              </tr>
            </tbody>
          </table>

          <div style={{ marginTop: '40px', display: 'flex', justifyContent: 'space-between', padding: '0 50px', pageBreakInside: 'avoid' }}>
            <div style={{ textAlign: 'center' }}>
              <p style={{ margin: '0 0 110px 0' }}>Kepala Madrasah,</p>
              <p style={{ margin: 0, fontWeight: 'bold' }}>________________________</p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ margin: '0 0 110px 0' }}>Ketua Panitia,</p>
              <p style={{ margin: 0, fontWeight: 'bold' }}>________________________</p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
