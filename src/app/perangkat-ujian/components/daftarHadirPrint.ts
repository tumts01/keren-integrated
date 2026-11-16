export interface AssignedParticipant {
  nis: string;
  nisn: string;
  nama: string;
  jenisKelamin: 'L' | 'P' | 'UNKNOWN';
  rombel: string;
  tingkat: number;
  hurufKelas: string;
  ruangNumber: number;
  ruang: string;
  noKursi: number;
  noUjian: string;
  foto: string;
}

export interface RoomGroupPrintData {
  ruangNumber: number;
  ruangName: string;
  gender: 'L' | 'P';
  genderLabel: string;
  quota: number;
  students: AssignedParticipant[];
}

export type PrintPaperMode = 'f4-landscape-2up' | 'f4-portrait-2up' | 'f5-single';

export interface DaftarHadirPrintOptions {
  examTitle: string;
  tahunAjaran: string;
  mataPelajaran: string;
  hariTanggal: string;
  waktuUjian: string;
  paperMode: PrintPaperMode;
  duplicateSingleOn2Up?: boolean;
}

function escapeHtml(text: string | number | null | undefined): string {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function summarizeClasses(students: AssignedParticipant[]): string {
  const counts: Record<string, number> = {};
  students.forEach(s => {
    const k = s.rombel || '-';
    counts[k] = (counts[k] || 0) + 1;
  });
  return Object.entries(counts)
    .map(([k, n]) => `${k} (${n})`)
    .join(', ');
}

function getRowDensity(count: number, isLandscapeHalf: boolean) {
  if (isLandscapeHalf) {
    // Dalam mode F5 Landscape (165mm tinggi), gunakan 2 kolom jika > 15 siswa
    const perCol = count > 15 ? Math.ceil(count / 2) : count;
    if (perCol <= 12) return { fontSize: '8pt', padY: '3.2px', padX: '4px', kopSize: '9pt' };
    if (perCol <= 16) return { fontSize: '7.4pt', padY: '2.2px', padX: '3.5px', kopSize: '8.5pt' };
    return { fontSize: '6.9pt', padY: '1.5px', padX: '3px', kopSize: '8pt' };
  }
  if (count <= 20) return { fontSize: '8.4pt', padY: '3.6px', padX: '4px', kopSize: '9pt' };
  if (count <= 28) return { fontSize: '7.7pt', padY: '2.4px', padX: '3.5px', kopSize: '8.5pt' };
  return { fontSize: '7.1pt', padY: '1.6px', padX: '3px', kopSize: '8.2pt' };
}

function buildAttendanceRowsHtml(
  rows: AssignedParticipant[],
  startNo: number,
  density: { fontSize: string; padY: string; padX: string },
  compactForTwoCol = false
): string {
  return rows
    .map((s, idx) => {
      const num = startNo + idx;
      const isOdd = num % 2 === 1;
      const ttdHtml = isOdd
        ? `<div style="display:flex;justify-content:flex-start;align-items:center;padding-left:3px;"><span>${num}.</span></div>`
        : `<div style="display:flex;justify-content:center;align-items:center;padding-left:14px;"><span>${num}.</span></div>`;

      return `
        <tr>
          <td style="text-align:center;border:1px solid #1e293b;padding:${density.padY} ${density.padX};">${num}</td>
          <td style="text-align:center;border:1px solid #1e293b;padding:${density.padY} ${density.padX};white-space:nowrap;">${escapeHtml(s.noUjian)}</td>
          <td style="border:1px solid #1e293b;padding:${density.padY} ${density.padX};${compactForTwoCol ? 'max-width:38mm;' : 'max-width:56mm;'}overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:500;">${escapeHtml(s.nama)}</td>
          <td style="text-align:center;border:1px solid #1e293b;padding:${density.padY} ${density.padX};white-space:nowrap;">${escapeHtml(s.rombel)}</td>
          <td style="border:1px solid #1e293b;padding:${density.padY} ${density.padX};font-size:7pt;color:#334155;">${ttdHtml}</td>
        </tr>
      `;
    })
    .join('');
}

function renderSingleF5Card(
  room: RoomGroupPrintData,
  chunk: AssignedParticipant[],
  startIndex: number,
  chunkPageIdx: number,
  totalChunksForRoom: number,
  options: DaftarHadirPrintOptions,
  originUrl: string
): string {
  const isLandscapeHalf = options.paperMode === 'f4-portrait-2up';
  const density = getRowDensity(chunk.length, isLandscapeHalf);
  const useTwoCol = isLandscapeHalf && chunk.length > 15;
  const isLastChunk = chunkPageIdx === totalChunksForRoom - 1;

  const mapelDisplay = options.mataPelajaran.trim()
    ? escapeHtml(options.mataPelajaran.trim())
    : '................................................';
  const tanggalDisplay = options.hariTanggal.trim()
    ? escapeHtml(options.hariTanggal.trim())
    : '........................................';
  const waktuDisplay = options.waktuUjian.trim()
    ? escapeHtml(options.waktuUjian.trim())
    : '........................................';
  const examTitle = options.examTitle.trim() || 'DAFTAR HADIR PESERTA UJIAN';
  const taDisplay = options.tahunAjaran.trim() ? `TAHUN AJARAN ${escapeHtml(options.tahunAjaran.trim())}` : '';
  const classSummary = summarizeClasses(room.students);

  const tableHead = (compact = false) => `
    <thead>
      <tr style="background:#f1f5f9;">
        <th style="border:1px solid #1e293b;padding:${density.padY} ${density.padX};width:${compact ? '18px' : '22px'};text-align:center;">No</th>
        <th style="border:1px solid #1e293b;padding:${density.padY} ${density.padX};width:${compact ? '46px' : '62px'};text-align:center;">No. Ujian</th>
        <th style="border:1px solid #1e293b;padding:${density.padY} ${density.padX};text-align:left;">Nama Peserta</th>
        <th style="border:1px solid #1e293b;padding:${density.padY} ${density.padX};width:${compact ? '26px' : '34px'};text-align:center;">Kls</th>
        <th style="border:1px solid #1e293b;padding:${density.padY} ${density.padX};width:${compact ? '54px' : '86px'};text-align:center;">Tanda Tangan</th>
      </tr>
    </thead>
  `;

  let tablesHtml = '';
  if (useTwoCol) {
    const mid = Math.ceil(chunk.length / 2);
    const leftRows = chunk.slice(0, mid);
    const rightRows = chunk.slice(mid);
    tablesHtml = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:4mm;align-items:start;">
        <table style="width:100%;border-collapse:collapse;font-size:${density.fontSize};">
          ${tableHead(true)}
          <tbody>${buildAttendanceRowsHtml(leftRows, startIndex + 1, density, true)}</tbody>
        </table>
        <table style="width:100%;border-collapse:collapse;font-size:${density.fontSize};">
          ${tableHead(true)}
          <tbody>${buildAttendanceRowsHtml(rightRows, startIndex + mid + 1, density, true)}</tbody>
        </table>
      </div>
    `;
  } else {
    tablesHtml = `
      <table style="width:100%;border-collapse:collapse;font-size:${density.fontSize};">
        ${tableHead(false)}
        <tbody>${buildAttendanceRowsHtml(chunk, startIndex + 1, density, false)}</tbody>
      </table>
    `;
  }

  const footerHtml = isLastChunk
    ? `
      <div style="margin-top:auto;padding-top:4px;display:flex;justify-content:space-between;align-items:flex-end;gap:8px;">
        <table style="border-collapse:collapse;font-size:7.4pt;width:54%;">
          <tr>
            <td style="border:1px solid #334155;padding:2px 5px;background:#f8fafc;font-weight:bold;" colspan="2">Rekap Kehadiran (${escapeHtml(room.ruangName)})</td>
          </tr>
          <tr>
            <td style="border:1px solid #334155;padding:2px 5px;">Jumlah Peserta Seharusnya</td>
            <td style="border:1px solid #334155;padding:2px 5px;width:44px;text-align:center;font-weight:bold;">${room.students.length}</td>
          </tr>
          <tr>
            <td style="border:1px solid #334155;padding:2px 5px;">Peserta Hadir</td>
            <td style="border:1px solid #334155;padding:2px 5px;text-align:center;">..........</td>
          </tr>
          <tr>
            <td style="border:1px solid #334155;padding:2px 5px;">Peserta Tidak Hadir</td>
            <td style="border:1px solid #334155;padding:2px 5px;text-align:center;">..........</td>
          </tr>
        </table>
        <div style="width:43%;font-size:7.6pt;line-height:1.25;text-align:left;padding-left:6px;">
          <div>Singosari, .......................... 20....</div>
          <div style="font-weight:bold;">Pengawas Ruang,</div>
          <div style="height:26px;"></div>
          <div style="font-weight:bold;">( ......................................... )</div>
          <div style="font-size:6.8pt;color:#475569;">NIP/NUPTK. ................................</div>
        </div>
      </div>
    `
    : `
      <div style="margin-top:auto;padding-top:4px;text-align:right;font-size:7.2pt;font-style:italic;color:#475569;">
        Berlanjut ke halaman berikutnya (Hal ${chunkPageIdx + 1}/${totalChunksForRoom}) &rarr;
      </div>
    `;

  return `
    <div class="f5-card">
      <div style="display:flex;align-items:center;border-bottom:2.5px double #0f172a;padding-bottom:3px;margin-bottom:4px;gap:8px;">
        <img src="${originUrl}/logo.png" alt="Logo" style="width:34px;height:34px;object-fit:contain;flex-shrink:0;" />
        <div style="flex:1;text-align:center;line-height:1.18;font-family:Arial, sans-serif;">
          <div style="font-size:7.2pt;font-weight:600;">KEMENTERIAN AGAMA REPUBLIK INDONESIA</div>
          <div style="font-size:7.4pt;font-weight:700;">YAYASAN PENDIDIKAN ALMAARIF SINGOSARI</div>
          <div style="font-size:${density.kopSize};font-weight:800;">MTs ALMAARIF 01 SINGOSARI</div>
          <div style="font-size:6.6pt;color:#334155;">Jl. Masjid No. 33 Singosari Kab. Malang Telp. (0341) 458355</div>
        </div>
      </div>

      <div style="text-align:center;border:1px solid #0f172a;background:#f8fafc;padding:2.5px 4px;margin-bottom:4px;">
        <div style="font-size:8.4pt;font-weight:800;letter-spacing:0.2px;">DAFTAR HADIR PESERTA — ${escapeHtml(examTitle.toUpperCase())}</div>
        ${taDisplay ? `<div style="font-size:7.1pt;font-weight:600;color:#334155;">${taDisplay}</div>` : ''}
      </div>

      <table style="width:100%;font-size:7.4pt;margin-bottom:4px;border-collapse:collapse;">
        <tr>
          <td style="width:16%;padding:1px 2px;font-weight:700;">Ruang</td>
          <td style="width:2%;padding:1px 0;">:</td>
          <td style="width:36%;padding:1px 2px;">
            <b>${escapeHtml(room.ruangName)}</b> (${escapeHtml(room.genderLabel)})${totalChunksForRoom > 1 ? ` • Hal ${chunkPageIdx + 1}/${totalChunksForRoom}` : ''}
          </td>
          <td style="width:17%;padding:1px 2px;font-weight:700;">Hari / Tgl</td>
          <td style="width:2%;padding:1px 0;">:</td>
          <td style="width:27%;padding:1px 2px;">${tanggalDisplay}</td>
        </tr>
        <tr>
          <td style="padding:1px 2px;font-weight:700;">Mata Pelajaran</td>
          <td style="padding:1px 0;">:</td>
          <td style="padding:1px 2px;">${mapelDisplay}</td>
          <td style="padding:1px 2px;font-weight:700;">Waktu / Jam</td>
          <td style="padding:1px 0;">:</td>
          <td style="padding:1px 2px;">${waktuDisplay}</td>
        </tr>
        ${
          classSummary
            ? `<tr>
                <td style="padding:1px 2px;font-weight:700;vertical-align:top;">Peserta Kelas</td>
                <td style="padding:1px 0;vertical-align:top;">:</td>
                <td colspan="4" style="padding:1px 2px;font-size:7pt;color:#1e293b;">${escapeHtml(classSummary)}</td>
              </tr>`
            : ''
        }
      </table>

      <div style="flex:1;">
        ${tablesHtml}
      </div>

      ${footerHtml}
    </div>
  `;
}

export function buildDaftarHadirHtml(
  rooms: RoomGroupPrintData[],
  options: DaftarHadirPrintOptions,
  originUrl: string
): string {
  const maxPerSheet = options.paperMode === 'f4-portrait-2up' ? 34 : 34;

  const cards: string[] = [];
  rooms.forEach(room => {
    if (room.students.length === 0) return;
    const chunks: AssignedParticipant[][] = [];
    for (let i = 0; i < room.students.length; i += maxPerSheet) {
      chunks.push(room.students.slice(i, i + maxPerSheet));
    }
    chunks.forEach((chunk, chunkIdx) => {
      cards.push(
        renderSingleF5Card(
          room,
          chunk,
          chunkIdx * maxPerSheet,
          chunkIdx,
          chunks.length,
          options,
          originUrl
        )
      );
    });
  });

  if (options.paperMode !== 'f5-single' && cards.length === 1 && options.duplicateSingleOn2Up) {
    cards.push(cards[0]);
  }

  let pageSizeCss = '330mm 215mm';
  let sheetLayoutCss = '';
  let pagesHtml = '';

  if (options.paperMode === 'f4-landscape-2up') {
    pageSizeCss = '330mm 215mm';
    sheetLayoutCss = `
      .f4-sheet {
        width: 330mm;
        height: 215mm;
        display: flex;
        flex-direction: row;
        background: #fff;
        margin: 0 auto 12px auto;
        box-shadow: 0 2px 10px rgba(0,0,0,0.12);
        page-break-after: always;
        break-after: page;
        overflow: hidden;
      }
      .f5-slot {
        width: 165mm;
        height: 215mm;
        padding: 5.5mm 6.5mm;
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
      }
      .f5-slot:first-child {
        border-right: 1px dashed #94a3b8;
      }
      .f5-card {
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
      }
    `;
    for (let i = 0; i < cards.length; i += 2) {
      pagesHtml += `
        <div class="f4-sheet">
          <div class="f5-slot">${cards[i] || ''}</div>
          <div class="f5-slot">${cards[i + 1] || ''}</div>
        </div>
      `;
    }
  } else if (options.paperMode === 'f4-portrait-2up') {
    pageSizeCss = '215mm 330mm';
    sheetLayoutCss = `
      .f4-sheet {
        width: 215mm;
        height: 330mm;
        display: flex;
        flex-direction: column;
        background: #fff;
        margin: 0 auto 12px auto;
        box-shadow: 0 2px 10px rgba(0,0,0,0.12);
        page-break-after: always;
        break-after: page;
        overflow: hidden;
      }
      .f5-slot {
        width: 215mm;
        height: 165mm;
        padding: 5mm 7.5mm;
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
      }
      .f5-slot:first-child {
        border-bottom: 1px dashed #94a3b8;
      }
      .f5-card {
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
      }
    `;
    for (let i = 0; i < cards.length; i += 2) {
      pagesHtml += `
        <div class="f4-sheet">
          <div class="f5-slot">${cards[i] || ''}</div>
          <div class="f5-slot">${cards[i + 1] || ''}</div>
        </div>
      `;
    }
  } else {
    pageSizeCss = '165mm 215mm';
    sheetLayoutCss = `
      .f5-single-sheet {
        width: 165mm;
        height: 215mm;
        padding: 5.5mm 6.5mm;
        box-sizing: border-box;
        background: #fff;
        margin: 0 auto 12px auto;
        box-shadow: 0 2px 10px rgba(0,0,0,0.12);
        page-break-after: always;
        break-after: page;
        overflow: hidden;
        display: flex;
        flex-direction: column;
      }
      .f5-card {
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
      }
    `;
    pagesHtml = cards.map(c => `<div class="f5-single-sheet">${c}</div>`).join('');
  }

  const modeHint =
    options.paperMode === 'f4-landscape-2up'
      ? 'Kertas F4 Landscape (330 × 215 mm) — Berisi 2 lembar F5 Portrait (165 × 215 mm) kiri & kanan, tinggal potong tengah.'
      : options.paperMode === 'f4-portrait-2up'
      ? 'Kertas F4 Portrait (215 × 330 mm) — Berisi 2 lembar F5 Landscape (215 × 165 mm) atas & bawah, tinggal potong tengah.'
      : 'Kertas F5 Portrait (165 × 215 mm) — 1 lembar per halaman.';

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <title>Cetak Daftar Hadir Ujian (F5)</title>
  <style>
    @page {
      size: ${pageSizeCss};
      margin: 0;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 12px 0;
      background: #e2e8f0;
      font-family: 'Times New Roman', Times, serif;
      color: #0f172a;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .print-toolbar {
      position: sticky;
      top: 0;
      z-index: 50;
      background: #0f172a;
      color: #fff;
      padding: 10px 18px;
      margin: -12px auto 14px auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      font-family: Arial, sans-serif;
      font-size: 13px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    }
    .print-btn {
      background: #10b981;
      color: #fff;
      border: none;
      border-radius: 6px;
      padding: 8px 16px;
      font-weight: 700;
      cursor: pointer;
      font-size: 13px;
    }
    ${sheetLayoutCss}
    @media print {
      body {
        padding: 0;
        background: #fff;
      }
      .no-print {
        display: none !important;
      }
      .f4-sheet, .f5-single-sheet {
        margin: 0 !important;
        box-shadow: none !important;
      }
      .f4-sheet:last-child, .f5-single-sheet:last-child {
        page-break-after: auto;
        break-after: auto;
      }
    }
  </style>
</head>
<body>
  <div class="print-toolbar no-print">
    <div>
      <div style="font-weight:700;">Preview Cetak Daftar Hadir Ukuran F5 (${cards.length} Lembar)</div>
      <div style="font-size:11.5px;color:#cbd5e1;margin-top:2px;">${escapeHtml(modeHint)} Set Margin Print ke <b>None / Default</b> dan Scale <b>100%</b>.</div>
    </div>
    <button class="print-btn" onclick="window.print()">Cetak Sekarang</button>
  </div>
  ${pagesHtml}
</body>
</html>`;
}
