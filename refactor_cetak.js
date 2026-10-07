const fs = require('fs');
const path = 'src/app/perangkat-ujian/sts/page.tsx';
let content = fs.readFileSync(path, 'utf8');

// The original cetakRapor string starts here
const cetakRaporStart = "const cetakRapor = (siswa: Siswa, idx: number) => {";
// We find it, then we will refactor.

let replaceScript = `
  const getStyleAndHead = (title: string) => \`
    <html>
      <head>
        <title>\${title}</title>
        <style>
          @page { size: A4 portrait; margin: 10mm 10mm 10mm 15mm; }
          body { font-family: 'Times New Roman', Times, serif; font-size: 9.5pt; color: #000; margin: 0; }
          table { border-collapse: collapse; }
          .page-break { page-break-after: always; padding-top: 1px; }
          .kop { display: flex; align-items: center; border-bottom: 3px double #000; padding-bottom: 4px; margin-bottom: 6px; }
          .kop img { width: 60px; height: 60px; margin-right: 12px; }
          .kop-text { text-align: center; flex: 1; }
          .kop-text .instansi { font-size: 7.5pt; }
          .kop-text .yayasan { font-size: 9pt; font-weight: bold; }
          .kop-text .sekolah { font-size: 12pt; font-weight: bold; }
          .kop-text .alamat { font-size: 7.5pt; }
          .judul { text-align: center; font-weight: bold; font-size: 11pt; border: 1px solid #000; padding: 4px; margin: 6px 0; }
          .info { width: 100%; margin-bottom: 6px; font-size: 9.5pt; }
          .info td { padding: 1px 4px; }
          .section-label { font-weight: bold; margin: 4px 0 2px 0; font-size: 9.5pt; }
          .nilai-table { width: 100%; border-collapse: collapse; font-size: 8.5pt; margin-bottom: 6px; }
          .nilai-table th { background: #ddd; border: 1px solid #333; padding: 3px 2px; text-align: center; }
          .nilai-table td { border: 1px solid #333; }
          .absent-table { width: 100%; border-collapse: collapse; font-size: 8.5pt; margin-bottom: 8px; }
          .absent-table td, .absent-table th { border: 1px solid #333; padding: 4px 5px; }
          .ttd { width: 88%; margin: 22px auto 0 auto; font-size: 9.5pt; }
          .ttd td { width: 50%; vertical-align: top; padding-top: 4px; }
          @media print { body { -webkit-print-color-adjust: exact; } }
        </style>
      </head>
      <body>
  \`;

  const generateStudentHtml = (siswa: Siswa) => {
    const targetKelas = kelasList.find(k => k.rombel === siswa.rombel || k.nama_kelas === siswa.rombel);
    const waliKelas = targetKelas?.waliKelas || targetKelas?.wali_kelas || '';
    const waliKelasText = (waliKelas && waliKelas !== '-') ? \`<b><u>\${waliKelas}</u></b>\` : '_________________________';

    const mapMinatBakat: Record<string, string> = {
      '7A': 'SAINS RISET', '7B': 'SAINS RISET',
      '7C': 'OLAHRAGA SENI', '7D': 'OLAHRAGA SENI',
      '7E': 'MULTILINGUAL', '7F': 'MULTILINGUAL',
      '7G': 'KETERAMPILAN KREATIF PRODUKTIF',
      '7H': 'AGAMA TAHFIDZ', '7I': 'AGAMA TAHFIDZ',
      '8A': 'OLAHRAGA SENI', '8B': 'MULTILINGUAL',
      '8C': 'OLAHRAGA SENI', '8D': 'MULTILINGUAL',
      '8E': 'SAINS RISET', '8F': 'KETERAMPILAN KREATIF PRODUKTIF',
      '8G': 'SAINS RISET', '8H': 'AGAMA TAHFIDZ', '8I': 'AGAMA TAHFIDZ'
    };
    const minatBakat = mapMinatBakat[siswa.rombel.toUpperCase().trim()] || '';

    let prosusHtml = \`
      <tr>
        <td style="text-align:center;border:1px solid #333;padding:5px 4px;">1</td>
        <td style="border:1px solid #333;padding:5px 4px;"></td>
        <td style="border:1px solid #333;padding:5px 4px;"></td>
        <td style="border:1px solid #333;padding:5px 4px;"></td>
        <td style="border:1px solid #333;padding:5px 4px;"></td>
        <td style="border:1px solid #333;padding:5px 4px;"></td>
        <td style="border:1px solid #333;padding:5px 4px;"></td>
        <td style="border:1px solid #333;padding:5px 4px;"></td>
        <td style="border:1px solid #333;padding:5px 4px;"></td>
        <td style="border:1px solid #333;padding:5px 4px;"></td>
      </tr>\`;
    
    if (minatBakat) {
      const pkStudent = prosusData.find(p => {
        const idPK = String(p.induk || p.nisn).trim();
        return idPK === String(siswa.nis || '').trim() || 
               idPK === String(siswa.id || '').trim() || 
               (siswa.nisn && idPK === String(siswa.nisn).trim());
      });
      if (pkStudent) {
        const tps = [pkStudent.tp1, pkStudent.tp2, pkStudent.tp3, pkStudent.tp4, pkStudent.tp5, pkStudent.tp6].filter(val => val !== '' && !isNaN(Number(val))).map(Number);
        const stsNum = parseFloat(String(pkStudent.sts).replace(',', '.'));
        let na = '';
        if (tps.length > 0 && !isNaN(stsNum)) {
           const avgHarian = tps.reduce((a, b) => a + b, 0) / tps.length;
           na = String(Math.round((avgHarian * 0.6) + (stsNum * 0.4)));
        }

        prosusHtml = \`<tr>
          <td style="text-align:center;border:1px solid #333;padding:5px 4px;">1</td>
          <td style="border:1px solid #333;padding:5px 4px;padding-left:14px;">\${minatBakat}</td>
          <td style="text-align:center;border:1px solid #333;padding:5px 4px;">\${pkStudent.tp1}</td>
          <td style="text-align:center;border:1px solid #333;padding:5px 4px;">\${pkStudent.tp2}</td>
          <td style="text-align:center;border:1px solid #333;padding:5px 4px;">\${pkStudent.tp3}</td>
          <td style="text-align:center;border:1px solid #333;padding:5px 4px;">\${pkStudent.tp4}</td>
          <td style="text-align:center;border:1px solid #333;padding:5px 4px;">\${pkStudent.tp5}</td>
          <td style="text-align:center;border:1px solid #333;padding:5px 4px;">\${pkStudent.tp6}</td>
          <td style="text-align:center;border:1px solid #333;padding:5px 4px;">\${pkStudent.sts}</td>
          <td style="text-align:center;border:1px solid #333;padding:5px 4px;">\${na}</td>
        </tr>\`;
      } else {
        prosusHtml = \`<tr>
          <td style="text-align:center;border:1px solid #333;padding:5px 4px;">1</td>
          <td style="border:1px solid #333;padding:5px 4px;padding-left:14px;">\${minatBakat}</td>
          <td style="text-align:center;border:1px solid #333;padding:5px 4px;"></td>
          <td style="text-align:center;border:1px solid #333;padding:5px 4px;"></td>
          <td style="text-align:center;border:1px solid #333;padding:5px 4px;"></td>
          <td style="text-align:center;border:1px solid #333;padding:5px 4px;"></td>
          <td style="text-align:center;border:1px solid #333;padding:5px 4px;"></td>
          <td style="text-align:center;border:1px solid #333;padding:5px 4px;"></td>
          <td style="text-align:center;border:1px solid #333;padding:5px 4px;"></td>
          <td style="text-align:center;border:1px solid #333;padding:5px 4px;"></td>
        </tr>\`;
      }
    }

    const getNilai = (mapelName: string) => {
      const doc = gradesData.find(d => d.mata_pelajaran.toLowerCase().trim() === mapelName.toLowerCase().trim());
      if (!doc) return { tp1: '', tp2: '', tp3: '', tp4: '', tp5: '', tp6: '', sts: '', na: '' };
      const keys = Object.keys(doc.data_nilai?.[0] || {});
      const nisnKey = keys.find(k => k.trim().toLowerCase() === 'nisn');
      const nameKey = keys.find(k => k.trim().toLowerCase().includes('nama'));
      const baris = doc.data_nilai?.find((n: any) =>
        (nisnKey && String(n[nisnKey]).trim() === String(siswa.nisn).trim()) ||
        (nameKey && n[nameKey]?.toString().toUpperCase().trim() === siswa.nama.toUpperCase().trim())
      );
      if (!baris) return { tp1: '', tp2: '', tp3: '', tp4: '', tp5: '', tp6: '', sts: '', na: '' };

      const calcAvg = (materiIndex: number) => {
        let sum = 0; let count = 0;
        ['S1','S2','S3','S4'].forEach(sub => {
           const v = baris[\`Materi \${materiIndex} \${sub}\`] || baris[\`MATERI \${materiIndex} \${sub}\`];
           if (v && !isNaN(Number(v))) { sum += Number(v); count++; }
        });
        return count > 0 ? Math.round(sum / count) : '';
      };
      
      const tp1 = calcAvg(1); const tp2 = calcAvg(2); const tp3 = calcAvg(3);
      const tp4 = calcAvg(4); const tp5 = calcAvg(5); const tp6 = calcAvg(6);
      const sts = baris['STS'] || '';
      let na = '';
      const tps = [tp1, tp2, tp3, tp4, tp5, tp6].filter(val => val !== '' && !isNaN(Number(val))).map(Number);
      const stsNum = parseFloat(String(sts).replace(',', '.'));
      if (tps.length > 0 && !isNaN(stsNum)) {
         const avgHarian = tps.reduce((a, b) => a + b, 0) / tps.length;
         na = String(Math.round((avgHarian * 0.6) + (stsNum * 0.4)));
      }
      return { tp1, tp2, tp3, tp4, tp5, tp6, sts, na };
    };

    const mkRow = (no: string, mapelName: string) => {
      const n = getNilai(mapelName);
      return \`<tr>
        <td style="text-align:center;border:1px solid #333;padding:5px 4px;">\${no}</td>
        <td style="border:1px solid #333;padding:5px 4px;padding-left:14px;">\${mapelName}</td>
        <td style="text-align:center;border:1px solid #333;padding:5px 4px;">\${n.tp1}</td>
        <td style="text-align:center;border:1px solid #333;padding:5px 4px;">\${n.tp2}</td>
        <td style="text-align:center;border:1px solid #333;padding:5px 4px;">\${n.tp3}</td>
        <td style="text-align:center;border:1px solid #333;padding:5px 4px;">\${n.tp4}</td>
        <td style="text-align:center;border:1px solid #333;padding:5px 4px;">\${n.tp5}</td>
        <td style="text-align:center;border:1px solid #333;padding:5px 4px;">\${n.tp6}</td>
        <td style="text-align:center;border:1px solid #333;padding:5px 4px;">\${n.sts}</td>
        <td style="text-align:center;border:1px solid #333;padding:5px 4px;font-weight:bold;">\${n.na}</td>
      </tr>\`;
    };

    const mkGroupHeader = (label: string) => \`<tr>
      <td colspan="10" style="border:1px solid #333;padding:5px 5px;font-weight:bold;background:#f5f5f5;">\${label}</td>
    </tr>\`;

    const logoUrl = '/logo.png';
    const cetakDate = new Date(tanggalCetak);
    const bulan = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
    const tanggal = \`\${cetakDate.getDate()} \${bulan[cetakDate.getMonth()]} \${cetakDate.getFullYear()}\`;

    const presensi = rekapPresensi[siswa.nama.toUpperCase().trim()] || { S: 0, I: 0, A: 0 };

    return \`
      <div class="page-break">
        <!-- KOP SURAT -->
        <div class="kop">
          <img src="\${logoUrl}" alt="Logo" />
          <div class="kop-text">
            <div class="instansi">YAYASAN PENDIDIKAN ALMAARIF SINGOSARI</div>
            <div class="yayasan">BADAN PELAKSANA PENDIDIKAN (BPP) ALMAARIF 01 SINGOSARI</div>
            <div class="sekolah">MADRASAH TSANAWIYAH ALMAARIF 01 SINGOSARI</div>
            <div class="alamat">Jalan Masjid 26 Singosari Telp. (0341) 458348 Fax. (0341) 458348 Kode Pos 65153 Malang</div>
          </div>
        </div>

        <div class="judul">RAPOR SUMATIF TENGAH SEMESTER (STS) \${semester.toUpperCase()}</div>

        <table class="info">
          <tr>
            <td style="width:18%;">Nama Peserta Didik</td>
            <td style="width:2%;">:</td>
            <td style="width:40%;"><b>\${siswa.nama}</b></td>
            <td style="width:15%;">Kelas</td>
            <td style="width:2%;">:</td>
            <td style="width:23%;">\${siswa.rombel}</td>
          </tr>
          <tr>
            <td>NIS / NISN</td>
            <td>:</td>
            <td>\${siswa.nis || ''} / \${siswa.nisn || ''}</td>
            <td>Tahun Ajaran</td>
            <td>:</td>
            <td>\${tahunAjaran}</td>
          </tr>
        </table>

        <!-- TABEL NILAI -->
        <table class="nilai-table">
          <thead>
            <tr>
              <th rowspan="2" style="width:4%;">No</th>
              <th rowspan="2" style="width:30%;">Mata Pelajaran</th>
              <th colspan="6">Nilai Sumatif Harian (TP)</th>
              <th rowspan="2" style="width:6%;">NILAI STS</th>
              <th rowspan="2" style="width:6%;">NA STS</th>
            </tr>
            <tr>
              <th style="width:5%;">1</th><th style="width:5%;">2</th><th style="width:5%;">3</th>
              <th style="width:5%;">4</th><th style="width:5%;">5</th><th style="width:5%;">6</th>
            </tr>
          </thead>
          <tbody>
            \${mkGroupHeader('A. KELOMPOK MATA PELAJARAN UMUM')}
            \${mkRow('1', 'Pendidikan Pancasila')}
            \${mkRow('2', 'Bahasa Indonesia')}
            \${mkRow('3', 'Matematika')}
            \${mkRow('4', 'Ilmu Pengetahuan Alam')}
            \${mkRow('5', 'Ilmu Pengetahuan Sosial')}
            \${mkRow('6', 'Bahasa Inggris')}
            \${mkRow('7', 'Pendidikan Jasmani, Olah Raga dan Kesehatan')}
            \${mkRow('8', 'Informatika')}
            \${mkRow('9', 'Seni Budaya')}
            \${mkRow('10', 'Prakarya')}

            \${mkGroupHeader('B. KELOMPOK MATA PELAJARAN AGAMA')}
            \${mkRow('1', 'Alquran Hadis')}
            \${mkRow('2', 'Akidah Akhlak')}
            \${mkRow('3', 'Fikih')}
            \${mkRow('4', 'Sejarah Kebudayaan Islam')}
            \${mkRow('5', 'Bahasa Arab')}
            \${mkRow('6', 'KE-NU-AN')}

            \${mkGroupHeader('C. MUATAN LOKAL')}
            \${mkRow('1', 'Bahasa Daerah')}

            \${mkGroupHeader('D. PROGRAM KHUSUS')}
            \${prosusHtml}
          </tbody>
        </table>

        <!-- KETIDAKHADIRAN -->
        <table class="absent-table">
          <tr>
            <td colspan="2" style="font-weight:bold;background:#f5f5f5;">Ketidakhadiran</td>
          </tr>
          <tr>
            <td style="width:20%;">1 &nbsp; Sakit</td>
            <td style="width:80%;">\${presensi.S > 0 ? presensi.S + ' hari' : '-'}</td>
          </tr>
          <tr>
            <td>2 &nbsp; Izin</td>
            <td>\${presensi.I > 0 ? presensi.I + ' hari' : '-'}</td>
          </tr>
          <tr>
            <td>3 &nbsp; Tanpa Keterangan</td>
            <td>\${presensi.A > 0 ? presensi.A + ' hari' : '-'}</td>
          </tr>
        </table>

        <!-- TTD -->
        <table class="ttd">
          <tr>
            <td>Mengetahui:<br>Orang Tua/Wali<br><br><br><br><br>_________________________</td>
            <td style="text-align:right;">Singosari, \${tanggal}<br>Wali Kelas:<br><br><br><br><br>\${waliKelasText}</td>
          </tr>
        </table>
      </div>
    \`;
  };

  const doPrint = (htmlBody: string, title: string) => {
    const fullHtml = getStyleAndHead(title) + htmlBody + "</body></html>";
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);
    const iframeDoc = iframe.contentWindow?.document;
    if (iframeDoc) {
      iframeDoc.write(fullHtml);
      iframeDoc.close();
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => document.body.removeChild(iframe), 1000);
      }, 500);
    }
  };

  const cetakRapor = (siswa: Siswa) => {
    doPrint(generateStudentHtml(siswa), \`Rapor STS - \${siswa.nama}\`);
  };

  const cetakMasal = () => {
    const siswaKelas = siswaList
        .filter(s => s.rombel === kelas && s.tahunAjaran === tahunAjaran && s.status?.toLowerCase().includes('aktif'))
        .sort((a, b) => a.nama.localeCompare(b.nama));
        
    if (siswaKelas.length === 0) {
      Swal.fire('Oops', 'Tidak ada siswa di kelas ini', 'warning');
      return;
    }
    
    let allHtml = '';
    siswaKelas.forEach(s => {
      allHtml += generateStudentHtml(s);
    });
    
    doPrint(allHtml, \`Cetak Masal Rapor STS Kelas \${kelas}\`);
  };
`;

