'use client';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import LoadingScreen from '@/components/LoadingScreen';

interface Siswa {
  nis: string;
  nisn: string;
  nama: string;
  status: string;
  rombel: string;
  isLatest: boolean;
  rawMetadata: Record<string, string>;
}

export default function CetakSampulRaporPage() {
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

        const filtered = data.data.filter((s: Siswa) => {
          const isAktif = s.status && s.status.toLowerCase().trim() === 'aktif';
          return s.isLatest && (s.rombel || '').toUpperCase() === kelas.toUpperCase() && isAktif;
        });

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

  if (loading) return <LoadingScreen />;
  if (error) return <div style={{ padding: 40, color: 'red' }}>Error: {error}</div>;
  if (siswaList.length === 0) return <div style={{ padding: 40 }}>Tidak ada siswa aktif di kelas {kelas}.</div>;

  return (
    <>
      <style>{`
        @page {
          size: A4 portrait;
          margin: 0;
        }
        @media print {
          body { margin: 0; padding: 0; }
          .no-print, .print-header, header, nav, footer, .global-kop-surat { display: none !important; }
          .halaman-sampul {
            page-break-after: always;
          }
          .halaman-sampul:last-child {
            page-break-after: auto;
          }
        }
        @media screen {
          body { background: #e5e7eb; }
          .halaman-sampul {
            margin: 20px auto;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          }
        }
      `}</style>

      <div className="no-print" style={{ padding: '16px', background: '#1e293b', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 'bold' }}>
          <i className="fas fa-book" style={{ marginRight: 8 }}></i>
          Cetak Sampul Rapor Kelas {kelas} — {siswaList.length} siswa
        </span>
        <button
          onClick={() => window.print()}
          style={{ background: '#10b981', color: 'white', border: 'none', padding: '8px 20px', borderRadius: 6, cursor: 'pointer', fontWeight: 'bold' }}
        >
          <i className="fas fa-print" style={{ marginRight: 8 }}></i>Cetak
        </button>
      </div>

      {siswaList.map((siswa) => {
        const nisMadrasah = siswa.rawMetadata?.['ID SISWA'] || siswa.nis || '-';
        const nisNasional = siswa.nisn || siswa.rawMetadata?.['NISN'] || '-';

        return (
          <div
            key={siswa.nis + siswa.nisn}
            className="halaman-sampul"
            style={{
              width: '210mm',
              height: '297mm',
              background: 'white',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '30mm 25mm',
              boxSizing: 'border-box',
              fontFamily: 'Times New Roman, serif',
            }}
          >
            {/* === ATAS: Logo Kemenag === */}
            <div style={{ textAlign: 'center', width: '100%' }}>
              <img
                src="/Logo Kemenag Terbaru.png"
                alt="Logo Kemenag"
                style={{ width: '80px', height: 'auto', display: 'block', margin: '0 auto 8px auto' }}
              />
              <p style={{ margin: 0, fontSize: '12pt', letterSpacing: '0.5px', fontWeight: 'normal', textTransform: 'uppercase' }}>
                Kementerian Agama Republik Indonesia
              </p>
            </div>

            {/* === JUDUL === */}
            <div style={{ textAlign: 'center', width: '100%' }}>
              <p style={{ margin: '0 0 4px 0', fontSize: '23pt', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Laporan Hasil Belajar
              </p>
              <p style={{ margin: '0 0 4px 0', fontSize: '23pt', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Madrasah Tsanawiyah
              </p>
              <p style={{ margin: 0, fontSize: '23pt', fontWeight: 'bold', letterSpacing: '0.5px' }}>
                (MTs)
              </p>
            </div>

            {/* === LOGO SEKOLAH === */}
            <div style={{ textAlign: 'center' }}>
              <img
                src="/logo.png"
                alt="Logo Sekolah"
                style={{ width: '110px', height: 'auto', display: 'block', margin: '0 auto' }}
              />
            </div>

            {/* === IDENTITAS SISWA === */}
            <div style={{ width: '100%', paddingLeft: '20mm' }}>
              <table style={{ borderCollapse: 'collapse', fontSize: '11pt' }}>
                <tbody>
                  <tr>
                    <td style={{ padding: '3px 0', width: '160px', fontWeight: 'bold', textTransform: 'uppercase', verticalAlign: 'top' }}>Nama</td>
                    <td style={{ padding: '3px 8px', fontWeight: 'bold', verticalAlign: 'top' }}>:</td>
                    <td style={{ padding: '3px 0', fontWeight: 'bold', textTransform: 'uppercase', verticalAlign: 'top' }}>{siswa.nama}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '3px 0', fontWeight: 'bold', textTransform: 'uppercase', verticalAlign: 'top' }}>
                      <div style={{ marginBottom: '2px' }}>NIS</div>
                      <div>MADRASAH</div>
                    </td>
                    <td style={{ padding: '3px 8px', fontWeight: 'bold', verticalAlign: 'top' }}>:</td>
                    <td style={{ padding: '3px 0', fontWeight: 'bold', verticalAlign: 'top' }}>{nisMadrasah}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '3px 0', fontWeight: 'bold', textTransform: 'uppercase', verticalAlign: 'top' }}>NIS Nasional</td>
                    <td style={{ padding: '3px 8px', fontWeight: 'bold', verticalAlign: 'top' }}>:</td>
                    <td style={{ padding: '3px 0', fontWeight: 'bold', verticalAlign: 'top' }}>{nisNasional}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* === FOOTER: Nama Madrasah === */}
            <div style={{ textAlign: 'center', width: '100%' }}>
              <p style={{ margin: '0 0 2px 0', fontSize: '18pt', fontWeight: 'bold', textTransform: 'uppercase' }}>
                MTs Almaarif 01 Singosari
              </p>
              <p style={{ margin: '0 0 2px 0', fontSize: '18pt', fontWeight: 'bold', textTransform: 'uppercase' }}>
                Kabupaten Malang
              </p>
              <p style={{ margin: 0, fontSize: '18pt', fontWeight: 'bold', textTransform: 'uppercase' }}>
                Provinsi Jawa Timur
              </p>
            </div>
          </div>
        );
      })}
    </>
  );
}
