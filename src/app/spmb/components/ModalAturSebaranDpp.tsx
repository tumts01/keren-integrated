'use client';

import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { SebaranKomponen } from '../pembayaran/page';

interface ModalAturSebaranDppProps {
  isOpen: boolean;
  onClose: () => void;
  initialKomponen: SebaranKomponen[];
  onSaveSuccess: (updated: SebaranKomponen[]) => void;
}

export default function ModalAturSebaranDpp({
  isOpen,
  onClose,
  initialKomponen,
  onSaveSuccess
}: ModalAturSebaranDppProps) {
  const [list, setList] = useState<SebaranKomponen[]>([]);
  const [newNama, setNewNama] = useState('');
  const [newNominal, setNewNominal] = useState<number>(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setList(initialKomponen.length > 0 ? JSON.parse(JSON.stringify(initialKomponen)) : []);
      setNewNama('');
      setNewNominal(0);
    }
  }, [isOpen, initialKomponen]);

  if (!isOpen) return null;

  const formatRupiah = (val: number) => {
    return (val || 0).toLocaleString('id-ID');
  };

  const totalNominal = list.reduce((acc, curr) => acc + (Number(curr.nominal) || 0), 0);
  const targetDpp = 4500000;
  const selisihTarget = totalNominal - targetDpp;

  const handleNominalChange = (index: number, val: number) => {
    setList(prev => {
      const next = [...prev];
      next[index] = { ...next[index], nominal: Math.max(0, val) };
      return next;
    });
  };

  const handleNamaChange = (index: number, val: string) => {
    setList(prev => {
      const next = [...prev];
      next[index] = { ...next[index], nama: val };
      return next;
    });
  };

  const handleDelete = (index: number) => {
    setList(prev => prev.filter((_, i) => i !== index));
  };

  const handleAdd = () => {
    if (!newNama.trim()) {
      Swal.fire('Perhatian', 'Nama komponen tidak boleh kosong.', 'warning');
      return;
    }
    const newId = `komp_${Date.now()}`;
    setList(prev => [
      ...prev,
      {
        id: newId,
        nama: newNama.trim(),
        nominal: Math.max(0, newNominal)
      }
    ]);
    setNewNama('');
    setNewNominal(0);
  };

  const handleResetDefault = () => {
    Swal.fire({
      title: 'Kembalikan ke Default?',
      text: 'Komponen akan direset ke 5 pos anggaran standar (Total Rp 4.500.000).',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#059669',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'Ya, Reset',
      cancelButtonText: 'Batal'
    }).then((result) => {
      if (result.isConfirmed) {
        setList([
          { id: 'seragam', nama: 'Seragam & Atribut Madrasah', nominal: 1250000 },
          { id: 'sarpras', nama: 'Sarana Prasarana / Gedung', nominal: 1450000 },
          { id: 'kitab', nama: 'Kitab Kuning & Modul Belajar', nominal: 700000 },
          { id: 'kegiatan', nama: 'MOS, Matsama & Karakter', nominal: 600000 },
          { id: 'spp1', nama: 'SPP Bulan Pertama (Juli)', nominal: 500000 }
        ]);
      }
    });
  };

  const handleSave = async () => {
    if (list.length === 0) {
      Swal.fire('Perhatian', 'Minimal harus ada 1 komponen sebaran DPP.', 'warning');
      return;
    }

    try {
      setSaving(true);
      const res = await fetch('/api/spmb/pembayaran/sebaran-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ komponen: list })
      });

      const json = await res.json();
      if (json.success) {
        Swal.fire({
          icon: 'success',
          title: 'Berhasil Disimpan',
          text: 'Konfigurasi pos plotting sebaran DPP telah diperbarui.',
          timer: 1800,
          showConfirmButton: false
        });
        onSaveSuccess(json.komponen || list);
        onClose();
      } else {
        Swal.fire('Gagal Menyimpan', json.error || 'Terjadi kesalahan sistem.', 'error');
      }
    } catch (err: any) {
      Swal.fire('Error', 'Gagal menghubungi server: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 99999,
      padding: '16px'
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '680px',
        maxHeight: '92vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        overflow: 'hidden'
      }}>
        {/* Header Modal */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#f8fafc'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: '#eff6ff',
              color: '#2563eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '17px'
            }}>
              <i className="fas fa-sliders-h"></i>
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                Atur Kolom &amp; Komponen Sebaran DPP
              </h3>
              <p style={{ margin: 0, fontSize: '11px', color: '#64748b' }}>
                Tentukan nama kolom plotting dan nominal alokasi default (Rp 4.500.000)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '20px',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '4px'
            }}
          >
            &times;
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Status Kalkulasi Target */}
          <div style={{
            background: selisihTarget === 0 ? '#ecfdf5' : '#fffbeb',
            border: `1.5px solid ${selisihTarget === 0 ? '#a7f3d0' : '#fde68a'}`,
            borderRadius: '12px',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '10px'
          }}>
            <div>
              <div style={{ fontSize: '12px', color: '#475569', fontWeight: 600 }}>
                Total Akumulasi Komponen Default:
              </div>
              <div style={{ fontSize: '18px', fontWeight: 900, color: selisihTarget === 0 ? '#047857' : '#b45309' }}>
                Rp {formatRupiah(totalNominal)}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '11px', color: '#64748b' }}>Standar DPP: Rp {formatRupiah(targetDpp)}</div>
              {selisihTarget === 0 ? (
                <span style={{ background: '#dcfce7', color: '#15803d', padding: '3px 8px', borderRadius: '6px', fontSize: '11.5px', fontWeight: 700 }}>
                  <i className="fas fa-check-circle"></i> Pas (Rp 4.500.000)
                </span>
              ) : selisihTarget > 0 ? (
                <span style={{ background: '#fee2e2', color: '#b91c1c', padding: '3px 8px', borderRadius: '6px', fontSize: '11.5px', fontWeight: 700 }}>
                  Lebih: +Rp {formatRupiah(selisihTarget)}
                </span>
              ) : (
                <span style={{ background: '#fef3c7', color: '#b45309', padding: '3px 8px', borderRadius: '6px', fontSize: '11.5px', fontWeight: 700 }}>
                  Kurang: -Rp {formatRupiah(Math.abs(selisihTarget))}
                </span>
              )}
            </div>
          </div>

          {/* List Komponen Aktif */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>
                Daftar Kolom Ploting Aktif ({list.length} Komponen)
              </label>
              <button
                type="button"
                onClick={handleResetDefault}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  padding: '3px 8px',
                  fontSize: '11.5px',
                  color: '#475569',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                <i className="fas fa-undo"></i> Reset Default
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {list.map((item, idx) => (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: '#f8fafc',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0'
                  }}
                >
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', width: '22px' }}>
                    #{idx + 1}
                  </span>
                  <input
                    type="text"
                    value={item.nama}
                    onChange={e => handleNamaChange(idx, e.target.value)}
                    placeholder="Nama Komponen..."
                    style={{
                      flex: 2,
                      padding: '7px 10px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      outline: 'none'
                    }}
                  />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1.2 }}>
                    <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Rp</span>
                    <input
                      type="number"
                      step="25000"
                      min="0"
                      value={item.nominal}
                      onChange={e => handleNominalChange(idx, Number(e.target.value) || 0)}
                      style={{
                        width: '100%',
                        padding: '7px 10px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        fontSize: '13px',
                        fontWeight: 600,
                        outline: 'none'
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(idx)}
                    style={{
                      background: '#fee2e2',
                      border: 'none',
                      color: '#ef4444',
                      padding: '7px 10px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '13px'
                    }}
                    title="Hapus Komponen"
                  >
                    <i className="fas fa-trash-alt"></i>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Form Tambah Komponen Baru */}
          <div style={{
            background: '#f1f5f9',
            borderRadius: '10px',
            padding: '12px 14px',
            border: '1.5px dashed #cbd5e1'
          }}>
            <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
              <i className="fas fa-plus-circle"></i> Tambah Kolom Ploting Baru
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="Contoh: Tabungan / Outbound / dll."
                value={newNama}
                onChange={e => setNewNama(e.target.value)}
                style={{
                  flex: 2,
                  minWidth: '180px',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  outline: 'none'
                }}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1.2, minWidth: '140px' }}>
                <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Rp</span>
                <input
                  type="number"
                  step="25000"
                  min="0"
                  placeholder="Nominal (Rp)"
                  value={newNominal === 0 ? '' : newNominal}
                  onChange={e => setNewNominal(Number(e.target.value) || 0)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    outline: 'none'
                  }}
                />
              </div>
              <button
                type="button"
                onClick={handleAdd}
                style={{
                  background: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '8px 16px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Tambah
              </button>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div style={{
          padding: '14px 20px',
          borderTop: '1px solid #e2e8f0',
          background: '#ffffff',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '10px'
        }}>
          <button
            onClick={onClose}
            disabled={saving}
            style={{
              background: '#f1f5f9',
              border: 'none',
              padding: '9px 16px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              color: '#64748b',
              cursor: 'pointer'
            }}
          >
            Batal
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              background: '#059669',
              border: 'none',
              padding: '9px 20px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 700,
              color: '#ffffff',
              cursor: saving ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 6px rgba(5, 150, 105, 0.3)'
            }}
          >
            {saving ? (
              <>
                <i className="fas fa-spinner fa-spin"></i> Menyimpan...
              </>
            ) : (
              <>
                <i className="fas fa-save"></i> Simpan Konfigurasi
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