// Replace from `const cetakRapor = ...` up to the closing brace of cetakRapor.
// In the original file, `cetakRapor` ends at `} };` (around line 969).
// A safer way is to find the exact substring of cetakRapor block and replace it.
// I'll read it using regex that matches the cetakRapor arrow function block.

const rxCetak = /const cetakRapor = \(siswa: Siswa, idx: number\) => \{[\s\S]*?iframe\.contentWindow\?\.print\(\);\s*setTimeout\(\(\) => document\.body\.removeChild\(iframe\), 1000\);\s*},\s*500\);\s*}\s*};/m;

if (rxCetak.test(content)) {
  content = content.replace(rxCetak, replaceScript);
  
  // Now add the UI button for "Cetak Masal"
  // Search for: <button className={styles.btnOutline} onClick={fetchGrades}
  // And insert the Cetak Masal button next to Download Legger.
  
  const uiSearch = /<button\s*className=\{styles\.btnSecondary\}\s*style=\{\{ background: '#10b981', color: 'white', border: 'none' \}\}/;
  const insertBtn = `
                <button 
                  className={styles.btnPrimary} 
                  disabled={!kelas || isFetchingGrades}
                  onClick={cetakMasal}
                  title="Cetak rapor untuk seluruh siswa di kelas ini secara berurutan"
                >
                  <i className="fas fa-print"></i> Cetak Semua Rapor
                </button>
                <button 
                  className={styles.btnSecondary} 
                  style={{ background: '#10b981', color: 'white', border: 'none' }}`;
                  
  content = content.replace(uiSearch, insertBtn);
  
  // Also change onClick={() => cetakRapor(s, i)} to onClick={() => cetakRapor(s)}
  content = content.replace(/cetakRapor\(s, i\)/g, "cetakRapor(s)");
  
  fs.writeFileSync(path, content);
  console.log("Replaced successfully!");
} else {
  console.log("Could not find cetakRapor block!");
}
