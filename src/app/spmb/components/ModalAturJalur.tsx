'use client';

import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';

export interface JalurItem {
  id: string;
  nama: string;
  aktif: boolean;
  deskripsi?: string;
}

interface ModalAturJalurProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveSuccess?: (updatedJalur: JalurItem[], pendaftaranBuka: boolean) => void;
}

export default function ModalAturJalur({
  isOpen,
  onClose,
  onSaveSuccess
}: ModalAturJalurProps) {
  const [jalurList, setJalurList] = useState<JalurItem[]>([]);
  const [pendaftaranBuka, setPendaftaranBuka] = useState(true);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form tambah jalur baru
  const [showAddForm, setShowAddForm] = useState(false);
  const [newJalurNama, setNewJalurNama] = useState('');
  const [newJalurDeskripsi, setNewJalurDeskripsi] = useState('');

  // Fetch config whenever modal opens
  useEffect(() => {
    if (isOpen) {
      fetchConfig();
    }
  }, [isOpen]);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/spmb/config');
      const data = await res.json();
      if (data.success) {
        setJalurList(data.jalur || []);
        setPendaftaranBuka(data.pendaftaran_buka ?? true);
      }
    } catch (err) {
      console.error('Gagal mengambil config SPMB:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleToggleJalur = (id: string) => {
    setJalurList(prev =>
      prev.map(j => (j.id === id ? { ...j, aktif: !j.aktif } : j))
    );
  };

  const handleSetAll = (aktif: boolean) => {
    setJalurList(prev => prev.map(j => ({ ...j, aktif })));
  };

  const handleAddJalur = () => {
    const trimmed = newJalurNama.trim();
    if (!trimmed) {
      Swal.fire({ icon: 'warning', title: 'Perhatian', text: 'Nama jalur tidak boleh kosong.' });
      return;
    }

    if (jalurList.some(j => j.nama.toLowerCase() === trimmed.toLowerCase())) {
      Swal.fire({ icon: 'warning', title: 'Perhatian', text: `Jalur '${trimmed}' sudah terdaftar.` });
      return;
    }

    const id = trimmed.toLowerCase().replace(/[^a-z0-9]/g, '_');
    setJalurList(prev => [
      ...prev,
      {
        id,
        nama: trimmed,
        aktif: true,
        deskripsi: newJalurDeskripsi.trim() || `Jalur ${trimmed}`
      }
    ]);

    setNewJalurNama('');
    setNewJalurDeskripsi('');
    setShowAddForm(false);
  };

  const handleDeleteJalur = (id: string, nama: string) => {
    Swal.fire({
      title: 'Hapus Jalur?',
      text: `Apakah Anda yakin ingin menghapus jalur '${nama}' dari daftar?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Hapus'
    }).then(result => {
      if (result.isConfirmed) {
        setJalurList(prev => prev.filter(j => j.id !== id));
      }
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/spmb/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jalur: jalurList,
          pendaftaran_buka: pendaftaranBuka
        })
      });

      const data = await res.json();
      if (data.success) {
        Swal.fire({
          icon: 'success',
          title: 'Pengaturan Disimpan',
          text: 'Konfigurasi jalur pendaftaran SPMB berhasil diperbarui.',
          timer: 1800,
          showConfirmButton: false
        });

        if (onSaveSuccess) {
          onSaveSuccess(jalurList, pendaftaranBuka);
        }
        onClose();
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Gagal Menyimpan',
          text: data.error || 'Terjadi kesalahan saat menyimpan.'
        });
      }
    } catch (err: any) {
      console.error(err);
      Swal.fire({
        icon: 'error',
        title: 'Koneksi Terputus',
        text: 'Gagal menghubungi server.'
      });
    } finally {
      setSaving(false);
    }
  };

  const activeCount = jalurList.filter(j => j.aktif).length;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        padding: '16px'
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '20px',
          maxWidth: '560px',
          width: '100%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: '#f8fafc'
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
              <span
                style={{
                  background: '#dcfce7',
                  color: '#15803d',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  textTransform: 'uppercase'
                }}
              >
                Panel Admin
              </span>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                ({activeCount} dari {jalurList.length} Jalur Aktif)
              </span>
            </div>
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
              <i className="fas fa-sliders-h" style={{ color: '#047857', marginRight: '8px' }}></i>
              Atur Jalur Pendaftaran SPMB
            </h3>
          </div>

          <button
            onClick={onClose}
            style={{
              background: '#f1f5f9',
              border: 'none',
              borderRadius: '8px',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#64748b'
            }}
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
          {loading ? (
            <div style={{ padding: '40px 0', textAlign: 'center', color: '#64748b' }}>
              <i className="fas fa-spinner fa-spin fa-2x" style={{ color: '#047857', marginBottom: '10px' }}></i>
              <p style={{ margin: 0, fontSize: '0.9rem' }}>Memuat konfigurasi jalur pendaftaran...</p>
            </div>
          ) : (
            <>
              {/* Global SPMB Status Card */}
              <div
                style={{
                  background: pendaftaranBuka ? '#f0fdf4' : '#fef2f2',
                  border: `1px solid ${pendaftaranBuka ? '#bbf7d0' : '#fecaca'}`,
                  borderRadius: '12px',
                  padding: '14px 16px',
                  marginBottom: '20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.95rem', color: pendaftaranBuka ? '#166534' : '#991b1b' }}>
                    Status Pendaftaran SPMB Online
                  </div>
                  <div style={{ fontSize: '0.82rem', color: pendaftaranBuka ? '#15803d' : '#b91c1c', marginTop: '2px' }}>
                    {pendaftaranBuka
                      ? 'Pendaftaran dibuka. Formulir pendaftaran dapat diisi oleh calon peserta.'
                      : 'Pendaftaran ditutup sementara. Formulir pendaftaran dikunci.'}
                  </div>
                </div>

                <label style={{ position: 'relative', display: 'inline-block', width: '48px', height: '26px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={pendaftaranBuka}
                    onChange={() => setPendaftaranBuka(!pendaftaranBuka)}
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  <span
                    style={{
                      position: 'absolute',
                      inset: 0,
                      backgroundColor: pendaftaranBuka ? '#16a34a' : '#cbd5e1',
                      borderRadius: '34px',
                      transition: '0.2s',
                      boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.2)'
                    }}
                  >
                    <span
                      style={{
                        position: 'absolute',
                        height: '20px',
                        width: '20px',
                        left: pendaftaranBuka ? '25px' : '3px',
                        bottom: '3px',
                        backgroundColor: 'white',
                        borderRadius: '50%',
                        transition: '0.2s',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                      }}
                    />
                  </span>
                </label>
              </div>

              {/* Quick Actions */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <span style={{ fontSize: '0.86rem', fontWeight: 700, color: '#334155' }}>
                  Daftar Jalur Pendaftaran:
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => handleSetAll(true)}
                    style={{
                      background: '#f1f5f9',
                      border: '1px solid #cbd5e1',
                      color: '#047857',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Aktifkan Semua
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetAll(false)}
                    style={{
                      background: '#f1f5f9',
                      border: '1px solid #cbd5e1',
                      color: '#ef4444',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Nonaktifkan Semua
                  </button>
                </div>
              </div>

              {/* Jalur List Items */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {jalurList.map(j => (
                  <div
                    key={j.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 14px',
                      borderRadius: '12px',
                      border: `1.5px solid ${j.aktif ? '#bbf7d0' : '#e2e8f0'}`,
                      background: j.aktif ? '#fdfefe' : '#f8fafc',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                      <div
                        onClick={() => handleToggleJalur(j.id)}
                        style={{
                          width: '22px',
                          height: '22px',
                          borderRadius: '6px',
                          border: `2px solid ${j.aktif ? '#047857' : '#94a3b8'}`,
                          backgroundColor: j.aktif ? '#047857' : 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          color: 'white',
                          fontSize: '0.75rem',
                          flexShrink: 0
                        }}
                      >
                        {j.aktif && <i className="fas fa-check"></i>}
                      </div>

                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span
                            style={{
                              fontWeight: 700,
                              fontSize: '0.96rem',
                              color: j.aktif ? '#0f172a' : '#64748b'
                            }}
                          >
                            {j.nama}
                          </span>
                          <span
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '12px',
                              background: j.aktif ? '#dcfce7' : '#e2e8f0',
                              color: j.aktif ? '#15803d' : '#64748b'
                            }}
                          >
                            {j.aktif ? 'Aktif' : 'Nonaktif'}
                          </span>
                        </div>
                        {j.deskripsi && (
                          <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>
                            {j.deskripsi}
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {/* Delete button if not the standard default */}
                      {['inden', 'reguler', 'terpadu', 'afirmasi', 'prestasi', 'mandiri'].indexOf(j.id) === -1 && (
                        <button
                          type="button"
                          onClick={() => handleDeleteJalur(j.id, j.nama)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#ef4444',
                            cursor: 'pointer',
                            padding: '6px',
                            fontSize: '0.85rem'
                          }}
                          title="Hapus jalur ini"
                        >
                          <i className="fas fa-trash-alt"></i>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Custom Track Form */}
              <div style={{ marginTop: '16px' }}>
                {!showAddForm ? (
                  <button
                    type="button"
                    onClick={() => setShowAddForm(true)}
                    style={{
                      background: '#f8fafc',
                      border: '1.5px dashed #cbd5e1',
                      color: '#047857',
                      padding: '10px',
                      borderRadius: '10px',
                      width: '100%',
                      fontWeight: 700,
                      fontSize: '0.86rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                  >
                    <i className="fas fa-plus-circle"></i> Tambah Jalur Pendaftaran Baru
                  </button>
                ) : (
                  <div
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #cbd5e1',
                      borderRadius: '12px',
                      padding: '14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px'
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#1e293b' }}>
                      Tambah Jalur Baru
                    </div>
                    <input
                      type="text"
                      placeholder="Nama jalur (contoh: Tahfidz / Gelombang 2)"
                      value={newJalurNama}
                      onChange={e => setNewJalurNama(e.target.value)}
                      style={{
                        padding: '8px 12px',
                        border: '1px solid #cbd5e1',
                        borderRadius: '8px',
                        fontSize: '0.88rem',
                        outline: 'none'
                      }}
                    />
                    <input
                      type="text"
                      placeholder="Deskripsi singkat (opsional)"
                      value={newJalurDeskripsi}
                      onChange={e => setNewJalurDeskripsi(e.target.value)}
                      style={{
                        padding: '8px 12px',
                        border: '1px solid #cbd5e1',
                        borderRadius: '8px',
                        fontSize: '0.88rem',
                        outline: 'none'
                      }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddForm(false);
                          setNewJalurNama('');
                          setNewJalurDeskripsi('');
                        }}
                        style={{
                          background: '#e2e8f0',
                          border: 'none',
                          padding: '6px 14px',
                          borderRadius: '6px',
                          fontSize: '0.82rem',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        Batal
                      </button>
                      <button
                        type="button"
                        onClick={handleAddJalur}
                        style={{
                          background: '#047857',
                          color: 'white',
                          border: 'none',
                          padding: '6px 14px',
                          borderRadius: '6px',
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        Tambahkan
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid #e2e8f0',
            background: '#f8fafc',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '10px'
          }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            style={{
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              padding: '9px 18px',
              borderRadius: '8px',
              fontSize: '0.88rem',
              fontWeight: 600,
              cursor: 'pointer',
              color: '#334155'
            }}
          >
            Tutup
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loading}
            style={{
              background: '#047857',
              color: 'white',
              border: 'none',
              padding: '9px 20px',
              borderRadius: '8px',
              fontSize: '0.88rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 2px 4px rgba(4, 120, 87, 0.2)'
            }}
          >
            {saving ? (
              <>
                <i className="fas fa-spinner fa-spin"></i>
                <span>Menyimpan...</span>
              </>
            ) : (
              <>
                <i className="fas fa-save"></i>
                <span>Simpan Pengaturan</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
