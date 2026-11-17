import { AssignedParticipant } from './daftarHadirPrint';

export type DenahOrderPattern = 'baris-kiri-kanan' | 'zigzag-ular' | 'kolom-depan-belakang';
export type DenahSesiView = 'gabungan' | 'pagi' | 'siang';

export interface DenahRoomInput {
  ruangNumber: number;
  ruangName: string;
  genderLabel: string;
  quotaKursi: number;
  quotaPagi: number;
  quotaSiang?: number;
  pagiPairMode?: boolean;
  siangPairMode?: boolean;
  pagiGradesLabel?: string;
  siangGradesLabel?: string;
  pagiStudents: AssignedParticipant[];
  siangStudents: AssignedParticipant[];
}

export interface DeskSlot {
  deskNumber: number;
  pagi: AssignedParticipant | null;
  pagiKiri: AssignedParticipant | null;
  pagiKanan: AssignedParticipant | null;
  siangKiri: AssignedParticipant | null;
  siangKanan: AssignedParticipant | null;
}

export interface DenahPrintOptions {
  examTitle: string;
  tahunAjaran: string;
  cols: number;
  pattern: DenahOrderPattern;
  sesiView: DenahSesiView;
}

function escapeHtml(text: string | number | null | undefined): string {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function buildDeskSlotsForRoom(room: DenahRoomInput): DeskSlot[] {
  const pagiPair = Boolean(room.pagiPairMode);
  const siangPair = room.siangPairMode !== false;
  const maxSiangKursi = room.siangStudents.reduce((m, s) => Math.max(m, s.noKursi), 0);
  const maxPagiKursi = room.pagiStudents.reduce((m, s) => Math.max(m, s.noKursi), 0);
  const pagiDesks = pagiPair
    ? Math.max(Math.ceil(room.quotaPagi / 2), Math.ceil(maxPagiKursi / 2))
    : Math.max(room.quotaPagi, maxPagiKursi);
  const siangQuota = typeof room.quotaSiang === 'number' ? room.quotaSiang : room.quotaKursi;
  const siangDesks = siangPair
    ? Math.max(Math.ceil(siangQuota / 2), Math.ceil(maxSiangKursi / 2))
    : Math.max(siangQuota, maxSiangKursi);
  const totalDesks = Math.max(
    Math.ceil(room.quotaKursi / 2),
    pagiDesks,
    siangDesks,
    0
  );

  const pagiBySeat: Record<number, AssignedParticipant> = {};
  room.pagiStudents.forEach(s => {
    pagiBySeat[s.noKursi] = s;
  });

  const siangBySeat: Record<number, AssignedParticipant> = {};
  room.siangStudents.forEach(s => {
    siangBySeat[s.noKursi] = s;
  });

  const slots: DeskSlot[] = [];
  for (let d = 1; d <= totalDesks; d++) {
    const pagiLeft = pagiPair ? pagiBySeat[2 * d - 1] || null : pagiBySeat[d] || null;
    const pagiRight = pagiPair ? pagiBySeat[2 * d] || null : null;
    const siangLeft = siangPair ? siangBySeat[2 * d - 1] || null : siangBySeat[d] || null;
    const siangRight = siangPair ? siangBySeat[2 * d] || null : null;
    slots.push({
      deskNumber: d,
      pagi: pagiLeft,
      pagiKiri: pagiLeft,
      pagiKanan: pagiRight,
      siangKiri: siangLeft,
      siangKanan: siangRight
    });
  }
  return slots;
}

export function buildDeskGrid(
  slots: DeskSlot[],
  cols: number,
  pattern: DenahOrderPattern
): (DeskSlot | null)[][] {
  const safeCols = Math.max(1, cols);
  const total = slots.length;
  if (total === 0) return [];
  const rows = Math.ceil(total / safeCols);
  const grid: (DeskSlot | null)[][] = Array.from({ length: rows }, () =>
    Array.from({ length: safeCols }, () => null)
  );

  if (pattern === 'baris-kiri-kanan') {
    slots.forEach((slot, idx) => {
      const r = Math.floor(idx / safeCols);
      const c = idx % safeCols;
      grid[r][c] = slot;
    });
    return grid;
  }

  let idx = 0;
  for (let c = 0; c < safeCols && idx < total; c++) {
    const colCount = Math.min(rows, total - idx);
    if (pattern === 'kolom-depan-belakang' || c % 2 === 0) {
      for (let r = 0; r < colCount && idx < total; r++) {
        grid[r][c] = slots[idx++];
      }
    } else {
      for (let r = colCount - 1; r >= 0 && idx < total; r--) {
        grid[r][c] = slots[idx++];
      }
    }
  }
  return grid;
}

function renderSeatLine(p: AssignedParticipant | null, emptyText: string, compact = false) {
  if (!p) {
    return `<div style="font-size:6.8pt;color:#94a3b8;font-style:italic;text-align:center;">${escapeHtml(emptyText)}</div>`;
  }
  const codeSize = compact ? '5.5pt' : '7.4pt';
  const nameSize = compact ? '6.6pt' : '7pt';
  return `
    <div style="font-weight:800;font-size:${codeSize};color:#0369a1;letter-spacing:-0.25px;line-height:1.15;text-align:center;overflow-wrap:anywhere;word-break:break-word;">${escapeHtml(p.noUjian)}</div>
    <div style="font-size:${nameSize};font-weight:700;color:#1e293b;line-height:1.15;margin-top:1.5px;text-align:center;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;" title="${escapeHtml(p.nama)}">${escapeHtml(p.nama)}</div>
    <div style="font-size:6pt;color:#475569;margin-top:1px;text-align:center;">${escapeHtml(p.rombel)} (${escapeHtml(p.jenisKelamin)})</div>
  `;
}

function renderRoomDenahPage(
  room: DenahRoomInput,
  options: DenahPrintOptions,
  originUrl: string
): string {
  const slots = buildDeskSlotsForRoom(room);
  const grid = buildDeskGrid(slots, options.cols, options.pattern);
  const patternLabel =
    options.pattern === 'zigzag-ular'
      ? 'Zig-Zag Ular'
      : options.pattern === 'kolom-depan-belakang'
      ? 'Kolom Depan→Belakang'
      : 'Baris Kiri→Kanan';

  const pagiPair = Boolean(room.pagiPairMode);
  const siangPair = room.siangPairMode !== false;
  const pagiLabel = room.pagiGradesLabel || 'Kls 9';
  const siangLabel = room.siangGradesLabel || 'Kls 7 & 8';
  const siangQuota = typeof room.quotaSiang === 'number' ? room.quotaSiang : room.quotaKursi;

  const cellsHtml = grid
    .map(row =>
      row
        .map(slot => {
          if (!slot) {
            return `<div></div>`;
          }

          const showPagi = options.sesiView === 'gabungan' || options.sesiView === 'pagi';
          const showSiang = options.sesiView === 'gabungan' || options.sesiView === 'siang';

          const pagiHtml = !showPagi
            ? ''
            : pagiPair
            ? `<div style="display:grid;grid-template-columns:1fr 1fr;background:#fffbeb;border-bottom:${showSiang ? '1px dashed #cbd5e1' : 'none'};min-width:0;">
                <div style="padding:4px;border-right:1px solid #fde68a;min-width:0;overflow:hidden;text-align:center;">
                  <div style="font-size:5.7pt;font-weight:800;color:#b45309;margin-bottom:1px;text-align:center;">Pagi Kiri (${2 * slot.deskNumber - 1})</div>
                  ${renderSeatLine(slot.pagiKiri, '-', true)}
                </div>
                <div style="padding:4px;min-width:0;overflow:hidden;text-align:center;">
                  <div style="font-size:5.7pt;font-weight:800;color:#b45309;margin-bottom:1px;text-align:center;">Pagi Kanan (${2 * slot.deskNumber})</div>
                  ${renderSeatLine(slot.pagiKanan, '-', true)}
                </div>
              </div>`
            : `<div style="background:#fffbeb;padding:4px 5px;border-bottom:${showSiang ? '1px dashed #cbd5e1' : 'none'};min-width:0;overflow:hidden;text-align:center;">
                <div style="font-size:5.8pt;font-weight:800;color:#b45309;text-transform:uppercase;margin-bottom:1px;text-align:center;">Pagi (${escapeHtml(pagiLabel)} • Sendiri)</div>
                ${renderSeatLine(slot.pagi, 'Bangku kosong', false)}
              </div>`;

          const siangHtml = !showSiang
            ? ''
            : siangPair
            ? `<div style="display:grid;grid-template-columns:1fr 1fr;background:#f8fafc;flex:1;min-width:0;">
                <div style="padding:4px;border-right:1px solid #cbd5e1;min-width:0;overflow:hidden;text-align:center;">
                  <div style="font-size:5.7pt;font-weight:800;color:#4338ca;margin-bottom:1px;text-align:center;">Siang Kiri (${2 * slot.deskNumber - 1})</div>
                  ${renderSeatLine(slot.siangKiri, '-', true)}
                </div>
                <div style="padding:4px;min-width:0;overflow:hidden;text-align:center;">
                  <div style="font-size:5.7pt;font-weight:800;color:#4338ca;margin-bottom:1px;text-align:center;">Siang Kanan (${2 * slot.deskNumber})</div>
                  ${renderSeatLine(slot.siangKanan, '-', true)}
                </div>
              </div>`
            : `<div style="background:#f8fafc;padding:4px 5px;flex:1;min-width:0;overflow:hidden;text-align:center;">
                <div style="font-size:5.8pt;font-weight:800;color:#4338ca;text-transform:uppercase;margin-bottom:1px;text-align:center;">Siang (${escapeHtml(siangLabel)} • Sendiri)</div>
                ${renderSeatLine(slot.siangKiri, 'Bangku kosong', false)}
              </div>`;

          return `
            <div style="border:1.4px solid #334155;border-radius:6px;overflow:hidden;background:#fff;display:flex;flex-direction:column;min-width:0;">
              <div style="background:#0f172a;color:#fff;padding:2.5px 6px;font-size:7.2pt;font-weight:800;display:flex;justify-content:space-between;align-items:center;">
                <span>BANGKU ${slot.deskNumber}</span>
                <span style="font-size:6.2pt;font-weight:600;color:#cbd5e1;">K.${2 * slot.deskNumber - 1}-${2 * slot.deskNumber}</span>
              </div>
              ${pagiHtml}
              ${siangHtml}
            </div>
          `;
        })
        .join('')
    )
    .join('');

  return `
    <div class="denah-page">
      <div style="display:flex;align-items:center;border-bottom:2.5px double #0f172a;padding-bottom:4px;margin-bottom:6px;gap:10px;">
        <img src="${originUrl}/logo.png" alt="Logo" style="width:40px;height:40px;object-fit:contain;" />
        <div style="flex:1;text-align:center;line-height:1.2;">
          <div style="font-size:8pt;font-weight:600;">KEMENTERIAN AGAMA REPUBLIK INDONESIA • MTs ALMAARIF 01 SINGOSARI</div>
          <div style="font-size:11pt;font-weight:800;margin-top:1px;">DENAH MAPPING TEMPAT DUDUK — ${escapeHtml(room.ruangName.toUpperCase())}</div>
          <div style="font-size:8pt;color:#334155;">
            ${escapeHtml(options.examTitle)} ${options.tahunAjaran ? `TA ${escapeHtml(options.tahunAjaran)}` : ''} &bull; Jenis: <b>${escapeHtml(room.genderLabel)}</b> &bull; Pola: ${escapeHtml(patternLabel)}
          </div>
        </div>
      </div>

      <div style="display:flex;justify-content:space-between;align-items:center;font-size:7.8pt;margin-bottom:8px;padding:4px 8px;background:#f8fafc;border:1px solid #cbd5e1;border-radius:4px;">
        <span><b>Pagi (${escapeHtml(pagiLabel)}):</b> ${room.pagiStudents.length} siswa (${room.quotaPagi} ${pagiPair ? 'kursi' : 'bangku'})</span>
        <span><b>Siang (${escapeHtml(siangLabel)}):</b> ${room.siangStudents.length} siswa (${siangQuota} ${siangPair ? 'kursi' : 'bangku'})</span>
      </div>

      <div style="display:grid;grid-template-columns:1fr auto;gap:12px;align-items:center;margin-bottom:10px;">
        <div style="border:1.5px solid #0f172a;background:#e2e8f0;text-align:center;padding:5px;font-size:8pt;font-weight:800;letter-spacing:0.6px;border-radius:4px;">
          PAPAN TULIS / BAGIAN DEPAN RUANG
        </div>
        <div style="border:1.5px solid #0f172a;background:#f1f5f9;text-align:center;padding:5px 14px;font-size:7.6pt;font-weight:700;border-radius:4px;">
          MEJA PENGAWAS
        </div>
      </div>

      <div style="display:grid;grid-template-columns:repeat(${options.cols}, minmax(0, 1fr));gap:7px;">
        ${cellsHtml}
      </div>

      <div style="margin-top:auto;padding-top:8px;font-size:7.5pt;color:#475569;display:flex;justify-content:space-between;">
        <span>Catatan: Urutan baris dimulai dari baris paling depan (dekat papan tulis &amp; pengawas).</span>
        <span>Panitia Penata Ruang • ${escapeHtml(room.ruangName)}</span>
      </div>
    </div>
  `;
}

export function buildDenahRuangHtml(
  rooms: DenahRoomInput[],
  options: DenahPrintOptions,
  originUrl: string
): string {
  const pagesHtml = rooms.map(r => renderRoomDenahPage(r, options, originUrl)).join('');

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <title>Cetak Denah Mapping Tempat Duduk (${rooms.length} Ruang)</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 8mm;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 12px 0;
      background: #e2e8f0;
      font-family: Arial, sans-serif;
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
      font-size: 13px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    }
    .print-btn {
      background: #0ea5e9;
      color: #fff;
      border: none;
      border-radius: 6px;
      padding: 8px 16px;
      font-weight: 700;
      cursor: pointer;
      font-size: 13px;
    }
    .denah-page {
      width: 210mm;
      min-height: 297mm;
      padding: 10mm;
      background: #fff;
      margin: 0 auto 14px auto;
      box-shadow: 0 2px 10px rgba(0,0,0,0.12);
      page-break-after: always;
      break-after: page;
      display: flex;
      flex-direction: column;
    }
    @media print {
      body {
        padding: 0;
        background: #fff;
      }
      .no-print {
        display: none !important;
      }
      .denah-page {
        width: auto;
        min-height: 278mm;
        margin: 0;
        padding: 0;
        box-shadow: none;
      }
      .denah-page:last-child {
        page-break-after: auto;
        break-after: auto;
      }
    }
  </style>
</head>
<body>
  <div class="print-toolbar no-print">
    <div>
      <div style="font-weight:700;">Preview Denah Mapping Tempat Duduk (${rooms.length} Ruang)</div>
      <div style="font-size:11.5px;color:#cbd5e1;margin-top:2px;">Ukuran cetak A4 Portrait (cocok juga di kertas F4). Cocok ditempel di pintu ruang atau dibawa saat menata nobang.</div>
    </div>
    <button class="print-btn" onclick="window.print()">Cetak Denah Sekarang</button>
  </div>
  ${pagesHtml}
</body>
</html>`;
}
