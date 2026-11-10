'use client';
import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import styles from './Guru.module.css';

export interface GuruData {
  id?: number;
  dbId?: number;
  urutan?: number;
  nama: string;
  foto?: string;
  rawFoto?: string;
  status: string;
  statusGuru?: string;
  nip: string;
  pegId: string;
  nuptk?: string;
  rfidUid?: string;
  domisili?: string;
  passEmisHijau: string;
  passEmisDev: string;
  jenisKelamin: string;
  jabatan: string;
  tempatLahir: string;
  tanggalLahir: string;
  nik: string;
  noHp: string;
  alamat: string;
  tanggalSk: string;
  email: string;
  pendidikan: string;
  namaIbuKandung?: string;
  isSertifikasi?: boolean;
  rawMetadata?: Record<string, any>;
}

interface EditGuruModalProps {
  guru: GuruData | null; // null jika Tambah Guru Baru
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditGuruModal({ guru, isOpen, onClose, onSuccess }: EditGuruModalProps) {
  const isNew = !guru || !guru.id;

  const [activeTab, setActiveTab] = useState<'pokok' | 'kepegawaian' | 'akun' | 'metadata'>('pokok');
  const [isSaving, setIsSaving] = useState(false);

  // Form States
  const [nama, setNama] = useState('');
  const [nip, setNip] = useState('');
  const [nik, setNik] = useState('');
  const [jenisKelamin, setJenisKelamin] = useState('Laki-Laki');
  const [tempatLahir, setTempatLahir] = useState('');
  const [tanggalLahir, setTanggalLahir] = useState('');
  const [namaIbuKandung, setNamaIbuKandung] = useState('');

  const [status, setStatus] = useState('Aktif');
  const [statusGuru, setStatusGuru] = useState('GTY');
  const [jabatan, setJabatan] = useState('Guru');
  const [pendidikan, setPendidikan] = useState('S1');
  const [tanggalSk, setTanggalSk] = useState('');

  const [pegId, setPegId] = useState('');
  const [nuptk, setNuptk] = useState('');
  const [rfidUid, setRfidUid] = useState('');
  const [passEmisHijau, setPassEmisHijau] = useState('');
  const [passEmisDev, setPassEmisDev] = useState('');

  const [noHp, setNoHp] = useState('');
  const [email, setEmail] = useState('');
  const [domisili, setDomisili] = useState('');
  const [alamat, setAlamat] = useState('');

  const [fotoUrl, setFotoUrl] = useState('');

  // Raw metadata for Tab 4 (custom columns)
  const [customMetadata, setCustomMetadata] = useState<Record<string, string>>({});
  const [newMetaKey, setNewMetaKey] = useState('');
  const [newMetaVal, setNewMetaVal] = useState('');

  // Helper konversi Google drive URL ke thumbnail image
  const getPreviewUrl = (url: string) => {
    if (!url) return '';
    const trimmed = url.trim();
    const match = trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/) || trimmed.match(/id=([a-zA-Z0-9_-]+)/);
    if (trimmed.includes('drive.google.com') && match && match[1]) {
      return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w300-h300`;
    }
    return trimmed;
  };

  useEffect(() => {
    if (!isOpen) return;

    if (guru) {
      setNama(guru.nama || '');
      setNip(guru.nip || '');
      setNik(guru.nik || '');
      setJenisKelamin(guru.jenisKelamin || 'Laki-Laki');
      setTempatLahir(guru.tempatLahir || '');
      setTanggalLahir(guru.tanggalLahir || '');
      setNamaIbuKandung(guru.namaIbuKandung || guru.rawMetadata?.['Nama Ibu Kandung'] || guru.rawMetadata?.['NAMA IBU KANDUNG'] || guru.rawMetadata?.['Nama Ibu'] || '');

      setStatus(guru.status || 'Aktif');
      setStatusGuru(guru.statusGuru || guru.rawMetadata?.['Status Guru'] || 'GTY');
      setJabatan(guru.jabatan || 'Guru');
      setPendidikan(guru.pendidikan || 'S1');
      setTanggalSk(guru.tanggalSk || guru.rawMetadata?.['Tanggal SK Awal'] || '');

      setPegId(guru.pegId || guru.rawMetadata?.['PEG ID'] || '');
      setNuptk(guru.nuptk || guru.rawMetadata?.['NUPTK / PEG ID'] || guru.rawMetadata?.['NUPTK'] || '');
      setRfidUid(guru.rfidUid || guru.rawMetadata?.['RFID_UID'] || '');
      setPassEmisHijau(guru.passEmisHijau || '');
      setPassEmisDev(guru.passEmisDev || '');

      setNoHp(guru.noHp || '');
      setEmail(guru.email || '');
      setDomisili(guru.domisili || guru.rawMetadata?.['Domisili'] || '');
      setAlamat(guru.alamat || '');

      setFotoUrl(guru.rawFoto || guru.rawMetadata?.['Foto'] || guru.rawMetadata?.['foto'] || guru.foto || '');

      // Clone metadata
      const raw = guru.rawMetadata ? { ...guru.rawMetadata } : {};
      const strMap: Record<string, string> = {};
      Object.keys(raw).forEach(k => {
        if (typeof raw[k] === 'object' && raw[k] !== null) {
          strMap[k] = JSON.stringify(raw[k]);
        } else {
          strMap[k] = String(raw[k] ?? '');
        }
      });
      setCustomMetadata(strMap);
    } else {
      // Default empty form
      setNama('');
      setNip('');
      setNik('');
      setJenisKelamin('Laki-Laki');
      setTempatLahir('');
      setTanggalLahir('');
      setNamaIbuKandung('');

      setStatus('Aktif');
      setStatusGuru('GTY');
      setJabatan('Guru');
      setPendidikan('S1');
      setTanggalSk('');

      setPegId('');
      setNuptk('');
      setRfidUid('');
      setPassEmisHijau('');
      setPassEmisDev('');

      setNoHp('');
      setEmail('');
      setDomisili('Malang');
      setAlamat('');

      setFotoUrl('');
      setCustomMetadata({});
    }

    setActiveTab('pokok');
  }, [guru, isOpen]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nama.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Nama Wajib Diisi',
        text: 'Silakan isi nama lengkap guru atau staf terlebih dahulu.'
      });
      return;
    }

    setIsSaving(true);
    try {
      // Susun metadata lengkap
      const compiledMetadata: Record<string, any> = {
        ...customMetadata,
        'Nama': nama.trim(),
        'Nomor Induk Pegawai': nip.trim(),
        'NIK': nik.trim(),
        'Jenis Kelamin': jenisKelamin,
        'Tempat Lahir': tempatLahir.trim(),
        'Tanggal Lahir': tanggalLahir.trim(),
        'Nama Ibu Kandung': namaIbuKandung.trim(),
        'Status': status,
        'Status Guru': statusGuru,
        'Jabatan': jabatan.trim(),
        'Pendidikan': pendidikan,
        'Tanggal SK Awal': tanggalSk.trim(),
        'PEG ID': pegId.trim(),
        'NUPTK / PEG ID': nuptk.trim(),
        'RFID_UID': rfidUid.trim(),
        'Pass EMIS Hijau': passEmisHijau.trim(),
        'Pass EMIS DEV': passEmisDev.trim(),
        'No WA': noHp.trim(),
        'Email': email.trim(),
        'Domisili': domisili.trim(),
        'Alamat': alamat.trim()
      };

      if (fotoUrl.trim()) {
        compiledMetadata['Foto'] = fotoUrl.trim();
      }

      const payload = {
        id: guru?.id,
        nama: nama.trim(),
        nip: nip.trim(),
        metadata: compiledMetadata
      };

      const res = await fetch('/api/guru', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await res.json();
      if (result.success) {
        await Swal.fire({
          icon: 'success',
          title: isNew ? 'Data Berhasil Ditambahkan!' : 'Data Berhasil Diperbarui!',
          text: `Data untuk ${nama.trim()} berhasil disimpan ke database.`,
          timer: 2000,
          showConfirmButton: false
        });
        onSuccess();
        onClose();
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Gagal Menyimpan',
          text: result.error || 'Terjadi kesalahan pada server'
        });
      }
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Error Koneksi',
        text: 'Gagal menghubungi server: ' + (err.message || err)
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddCustomMeta = () => {
    if (!newMetaKey.trim()) return;
    setCustomMetadata(prev => ({
      ...prev,
      [newMetaKey.trim()]: newMetaVal.trim()
    }));
    setNewMetaKey('');
    setNewMetaVal('');
  };

  const handleDeleteCustomMeta = (key: string) => {
    setCustomMetadata(prev => {
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });
  };

  const previewSrc = getPreviewUrl(fotoUrl);

  return (
    <div className={styles.modalOverlay} onClick={() => !isSaving && onClose()} style={{ zIndex: 1200 }}>
      <div 
        className={styles.modalCard} 
        onClick={e => e.stopPropagation()} 
        style={{ maxWidth: '850px', width: '92%', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}
      >
        {/* Header */}
        <div className={styles.modalHeader} style={{ background: 'linear-gradient(135deg, #1e293b, #0f172a)' }}>
          <div>
            <h2 style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <i className={isNew ? 'fas fa-user-plus' : 'fas fa-user-edit'} style={{ color: '#f59e0b' }}></i> 
              {isNew ? 'Tambah Data Guru & Staf' : `Edit Data: ${guru?.nama || ''}`}
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
              Lengkapi informasi profil, kepegawaian, nomor identitas, dan kontak guru/staf secara akurat.
            </p>
          </div>
          <button 
            type="button" 
            className={styles.closeBtn} 
            onClick={() => !isSaving && onClose()} 
            disabled={isSaving}
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* Tab Navigation */}
        <div style={{ 
          display: 'flex', 
          borderBottom: '1px solid #e2e8f0', 
          background: '#f8fafc',
          padding: '0 16px',
          overflowX: 'auto',
          gap: '8px'
        }}>
          <button
            type="button"
            onClick={() => setActiveTab('pokok')}
            style={{
              padding: '12px 16px',
              border: 'none',
              background: 'transparent',
              borderBottom: activeTab === 'pokok' ? '3px solid #0284c7' : '3px solid transparent',
              color: activeTab === 'pokok' ? '#0284c7' : '#64748b',
              fontWeight: activeTab === 'pokok' ? 700 : 500,
              fontSize: '0.88rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              whiteSpace: 'nowrap'
            }}
          >
            <i className="fas fa-user"></i> Identitas & Kontak
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('kepegawaian')}
            style={{
              padding: '12px 16px',
              border: 'none',
              background: 'transparent',
              borderBottom: activeTab === 'kepegawaian' ? '3px solid #0284c7' : '3px solid transparent',
              color: activeTab === 'kepegawaian' ? '#0284c7' : '#64748b',
              fontWeight: activeTab === 'kepegawaian' ? 700 : 500,
              fontSize: '0.88rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              whiteSpace: 'nowrap'
            }}
          >
            <i className="fas fa-briefcase"></i> Kepegawaian & Tugas
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('akun')}
            style={{
              padding: '12px 16px',
              border: 'none',
              background: 'transparent',
              borderBottom: activeTab === 'akun' ? '3px solid #0284c7' : '3px solid transparent',
              color: activeTab === 'akun' ? '#0284c7' : '#64748b',
              fontWeight: activeTab === 'akun' ? 700 : 500,
              fontSize: '0.88rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              whiteSpace: 'nowrap'
            }}
          >
            <i className="fas fa-id-card"></i> Akun, EMIS & RFID
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('metadata')}
            style={{
              padding: '12px 16px',
              border: 'none',
              background: 'transparent',
              borderBottom: activeTab === 'metadata' ? '3px solid #0284c7' : '3px solid transparent',
              color: activeTab === 'metadata' ? '#0284c7' : '#64748b',
              fontWeight: activeTab === 'metadata' ? 700 : 500,
              fontSize: '0.88rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              whiteSpace: 'nowrap'
            }}
          >
            <i className="fas fa-database"></i> Kolom Tambahan ({Object.keys(customMetadata).length})
          </button>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
            
            {/* TAB 1: IDENTITAS & KONTAK */}
            {activeTab === 'pokok' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Photo Preview & Link Box */}
                <div style={{ 
                  display: 'flex', 
                  gap: '20px', 
                  alignItems: 'flex-start', 
                  padding: '16px', 
                  background: '#f8fafc', 
                  borderRadius: '12px', 
                  border: '1px solid #e2e8f0' 
                }}>
                  <div style={{
                    width: '90px',
                    height: '110px',
                    borderRadius: '8px',
                    border: '2px solid #cbd5e1',
                    background: '#e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    flexShrink: 0
                  }}>
                    {previewSrc ? (
                      <img 
                        src={previewSrc} 
                        alt="Preview" 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <i className="fas fa-user" style={{ fontSize: '2.5rem', color: '#94a3b8' }}></i>
                    )}
                  </div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>
                      <i className="fas fa-image" style={{ marginRight: '6px', color: '#0284c7' }}></i>
                      Link Foto Profil (URL Langsung atau Google Drive)
                    </label>
                    <input
                      type="text"
                      value={fotoUrl}
                      onChange={(e) => setFotoUrl(e.target.value)}
                      placeholder="https://drive.google.com/file/d/... atau https://..."
                      style={{
                        padding: '9px 12px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.85rem',
                        outline: 'none',
                        width: '100%'
                      }}
                    />
                    <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                      Bisa memasukkan tautan Google Drive (View/Share) atau link direct URL foto guru.
                    </span>
                  </div>
                </div>

                {/* Nama & NIP */}
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
                  <div className={styles.infoGroup}>
                    <label className={styles.infoLabel}>Nama Lengkap &amp; Gelar <span style={{ color: '#ef4444' }}>*</span></label>
                    <input
                      type="text"
                      required
                      value={nama}
                      onChange={(e) => setNama(e.target.value)}
                      placeholder="Contoh: Drs. H. Ahmad Fauzi, M.Pd."
                      style={{
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.9rem',
                        fontWeight: 600,
                        color: '#0f172a'
                      }}
                    />
                  </div>
                  <div className={styles.infoGroup}>
                    <label className={styles.infoLabel}>Nomor Induk Pegawai (NIP)</label>
                    <input
                      type="text"
                      value={nip}
                      onChange={(e) => setNip(e.target.value)}
                      placeholder="12123507..."
                      style={{
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.9rem',
                        color: '#0f172a'
                      }}
                    />
                  </div>
                </div>

                {/* NIK & Jenis Kelamin */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className={styles.infoGroup}>
                    <label className={styles.infoLabel}>NIK (Nomor Induk Kependudukan)</label>
                    <input
                      type="text"
                      value={nik}
                      onChange={(e) => setNik(e.target.value)}
                      placeholder="3507... (16 Digit)"
                      maxLength={16}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.9rem',
                        color: '#0f172a'
                      }}
                    />
                  </div>
                  <div className={styles.infoGroup}>
                    <label className={styles.infoLabel}>Jenis Kelamin</label>
                    <select
                      value={jenisKelamin}
                      onChange={(e) => setJenisKelamin(e.target.value)}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.9rem',
                        background: 'white',
                        color: '#0f172a'
                      }}
                    >
                      <option value="Laki-Laki">Laki-Laki</option>
                      <option value="Perempuan">Perempuan</option>
                    </select>
                  </div>
                </div>

                {/* Tempat & Tanggal Lahir */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className={styles.infoGroup}>
                    <label className={styles.infoLabel}>Tempat Lahir</label>
                    <input
                      type="text"
                      value={tempatLahir}
                      onChange={(e) => setTempatLahir(e.target.value)}
                      placeholder="Contoh: Malang"
                      style={{
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.9rem',
                        color: '#0f172a'
                      }}
                    />
                  </div>
                  <div className={styles.infoGroup}>
                    <label className={styles.infoLabel}>Tanggal Lahir</label>
                    <input
                      type="text"
                      value={tanggalLahir}
                      onChange={(e) => setTanggalLahir(e.target.value)}
                      placeholder="dd/mm/yyyy (misal: 15/05/1975)"
                      style={{
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.9rem',
                        color: '#0f172a'
                      }}
                    />
                  </div>
                </div>

                {/* Nama Ibu Kandung */}
                <div className={styles.infoGroup}>
                  <label className={styles.infoLabel}>
                    <i className="fas fa-female" style={{ color: '#ec4899', marginRight: '5px' }}></i>
                    Nama Ibu Kandung
                  </label>
                  <input
                    type="text"
                    value={namaIbuKandung}
                    onChange={(e) => setNamaIbuKandung(e.target.value)}
                    placeholder="Contoh: Hj. Siti Aminah (sesuai dokumen kependudukan)"
                    style={{
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.9rem',
                      color: '#0f172a'
                    }}
                  />
                  <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                    Diperlukan untuk kelengkapan dan sinkronisasi data GTK di EMIS / Simpatika Kemenag.
                  </span>
                </div>

                {/* No WA & Email */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className={styles.infoGroup}>
                    <label className={styles.infoLabel}>
                      <i className="fab fa-whatsapp" style={{ color: '#22c55e', marginRight: '4px' }}></i> No. WhatsApp / HP
                    </label>
                    <input
                      type="text"
                      value={noHp}
                      onChange={(e) => setNoHp(e.target.value)}
                      placeholder="08xxxxxxxxxx"
                      style={{
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.9rem',
                        color: '#0f172a'
                      }}
                    />
                  </div>
                  <div className={styles.infoGroup}>
                    <label className={styles.infoLabel}>Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="guru@mtsalmaarif01-sgs.sch.id"
                      style={{
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.9rem',
                        color: '#0f172a'
                      }}
                    />
                  </div>
                </div>

                {/* Domisili & Alamat */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px' }}>
                  <div className={styles.infoGroup}>
                    <label className={styles.infoLabel}>Kota / Domisili</label>
                    <input
                      type="text"
                      value={domisili}
                      onChange={(e) => setDomisili(e.target.value)}
                      placeholder="Contoh: Malang"
                      style={{
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.9rem',
                        color: '#0f172a'
                      }}
                    />
                  </div>
                  <div className={styles.infoGroup}>
                    <label className={styles.infoLabel}>Alamat Lengkap</label>
                    <textarea
                      rows={2}
                      value={alamat}
                      onChange={(e) => setAlamat(e.target.value)}
                      placeholder="Jl. Kertanegara No. ..., Desa ..., Kec ..."
                      style={{
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.85rem',
                        fontFamily: 'inherit',
                        color: '#0f172a',
                        resize: 'vertical'
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: KEPEGAWAIAN & TUGAS */}
            {activeTab === 'kepegawaian' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className={styles.infoGroup}>
                    <label className={styles.infoLabel}>Status Kepegawaian</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.9rem',
                        background: 'white',
                        color: '#0f172a'
                      }}
                    >
                      <option value="Aktif">Aktif</option>
                      <option value="Nonaktif">Nonaktif</option>
                      <option value="Cuti">Cuti</option>
                      <option value="Mutasi Keluar">Mutasi Keluar</option>
                      <option value="Pensiun">Pensiun</option>
                    </select>
                  </div>

                  <div className={styles.infoGroup}>
                    <label className={styles.infoLabel}>Status Guru / GTK</label>
                    <input
                      type="text"
                      list="status-guru-options"
                      value={statusGuru}
                      onChange={(e) => setStatusGuru(e.target.value)}
                      placeholder="GTY / GTT / PNS / PPPK / ..."
                      style={{
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.9rem',
                        color: '#0f172a'
                      }}
                    />
                    <datalist id="status-guru-options">
                      <option value="GTY" />
                      <option value="GTT" />
                      <option value="PNS" />
                      <option value="PPPK" />
                      <option value="Honor Madrasah" />
                      <option value="Tendik Tetap" />
                      <option value="Tendik Tidak Tetap" />
                    </datalist>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className={styles.infoGroup}>
                    <label className={styles.infoLabel}>Jabatan / Tugas Utama</label>
                    <input
                      type="text"
                      list="jabatan-options"
                      value={jabatan}
                      onChange={(e) => setJabatan(e.target.value)}
                      placeholder="Contoh: Guru / Waka / Kepala Madrasah / TU"
                      style={{
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.9rem',
                        color: '#0f172a'
                      }}
                    />
                    <datalist id="jabatan-options">
                      <option value="Guru" />
                      <option value="Kepala Madrasah" />
                      <option value="Waka Kurikulum" />
                      <option value="Waka Kesiswaan" />
                      <option value="Waka Sarpras" />
                      <option value="Waka Humas" />
                      <option value="Kepala Tata Usaha" />
                      <option value="Staf Tata Usaha" />
                      <option value="Kepala Perpustakaan" />
                      <option value="Staf Perpustakaan" />
                      <option value="Laboran" />
                      <option value="Satpam" />
                      <option value="Tenaga Kebersihan" />
                    </datalist>
                  </div>

                  <div className={styles.infoGroup}>
                    <label className={styles.infoLabel}>Pendidikan Terakhir</label>
                    <select
                      value={pendidikan}
                      onChange={(e) => setPendidikan(e.target.value)}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.9rem',
                        background: 'white',
                        color: '#0f172a'
                      }}
                    >
                      <option value="S3">S3 (Doktor)</option>
                      <option value="S2">S2 (Magister)</option>
                      <option value="S1">S1 (Sarjana)</option>
                      <option value="D4">D4 (Diploma 4)</option>
                      <option value="D3">D3 (Diploma 3)</option>
                      <option value="D2">D2 (Diploma 2)</option>
                      <option value="D1">D1 (Diploma 1)</option>
                      <option value="SMA / SMK">SMA / SMK / MA</option>
                      <option value="SMP">SMP / MTs</option>
                    </select>
                  </div>
                </div>

                <div className={styles.infoGroup}>
                  <label className={styles.infoLabel}>Tanggal SK Awal / TMT</label>
                  <input
                    type="text"
                    value={tanggalSk}
                    onChange={(e) => setTanggalSk(e.target.value)}
                    placeholder="Contoh: 01/07/2012"
                    style={{
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.9rem',
                      color: '#0f172a'
                    }}
                  />
                  <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
                    Tanggal mulai bertugas di madrasah berdasarkan Surat Keputusan (SK).
                  </span>
                </div>
              </div>
            )}

            {/* TAB 3: AKUN, EMIS & RFID */}
            {activeTab === 'akun' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className={styles.infoGroup}>
                    <label className={styles.infoLabel}>PEG ID (Simpatika)</label>
                    <input
                      type="text"
                      value={pegId}
                      onChange={(e) => setPegId(e.target.value)}
                      placeholder="91000049103526"
                      style={{
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.9rem',
                        color: '#0f172a'
                      }}
                    />
                  </div>
                  <div className={styles.infoGroup}>
                    <label className={styles.infoLabel}>NUPTK / PEG ID</label>
                    <input
                      type="text"
                      value={nuptk}
                      onChange={(e) => setNuptk(e.target.value)}
                      placeholder="8847727629200012"
                      style={{
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.9rem',
                        color: '#0f172a'
                      }}
                    />
                  </div>
                </div>

                <div className={styles.infoGroup}>
                  <label className={styles.infoLabel}>
                    <i className="fas fa-id-badge" style={{ color: '#0284c7', marginRight: '4px' }}></i> 
                    RFID UID (Kartu Akses Presensi Gate)
                  </label>
                  <input
                    type="text"
                    value={rfidUid}
                    onChange={(e) => setRfidUid(e.target.value)}
                    placeholder="Contoh: 1A2B3C4D / 12345678"
                    style={{
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.9rem',
                      color: '#0f172a',
                      fontFamily: 'monospace'
                    }}
                  />
                  <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
                    UID kartu RFID yang digunakan guru saat tap di mesin presensi gerbang.
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className={styles.infoGroup}>
                    <label className={styles.infoLabel}>Pass EMIS Hijau</label>
                    <input
                      type="text"
                      value={passEmisHijau}
                      onChange={(e) => setPassEmisHijau(e.target.value)}
                      placeholder="Password EMIS Hijau"
                      style={{
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.9rem',
                        color: '#0f172a'
                      }}
                    />
                  </div>
                  <div className={styles.infoGroup}>
                    <label className={styles.infoLabel}>Pass EMIS DEV</label>
                    <input
                      type="text"
                      value={passEmisDev}
                      onChange={(e) => setPassEmisDev(e.target.value)}
                      placeholder="Password EMIS DEV / Champion"
                      style={{
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.9rem',
                        color: '#0f172a'
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: METADATA MENTAH / KOLOM TAMBAHAN */}
            {activeTab === 'metadata' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ 
                  padding: '12px 16px', 
                  background: '#f1f5f9', 
                  borderRadius: '8px', 
                  fontSize: '0.82rem', 
                  color: '#475569',
                  borderLeft: '4px solid #0284c7' 
                }}>
                  Bagian ini menampilkan seluruh key metadata dari database. Anda dapat mengubah nilai kolom atau menambahkan kolom data khusus baru.
                </div>

                {/* Form Tambah Key Baru */}
                <div style={{ 
                  display: 'flex', 
                  gap: '8px', 
                  padding: '12px', 
                  background: '#f8fafc', 
                  borderRadius: '8px',
                  border: '1px dashed #cbd5e1',
                  alignItems: 'center' 
                }}>
                  <input
                    type="text"
                    value={newMetaKey}
                    onChange={(e) => setNewMetaKey(e.target.value)}
                    placeholder="Nama Kolom Baru (misal: No Sertifikat)"
                    style={{ flex: 1, padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  />
                  <input
                    type="text"
                    value={newMetaVal}
                    onChange={(e) => setNewMetaVal(e.target.value)}
                    placeholder="Nilai data..."
                    style={{ flex: 1, padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomMeta}
                    className="btn btn-primary"
                    style={{ padding: '8px 16px', fontSize: '0.82rem', whiteSpace: 'nowrap' }}
                  >
                    <i className="fas fa-plus"></i> Tambah
                  </button>
                </div>

                {/* Daftar Metadata */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '350px', overflowY: 'auto' }}>
                  {Object.keys(customMetadata).map((key) => (
                    <div 
                      key={key} 
                      style={{ 
                        display: 'flex', 
                        gap: '12px', 
                        alignItems: 'center', 
                        padding: '6px 10px', 
                        background: '#ffffff', 
                        borderRadius: '6px', 
                        border: '1px solid #e2e8f0' 
                      }}
                    >
                      <div style={{ flex: '0 0 200px', fontWeight: 600, fontSize: '0.82rem', color: '#475569' }}>
                        {key}
                      </div>
                      <div style={{ flex: 1 }}>
                        <input
                          type="text"
                          value={customMetadata[key]}
                          onChange={(e) => setCustomMetadata(prev => ({ ...prev, [key]: e.target.value }))}
                          style={{
                            width: '100%',
                            padding: '6px 10px',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            fontSize: '0.85rem',
                            color: '#0f172a'
                          }}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteCustomMeta(key)}
                        title="Hapus kolom ini"
                        style={{
                          background: '#fee2e2',
                          color: '#ef4444',
                          border: 'none',
                          borderRadius: '6px',
                          width: '28px',
                          height: '28px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <i className="fas fa-trash-alt" style={{ fontSize: '0.75rem' }}></i>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            gap: '12px',
            padding: '16px 24px',
            borderTop: '1px solid #e2e8f0',
            background: '#f8fafc'
          }}>
            <button
              type="button"
              className="btn"
              style={{ background: '#cbd5e1', color: '#334155', fontWeight: 600 }}
              onClick={() => !isSaving && onClose()}
              disabled={isSaving}
            >
              Batal
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              style={{
                background: 'linear-gradient(135deg, #0284c7, #0369a1)',
                borderColor: '#0284c7',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px'
              }}
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i> Menyimpan...
                </>
              ) : (
                <>
                  <i className="fas fa-save"></i> {isNew ? 'Tambah Guru' : 'Simpan Perubahan'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
