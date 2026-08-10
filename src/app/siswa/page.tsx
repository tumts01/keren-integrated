'use client';
import { useState, useEffect, useRef, useMemo } from 'react';
import styles from './Siswa.module.css';
import * as XLSX from 'xlsx';

interface Siswa {
  id: number;
  nis: string;
  nisn: string;
  nik: string;
  tempatLahir: string;
  tanggalLahir: string;
  nama: string;
  foto?: string;
  jenisKelamin: string;
  rombel: string;
  status: string;
  domisili: string;
  alamat: string;
  namaAyah: string;
  namaIbu: string;
  pekerjaanAyah: string;
  pekerjaanIbu: string;
  noHp: string;
  tahunAjaran: string;
  isLatest: boolean;
}


// ===== CETAK PRESENSI MODAL =====
function PrintPresensiModal({
  allData,
  onClose,
}: {
  allData: Siswa[];
  onClose: () => void;
}) {
  const [tingkat, setTingkat] = useState<string>('7');
  const [tglMulai, setTglMulai] = useState<string>('');
  const [tglSelesai, setTglSelesai] = useState<string>('');
  const [semester, setSemester] = useState<string>('GANJIL');
  const [tahunAjaran, setTahunAjaran] = useState<string>('2026/2027');

  const handlePrint = () => {
    if (!tglMulai || !tglSelesai) {
      alert('Pilih tanggal mulai dan tanggal selesai');
      return;
    }

    const activeData = allData.filter(s =>
      ['aktif'].includes(s.status.toLowerCase().trim()) && s.isLatest && s.rombel.startsWith(tingkat)
    );

    const grouped: Record<string, Siswa[]> = {};
    activeData.forEach(s => {
      if (!grouped[s.rombel]) grouped[s.rombel] = [];
      grouped[s.rombel].push(s);
    });

    const rombels = Object.keys(grouped).sort();
    if (rombels.length === 0) {
      alert('Tidak ada data siswa aktif untuk tingkat ini');
      return;
    }

    const dates: Date[] = [];
    let d = new Date(tglMulai);
    const end = new Date(tglSelesai);
    while (d <= end && dates.length < 6) {
      if (d.getDay() !== 0) {
        dates.push(new Date(d));
      }
      d.setDate(d.getDate() + 1);
    }

    if (dates.length === 0) {
      alert('Rentang tanggal tidak valid (atau hanya berisi hari Minggu)');
      return;
    }

    const getCols = (day: number) => {
      if (day === 5) return 8; // Jumat
      if (day === 6) return 9; // Sabtu
      return 10;
    };

    const tglMulaiStr = new Date(tglMulai).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    const tglSelesaiStr = new Date(tglSelesai).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

    let printHtml = '';

    rombels.forEach((rombel, rIndex) => {
      const siswaList = grouped[rombel].sort((a, b) => a.nama.localeCompare(b.nama));
      
      let tableHtml = `
        <table class="main-table">
          <thead>
            <tr>
              <th rowspan="2" style="width: 25px;">No</th>
              <th rowspan="2" style="width: 200px; text-align: center;">NAMA</th>
              <th rowspan="2" style="width: 20px;">L<br/>P</th>
      `;

      dates.forEach(date => {
        const dayName = date.toLocaleDateString('id-ID', { weekday: 'long' }).toUpperCase();
        const shortDate = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear().toString().slice(-2)}`;
        const cols = getCols(date.getDay());
        tableHtml += `<th colspan="${cols}">${dayName} (${shortDate})</th>`;
      });
      tableHtml += `</tr><tr>`;

      dates.forEach(date => {
        const cols = getCols(date.getDay());
        for (let i = 1; i <= cols; i++) {
          tableHtml += `<th style="width:12px; font-size:7pt; padding:1px;">${i}</th>`;
        }
      });
      tableHtml += `</tr></thead><tbody>`;

      siswaList.forEach((s, i) => {
        const jk = s.jenisKelamin?.toLowerCase().startsWith('l') ? 'L' : 'P';
        tableHtml += `
          <tr>
            <td style="text-align: center; font-size: 8pt;">${i + 1}</td>
            <td style="text-align: left; padding: 2px 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 200px; font-size: 8pt;">${s.nama}</td>
            <td style="text-align: center; font-size: 8pt;">${jk}</td>
        `;
        dates.forEach(date => {
          const cols = getCols(date.getDay());
          for (let j = 1; j <= cols; j++) {
            tableHtml += `<td style="padding:0;"></td>`;
          }
        });
        tableHtml += `</tr>`;
      });

      tableHtml += `</tbody></table>`;

      printHtml += `
        <div class="page">
          <div class="header">
            <h3>PRESENSI KELAS ${rombel}</h3>
            <h3>MTS ALMAARIF 01 SINGOSARI</h3>
            <h3>TAHUN AJARAN ${tahunAjaran}</h3>
          </div>
          <div class="sub-header">
            <div>SEMESTER: ${semester}</div>
            <div>${tglMulaiStr} s.d. ${tglSelesaiStr}</div>
          </div>
          ${tableHtml}
        </div>
      `;
      if (rIndex < rombels.length - 1) {
        printHtml += `<div style="page-break-after: always;"></div>`;
      }
    });

    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <html>
      <head>
        <title>Presensi Kelas</title>
        <style>
          @page { size: 330mm 215mm landscape; margin: 10mm; }
          body { font-family: 'Arial', sans-serif; font-size: 9pt; margin: 0; padding: 0; }
          .page { width: 100%; box-sizing: border-box; }
          .header { text-align: center; margin-bottom: 10px; }
          .header h3 { margin: 0; font-size: 12pt; font-weight: bold; }
          .sub-header { display: flex; justify-content: space-between; font-weight: bold; font-size: 9pt; margin-bottom: 5px; text-transform: uppercase; }
          table.main-table { width: 100%; border-collapse: collapse; }
          table.main-table th, table.main-table td { border: 1px solid black; padding: 2px; text-align: center; height: 27px; }
          table.main-table th { font-weight: bold; }
          @media print { body { -webkit-print-color-adjust: exact; } }
        </style>
      </head>
      <body>
        ${printHtml}
      </body>
      </html>
    `);
    win.document.close();
    setTimeout(() => win.print(), 500);
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalCard} style={{ maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2><i className="fas fa-print"></i> Cetak Presensi Kelas</h2>
          <button className={styles.closeBtn} onClick={onClose}><i className="fas fa-times"></i></button>
        </div>
        <div className={styles.modalBody} style={{ padding: '20px', display: 'block' }}>
          
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '0.9rem' }}>Tingkat Kelas</label>
            <select value={tingkat} onChange={e => setTingkat(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
              <option value="7">Kelas 7</option>
              <option value="8">Kelas 8</option>
              <option value="9">Kelas 9</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '0.9rem' }}>Tanggal Mulai</label>
              <input type="date" value={tglMulai} onChange={e => setTglMulai(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '0.9rem' }}>Tanggal Selesai</label>
              <input type="date" value={tglSelesai} onChange={e => setTglSelesai(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '0.9rem' }}>Semester</label>
              <select value={semester} onChange={e => setSemester(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                <option value="GANJIL">Ganjil</option>
                <option value="GENAP">Genap</option>
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '0.9rem' }}>Tahun Ajaran</label>
              <input type="text" value={tahunAjaran} onChange={e => setTahunAjaran(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
            </div>
          </div>

          <button onClick={handlePrint} className="btn btn-primary" style={{ width: '100%', padding: '12px', background: 'linear-gradient(135deg,#10b981,#059669)', borderColor: '#10b981' }}>
            <i className="fas fa-print" style={{ marginRight: '8px' }}></i> Cetak Absensi
          </button>
        </div>
      </div>
    </div>
  );
}

// ===== CETAK MODAL (print langsung dari halaman) =====

// ===== TAMBAH SISWA MUTASI MASUK MODAL =====
function TambahMutasiModal({ onClose, onSuccess, allData }: { onClose: () => void; onSuccess: () => void; allData: Siswa[] }) {
  const tahunSekarang = new Date().getFullYear();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    nis: '', nisn: '', nik: '', nama: '', jenisKelamin: 'L',
    tempatLahir: '', tanggalLahir: '', domisili: 'Pesantren',
    asalSekolah: '', rombel: '', tahunAjaran: `${tahunSekarang}/${tahunSekarang + 1}`,
    kelas: '7',
    namaAyah: '', namaIbu: '', pekerjaanAyah: '', pekerjaanIbu: '',
    noHpAyah: '', noHpIbu: '', alamat: '',
    noSuratMutasiMasuk: '', sekolahSebelumnya: '', npsnSekolahSebelumnya: '',
    tanggalMutasiMasuk: ''
  });
  const [submitStatus, setSubmitStatus] = useState<{type: 'success' | 'error', message: string} | null>(null);

  useEffect(() => {
    let maxNis = 0;
    allData.forEach(s => {
      if (s.nis) {
        const nisNum = parseInt(s.nis, 10);
        if (!isNaN(nisNum) && nisNum > maxNis) {
          maxNis = nisNum;
        }
      }
    });
    if (maxNis > 0) {
      setForm(f => ({ ...f, nis: String(maxNis + 1) }));
    }
  }, [allData]);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nama.trim() || !form.rombel.trim()) {
      setSubmitStatus({ type: 'error', message: 'Nama dan Rombel/Kelas wajib diisi!' });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/siswa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        setSubmitStatus({ type: 'success', message: 'Siswa mutasi masuk berhasil ditambahkan!' });
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 2000);
      } else {
        setSubmitStatus({ type: 'error', message: data.error || 'Terjadi kesalahan saat menyimpan.' });
      }
    } catch {
      setSubmitStatus({ type: 'error', message: 'Koneksi gagal, silakan periksa internet Anda dan coba lagi.' });
    } finally {
      setSaving(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px', borderRadius: '10px',
    border: '1px solid #cbd5e1', fontSize: '0.9rem', boxSizing: 'border-box'
  };
  const labelStyle: React.CSSProperties = {
    display: 'block', fontWeight: 600, fontSize: '0.8rem',
    color: '#475569', marginBottom: '4px'
  };
  const sectionStyle: React.CSSProperties = {
    background: '#f8fafc', borderRadius: '12px', padding: '16px',
    marginBottom: '16px', border: '1px solid #e2e8f0'
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '16px'
    }}>
      <div style={{
        background: '#fff', borderRadius: '20px', width: '100%', maxWidth: '680px',
        maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 50px rgba(0,0,0,0.25)'
      }}>
        {/* Header */}
        <div style={{
          position: 'sticky', top: 0, background: 'linear-gradient(135deg,#0ea5e9,#0284c7)',
          padding: '20px 24px', borderRadius: '20px 20px 0 0', color: 'white', zIndex: 1
        }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem' }}>
            <i className="fas fa-user-plus" style={{ marginRight: 10 }}></i>
            Tambah Siswa Mutasi Masuk
          </h3>
          <p style={{ margin: '4px 0 0', fontSize: '0.8rem', opacity: 0.85 }}>
            Data akan ditambahkan di baris paling atas sheet DATABASE
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>

          {/* DATA PRIBADI */}
          <div style={sectionStyle}>
            <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: 12, fontSize: '0.9rem' }}>
              <i className="fas fa-id-card" style={{ marginRight: 8, color: '#0ea5e9' }}></i>Data Pribadi
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={labelStyle}>Nama Lengkap <span style={{color:'#ef4444'}}>*</span></label>
                <input style={inputStyle} value={form.nama} onChange={e=>set('nama',e.target.value)} placeholder="Nama lengkap siswa" required />
              </div>
              <div>
                <label style={labelStyle}>NIS / ID Siswa</label>
                <input style={inputStyle} value={form.nis} onChange={e=>set('nis',e.target.value)} placeholder="contoh: 2024001" />
              </div>
              <div>
                <label style={labelStyle}>NISN</label>
                <input style={inputStyle} value={form.nisn} onChange={e=>set('nisn',e.target.value)} placeholder="10 digit" />
              </div>
              <div>
                <label style={labelStyle}>NIK</label>
                <input style={inputStyle} value={form.nik} onChange={e=>set('nik',e.target.value)} placeholder="16 digit" />
              </div>
              <div>
                <label style={labelStyle}>Jenis Kelamin</label>
                <select style={inputStyle} value={form.jenisKelamin} onChange={e=>set('jenisKelamin',e.target.value)}>
                  <option value="LAKI-LAKI">Laki-laki</option>
                  <option value="PEREMPUAN">Perempuan</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Tempat Lahir</label>
                <input style={inputStyle} value={form.tempatLahir} onChange={e=>set('tempatLahir',e.target.value)} placeholder="Malang" />
              </div>
              <div>
                <label style={labelStyle}>Tanggal Lahir</label>
                <input type="date" style={inputStyle} value={form.tanggalLahir} onChange={e=>set('tanggalLahir',e.target.value)} />
              </div>
            </div>
          </div>

          {/* DATA MUTASI */}
          <div style={sectionStyle}>
            <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: 12, fontSize: '0.9rem' }}>
              <i className="fas fa-exchange-alt" style={{ marginRight: 8, color: '#0ea5e9' }}></i>Data Mutasi
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={labelStyle}>Tanggal Mutasi Masuk</label>
                <input type="date" style={inputStyle} value={form.tanggalMutasiMasuk} onChange={e=>set('tanggalMutasiMasuk',e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Nomor Surat Mutasi Masuk</label>
                <input style={inputStyle} value={form.noSuratMutasiMasuk} onChange={e=>set('noSuratMutasiMasuk',e.target.value)} placeholder="No. Surat Mutasi" />
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={labelStyle}>SMP/MTs Sebelumnya</label>
                <input style={inputStyle} value={form.sekolahSebelumnya} onChange={e=>set('sekolahSebelumnya',e.target.value)} placeholder="Nama Sekolah Sebelumnya" />
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={labelStyle}>NPSN/NSS/NSM SMP/MTs Sebelumnya</label>
                <input style={inputStyle} value={form.npsnSekolahSebelumnya} onChange={e=>set('npsnSekolahSebelumnya',e.target.value)} placeholder="NPSN Sekolah Sebelumnya" />
              </div>
            </div>
          </div>

          {/* DATA SEKOLAH */}
          <div style={sectionStyle}>
            <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: 12, fontSize: '0.9rem' }}>
              <i className="fas fa-school" style={{ marginRight: 8, color: '#0ea5e9' }}></i>Data Sekolah
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={labelStyle}>Masuk Kelas <span style={{color:'#ef4444'}}>*</span></label>
                <select style={inputStyle} value={form.kelas} onChange={e=>set('kelas',e.target.value)}>
                  <option value="7">Kelas 7</option>
                  <option value="8">Kelas 8</option>
                  <option value="9">Kelas 9</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Rombel / Kelas <span style={{color:'#ef4444'}}>*</span></label>
                <input style={inputStyle} value={form.rombel} onChange={e=>set('rombel',e.target.value.toUpperCase())} placeholder="contoh: 7A, 8B" required />
              </div>
              <div>
                <label style={labelStyle}>Tahun Ajaran</label>
                <input style={inputStyle} value={form.tahunAjaran} onChange={e=>set('tahunAjaran',e.target.value)} placeholder="2026/2027" />
              </div>
              <div>
                <label style={labelStyle}>Asal Sekolah</label>
                <input style={inputStyle} value={form.asalSekolah} onChange={e=>set('asalSekolah',e.target.value)} placeholder="SD/MI Asal" />
              </div>
              <div>
                <label style={labelStyle}>Domisili</label>
                <select style={inputStyle} value={form.domisili} onChange={e=>set('domisili',e.target.value)}>
                  <option value="Pesantren">Pesantren</option>
                  <option value="Rumah">Rumah</option>
                </select>
              </div>
            </div>
          </div>

          {/* DATA ORANG TUA */}
          <div style={sectionStyle}>
            <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: 12, fontSize: '0.9rem' }}>
              <i className="fas fa-users" style={{ marginRight: 8, color: '#0ea5e9' }}></i>Data Orang Tua / Wali
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={labelStyle}>Nama Ayah</label>
                <input style={inputStyle} value={form.namaAyah} onChange={e=>set('namaAyah',e.target.value)} placeholder="Nama ayah kandung" />
              </div>
              <div>
                <label style={labelStyle}>Nama Ibu</label>
                <input style={inputStyle} value={form.namaIbu} onChange={e=>set('namaIbu',e.target.value)} placeholder="Nama ibu kandung" />
              </div>
              <div>
                <label style={labelStyle}>Pekerjaan Ayah</label>
                <input style={inputStyle} value={form.pekerjaanAyah} onChange={e=>set('pekerjaanAyah',e.target.value)} placeholder="Wiraswasta, PNS, dll" />
              </div>
              <div>
                <label style={labelStyle}>Pekerjaan Ibu</label>
                <input style={inputStyle} value={form.pekerjaanIbu} onChange={e=>set('pekerjaanIbu',e.target.value)} placeholder="Wiraswasta, IRT, dll" />
              </div>
              <div>
                <label style={labelStyle}>No. HP Ayah</label>
                <input style={inputStyle} value={form.noHpAyah} onChange={e=>set('noHpAyah',e.target.value)} placeholder="08xxxxxxxxxx" />
              </div>
              <div>
                <label style={labelStyle}>No. HP Ibu</label>
                <input style={inputStyle} value={form.noHpIbu} onChange={e=>set('noHpIbu',e.target.value)} placeholder="08xxxxxxxxxx" />
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={labelStyle}>Alamat</label>
                <textarea style={{...inputStyle, resize:'vertical', minHeight:72}} value={form.alamat} onChange={e=>set('alamat',e.target.value)} placeholder="Alamat lengkap" />
              </div>
            </div>
          </div>

          {/* FOOTER */}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose}
              style={{ padding: '10px 24px', borderRadius: 10, border: '1px solid #cbd5e1', background: '#f1f5f9', cursor: 'pointer', fontWeight: 600 }}>
              Batal
            </button>
            <button type="submit" disabled={saving}
              style={{ padding: '10px 28px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#0ea5e9,#0284c7)', color: 'white', cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 700, opacity: saving ? 0.7 : 1 }}>
              {saving ? <><i className="fas fa-spinner fa-spin" style={{marginRight:8}}></i>Menyimpan...</> : <><i className="fas fa-save" style={{marginRight:8}}></i>Simpan Data</>}
            </button>
          </div>

        </form>
      </div>

      {/* SUCCESS / ERROR POPUP */}
      {submitStatus && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            background: '#fff', padding: '32px', borderRadius: '24px', textAlign: 'center', maxWidth: '400px', width: '90%',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', transform: 'scale(1)', transition: 'transform 0.3s'
          }}>
            <div style={{
              width: '80px', height: '80px', borderRadius: '50%', margin: '0 auto 20px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: submitStatus.type === 'success' ? '#dcfce7' : '#fee2e2',
              color: submitStatus.type === 'success' ? '#22c55e' : '#ef4444',
              fontSize: '40px'
            }}>
              <i className={`fas ${submitStatus.type === 'success' ? 'fa-check' : 'fa-exclamation'}`}></i>
            </div>
            <h3 style={{ margin: '0 0 12px', fontSize: '1.5rem', color: '#0f172a' }}>
              {submitStatus.type === 'success' ? 'Berhasil!' : 'Oops, Gagal!'}
            </h3>
            <p style={{ margin: '0 0 24px', color: '#64748b', lineHeight: '1.5' }}>
              {submitStatus.message}
            </p>
            {submitStatus.type === 'error' && (
              <button 
                onClick={() => setSubmitStatus(null)}
                style={{
                  width: '100%', padding: '12px', borderRadius: '12px', border: 'none',
                  background: '#f1f5f9', color: '#0f172a', fontWeight: 600, cursor: 'pointer',
                  fontSize: '1rem'
                }}
              >
                Tutup
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function PrintSiswaModal({
  allData,
  onClose,
}: {
  allData: Siswa[];
  onClose: () => void;
}) {
  const [mode, setMode] = useState<'angkatan' | 'kelas' | 'manual'>('angkatan');
  const [angkatan, setAngkatan] = useState<string>('7');
  const [kelas, setKelas] = useState<string>('');
  const [manualSearch, setManualSearch] = useState<string>('');
  const [selectedManual, setSelectedManual] = useState<Siswa[]>([]);
  const printRef = useRef<HTMLDivElement>(null);

  // Kelas unik dari data aktif
  const activeData = allData.filter(s =>
    ['aktif'].includes(s.status.toLowerCase().trim()) && s.isLatest
  );
  const kelasList = Array.from(new Set(activeData.map(s => s.rombel).filter(Boolean))).sort();

  // Data yang akan dicetak
  const selectedData = useMemo(() => {
    if (mode === 'angkatan') {
      return activeData.filter(s => s.rombel.startsWith(angkatan)).sort((a, b) => a.rombel.localeCompare(b.rombel) || a.nama.localeCompare(b.nama));
    } else if (mode === 'kelas') {
      return activeData.filter(s => s.rombel === kelas).sort((a, b) => a.nama.localeCompare(b.nama));
    } else {
      return selectedManual;
    }
  }, [mode, angkatan, kelas, selectedManual, activeData]);

  const searchResults = useMemo(() => {
    if (!manualSearch.trim()) return [];
    const searchLower = manualSearch.toLowerCase();
    return activeData.filter(s => 
      !selectedManual.some(sm => sm.id === s.id) &&
      (s.nama.toLowerCase().includes(searchLower) || (s.nisn && s.nisn.includes(searchLower)))
    ).slice(0, 8);
  }, [manualSearch, activeData, selectedManual]);

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;
    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) return;

    // Hitung ukuran baris agar 1 kelas = 1 halaman A4
    // A4 usable: ~774pt (273mm). Overhead title+subtitle+header = ~70pt
    const maxCount = mode === 'angkatan'
      ? Math.max(...Object.values(groupedByKelas).map(l => l.length), 1)
      : Math.max(selectedData.length, 1);
    const availablePt = 774 - (mode === 'angkatan' ? 88 : 70);
    const rowHeightPt = Math.min(availablePt / maxCount, 20);
    const fontSizePt  = Math.max(Math.min(rowHeightPt * 0.60, 9), 6);
    const paddingPt   = Math.max((rowHeightPt - fontSizePt * 1.2) / 2, 1);
    const titlePt     = Math.min(fontSizePt + 1.5, 10);
    const subPt       = Math.max(fontSizePt - 0.5, 6);

    win.document.write(`<!DOCTYPE html><html><head>
      <title>Daftar Siswa</title>
      <style>
        @page { size: A4 portrait; margin: 12mm 10mm; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: Arial, sans-serif; font-size: ${fontSizePt}pt; font-weight: 400; color: #000; }
        .doc-title { text-align: center; font-size: ${titlePt}pt; font-weight: 600; text-transform: uppercase; margin-bottom: 2px; }
        .doc-sub { text-align: center; font-size: ${subPt}pt; color: #333; margin-bottom: 6px; }
        table { width: 100%; border-collapse: collapse; font-size: ${fontSizePt}pt; }
        thead { display: table-header-group; }
        th { background: #f0f0f0; padding: ${paddingPt}pt 5pt; font-weight: 600; text-align: left; border: 1px solid #999; }
        td { padding: ${paddingPt}pt 5pt; border: 1px solid #bbb; vertical-align: middle; height: ${rowHeightPt}pt; }
        .col-no { width: 26pt; text-align: center; }
        .col-nama { width: 55%; }
        .group-header td { background: #e8e8e8; font-weight: 600; font-size: ${subPt}pt; padding: ${Math.max(paddingPt - 1, 1)}pt 5pt; border: 1px solid #999; }
        .page-section { page-break-after: always; }
        .page-section:last-child { page-break-after: avoid; }
        @media print { body { -webkit-print-color-adjust: exact; } }
      </style>
    </head><body>${content.innerHTML}</body></html>`);
    win.document.close();
    setTimeout(() => { win.focus(); win.print(); }, 400);
  };

  const handleExportExcel = () => {
    if (mode === 'angkatan') {
      // Export per angkatan: 1 sheet per kelas
      const wb = XLSX.utils.book_new();
      Object.entries(groupedByKelas).sort(([a], [b]) => a.localeCompare(b)).forEach(([rombel, list]) => {
        const rows = list.map((s, i) => ({
          'No': i + 1,
          'Nama Siswa': s.nama,
          'NIS': s.nis,
          'NISN': s.nisn,
          'NIK': s.nik,
          'Jenis Kelamin': s.jenisKelamin,
          'Tempat Lahir': s.tempatLahir,
          'Tanggal Lahir': s.tanggalLahir,
          'Kelas': s.rombel,
          'Alamat': s.alamat,
          'No. HP / WA': s.noHp,
          'Nama Ayah': s.namaAyah,
          'Nama Ibu': s.namaIbu,
          'Tahun Ajaran': s.tahunAjaran,
        }));
        const ws = XLSX.utils.json_to_sheet(rows);
        XLSX.utils.book_append_sheet(wb, ws, `Kelas ${rombel}`);
      });
      XLSX.writeFile(wb, `Daftar_Siswa_Angkatan_${angkatan}_${new Date().toISOString().slice(0,10)}.xlsx`);
    } else {
      // Export per kelas: 1 sheet
      const rows = selectedData.map((s, i) => ({
        'No': i + 1,
        'Nama Siswa': s.nama || '',
        'NIS': s.nis || '',
        'NISN': s.nisn || '',
        'NIK': s.nik || '',
        'Jenis Kelamin': s.jenisKelamin || '',
        'Tempat Lahir': s.tempatLahir || '',
        'Tanggal Lahir': s.tanggalLahir || '',
        'Kelas': s.rombel || '',
        'Domisili': s.domisili || '',
        'Alamat': s.alamat || '',
        'No. HP / WA': s.noHp || '',
        'Nama Ayah': s.namaAyah || '',
        'Nama Ibu': s.namaIbu || '',
        'Tahun Ajaran': s.tahunAjaran || '',
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, mode === 'manual' ? 'Daftar Manual' : `Kelas ${kelas}`);
      XLSX.writeFile(wb, `Daftar_Siswa_${mode === 'manual' ? 'Manual' : kelas}_${new Date().toISOString().slice(0,10)}.xlsx`);
    }
  };

  // Group by kelas jika angkatan
  const groupedByKelas: Record<string, Siswa[]> = {};
  if (mode === 'angkatan') {
    selectedData.forEach(s => {
      if (!groupedByKelas[s.rombel]) groupedByKelas[s.rombel] = [];
      groupedByKelas[s.rombel].push(s);
    });
  }

  const today = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  const judulCetak = mode === 'angkatan' ? `Kelas ${angkatan}` : mode === 'kelas' ? `Kelas ${kelas}` : 'Daftar Input Manual';

  return (
    <div className={styles.printModalOverlay} onClick={onClose}>
      <div className={styles.printModalCard} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.printModalHeader}>
          <div>
            <h3><i className="fas fa-print"></i> Cetak Daftar Siswa</h3>
            <p>Pilih mode cetak dan klik tombol cetak</p>
          </div>
          <button className={styles.printModalClose} onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* Opsi */}
        <div className={styles.printModalBody}>
          <div className={styles.printModeRow}>
            <button
              className={`${styles.printModeBtn} ${mode === 'angkatan' ? styles.printModeBtnActive : ''}`}
              onClick={() => setMode('angkatan')}
            >
              <i className="fas fa-layer-group"></i>
              <span>Per Angkatan</span>
              <small>Cetak semua kelas dalam 1 tingkat</small>
            </button>
            <button
              className={`${styles.printModeBtn} ${mode === 'kelas' ? styles.printModeBtnActive : ''}`}
              onClick={() => setMode('kelas')}
            >
              <i className="fas fa-chalkboard-teacher"></i>
              <span>Per Kelas</span>
              <small>Cetak 1 kelas tertentu saja</small>
            </button>
            <button
              className={`${styles.printModeBtn} ${mode === 'manual' ? styles.printModeBtnActive : ''}`}
              onClick={() => setMode('manual')}
            >
              <i className="fas fa-keyboard"></i>
              <span>Input Manual</span>
              <small>Cetak dari ketikan nama</small>
            </button>
          </div>

          {mode === 'angkatan' ? (
            <div className={styles.printSelectRow}>
              <label>Pilih Angkatan:</label>
              <div className={styles.angkatanBtns}>
                {['7', '8', '9'].map(a => (
                  <button
                    key={a}
                    className={`${styles.angkatanBtn} ${angkatan === a ? styles.angkatanBtnActive : ''}`}
                    onClick={() => setAngkatan(a)}
                  >
                    Kelas {a}
                    <small>{activeData.filter(s => s.rombel.startsWith(a)).length} siswa</small>
                  </button>
                ))}
              </div>
            </div>
          ) : mode === 'kelas' ? (
            <div className={styles.printSelectRow}>
              <label>Pilih Kelas:</label>
              <div className={styles.kelasBtns}>
                {kelasList.map(k => (
                  <button
                    key={k}
                    className={`${styles.kelasBtn} ${kelas === k ? styles.kelasBtnActive : ''}`}
                    onClick={() => setKelas(k)}
                  >
                    {k}
                    <small>{activeData.filter(s => s.rombel === k).length}</small>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className={styles.printSelectRow} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label>Pilih Siswa <span style={{color: '#ef4444'}}>*</span></label>
              
              {selectedManual.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '8px' }}>
                  {selectedManual.map((s, idx) => (
                    <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                      <div>
                        <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.9rem' }}>{idx + 1}. {s.nama.toUpperCase()}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>{s.rombel} ({s.domisili || 'RUMAH'})</div>
                      </div>
                      <button 
                        onClick={() => setSelectedManual(prev => prev.filter(item => item.id !== s.id))}
                        style={{ background: '#f1f5f9', border: 'none', width: '32px', height: '32px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0f172a' }}
                      >
                        <i className="fas fa-times"></i>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  value={manualSearch}
                  onChange={e => setManualSearch(e.target.value)}
                  placeholder="Cari dan klik siswa untuk ditambahkan..."
                  style={{ width: '100%', padding: '12px 16px', borderRadius: '24px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                />
                
                {manualSearch.trim() !== '' && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', marginTop: '4px', zIndex: 10, boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', maxHeight: '200px', overflowY: 'auto' }}>
                    {searchResults.length > 0 ? (
                      searchResults.map(s => (
                        <div 
                          key={s.id} 
                          onClick={() => { setSelectedManual(prev => [...prev, s]); setManualSearch(''); }}
                          style={{ padding: '10px 16px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', display: 'flex', flexDirection: 'column' }}
                          onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          <span style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.85rem' }}>{s.nama}</span>
                          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Kelas {s.rombel}</span>
                        </div>
                      ))
                    ) : (
                      <div style={{ padding: '12px 16px', fontSize: '0.85rem', color: '#64748b', textAlign: 'center' }}>Tidak ada siswa yang cocok</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className={styles.printPreviewInfo}>
            <i className="fas fa-info-circle"></i>
            <span>
              {selectedData.length} siswa akan dicetak
              {mode === 'kelas' && !kelas ? ' — pilih kelas terlebih dahulu' : ''}
              {mode === 'manual' && selectedManual.length === 0 ? ' — pilih minimal 1 siswa' : ''}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className={styles.printModalFooter}>
          <button className={styles.printCancelBtn} onClick={onClose}>
            Batal
          </button>
          <button
            className={styles.printExcelBtn}
            onClick={handleExportExcel}
            disabled={mode === 'kelas' && !kelas}
          >
            <i className="fas fa-file-excel"></i> Export Excel
          </button>
          <button
            className={styles.printConfirmBtn}
            onClick={handlePrint}
            disabled={(mode === 'kelas' && !kelas) || (mode === 'manual' && selectedManual.length === 0)}
          >
            <i className="fas fa-print"></i> Cetak Sekarang
          </button>
        </div>

        {/* Hidden print content */}
        <div style={{ display: 'none' }}>
          <div ref={printRef}>

            {mode === 'angkatan' ? (
              // Setiap kelas = 1 halaman
              Object.entries(groupedByKelas).sort(([a], [b]) => a.localeCompare(b)).map(([rombel, siswaList]) => (
                <div key={rombel} className="page-section">
                  <div className="doc-title">Daftar Siswa — Kelas {rombel}</div>
                  <div className="doc-sub">
                    Tahun Ajaran {activeData[0]?.tahunAjaran || '2026/2027'} &nbsp;|&nbsp; Dicetak: {today} &nbsp;|&nbsp; {siswaList.length} Siswa
                  </div>
                  <table>
                    <thead>
                      <tr>
                        <th className="col-no">No</th>
                        <th className="col-nama">Nama Siswa</th>
                        <th className="col-ket">Keterangan</th>
                      </tr>
                    </thead>
                    <tbody>
                      {siswaList.map((s, i) => (
                        <tr key={s.id}>
                          <td className="col-no">{i + 1}</td>
                          <td className="col-nama">{s.nama}</td>
                          <td className="col-ket"></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))
            ) : (
              // Single kelas = 1 halaman
              <div className="page-section">
                <div className="doc-title">Daftar Siswa — Kelas {kelas}</div>
                <div className="doc-sub">
                  Tahun Ajaran {activeData[0]?.tahunAjaran || '2026/2027'} &nbsp;|&nbsp; Dicetak: {today} &nbsp;|&nbsp; {selectedData.length} Siswa
                </div>
                <table>
                  <thead>
                    <tr>
                      <th className="col-no">No</th>
                      <th className="col-nama">Nama Siswa</th>
                      {mode === 'manual' ? (
                        <>
                          <th className="col-kelas" style={{ width: '20%' }}>Kelas</th>
                          <th className="col-domisili" style={{ width: '25%' }}>Domisili</th>
                        </>
                      ) : (
                        <th className="col-ket">Keterangan</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {selectedData.map((s, i) => (
                      <tr key={s.id || i}>
                        <td className="col-no">{i + 1}</td>
                        <td className="col-nama">{s.nama}</td>
                        {mode === 'manual' ? (
                          <>
                            <td className="col-kelas">{s.rombel}</td>
                            <td className="col-domisili">{s.domisili}</td>
                          </>
                        ) : (
                          <td className="col-ket"></td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SiswaPage() {
  const [data, setData] = useState<Siswa[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedSiswa, setSelectedSiswa] = useState<Siswa | null>(null);
  const [selectedTahun, setSelectedTahun] = useState<string>('Semua');
  const [selectedTingkat, setSelectedTingkat] = useState<string>('Semua');
  const [selectedRombel, setSelectedRombel] = useState<string>('Semua');
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showPresensiModal, setShowPresensiModal] = useState(false);
  const [showMutasiModal, setShowMutasiModal] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/siswa');
        const result = await res.json();
        if (result.success) {
          setData(result.data);
          const tahunList = Array.from(new Set(result.data.map((s: Siswa) => s.tahunAjaran).filter(Boolean))) as string[];
          if (tahunList.length > 0) {
            tahunList.sort((a, b) => b.localeCompare(a));
            setSelectedTahun(tahunList[0]);
          }
        } else {
          setError(result.error);
        }
      } catch (err) {
        setError('Gagal memuat data. Periksa koneksi internet Anda.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const uniqueTahun = Array.from(new Set(data.map(s => s.tahunAjaran).filter(Boolean))).sort((a, b) => b.localeCompare(a));

  const uniqueRombel = Array.from(new Set(
    data.filter(s => 
      (selectedTahun === 'Semua' ? s.isLatest : s.tahunAjaran === selectedTahun) && 
      (selectedTingkat === 'Semua' ? true : s.rombel.startsWith(selectedTingkat))
    ).map(s => (s.rombel || '').trim()).filter(Boolean)
  )).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  const filteredData = data.filter(s => {
    const matchSearch = s.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        s.nisn.includes(searchTerm) ||
                        s.rombel.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (s.domisili || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchTahun = selectedTahun === 'Semua' ? s.isLatest : s.tahunAjaran === selectedTahun;
    const matchTingkat = selectedTingkat === 'Semua' ? true : s.rombel.startsWith(selectedTingkat);
    const matchRombel = selectedRombel === 'Semua' ? true : (s.rombel || '').trim() === selectedRombel;
    return matchSearch && matchTahun && matchTingkat && matchRombel;
  });

  const statsData = data.filter(s => selectedTahun === 'Semua' ? s.isLatest : s.tahunAjaran === selectedTahun);
  const activeData = statsData.filter(s => ['aktif'].includes(s.status.toLowerCase().trim()));
  const nonActiveData = statsData.filter(s => !['aktif'].includes(s.status.toLowerCase().trim()) && s.status.trim() !== '');

  const totalSiswa = activeData.length;
  const totalLaki = activeData.filter(s => s.jenisKelamin.toLowerCase().includes('laki')).length;
  const totalPr = activeData.filter(s => s.jenisKelamin.toLowerCase().includes('perempuan')).length;

  const totalKelas7Aktif = activeData.filter(s => s.rombel.startsWith('7')).length;
  const totalKelas8Aktif = activeData.filter(s => s.rombel.startsWith('8')).length;
  const totalKelas9Aktif = activeData.filter(s => s.rombel.startsWith('9')).length;

  const totalKelas7Non = nonActiveData.filter(s => s.rombel.startsWith('7')).length;
  const totalKelas8Non = nonActiveData.filter(s => s.rombel.startsWith('8')).length;
  const totalKelas9Non = nonActiveData.filter(s => s.rombel.startsWith('9')).length;

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentData = filteredData.slice(startIndex, startIndex + itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedTahun, selectedTingkat]);

  const handleExportExcel = () => {
    const dataToExport = filteredData.map((s, index) => ({
      'No': index + 1,
      'NIS': s.nis,
      'NISN': s.nisn,
      'NIK': s.nik,
      'Nama Lengkap': s.nama,
      'Jenis Kelamin': s.jenisKelamin,
      'Tempat Lahir': s.tempatLahir,
      'Tanggal Lahir': s.tanggalLahir,
      'Rombel/Kelas': s.rombel,
      'Status': s.status,
      'Tahun Ajaran': s.tahunAjaran,
      'Domisili': s.domisili,
      'Alamat': s.alamat,
      'Nama Ayah': s.namaAyah,
      'Pekerjaan Ayah': s.pekerjaanAyah,
      'Nama Ibu': s.namaIbu,
      'Pekerjaan Ibu': s.pekerjaanIbu,
      'No. HP / WA': s.noHp
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data Siswa');
    worksheet['!cols'] = [
      { wch: 5 }, { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 35 },
      { wch: 15 }, { wch: 20 }, { wch: 15 }, { wch: 12 },
      { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 40 },
      { wch: 25 }, { wch: 20 }, { wch: 25 }, { wch: 20 }, { wch: 18 }
    ];
    XLSX.writeFile(workbook, `Data_Siswa_${selectedTahun === 'Semua' ? 'All' : selectedTahun}.xlsx`);
  };

  const handleExportMissingNisnNik = () => {
    const missingData = filteredData.filter(s => !s.nisn || s.nisn.trim() === '' || !s.nik || s.nik.trim() === '');
    if (missingData.length === 0) {
      alert('Tidak ada siswa dengan NISN atau NIK kosong pada filter saat ini.');
      return;
    }

    let rowsHtml = '';
    missingData.forEach((s, i) => {
      rowsHtml += `
        <tr>
          <td>${i + 1}</td>
          <td style="text-align: left; padding-left: 8px; font-weight: bold;">${s.nama}</td>
          <td>${s.rombel}</td>
          <td style="color: #ef4444; font-weight: bold;">${s.nisn || 'KOSONG'}</td>
          <td style="color: #ef4444; font-weight: bold;">${s.nik || 'KOSONG'}</td>
          <td style="text-align: left; padding-left: 8px;">${s.tempatLahir}, ${s.tanggalLahir}</td>
          <td style="text-align: left; padding-left: 8px;">${s.namaIbu}</td>
          <td>${s.status}</td>
        </tr>
      `;
    });

    const printHtml = `
      <html>
      <head>
        <title>Daftar Siswa NISN/NIK Kosong</title>
        <style>
          @page { size: 215mm 330mm portrait; margin: 15mm; }
          body { font-family: 'Arial', sans-serif; font-size: 10pt; margin: 0; padding: 0; }
          .header { text-align: center; margin-bottom: 20px; }
          .header h2 { margin: 0 0 5px 0; font-size: 14pt; font-weight: bold; text-transform: uppercase; }
          .header p { margin: 0; font-size: 10pt; color: #333; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid black; padding: 6px; text-align: center; font-size: 9pt; vertical-align: middle; }
          th { font-weight: bold; background-color: #f1f5f9; text-transform: uppercase; }
          @media print { body { -webkit-print-color-adjust: exact; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>DAFTAR SISWA DENGAN NISN/NIK KOSONG</h2>
          <p>Filter Tahun Ajaran: ${selectedTahun === 'Semua' ? 'Semua Tahun' : selectedTahun} | Filter Kelas: ${selectedTingkat === 'Semua' ? 'Semua' : selectedTingkat} - ${selectedRombel === 'Semua' ? 'Semua' : selectedRombel}</p>
        </div>
        <table>
          <thead>
            <tr>
              <th style="width: 30px;">No</th>
              <th>Nama Siswa</th>
              <th style="width: 60px;">Kelas</th>
              <th>NISN</th>
              <th>NIK</th>
              <th>Tempat, Tgl Lahir</th>
              <th>Nama Ibu</th>
              <th style="width: 60px;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </body>
      </html>
    `;

    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
    
    const iframeDoc = iframe.contentWindow?.document;
    if (iframeDoc) {
      iframeDoc.write(printHtml);
      iframeDoc.close();
      
      iframe.contentWindow?.focus();
      setTimeout(() => {
        iframe.contentWindow?.print();
        setTimeout(() => {
          document.body.removeChild(iframe);
        }, 1000);
      }, 500);
    }
  };

  return (
    <div className={styles.container}>
      {/* Print Modal */}
      {showPresensiModal && (
        <PrintPresensiModal allData={data} onClose={() => setShowPresensiModal(false)} />
      )}

      {showMutasiModal && (
        <TambahMutasiModal
          allData={data}
          onClose={() => setShowMutasiModal(false)}
          onSuccess={() => {
            // Refresh data setelah simpan
            fetch('/api/siswa').then(r => r.json()).then(result => {
              if (result.success) setData(result.data);
            });
          }}
        />
      )}
      {showPrintModal && (
        <PrintSiswaModal allData={data} onClose={() => setShowPrintModal(false)} />
      )}

      {selectedSiswa && (
        <div className={styles.modalOverlay} onClick={() => setSelectedSiswa(null)}>
          <div className={styles.modalCard} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2><i className="fas fa-id-card"></i> Detail Siswa</h2>
              <button className={styles.closeBtn} onClick={() => setSelectedSiswa(null)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className={styles.modalBody}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                <div className={styles.modalPhotoFrame}>
                  {selectedSiswa.foto ? (
                    <img src={selectedSiswa.foto.replace('=w200-h200', '=w400-h600')} alt="Profile" className={styles.modalPhoto} />
                  ) : (
                    <div style={{ fontSize: '4rem', fontWeight: 700, color: '#94a3b8' }}>
                      {selectedSiswa.nama.charAt(0).toUpperCase() || 'U'}
                    </div>
                  )}
                </div>
                {selectedSiswa.foto && (
                  <a 
                    href={selectedSiswa.foto.replace('=w200-h200', '=s2000')} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    style={{ 
                      fontSize: '0.8rem', 
                      color: '#3b82f6', 
                      textDecoration: 'none', 
                      background: '#eff6ff', 
                      padding: '6px 12px', 
                      borderRadius: '6px', 
                      fontWeight: 600,
                      border: '1px solid #bfdbfe',
                      textAlign: 'center',
                      display: 'block',
                      width: '150px'
                    }}
                  >
                    <i className="fas fa-external-link-alt"></i> Buka Foto
                  </a>
                )}
              </div>
              <div className={styles.modalInfo}>
                <div className={`${styles.infoGroup} ${styles.infoFull}`}>
                  <span className={styles.infoLabel}>Nama Lengkap</span>
                  <div className={styles.infoValue}>{selectedSiswa.nama || '-'}</div>
                </div>
                <div className={styles.infoGroup}>
                  <span className={styles.infoLabel}>NISN</span>
                  <div className={styles.infoValue}>{selectedSiswa.nisn || '-'}</div>
                </div>
                <div className={styles.infoGroup}>
                  <span className={styles.infoLabel}>Rombel / Kelas</span>
                  <div className={styles.infoValue}>{selectedSiswa.rombel || '-'}</div>
                </div>
                <div className={styles.infoGroup}>
                  <span className={styles.infoLabel}>Status</span>
                  <div className={styles.infoValue}>
                    <span className={`${styles.badge} ${['aktif'].includes(selectedSiswa.status.toLowerCase().trim()) ? styles.badgeAktif : styles.badgeNon}`}>
                      {selectedSiswa.status || '-'}
                    </span>
                  </div>
                </div>
                <div className={styles.infoGroup}>
                  <span className={styles.infoLabel}>Jenis Kelamin</span>
                  <div className={styles.infoValue}>{selectedSiswa.jenisKelamin || '-'}</div>
                </div>
                <div className={styles.infoGroup}>
                  <span className={styles.infoLabel}>No. HP / WA (Ortu)</span>
                  <div className={styles.infoValue}><i className="fab fa-whatsapp" style={{ color: '#22c55e', marginRight: '6px' }}></i> {selectedSiswa.noHp || '-'}</div>
                </div>
                <div className={`${styles.infoGroup} ${styles.infoFull}`}>
                  <span className={styles.infoLabel}>Nama Orang Tua</span>
                  <div className={styles.infoValue}>
                    Ayah: {selectedSiswa.namaAyah || '-'} <br/>
                    Ibu: {selectedSiswa.namaIbu || '-'}
                  </div>
                </div>
                <div className={`${styles.infoGroup} ${styles.infoFull}`}>
                  <span className={styles.infoLabel}>Domisili & Alamat</span>
                  <div className={styles.infoValue}>
                    <strong>{selectedSiswa.domisili || '-'}</strong> - {selectedSiswa.alamat || '-'}
                  </div>
                </div>
                <div className={styles.infoGroup}>
                  <span className={styles.infoLabel}>Tahun Ajaran</span>
                  <div className={styles.infoValue}>{selectedSiswa.tahunAjaran || '-'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className={styles.stickyTop}>
        <div className={styles.header}>
          <div className={styles.title}>
            <div className={styles.titleIcon}>
              <i className="fas fa-users"></i>
            </div>
            Data Siswa
          </div>

          <div className={styles.actions}>
            <select
              className={styles.filterSelect}
              value={selectedTahun}
              onChange={(e) => setSelectedTahun(e.target.value)}
            >
              <option value="Semua">Semua Tahun Ajaran</option>
              {uniqueTahun.map(tahun => (
                <option key={tahun} value={tahun}>{tahun}</option>
              ))}
            </select>
            <select
              className={styles.filterSelect}
              value={selectedTingkat}
              onChange={(e) => { setSelectedTingkat(e.target.value); setSelectedRombel('Semua'); }}
            >
              <option value="Semua">Semua Tingkat</option>
              <option value="7">Tingkat 7</option>
              <option value="8">Tingkat 8</option>
              <option value="9">Tingkat 9</option>
            </select>
            <select
              className={styles.filterSelect}
              value={selectedRombel}
              onChange={(e) => setSelectedRombel(e.target.value)}
            >
              <option value="Semua">Semua Rombel</option>
              {uniqueRombel.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            <div className={styles.searchBox}>
              <i className={`fas fa-search ${styles.searchIcon}`}></i>
              <input
                type="text"
                placeholder="Cari nama, NISN, kelas, atau domisili..."
                className={styles.searchInput}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button onClick={handleExportExcel} className="btn btn-gold" style={{ marginRight: '8px' }}>
              <i className="fas fa-file-excel"></i> Export Excel
            </button>
            <button onClick={handleExportMissingNisnNik} className="btn" style={{ marginRight: '8px', background: '#ef4444', color: 'white', borderColor: '#ef4444' }} title="Cetak data siswa yang NISN atau NIK nya kosong">
              <i className="fas fa-exclamation-circle"></i> Cek NISN/NIK Kosong
            </button>
            <button onClick={() => setShowPresensiModal(true)} className="btn btn-primary" style={{ background: "linear-gradient(135deg,#10b981,#059669)", borderColor: "#10b981", marginRight: "8px" }}>
              <i className="fas fa-calendar-check"></i> Cetak Absensi
            </button>
            <button onClick={() => setShowPrintModal(true)} className="btn btn-primary" style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', borderColor: '#7c3aed' }}>
              <i className="fas fa-print"></i> Cetak Daftar
            </button>
            <button onClick={() => setShowMutasiModal(true)} className="btn btn-primary" style={{ background: 'linear-gradient(135deg,#0ea5e9,#0284c7)', borderColor: '#0ea5e9' }}>
              <i className="fas fa-user-plus"></i> Mutasi Masuk
            </button>
          </div>
        </div>

        {!loading && !error && (
          <div className={styles.statsGrid}>
            <div className={styles.statCard} style={{ borderLeftColor: '#3b82f6' }}>
              <div className={styles.statIcon} style={{ color: '#3b82f6', background: '#eff6ff' }}>
                <i className="fas fa-user-graduate"></i>
              </div>
              <div className={styles.statInfo}>
                <span className={styles.statLabel}>Total Siswa Aktif</span>
                <span className={styles.statValue}>{totalSiswa}</span>
                <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px', lineHeight: '1.1', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <div>Kls 7: {totalKelas7Aktif} Aktif ({totalKelas7Non} Non)</div>
                  <div>Kls 8: {totalKelas8Aktif} Aktif ({totalKelas8Non} Non)</div>
                  <div>Kls 9: {totalKelas9Aktif} Aktif ({totalKelas9Non} Non)</div>
                </div>
              </div>
            </div>
            <div className={styles.statCard} style={{ borderLeftColor: '#10b981' }}>
              <div className={styles.statIcon} style={{ color: '#10b981', background: '#dcfce7' }}>
                <i className="fas fa-male"></i>
              </div>
              <div className={styles.statInfo}>
                <span className={styles.statLabel}>Laki-laki</span>
                <span className={styles.statValue}>{totalLaki}</span>
              </div>
            </div>
            <div className={styles.statCard} style={{ borderLeftColor: '#ec4899' }}>
              <div className={styles.statIcon} style={{ color: '#ec4899', background: '#fce7f3' }}>
                <i className="fas fa-female"></i>
              </div>
              <div className={styles.statInfo}>
                <span className={styles.statLabel}>Perempuan</span>
                <span className={styles.statValue}>{totalPr}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className={styles.card}>
        {loading ? (
          <div className={styles.loading}>
            <i className={`fas fa-circle-notch ${styles.spinner}`}></i>
            <p>Memuat Data Siswa dari Spreadsheet...</p>
          </div>
        ) : error ? (
          <div className={styles.loading} style={{ color: 'var(--danger)' }}>
            <i className="fas fa-exclamation-triangle" style={{ fontSize: '2rem' }}></i>
            <p>{error}</p>
          </div>
        ) : (
          <>
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Profil (Nama)</th>
                  <th>Status</th>
                  <th>NISN</th>
                  <th>NIK</th>
                  <th>Tempat Lahir</th>
                  <th>Tanggal Lahir</th>
                  <th>Jenis Kelamin</th>
                  <th>Rombel</th>
                  <th>Domisili</th>
                  <th>Alamat</th>
                  <th>Nama Ayah</th>
                  <th>Nama Ibu</th>
                  <th>No. WA</th>
                  <th>NRP</th>
                  <th>Tahun Ajaran</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {currentData.length > 0 ? (
                  currentData.map(siswa => (
                    <tr key={siswa.id}>
                      <td style={{ minWidth: '250px' }}>
                        <div className={styles.profileCell}>
                          {siswa.foto ? (
                            <img src={siswa.foto} alt="Profile" className={styles.avatar} style={{ objectFit: 'cover' }} />
                          ) : (
                            <div className={styles.avatar}>
                              {siswa.nama.charAt(0).toUpperCase() || 'U'}
                            </div>
                          )}
                          <div>
                            <span className={styles.nama}>{siswa.nama || '-'}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`${styles.badge} ${['aktif'].includes(siswa.status.toLowerCase().trim()) ? styles.badgeAktif : styles.badgeNon}`}>
                          {siswa.status || 'Tidak Diketahui'}
                        </span>
                      </td>
                      <td>{siswa.nisn || '-'}</td>
                      <td>{siswa.nik || '-'}</td>
                      <td>{siswa.tempatLahir || '-'}</td>
                      <td>{siswa.tanggalLahir || '-'}</td>
                      <td>{siswa.jenisKelamin || '-'}</td>
                      <td>{siswa.rombel || '-'}</td>
                      <td>{siswa.domisili || '-'}</td>
                      <td>{siswa.alamat || '-'}</td>
                      <td>{siswa.namaAyah || '-'}</td>
                      <td>{siswa.namaIbu || '-'}</td>
                      <td>{siswa.noHp || '-'}</td>
                      <td>{siswa.nrp || '-'}</td>
                      <td>{siswa.tahunAjaran || '-'}</td>
                      <td>
                        <button
                          className="btn btn-primary"
                          style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                          onClick={() => setSelectedSiswa(siswa)}
                        >
                          Detail
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={15} style={{ textAlign: 'center', padding: '40px' }}>
                      <i className="fas fa-folder-open" style={{ fontSize: '3rem', color: '#cbd5e1', marginBottom: '16px', display: 'block' }}></i>
                      Tidak ada data siswa yang ditemukan.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderTop: '1px solid #e2e8f0', background: '#f8fafc', borderBottomLeftRadius: '16px', borderBottomRightRadius: '16px' }}>
              <div style={{ fontSize: '0.85rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', outline: 'none', background: 'white', color: '#475569', cursor: 'pointer' }}
                >
                  <option value={10}>10 Baris</option>
                  <option value={25}>25 Baris</option>
                  <option value={50}>50 Baris</option>
                  <option value={75}>75 Baris</option>
                  <option value={100}>100 Baris</option>
                </select>
                <span>
                  Menampilkan {startIndex + 1} - {Math.min(startIndex + itemsPerPage, filteredData.length)} dari {filteredData.length} data
                </span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  style={{ padding: '6px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', background: currentPage === 1 ? '#f1f5f9' : 'white', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', color: '#475569' }}
                >
                  Sebelumnya
                </button>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  style={{ padding: '6px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', background: currentPage === totalPages ? '#f1f5f9' : 'white', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', color: '#475569' }}
                >
                  Selanjutnya
                </button>
              </div>
            </div>
          )}
        </>
        )}
      </div>
    </div>
  );
}
