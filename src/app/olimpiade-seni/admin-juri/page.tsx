'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import InlineLoading from '@/components/InlineLoading';
import {
  CABANG_SENI_CANONICAL,
  DEFAULT_TABEL_PENILAIAN_SENI,
  KriteriaAspekJuri,
  TabelPenilaianCabangConfig
} from '@/lib/olimpiade-config';

export default function AdminJuriOlimpiadePage() {
  const [activeTab, setActiveTab] = useState<'monitoring' | 'akun' | 'tabel'>('monitoring');
  const [loading, setLoading] = useState(true);
  const [juriList, setJuriList] = useState<any[]>([]);
  const [pesertaList, setPesertaList] = useState<any[]>([]);
  const [tabelConfigMap, setTabelConfigMap] = useState<Record<string, TabelPenilaianCabangConfig>>(
    DEFAULT_TABEL_PENILAIAN_SENI
  );

  // Filter & Search States (Tab Monitoring)
  const [selectedCabang, setSelectedCabang] = useState<string>('Singer Solo');
  const [filterStatusNilai, setFilterStatusNilai] = useState<'semua' | 'lengkap' | 'sebagian' | 'belum'>('semua');
  const [sortMode, setSortMode] = useState<'nilai' | 'nomor'>('nilai');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal Buat / Edit Akun Juri States
  const [showJuriModal, setShowJuriModal] = useState(false);
  const [editingJuri, setEditingJuri] = useState<any | null>(null);
  const [formNamaJuri, setFormNamaJuri] = useState('');
  const [formCabangJuri, setFormCabangJuri] = useState('Singer Solo');
  const [formUsername, setFormUsername] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [savingJuri, setSavingJuri] = useState(false);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});

  // Tab Pengaturan Tabel Penilaian States
  const [configCabangTab, setConfigCabangTab] = useState<string>('Singer Solo');
  const [savingConfig, setSavingConfig] = useState(false);

  // Modal Input / Edit Nilai Peserta oleh Admin
  const [inputModalPeserta, setInputModalPeserta] = useState<any | null>(null);
  const [inputModalJuri, setInputModalJuri] = useState<any | null>(null);
  const [inputAspekValues, setInputAspekValues] = useState<Record<string, string>>({});
  const [inputCatatan, setInputCatatan] = useState('');
  const [savingNilaiAdmin, setSavingNilaiAdmin] = useState(false);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/olimpiade-seni/juri/admin');
      const json = await res.json();
      if (json.success) {
        setJuriList(json.juri_list || []);
        setPesertaList(json.peserta_list || []);
        if (json.tabel_config) {
          setTabelConfigMap(json.tabel_config);
        }
      } else {
        Swal.fire('Gagal', json.error || 'Gagal memuat data juri', 'error');
      }
    } catch (err: any) {
      console.error(err);
      Swal.fire('Error', 'Gagal menghubungi server', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Juri untuk cabang yang sedang dipilih di Monitoring
  const juriInSelectedCabang = useMemo(() => {
    return juriList.filter(j => j.cabang_lomba === selectedCabang);
  }, [juriList, selectedCabang]);

  // Daftar peserta untuk cabang yang sedang dipilih + pengurutan & peringkat
  const processedPesertaCabang = useMemo(() => {
    const raw = pesertaList.filter(p => p.cabang_lomba === selectedCabang);

    // Hitung peringkat berdasarkan rata_rata tertinggi terlebih dahulu
    const sortedByScore = [...raw].sort((a, b) => {
      if (b.rata_rata !== a.rata_rata) return b.rata_rata - a.rata_rata;
      if (b.total_nilai !== a.total_nilai) return b.total_nilai - a.total_nilai;
      return String(a.nomor_peserta).localeCompare(String(b.nomor_peserta), undefined, { numeric: true });
    });

    const rankMap: Record<number, number> = {};
    sortedByScore.forEach((item, idx) => {
      if (item.jumlah_juri_menilai > 0 && item.rata_rata > 0) {
        rankMap[item.id] = idx + 1;
      }
    });

    const withRank = raw.map(item => ({
      ...item,
      peringkat: rankMap[item.id] || null
    }));

    // Filter status penilaian & pencarian
    const filtered = withRank.filter(p => {
      if (filterStatusNilai === 'lengkap') {
        if (p.total_juri_cabang === 0 || p.jumlah_juri_menilai < p.total_juri_cabang) return false;
      } else if (filterStatusNilai === 'sebagian') {
        if (p.jumlah_juri_menilai === 0 || (p.total_juri_cabang > 0 && p.jumlah_juri_menilai >= p.total_juri_cabang))
          return false;
      } else if (filterStatusNilai === 'belum') {
        if (p.jumlah_juri_menilai > 0) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchNama = (p.nama || '').toLowerCase().includes(q);
        const matchNo = (p.nomor_peserta || '').toLowerCase().includes(q);
        const matchSek = (p.asal_sekolah || '').toLowerCase().includes(q);
        return matchNama || matchNo || matchSek;
      }
      return true;
    });

    if (sortMode === 'nilai') {
      filtered.sort((a, b) => {
        if (b.rata_rata !== a.rata_rata) return b.rata_rata - a.rata_rata;
        if (b.total_nilai !== a.total_nilai) return b.total_nilai - a.total_nilai;
        return String(a.nomor_peserta).localeCompare(String(b.nomor_peserta), undefined, { numeric: true });
      });
    } else {
      filtered.sort((a, b) =>
        String(a.nomor_peserta).localeCompare(String(b.nomor_peserta), undefined, { numeric: true })
      );
    }

    return filtered;
  }, [pesertaList, selectedCabang, filterStatusNilai, sortMode, searchQuery]);

  const getPredikatBadge = (rank: number | null) => {
    if (!rank) return null;
    if (rank === 1) return { label: '🥇 Juara 1', bg: '#fef3c7', color: '#b45309', border: '#f59e0b' };
    if (rank === 2) return { label: '🥈 Juara 2', bg: '#f1f5f9', color: '#334155', border: '#94a3b8' };
    if (rank === 3) return { label: '🥉 Juara 3', bg: '#ffedd5', color: '#9a3412', border: '#fb923c' };
    if (rank === 4) return { label: '🎖️ Harapan 1', bg: '#e0f2fe', color: '#0369a1', border: '#38bdf8' };
    if (rank === 5) return { label: '🎖️ Harapan 2', bg: '#e0f2fe', color: '#0369a1', border: '#38bdf8' };
    if (rank === 6) return { label: '🎖️ Harapan 3', bg: '#e0f2fe', color: '#0369a1', border: '#38bdf8' };
    return null;
  };

  // ==================== HANDLERS: AKUN JURI ====================
  const openCreateJuriModal = () => {
    setEditingJuri(null);
    setFormNamaJuri('');
    setFormCabangJuri(selectedCabang);
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    setFormUsername(`juri_${selectedCabang.toLowerCase().replace(/[^a-z]/g, '')}_${randomSuffix}`);
    setFormPassword(`juri${randomSuffix}`);
    setShowJuriModal(true);
  };

  const openEditJuriModal = (juri: any) => {
    setEditingJuri(juri);
    setFormNamaJuri(juri.nama_juri);
    setFormCabangJuri(juri.cabang_lomba);
    setFormUsername(juri.username);
    setFormPassword(juri.password);
    setShowJuriModal(true);
  };

  const handleSaveJuriAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingJuri(true);
    try {
      const payload = editingJuri
        ? {
            action: 'update_juri',
            id: editingJuri.id,
            nama_juri: formNamaJuri,
            cabang_lomba: formCabangJuri,
            username: formUsername,
            password: formPassword
          }
        : {
            action: 'create_juri',
            nama_juri: formNamaJuri,
            cabang_lomba: formCabangJuri,
            username: formUsername,
            password: formPassword
          };

      const res = await fetch('/api/olimpiade-seni/juri/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (json.success) {
        setShowJuriModal(false);
        await fetchAllData();
        Swal.fire({
          icon: 'success',
          title: editingJuri ? 'Akun Juri Diperbarui!' : 'Akun Juri Berhasil Dibuat!',
          text: `${formNamaJuri} (${formCabangJuri}) siap digunakan untuk login.`,
          timer: 1800,
          showConfirmButton: false
        });
      } else {
        Swal.fire('Gagal', json.error || 'Gagal menyimpan akun juri', 'error');
      }
    } catch (err: any) {
      Swal.fire('Error', err.message || 'Kesalahan jaringan', 'error');
    } finally {
      setSavingJuri(false);
    }
  };

  const handleDeleteJuri = async (juri: any) => {
    const confirm = await Swal.fire({
      title: `Hapus Akun Juri "${juri.nama_juri}"?`,
      text: `Data nilai yang telah diinput oleh juri ini (${juri.sudah_dinilai} peserta) juga akan ikut terhapus.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Ya, Hapus Akun',
      cancelButtonText: 'Batal'
    });

    if (!confirm.isConfirmed) return;

    try {
      const res = await fetch('/api/olimpiade-seni/juri/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_juri', id: juri.id })
      });
      const json = await res.json();
      if (json.success) {
        await fetchAllData();
        Swal.fire({ icon: 'success', title: 'Akun Juri Dihapus', timer: 1400, showConfirmButton: false });
      } else {
        Swal.fire('Gagal', json.error, 'error');
      }
    } catch (err) {
      Swal.fire('Error', 'Gagal menghapus akun juri', 'error');
    }
  };

  const handleCopyCredentialsWA = (juri: any) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const linkPortal = `${origin}/olimpiade-seni/juri`;
    const textWA =
      `*AKSES PORTAL DEWAN JURI LOMBA SENI*\n` +
      `MTs Almaarif 01 Singosari\n\n` +
      `Yth. *${juri.nama_juri}*\n` +
      `Cabang Lomba: *${juri.cabang_lomba}*\n\n` +
      `🔗 *Link Login Juri:* ${linkPortal}\n` +
      `👤 *Username:* ${juri.username}\n` +
      `🔑 *Password:* ${juri.password}\n\n` +
      `Selamat bertugas dan terima kasih.`;

    navigator.clipboard.writeText(textWA);
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: 'Format pesan WA & Kredensial Juri disalin!',
      showConfirmButton: false,
      timer: 2000
    });
  };

  // ==================== HANDLERS: PENGATURAN TABEL ASPEK ====================
  const currentEditingConfig = tabelConfigMap[configCabangTab] || DEFAULT_TABEL_PENILAIAN_SENI[configCabangTab];

  const handleUpdateAspekField = (idx: number, field: keyof KriteriaAspekJuri, value: any) => {
    setTabelConfigMap(prev => {
      const cur = prev[configCabangTab] || DEFAULT_TABEL_PENILAIAN_SENI[configCabangTab];
      const nextAspek = cur.aspek.map((item, i) => (i === idx ? { ...item, [field]: value } : item));
      return {
        ...prev,
        [configCabangTab]: {
          ...cur,
          aspek: nextAspek
        }
      };
    });
  };

  const handleAddAspekColumn = () => {
    setTabelConfigMap(prev => {
      const cur = prev[configCabangTab] || DEFAULT_TABEL_PENILAIAN_SENI[configCabangTab];
      const nextNum = cur.aspek.length + 1;
      const newCol: KriteriaAspekJuri = {
        id: `aspek_${Date.now()}`,
        nama: `Kriteria Penilaian ${nextNum}`,
        bobotMaks: 25,
        keterangan: 'Deskripsi aspek penilaian'
      };
      return {
        ...prev,
        [configCabangTab]: {
          ...cur,
          aspek: [...cur.aspek, newCol]
        }
      };
    });
  };

  const handleRemoveAspekColumn = (idx: number) => {
    if (currentEditingConfig.aspek.length <= 1) {
      Swal.fire('Minimal 1 Kolom', 'Tabel penilaian harus memiliki minimal 1 kolom aspek kriteria.', 'warning');
      return;
    }
    setTabelConfigMap(prev => {
      const cur = prev[configCabangTab];
      return {
        ...prev,
        [configCabangTab]: {
          ...cur,
          aspek: cur.aspek.filter((_, i) => i !== idx)
        }
      };
    });
  };

  const handleSaveTabelConfig = async () => {
    setSavingConfig(true);
    try {
      const res = await fetch('/api/olimpiade-seni/juri/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_tabel_config',
          cabang: configCabangTab,
          config: currentEditingConfig
        })
      });
      const json = await res.json();
      if (json.success) {
        Swal.fire({
          icon: 'success',
          title: 'Tabel Penilaian Disimpan!',
          text: `Format tabel penilaian untuk cabang ${configCabangTab} telah aktif di halaman Portal Juri.`,
          timer: 2000,
          showConfirmButton: false
        });
      } else {
        Swal.fire('Gagal', json.error, 'error');
      }
    } catch (err) {
      Swal.fire('Error', 'Gagal menyimpan konfigurasi tabel', 'error');
    } finally {
      setSavingConfig(false);
    }
  };

  const handleResetDefaultConfig = () => {
    setTabelConfigMap(prev => ({
      ...prev,
      [configCabangTab]: JSON.parse(JSON.stringify(DEFAULT_TABEL_PENILAIAN_SENI[configCabangTab]))
    }));
  };

  // ==================== HANDLERS: INPUT / EDIT NILAI DARI MONITORING ====================
  const openAdminInputNilai = (peserta: any, juri: any) => {
    setInputModalPeserta(peserta);
    setInputModalJuri(juri);
    const existing = peserta.nilai_per_juri?.[juri.id];
    const aspekStr: Record<string, string> = {};
    const cfg = tabelConfigMap[peserta.cabang_lomba] || DEFAULT_TABEL_PENILAIAN_SENI[peserta.cabang_lomba];

    if (existing?.aspek && Object.keys(existing.aspek).length > 0) {
      Object.entries(existing.aspek).forEach(([k, v]) => {
        aspekStr[k] = String(v);
      });
    } else if (existing?.nilai !== undefined && existing?.nilai !== null && cfg.aspek.length === 1) {
      aspekStr[cfg.aspek[0].id] = String(existing.nilai);
    }

    setInputAspekValues(aspekStr);
    setInputCatatan(existing?.catatan || '');
  };

  const handleSaveNilaiFromAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputModalPeserta || !inputModalJuri) return;

    const cfg =
      tabelConfigMap[inputModalPeserta.cabang_lomba] ||
      DEFAULT_TABEL_PENILAIAN_SENI[inputModalPeserta.cabang_lomba];

    const numericAspek: Record<string, number> = {};
    let sum = 0;
    let count = 0;

    for (const a of cfg.aspek) {
      const raw = inputAspekValues[a.id];
      if (raw !== undefined && raw !== '') {
        const val = parseFloat(raw);
        if (isNaN(val) || val < 0 || val > a.bobotMaks) {
          Swal.fire('Peringatan', `Nilai untuk "${a.nama}" harus antara 0 s.d. ${a.bobotMaks}`, 'warning');
          return;
        }
        numericAspek[a.id] = val;
        sum += val;
        count++;
      }
    }

    if (count === 0) {
      Swal.fire('Peringatan', 'Masukkan minimal satu nilai aspek terlebih dahulu.', 'warning');
      return;
    }

    const finalNilai = cfg.modeHitung === 'avg' ? Number((sum / cfg.aspek.length).toFixed(2)) : Number(sum.toFixed(2));

    setSavingNilaiAdmin(true);
    try {
      const res = await fetch('/api/olimpiade-seni/juri/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_nilai',
          juri_id: inputModalJuri.id,
          peserta_id: inputModalPeserta.id,
          nilai: finalNilai,
          aspek: numericAspek,
          catatan: inputCatatan
        })
      });
      const json = await res.json();
      if (json.success) {
        setInputModalPeserta(null);
        setInputModalJuri(null);
        await fetchAllData();
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: `Nilai berhasil disimpan (Total: ${finalNilai})`,
          showConfirmButton: false,
          timer: 1600
        });
      } else {
        Swal.fire('Gagal', json.error, 'error');
      }
    } catch (err) {
      Swal.fire('Error', 'Gagal menyimpan nilai', 'error');
    } finally {
      setSavingNilaiAdmin(false);
    }
  };

  // ==================== HANDLERS: EXPORT EXCEL ====================
  const buildSheetRowsForCabang = (cabangName: string) => {
    const juris = juriList.filter(j => j.cabang_lomba === cabangName);
    const cfg = tabelConfigMap[cabangName] || DEFAULT_TABEL_PENILAIAN_SENI[cabangName];
    const pesertas = pesertaList
      .filter(p => p.cabang_lomba === cabangName)
      .sort((a, b) => {
        if (b.rata_rata !== a.rata_rata) return b.rata_rata - a.rata_rata;
        if (b.total_nilai !== a.total_nilai) return b.total_nilai - a.total_nilai;
        return String(a.nomor_peserta).localeCompare(String(b.nomor_peserta), undefined, { numeric: true });
      });

    return pesertas.map((p, idx) => {
      const rank = p.jumlah_juri_menilai > 0 && p.rata_rata > 0 ? idx + 1 : null;
      const predikat = getPredikatBadge(rank)?.label.replace(/^[^\s]+\s/, '') || '-';
      const row: Record<string, any> = {
        Peringkat: rank || '-',
        'Nomor Peserta': p.nomor_peserta,
        'Nama Peserta / Regu': p.nama,
        'Asal Sekolah': p.asal_sekolah,
        'Cabang Lomba': p.cabang_lomba
      };

      juris.forEach((j, jIdx) => {
        const nj = p.nilai_per_juri?.[j.id];
        // Tampilkan rincian per aspek jika ada
        cfg.aspek.forEach(a => {
          row[`Juri ${jIdx + 1} (${j.nama_juri}) - ${a.nama}`] =
            nj?.aspek?.[a.id] !== undefined ? nj.aspek[a.id] : '';
        });
        row[`Total Nilai Juri ${jIdx + 1} (${j.nama_juri})`] = nj?.nilai !== undefined ? nj.nilai : '';
        if (cfg.tampilkanCatatan) {
          row[`Catatan Juri ${jIdx + 1}`] = nj?.catatan || '';
        }
      });

      row['Jumlah Juri Menilai'] = `${p.jumlah_juri_menilai} / ${juris.length}`;
      row['Total Akumulasi Nilai'] = p.total_nilai;
      row['Rata-Rata Nilai Akhir'] = p.rata_rata;
      row['Predikat Juara'] = predikat;
      return row;
    });
  };

  const handleExportCabangIni = () => {
    const rows = buildSheetRowsForCabang(selectedCabang);
    if (rows.length === 0) {
      Swal.fire('Info', `Belum ada data peserta untuk cabang ${selectedCabang}.`, 'info');
      return;
    }
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, selectedCabang.slice(0, 30));
    XLSX.writeFile(wb, `Rekap_Nilai_Juri_${selectedCabang.replace(/\s+/g, '_')}.xlsx`);
  };

  const handleExportSemuaCabang = () => {
    const wb = XLSX.utils.book_new();
    let hasSheet = false;
    CABANG_SENI_CANONICAL.forEach(cab => {
      const rows = buildSheetRowsForCabang(cab);
      if (rows.length > 0) {
        const ws = XLSX.utils.json_to_sheet(rows);
        XLSX.utils.book_append_sheet(wb, ws, cab.slice(0, 30));
        hasSheet = true;
      }
    });
    if (!hasSheet) {
      Swal.fire('Info', 'Belum ada data peserta Lomba Seni.', 'info');
      return;
    }
    XLSX.writeFile(wb, `Rekap_Lengkap_Penilaian_Juri_Lomba_Seni.xlsx`);
  };

  const handleExportBlankoManual = (cabangTarget: string) => {
    const cfg = tabelConfigMap[cabangTarget] || DEFAULT_TABEL_PENILAIAN_SENI[cabangTarget];
    const pesertas = pesertaList
      .filter(p => p.cabang_lomba === cabangTarget)
      .sort((a, b) =>
        String(a.nomor_peserta).localeCompare(String(b.nomor_peserta), undefined, { numeric: true })
      );

    const rows = pesertas.map((p, idx) => {
      const r: Record<string, any> = {
        No: idx + 1,
        'Nomor Peserta': p.nomor_peserta,
        'Nama Peserta / Regu': p.nama,
        'Asal Sekolah': p.asal_sekolah
      };
      cfg.aspek.forEach(a => {
        r[`${a.nama} (Maks ${a.bobotMaks})`] = '';
      });
      r['Total Nilai'] = '';
      if (cfg.tampilkanCatatan) {
        r['Catatan Juri'] = '';
      }
      return r;
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Blanko ${cabangTarget}`.slice(0, 30));
    XLSX.writeFile(wb, `Blanko_Penilaian_Juri_${cabangTarget.replace(/\s+/g, '_')}.xlsx`);
  };

  const handleCopyPortalLink = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const url = `${origin}/olimpiade-seni/juri`;
    navigator.clipboard.writeText(url);
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: 'Link Portal Login Juri berhasil disalin!',
      showConfirmButton: false,
      timer: 1800
    });
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '24px' }}>
      <div style={{ maxWidth: '1380px', margin: '0 auto' }}>
        {/* TOP HEADER */}
        <div
          style={{
            background: 'white',
            borderRadius: '20px',
            padding: '24px 28px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
            border: '1px solid #e2e8f0',
            marginBottom: '20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px'
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <Link
                href="/olimpiade-seni"
                style={{
                  color: '#0284c7',
                  textDecoration: 'none',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <i className="fas fa-arrow-left"></i> Beranda Olimpiade
              </Link>
              <span style={{ color: '#cbd5e1' }}>•</span>
              <span
                style={{
                  background: '#fef3c7',
                  color: '#b45309',
                  padding: '2px 10px',
                  borderRadius: 20,
                  fontSize: '0.75rem',
                  fontWeight: 800
                }}
              >
                MANAJEMEN DEWAN JURI LOMBA SENI
              </span>
            </div>
            <h1 style={{ margin: 0, fontSize: '1.65rem', fontWeight: 900, color: '#0f172a' }}>
              Pusat Kendali Juri, Kriteria Penilaian &amp; Rekap Nilai Seni
            </h1>
            <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.92rem' }}>
              Kelola akun Dewan Juri, atur kolom kriteria penilaian tiap cabang lomba seni, pantau progres pengisian juri secara *real-time*, dan unduh rekapitulasi Excel.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              onClick={handleCopyPortalLink}
              style={{
                background: '#eff6ff',
                color: '#0284c7',
                border: '1.5px solid #bfdbfe',
                padding: '10px 16px',
                borderRadius: '11px',
                fontWeight: 800,
                fontSize: '0.86rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              <i className="fas fa-link"></i> Salin Link Login Juri
            </button>

            <Link
              href="/olimpiade-seni/juri"
              target="_blank"
              style={{
                background: '#0f172a',
                color: 'white',
                textDecoration: 'none',
                padding: '10px 16px',
                borderRadius: '11px',
                fontWeight: 800,
                fontSize: '0.86rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              <i className="fas fa-external-link-alt"></i> Buka Portal Juri
            </Link>

            <button
              onClick={handleExportSemuaCabang}
              style={{
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: 'white',
                border: 'none',
                padding: '10px 18px',
                borderRadius: '11px',
                fontWeight: 800,
                fontSize: '0.86rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
              }}
            >
              <i className="fas fa-file-excel"></i> Export Semua Cabang (Excel)
            </button>

            <button
              onClick={fetchAllData}
              style={{
                background: '#f1f5f9',
                color: '#334155',
                border: '1px solid #cbd5e1',
                padding: '10px 14px',
                borderRadius: '11px',
                fontWeight: 700,
                fontSize: '0.86rem',
                cursor: 'pointer'
              }}
              title="Refresh Data"
            >
              <i className="fas fa-sync-alt"></i>
            </button>
          </div>
        </div>

        {/* NAVIGATION TABS (3 MENU UTAMA) */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '14px',
            marginBottom: '22px'
          }}
        >
          <button
            onClick={() => setActiveTab('monitoring')}
            style={{
              background: activeTab === 'monitoring' ? 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)' : 'white',
              color: activeTab === 'monitoring' ? 'white' : '#334155',
              border: `2px solid ${activeTab === 'monitoring' ? '#0284c7' : '#e2e8f0'}`,
              borderRadius: '16px',
              padding: '16px 20px',
              cursor: 'pointer',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              boxShadow: activeTab === 'monitoring' ? '0 8px 20px rgba(2, 132, 199, 0.25)' : 'none',
              transition: 'all 0.2s'
            }}
          >
            <div
              style={{
                width: 46,
                height: 46,
                borderRadius: 12,
                background: activeTab === 'monitoring' ? 'rgba(255,255,255,0.2)' : '#e0f2fe',
                color: activeTab === 'monitoring' ? 'white' : '#0284c7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20
              }}
            >
              <i className="fas fa-chart-bar"></i>
            </div>
            <div>
              <div style={{ fontWeight: 900, fontSize: '1rem' }}>1. Monitoring Pengisian Juri</div>
              <div style={{ fontSize: '0.78rem', opacity: 0.85, marginTop: 2 }}>
                Pantau progres penilaian, rincian skor &amp; export rekap juara
              </div>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('akun')}
            style={{
              background: activeTab === 'akun' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'white',
              color: activeTab === 'akun' ? 'white' : '#334155',
              border: `2px solid ${activeTab === 'akun' ? '#10b981' : '#e2e8f0'}`,
              borderRadius: '16px',
              padding: '16px 20px',
              cursor: 'pointer',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              boxShadow: activeTab === 'akun' ? '0 8px 20px rgba(16, 185, 129, 0.25)' : 'none',
              transition: 'all 0.2s'
            }}
          >
            <div
              style={{
                width: 46,
                height: 46,
                borderRadius: 12,
                background: activeTab === 'akun' ? 'rgba(255,255,255,0.2)' : '#dcfce7',
                color: activeTab === 'akun' ? 'white' : '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20
              }}
            >
              <i className="fas fa-user-shield"></i>
            </div>
            <div>
              <div style={{ fontWeight: 900, fontSize: '1rem' }}>
                2. Kelola Akun Juri ({juriList.length} Akun)
              </div>
              <div style={{ fontSize: '0.78rem', opacity: 0.85, marginTop: 2 }}>
                Buat akun juri baru, atur cabang lomba &amp; salin akses WA
              </div>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('tabel')}
            style={{
              background: activeTab === 'tabel' ? 'linear-gradient(135deg, #d97706 0%, #b45309 100%)' : 'white',
              color: activeTab === 'tabel' ? 'white' : '#334155',
              border: `2px solid ${activeTab === 'tabel' ? '#d97706' : '#e2e8f0'}`,
              borderRadius: '16px',
              padding: '16px 20px',
              cursor: 'pointer',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              boxShadow: activeTab === 'tabel' ? '0 8px 20px rgba(217, 119, 6, 0.25)' : 'none',
              transition: 'all 0.2s'
            }}
          >
            <div
              style={{
                width: 46,
                height: 46,
                borderRadius: 12,
                background: activeTab === 'tabel' ? 'rgba(255,255,255,0.2)' : '#fef3c7',
                color: activeTab === 'tabel' ? 'white' : '#d97706',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20
              }}
            >
              <i className="fas fa-sliders-h"></i>
            </div>
            <div>
              <div style={{ fontWeight: 900, fontSize: '1rem' }}>3. Pengaturan Tabel Penilaian</div>
              <div style={{ fontSize: '0.78rem', opacity: 0.85, marginTop: 2 }}>
                Atur kolom aspek &amp; bobot penilaian tiap cabang lomba seni
              </div>
            </div>
          </button>
        </div>

        {loading ? (
          <div style={{ background: 'white', borderRadius: 20, padding: 60, textAlign: 'center' }}>
            <InlineLoading message="Memuat data Dewan Juri & Penilaian Lomba Seni..." />
          </div>
        ) : (
          <>
            {/* ========================================================================= */}
            {/* TAB 1: MONITORING PENGISIAN JURI & REKAP NILAI                            */}
            {/* ========================================================================= */}
            {activeTab === 'monitoring' && (
              <div>
                {/* Cabang Lomba Selector Pills */}
                <div
                  style={{
                    background: 'white',
                    padding: '18px 22px',
                    borderRadius: '16px',
                    border: '1px solid #e2e8f0',
                    marginBottom: '18px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '14px'
                  }}
                >
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#475569', marginRight: 4 }}>
                      Pilih Cabang Lomba Seni:
                    </span>
                    {CABANG_SENI_CANONICAL.map(cab => {
                      const active = selectedCabang === cab;
                      const countPeserta = pesertaList.filter(p => p.cabang_lomba === cab).length;
                      const countJuri = juriList.filter(j => j.cabang_lomba === cab).length;
                      return (
                        <button
                          key={cab}
                          onClick={() => setSelectedCabang(cab)}
                          style={{
                            padding: '10px 18px',
                            borderRadius: '12px',
                            border: `2px solid ${active ? '#0284c7' : '#cbd5e1'}`,
                            background: active ? '#e0f2fe' : '#f8fafc',
                            color: active ? '#0369a1' : '#334155',
                            fontWeight: 800,
                            fontSize: '0.9rem',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 8
                          }}
                        >
                          <i
                            className={`fas ${
                              cab === 'Singer Solo' ? 'fa-microphone-alt' : cab === 'Al Banjari' ? 'fa-drum' : 'fa-flag'
                            }`}
                          ></i>
                          <span>{cab}</span>
                          <span
                            style={{
                              background: active ? '#0284c7' : '#cbd5e1',
                              color: active ? 'white' : '#334155',
                              fontSize: '0.72rem',
                              padding: '2px 8px',
                              borderRadius: 12
                            }}
                          >
                            {countPeserta} Peserta • {countJuri} Juri
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button
                      onClick={() => handleExportBlankoManual(selectedCabang)}
                      style={{
                        background: 'white',
                        color: '#0284c7',
                        border: '1.5px solid #0284c7',
                        padding: '9px 14px',
                        borderRadius: '10px',
                        fontWeight: 800,
                        fontSize: '0.82rem',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6
                      }}
                    >
                      <i className="fas fa-print"></i> Blanko Kosong {selectedCabang}
                    </button>

                    <button
                      onClick={handleExportCabangIni}
                      style={{
                        background: '#10b981',
                        color: 'white',
                        border: 'none',
                        padding: '9px 16px',
                        borderRadius: '10px',
                        fontWeight: 800,
                        fontSize: '0.82rem',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6
                      }}
                    >
                      <i className="fas fa-file-excel"></i> Export Nilai {selectedCabang}
                    </button>
                  </div>
                </div>

                {/* Kartu Progres Pengisian Juri di Cabang Ini */}
                <div style={{ marginBottom: '20px' }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '10px'
                    }}
                  >
                    <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#1e293b' }}>
                      <i className="fas fa-user-check" style={{ color: '#0284c7', marginRight: 8 }}></i>
                      Status &amp; Progres Pengisian Dewan Juri — {selectedCabang}
                    </h3>
                    <button
                      onClick={openCreateJuriModal}
                      style={{
                        background: '#0284c7',
                        color: 'white',
                        border: 'none',
                        padding: '7px 14px',
                        borderRadius: '8px',
                        fontSize: '0.8rem',
                        fontWeight: 800,
                        cursor: 'pointer'
                      }}
                    >
                      <i className="fas fa-plus"></i> Tambah Juri {selectedCabang}
                    </button>
                  </div>

                  {juriInSelectedCabang.length === 0 ? (
                    <div
                      style={{
                        background: '#fffbeb',
                        border: '1.5px dashed #f59e0b',
                        borderRadius: '14px',
                        padding: '20px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: 12
                      }}
                    >
                      <div style={{ color: '#92400e', fontSize: '0.92rem', fontWeight: 600 }}>
                        <i className="fas fa-exclamation-circle" style={{ marginRight: 8 }}></i>
                        Belum ada akun Dewan Juri yang terdaftar untuk cabang <b>{selectedCabang}</b>.
                      </div>
                      <button
                        onClick={openCreateJuriModal}
                        style={{
                          background: '#d97706',
                          color: 'white',
                          border: 'none',
                          padding: '8px 16px',
                          borderRadius: '8px',
                          fontWeight: 800,
                          cursor: 'pointer'
                        }}
                      >
                        + Buat Akun Juri Sekarang
                      </button>
                    </div>
                  ) : (
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                        gap: '14px'
                      }}
                    >
                      {juriInSelectedCabang.map((j, idx) => {
                        const isDone = j.total_peserta > 0 && j.sudah_dinilai >= j.total_peserta;
                        return (
                          <div
                            key={j.id}
                            style={{
                              background: 'white',
                              border: `1.5px solid ${isDone ? '#10b981' : '#e2e8f0'}`,
                              borderRadius: '14px',
                              padding: '16px',
                              boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                              <div>
                                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#0284c7', textTransform: 'uppercase' }}>
                                  JURI #{idx + 1} • {j.cabang_lomba}
                                </div>
                                <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#0f172a', marginTop: 2 }}>
                                  {j.nama_juri}
                                </div>
                                <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                                  Username: <code style={{ fontWeight: 700, color: '#334155' }}>{j.username}</code>
                                </div>
                              </div>

                              <span
                                style={{
                                  background: isDone ? '#dcfce7' : j.sudah_dinilai > 0 ? '#e0f2fe' : '#f1f5f9',
                                  color: isDone ? '#047857' : j.sudah_dinilai > 0 ? '#0369a1' : '#64748b',
                                  padding: '4px 10px',
                                  borderRadius: 20,
                                  fontSize: '0.74rem',
                                  fontWeight: 800
                                }}
                              >
                                {isDone ? '✓ Selesai 100%' : j.sudah_dinilai > 0 ? 'Sedang Menilai' : 'Belum Mulai'}
                              </span>
                            </div>

                            <div style={{ marginBottom: 10 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 700, marginBottom: 4 }}>
                                <span style={{ color: '#475569' }}>
                                  Dinilai: <b>{j.sudah_dinilai}</b> / {j.total_peserta} Peserta
                                </span>
                                <span style={{ color: '#059669' }}>{j.persentase}%</span>
                              </div>
                              <div style={{ width: '100%', height: 8, background: '#e2e8f0', borderRadius: 99, overflow: 'hidden' }}>
                                <div
                                  style={{
                                    width: `${j.persentase}%`,
                                    height: '100%',
                                    background: isDone ? '#10b981' : '#0284c7'
                                  }}
                                />
                              </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: '#94a3b8' }}>
                              <span>
                                {j.last_updated
                                  ? `Update: ${new Date(j.last_updated).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`
                                  : 'Belum ada input'}
                              </span>
                              <button
                                onClick={() => handleCopyCredentialsWA(j)}
                                style={{
                                  background: '#f8fafc',
                                  border: '1px solid #cbd5e1',
                                  color: '#334155',
                                  padding: '4px 10px',
                                  borderRadius: 6,
                                  fontSize: '0.74rem',
                                  fontWeight: 700,
                                  cursor: 'pointer'
                                }}
                              >
                                <i className="fab fa-whatsapp" style={{ color: '#16a34a', marginRight: 4 }}></i>
                                Salin Login
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Tabel Monitoring Nilai Peserta */}
                <div
                  style={{
                    background: 'white',
                    borderRadius: '18px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.03)',
                    overflow: 'hidden'
                  }}
                >
                  {/* Filter Bar */}
                  <div
                    style={{
                      padding: '16px 20px',
                      borderBottom: '1px solid #e2e8f0',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '12px'
                    }}
                  >
                    <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '1rem' }}>
                      Tabel Monitoring Nilai Peserta — <span style={{ color: '#0284c7' }}>{selectedCabang}</span> ({processedPesertaCabang.length} Peserta)
                    </div>

                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                      <input
                        type="text"
                        placeholder="Cari Peserta / Regu / Sekolah..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        style={{
                          padding: '8px 14px',
                          borderRadius: '9px',
                          border: '1px solid #cbd5e1',
                          fontSize: '0.85rem',
                          minWidth: 220
                        }}
                      />

                      <select
                        value={filterStatusNilai}
                        onChange={e => setFilterStatusNilai(e.target.value as any)}
                        style={{
                          padding: '8px 12px',
                          borderRadius: '9px',
                          border: '1px solid #cbd5e1',
                          fontSize: '0.85rem',
                          fontWeight: 700,
                          color: '#334155'
                        }}
                      >
                        <option value="semua">Semua Status Penilaian</option>
                        <option value="lengkap">Sudah Dinilai Lengkap</option>
                        <option value="sebagian">Baru Dinilai Sebagian Juri</option>
                        <option value="belum">Belum Dinilai Sama Sekali</option>
                      </select>

                      <select
                        value={sortMode}
                        onChange={e => setSortMode(e.target.value as any)}
                        style={{
                          padding: '8px 12px',
                          borderRadius: '9px',
                          border: '1px solid #cbd5e1',
                          fontSize: '0.85rem',
                          fontWeight: 700,
                          color: '#334155'
                        }}
                      >
                        <option value="nilai">Urutkan: Nilai Tertinggi (Juara)</option>
                        <option value="nomor">Urutkan: Nomor Peserta</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                      <thead>
                        <tr style={{ background: '#0f172a', color: 'white', textAlign: 'left' }}>
                          <th style={{ padding: '13px 12px', width: 60, textAlign: 'center' }}>Rank</th>
                          <th style={{ padding: '13px 12px', width: 125 }}>No. Peserta</th>
                          <th style={{ padding: '13px 12px', minWidth: 200 }}>Nama Peserta / Regu</th>
                          <th style={{ padding: '13px 12px', minWidth: 180 }}>Asal Sekolah</th>
                          {juriInSelectedCabang.map((j, jIdx) => (
                            <th
                              key={j.id}
                              style={{
                                padding: '13px 12px',
                                minWidth: 165,
                                textAlign: 'center',
                                background: '#1e293b',
                                borderLeft: '1px solid rgba(255,255,255,0.1)'
                              }}
                            >
                              <div style={{ fontSize: '0.7rem', color: '#38bdf8', fontWeight: 800 }}>
                                JURI #{jIdx + 1}
                              </div>
                              <div style={{ fontWeight: 800, color: '#ffffff' }}>{j.nama_juri}</div>
                            </th>
                          ))}
                          <th style={{ padding: '13px 12px', width: 110, textAlign: 'center', background: '#334155' }}>
                            Total Akumulasi
                          </th>
                          <th style={{ padding: '13px 12px', width: 125, textAlign: 'center', background: '#065f46' }}>
                            Rata-Rata Akhir
                          </th>
                          <th style={{ padding: '13px 12px', width: 135, textAlign: 'center' }}>Predikat</th>
                        </tr>
                      </thead>
                      <tbody>
                        {processedPesertaCabang.length === 0 ? (
                          <tr>
                            <td
                              colSpan={7 + juriInSelectedCabang.length}
                              style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}
                            >
                              Tidak ada data peserta yang sesuai dengan filter.
                            </td>
                          </tr>
                        ) : (
                          processedPesertaCabang.map((p, idx) => {
                            const predikat = getPredikatBadge(p.peringkat);
                            const cfg =
                              tabelConfigMap[p.cabang_lomba] || DEFAULT_TABEL_PENILAIAN_SENI[p.cabang_lomba];

                            return (
                              <tr
                                key={p.id}
                                style={{
                                  borderBottom: '1px solid #e2e8f0',
                                  background: p.peringkat && p.peringkat <= 3 ? '#fffbeb' : idx % 2 === 0 ? 'white' : '#f8fafc'
                                }}
                              >
                                <td style={{ padding: '12px', textAlign: 'center', fontWeight: 900, color: '#0f172a' }}>
                                  {p.peringkat ? `#${p.peringkat}` : '-'}
                                </td>
                                <td style={{ padding: '12px', fontFamily: 'monospace', fontWeight: 800, color: '#0284c7' }}>
                                  {p.nomor_peserta}
                                </td>
                                <td style={{ padding: '12px', fontWeight: 800, color: '#0f172a' }}>{p.nama}</td>
                                <td style={{ padding: '12px', color: '#475569' }}>{p.asal_sekolah}</td>

                                {/* Nilai per Juri */}
                                {juriInSelectedCabang.map(j => {
                                  const nj = p.nilai_per_juri?.[j.id];
                                  return (
                                    <td
                                      key={j.id}
                                      style={{
                                        padding: '10px 12px',
                                        textAlign: 'center',
                                        borderLeft: '1px solid #f1f5f9'
                                      }}
                                    >
                                      {nj ? (
                                        <div>
                                          <div style={{ fontSize: '1.08rem', fontWeight: 900, color: '#047857' }}>
                                            {nj.nilai}
                                          </div>
                                          {nj.aspek && Object.keys(nj.aspek).length > 0 && (
                                            <div
                                              style={{
                                                fontSize: '0.7rem',
                                                color: '#64748b',
                                                marginTop: 2,
                                                lineHeight: 1.3
                                              }}
                                            >
                                              {cfg.aspek
                                                .map(a =>
                                                  nj.aspek[a.id] !== undefined
                                                    ? `${a.nama.split(' ')[0]}: ${nj.aspek[a.id]}`
                                                    : null
                                                )
                                                .filter(Boolean)
                                                .join(' • ')}
                                            </div>
                                          )}
                                          {nj.catatan && (
                                            <div
                                              style={{
                                                fontSize: '0.7rem',
                                                color: '#0284c7',
                                                fontStyle: 'italic',
                                                marginTop: 2
                                              }}
                                            >
                                              &ldquo;{nj.catatan}&rdquo;
                                            </div>
                                          )}
                                          <button
                                            onClick={() => openAdminInputNilai(p, j)}
                                            style={{
                                              marginTop: 4,
                                              background: 'transparent',
                                              border: '1px solid #cbd5e1',
                                              color: '#475569',
                                              borderRadius: 6,
                                              padding: '2px 8px',
                                              fontSize: '0.7rem',
                                              fontWeight: 700,
                                              cursor: 'pointer'
                                            }}
                                          >
                                            <i className="fas fa-edit"></i> Edit
                                          </button>
                                        </div>
                                      ) : (
                                        <div>
                                          <span
                                            style={{
                                              display: 'inline-block',
                                              fontSize: '0.74rem',
                                              color: '#94a3b8',
                                              marginBottom: 4
                                            }}
                                          >
                                            Belum Dinilai
                                          </span>
                                          <div>
                                            <button
                                              onClick={() => openAdminInputNilai(p, j)}
                                              style={{
                                                background: '#eff6ff',
                                                border: '1px solid #bfdbfe',
                                                color: '#0284c7',
                                                borderRadius: 6,
                                                padding: '4px 10px',
                                                fontSize: '0.74rem',
                                                fontWeight: 800,
                                                cursor: 'pointer'
                                              }}
                                            >
                                              + Input Nilai
                                            </button>
                                          </div>
                                        </div>
                                      )}
                                    </td>
                                  );
                                })}

                                <td style={{ padding: '12px', textAlign: 'center', fontWeight: 800, color: '#334155' }}>
                                  {p.total_nilai > 0 ? p.total_nilai : '-'}
                                </td>
                                <td
                                  style={{
                                    padding: '12px',
                                    textAlign: 'center',
                                    fontWeight: 900,
                                    fontSize: '1.1rem',
                                    color: p.rata_rata > 0 ? '#047857' : '#94a3b8'
                                  }}
                                >
                                  {p.rata_rata > 0 ? p.rata_rata : '-'}
                                </td>
                                <td style={{ padding: '12px', textAlign: 'center' }}>
                                  {predikat ? (
                                    <span
                                      style={{
                                        background: predikat.bg,
                                        color: predikat.color,
                                        border: `1px solid ${predikat.border}`,
                                        padding: '4px 10px',
                                        borderRadius: 20,
                                        fontSize: '0.76rem',
                                        fontWeight: 800,
                                        display: 'inline-block'
                                      }}
                                    >
                                      {predikat.label}
                                    </span>
                                  ) : (
                                    <span style={{ color: '#94a3b8', fontSize: '0.78rem' }}>Peserta</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 2: MANAJEMEN AKUN JURI                                                */}
            {/* ========================================================================= */}
            {activeTab === 'akun' && (
              <div
                style={{
                  background: 'white',
                  borderRadius: '18px',
                  border: '1px solid #e2e8f0',
                  padding: '24px',
                  boxShadow: '0 4px 15px rgba(0,0,0,0.03)'
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '20px',
                    flexWrap: 'wrap',
                    gap: '12px'
                  }}
                >
                  <div>
                    <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>
                      Daftar Akun Dewan Juri Lomba Seni
                    </h2>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.88rem', color: '#64748b' }}>
                      Buat akun login untuk masing-masing juri dan bagikan aksesnya melalui WhatsApp.
                    </p>
                  </div>

                  <button
                    onClick={openCreateJuriModal}
                    style={{
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      color: 'white',
                      border: 'none',
                      padding: '11px 20px',
                      borderRadius: '11px',
                      fontWeight: 800,
                      fontSize: '0.9rem',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                    }}
                  >
                    <i className="fas fa-user-plus"></i> + Buat Akun Juri Baru
                  </button>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', color: '#334155', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>
                        <th style={{ padding: '14px 12px', width: 50 }}>No</th>
                        <th style={{ padding: '14px 12px' }}>Nama Lengkap Dewan Juri</th>
                        <th style={{ padding: '14px 12px' }}>Cabang Lomba Seni</th>
                        <th style={{ padding: '14px 12px' }}>Username Login</th>
                        <th style={{ padding: '14px 12px' }}>Password</th>
                        <th style={{ padding: '14px 12px' }}>Progres Penilaian</th>
                        <th style={{ padding: '14px 12px', textAlign: 'right' }}>Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {juriList.length === 0 ? (
                        <tr>
                          <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                            Belum ada akun juri yang dibuat. Klik tombol <b>&quot;+ Buat Akun Juri Baru&quot;</b> di kanan atas.
                          </td>
                        </tr>
                      ) : (
                        juriList.map((j, idx) => (
                          <tr key={j.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                            <td style={{ padding: '14px 12px', fontWeight: 700, color: '#64748b' }}>{idx + 1}</td>
                            <td style={{ padding: '14px 12px', fontWeight: 800, color: '#0f172a' }}>{j.nama_juri}</td>
                            <td style={{ padding: '14px 12px' }}>
                              <span
                                style={{
                                  background: '#e0f2fe',
                                  color: '#0369a1',
                                  padding: '4px 12px',
                                  borderRadius: 20,
                                  fontWeight: 800,
                                  fontSize: '0.8rem'
                                }}
                              >
                                {j.cabang_lomba}
                              </span>
                            </td>
                            <td style={{ padding: '14px 12px', fontFamily: 'monospace', fontWeight: 800, color: '#0f172a' }}>
                              {j.username}
                            </td>
                            <td style={{ padding: '14px 12px', fontFamily: 'monospace' }}>
                              <span style={{ fontWeight: 700, color: '#334155', marginRight: 8 }}>
                                {showPasswords[j.id] ? j.password : '••••••••'}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  setShowPasswords(prev => ({ ...prev, [j.id]: !prev[j.id] }))
                                }
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: '#64748b',
                                  cursor: 'pointer'
                                }}
                                title="Tampilkan / Sembunyikan Password"
                              >
                                <i className={`fas ${showPasswords[j.id] ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                              </button>
                            </td>
                            <td style={{ padding: '14px 12px' }}>
                              <span style={{ fontWeight: 800, color: '#059669' }}>
                                {j.sudah_dinilai} / {j.total_peserta} Peserta ({j.persentase}%)
                              </span>
                            </td>
                            <td style={{ padding: '14px 12px', textAlign: 'right' }}>
                              <div style={{ display: 'inline-flex', gap: 8 }}>
                                <button
                                  onClick={() => handleCopyCredentialsWA(j)}
                                  style={{
                                    background: '#f0fdf4',
                                    color: '#16a34a',
                                    border: '1px solid #bbf7d0',
                                    padding: '6px 12px',
                                    borderRadius: 8,
                                    fontWeight: 800,
                                    fontSize: '0.78rem',
                                    cursor: 'pointer'
                                  }}
                                  title="Salin Kredensial & Link untuk dikirim ke WhatsApp Juri"
                                >
                                  <i className="fab fa-whatsapp"></i> Salin WA
                                </button>

                                <button
                                  onClick={() => openEditJuriModal(j)}
                                  style={{
                                    background: '#eff6ff',
                                    color: '#0284c7',
                                    border: '1px solid #bfdbfe',
                                    padding: '6px 12px',
                                    borderRadius: 8,
                                    fontWeight: 800,
                                    fontSize: '0.78rem',
                                    cursor: 'pointer'
                                  }}
                                >
                                  <i className="fas fa-edit"></i> Edit
                                </button>

                                <button
                                  onClick={() => handleDeleteJuri(j)}
                                  style={{
                                    background: '#fef2f2',
                                    color: '#ef4444',
                                    border: '1px solid #fecaca',
                                    padding: '6px 12px',
                                    borderRadius: 8,
                                    fontWeight: 800,
                                    fontSize: '0.78rem',
                                    cursor: 'pointer'
                                  }}
                                >
                                  <i className="fas fa-trash"></i>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 3: PENGATURAN TABEL & ASPEK PENILAIAN TIAP CABANG LOMBA SENI          */}
            {/* ========================================================================= */}
            {activeTab === 'tabel' && (
              <div
                style={{
                  background: 'white',
                  borderRadius: '18px',
                  border: '1px solid #e2e8f0',
                  padding: '24px',
                  boxShadow: '0 4px 15px rgba(0,0,0,0.03)'
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '20px',
                    flexWrap: 'wrap',
                    gap: '12px'
                  }}
                >
                  <div>
                    <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>
                      Pengaturan Tabel &amp; Kriteria Penilaian Tiap Cabang Lomba Seni
                    </h2>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.88rem', color: '#64748b' }}>
                      Atur kolom aspek penilaian dan bobot nilai maksimal yang akan muncul di tabel Portal Juri untuk setiap cabang lomba.
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: 10 }}>
                    {CABANG_SENI_CANONICAL.map(cab => (
                      <button
                        key={cab}
                        onClick={() => setConfigCabangTab(cab)}
                        style={{
                          padding: '9px 18px',
                          borderRadius: '10px',
                          border: `2px solid ${configCabangTab === cab ? '#d97706' : '#cbd5e1'}`,
                          background: configCabangTab === cab ? '#fef3c7' : '#f8fafc',
                          color: configCabangTab === cab ? '#92400e' : '#334155',
                          fontWeight: 800,
                          fontSize: '0.88rem',
                          cursor: 'pointer'
                        }}
                      >
                        {cab}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Pengaturan Umum Cabang Ini */}
                <div
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '14px',
                    padding: '16px 20px',
                    marginBottom: '20px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '14px'
                  }}
                >
                  <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center' }}>
                    <div>
                      <label style={{ fontSize: '0.8rem', fontWeight: 800, color: '#475569', display: 'block', marginBottom: 4 }}>
                        Rumus Perhitungan Nilai Total Juri:
                      </label>
                      <select
                        value={currentEditingConfig.modeHitung}
                        onChange={e =>
                          setTabelConfigMap(prev => ({
                            ...prev,
                            [configCabangTab]: {
                              ...currentEditingConfig,
                              modeHitung: e.target.value as 'sum' | 'avg'
                            }
                          }))
                        }
                        style={{
                          padding: '8px 12px',
                          borderRadius: 8,
                          border: '1px solid #cbd5e1',
                          fontWeight: 700,
                          color: '#0f172a'
                        }}
                      >
                        <option value="sum">Jumlahkan Seluruh Kolom Aspek (Total = Aspek 1 + Aspek 2 + ...)</option>
                        <option value="avg">Rata-Rata dari Seluruh Kolom Aspek</option>
                      </select>
                    </div>

                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 700, color: '#334155', marginTop: 18 }}>
                      <input
                        type="checkbox"
                        checked={currentEditingConfig.tampilkanCatatan}
                        onChange={e =>
                          setTabelConfigMap(prev => ({
                            ...prev,
                            [configCabangTab]: {
                              ...currentEditingConfig,
                              tampilkanCatatan: e.target.checked
                            }
                          }))
                        }
                        style={{ width: 18, height: 18 }}
                      />
                      <span>Tampilkan Kolom &quot;Catatan / Komentar Juri&quot;</span>
                    </label>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddAspekColumn}
                    style={{
                      background: '#0284c7',
                      color: 'white',
                      border: 'none',
                      padding: '9px 16px',
                      borderRadius: '10px',
                      fontWeight: 800,
                      fontSize: '0.85rem',
                      cursor: 'pointer'
                    }}
                  >
                    <i className="fas fa-plus-circle"></i> + Tambah Kolom Aspek Penilaian
                  </button>
                </div>

                {/* Daftar Kolom Aspek */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 22 }}>
                  {currentEditingConfig.aspek.map((aspek, idx) => (
                    <div
                      key={aspek.id || idx}
                      style={{
                        background: 'white',
                        border: '1.5px solid #cbd5e1',
                        borderRadius: '12px',
                        padding: '14px 18px',
                        display: 'grid',
                        gridTemplateColumns: '40px 1.6fr 140px 2fr auto',
                        gap: '12px',
                        alignItems: 'center'
                      }}
                    >
                      <div
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: 8,
                          background: '#fef3c7',
                          color: '#b45309',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 900
                        }}
                      >
                        #{idx + 1}
                      </div>

                      <div>
                        <label style={{ fontSize: '0.74rem', fontWeight: 800, color: '#475569' }}>
                          Nama Kolom / Aspek Kriteria
                        </label>
                        <input
                          type="text"
                          value={aspek.nama}
                          onChange={e => handleUpdateAspekField(idx, 'nama', e.target.value)}
                          placeholder="Contoh: Materi Suara / Vokal"
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            borderRadius: 8,
                            border: '1px solid #cbd5e1',
                            fontWeight: 800,
                            color: '#0f172a',
                            marginTop: 3
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: '0.74rem', fontWeight: 800, color: '#0284c7' }}>
                          Skor Maksimal
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={1000}
                          value={aspek.bobotMaks}
                          onChange={e => handleUpdateAspekField(idx, 'bobotMaks', Number(e.target.value))}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            borderRadius: 8,
                            border: '1px solid #0284c7',
                            fontWeight: 900,
                            color: '#0284c7',
                            marginTop: 3
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#64748b' }}>
                          Keterangan Indikator (Opsional)
                        </label>
                        <input
                          type="text"
                          value={aspek.keterangan || ''}
                          onChange={e => handleUpdateAspekField(idx, 'keterangan', e.target.value)}
                          placeholder="Penjelasan singkat indikator penilaian..."
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            borderRadius: 8,
                            border: '1px solid #cbd5e1',
                            color: '#334155',
                            marginTop: 3
                          }}
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveAspekColumn(idx)}
                        style={{
                          marginTop: 18,
                          background: '#fef2f2',
                          color: '#ef4444',
                          border: '1px solid #fecaca',
                          padding: '8px 12px',
                          borderRadius: 8,
                          cursor: 'pointer'
                        }}
                        title="Hapus Kolom Ini"
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    </div>
                  ))}
                </div>

                {/* Pratinjau Header Tabel Juri */}
                <div style={{ marginBottom: 22 }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#475569', marginBottom: 8 }}>
                    👁️ Pratinjau Tampilan Kolom Tabel di Halaman Login Juri ({configCabangTab}):
                  </div>
                  <div style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid #cbd5e1' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                      <thead>
                        <tr style={{ background: '#0f172a', color: 'white' }}>
                          <th style={{ padding: 10 }}>No</th>
                          <th style={{ padding: 10 }}>No. Peserta</th>
                          <th style={{ padding: 10 }}>Nama Peserta / Regu</th>
                          <th style={{ padding: 10 }}>Asal Sekolah</th>
                          {currentEditingConfig.aspek.map(a => (
                            <th key={a.id} style={{ padding: 10, background: '#1e293b', textAlign: 'center', color: '#38bdf8' }}>
                              {a.nama} (Maks {a.bobotMaks})
                            </th>
                          ))}
                          <th style={{ padding: 10, background: '#065f46', textAlign: 'center', color: '#fde047' }}>
                            TOTAL (
                            {currentEditingConfig.modeHitung === 'sum'
                              ? `Maks ${currentEditingConfig.aspek.reduce((s, x) => s + (Number(x.bobotMaks) || 0), 0)}`
                              : 'Rata-Rata'}
                            )
                          </th>
                          {currentEditingConfig.tampilkanCatatan && <th style={{ padding: 10 }}>Catatan Juri</th>}
                        </tr>
                      </thead>
                    </table>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={handleResetDefaultConfig}
                    style={{
                      background: '#f1f5f9',
                      color: '#475569',
                      border: '1px solid #cbd5e1',
                      padding: '10px 16px',
                      borderRadius: '10px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    Kembalikan ke Default {configCabangTab}
                  </button>

                  <button
                    type="button"
                    disabled={savingConfig}
                    onClick={handleSaveTabelConfig}
                    style={{
                      background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
                      color: 'white',
                      border: 'none',
                      padding: '12px 24px',
                      borderRadius: '11px',
                      fontWeight: 900,
                      fontSize: '0.95rem',
                      cursor: 'pointer',
                      boxShadow: '0 4px 15px rgba(217, 119, 6, 0.35)'
                    }}
                  >
                    <i className="fas fa-save" style={{ marginRight: 8 }}></i>
                    {savingConfig ? 'Menyimpan...' : `Simpan Pengaturan Tabel ${configCabangTab}`}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ==================== MODAL BUAT / EDIT AKUN JURI ==================== */}
      {showJuriModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20
          }}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '20px',
              width: '100%',
              maxWidth: '480px',
              padding: '28px',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.35)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>
                {editingJuri ? 'Edit Akun Dewan Juri' : 'Buat Akun Dewan Juri Baru'}
              </h3>
              <button
                onClick={() => setShowJuriModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', color: '#64748b', cursor: 'pointer' }}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <form onSubmit={handleSaveJuriAccount} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 800, color: '#334155', display: 'block', marginBottom: 5 }}>
                  Nama Lengkap &amp; Gelar Juri *
                </label>
                <input
                  type="text"
                  required
                  value={formNamaJuri}
                  onChange={e => setFormNamaJuri(e.target.value)}
                  placeholder="Contoh: Ust. H. Ahmad Fauzi, S.Pd."
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid #cbd5e1', fontSize: '0.92rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 800, color: '#334155', display: 'block', marginBottom: 5 }}>
                  Cabang Lomba Seni yang Dinilai *
                </label>
                <select
                  value={formCabangJuri}
                  onChange={e => setFormCabangJuri(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid #cbd5e1', fontSize: '0.92rem', fontWeight: 700 }}
                >
                  {CABANG_SENI_CANONICAL.map(cab => (
                    <option key={cab} value={cab}>
                      {cab}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 800, color: '#334155', display: 'block', marginBottom: 5 }}>
                  Username Login *
                </label>
                <input
                  type="text"
                  required
                  value={formUsername}
                  onChange={e => setFormUsername(e.target.value)}
                  placeholder="Contoh: juri_banjari1"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid #cbd5e1', fontSize: '0.92rem', fontFamily: 'monospace' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 800, color: '#334155', display: 'block', marginBottom: 5 }}>
                  Password Login *
                </label>
                <input
                  type="text"
                  required
                  value={formPassword}
                  onChange={e => setFormPassword(e.target.value)}
                  placeholder="Masukkan password..."
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid #cbd5e1', fontSize: '0.92rem', fontFamily: 'monospace' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => setShowJuriModal(false)}
                  style={{
                    background: '#f1f5f9',
                    color: '#475569',
                    border: 'none',
                    padding: '10px 18px',
                    borderRadius: 10,
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingJuri}
                  style={{
                    background: '#10b981',
                    color: 'white',
                    border: 'none',
                    padding: '10px 22px',
                    borderRadius: 10,
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  {savingJuri ? 'Menyimpan...' : 'Simpan Akun Juri'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL INPUT / EDIT NILAI PESERTA OLEH ADMIN ==================== */}
      {inputModalPeserta && inputModalJuri && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20
          }}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '20px',
              width: '100%',
              maxWidth: '520px',
              padding: '26px',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.35)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: '#0f172a' }}>
                Input / Edit Nilai Peserta
              </h3>
              <button
                onClick={() => {
                  setInputModalPeserta(null);
                  setInputModalJuri(null);
                }}
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', color: '#64748b', cursor: 'pointer' }}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 12,
                padding: '12px 16px',
                marginBottom: 16,
                fontSize: '0.86rem'
              }}
            >
              <div>
                Peserta: <b>{inputModalPeserta.nama}</b> ({inputModalPeserta.nomor_peserta})
              </div>
              <div style={{ color: '#64748b', marginTop: 2 }}>
                Sekolah: {inputModalPeserta.asal_sekolah}
              </div>
              <div style={{ color: '#0284c7', fontWeight: 800, marginTop: 4 }}>
                Penilai: {inputModalJuri.nama_juri} ({inputModalPeserta.cabang_lomba})
              </div>
            </div>

            <form onSubmit={handleSaveNilaiFromAdmin} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {(
                tabelConfigMap[inputModalPeserta.cabang_lomba]?.aspek ||
                DEFAULT_TABEL_PENILAIAN_SENI[inputModalPeserta.cabang_lomba]?.aspek ||
                []
              ).map(aspek => (
                <div key={aspek.id}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 800, color: '#334155', display: 'flex', justifyContent: 'space-between' }}>
                    <span>{aspek.nama}</span>
                    <span style={{ color: '#0284c7' }}>Maks: {aspek.bobotMaks} Poin</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={aspek.bobotMaks}
                    step="0.5"
                    required
                    value={inputAspekValues[aspek.id] ?? ''}
                    onChange={e =>
                      setInputAspekValues(prev => ({ ...prev, [aspek.id]: e.target.value }))
                    }
                    placeholder={`Masukkan nilai (0 - ${aspek.bobotMaks})`}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 10,
                      border: '1.5px solid #cbd5e1',
                      fontSize: '1rem',
                      fontWeight: 800,
                      marginTop: 4
                    }}
                  />
                </div>
              ))}

              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569' }}>
                  Catatan / Komentar Juri (Opsional)
                </label>
                <input
                  type="text"
                  value={inputCatatan}
                  onChange={e => setInputCatatan(e.target.value)}
                  placeholder="Catatan penampilan..."
                  style={{
                    width: '100%',
                    padding: '9px 14px',
                    borderRadius: 10,
                    border: '1px solid #cbd5e1',
                    marginTop: 4
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => {
                    setInputModalPeserta(null);
                    setInputModalJuri(null);
                  }}
                  style={{
                    background: '#f1f5f9',
                    color: '#475569',
                    border: 'none',
                    padding: '10px 16px',
                    borderRadius: 10,
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingNilaiAdmin}
                  style={{
                    background: '#0284c7',
                    color: 'white',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: 10,
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  {savingNilaiAdmin ? 'Menyimpan...' : 'Simpan Nilai'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
