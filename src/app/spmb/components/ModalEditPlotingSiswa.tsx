'use client';

import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { SebaranKomponen } from '../pembayaran/page';

interface ModalEditPlotingSiswaProps {
  isOpen: boolean;
  onClose: () => void;
  student: any;
  komponenList: SebaranKomponen[];
  onSaveSuccess: (updatedStudent: any) => void;
}

export default function ModalEditPlotingSiswa({
  isOpen,
  onClose,
  student,
  komponenList,
  onSaveSuccess
}: ModalEditPlotingSiswaProps) {
  const [allocations, setAllocations] = useState<{ [key: string]: number }>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (student && isOpen) {
      const initial: { [key: string]: number } = {};
      const existing = student.sebaranDpp || {};

      komponenList.forEach(k => {
        if (existing[k.id] !== undefined) {
          initial[k.id] = Number(existing[k.id]) || 0;
        } else {
          initial[k.id] = Number(k.nominal) || 0;
        }
      });
      setAllocations(initial);
    }
  }, [student, isOpen, komponenList]);

  if (!isOpen || !student) return null;

  const biaya = student.biayaDaftarUlang !== undefined && student.biayaDaftarUlang !== '' 
    ? Number(student.biayaDaftarUlang) 
    : 4500000;
  const potongan = Number(student.potonganDaftarUlang || 0);
  const tagihan = Math.max(0, biaya - potongan);
  const dibayar = Number(student.nominalDibayarDaftarUlang || 0);
  // Kolom Uang DPP disesuaikan dengan uang yang sudah masuk/bayar
  const uangDpp = dibayar;

  const totalAlokasi = Object.values(allocations).reduce((acc, curr) => acc + (Number(curr) || 0), 0);
  const selisih = uangDpp - totalAlokasi;

  const formatRupiah = (val: number) => {
    return (val || 0).toLocaleString('id-ID');
  };

  const handleChange = (id: string, val: number) => {
    setAllocations(prev => ({
      ...prev,
      [id]: Math.max(0, val)
    }));
  };

  const handleResetToDefault = () => {
    const resetObj: { [key: string]: number } = {};
    komponenList.forEach(k => {
      resetObj[k.id] = Number(k.nominal) || 0;
    });
    setAllocations(resetObj);
  };

  const handleApplyProportional = () => {
    const defaultSum = komponenList.reduce((acc, curr) => acc + (Number(curr.nominal) || 0), 0);
    if (defaultSum === 0) return;

    const ratio = uangDpp / defaultSum;
    const propObj: { [key: string]: number } = {};
    let runningSum = 0;

    komponenList.forEach((k, idx) => {
      if (idx === komponenList.length - 1) {
        // Elemen terakhir mengambil sisa pembulatan agar total tepat sama dengan uangDpp
        propObj[k.id] = Math.max(0, uangDpp - runningSum);
      } else {
        const rounded = Math.round((k.nominal * ratio) / 1000) * 1000;
        propObj[k.id] = rounded;
        runningSum += rounded;
      }
    });

    setAllocations(propObj);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const res = await fetch(`/api/spmb/${student.rowNumber}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sebaranDpp: allocations
        })
      });

      const json = await res.json();
      if (json.success) {
        Swal.fire({
          icon: 'success',
          title: 'Ploting Berhasil Disimpan',
          text: `Alokasi sebaran DPP untuk ${student.namaLengkap} telah disimpan.`,
          timer: 1800,
          showConfirmButton: false
        });
        onSaveSuccess({
          ...student,
          sebaranDpp: allocations
        });
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
        maxWidth: '560px',
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
          <div>
            <h3 style={{ margin: 0, fontSize: '15.5px', fontWeight: 800, color: '#0f172a' }}>
              Edit Ploting DPP Siswa
            </h3>
            <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
              {student.namaLengkap} ({student.nomorPendaftaran})
            </p>
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
          {/* Info Uang DPP & Selisih */}
          <div style={{
            background: '#f8fafc',
            border: '1.5px solid #e2e8f0',
            borderRadius: '12px',
            padding: '12px 16px',
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '10px',
            textAlign: 'center'
          }}>
            <div>
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Uang DPP Masuk</div>
              <div style={{ fontSize: '14.5px', fontWeight: 800, color: '#047857' }}>
                Rp {formatRupiah(uangDpp)}
              </div>
              {tagihan !== uangDpp && (
                <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>
                  Tagihan: Rp {formatRupiah(tagihan)}
                </div>
              )}
            </div>
            <div>
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Total Terploting</div>
              <div style={{ fontSize: '14.5px', fontWeight: 800, color: '#2563eb' }}>
                Rp {formatRupiah(totalAlokasi)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Selisih</div>
              <div style={{
                fontSize: '14.5px',
                fontWeight: 800,
                color: selisih === 0 ? '#15803d' : selisih > 0 ? '#b45309' : '#b91c1c'
              }}>
                {selisih === 0 ? 'Pas (0)' : `Rp ${formatRupiah(selisih)}`}
              </div>
            </div>
          </div>

          {/* Quick Buttons */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={handleResetToDefault}
              style={{
                background: '#f1f5f9',
                border: '1px solid #cbd5e1',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                color: '#334155',
                cursor: 'pointer'
              }}
            >
              <i className="fas fa-undo"></i> Gunakan Nilai Standar
            </button>
            {uangDpp > 0 && (
              <button
                type="button"
                onClick={handleApplyProportional}
                style={{
                  background: '#ecfdf5',
                  border: '1px solid #a7f3d0',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#047857',
                  cursor: 'pointer'
                }}
              >
                <i className="fas fa-percentage"></i> Alokasi Proporsional (Sesuai Uang Masuk)
              </button>
            )}
          </div>

          {/* Input per Komponen */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {komponenList.map((k) => (
              <div
                key={k.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  padding: '8px 12px',
                  background: '#f8fafc',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0'
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>{k.nama}</div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Standar: Rp {formatRupiah(k.nominal)}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', width: '170px' }}>
                  <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Rp</span>
                  <input
                    type="number"
                    step="25000"
                    min="0"
                    value={allocations[k.id] ?? k.nominal}
                    onChange={e => handleChange(k.id, Number(e.target.value) || 0)}
                    style={{
                      width: '100%',
                      padding: '7px 10px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13.5px',
                      fontWeight: 700,
                      outline: 'none'
                    }}
                  />
                </div>
              </div>
            ))}
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
              gap: '6px'
            }}
          >
            {saving ? 'Menyimpan...' : 'Simpan Ploting'}
          </button>
        </div>
      </div>
    </div>
  );
}
