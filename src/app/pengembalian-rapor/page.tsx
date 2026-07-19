'use client';
import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import styles from './rapor.module.css';

export default function PengembalianRaporPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  
  // Filter state
  const [filterKelas, setFilterKelas] = useState('Semua');

  // Modals state
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showInputModal, setShowInputModal] = useState(false);

  // Form states
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [inputSearch, setInputSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const isAdmin = user?.rule?.toLowerCase() === 'admin';

  const fetchData = async () => {
    try {
      const res = await fetch('/api/rapor');
      const json = await res.json();
      if (json.success) {
        setData(json);
        setStartDate(json.startDate || '');
        setEndDate(json.endDate || '');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const storedUser = localStorage.getItem('keren_user_data');
    if (storedUser) setUser(JSON.parse(storedUser));
    fetchData();
  }, []);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await fetch('/api/rapor', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startDate, endDate })
      });
      setShowConfigModal(false);
      setLoading(true);
      fetchData();
    } catch(e) {}
    setIsSubmitting(false);
  };

  const handleSaveInput = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return alert("Pilih siswa terlebih dahulu!");
    
    setIsSubmitting(true);
    try {
      await fetch('/api/rapor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nis: selectedStudent.nis,
          nama: selectedStudent.nama,
          kelas: selectedStudent.kelas
        })
      });
      setShowInputModal(false);
      setInputSearch('');
      setSelectedStudent(null);
      setLoading(true);
      fetchData();
    } catch(e) {}
    setIsSubmitting(false);
  };

  const exportToExcel = () => {
    if (!data?.missingList) return;
    
    const exportData = data.missingList.map((s: any, idx: number) => ({
      'No': idx + 1,
      'NIS': s.nis,
      'Nama Siswa': s.nama,
      'Kelas': s.kelas
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Belum Mengembalikan");
    XLSX.writeFile(wb, "Data_Belum_Kembali_Rapor.xlsx");
  };

  if (loading) return <div className={styles.container}>Loading data...</div>;
  if (!data) return <div className={styles.container}>Gagal memuat data dari server. Silakan muat ulang halaman.</div>;

  const kelasOptions = ['Semua', ...Array.from(new Set(data?.missingList?.map((s:any)=>s.kelas) || []))].sort();
  const filteredList = data?.missingList?.filter((s:any) => filterKelas === 'Semua' || s.kelas === filterKelas) || [];
  
  // Autocomplete filtering for Input Modal
  const searchResults = inputSearch.length > 2 
    ? data?.allActive?.filter((s:any) => s.nama.toLowerCase().includes(inputSearch.toLowerCase()) || s.nis.includes(inputSearch)) || []
    : [];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <h1>Pengembalian Rapor</h1>
          <p>Pantau data siswa yang belum mengembalikan rapor</p>
          {data?.startDate && (
            <span style={{ fontSize:'0.9rem', color: '#3b82f6', background:'#eff6ff', padding:'4px 8px', borderRadius:'4px', marginTop:'8px', display:'inline-block' }}>
              <i className="fa-regular fa-calendar"></i> Filter Aktif: {data.startDate} s/d {data.endDate || 'Sekarang'}
            </span>
          )}
        </div>
        
        <div className={styles.actionArea}>
          <button className={styles.btnExcel} onClick={exportToExcel}>
            <i className="fa-solid fa-file-excel"></i> Export Excel
          </button>
          
          {isAdmin && (
            <>
              <button className={styles.btnSecondary} onClick={() => setShowConfigModal(true)}>
                <i className="fa-solid fa-gear"></i> Atur Tanggal
              </button>
              <button className={styles.btnPrimary} onClick={() => setShowInputModal(true)}>
                <i className="fa-solid fa-plus"></i> Input Pengembalian
              </button>
            </>
          )}
        </div>
      </div>

      <div className={styles.rekapGrid}>
        {data?.rekap?.map((r: any, idx: number) => {
           const isDanger = r.missing > 0;
           return (
             <div key={idx} className={`${styles.rekapCard} ${isDanger ? styles.danger : styles.success}`}>
               <div className={styles.cardTitle}>Kelas {r.kelas}</div>
               <div className={styles.cardStats}>
                 <span>Total: {r.total}</span>
                 <span>Kembali: {r.returned}</span>
               </div>
               <div className={styles.cardMissing}>
                 {r.missing} <span style={{fontSize:'0.9rem', color:'#64748b', fontWeight:'normal'}}>Belum</span>
               </div>
             </div>
           )
        })}
      </div>

      <div className={styles.tableSection}>
        <div className={styles.tableHeader}>
          <h2>Daftar Belum Mengembalikan</h2>
          <div className={styles.filters}>
            <select 
              className={styles.select} 
              value={filterKelas} 
              onChange={(e) => setFilterKelas(e.target.value)}
            >
              {kelasOptions.map((k:any) => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>
        </div>

        <div className={styles.tableResponsive}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>No</th>
                <th>NIS</th>
                <th>Nama Siswa</th>
                <th>Kelas</th>
              </tr>
            </thead>
            <tbody>
              {filteredList.length === 0 ? (
                <tr><td colSpan={4} style={{textAlign:'center'}}>Semua siswa di filter ini sudah mengembalikan rapor! 🎉</td></tr>
              ) : (
                filteredList.map((s:any, idx:number) => (
                  <tr key={idx}>
                    <td>{idx + 1}</td>
                    <td>{s.nis}</td>
                    <td>{s.nama}</td>
                    <td><span style={{background:'#f1f5f9', padding:'4px 8px', borderRadius:'4px', fontSize:'0.9rem', fontWeight:600}}>{s.kelas}</span></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL CONFIG */}
      {showConfigModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h2 className={styles.modalTitle}>Pengaturan Rentang Tanggal</h2>
            <form onSubmit={handleSaveConfig}>
              <div className={styles.formGroup}>
                <label>Tanggal Mulai</label>
                <input type="date" className={styles.input} style={{width:'100%'}} value={startDate} onChange={e => setStartDate(e.target.value)} />
              </div>
              <div className={styles.formGroup}>
                <label>Tanggal Akhir (Opsional)</label>
                <input type="date" className={styles.input} style={{width:'100%'}} value={endDate} onChange={e => setEndDate(e.target.value)} />
              </div>
              <div className={styles.modalActions}>
                <button type="button" className={styles.btnSecondary} onClick={() => setShowConfigModal(false)}>Batal</button>
                <button type="submit" className={styles.btnPrimary} disabled={isSubmitting}>Simpan Pengaturan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL INPUT PENGEMBALIAN */}
      {showInputModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent} style={{overflow:'visible'}}>
            <h2 className={styles.modalTitle}>Input Pengembalian Rapor</h2>
            <form onSubmit={handleSaveInput}>
              <div className={styles.formGroup} style={{position:'relative'}}>
                <label>Cari Nama / NIS Siswa</label>
                <input 
                  type="text" 
                  className={styles.input} 
                  style={{width:'100%'}} 
                  placeholder="Ketik nama atau NIS..."
                  value={selectedStudent ? `${selectedStudent.nis} - ${selectedStudent.nama}` : inputSearch}
                  onChange={e => { setInputSearch(e.target.value); setSelectedStudent(null); }} 
                />
                {!selectedStudent && searchResults.length > 0 && (
                  <div className={styles.suggestions}>
                    {searchResults.map((s:any, idx:number) => (
                      <div key={idx} className={styles.suggestionItem} onClick={() => { setSelectedStudent(s); setInputSearch(''); }}>
                        <strong>{s.nis}</strong> - {s.nama} <span style={{float:'right', color:'#64748b'}}>{s.kelas}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className={styles.formGroup}>
                <label>Tanggal Pengembalian</label>
                <input type="text" className={styles.input} style={{width:'100%', background:'#f1f5f9'}} value="Hari ini (Otomatis)" disabled />
              </div>
              <div className={styles.modalActions}>
                <button type="button" className={styles.btnSecondary} onClick={() => setShowInputModal(false)}>Batal</button>
                <button type="submit" className={styles.btnPrimary} disabled={!selectedStudent || isSubmitting}>
                  {isSubmitting ? 'Menyimpan...' : 'Tandai Dikembalikan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
