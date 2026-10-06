'use client';
import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

export default function BukuIndukPrint({ data }: { data: any }) {
  const { induk, history, nilai, ekstra, prestasi } = data;

  // Helpers
  const val = (key: string) => induk[key] || '';
  const dateStr = (val: string) => {
    if (!val) return '';
    try {
      const d = new Date(val);
      if (isNaN(d.getTime())) return val;
      return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
    } catch {
      return val;
    }
  };

  // Nilai mapping
  const mapels = ["QH", "AA", "FIK", "SKI", "PP", "BINDO", "BAR", "MTK", "IPA", "IPS", "BING", "PJOK", "INFO", "SBP", "BD", "Ke-NU"];
  
  // Actually, we need to map the full mapel names to these codes.
  const mapelNames: Record<string, string> = {
    "Alquran Hadis": "QH",
    "Akidah Akhlak": "AA",
    "Fikih": "FIK",
    "Sejarah Kebudayaan Islam": "SKI",
    "Pendidikan Pancasila": "PP",
    "Bahasa Indonesia": "BINDO",
    "Bahasa Arab": "BAR",
    "Matematika": "MTK",
    "Ilmu Pengetahuan Alam": "IPA",
    "Ilmu Pengetahuan Sosial": "IPS",
    "Bahasa Inggris": "BING",
    "Pendidikan Jasmani, Olah Raga dan Kesehatan": "PJOK",
    "Informatika": "INFO",
    "Seni Budaya": "SBP",
    "Bahasa Daerah": "BD",
    "KE-NU-AN": "Ke-NU"
  };

  const getNilai = (kelas: string, semester: string, code: string) => {
    // find full name from code
    let fullMapel = Object.keys(mapelNames).find(key => mapelNames[key] === code);
    if (!fullMapel) return '';
    
    // find in nilaiData
    const n = nilai.find((item: any) => 
      item.kelas.includes(kelas) && // e.g. "7" matches "7A"
      item.semester.toLowerCase() === semester.toLowerCase() &&
      item.mata_pelajaran === fullMapel
    );
    return n ? n.nilai : '';
  };

  const r7 = val('ROMBEL KELAS 7') || '7';
  const r8 = val('ROMBEL KELAS 8') || '8';
  const r9 = val('ROMBEL KELAS 9') || '9';

  const semRows = [
    { label: `${r7} / Ganjil`, k: '7', s: 'Ganjil' },
    { label: `${r7} / Genap`, k: '7', s: 'Genap' },
    { label: `${r8} / Ganjil`, k: '8', s: 'Ganjil' },
    { label: `${r8} / Genap`, k: '8', s: 'Genap' },
    { label: `${r9} / Ganjil`, k: '9', s: 'Ganjil' },
    { label: `${r9} / Genap`, k: '9', s: 'Genap' }
  ];

  const getImageUrl = (url: string) => {
    if (!url) return '';
    if (url.includes('drive.google.com')) {
      const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        // We use proxy if available, but for print page thumbnail is fine
        return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w400-h600`;
      }
    }
    return url;
  };

  const fotoUrl = getImageUrl(val('LINK FOTO TERBARU') || val('LINK URL FOTO 1') || val('LINK URL FOTO 2'));

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body {
            background-color: white !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          @page {
            size: A4 portrait;
            margin: 15mm;
          }
          .no-print { display: none !important; }
          .print-bg { background-color: transparent !important; padding: 0 !important; }
        }
        
        @media screen {
          .print-bg { background-color: #525659; }
        }

        .buku-induk-page {
          background: white;
          width: 210mm;
          min-height: 297mm;
          margin: 0 auto;
          padding: 15mm;
          box-sizing: border-box;
          font-family: Arial, sans-serif;
          font-size: 11px;
          color: black;
          page-break-after: always;
          position: relative;
        }

        .bi-header {
          display: flex;
          align-items: center;
          margin-bottom: 20px;
          border-bottom: 3px solid black;
          padding-bottom: 10px;
        }
        .bi-header img {
          width: 70px;
          height: auto;
          margin-right: 20px;
        }
        .bi-header-text h2 {
          margin: 0 0 5px 0;
          font-size: 16px;
        }
        .bi-header-text h1 {
          margin: 0 0 5px 0;
          font-size: 20px;
        }
        .bi-header-text p {
          margin: 0;
          font-size: 11px;
        }

        .bi-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 15px;
        }
        .bi-table th, .bi-table td {
          border: 1px solid black;
          padding: 5px 6px;
          vertical-align: middle;
        }
        .bi-table-noborder {
          width: 100%;
          border-collapse: collapse;
        }
        .bi-table-noborder td {
          padding: 3px 2px;
          vertical-align: top;
        }
        .lbl { width: 140px; font-weight: normal; }
        .sep { width: 10px; }

        .section-title {
          background-color: #2e7d32;
          color: white;
          text-align: center;
          font-weight: bold;
          padding: 4px;
          border: 1px solid black;
          margin-top: -1px;
        }

        .two-cols {
          display: flex;
          border: 1px solid black;
          margin-top: -1px;
        }
        .col-half {
          flex: 1;
          padding: 5px;
        }
        .col-half:first-child {
          border-right: 1px solid black;
        }

        .foto-box {
          width: 110px;
          height: 150px;
          border: 1px solid black;
          display: flex;
          align-items: center;
          justify-content: center;
          background-size: cover;
          background-position: center;
        }

        .nilai-table th {
          background-color: #e0f2f1;
          text-align: center;
          font-size: 9px;
        }
        .nilai-table td {
          text-align: center;
          font-size: 10px;
        }
        
        .row-cyan { background-color: #b2ebf2; }
      `}} />

      {/* PAGE 1: DATA INDUK */}
      <div className="buku-induk-page">
        <div className="bi-header">
          <img src="/logo.png" alt="Logo" />
          <div className="bi-header-text">
            <h2>DATA INDUK PESERTA DIDIK</h2>
            <h1>MTs ALMAARIF 01 SINGOSARI</h1>
            <p>NPSN : 20581318 | NSM : 121235070115</p>
            <p>Jl. Masjid No. 33 Pagentan, Kec. Singosari, Kab. Malang | admin@mtsalmaarif01-sgs.sch.id</p>
          </div>
        </div>

        <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '14px', marginBottom: '10px' }}>
          {val('ID SISWA')}
        </div>

        <div style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
          <div className="foto-box" style={{ backgroundImage: fotoUrl ? `url(${fotoUrl})` : 'none' }}>
            {!fotoUrl && "FOTO"}
          </div>
          <div style={{ flex: 1 }}>
            <table className="bi-table-noborder">
              <tbody>
                <tr><td className="lbl">NAMA LENGKAP</td><td className="sep">:</td><td>{val('NAMA')}</td></tr>
                <tr><td className="lbl">NISM</td><td className="sep">:</td><td>{val('NISM')}</td></tr>
                <tr><td className="lbl">NISN</td><td className="sep">:</td><td>{val('NISN')}</td></tr>
                <tr><td className="lbl">NIK</td><td className="sep">:</td><td>{val('NIK')}</td></tr>
                <tr><td className="lbl">KIP</td><td className="sep">:</td><td>{val('KIP')}</td></tr>
                <tr><td className="lbl">JENIS KELAMIN</td><td className="sep">:</td><td>{val('JENIS KELAMIN')}</td></tr>
                <tr><td className="lbl">TEMPAT, TANGGAL LAHIR</td><td className="sep">:</td><td>{val('TEMPAT, TANGGAL LAHIR')}</td></tr>
                <tr><td className="lbl">ALAMAT</td><td className="sep">:</td><td>{val('ALAMAT ASAL SESUAI KK TERAKHIR') || val('DOMISILI')}</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <table className="bi-table-noborder" style={{ marginBottom: '15px' }}>
          <tbody>
            <tr><td className="lbl" style={{ width: '220px' }}>STATUS TEMPAT TINGGAL PESERTA DIDIK</td><td className="sep">:</td><td>{val('STATUS TEMPAT TINGGAL SISWA')}</td></tr>
            <tr><td className="lbl">JARAK TEMPAT TINGGAL - MADRASAH</td><td className="sep">:</td><td>{val('JARAK TEMPAT TINGGAL - MADRASAH/SEKOLAH')}</td></tr>
            <tr><td className="lbl">TRANSPORTASI KE MADRASAH</td><td className="sep">:</td><td>{val('TRANSPORTASI KE SEKOLAH')}</td></tr>
            <tr><td className="lbl">WAKTU TEMPUH TEMPAT TINGGAL-MADRASAH</td><td className="sep">:</td><td>{val('WAKTU TEMPUH')}</td></tr>
          </tbody>
        </table>

        {/* ORANG TUA */}
        <div className="two-cols" style={{ borderBottom: 'none' }}>
          <div className="col-half section-title" style={{ border: 'none' }}>AYAH KANDUNG</div>
          <div className="col-half section-title" style={{ border: 'none', borderLeft: '1px solid black' }}>IBU KANDUNG</div>
        </div>
        <div className="two-cols">
          <div className="col-half">
            <table className="bi-table-noborder">
              <tbody>
                <tr><td className="lbl" style={{ width: '130px' }}>NAMA LENGKAP</td><td className="sep">:</td><td>{val('NAMA AYAH KANDUNG')}</td></tr>
                <tr><td className="lbl">NIK</td><td className="sep">:</td><td>{val('NIK AYAH KANDUNG')}</td></tr>
                <tr><td className="lbl">STATUS</td><td className="sep">:</td><td>{val('STATUS AYAH KANDUNG')}</td></tr>
                <tr><td className="lbl">TEMPAT, TANGGAL LAHIR</td><td className="sep">:</td><td>{val('TTL AYAH KANDUNG')}</td></tr>
                <tr><td className="lbl">PENDIDIKAN TERAKHIR</td><td className="sep">:</td><td>{val('PENDIDIKAN TERAKHIR AYAH KANDUNG')}</td></tr>
                <tr><td className="lbl">PEKERJAAN</td><td className="sep">:</td><td>{val('PEKERJAAN AYAH KANDUNG')}</td></tr>
                <tr><td className="lbl">PENGHASILAN RATA-RATA</td><td className="sep">:</td><td>{val('PENGHASILAN RATA-RATA PER BULAN AYAH KANDUNG')}</td></tr>
                <tr><td className="lbl">NO. HP</td><td className="sep">:</td><td>{val('NOMOR TELEPON AYAH KANDUNG')}</td></tr>
                <tr><td className="lbl">ALAMAT</td><td className="sep">:</td><td>{val('ALAMAT AYAH KANDUNG')}</td></tr>
              </tbody>
            </table>
          </div>
          <div className="col-half">
            <table className="bi-table-noborder">
              <tbody>
                <tr><td className="lbl" style={{ width: '130px' }}>NAMA LENGKAP</td><td className="sep">:</td><td>{val('NAMA IBU KANDUNG')}</td></tr>
                <tr><td className="lbl">NIK</td><td className="sep">:</td><td>{val('NIK IBU KANDUNG')}</td></tr>
                <tr><td className="lbl">STATUS</td><td className="sep">:</td><td>{val('STATUS IBU KANDUNG')}</td></tr>
                <tr><td className="lbl">TEMPAT, TANGGAL LAHIR</td><td className="sep">:</td><td>{val('TTL IBU KANDUNG') || val('TTL IBU')}</td></tr>
                <tr><td className="lbl">PENDIDIKAN TERAKHIR</td><td className="sep">:</td><td>{val('PENDIDIKAN TERAKHIR IBU KANDUNG')}</td></tr>
                <tr><td className="lbl">PEKERJAAN</td><td className="sep">:</td><td>{val('PEKERJAAN IBU KANDUNG')}</td></tr>
                <tr><td className="lbl">PENGHASILAN RATA-RATA</td><td className="sep">:</td><td>{val('PENGHASILAN RATA-RATA PER BULAN IBU KANDUNG')}</td></tr>
                <tr><td className="lbl">NO. HP</td><td className="sep">:</td><td>{val('NOMOR TELEPON IBU KANDUNG')}</td></tr>
                <tr><td className="lbl">ALAMAT</td><td className="sep">:</td><td>{val('ALAMAT IBU KANDUNG')}</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* WALI & BIODATA */}
        <div className="two-cols" style={{ borderBottom: 'none' }}>
          <div className="col-half section-title" style={{ border: 'none' }}>WALI PESERTA DIDIK</div>
          <div className="col-half section-title" style={{ border: 'none', borderLeft: '1px solid black' }}>BIODATA</div>
        </div>
        <div className="two-cols">
          <div className="col-half">
            <table className="bi-table-noborder">
              <tbody>
                <tr><td className="lbl" style={{ width: '130px' }}>NAMA LENGKAP</td><td className="sep">:</td><td>{val('NAMA WALI')}</td></tr>
                <tr><td className="lbl">NIK</td><td className="sep">:</td><td>{val('NIK WALI')}</td></tr>
                <tr><td className="lbl">TEMPAT, TANGGAL LAHIR</td><td className="sep">:</td><td>{val('TTL WALI')}</td></tr>
                <tr><td className="lbl">PENDIDIKAN TERAKHIR</td><td className="sep">:</td><td>{val('PENDIDIKAN TERAKHIR WALI')}</td></tr>
                <tr><td className="lbl">PEKERJAAN</td><td className="sep">:</td><td>{val('PEKERJAAN WALI')}</td></tr>
                <tr><td className="lbl">PENGHASILAN RATA-RATA</td><td className="sep">:</td><td>{val('PENGHASILAN RATA-RATA PER BULAN WALI')}</td></tr>
                <tr><td className="lbl">NO. HP</td><td className="sep">:</td><td>{val('NOMOR TELEPON WALI')}</td></tr>
                <tr><td className="lbl">ALAMAT</td><td className="sep">:</td><td>{val('ALAMAT WALI')}</td></tr>
              </tbody>
            </table>
          </div>
          <div className="col-half">
            <table className="bi-table-noborder">
              <tbody>
                <tr><td className="lbl" style={{ width: '130px' }}>NO. KK</td><td className="sep">:</td><td>{val('NOMOR KK')}</td></tr>
                <tr><td className="lbl">HOBI</td><td className="sep">:</td><td>{val('HOBI')}</td></tr>
                <tr><td className="lbl">CITA-CITA</td><td className="sep">:</td><td>{val('CITA-CITA')}</td></tr>
                <tr><td className="lbl">STATUS ANAK</td><td className="sep">:</td><td>{val('STATUS ANAK')}</td></tr>
                <tr><td className="lbl">JML. SAUDARA</td><td className="sep">:</td><td>{val('JUMLAH SAUDARA')}</td></tr>
                <tr><td className="lbl">ANAK KE-</td><td className="sep">:</td><td>{val('ANAK KE-')}</td></tr>
                <tr><td className="lbl">USIA</td><td className="sep">:</td><td>{val('USIA') ? val('USIA') + ' tahun' : ''}</td></tr>
                <tr><td className="lbl">GOLONGAN DARAH</td><td className="sep">:</td><td>{val('GOLONGAN DARAH')}</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* PAGE 2: REKAM STUDI */}
      <div className="buku-induk-page">
        <div className="section-title" style={{ marginBottom: '15px' }}>REKAM STUDI PESERTA DIDIK</div>
        
        <div className="two-cols" style={{ marginBottom: '15px' }}>
          <div className="col-half">
            <table className="bi-table-noborder">
              <tbody>
                <tr><td className="lbl">MI/SD ASAL</td><td className="sep">:</td><td>{val('SD/MI')}</td></tr>
                <tr><td className="lbl">NPSN MI/SD ASAL</td><td className="sep">:</td><td>{val('NPSN SD/MI')}</td></tr>
                <tr><td className="lbl">TAHUN LULUS SD/MI</td><td className="sep">:</td><td>{val('TAHUN LULUS SD/MI')}</td></tr>
                <tr><td className="lbl">NO. SERI IJAZAH SD/MI</td><td className="sep">:</td><td>{val('NO SERI IJAZAH SD/MI')}</td></tr>
                <tr><td className="lbl">ALAMAT MI/SD ASAL</td><td className="sep">:</td><td>{val('ALAMAT SD/MI')}</td></tr>
                <tr><td colSpan={3}>&nbsp;</td></tr>
                <tr><td className="lbl">TANGGAL MASUK MTs</td><td className="sep">:</td><td>{val('TANGGAL MASUK MTs/SMP')}</td></tr>
                <tr><td className="lbl">DITERIMA DI MTs KELAS</td><td className="sep">:</td><td>{val('DITERIMA DI MTs KELAS')}</td></tr>
                <tr><td className="lbl">TANGGAL KELUAR</td><td className="sep">:</td><td>{val('TANGGAL KELUAR')}</td></tr>
                <tr><td className="lbl">NO. SERI IJAZAH MTs</td><td className="sep">:</td><td>{val('NO. SERI IJAZAH MTs')}</td></tr>
              </tbody>
            </table>
          </div>
          <div className="col-half">
            <table className="bi-table-noborder">
              <tbody>
                <tr><td className="lbl">SMP/MTs LANJUTAN</td><td className="sep">:</td><td>{val('SMA/MA/SMK/MAK LANJUTAN')}</td></tr>
                <tr><td className="lbl">NPSN SMP/MTs LANJUTAN</td><td className="sep">:</td><td>{val('NPSN SMA/MA/SMK/MAK LANJUTAN')}</td></tr>
                <tr><td colSpan={3}><div className="section-title" style={{ margin: '5px 0' }}>DATA MUTASI MASUK</div></td></tr>
                <tr><td className="lbl">NOMOR SURAT</td><td className="sep">:</td><td>{val('NOMOR SURAT MUTASI MASUK')}</td></tr>
                <tr><td className="lbl">SMP/MTs SEBELUMNYA</td><td className="sep">:</td><td>{val('SMP/MTs SEBELUMNYA')}</td></tr>
                <tr><td className="lbl">NPSN SMP/MTs SEBELUMNYA</td><td className="sep">:</td><td>{val('NPSN/NSS/NSM SMP/MTs SEBELUMNYA')}</td></tr>
                <tr><td className="lbl">TANGGAL MUTASI</td><td className="sep">:</td><td>{val('TANGGAL MUTASI MASUK')}</td></tr>
                <tr><td colSpan={3}><div className="section-title" style={{ margin: '5px 0' }}>DATA MUTASI KELUAR</div></td></tr>
                <tr><td className="lbl">NOMOR SURAT</td><td className="sep">:</td><td>{val('NOMOR SURAT MUTASI KELUAR')}</td></tr>
                <tr><td className="lbl">SD/MI TUJUAN</td><td className="sep">:</td><td>{val('SMP/MTs TUJUAN')}</td></tr>
                <tr><td className="lbl">NPSN SD/MI TUJUAN</td><td className="sep">:</td><td>{val('NPSN/NSM SMP/MTs TUJUAN')}</td></tr>
                <tr><td className="lbl">TANGGAL MUTASI</td><td className="sep">:</td><td>{val('TANGGAL MUTASI KELUAR')}</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="section-title">REKAM NILAI PESERTA DIDIK</div>
        <table className="bi-table nilai-table" style={{ marginTop: '0' }}>
          <thead>
            <tr>
              <th>K/S</th>
              {mapels.map(m => <th key={m}>{m}</th>)}
            </tr>
          </thead>
          <tbody>
            {semRows.map((row, i) => (
              <tr key={i} className={i % 2 === 0 ? 'row-cyan' : ''}>
                <td style={{ fontWeight: 'bold' }}>{row.label}</td>
                {mapels.map(m => (
                  <td key={m}>{getNilai(row.k, row.s, m)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        {/* PRESENSI / EKSTRA */}
        <div style={{ display: 'flex', gap: '15px' }}>
          <div style={{ flex: '3' }}>
            <div className="section-title">EKSTRAKURIKULER</div>
            <table className="bi-table nilai-table" style={{ marginTop: '0' }}>
              <thead>
                <tr>
                  <th>KELAS</th>
                  <th>JENIS EKSTRA</th>
                  <th>NILAI</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className={i % 2 === 0 ? 'row-cyan' : ''}>
                    <td>&nbsp;</td>
                    <td></td>
                    <td></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ flex: '1' }}>
            <div className="section-title">PRESENSI</div>
            <table className="bi-table nilai-table" style={{ marginTop: '0' }}>
              <thead>
                <tr>
                  <th>S</th>
                  <th>I</th>
                  <th>A</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const total = Object.values(data.presensi || {}).reduce((acc: any, curr: any) => {
                    acc.S += curr.S || 0;
                    acc.I += curr.I || 0;
                    acc.A += curr.A || 0;
                    return acc;
                  }, { S: 0, I: 0, A: 0 }) as { S: number, I: number, A: number };

                  return (
                    <>
                      <tr className="row-cyan">
                        <td>{total.S || '-'}</td>
                        <td>{total.I || '-'}</td>
                        <td>{total.A || '-'}</td>
                      </tr>
                      {/* Empty rows to maintain table height alignment with Ekstrakurikuler */}
                      <tr><td>&nbsp;</td><td></td><td></td></tr>
                      <tr className="row-cyan"><td>&nbsp;</td><td></td><td></td></tr>
                    </>
                  );
                })()}
              </tbody>
            </table>
          </div>
        </div>

        {/* PRESTASI (Merged to Page 2) */}
        <div style={{ marginTop: '15px' }}></div>
        <div className="section-title" style={{ marginBottom: '15px' }}>PRESTASI SISWA</div>
        <table className="bi-table">
          <thead>
            <tr style={{ backgroundColor: '#e0f2f1' }}>
              <th>NO</th>
              <th>TANGGAL</th>
              <th>NAMA/BIDANG/TINGKAT LOMBA</th>
              <th>PENYELENGGARA</th>
              <th>PERINGKAT</th>
              <th>QR SERTIFIKAT</th>
            </tr>
          </thead>
          <tbody>
            {prestasi.map((p: any, idx: number) => (
              <tr key={idx}>
                <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                <td>{dateStr(p.tanggal)}</td>
                <td>{p.nama_lomba} ({p.tingkat})</td>
                <td>{p.penyelenggara}</td>
                <td style={{ textAlign: 'center' }}>{p.peringkat}</td>
                <td style={{ textAlign: 'center', fontSize: '10px' }}>
                  {p.link_sertifikat ? (
                    <div style={{ display: "flex", justifyContent: "center" }}><QRCodeSVG value={p.link_sertifikat} size={40} level="L" /></div>
                  ) : '-'}
                </td>
              </tr>
            ))}
            {prestasi.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '20px' }}>Belum ada data prestasi</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
