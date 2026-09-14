'use client';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

interface Siswa {
  nis: string;
  nisn: string;
  nik: string;
  nama: string;
  status: string;
  foto: string;
  jenisKelamin: string;
  tempatLahir: string;
  tanggalLahir: string;
  alamat: string;
  noHp: string;
  namaAyah: string;
  pekerjaanAyah: string;
  namaIbu: string;
  pekerjaanIbu: string;
  statusKeluarga: string;
  anakKe: string;
  asalSekolah: string;
  namaWali: string;
  pekerjaanWali: string;
  noHpWali: string;
  alamatWali: string;
  rombel: string;
  tanggalDiterima: string;
  isLatest: boolean;
  rawMetadata: Record<string, string>;
}

export default function CetakIdentitasPage() {
  const params = useParams();
  const kelas = decodeURIComponent(params.kelas as string);
  const [siswaList, setSiswaList] = useState<Siswa[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/siswa');
        const data = await res.json();
        if (!data.success) throw new Error(data.error);

        // Filter by kelas (rombel), only latest record, and must be Aktif
        const filtered = data.data.filter((s: Siswa) => {
          const isAktif = s.status && s.status.toLowerCase().trim() === 'aktif';
          return s.isLatest && (s.rombel || '').toUpperCase() === kelas && isAktif;
        });

        // Sort by name
        filtered.sort((a: Siswa, b: Siswa) => a.nama.localeCompare(b.nama, 'id'));
        setSiswaList(filtered);
      } catch (err: any) {
        setError(err.message || 'Gagal memuat data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [kelas]);

  useEffect(() => {
    if (!loading && siswaList.length > 0) {
      setTimeout(() => window.print(), 800);
    }
  }, [loading, siswaList]);

  const getField = (s: Siswa, key: string): string => {
    const meta = s.rawMetadata || {};
    return meta[key] || '';
  };

  const formatDate = (str: string) => {
    if (!str) return '-';
    // Try to parse various formats
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    }
    return str;
  };

  if (loading) return (
    <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'Arial, sans-serif' }}>
      <div>Memuat data siswa kelas {kelas}...</div>
    </div>
  );

  if (error) return (
    <div style={{ padding: '40px', textAlign: 'center', color: 'red', fontFamily: 'Arial, sans-serif' }}>
      Error: {error}
    </div>
  );

  if (siswaList.length === 0) return (
    <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'Arial, sans-serif' }}>
      Tidak ada siswa aktif di kelas {kelas}
    </div>
  );

  return (
    <>
      <style>{`
        @page {
          size: A4 portrait;
          margin: 0;
        }
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        body {
          background: #fff;
          font-family: Arial, sans-serif;
        }
        .page {
          width: 210mm;
          min-height: 297mm;
          padding: 15mm 18mm 15mm 18mm;
          page-break-after: always;
          position: relative;
          background: #fff;
          overflow: hidden;
        }
        .page:last-child {
          page-break-after: avoid;
        }
        .title {
          text-align: center;
          font-size: 14pt;
          font-weight: bold;
          text-transform: uppercase;
          margin-bottom: 14px;
          letter-spacing: 1px;
        }
        .field-row {
          display: flex;
          align-items: flex-start;
          margin-bottom: 4px;
          font-size: 12pt;
          min-height: 24px;
        }
        .field-no {
          width: 22px;
          flex-shrink: 0;
          font-size: 12pt;
        }
        .field-label {
          width: 170px;
          flex-shrink: 0;
          font-size: 12pt;
        }
        .field-colon {
          width: 12px;
          flex-shrink: 0;
          text-align: center;
          font-size: 12pt;
        }
        .field-value {
          flex: 1;
          font-size: 12pt;
          font-weight: bold;
        }
        .sub-field-row {
          display: flex;
          align-items: flex-start;
          margin-bottom: 4px;
          font-size: 12pt;
          min-height: 24px;
        }
        .sub-indent {
          width: 30px;
          flex-shrink: 0;
        }
        .sub-label {
          width: 162px;
          flex-shrink: 0;
          font-size: 12pt;
        }
        .sub-colon {
          width: 12px;
          flex-shrink: 0;
          text-align: center;
          font-size: 12pt;
        }
        .sub-value {
          flex: 1;
          font-size: 12pt;
          font-weight: bold;
        }
        .section-label {
          display: flex;
          align-items: flex-start;
          margin-bottom: 4px;
          font-size: 12pt;
          min-height: 24px;
        }
        .divider {
          border: none;
          border-top: 1px solid #333;
          margin: 8px 0;
        }
        .bottom-area {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-top: 20px;
        }
        .foto-box {
          width: 40mm;
          height: 60mm;
          border: 2px solid #000;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          flex-shrink: 0;
        }
        .foto-box img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .sign-area {
          text-align: center;
          min-width: 220px;
        }
        .sign-date {
          font-size: 12pt;
          margin-bottom: 2px;
        }
        .sign-title {
          font-size: 12pt;
          margin-bottom: 4px;
        }
        .sign-img {
          height: 150px;
          margin-top: -10px;
          margin-bottom: -20px;
          object-fit: contain;
        }
        .sign-name {
          font-size: 12pt;
          font-weight: bold;
          text-decoration: underline;
        }
        .sign-nip {
          font-size: 12pt;
        }
        @media print {
          .no-print { display: none !important; }
          .page { page-break-after: always; }
        }
        @media screen {
          body { background: #ddd; }
          .page {
            box-shadow: 0 4px 16px rgba(0,0,0,0.15);
            margin: 24px auto;
          }
        }
      `}</style>

      <div className="no-print" style={{
        position: 'fixed', top: 0, left: 0, right: 0,
        background: '#1e293b', color: 'white',
        padding: '10px 20px', zIndex: 9999,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        fontSize: '14px'
      }}>
        <span>
          <i className="fas fa-id-card" style={{ marginRight: '8px' }}></i>
          Cetak Identitas Rapor – Kelas {kelas} ({siswaList.length} siswa)
        </span>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => window.print()} style={{
            background: '#10b981', color: 'white', border: 'none',
            padding: '6px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold'
          }}>
            🖨️ Print / Simpan PDF
          </button>
          <button onClick={() => window.history.back()} style={{
            background: '#64748b', color: 'white', border: 'none',
            padding: '6px 16px', borderRadius: '6px', cursor: 'pointer'
          }}>
            ← Kembali
          </button>
        </div>
      </div>

      <div style={{ paddingTop: '50px' }}>
        {siswaList.map((s, idx) => {
          const tanggalDiterimaRaw = getField(s, 'TANGGAL MASUK MTs/SMP') || s.tanggalDiterima || getField(s, 'TANGGAL DITERIMA') || getField(s, 'TANGGAL MULAI') || '';
          const kelasAwal = getField(s, 'ROMBEL KELAS 7') || getField(s, 'ROMBEL') || s.rombel || '';
          const asalSekolah = getField(s, 'SEKOLAH ASAL') || getField(s, 'SEKOLAH ASAL (SD/MI)') || s.asalSekolah || '';
          const statusKeluarga = getField(s, 'STATUS DALAM KELUARGA') || s.statusKeluarga || '';
          const anakKe = getField(s, 'ANAK KE') || s.anakKe || '';
          const namaWali = getField(s, 'NAMA WALI') || s.namaWali || '-';
          const pekerjaanWali = getField(s, 'PEKERJAAN WALI') || s.pekerjaanWali || '-';
          const noHpWali = getField(s, 'NOMOR TELEPON WALI') || getField(s, 'NOMOR HP WALI') || s.noHpWali || '-';
          const alamatWali = getField(s, 'ALAMAT WALI') || s.alamatWali || '-';
          const today = new Date();
          const todayStr = today.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

          return (
            <div key={s.nis || idx} className="page">
              <div className="title">Identitas Peserta Didik</div>

              {/* Row 1: Nama */}
              <div className="field-row">
                <span className="field-no">1.</span>
                <span className="field-label">Nama Lengkap</span>
                <span className="field-colon">:</span>
                <span className="field-value">{s.nama || '-'}</span>
              </div>

              {/* Row 2: NIS */}
              <div className="field-row">
                <span className="field-no">2.</span>
                <span className="field-label">NIS</span>
                <span className="field-colon">:</span>
                <span className="field-value">{s.nis || '-'}</span>
              </div>

              {/* Row 3: NISN */}
              <div className="field-row">
                <span className="field-no">3.</span>
                <span className="field-label">NISN</span>
                <span className="field-colon">:</span>
                <span className="field-value">{s.nisn || '-'}</span>
              </div>

              {/* Row 4: Jenis Kelamin */}
              <div className="field-row">
                <span className="field-no">4.</span>
                <span className="field-label">Jenis Kelamin</span>
                <span className="field-colon">:</span>
                <span className="field-value">{s.jenisKelamin || '-'}</span>
              </div>

              {/* Row 5: Tempat, Tanggal Lahir */}
              <div className="field-row">
                <span className="field-no">5.</span>
                <span className="field-label">Tempat, Tanggal Lahir</span>
                <span className="field-colon">:</span>
                <span className="field-value">
                  {s.tempatLahir && s.tanggalLahir ? `${s.tempatLahir}, ${s.tanggalLahir}` : (s.tempatLahir || s.tanggalLahir || '-')}
                </span>
              </div>

              {/* Row 6: NIK */}
              <div className="field-row">
                <span className="field-no">6.</span>
                <span className="field-label">NIK</span>
                <span className="field-colon">:</span>
                <span className="field-value">{s.nik || '-'}</span>
              </div>

              {/* Row 7: Status dalam Keluarga */}
              <div className="field-row">
                <span className="field-no">7.</span>
                <span className="field-label">Status dalam Keluarga</span>
                <span className="field-colon">:</span>
                <span className="field-value">{statusKeluarga || '-'}</span>
              </div>

              {/* Row 8: Anak ke */}
              <div className="field-row">
                <span className="field-no">8.</span>
                <span className="field-label">Anak ke</span>
                <span className="field-colon">:</span>
                <span className="field-value">{anakKe || '-'}</span>
              </div>

              {/* Row 9: Alamat */}
              <div className="field-row">
                <span className="field-no">9.</span>
                <span className="field-label">Alamat</span>
                <span className="field-colon">:</span>
                <span className="field-value">{s.alamat || '-'}</span>
              </div>

              {/* Row 10: Nomor Telepon */}
              <div className="field-row">
                <span className="field-no">10.</span>
                <span className="field-label">Nomor Telepon</span>
                <span className="field-colon">:</span>
                <span className="field-value">{s.noHp || '-'}</span>
              </div>

              {/* Row 11: Sekolah Asal */}
              <div className="field-row">
                <span className="field-no">11.</span>
                <span className="field-label">Sekolah asal (SD/MI)</span>
                <span className="field-colon">:</span>
                <span className="field-value">{asalSekolah || '-'}</span>
              </div>

              {/* Row 12: Diterima */}
              <div className="field-row">
                <span className="field-no">12.</span>
                <span className="field-label">Diterima di madrasah ini</span>
                <span className="field-colon"></span>
                <span className="field-value"></span>
              </div>
              <div className="sub-field-row">
                <span className="sub-indent"></span>
                <span className="sub-label">Di kelas</span>
                <span className="sub-colon">:</span>
                <span className="sub-value">{kelasAwal || s.rombel || '-'}</span>
              </div>
              <div className="sub-field-row">
                <span className="sub-indent"></span>
                <span className="sub-label">Pada tanggal</span>
                <span className="sub-colon">:</span>
                <span className="sub-value">{tanggalDiterimaRaw ? formatDate(tanggalDiterimaRaw) : '-'}</span>
              </div>

              {/* Row 13: Orang Tua */}
              <div className="field-row">
                <span className="field-no">13.</span>
                <span className="field-label">Orang Tua</span>
                <span className="field-colon"></span>
                <span className="field-value"></span>
              </div>
              <div className="sub-field-row">
                <span className="sub-indent"></span>
                <span className="sub-label">Nama Ayah</span>
                <span className="sub-colon">:</span>
                <span className="sub-value">{s.namaAyah || '-'}</span>
              </div>
              <div className="sub-field-row">
                <span className="sub-indent"></span>
                <span className="sub-label">Pekerjaan Ayah</span>
                <span className="sub-colon">:</span>
                <span className="sub-value">{s.pekerjaanAyah || '-'}</span>
              </div>
              <div className="sub-field-row">
                <span className="sub-indent"></span>
                <span className="sub-label">Nama Ibu</span>
                <span className="sub-colon">:</span>
                <span className="sub-value">{s.namaIbu || '-'}</span>
              </div>
              <div className="sub-field-row">
                <span className="sub-indent"></span>
                <span className="sub-label">Pekerjaan Ibu</span>
                <span className="sub-colon">:</span>
                <span className="sub-value">{s.pekerjaanIbu || '-'}</span>
              </div>

              {/* Row 14: Wali */}
              <div className="field-row">
                <span className="field-no">14.</span>
                <span className="field-label">Wali</span>
                <span className="field-colon"></span>
                <span className="field-value"></span>
              </div>
              <div className="sub-field-row">
                <span className="sub-indent"></span>
                <span className="sub-label">Nama Wali</span>
                <span className="sub-colon">:</span>
                <span className="sub-value">{namaWali}</span>
              </div>
              <div className="sub-field-row">
                <span className="sub-indent"></span>
                <span className="sub-label">Pekerjaan Wali</span>
                <span className="sub-colon">:</span>
                <span className="sub-value">{pekerjaanWali}</span>
              </div>
              <div className="sub-field-row">
                <span className="sub-indent"></span>
                <span className="sub-label">Nomor Telepon/HP Wali</span>
                <span className="sub-colon">:</span>
                <span className="sub-value">{noHpWali}</span>
              </div>
              <div className="sub-field-row">
                <span className="sub-indent"></span>
                <span className="sub-label">Alamat Wali</span>
                <span className="sub-colon">:</span>
                <span className="sub-value">{alamatWali}</span>
              </div>

              {/* Bottom: Foto + Tanda Tangan */}
              <div className="bottom-area">
                {/* Foto */}
                <div className="foto-box">
                  {s.foto ? (
                    <img src={s.foto} alt={`Foto ${s.nama}`} />
                  ) : (
                    <span style={{ fontSize: '9pt', color: '#888', textAlign: 'center', padding: '4px' }}>Foto Siswa</span>
                  )}
                </div>

                {/* Tanda Tangan */}
                <div className="sign-area">
                  <div className="sign-date">Malang, {todayStr}</div>
                  <div className="sign-title">Kepala Madrasah</div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/ttd bu palupi.png" alt="TTD Kepala Madrasah" className="sign-img" />
                  <div className="sign-name">Dwi Retno Palupi, M.Pd.</div>
                  <div className="sign-nip">NIP: -</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

