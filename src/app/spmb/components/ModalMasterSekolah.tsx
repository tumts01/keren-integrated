'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Swal from 'sweetalert2';

export interface SekolahItem {
  id: string;
  nama: string;
  npsn: string;
  alamat: string;
  sumber?: string;
  updated_at?: string;
}

interface ModalMasterSekolahProps {
  isOpen: boolean;
  onClose: () => void;
  onDataUpdated?: () => void;
}

export default function ModalMasterSekolah({
  isOpen,
  onClose,
  onDataUpdated
}: ModalMasterSekolahProps) {
  const [sekolahList, setSekolahList] = useState<SekolahItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Filter & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'complete_npsn' | 'missing_npsn' | 'missing_alamat'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // Form State (Tambah / Edit)
  const [formMode, setFormMode] = useState<'none' | 'add' | 'edit'>('none');
  const [editTargetId, setEditTargetId] = useState<string | null>(null);
  const [formNama, setFormNama] = useState('');
  const [formNpsn, setFormNpsn] = useState('');
  const [formAlamat, setFormAlamat] = useState('');

  // Muat data saat modal dibuka
  useEffect(() => {
    if (isOpen) {
      fetchSekolah();
    }
  }, [isOpen]);

  const fetchSekolah = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/spmb/sekolah?refresh=1&t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Pragma': 'no-cache', 'Cache-Control': 'no-cache' }
      });
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setSekolahList(json.data);
      }
    } catch (err: any) {
      console.error('Gagal mengambil master sekolah:', err);
      Swal.fire('Error', 'Gagal memuat master data sekolah', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Hitung ringkasan
  const summary = useMemo(() => {
    const total = sekolahList.length;
    const completeNpsn = sekolahList.filter(s => s.npsn && s.npsn.trim().length >= 8).length;
    const missingNpsn = total - completeNpsn;
    const completeAlamat = sekolahList.filter(s => s.alamat && s.alamat.trim().length >= 5).length;
    const missingAlamat = total - completeAlamat;
    return { total, completeNpsn, missingNpsn, completeAlamat, missingAlamat };
  }, [sekolahList]);

  // Data Terfilter
  const filteredData = useMemo(() => {
    return sekolahList.filter(item => {
      // Filter tipe
      if (filterType === 'complete_npsn' && (!item.npsn || item.npsn.trim().length < 8)) return false;
      if (filterType === 'missing_npsn' && item.npsn && item.npsn.trim().length >= 8) return false;
      if (filterType === 'missing_alamat' && item.alamat && item.alamat.trim().length >= 5) return false;

      // Filter cari
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const mNama = (item.nama || '').toLowerCase().includes(term);
        const mNpsn = (item.npsn || '').toLowerCase().includes(term);
        const mAlamat = (item.alamat || '').toLowerCase().includes(term);
        if (!mNama && !mNpsn && !mAlamat) return false;
      }

      return true;
    });
  }, [sekolahList, filterType, searchTerm]);

  // Pagination
  const totalPages = Math.ceil(filteredData.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage, pageSize]);

  // Buka Form Tambah
  const handleOpenAdd = () => {
    setEditTargetId(null);
    setFormNama('');
    setFormNpsn('');
    setFormAlamat('');
    setFormMode('add');
  };

  // Buka Form Edit
  const handleOpenEdit = (item: SekolahItem) => {
    setEditTargetId(item.id);
    setFormNama(item.nama);
    setFormNpsn(item.npsn || '');
    setFormAlamat(item.alamat || '');
    setFormMode('edit');
  };

  // Batal Form
  const handleCancelForm = () => {
    setFormMode('none');
    setEditTargetId(null);
    setFormNama('');
    setFormNpsn('');
    setFormAlamat('');
  };

  // Simpan Form (Tambah / Update) dengan Optimistic Update (Nol Delay)
  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    const namaTrim = formNama.trim();
    if (!namaTrim) {
      Swal.fire('Perhatian', 'Nama sekolah / madrasah tidak boleh kosong', 'warning');
      return;
    }

    const currentMode = formMode;
    const targetId = editTargetId;
    const newNpsn = formNpsn.trim();
    const newAlamat = formAlamat.trim();

    // 1. Optimistic Update: Langsung perbarui tampilan tabel seketika (0ms delay)
    const optimisticItem: SekolahItem = {
      id: targetId || `sch_${Date.now()}`,
      nama: namaTrim,
      npsn: newNpsn,
      alamat: newAlamat,
      sumber: 'manual_terverifikasi',
      updated_at: new Date().toISOString()
    };

    if (currentMode === 'edit') {
      setSekolahList(prev => prev.map(s => 
        (targetId && s.id === targetId) || s.nama.toLowerCase() === namaTrim.toLowerCase() 
          ? { ...s, nama: namaTrim, npsn: newNpsn, alamat: newAlamat, sumber: 'manual_terverifikasi' } 
          : s
      ));
    } else {
      setSekolahList(prev => [...prev, optimisticItem].sort((a, b) => a.nama.localeCompare(b.nama, 'id')));
    }

    // Tutup form langsung tanpa jeda
    handleCancelForm();

    // Tampilkan toast notifikasi cepat (tidak memblokir layar)
    const Toast = Swal.mixin({
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 1500,
      timerProgressBar: false
    });
    Toast.fire({
      icon: 'success',
      title: currentMode === 'add' ? 'Sekolah baru berhasil ditambahkan' : 'Data sekolah berhasil diperbarui'
    });

    // 2. Simpan ke database Supabase
    setSaving(true);
    try {
      const payload = {
        action: currentMode === 'add' ? 'create' : 'update',
        item: {
          id: targetId || undefined,
          nama: namaTrim,
          npsn: newNpsn,
          alamat: newAlamat
        }
      };

      const res = await fetch('/api/spmb/sekolah', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json();

      if (json.success && Array.isArray(json.data)) {
        setSekolahList(json.data);
        if (onDataUpdated) onDataUpdated();
      } else {
        Swal.fire('Gagal', json.error || 'Terjadi kesalahan saat menyimpan', 'error');
        fetchSekolah();
      }
    } catch (err: any) {
      Swal.fire('Error', err.message || 'Koneksi gagal', 'error');
      fetchSekolah();
    } finally {
      setSaving(false);
    }
  };

  // Hapus Sekolah (dengan Optimistic Delete)
  const handleDelete = async (item: SekolahItem) => {
    const confirm = await Swal.fire({
      title: 'Hapus Sekolah?',
      html: `Apakah Anda yakin ingin menghapus referensi <b>${item.nama}</b>?<br/><small style="color: #64748b;">Sekolah ini tidak akan muncul lagi di saran pengisian form SPMB.</small>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal'
    });

    if (confirm.isConfirmed) {
      // Optimistic delete: Hapus seketika dari tabel
      setSekolahList(prev => prev.filter(s => s.id !== item.id && s.nama.toLowerCase() !== item.nama.toLowerCase()));
      const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
      Toast.fire({ icon: 'success', title: 'Data sekolah dihapus' });

      try {
        const res = await fetch('/api/spmb/sekolah', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'delete', id: item.id, item: { nama: item.nama } })
        });
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setSekolahList(json.data);
          if (onDataUpdated) onDataUpdated();
        } else {
          Swal.fire('Gagal', json.error || 'Gagal menghapus data', 'error');
          fetchSekolah();
        }
      } catch (err: any) {
        Swal.fire('Error', err.message, 'error');
        fetchSekolah();
      }
    }
  };

  // Sinkronisasi Ulang Cerdas dari Buku Induk
  const handleResync = async () => {
    const confirm = await Swal.fire({
      title: 'Sinkronisasi Cerdas?',
      html: `Sistem akan memindai ulang seluruh <b>Buku Induk siswa</b>, memilih NPSN valid dan alamat terlengkap, serta tetap mempertahankan perubahan manual yang pernah Anda buat.<br/><br/>Lanjutkan?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#0284c7',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'Ya, Sinkronkan Sekarang',
      cancelButtonText: 'Batal'
    });

    if (confirm.isConfirmed) {
      try {
        Swal.fire({ title: 'Menyinkronkan data...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
        const res = await fetch('/api/spmb/sekolah', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'resync' })
        });
        const json = await res.json();
        if (json.success) {
          Swal.fire({
            icon: 'success',
            title: 'Sinkronisasi Selesai!',
            text: `Berhasil menyinkronkan total ${json.total} sekolah master.`,
            timer: 2000,
            showConfirmButton: false
          });
          setSekolahList(json.data);
          if (onDataUpdated) onDataUpdated();
        } else {
          Swal.fire('Gagal', json.error || 'Sinkronisasi gagal', 'error');
        }
      } catch (err: any) {
        Swal.fire('Error', err.message, 'error');
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '16px'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '1000px',
        maxHeight: '92vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        overflow: 'hidden',
        animation: 'fadeIn 0.2s ease-out'
      }}>
        {/* Header Modal */}
        <div style={{
          padding: '18px 24px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#f8fafc'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                background: '#e0f2fe',
                color: '#0284c7',
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '17px'
              }}>
                <i className="fas fa-school"></i>
              </div>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
                Master Referensi Asal Sekolah / Madrasah
              </h2>
            </div>
            <p style={{ margin: '4px 0 0 46px', fontSize: '12.5px', color: '#64748b' }}>
              Kelola daftar nama sekolah, NPSN resmi, dan alamat asal untuk fitur auto-fill formulir pendaftaran SPMB.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: '#f1f5f9',
              border: 'none',
              borderRadius: '8px',
              width: '34px',
              height: '34px',
              cursor: 'pointer',
              color: '#64748b',
              fontSize: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s'
            }}
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
          {/* Kartu Ringkasan Data */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '12px',
            marginBottom: '18px'
          }}>
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px 16px' }}>
              <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Total Sekolah Master</div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                {summary.total.toLocaleString('id-ID')}
              </div>
            </div>

            <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '12px', padding: '12px 16px' }}>
              <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#047857', textTransform: 'uppercase' }}>✅ NPSN Terisi</div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#059669', marginTop: '2px' }}>
                {summary.completeNpsn.toLocaleString('id-ID')}
              </div>
            </div>

            <div style={{
              background: summary.missingNpsn > 0 ? '#fef2f2' : '#f8fafc',
              border: `1px solid ${summary.missingNpsn > 0 ? '#fecaca' : '#e2e8f0'}`,
              borderRadius: '12px',
              padding: '12px 16px'
            }}>
              <div style={{ fontSize: '11.5px', fontWeight: 700, color: summary.missingNpsn > 0 ? '#b91c1c' : '#64748b', textTransform: 'uppercase' }}>
                ⚠️ NPSN Kosong
              </div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: summary.missingNpsn > 0 ? '#dc2626' : '#64748b', marginTop: '2px' }}>
                {summary.missingNpsn}
              </div>
            </div>

            <div style={{
              background: summary.missingAlamat > 0 ? '#fffbeb' : '#f8fafc',
              border: `1px solid ${summary.missingAlamat > 0 ? '#fde68a' : '#e2e8f0'}`,
              borderRadius: '12px',
              padding: '12px 16px'
            }}>
              <div style={{ fontSize: '11.5px', fontWeight: 700, color: summary.missingAlamat > 0 ? '#b45309' : '#64748b', textTransform: 'uppercase' }}>
                📍 Alamat Belum Lengkap
              </div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: summary.missingAlamat > 0 ? '#d97706' : '#64748b', marginTop: '2px' }}>
                {summary.missingAlamat}
              </div>
            </div>
          </div>

          {/* Form Tambah / Edit (Jika aktif) */}
          {formMode !== 'none' && (
            <div style={{
              background: '#f0fdf4',
              border: '1.5px solid #86efac',
              borderRadius: '14px',
              padding: '18px 20px',
              marginBottom: '20px',
              animation: 'slideDown 0.2s ease-out'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#166534', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className={formMode === 'add' ? 'fas fa-plus-circle' : 'fas fa-edit'}></i>
                  {formMode === 'add' ? 'Tambah Sekolah Baru' : 'Edit Referensi Sekolah'}
                </h3>
                <button
                  type="button"
                  onClick={handleCancelForm}
                  style={{ background: 'transparent', border: 'none', color: '#166534', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}
                >
                  Batal
                </button>
              </div>

              <form onSubmit={handleSaveForm}>
                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '14px', marginBottom: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#1e293b', marginBottom: '5px' }}>
                      Nama Asal Sekolah / Madrasah <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={formNama}
                      onChange={e => setFormNama(e.target.value)}
                      placeholder="Contoh: SDI ALMAARIF 02 SINGOSARI"
                      required
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        border: '1.5px solid #cbd5e1',
                        fontSize: '13px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#1e293b', marginBottom: '5px' }}>
                      NPSN Sekolah (8 Digit)
                    </label>
                    <input
                      type="text"
                      value={formNpsn}
                      onChange={e => setFormNpsn(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="Contoh: 20554142"
                      maxLength={8}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        border: '1.5px solid #cbd5e1',
                        fontSize: '13px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#1e293b', marginBottom: '5px' }}>
                    Alamat Lengkap Sekolah Asal
                  </label>
                  <input
                    type="text"
                    value={formAlamat}
                    onChange={e => setFormAlamat(e.target.value)}
                    placeholder="Contoh: Jl. Masjid, Kel. Pagentan, Kec. Singosari, Kab. Malang, Jawa Timur"
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '13px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={handleCancelForm}
                    style={{
                      background: '#e2e8f0',
                      color: '#475569',
                      border: 'none',
                      padding: '8px 16px',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    style={{
                      background: '#16a34a',
                      color: 'white',
                      border: 'none',
                      padding: '8px 18px',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: saving ? 'not-allowed' : 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    {saving ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-check"></i>}
                    {formMode === 'add' ? 'Simpan Sekolah' : 'Perbarui Sekolah'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Toolbar Navigasi: Pencarian, Filter & Aksi */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '10px',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '14px'
          }}>
            <div style={{ display: 'flex', gap: '10px', flex: 1, minWidth: '320px' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <i className="fas fa-search" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '13px' }}></i>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                  placeholder="Cari nama sekolah, NPSN, atau alamat..."
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 34px',
                    borderRadius: '8px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '13px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => { setSearchTerm(''); setCurrentPage(1); }}
                    style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                  >
                    <i className="fas fa-times-circle"></i>
                  </button>
                )}
              </div>

              <select
                value={filterType}
                onChange={e => { setFilterType(e.target.value as any); setCurrentPage(1); }}
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '13px',
                  outline: 'none',
                  cursor: 'pointer',
                  background: 'white'
                }}
              >
                <option value="all">Semua ({sekolahList.length})</option>
                <option value="complete_npsn">✅ NPSN Lengkap ({summary.completeNpsn})</option>
                <option value="missing_npsn">⚠️ NPSN Belum Ada ({summary.missingNpsn})</option>
                <option value="missing_alamat">📍 Alamat Belum Ada ({summary.missingAlamat})</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={handleOpenAdd}
                style={{
                  background: '#047857',
                  color: 'white',
                  border: 'none',
                  padding: '8px 14px',
                  borderRadius: '8px',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <i className="fas fa-plus"></i> Tambah Sekolah
              </button>

              <button
                type="button"
                onClick={handleResync}
                title="Sinkronisasi cerdas dari buku induk (mengambil NPSN & alamat terlengkap)"
                style={{
                  background: '#f1f5f9',
                  color: '#0369a1',
                  border: '1.5px solid #bae6fd',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <i className="fas fa-sync-alt"></i> Sinkronkan Cerdas
              </button>
            </div>
          </div>

          {/* Tabel Master Sekolah */}
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
              <i className="fas fa-spinner fa-spin" style={{ fontSize: '24px', marginBottom: '8px' }}></i>
              <p style={{ margin: 0, fontSize: '13px' }}>Memuat master data sekolah...</p>
            </div>
          ) : filteredData.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', background: '#f8fafc', borderRadius: '12px' }}>
              <i className="fas fa-info-circle" style={{ fontSize: '24px', marginBottom: '8px', color: '#94a3b8' }}></i>
              <p style={{ margin: 0, fontSize: '13.5px', fontWeight: 600 }}>Tidak ada data sekolah yang cocok dengan pencarian / filter.</p>
            </div>
          ) : (
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #cbd5e1', color: '#475569' }}>
                    <th style={{ padding: '10px 12px', width: '45px', textAlign: 'center' }}>No</th>
                    <th style={{ padding: '10px 12px' }}>Nama Asal Sekolah / Madrasah</th>
                    <th style={{ padding: '10px 12px', width: '110px' }}>NPSN</th>
                    <th style={{ padding: '10px 12px' }}>Alamat Lengkap</th>
                    <th style={{ padding: '10px 12px', width: '90px', textAlign: 'center' }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.map((item, idx) => {
                    const rowNumber = (currentPage - 1) * pageSize + idx + 1;
                    const hasNpsn = item.npsn && item.npsn.trim().length >= 8;
                    const hasAlamat = item.alamat && item.alamat.trim().length >= 5;

                    return (
                      <tr
                        key={item.id || idx}
                        style={{
                          borderBottom: '1px solid #f1f5f9',
                          background: idx % 2 === 0 ? 'white' : '#fafafa',
                          transition: 'background 0.15s'
                        }}
                      >
                        <td style={{ padding: '10px 12px', textAlign: 'center', color: '#64748b', fontWeight: 600 }}>
                          {rowNumber}
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <div style={{ fontWeight: 700, color: '#0f172a' }}>{item.nama}</div>
                          {item.sumber?.startsWith('manual') && (
                            <span style={{ fontSize: '10px', background: '#dbeafe', color: '#1d4ed8', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
                              Kustom / Diedit
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          {hasNpsn ? (
                            <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#047857', background: '#ecfdf5', padding: '2px 6px', borderRadius: '4px' }}>
                              {item.npsn}
                            </span>
                          ) : (
                            <span style={{ fontSize: '11px', color: '#dc2626', background: '#fef2f2', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                              Belum ada
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '10px 12px', color: '#334155' }}>
                          {hasAlamat ? (
                            item.alamat
                          ) : (
                            <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '11.5px' }}>
                              Alamat belum dilengkapi
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(item)}
                              title="Edit Data Sekolah"
                              style={{
                                background: '#f0fdf4',
                                color: '#16a34a',
                                border: '1px solid #bbf7d0',
                                width: '28px',
                                height: '28px',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '12px'
                              }}
                            >
                              <i className="fas fa-pencil-alt"></i>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(item)}
                              title="Hapus dari Master Referensi"
                              style={{
                                background: '#fef2f2',
                                color: '#dc2626',
                                border: '1px solid #fecaca',
                                width: '28px',
                                height: '28px',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '12px'
                              }}
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
            </div>
          )}

          {/* Pagination Controls */}
          {filteredData.length > pageSize && (
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: '14px',
              fontSize: '12.5px',
              color: '#64748b'
            }}>
              <div>
                Menampilkan <b>{(currentPage - 1) * pageSize + 1}</b> - <b>{Math.min(currentPage * pageSize, filteredData.length)}</b> dari <b>{filteredData.length}</b> sekolah
              </div>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    background: currentPage === 1 ? '#f8fafc' : 'white',
                    color: currentPage === 1 ? '#cbd5e1' : '#334155',
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    fontWeight: 600
                  }}
                >
                  <i className="fas fa-chevron-left"></i>
                </button>
                <div style={{ padding: '6px 12px', fontWeight: 700, color: '#0f172a' }}>
                  Halaman {currentPage} / {totalPages}
                </div>
                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    background: currentPage >= totalPages ? '#f8fafc' : 'white',
                    color: currentPage >= totalPages ? '#cbd5e1' : '#334155',
                    cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
                    fontWeight: 600
                  }}
                >
                  <i className="fas fa-chevron-right"></i>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div style={{
          padding: '14px 24px',
          borderTop: '1px solid #e2e8f0',
          background: '#f8fafc',
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center'
        }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: '#0f172a',
              color: 'white',
              border: 'none',
              padding: '9px 20px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
