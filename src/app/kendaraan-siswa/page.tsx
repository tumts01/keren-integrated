'use client';

import React, { useState, useEffect, useMemo } from 'react';
import styles from './kendaraan.module.css';
import SearchableSelect from '@/components/SearchableSelect';
import Swal from 'sweetalert2';

interface Kendaraan {
  id: string;
  nis: string;
  nama: string;
  kelas: string;
  plat_nomor: string;
  merk_motor: string;
  warna_motor?: string;
  izin_ortu: boolean;
  keterangan?: string;
  diinput_oleh?: string;
  created_at?: string;
}

interface RekapKelas {
  kelas: string;
  total: number;
  izin: number;
  belumIzin: number;
}

interface SiswaOption {
  nis: string;
  nama: string;
  kelas: string;
}

export default function KendaraanSiswaPage() {
  const [data, setData] = useState<Kendaraan[]>([]);
  const [rekap, setRekap] = useState<RekapKelas[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  // Filter state
  const [selectedKelas, setSelectedKelas] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modal State
  const [showModal, setShowModal] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editId, setEditId] = useState<string>('');

  // Form State
  const [siswaOptions, setSiswaOptions] = useState<SiswaOption[]>([]);
  const [selectedNis, setSelectedNis] = useState<string>('');
  const [namaSiswa, setNamaSiswa] = useState<string>('');
  const [kelasSiswa, setKelasSiswa] = useState<string>('');
  const [platNomor, setPlatNomor] = useState<string>('');
  const [merkMotor, setMerkMotor] = useState<string>('');
  const [warnaMotor, setWarnaMotor] = useState<string>('');
  const [izinOrtu, setIzinOrtu] = useState<boolean>(true);
  const [keterangan, setKeterangan] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  // User session
  const [currentUser, setCurrentUser] = useState<string>('Wali Kelas');

  useEffect(() => {
    const userStr = localStorage.getItem('keren_user_data');
    if (userStr) {
      try {
        const u = JSON.parse(userStr);
        setCurrentUser(u.nama || u.username || 'Guru');
      } catch (e) {}
    }
    fetchData();
    fetchSiswa();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/kendaraan-siswa');
      const json = await res.json();
      if (json.success) {
        setData(json.data || []);
        setRekap(json.rekap || []);
        setTotalCount(json.total || 0);
      }
    } catch (e) {
      console.error('Failed to load kendaraan data:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchSiswa = async () => {
    try {
      const res = await fetch('/api/siswa');
      const json = await res.json();
      const raw = json.data || (Array.isArray(json) ? json : []);
      
      const seenNis = new Set<string>();
      const active: SiswaOption[] = [];

      for (const s of raw) {
        const isAktif = (s.status || '').toLowerCase() === 'aktif';
        const isLatest = Boolean(s.isLatest);
        const nis = s.nis || s.id_siswa || '';
        const nama = s.nama || '';
        const kelas = s.kelas || s.rombel || '';

        if (isAktif && isLatest && nis && nama && !seenNis.has(nis)) {
          seenNis.add(nis);
          active.push({ nis, nama, kelas });
        }
      }

      active.sort((a, b) => a.nama.localeCompare(b.nama));
      setSiswaOptions(active);
    } catch (e) {
      console.error('Failed to load students:', e);
    }
  };

  const handleOpenAddModal = () => {
    setIsEditing(false);
    setEditId('');
    setSelectedNis('');
    setNamaSiswa('');
    setKelasSiswa('');
    setPlatNomor('');
    setMerkMotor('');
    setWarnaMotor('');
    setIzinOrtu(true);
    setKeterangan('');
    setShowModal(true);
  };

  const handleOpenEditModal = (item: Kendaraan) => {
    setIsEditing(true);
    setEditId(item.id);
    setSelectedNis(item.nis);
    setNamaSiswa(item.nama);
    setKelasSiswa(item.kelas);
    setPlatNomor(item.plat_nomor);
    setMerkMotor(item.merk_motor || '');
    setWarnaMotor(item.warna_motor || '');
    setIzinOrtu(item.izin_ortu);
    setKeterangan(item.keterangan || '');
    setShowModal(true);
  };

  const handleSelectSiswa = (val: string) => {
    setSelectedNis(val);
    const found = siswaOptions.find(s => s.nis === val);
    if (found) {
      setNamaSiswa(found.nama);
      setKelasSiswa(found.kelas);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNis || !namaSiswa) {
      Swal.fire('Oops', 'Pilih siswa terlebih dahulu!', 'warning');
      return;
    }
    if (!platNomor.trim()) {
      Swal.fire('Oops', 'Plat nomor wajib diisi!', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        nis: selectedNis,
        nama: namaSiswa,
        kelas: kelasSiswa,
        plat_nomor: platNomor.trim().toUpperCase(),
        merk_motor: merkMotor.trim(),
        warna_motor: warnaMotor.trim(),
        izin_ortu: izinOrtu,
        keterangan: keterangan.trim(),
        diinput_oleh: currentUser
      };

      const res = await fetch('/api/kendaraan-siswa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json();

      if (json.success) {
        setShowModal(false);
        Swal.fire('Berhasil!', `Data kendaraan ${namaSiswa} berhasil disimpan.`, 'success');
        fetchData();
      } else {
        Swal.fire('Gagal!', json.error || 'Terjadi kesalahan.', 'error');
      }
    } catch (e: any) {
      Swal.fire('Error', e.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (item: Kendaraan) => {
    const result = await Swal.fire({
      title: 'Hapus Kendaraan?',
      text: `Yakin ingin menghapus data kendaraan milik ${item.nama} (${item.plat_nomor})?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal'
    });

    if (result.isConfirmed) {
      try {
        const res = await fetch(`/api/kendaraan-siswa?id=${item.id}`, { method: 'DELETE' });
        const json = await res.json();
        if (json.success) {
          Swal.fire('Terhapus!', 'Data kendaraan telah dihapus.', 'success');
          fetchData();
        } else {
          Swal.fire('Gagal', json.error, 'error');
        }
      } catch (e: any) {
        Swal.fire('Error', e.message, 'error');
      }
    }
  };

  // Derived filtered data
  const filteredData = useMemo(() => {
    return data.filter(item => {
      const matchKelas = selectedKelas === 'all' || item.kelas === selectedKelas;
      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        item.nama.toLowerCase().includes(q) ||
        item.nis.toLowerCase().includes(q) ||
        item.plat_nomor.toLowerCase().includes(q) ||
        (item.merk_motor && item.merk_motor.toLowerCase().includes(q));
      return matchKelas && matchQuery;
    });
  }, [data, selectedKelas, searchQuery]);

  // Overall stats
  const totalIzin = useMemo(() => data.filter(d => d.izin_ortu).length, [data]);
  const totalBelumIzin = useMemo(() => data.filter(d => !d.izin_ortu).length, [data]);

  // Unique classes for dropdown
  const uniqueKelas = useMemo(() => {
    const set = new Set<string>();
    data.forEach(d => {
      if (d.kelas) set.add(d.kelas);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [data]);

  const studentSelectOptions = useMemo(() => {
    return siswaOptions.map(s => ({
      value: s.nis,
      label: s.nama,
      subLabel: `Kelas ${s.kelas || '-'} • NIS: ${s.nis}`
    }));
  }, [siswaOptions]);

  const handleExportCSV = () => {
    if (data.length === 0) {
      Swal.fire('Info', 'Belum ada data untuk diekspor', 'info');
      return;
    }
    const headers = ['No', 'NIS', 'Nama Siswa', 'Kelas', 'Plat Nomor', 'Merk Motor', 'Izin Ortu', 'Keterangan'];
    const rows = filteredData.map((d, idx) => [
      idx + 1,
      `'${d.nis}`,
      `"${d.nama.replace(/"/g, '""')}"`,
      d.kelas,
      d.plat_nomor,
      `"${(d.merk_motor || '').replace(/"/g, '""')}"`,
      d.izin_ortu ? 'Ada Izin' : 'Belum Izin',
      `"${(d.keterangan || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `data_kendaraan_siswa_${selectedKelas}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <h1>
            <i className="fas fa-motorcycle" style={{ color: '#059669' }}></i>
            Data Kendaraan Siswa
          </h1>
          <p>Pendataan resmi siswa yang membawa kendaraan bermotor dan izin parkir yayasan</p>
        </div>
        <div className={styles.actionArea}>
          <button className={styles.btnSecondary} onClick={handleExportCSV}>
            <i className="fas fa-file-excel"></i> Ekspor CSV / Excel
          </button>
          <button className={styles.btnPrimary} onClick={handleOpenAddModal}>
            <i className="fas fa-plus"></i> + Input Kendaraan
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className={styles.summarySection}>
        <div className={styles.summaryCard}>
          <div className={styles.summaryIcon} style={{ background: '#ecfdf5', color: '#059669' }}>
            <i className="fas fa-motorcycle"></i>
          </div>
          <div>
            <div className={styles.summaryValue}>{totalCount}</div>
            <div className={styles.summaryLabel}>Total Motor Terdata</div>
          </div>
        </div>

        <div className={styles.summaryCard}>
          <div className={styles.summaryIcon} style={{ background: '#dcfce7', color: '#16a34a' }}>
            <i className="fas fa-shield-alt"></i>
          </div>
          <div>
            <div className={styles.summaryValue}>{totalIzin}</div>
            <div className={styles.summaryLabel}>Ada Izin Orang Tua</div>
          </div>
        </div>

        <div className={styles.summaryCard}>
          <div className={styles.summaryIcon} style={{ background: '#fef3c7', color: '#d97706' }}>
            <i className="fas fa-exclamation-triangle"></i>
          </div>
          <div>
            <div className={styles.summaryValue}>{totalBelumIzin}</div>
            <div className={styles.summaryLabel}>Belum Ada Izin Ortu</div>
          </div>
        </div>
      </div>

      {/* Rekap Grid per Kelas */}
      {rekap.length > 0 && (
        <div className={styles.rekapSection}>
          <div className={styles.sectionHeading}>
            <span>
              <i className="fas fa-th-large" style={{ marginRight: '8px', color: '#10b981' }}></i>
              Rekapitulasi per Kelas
            </span>
            {selectedKelas !== 'all' && (
              <button
                onClick={() => setSelectedKelas('all')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#059669',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                Reset ke Semua Kelas ✕
              </button>
            )}
          </div>
          <div className={styles.rekapGrid}>
            <div
              className={`${styles.rekapCard} ${selectedKelas === 'all' ? styles.rekapCardActive : ''}`}
              onClick={() => setSelectedKelas('all')}
            >
              <div className={styles.cardClassName}>Semua</div>
              <div className={styles.cardMotorCount}>{totalCount}</div>
              <div className={styles.cardSub}>Motor</div>
            </div>
            {rekap.map(r => (
              <div
                key={r.kelas}
                className={`${styles.rekapCard} ${selectedKelas === r.kelas ? styles.rekapCardActive : ''}`}
                onClick={() => setSelectedKelas(selectedKelas === r.kelas ? 'all' : r.kelas)}
              >
                <div className={styles.cardClassName}>Kelas {r.kelas}</div>
                <div className={styles.cardMotorCount}>{r.total}</div>
                <div className={styles.cardSub}>
                  <span style={{ color: '#16a34a' }}>{r.izin} Izin</span>
                  {r.belumIzin > 0 && <span style={{ color: '#dc2626' }}> • {r.belumIzin} Belum</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Table Card */}
      <div className={styles.tableCard}>
        <div className={styles.filterBar}>
          <div className={styles.searchBox}>
            <i className={`fas fa-search ${styles.searchIcon}`}></i>
            <input
              type="text"
              placeholder="Cari nama, NIS, atau plat nomor..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>Filter Kelas:</label>
            <select
              className={styles.selectClass}
              value={selectedKelas}
              onChange={e => setSelectedKelas(e.target.value)}
            >
              <option value="all">Semua Kelas ({data.length})</option>
              {uniqueKelas.map(k => (
                <option key={k} value={k}>
                  Kelas {k} ({data.filter(d => d.kelas === k).length})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th style={{ width: '50px', textAlign: 'center' }}>No</th>
                <th>Nama Siswa & NIS</th>
                <th style={{ textAlign: 'center' }}>Kelas</th>
                <th>Plat Nomor</th>
                <th>Merk / Jenis Motor</th>
                <th style={{ textAlign: 'center' }}>Izin Ortu</th>
                <th>Keterangan</th>
                <th style={{ textAlign: 'center', width: '120px' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                    <i className="fas fa-spinner fa-spin" style={{ fontSize: '1.5rem', marginBottom: '8px' }}></i>
                    <div>Memuat data kendaraan...</div>
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '50px', color: '#94a3b8' }}>
                    <i className="fas fa-motorcycle" style={{ fontSize: '2.5rem', marginBottom: '12px', opacity: 0.4 }}></i>
                    <div style={{ fontWeight: 600, fontSize: '1rem', color: '#64748b' }}>
                      Belum ada siswa yang terdata membawa motor
                    </div>
                    <div style={{ fontSize: '0.85rem', marginTop: '4px' }}>
                      Klik tombol <strong>"+ Input Kendaraan"</strong> di atas untuk mulai memasukkan data.
                    </div>
                  </td>
                </tr>
              ) : (
                filteredData.map((item, idx) => (
                  <tr key={item.id}>
                    <td style={{ textAlign: 'center', fontWeight: 600, color: '#94a3b8' }}>{idx + 1}</td>
                    <td>
                      <div style={{ fontWeight: 700, color: '#1e293b' }}>{item.nama}</div>
                      <div style={{ fontSize: '0.78rem', color: '#64748b' }}>NIS: {item.nis}</div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={styles.badgeKelas}>{item.kelas}</span>
                    </td>
                    <td>
                      <span className={styles.platBadge}>{item.plat_nomor}</span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: '#334155' }}>{item.merk_motor || '-'}</div>
                      {item.warna_motor && (
                        <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Warna: {item.warna_motor}</div>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {item.izin_ortu ? (
                        <span className={styles.badgeSuccess}>
                          <i className="fas fa-check-circle"></i> Ada Izin
                        </span>
                      ) : (
                        <span className={styles.badgeWarning}>
                          <i className="fas fa-exclamation-circle"></i> Belum Izin
                        </span>
                      )}
                    </td>
                    <td>
                      <div style={{ fontSize: '0.85rem', color: '#475569' }}>{item.keterangan || '-'}</div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        <button
                          onClick={() => handleOpenEditModal(item)}
                          style={{
                            background: '#f1f5f9',
                            border: 'none',
                            color: '#0284c7',
                            padding: '6px 10px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '0.85rem'
                          }}
                          title="Edit"
                        >
                          <i className="fas fa-edit"></i>
                        </button>
                        <button
                          onClick={() => handleDelete(item)}
                          className={styles.btnDanger}
                          title="Hapus"
                        >
                          <i className="fas fa-trash-alt"></i>
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

      {/* Quick Input Modal */}
      {showModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2>
                <i className="fas fa-motorcycle" style={{ color: '#10b981' }}></i>
                {isEditing ? 'Edit Data Kendaraan' : 'Input Cepat Kendaraan Siswa'}
              </h2>
              <button className={styles.closeBtn} onClick={() => setShowModal(false)}>
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              {/* Pilih Siswa (Searchable) */}
              <div className={styles.formGroup}>
                <label>Pilih Siswa (Ketik Nama / NIS) *</label>
                {isEditing ? (
                  <input
                    type="text"
                    className={styles.formInput}
                    value={`${namaSiswa} (${kelasSiswa}) - NIS: ${selectedNis}`}
                    disabled
                    style={{ background: '#f8fafc', color: '#64748b' }}
                  />
                ) : (
                  <SearchableSelect
                    options={studentSelectOptions}
                    value={selectedNis}
                    onChange={handleSelectSiswa}
                    placeholder="-- Cari Nama Siswa / NIS --"
                  />
                )}
              </div>

              {/* Plat Nomor */}
              <div className={styles.formGroup}>
                <label>Plat Nomor (Nopol) *</label>
                <input
                  type="text"
                  className={styles.formInput}
                  placeholder="Contoh: N 4521 ABC"
                  value={platNomor}
                  onChange={e => setPlatNomor(e.target.value.toUpperCase())}
                  required
                />
              </div>

              {/* Merk / Tipe Motor */}
              <div className={styles.formGroup}>
                <label>Merk / Jenis Motor</label>
                <input
                  type="text"
                  list="motorSuggestions"
                  className={styles.formInput}
                  placeholder="Contoh: Honda Beat, Vario 125, Scoopy, dll"
                  value={merkMotor}
                  onChange={e => setMerkMotor(e.target.value)}
                />
                <datalist id="motorSuggestions">
                  <option value="Honda Beat" />
                  <option value="Honda Vario 125" />
                  <option value="Honda Vario 160" />
                  <option value="Honda Scoopy" />
                  <option value="Honda Genio" />
                  <option value="Yamaha Mio" />
                  <option value="Yamaha Fazzio" />
                  <option value="Yamaha Gear" />
                  <option value="Yamaha NMAX" />
                  <option value="Yamaha Aerox" />
                  <option value="Suzuki Nex" />
                </datalist>
              </div>

              {/* Warna Motor */}
              <div className={styles.formGroup}>
                <label>Warna Kendaraan (Opsional)</label>
                <input
                  type="text"
                  className={styles.formInput}
                  placeholder="Contoh: Hitam, Merah Putih, dll"
                  value={warnaMotor}
                  onChange={e => setWarnaMotor(e.target.value)}
                />
              </div>

              {/* Status Izin Ortu */}
              <div className={styles.formGroup}>
                <label>Status Persetujuan</label>
                <label className={styles.checkboxContainer}>
                  <input
                    type="checkbox"
                    checked={izinOrtu}
                    onChange={e => setIzinOrtu(e.target.checked)}
                  />
                  <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1e293b' }}>
                    Ada Surat Izin / Persetujuan Orang Tua
                  </span>
                </label>
              </div>

              {/* Catatan / Keterangan */}
              <div className={styles.formGroup}>
                <label>Catatan / Keterangan (Opsional)</label>
                <input
                  type="text"
                  className={styles.formInput}
                  placeholder="Contoh: Knalpot standar, helm bawa sendiri, dll"
                  value={keterangan}
                  onChange={e => setKeterangan(e.target.value)}
                />
              </div>

              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={() => setShowModal(false)}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className={styles.btnPrimary}
                  disabled={submitting}
                >
                  {submitting ? 'Menyimpan...' : isEditing ? 'Simpan Perubahan' : 'Simpan Kendaraan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
