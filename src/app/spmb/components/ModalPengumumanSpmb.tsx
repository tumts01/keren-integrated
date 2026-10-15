'use client';
import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';

interface ModalPengumumanSpmbProps {
  isOpen: boolean;
  onClose: () => void;
  jalurList?: string[];
}

export default function ModalPengumumanSpmb({ isOpen, onClose, jalurList = [] }: ModalPengumumanSpmbProps) {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form states
  const [judul, setJudul] = useState('');
  const [pesan, setPesan] = useState('');
  const [targetJalur, setTargetJalur] = useState('Semua Jalur');

  useEffect(() => {
    if (isOpen) {
      fetchPengumuman();
    }
  }, [isOpen]);

  const fetchPengumuman = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/spmb/pengumuman');
      const resJson = await res.json();
      if (resJson.success) {
        setList(resJson.all || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSimpan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!judul.trim() || !pesan.trim()) {
      Swal.fire('Perhatian', 'Judul dan isi pengumuman tidak boleh kosong!', 'warning');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/spmb/pengumuman', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ judul, pesan, targetJalur })
      });

      const resJson = await res.json();
      if (resJson.success) {
        Swal.fire({
          icon: 'success',
          title: 'Berhasil!',
          text: `Pengumuman berhasil dipublikasikan untuk "${targetJalur}".`,
          timer: 2000,
          showConfirmButton: false
        });
        setJudul('');
        setPesan('');
        setTargetJalur('Semua Jalur');
        fetchPengumuman();
      } else {
        Swal.fire('Gagal', resJson.error || 'Gagal menyimpan pengumuman', 'error');
      }
    } catch (err: any) {
      Swal.fire('Error', 'Gagal menghubungi server', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, itemJudul: string) => {
    const confirm = await Swal.fire({
      title: 'Hapus Pengumuman?',
      text: `Yakin ingin menghapus "${itemJudul}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal'
    });

    if (confirm.isConfirmed) {
      try {
        const res = await fetch(`/api/spmb/pengumuman?id=${id}`, { method: 'DELETE' });
        const resJson = await res.json();
        if (resJson.success) {
          setList(prev => prev.filter(item => item.id !== id));
          Swal.fire('Terhapus', 'Pengumuman telah dihapus', 'success');
        } else {
          Swal.fire('Gagal', resJson.error || 'Gagal menghapus pengumuman', 'error');
        }
      } catch (e) {
        Swal.fire('Error', 'Gagal menghubungi server', 'error');
      }
    }
  };

  if (!isOpen) return null;

  // Options list: 'Semua Jalur' + all jalur available
  const availableJalur = ['Semua Jalur', ...jalurList.filter(j => j && j !== 'Semua Jalur')];
  if (!availableJalur.includes('Reguler')) availableJalur.push('Reguler');
  if (!availableJalur.includes('Inden')) availableJalur.push('Inden');
  if (!availableJalur.includes('Prestasi')) availableJalur.push('Prestasi');

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000,
      padding: '16px'
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '20px',
        width: '100%',
        maxWidth: '720px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        overflow: 'hidden'
      }}>
        {/* Modal Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#f8fafc'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: '#ecfdf5',
              color: '#047857',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px'
            }}>
              <i className="fas fa-bullhorn"></i>
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
                Pengumuman Calon Siswa SPMB
              </h3>
              <p style={{ margin: 0, fontSize: '12.5px', color: '#64748b' }}>
                Kirim pengumuman ke seluruh pendaftar atau khusus jalur tertentu
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '20px',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '6px'
            }}
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          
          {/* Form Buat Pengumuman */}
          <form onSubmit={handleSimpan} style={{
            background: '#f8fafc',
            border: '1.5px solid #e2e8f0',
            borderRadius: '16px',
            padding: '20px',
            marginBottom: '24px'
          }}>
            <h4 style={{ margin: '0 0 14px 0', fontSize: '14px', fontWeight: 800, color: '#064e3b', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="fas fa-plus-circle"></i> Buat Pengumuman Baru
            </h4>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px', marginBottom: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Judul Pengumuman
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Jadwal Observasi & Wawancara"
                  value={judul}
                  onChange={e => setJudul(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '13.5px',
                    boxSizing: 'border-box',
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Target Jalur Pendaftaran
                </label>
                <select
                  value={targetJalur}
                  onChange={e => setTargetJalur(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '13.5px',
                    boxSizing: 'border-box',
                    fontWeight: 600,
                    outline: 'none',
                    background: 'white',
                    cursor: 'pointer'
                  }}
                >
                  {availableJalur.map(j => (
                    <option key={j} value={j}>{j}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Isi Pengumuman / Pesan
              </label>
              <textarea
                rows={3}
                placeholder="Tuliskan isi pengumuman atau instruksi untuk calon siswa / wali murid..."
                value={pesan}
                onChange={e => setPesan(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '13.5px',
                  boxSizing: 'border-box',
                  outline: 'none',
                  resize: 'vertical',
                  fontFamily: 'inherit'
                }}
              />
            </div>

            <div style={{ textAlign: 'right' }}>
              <button
                type="submit"
                disabled={saving}
                style={{
                  background: saving ? '#94a3b8' : '#047857',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '10px',
                  fontSize: '13.5px',
                  fontWeight: 700,
                  cursor: saving ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 2px 6px rgba(4, 120, 87, 0.25)'
                }}
              >
                {saving ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i>
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <i className="fas fa-paper-plane"></i>
                    Publikasikan Pengumuman
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Daftar Pengumuman Aktif */}
          <div>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '14.5px', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="fas fa-list-alt" style={{ color: '#047857' }}></i>
              Daftar Pengumuman SPMB Aktif ({list.length})
            </h4>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                <i className="fas fa-spinner fa-spin" style={{ fontSize: '1.5rem', marginBottom: '8px' }}></i>
                <div>Memuat daftar pengumuman...</div>
              </div>
            ) : list.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1', color: '#64748b' }}>
                <i className="fas fa-bell-slash" style={{ fontSize: '2rem', marginBottom: '8px', color: '#cbd5e1' }}></i>
                <div>Belum ada pengumuman yang dibuat. Silakan gunakan form di atas untuk membuat pengumuman baru.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {list.map(item => (
                  <div
                    key={item.id}
                    style={{
                      background: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      padding: '16px',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '8px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                          <span style={{
                            background: item.targetJalur === 'Semua Jalur' ? '#dcfce7' : '#fef3c7',
                            color: item.targetJalur === 'Semua Jalur' ? '#15803d' : '#b45309',
                            border: `1px solid ${item.targetJalur === 'Semua Jalur' ? '#86efac' : '#fde68a'}`,
                            padding: '2px 8px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 800
                          }}>
                            {item.targetJalur === 'Semua Jalur' ? 'Semua Jalur' : `Khusus Jalur: ${item.targetJalur}`}
                          </span>
                          <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                            {item.tanggal} &bull; {item.jam}
                          </span>
                        </div>
                        <h5 style={{ margin: 0, fontSize: '14.5px', fontWeight: 800, color: '#0f172a' }}>
                          {item.judul}
                        </h5>
                      </div>

                      <button
                        onClick={() => handleDelete(item.id, item.judul)}
                        title="Hapus Pengumuman"
                        style={{
                          background: '#fee2e2',
                          border: 'none',
                          color: '#ef4444',
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          fontSize: '13px'
                        }}
                      >
                        <i className="fas fa-trash-alt"></i>
                      </button>
                    </div>

                    <p style={{ margin: 0, fontSize: '13px', color: '#475569', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                      {item.pesan}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Modal Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid #e2e8f0',
          textAlign: 'right',
          background: '#f8fafc'
        }}>
          <button
            onClick={onClose}
            style={{
              background: '#f1f5f9',
              border: '1px solid #cbd5e1',
              color: '#334155',
              padding: '8px 18px',
              borderRadius: '8px',
              fontSize: '13.5px',
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
