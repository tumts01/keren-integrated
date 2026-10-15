'use client';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';

interface OlimpiadeData {
  id: number;
  created_at: string;
  jenis_pendaftaran: string;
  bukti_pembayaran_url: string;
  file_excel_url?: string;
  metadata: any;
}

const OFFICIAL_LOMBA = [
  'Matematika',
  'IPAS',
  'PAI',
  'Inggris',
  'Arab',
  'Singer (solo)',
  'Al Banjari',
  'Sandi Morse Semaphore (SMS)'
];

export default function RekapOlimpiadeSeni() {
  const router = useRouter();
  const [data, setData] = useState<OlimpiadeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'ringkasan' | 'peserta'>('ringkasan');
  const [filterJenis, setFilterJenis] = useState<'semua' | 'individu' | 'kolektif'>('semua');
  const [searchPeserta, setSearchPeserta] = useState('');
  const [filterCabang, setFilterCabang] = useState('semua');
  const [isAdmin, setIsAdmin] = useState(false);
  const [isBuka, setIsBuka] = useState(true);
  const [toggling, setToggling] = useState(false);

  // Modal Edit Peserta
  const [editingPeserta, setEditingPeserta] = useState<OlimpiadeData | null>(null);
  const [editFormData, setEditFormData] = useState<any>({});
  const [savingEdit, setSavingEdit] = useState(false);

  // Modal Kelola Peserta Kolektif
  const [kelolaKolektif, setKelolaKolektif] = useState<OlimpiadeData | null>(null);

  useEffect(() => {
    const sessionStr = localStorage.getItem('keren_user_data');
    if (sessionStr) {
      try {
        const session = JSON.parse(sessionStr);
        setIsAdmin(session.role === 'admin' || session.role === 'Admin' || session.role === 'ADMIN');
      } catch (e) {
        setIsAdmin(false);
      }
    }
    fetchData();
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/olimpiade-seni/config-pendaftaran');
      const json = await res.json();
      if (json.success && json.pendaftaran_buka !== undefined) {
        setIsBuka(json.pendaftaran_buka);
      }
    } catch (err) {}
  };

  const handleToggleBuka = async () => {
    const actionText = isBuka ? 'Menutup' : 'Membuka';
    const confirm = await Swal.fire({
      title: `${actionText} Pendaftaran?`,
      text: isBuka ? 'Pendaftar baru tidak akan bisa mendaftar. Lanjutkan?' : 'Pendaftaran akan dibuka kembali untuk umum. Lanjutkan?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: isBuka ? '#ef4444' : '#10b981',
      confirmButtonText: `Ya, ${isBuka ? 'Tutup' : 'Buka'}`,
      cancelButtonText: 'Batal'
    });

    if (!confirm.isConfirmed) return;

    setToggling(true);
    try {
      const res = await fetch('/api/olimpiade-seni/config-pendaftaran', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ buka: !isBuka })
      });
      const json = await res.json();
      if (json.success) {
        setIsBuka(!isBuka);
        Swal.fire('Berhasil', `Pendaftaran berhasil di${isBuka ? 'tutup' : 'buka'}.`, 'success');
      } else {
        Swal.fire('Gagal', json.error, 'error');
      }
    } catch (err: any) {
      Swal.fire('Error', 'Terjadi kesalahan sistem', 'error');
    } finally {
      setToggling(false);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/olimpiade-seni/rekap');
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        const cleaned = json.data.map((item: any) => {
          let meta = item.metadata;
          if (typeof meta === 'string') {
            try {
              meta = JSON.parse(meta);
            } catch (e) {
              meta = {};
            }
          }
          return {
            ...item,
            metadata: meta && typeof meta === 'object' ? meta : {}
          };
        });
        setData(cleaned);
      } else {
        Swal.fire('Error', json.error || 'Gagal memuat data', 'error');
      }
    } catch (err: any) {
      Swal.fire('Error', 'Gagal memuat data: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number, nama?: string) => {
    const confirm = await Swal.fire({
      title: 'Hapus Data?',
      text: nama ? `Yakin ingin menghapus peserta "${nama}"? Data yang dihapus tidak dapat dikembalikan!` : "Data yang dihapus tidak dapat dikembalikan!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Hapus!'
    });

    if (confirm.isConfirmed) {
      try {
        const res = await fetch('/api/olimpiade-seni/rekap', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id })
        });
        const json = await res.json();
        
        if (json.success) {
          Swal.fire('Terhapus!', 'Data berhasil dihapus.', 'success');
          fetchData();
        } else {
          Swal.fire('Error', json.error, 'error');
        }
      } catch (err: any) {
        Swal.fire('Error', 'Gagal menghapus data: ' + err.message, 'error');
      }
    }
  };

  const handleValidasi = async (id: number) => {
    try {
      const res = await fetch('/api/olimpiade-seni/rekap', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'validasi' })
      });
      const json = await res.json();
      
      if (json.success) {
        Swal.fire({
          icon: 'success',
          title: 'Berhasil!',
          text: 'Pembayaran telah divalidasi',
          timer: 1500,
          showConfirmButton: false
        });
        fetchData();
      } else {
        Swal.fire('Error', json.error, 'error');
      }
    } catch (err: any) {
      Swal.fire('Error', 'Gagal memvalidasi: ' + err.message, 'error');
    }
  };

  const normalizeLomba = (lombaName: any) => {
    if (!lombaName) return 'Lainnya';
    const l = String(lombaName).toLowerCase();
    if (l.includes('matematika')) return 'Matematika';
    if (l.includes('ipa') || l.includes('ips') || l.includes('ipas')) return 'IPAS';
    if (l.includes('pai')) return 'PAI';
    if (l.includes('inggris')) return 'Inggris';
    if (l.includes('arab') && !l.includes('pidato')) return 'Arab';
    if (l.includes('banjari')) return 'Al Banjari';
    if (l.includes('singer')) return 'Singer (solo)';
    if (l.includes('sandi') || l.includes('sms') || l.includes('morse')) return 'Sandi Morse Semaphore (SMS)';
    return String(lombaName);
  };

  // Ringkasan Pendaftaran (Filter Out peserta_kolektif untuk Tab 1)
  const ringkasanData = data.filter(item => {
    if (item.jenis_pendaftaran === 'peserta_kolektif') return false;
    if (filterJenis === 'semua') return true;
    return item.jenis_pendaftaran === filterJenis;
  });

  // Semua Peserta Siswa (Untuk Tab 2)
  const allPesertaList = useMemo(() => {
    return data.filter(item => item.jenis_pendaftaran === 'individu' || item.jenis_pendaftaran === 'peserta_kolektif');
  }, [data]);

  const filteredAllPeserta = useMemo(() => {
    return allPesertaList.filter(item => {
      const meta = item.metadata || {};
      const nama = String(meta.NAMA || meta.NAMA_REGU || '').toLowerCase();
      const nopes = String(meta.NOMOR_PESERTA || '').toLowerCase();
      const sekolah = String(meta.ASAL_SEKOLAH || meta['NAMA SD/MI'] || '').toLowerCase();
      const nisn = String(meta.NISN || '').toLowerCase();
      const rawLomba = meta.LOMBA_DIPILIH || meta['LOMBA YANG DIPILIH'] || '';
      const lomba = normalizeLomba(rawLomba);

      if (searchPeserta.trim()) {
        const q = searchPeserta.toLowerCase().trim();
        if (!nama.includes(q) && !nopes.includes(q) && !sekolah.includes(q) && !nisn.includes(q)) {
          return false;
        }
      }

      if (filterCabang !== 'semua') {
        if (lomba !== filterCabang) return false;
      }

      if (filterJenis !== 'semua') {
        if (filterJenis === 'individu' && item.jenis_pendaftaran !== 'individu') return false;
        if (filterJenis === 'kolektif' && item.jenis_pendaftaran !== 'peserta_kolektif') return false;
      }

      return true;
    });
  }, [allPesertaList, searchPeserta, filterCabang, filterJenis]);

  // Hitung total peserta per cabang lomba
  const summaryCounts: Record<string, number> = {};

  data.forEach(row => {
    if (row.jenis_pendaftaran === 'individu') {
      const rawLomba = row.metadata?.LOMBA_DIPILIH || row.metadata?.['LOMBA YANG DIPILIH'];
      if (rawLomba) {
        const lomba = normalizeLomba(rawLomba);
        summaryCounts[lomba] = (summaryCounts[lomba] || 0) + 1;
      }
    } else if (row.jenis_pendaftaran === 'kolektif' && row.metadata?.REKAP_PESERTA) {
      let rekap = row.metadata.REKAP_PESERTA;
      if (typeof rekap === 'string') {
        try {
          rekap = JSON.parse(rekap);
        } catch (e) {
          rekap = {};
        }
      }
      if (rekap && typeof rekap === 'object') {
        Object.keys(rekap).forEach(rawLomba => {
          const lomba = normalizeLomba(rawLomba);
          summaryCounts[lomba] = (summaryCounts[lomba] || 0) + Number(rekap[rawLomba] || 0);
        });
      }
    }
  });

  const totalSemuaPeserta = Object.values(summaryCounts).reduce((a, b) => a + b, 0);

  const handleCetakKartu = (row: OlimpiadeData) => {
    if (row.jenis_pendaftaran === 'individu') {
      localStorage.setItem('cetak_kartu_data', JSON.stringify(row.metadata));
      window.open('/olimpiade-seni/kartu', '_blank');
    } else if (row.jenis_pendaftaran === 'kolektif') {
      const peserta = data.filter(d => 
        d.jenis_pendaftaran === 'peserta_kolektif' &&
        String(d.metadata?.ASAL_SEKOLAH || '').trim().toLowerCase() === String(row.metadata?.ASAL_SEKOLAH || '').trim().toLowerCase()
      ).map(d => d.metadata);

      if (peserta.length > 0) {
        localStorage.setItem('cetak_kartu_data', JSON.stringify(peserta));
        window.open('/olimpiade-seni/kartu', '_blank');
      } else {
        Swal.fire('Info', 'Data peserta kolektif tidak ditemukan atau tidak tersedia.', 'info');
      }
    }
  };

  const handleCetakKartuSingle = (meta: any) => {
    localStorage.setItem('cetak_kartu_data', JSON.stringify(meta));
    window.open('/olimpiade-seni/kartu', '_blank');
  };

  // Buka Modal Edit Peserta
  const handleOpenEdit = (item: OlimpiadeData) => {
    const meta = item.metadata || {};
    const nama = meta.NAMA || meta.NAMA_REGU || '';
    const lombaRaw = meta.LOMBA_DIPILIH || meta['LOMBA YANG DIPILIH'] || meta.LOMBA || '';
    const lomba = normalizeLomba(lombaRaw);
    const isAkademik = ['Matematika', 'IPAS', 'PAI', 'Inggris', 'Arab'].includes(lomba);

    setEditFormData({
      nama: String(nama || ''),
      nomorPeserta: String(meta.NOMOR_PESERTA || ''),
      nisn: String(meta.NISN || ''),
      asalSekolah: String(meta.ASAL_SEKOLAH || meta['NAMA SD/MI'] || ''),
      kelas: String(meta.KELAS || ''),
      lomba,
      namaRegu: String(meta.NAMA_REGU || meta['NAMA REGU/GRUP (LOMBA MAPEL TIDAK PERLU MENGISI)'] || ''),
      noWa: String(meta.NO_WA || ''),
      statusPembayaran: String(meta.STATUS_PEMBAYARAN || (isAkademik ? 'Valid' : 'Menunggu')),
      usernameCbt: String(meta.USERNAME_CBT || ''),
      passwordCbt: String(meta.PASSWORD_CBT || ''),
    });
    setEditingPeserta(item);
  };

  // Simpan Perubahan Edit Peserta
  const handleSaveEdit = async () => {
    if (!editingPeserta) return;
    if (!editFormData.nama || !String(editFormData.nama).trim()) {
      Swal.fire('Peringatan', 'Nama Peserta tidak boleh kosong!', 'warning');
      return;
    }

    setSavingEdit(true);
    try {
      const isAkademik = ['Matematika', 'IPAS', 'PAI', 'Inggris', 'Arab'].includes(editFormData.lomba);
      const updatedMetadata = {
        ...(editingPeserta.metadata || {}),
        NAMA: String(editFormData.nama || '').trim(),
        NOMOR_PESERTA: String(editFormData.nomorPeserta || '').trim(),
        NISN: String(editFormData.nisn || '').trim(),
        ASAL_SEKOLAH: String(editFormData.asalSekolah || '').trim(),
        'NAMA SD/MI': String(editFormData.asalSekolah || '').trim(),
        KELAS: String(editFormData.kelas || '').trim(),
        LOMBA_DIPILIH: editFormData.lomba,
        'LOMBA YANG DIPILIH': editFormData.lomba,
        KATEGORI: isAkademik ? 'Olimpiade Akademik' : 'Lomba Seni',
        NAMA_REGU: String(editFormData.namaRegu || '').trim(),
        'NAMA REGU/GRUP (LOMBA MAPEL TIDAK PERLU MENGISI)': String(editFormData.namaRegu || '').trim(),
        NO_WA: String(editFormData.noWa || '').trim(),
        STATUS_PEMBAYARAN: editFormData.statusPembayaran,
      };

      if (isAkademik) {
        if (editFormData.usernameCbt) updatedMetadata.USERNAME_CBT = String(editFormData.usernameCbt).trim();
        if (editFormData.passwordCbt) updatedMetadata.PASSWORD_CBT = String(editFormData.passwordCbt).trim();
      }

      const res = await fetch('/api/olimpiade-seni/rekap', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingPeserta.id,
          metadata: updatedMetadata
        })
      });

      const json = await res.json();
      if (json.success) {
        Swal.fire({
          icon: 'success',
          title: 'Berhasil!',
          text: 'Data peserta berhasil diperbarui.',
          timer: 1500,
          showConfirmButton: false
        });
        setEditingPeserta(null);
        fetchData();
      } else {
        Swal.fire('Gagal', json.error || 'Gagal menyimpan perubahan', 'error');
      }
    } catch (err: any) {
      Swal.fire('Error', 'Gagal menyimpan perubahan: ' + err.message, 'error');
    } finally {
      setSavingEdit(false);
    }
  };

  // Daftar siswa dari sekolah kolektif yang sedang dibuka
  const collectiveStudents = useMemo(() => {
    if (!kelolaKolektif) return [];
    return data.filter(d => 
      d.jenis_pendaftaran === 'peserta_kolektif' &&
      String(d.metadata?.ASAL_SEKOLAH || '').trim().toLowerCase() === String(kelolaKolektif.metadata?.ASAL_SEKOLAH || '').trim().toLowerCase()
    );
  }, [data, kelolaKolektif]);

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '40px 20px' }}>
      <div style={{ maxWidth: '1240px', margin: '0 auto' }}>
        
        {/* Header Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button 
              onClick={() => router.back()}
              style={{ width: '40px', height: '40px', borderRadius: '50%', border: 'none', background: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}
              title="Kembali"
            >
              <i className="fas fa-arrow-left"></i>
            </button>
            <div>
              <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>Rekap Data Pendaftar</h1>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>Kelola dan pantau seluruh pendaftar Olimpiade & Lomba Seni</p>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {isAdmin && (
              <button
                onClick={handleToggleBuka}
                disabled={toggling}
                style={{
                  padding: '10px 16px', borderRadius: '8px',
                  background: isBuka ? '#ef4444' : '#10b981', color: 'white', border: 'none',
                  fontWeight: 600, cursor: toggling ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: '8px', opacity: toggling ? 0.7 : 1
                }}
              >
                <i className={`fas ${toggling ? 'fa-spinner fa-spin' : isBuka ? 'fa-lock' : 'fa-lock-open'}`}></i>
                {isBuka ? 'Tutup Pendaftaran' : 'Buka Pendaftaran'}
              </button>
            )}
            <button 
              onClick={fetchData}
              style={{ padding: '8px 16px', borderRadius: '8px', background: '#e2e8f0', color: '#475569', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}
            >
              <i className="fas fa-sync-alt"></i> Refresh
            </button>
          </div>
        </div>

        {/* Dashboard Banner Ringkasan Cabang Lomba */}
        {!loading && data.length > 0 && (
          <div style={{ background: 'white', borderRadius: '16px', padding: '24px', marginBottom: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
            <h3 style={{ margin: '0 0 16px 0', color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <span>Ringkasan Peserta Per Cabang Lomba</span>
              <span style={{ background: '#dbeafe', color: '#1e40af', padding: '4px 14px', borderRadius: '20px', fontSize: '0.9rem', fontWeight: 700 }}>
                Total Keseluruhan: <b>{totalSemuaPeserta} Peserta</b>
              </span>
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '14px' }}>
              {Object.entries(summaryCounts).sort((a, b) => b[1] - a[1]).map(([lomba, count]) => (
                <div key={lomba} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600, lineHeight: 1.4 }}>{lomba}</span>
                  <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>{count} <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8' }}>Peserta</span></span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab Switcher & Filter Controls */}
        <div style={{ background: 'white', borderRadius: '16px', padding: '16px 20px', marginBottom: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
          {/* Tabs */}
          <div style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '10px', gap: '4px' }}>
            <button
              onClick={() => setViewMode('ringkasan')}
              style={{
                padding: '8px 18px',
                borderRadius: '8px',
                border: 'none',
                background: viewMode === 'ringkasan' ? '#047857' : 'transparent',
                color: viewMode === 'ringkasan' ? 'white' : '#475569',
                fontWeight: 700,
                fontSize: '0.88rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s'
              }}
            >
              <i className="fas fa-th-list"></i> Ringkasan Pendaftaran
            </button>
            <button
              onClick={() => setViewMode('peserta')}
              style={{
                padding: '8px 18px',
                borderRadius: '8px',
                border: 'none',
                background: viewMode === 'peserta' ? '#047857' : 'transparent',
                color: viewMode === 'peserta' ? 'white' : '#475569',
                fontWeight: 700,
                fontSize: '0.88rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s'
              }}
            >
              <i className="fas fa-user-graduate"></i> Semua Peserta Siswa ({allPesertaList.length})
            </button>
          </div>

          {/* Filter Dropdowns */}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            {viewMode === 'peserta' && (
              <div style={{ position: 'relative' }}>
                <i className="fas fa-search" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '13px' }}></i>
                <input
                  type="text"
                  placeholder="Cari nama, no. peserta, sekolah..."
                  value={searchPeserta}
                  onChange={e => setSearchPeserta(e.target.value)}
                  style={{
                    padding: '8px 12px 8px 34px',
                    borderRadius: '8px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '13px',
                    outline: 'none',
                    width: '230px'
                  }}
                />
              </div>
            )}

            {viewMode === 'peserta' && (
              <select 
                value={filterCabang}
                onChange={(e) => setFilterCabang(e.target.value)}
                style={{ padding: '8px 14px', borderRadius: '8px', border: '1.5px solid #cbd5e1', outline: 'none', fontSize: '13px', cursor: 'pointer' }}
              >
                <option value="semua">Semua Cabang Lomba</option>
                {OFFICIAL_LOMBA.map(l => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            )}

            <select 
              value={filterJenis}
              onChange={(e) => setFilterJenis(e.target.value as any)}
              style={{ padding: '8px 14px', borderRadius: '8px', border: '1.5px solid #cbd5e1', outline: 'none', fontSize: '13px', cursor: 'pointer' }}
            >
              <option value="semua">Semua Jalur</option>
              <option value="individu">Individu</option>
              <option value="kolektif">Kolektif</option>
            </select>
          </div>
        </div>

        {/* Main Content Area */}
        <div style={{ background: 'white', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: '50px 20px', textAlign: 'center', color: '#64748b' }}>
              <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem', marginBottom: '16px', color: '#047857' }}></i>
              <p style={{ margin: 0, fontWeight: 600 }}>Memuat data pendaftar...</p>
            </div>
          ) : viewMode === 'ringkasan' ? (
            /* TAB 1: RINGKASAN PENDAFTARAN (Individu & Lembaga Kolektif) */
            ringkasanData.length === 0 ? (
              <div style={{ padding: '50px 20px', textAlign: 'center', color: '#94a3b8' }}>
                <i className="fas fa-folder-open" style={{ fontSize: '3rem', marginBottom: '16px' }}></i>
                <p style={{ margin: 0, fontWeight: 600 }}>Belum ada data pendaftar yang masuk.</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', color: '#475569', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>
                      <th style={{ padding: '14px 16px' }}>No</th>
                      <th style={{ padding: '14px 16px' }}>Tanggal Daftar</th>
                      <th style={{ padding: '14px 16px' }}>Jalur</th>
                      <th style={{ padding: '14px 16px' }}>Identitas Pendaftar</th>
                      {isAdmin && <th style={{ padding: '14px 16px', textAlign: 'center' }}>Cetak Kartu</th>}
                      <th style={{ padding: '14px 16px' }}>Detail Lomba</th>
                      {isAdmin && <th style={{ padding: '14px 16px' }}>Lampiran</th>}
                      <th style={{ padding: '14px 16px' }}>Validasi Pembayaran</th>
                      {isAdmin && <th style={{ padding: '14px 16px', textAlign: 'right' }}>Aksi</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {ringkasanData.map((row, index) => {
                      const isIndividu = row.jenis_pendaftaran === 'individu';
                      const pesertaSekolahCount = isIndividu ? 1 : data.filter(d => 
                        d.jenis_pendaftaran === 'peserta_kolektif' &&
                        String(d.metadata?.ASAL_SEKOLAH || '').trim().toLowerCase() === String(row.metadata?.ASAL_SEKOLAH || '').trim().toLowerCase()
                      ).length;

                      return (
                        <tr key={row.id} style={{ borderBottom: '1px solid #e2e8f0', background: 'white' }}>
                          <td style={{ padding: '16px', color: '#64748b' }}>{index + 1}</td>
                          <td style={{ padding: '16px', whiteSpace: 'nowrap' }}>
                            {new Date(row.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td style={{ padding: '16px' }}>
                            <span style={{ 
                              padding: '4px 10px', 
                              borderRadius: '20px', 
                              fontSize: '0.75rem', 
                              fontWeight: 700,
                              background: isIndividu ? '#e0f2fe' : '#dcfce7',
                              color: isIndividu ? '#0284c7' : '#16a34a'
                            }}>
                              {String(row.jenis_pendaftaran || '').toUpperCase()}
                            </span>
                          </td>
                          <td style={{ padding: '16px' }}>
                            {isIndividu ? (
                              <div>
                                <div style={{ fontWeight: 700, color: '#0f172a' }}>{row.metadata?.NAMA || '-'}</div>
                                <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '3px' }}>NISN: {row.metadata?.NISN || '-'}</div>
                                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Asal: {row.metadata?.ASAL_SEKOLAH || '-'}</div>
                                {row.metadata?.NO_WA && (
                                  <div style={{ fontSize: '0.8rem', color: '#16a34a', marginTop: '2px', fontWeight: 600 }}>
                                    WA: <a href={`https://wa.me/${String(row.metadata.NO_WA).replace(/[^0-9]/g, '').replace(/^0/, '62')}`} target="_blank" rel="noopener noreferrer" style={{ color: '#16a34a', textDecoration: 'underline' }}>{String(row.metadata.NO_WA)}</a>
                                  </div>
                                )}
                                {row.metadata?.USERNAME_CBT && (
                                  <div style={{ marginTop: '6px', padding: '6px 8px', background: '#f1f5f9', borderRadius: '6px', fontSize: '0.78rem' }}>
                                    <div style={{ color: '#0f172a', fontWeight: 700 }}>Akun CBT:</div>
                                    <div style={{ color: '#0284c7' }}>User: {row.metadata.USERNAME_CBT} | Pass: {row.metadata.PASSWORD_CBT}</div>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div>
                                <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.95rem' }}>{row.metadata?.ASAL_SEKOLAH || 'Pendaftaran Kolektif'}</div>
                                {row.metadata?.NO_WA && (
                                  <div style={{ fontSize: '0.8rem', color: '#16a34a', marginTop: '2px', fontWeight: 600 }}>
                                    WA Pendamping: <a href={`https://wa.me/${String(row.metadata.NO_WA).replace(/[^0-9]/g, '').replace(/^0/, '62')}`} target="_blank" rel="noopener noreferrer" style={{ color: '#16a34a', textDecoration: 'underline' }}>{String(row.metadata.NO_WA)}</a>
                                  </div>
                                )}
                                <div style={{ marginTop: '8px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                                  <button
                                    onClick={() => setKelolaKolektif(row)}
                                    style={{
                                      padding: '5px 12px',
                                      borderRadius: '6px',
                                      background: '#0284c7',
                                      color: 'white',
                                      border: 'none',
                                      fontSize: '0.8rem',
                                      fontWeight: 700,
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '6px'
                                    }}
                                  >
                                    <i className="fas fa-users-cog"></i> Kelola Peserta ({pesertaSekolahCount} Siswa)
                                  </button>
                                </div>
                              </div>
                            )}
                          </td>
                          {isAdmin && (
                            <td style={{ padding: '16px', textAlign: 'center', verticalAlign: 'middle' }}>
                              <button
                                onClick={() => handleCetakKartu(row)}
                                style={{
                                  padding: '8px 12px',
                                  background: '#047857',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  fontSize: '0.82rem',
                                  fontWeight: 600,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '6px'
                                }}
                              >
                                <i className="fas fa-print"></i> Cetak Kartu
                              </button>
                            </td>
                          )}
                          <td style={{ padding: '16px' }}>
                            {isIndividu ? (
                              (() => {
                                const lombaRaw = row.metadata?.LOMBA_DIPILIH || row.metadata?.['LOMBA YANG DIPILIH'] || '';
                                const lombaName = normalizeLomba(lombaRaw) || '-';
                                const isAkademik = ['Matematika', 'IPAS', 'PAI', 'Inggris', 'Arab'].includes(lombaName);
                                const fallbackKategori = lombaName !== '-' ? (isAkademik ? 'Olimpiade Akademik' : 'Lomba Seni') : '-';
                                return (
                                  <div>
                                    <div style={{ color: '#0f172a', fontWeight: 700 }}>{lombaName}</div>
                                    <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>Kategori: {row.metadata?.KATEGORI || fallbackKategori}</div>
                                    {row.metadata?.NAMA_REGU && (
                                      <div style={{ fontSize: '0.8rem', color: '#b45309', fontWeight: 600 }}>Grup: {row.metadata.NAMA_REGU}</div>
                                    )}
                                  </div>
                                );
                              })()
                            ) : (
                              <div>
                                {row.metadata?.REKAP_PESERTA && Object.keys(row.metadata.REKAP_PESERTA).length > 0 ? (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                    {Object.entries(row.metadata.REKAP_PESERTA).map(([l, c]) => (
                                      <div key={l} style={{ fontSize: '0.82rem', color: '#0f172a' }}>
                                        <span style={{ fontWeight: 700, color: '#047857' }}>{String(c)}</span> peserta {normalizeLomba(l)}
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div style={{ color: '#0f172a' }}>{row.metadata?.DETAIL_LOMBA || '-'}</div>
                                )}
                              </div>
                            )}
                          </td>
                          {isAdmin && (
                            <td style={{ padding: '16px' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {row.bukti_pembayaran_url && (
                                  <a 
                                    href={row.bukti_pembayaran_url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: '#2563eb', textDecoration: 'none', background: '#eff6ff', padding: '4px 8px', borderRadius: '6px', width: 'fit-content' }}
                                  >
                                    <i className="fas fa-receipt"></i> Bukti Bayar
                                  </a>
                                )}
                                {row.metadata?.BUKTI_SS_URL && (
                                  <a 
                                    href={row.metadata.BUKTI_SS_URL} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: '#7c3aed', textDecoration: 'none', background: '#f5f3ff', padding: '4px 8px', borderRadius: '6px', width: 'fit-content' }}
                                  >
                                    <i className="fas fa-share-alt"></i> SS Share
                                  </a>
                                )}
                                {row.file_excel_url && (
                                  <a 
                                    href={row.file_excel_url} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: '#047857', textDecoration: 'none', background: '#ecfdf5', padding: '4px 8px', borderRadius: '6px', width: 'fit-content' }}
                                  >
                                    <i className="fas fa-file-excel"></i> File CBT
                                  </a>
                                )}
                              </div>
                            </td>
                          )}
                          <td style={{ padding: '16px' }}>
                            {row.metadata?.STATUS_PEMBAYARAN === 'Valid' ? (
                              <span style={{ background: '#dcfce7', color: '#16a34a', padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700 }}>
                                <i className="fas fa-check-circle" style={{ marginRight: '4px' }}></i> LUNAS
                              </span>
                            ) : (
                              <span style={{ background: '#fef3c7', color: '#d97706', padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700 }}>
                                <i className="fas fa-clock" style={{ marginRight: '4px' }}></i> MENUNGGU
                              </span>
                            )}
                          </td>
                          {isAdmin && (
                            <td style={{ padding: '16px', textAlign: 'right' }}>
                              <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                                {isIndividu && (
                                  <button
                                    onClick={() => handleOpenEdit(row)}
                                    style={{ padding: '6px 10px', borderRadius: '6px', background: '#f59e0b', color: 'white', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', fontWeight: 700 }}
                                    title="Edit Data Peserta"
                                  >
                                    <i className="fas fa-edit"></i> Edit
                                  </button>
                                )}
                                {row.metadata?.STATUS_PEMBAYARAN !== 'Valid' && (
                                  <button 
                                    onClick={() => handleValidasi(row.id)}
                                    style={{ padding: '6px 10px', borderRadius: '6px', background: '#3b82f6', color: 'white', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', fontWeight: 600 }}
                                    title="Validasi Pembayaran"
                                  >
                                    <i className="fas fa-check"></i> Validasi
                                  </button>
                                )}
                                <button 
                                  onClick={() => handleDelete(row.id, isIndividu ? row.metadata?.NAMA : row.metadata?.ASAL_SEKOLAH)}
                                  style={{ width: '30px', height: '30px', borderRadius: '6px', background: '#fee2e2', color: '#ef4444', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                                  title="Hapus Data"
                                >
                                  <i className="fas fa-trash-alt"></i>
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            /* TAB 2: SEMUA PESERTA SISWA (Individu & Peserta Kolektif) */
            filteredAllPeserta.length === 0 ? (
              <div style={{ padding: '50px 20px', textAlign: 'center', color: '#94a3b8' }}>
                <i className="fas fa-search" style={{ fontSize: '2.5rem', marginBottom: '14px' }}></i>
                <p style={{ margin: 0, fontWeight: 600 }}>Tidak ada peserta yang cocok dengan pencarian / filter.</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', color: '#475569', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>
                      <th style={{ padding: '14px 16px' }}>No</th>
                      <th style={{ padding: '14px 16px' }}>No. Peserta</th>
                      <th style={{ padding: '14px 16px' }}>Nama Peserta & Asal Sekolah</th>
                      <th style={{ padding: '14px 16px' }}>NISN & Kelas</th>
                      <th style={{ padding: '14px 16px' }}>Cabang Lomba</th>
                      <th style={{ padding: '14px 16px' }}>Jalur</th>
                      <th style={{ padding: '14px 16px' }}>Akun CBT</th>
                      <th style={{ padding: '14px 16px' }}>Status Bayar</th>
                      {isAdmin && <th style={{ padding: '14px 16px', textAlign: 'right' }}>Aksi</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAllPeserta.map((row, idx) => {
                      const meta = row.metadata || {};
                      const rawLomba = meta.LOMBA_DIPILIH || meta['LOMBA YANG DIPILIH'] || meta.LOMBA || '';
                      const lombaName = normalizeLomba(rawLomba);
                      const isAkademik = ['Matematika', 'IPAS', 'PAI', 'Inggris', 'Arab'].includes(lombaName);
                      const isIndividu = row.jenis_pendaftaran === 'individu';

                      return (
                        <tr key={row.id} style={{ borderBottom: '1px solid #e2e8f0', background: 'white' }}>
                          <td style={{ padding: '14px 16px', color: '#64748b' }}>{idx + 1}</td>
                          <td style={{ padding: '14px 16px' }}>
                            <span style={{
                              display: 'inline-block',
                              background: '#ecfdf5',
                              color: '#047857',
                              border: '1px solid #a7f3d0',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              fontSize: '0.8rem',
                              fontWeight: 800
                            }}>
                              {meta.NOMOR_PESERTA || '-'}
                            </span>
                          </td>
                          <td style={{ padding: '14px 16px' }}>
                            <div style={{ fontWeight: 700, color: '#0f172a' }}>{meta.NAMA || meta.NAMA_REGU || '-'}</div>
                            <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>
                              {meta.ASAL_SEKOLAH || meta['NAMA SD/MI'] || '-'}
                            </div>
                            {meta.NO_WA && (
                              <div style={{ fontSize: '0.78rem', color: '#16a34a', marginTop: '2px' }}>
                                WA: {meta.NO_WA}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '14px 16px', fontSize: '0.82rem', color: '#475569' }}>
                            <div>NISN: <b>{meta.NISN || '-'}</b></div>
                            <div>Kelas: <b>{meta.KELAS || '-'}</b></div>
                          </td>
                          <td style={{ padding: '14px 16px' }}>
                            <div style={{ fontWeight: 700, color: '#0f172a' }}>{lombaName}</div>
                            {meta.NAMA_REGU && (
                              <div style={{ fontSize: '0.78rem', color: '#b45309', fontWeight: 600 }}>Grup: {meta.NAMA_REGU}</div>
                            )}
                          </td>
                          <td style={{ padding: '14px 16px' }}>
                            <span style={{
                              padding: '3px 8px',
                              borderRadius: '12px',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              background: isIndividu ? '#e0f2fe' : '#dcfce7',
                              color: isIndividu ? '#0284c7' : '#16a34a'
                            }}>
                              {isIndividu ? 'INDIVIDU' : 'KOLEKTIF'}
                            </span>
                          </td>
                          <td style={{ padding: '14px 16px', fontSize: '0.8rem' }}>
                            {isAkademik ? (
                              meta.USERNAME_CBT ? (
                                <div style={{ background: '#f1f5f9', padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem' }}>
                                  <div>U: <b style={{ color: '#0284c7' }}>{meta.USERNAME_CBT}</b></div>
                                  <div>P: <b style={{ color: '#475569' }}>{meta.PASSWORD_CBT}</b></div>
                                </div>
                              ) : (
                                <span style={{ color: '#94a3b8' }}>Belum dibuat</span>
                              )
                            ) : (
                              <span style={{ color: '#94a3b8' }}>- (Seni)</span>
                            )}
                          </td>
                          <td style={{ padding: '14px 16px' }}>
                            {meta.STATUS_PEMBAYARAN === 'Valid' ? (
                              <span style={{ background: '#dcfce7', color: '#16a34a', padding: '3px 8px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 700 }}>
                                LUNAS
                              </span>
                            ) : (
                              <span style={{ background: '#fef3c7', color: '#d97706', padding: '3px 8px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 700 }}>
                                MENUNGGU
                              </span>
                            )}
                          </td>
                          {isAdmin && (
                            <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                              <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                                <button
                                  onClick={() => handleCetakKartuSingle(meta)}
                                  style={{ padding: '5px 8px', borderRadius: '6px', background: '#047857', color: 'white', border: 'none', cursor: 'pointer', fontSize: '0.78rem' }}
                                  title="Cetak Kartu Peserta"
                                >
                                  <i className="fas fa-print"></i>
                                </button>
                                <button
                                  onClick={() => handleOpenEdit(row)}
                                  style={{ padding: '5px 9px', borderRadius: '6px', background: '#f59e0b', color: 'white', border: 'none', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                  title="Edit Data Peserta"
                                >
                                  <i className="fas fa-edit"></i> Edit
                                </button>
                                <button
                                  onClick={() => handleDelete(row.id, meta.NAMA || meta.NAMA_REGU)}
                                  style={{ width: '28px', height: '28px', borderRadius: '6px', background: '#fee2e2', color: '#ef4444', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                                  title="Hapus Peserta"
                                >
                                  <i className="fas fa-trash-alt"></i>
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
          )}
        </div>

      </div>

      {/* MODAL 1: EDIT DATA PESERTA */}
      {editingPeserta && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '650px',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
                  <i className="fas fa-user-edit" style={{ color: '#047857', marginRight: '8px' }}></i>
                  Edit Data Peserta
                </h3>
                <p style={{ margin: '3px 0 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                  Perbarui informasi pendaftaran atau perbaiki kesalahan data peserta
                </p>
              </div>
              <button
                onClick={() => setEditingPeserta(null)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Nama Peserta */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Nama Lengkap Peserta *
                </label>
                <input
                  type="text"
                  value={editFormData.nama || ''}
                  onChange={e => setEditFormData({ ...editFormData, nama: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                  placeholder="Contoh: Ahmad Budi"
                />
              </div>

              {/* Nomor Peserta & Asal Sekolah */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Nomor Peserta
                  </label>
                  <input
                    type="text"
                    value={editFormData.nomorPeserta || ''}
                    onChange={e => setEditFormData({ ...editFormData, nomorPeserta: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '14px', outline: 'none', boxSizing: 'border-box', background: '#f8fafc' }}
                    placeholder="Contoh: OLM-MAT-001"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Asal Sekolah / Madrasah
                  </label>
                  <input
                    type="text"
                    value={editFormData.asalSekolah || ''}
                    onChange={e => setEditFormData({ ...editFormData, asalSekolah: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                    placeholder="Contoh: MIN 1 Malang"
                  />
                </div>
              </div>

              {/* NISN & Kelas */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    NISN
                  </label>
                  <input
                    type="text"
                    value={editFormData.nisn || ''}
                    onChange={e => setEditFormData({ ...editFormData, nisn: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                    placeholder="Contoh: 0081234567"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Kelas
                  </label>
                  <input
                    type="text"
                    value={editFormData.kelas || ''}
                    onChange={e => setEditFormData({ ...editFormData, kelas: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                    placeholder="Contoh: 5 atau 6"
                  />
                </div>
              </div>

              {/* Cabang Lomba & Nama Regu */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Cabang Lomba *
                  </label>
                  <select
                    value={editFormData.lomba || 'Matematika'}
                    onChange={e => setEditFormData({ ...editFormData, lomba: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '14px', outline: 'none', boxSizing: 'border-box', background: 'white' }}
                  >
                    {OFFICIAL_LOMBA.map(l => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Nama Regu / Grup (Khusus Beregu)
                  </label>
                  <input
                    type="text"
                    value={editFormData.namaRegu || ''}
                    onChange={e => setEditFormData({ ...editFormData, namaRegu: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                    placeholder="Kosongkan jika bukan regu"
                  />
                </div>
              </div>

              {/* No WhatsApp & Status Pembayaran */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    No. WhatsApp
                  </label>
                  <input
                    type="text"
                    value={editFormData.noWa || ''}
                    onChange={e => setEditFormData({ ...editFormData, noWa: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                    placeholder="08xxxxxxxxxx"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Status Pembayaran
                  </label>
                  <select
                    value={editFormData.statusPembayaran || 'Valid'}
                    onChange={e => setEditFormData({ ...editFormData, statusPembayaran: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '14px', outline: 'none', boxSizing: 'border-box', background: 'white' }}
                  >
                    <option value="Valid">Valid / Lunas</option>
                    <option value="Menunggu">Menunggu Verifikasi</option>
                  </select>
                </div>
              </div>

              {/* Akun CBT (Khusus Lomba Akademik) */}
              {['Matematika', 'IPAS', 'PAI', 'Inggris', 'Arab'].includes(editFormData.lomba) && (
                <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <i className="fas fa-laptop" style={{ color: '#0284c7' }}></i> Kredensial Login CBT
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>Username CBT</label>
                      <input
                        type="text"
                        value={editFormData.usernameCbt || ''}
                        onChange={e => setEditFormData({ ...editFormData, usernameCbt: e.target.value })}
                        style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>Password CBT</label>
                      <input
                        type="text"
                        value={editFormData.passwordCbt || ''}
                        onChange={e => setEditFormData({ ...editFormData, passwordCbt: e.target.value })}
                        style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setEditingPeserta(null)}
                style={{ padding: '9px 18px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', color: '#475569', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={savingEdit}
                style={{ padding: '9px 20px', borderRadius: '8px', border: 'none', background: '#047857', color: 'white', fontWeight: 700, fontSize: '13px', cursor: savingEdit ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                {savingEdit ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-save"></i>}
                Simpan Perubahan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: KELOLA PESERTA KOLEKTIF */}
      {kelolaKolektif && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9998,
          padding: '20px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '960px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
                  <i className="fas fa-school" style={{ color: '#0284c7', marginRight: '8px' }}></i>
                  Peserta Kolektif: {kelolaKolektif.metadata?.ASAL_SEKOLAH || 'Sekolah'}
                </h3>
                <p style={{ margin: '3px 0 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                  Total {collectiveStudents.length} peserta terdaftar dari sekolah ini. Anda dapat mengedit atau menghapus peserta dummy/batal.
                </p>
              </div>
              <button
                onClick={() => setKelolaKolektif(null)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
              {collectiveStudents.length === 0 ? (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: '#94a3b8' }}>
                  <i className="fas fa-user-slash" style={{ fontSize: '2.5rem', marginBottom: '12px' }}></i>
                  <p style={{ margin: 0, fontWeight: 600 }}>Tidak ada data siswa tersimpan untuk sekolah ini.</p>
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', color: '#475569', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>
                      <th style={{ padding: '10px 12px' }}>No</th>
                      <th style={{ padding: '10px 12px' }}>No. Peserta</th>
                      <th style={{ padding: '10px 12px' }}>Nama Peserta</th>
                      <th style={{ padding: '10px 12px' }}>NISN / Kelas</th>
                      <th style={{ padding: '10px 12px' }}>Lomba</th>
                      <th style={{ padding: '10px 12px' }}>Akun CBT</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right' }}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {collectiveStudents.map((cs, idx) => {
                      const meta = cs.metadata || {};
                      const rawLomba = meta.LOMBA_DIPILIH || meta['LOMBA YANG DIPILIH'] || meta.LOMBA || '';
                      const lombaName = normalizeLomba(rawLomba);
                      const isAkademik = ['Matematika', 'IPAS', 'PAI', 'Inggris', 'Arab'].includes(lombaName);

                      return (
                        <tr key={cs.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '12px', color: '#64748b' }}>{idx + 1}</td>
                          <td style={{ padding: '12px' }}>
                            <span style={{ background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', padding: '2px 6px', borderRadius: '4px', fontWeight: 800, fontSize: '0.78rem' }}>
                              {meta.NOMOR_PESERTA || '-'}
                            </span>
                          </td>
                          <td style={{ padding: '12px' }}>
                            <div style={{ fontWeight: 700, color: '#0f172a' }}>{meta.NAMA || meta.NAMA_REGU || '-'}</div>
                            {meta.NAMA_REGU && (
                              <div style={{ fontSize: '0.75rem', color: '#b45309' }}>Grup: {meta.NAMA_REGU}</div>
                            )}
                          </td>
                          <td style={{ padding: '12px', color: '#475569', fontSize: '0.8rem' }}>
                            <div>NISN: {meta.NISN || '-'}</div>
                            <div>Kls: {meta.KELAS || '-'}</div>
                          </td>
                          <td style={{ padding: '12px', fontWeight: 600, color: '#0f172a' }}>
                            {lombaName}
                          </td>
                          <td style={{ padding: '12px', fontSize: '0.78rem' }}>
                            {isAkademik ? (
                              meta.USERNAME_CBT ? (
                                <div>U: <b>{meta.USERNAME_CBT}</b> | P: <b>{meta.PASSWORD_CBT}</b></div>
                              ) : <span style={{ color: '#94a3b8' }}>-</span>
                            ) : <span style={{ color: '#94a3b8' }}>- (Seni)</span>}
                          </td>
                          <td style={{ padding: '12px', textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                              <button
                                onClick={() => handleOpenEdit(cs)}
                                style={{ padding: '4px 8px', borderRadius: '6px', background: '#f59e0b', color: 'white', border: 'none', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700 }}
                                title="Edit Peserta Ini"
                              >
                                <i className="fas fa-edit"></i> Edit
                              </button>
                              <button
                                onClick={() => handleDelete(cs.id, meta.NAMA || meta.NAMA_REGU)}
                                style={{ padding: '4px 8px', borderRadius: '6px', background: '#fee2e2', color: '#ef4444', border: 'none', cursor: 'pointer', fontSize: '0.75rem' }}
                                title="Hapus Peserta Ini"
                              >
                                <i className="fas fa-trash-alt"></i>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            <div style={{ padding: '14px 24px', borderTop: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setKelolaKolektif(null)}
                style={{ padding: '8px 18px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', color: '#475569', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
