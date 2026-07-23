const fs = require('fs');
const filePath = 'src/app/siswa/page.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const modalCode = `
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
      if (day === 6) return 11; // Sabtu
      return 10;
    };

    const tglMulaiStr = new Date(tglMulai).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    const tglSelesaiStr = new Date(tglSelesai).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

    let printHtml = '';

    rombels.forEach((rombel, rIndex) => {
      const siswaList = grouped[rombel].sort((a, b) => a.nama.localeCompare(b.nama));
      
      let tableHtml = \`
        <table class="main-table">
          <thead>
            <tr>
              <th rowspan="2" style="width: 25px;">No</th>
              <th rowspan="2" style="width: 260px; text-align: center;">NAMA</th>
              <th rowspan="2" style="width: 20px;">L<br/>P</th>
      \`;

      dates.forEach(date => {
        const dayName = date.toLocaleDateString('id-ID', { weekday: 'long' }).toUpperCase();
        const shortDate = \`\${date.getDate()}/\${date.getMonth() + 1}/\${date.getFullYear().toString().slice(-2)}\`;
        const cols = getCols(date.getDay());
        tableHtml += \`<th colspan="\${cols}">\${dayName} (\${shortDate})</th>\`;
      });
      tableHtml += \`</tr><tr>\`;

      dates.forEach(date => {
        const cols = getCols(date.getDay());
        for (let i = 1; i <= cols; i++) {
          tableHtml += \`<th style="width:12px; font-size:7pt; padding:1px;">\${i}</th>\`;
        }
      });
      tableHtml += \`</tr></thead><tbody>\`;

      siswaList.forEach((s, i) => {
        const jk = s.jenisKelamin?.toLowerCase().startsWith('l') ? 'L' : 'P';
        tableHtml += \`
          <tr>
            <td style="text-align: center; font-size: 8pt;">\${i + 1}</td>
            <td style="text-align: left; padding: 2px 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 260px; font-size: 8pt;">\${s.nama}</td>
            <td style="text-align: center; font-size: 8pt;">\${jk}</td>
        \`;
        dates.forEach(date => {
          const cols = getCols(date.getDay());
          for (let j = 1; j <= cols; j++) {
            tableHtml += \`<td style="padding:0;"></td>\`;
          }
        });
        tableHtml += \`</tr>\`;
      });

      tableHtml += \`</tbody></table>\`;

      printHtml += \`
        <div class="page">
          <div class="header">
            <h3>PRESENSI KELAS \${rombel}</h3>
            <h3>MTS ALMAARIF 01 SINGOSARI</h3>
            <h3>TAHUN AJARAN \${tahunAjaran}</h3>
          </div>
          <div class="sub-header">
            <div>SEMESTER: \${semester}</div>
            <div>\${tglMulaiStr} s.d. \${tglSelesaiStr}</div>
          </div>
          \${tableHtml}
        </div>
      \`;
      if (rIndex < rombels.length - 1) {
        printHtml += \`<div style="page-break-after: always;"></div>\`;
      }
    });

    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(\`
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
          table.main-table th, table.main-table td { border: 1px solid black; padding: 2px; text-align: center; height: 16px; }
          table.main-table th { font-weight: bold; }
          @media print { body { -webkit-print-color-adjust: exact; } }
        </style>
      </head>
      <body>
        \${printHtml}
      </body>
      </html>
    \`);
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
        <div className={styles.modalBody} style={{ padding: '20px' }}>
          
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
`;

content = content.replace('// ===== CETAK MODAL (print langsung dari halaman) =====', modalCode + '\n// ===== CETAK MODAL (print langsung dari halaman) =====');
content = content.replace('const [showPrintModal, setShowPrintModal] = useState(false);', 'const [showPrintModal, setShowPrintModal] = useState(false);\n  const [showPresensiModal, setShowPresensiModal] = useState(false);');
content = content.replace('{showPrintModal && (', '{showPresensiModal && (\n        <PrintPresensiModal allData={data} onClose={() => setShowPresensiModal(false)} />\n      )}\n\n      {showPrintModal && (');
content = content.replace('<button onClick={() => setShowPrintModal(true)} className="btn btn-primary"', '<button onClick={() => setShowPresensiModal(true)} className="btn btn-primary" style={{ background: "linear-gradient(135deg,#10b981,#059669)", borderColor: "#10b981", marginRight: "8px" }}>\n              <i className="fas fa-calendar-check"></i> Cetak Absensi\n            </button>\n            <button onClick={() => setShowPrintModal(true)} className="btn btn-primary"');

fs.writeFileSync(filePath, content, 'utf8');
