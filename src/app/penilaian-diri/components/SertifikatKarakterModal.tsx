'use client';
import React, { useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback } from 'react';
import Swal from 'sweetalert2';
import { getRaporConfigSingle, upsertRaporConfig } from '@/lib/rapor-config-client';

export const SERTIFIKAT_CONFIG_KEY = 'sertifikat_karakter_template_v1';

export type CertFieldKey = 'nama' | 'nisn' | 'kelas' | 'karakter_tertinggi';

export interface CertFieldConfig {
  key: CertFieldKey;
  label: string;
  enabled: boolean;
  x: number; // percentage 0..100
  y: number; // percentage 0..100
  fontSize: number; // pt (scaled 1:1 to A4 width)
  fontFamily: string;
  color: string;
  bold: boolean;
  italic: boolean;
  align: 'left' | 'center' | 'right';
  textTransform: 'none' | 'uppercase' | 'capitalize';
  prefix: string;
  suffix: string;
  maxWidth: number; // percentage 0..100 (0 = bebas / tanpa batas)
  overflowMode: 'shrink' | 'wrap';
}

export interface CertTemplateConfig {
  bgImage: string; // compressed Data URL (JPEG/PNG)
  orientation: 'landscape' | 'portrait';
  fitMode: 'fill' | 'contain';
  fields: Record<CertFieldKey, CertFieldConfig>;
  updatedAt?: string;
}

export interface RekapSiswaCert {
  nisn: string;
  nama: string;
  kelas: string;
  scores: Record<string, number>;
  total: number;
}

export interface TraitDef {
  id: string;
  label: string;
}

export const FONT_OPTIONS = [
  { label: 'Classic Serif (Playfair / Georgia)', value: "'Playfair Display', Georgia, 'Times New Roman', serif" },
  { label: 'Formal Serif (Times New Roman)', value: "'Times New Roman', Times, serif" },
  { label: 'Modern Sans (Poppins / Segoe UI)', value: "'Poppins', 'Segoe UI', Arial, sans-serif" },
  { label: 'Clean Sans (Montserrat / Arial)', value: "'Montserrat', Arial, Helvetica, sans-serif" },
  { label: 'Elegant Script (Great Vibes)', value: "'Great Vibes', 'Brush Script MT', cursive" },
];

export const createDefaultCertTemplate = (): CertTemplateConfig => ({
  bgImage: '',
  orientation: 'landscape',
  fitMode: 'fill',
  fields: {
    nama: {
      key: 'nama',
      label: 'Nama Siswa',
      enabled: true,
      x: 50,
      y: 44,
      fontSize: 28,
      fontFamily: FONT_OPTIONS[0].value,
      color: '#1e293b',
      bold: true,
      italic: false,
      align: 'center',
      textTransform: 'uppercase',
      prefix: '',
      suffix: '',
      maxWidth: 56,
      overflowMode: 'shrink',
    },
    nisn: {
      key: 'nisn',
      label: 'NISN',
      enabled: true,
      x: 50,
      y: 51,
      fontSize: 13,
      fontFamily: FONT_OPTIONS[2].value,
      color: '#334155',
      bold: false,
      italic: false,
      align: 'center',
      textTransform: 'none',
      prefix: 'NISN: ',
      suffix: '',
      maxWidth: 0,
      overflowMode: 'shrink',
    },
    kelas: {
      key: 'kelas',
      label: 'Kelas',
      enabled: true,
      x: 50,
      y: 56,
      fontSize: 14,
      fontFamily: FONT_OPTIONS[2].value,
      color: '#334155',
      bold: true,
      italic: false,
      align: 'center',
      textTransform: 'none',
      prefix: 'Kelas ',
      suffix: '',
      maxWidth: 0,
      overflowMode: 'shrink',
    },
    karakter_tertinggi: {
      key: 'karakter_tertinggi',
      label: 'Karakter Poin Tertinggi',
      enabled: true,
      x: 50,
      y: 65,
      fontSize: 22,
      fontFamily: FONT_OPTIONS[0].value,
      color: '#0f766e',
      bold: true,
      italic: false,
      align: 'center',
      textTransform: 'uppercase',
      prefix: '',
      suffix: '',
      maxWidth: 0,
      overflowMode: 'shrink',
    },
  },
});

export const FIELD_KEYS: CertFieldKey[] = ['nama', 'nisn', 'kelas', 'karakter_tertinggi'];

function hashStringFNV1a(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function getHighestTraitInfo(
  scores: Record<string, number> | undefined,
  traits: TraitDef[],
  seed = ''
): { label: string; score: number; tiedCount: number } {
  if (!traits || traits.length === 0) return { label: '-', score: 0, tiedCount: 0 };

  let maxVal = 0;
  for (const t of traits) {
    const v = Number(scores?.[t.id] || 0);
    if (v > maxVal) maxVal = v;
  }

  const winners = traits
    .filter((t) => Number(scores?.[t.id] || 0) === maxVal)
    .map((t) => t.label);

  if (winners.length === 0) return { label: '-', score: 0, tiedCount: 0 };
  if (winners.length === 1) return { label: winners[0], score: maxVal, tiedCount: 1 };

  // Deterministic random pick among tied highest traits so preview and printed certificate match
  const hash = hashStringFNV1a(`${seed}::${maxVal}::${winners.join('|')}`);
  const picked = winners[hash % winners.length];
  return { label: picked, score: maxVal, tiedCount: winners.length };
}

export function getHighestTraitLabel(
  scores: Record<string, number> | undefined,
  traits: TraitDef[],
  seed = ''
): string {
  return getHighestTraitInfo(scores, traits, seed).label;
}

export function resolveFieldText(
  student: RekapSiswaCert,
  field: CertFieldConfig,
  traits: TraitDef[]
): string {
  let raw = '';
  if (field.key === 'nama') raw = student.nama || '-';
  else if (field.key === 'nisn') raw = student.nisn || '-';
  else if (field.key === 'kelas') raw = student.kelas || '-';
  else if (field.key === 'karakter_tertinggi') {
    raw = getHighestTraitLabel(student.scores, traits, student.nisn || student.nama);
  }

  return `${field.prefix || ''}${raw}${field.suffix || ''}`;
}

export function mergeWithDefaultTemplate(raw: any): CertTemplateConfig {
  const def = createDefaultCertTemplate();
  if (!raw || typeof raw !== 'object') return def;

  const mergedFields: Record<CertFieldKey, CertFieldConfig> = { ...def.fields };
  if (raw.fields && typeof raw.fields === 'object') {
    for (const k of FIELD_KEYS) {
      if (raw.fields[k]) {
        mergedFields[k] = {
          ...def.fields[k],
          ...raw.fields[k],
          key: k,
        };
      }
    }
  }

  return {
    bgImage: typeof raw.bgImage === 'string' ? raw.bgImage : '',
    orientation: raw.orientation === 'portrait' ? 'portrait' : 'landscape',
    fitMode: raw.fitMode === 'contain' ? 'contain' : 'fill',
    fields: mergedFields,
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : undefined,
  };
}

export async function loadCertTemplateConfig(): Promise<CertTemplateConfig> {
  try {
    const { data, error } = await getRaporConfigSingle(SERTIFIKAT_CONFIG_KEY);

    if (!error && data?.value) {
      const parsed = mergeWithDefaultTemplate(JSON.parse(data.value));
      try {
        localStorage.setItem(SERTIFIKAT_CONFIG_KEY, JSON.stringify(parsed));
      } catch {}
      return parsed;
    }
  } catch (err) {
    console.error('Gagal memuat template sertifikat dari Supabase:', err);
  }

  try {
    const localRaw = localStorage.getItem(SERTIFIKAT_CONFIG_KEY);
    if (localRaw) {
      return mergeWithDefaultTemplate(JSON.parse(localRaw));
    }
  } catch {}

  return createDefaultCertTemplate();
}

export async function saveCertTemplateConfig(template: CertTemplateConfig): Promise<void> {
  const payload: CertTemplateConfig = {
    ...template,
    updatedAt: new Date().toISOString(),
  };
  const serialized = JSON.stringify(payload);

  try {
    localStorage.setItem(SERTIFIKAT_CONFIG_KEY, serialized);
  } catch {
    // Ignore localStorage quota error if image is slightly large; Supabase holds it
  }

  const { error } = await upsertRaporConfig(SERTIFIKAT_CONFIG_KEY, serialized);

  if (error) throw error;
}

function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function printStudentCertificates(
  students: RekapSiswaCert[],
  template: CertTemplateConfig,
  traits: TraitDef[],
  title = 'Sertifikat Karakter Siswa'
) {
  if (!template.bgImage) {
    Swal.fire(
      'Template Belum Diatur',
      'Silakan upload gambar desain sertifikat terlebih dahulu lewat tombol "Atur Template Sertifikat".',
      'warning'
    );
    return;
  }

  if (students.length === 0) {
    Swal.fire('Info', 'Belum ada siswa yang dipilih untuk dicetak.', 'info');
    return;
  }

  const isLandscape = template.orientation === 'landscape';
  const pageWidthMm = isLandscape ? 297 : 210;
  const pageHeightMm = isLandscape ? 210 : 297;

  const pagesHtml = students
    .map((student) => {
      const fieldsHtml = FIELD_KEYS.map((key) => {
        const f = template.fields[key];
        if (!f || !f.enabled) return '';
        const text = resolveFieldText(student, f, traits);
        const translateX = f.align === 'center' ? '-50%' : f.align === 'right' ? '-100%' : '0%';
        const hasMaxW = Number(f.maxWidth || 0) > 0;
        const isWrap = hasMaxW && f.overflowMode === 'wrap';
        const isShrink = hasMaxW && f.overflowMode !== 'wrap';
        return `
          <div
            class="cert-field"
            ${isShrink ? `data-autofit="shrink" data-max-width-pct="${f.maxWidth}" data-font-pt="${f.fontSize}"` : ''}
            style="
              left: ${f.x}%;
              top: ${f.y}%;
              transform: translate(${translateX}, -50%);
              font-size: ${f.fontSize}pt;
              font-family: ${f.fontFamily};
              color: ${f.color};
              font-weight: ${f.bold ? '700' : '400'};
              font-style: ${f.italic ? 'italic' : 'normal'};
              text-align: ${f.align};
              text-transform: ${f.textTransform};
              ${isWrap ? `width: ${f.maxWidth}%; white-space: normal; overflow-wrap: break-word;` : 'white-space: nowrap;'}
            "
          >${escapeHtml(text)}</div>
        `;
      }).join('');

      return `
        <div class="cert-page">
          <img class="cert-bg" src="${template.bgImage}" alt="Desain Sertifikat" />
          ${fieldsHtml}
        </div>
      `;
    })
    .join('');

  const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Great+Vibes&family=Montserrat:ital,wght@0,400;0,700;1,400;1,700&family=Playfair+Display:ital,wght@0,400;0,700;1,400;1,700&family=Poppins:ital,wght@0,400;0,700;1,400;1,700&display=swap" rel="stylesheet" />
  <style>
    @page {
      size: A4 ${template.orientation};
      margin: 0;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      margin: 0;
      padding: 0;
      background: #e2e8f0;
    }
    .cert-page {
      position: relative;
      width: ${pageWidthMm}mm;
      height: ${pageHeightMm}mm;
      margin: 0 auto 12px auto;
      background: #ffffff;
      overflow: hidden;
      box-shadow: 0 4px 16px rgba(0,0,0,0.15);
      page-break-after: always;
      break-after: page;
    }
    .cert-page:last-child {
      page-break-after: auto;
      break-after: auto;
      margin-bottom: 0;
    }
    .cert-bg {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: ${template.fitMode};
      display: block;
    }
    .cert-field {
      position: absolute;
      white-space: nowrap;
      line-height: 1.15;
      letter-spacing: 0.01em;
    }
    @media print {
      html, body {
        background: #ffffff;
      }
      .cert-page {
        margin: 0;
        box-shadow: none;
      }
    }
  </style>
</head>
<body>
  ${pagesHtml}
  <script>
    (function () {
      const waitFonts = document.fonts ? document.fonts.ready : Promise.resolve();
      const imgs = Array.from(document.images || []);
      const waitImgs = Promise.all(
        imgs.map(function (img) {
          if (img.complete) return Promise.resolve();
          return new Promise(function (res) {
            img.onload = res;
            img.onerror = res;
          });
        })
      );
      Promise.all([waitFonts, waitImgs]).then(function () {
        document.querySelectorAll('.cert-field[data-autofit="shrink"]').forEach(function (el) {
          var pageEl = el.parentElement;
          if (!pageEl) return;
          var maxPct = Number(el.getAttribute('data-max-width-pct') || '0');
          var basePt = Number(el.getAttribute('data-font-pt') || '20');
          if (!maxPct || maxPct <= 0) return;
          var maxPx = pageEl.getBoundingClientRect().width * (maxPct / 100);
          var actualW = el.scrollWidth;
          if (actualW > maxPx && maxPx > 0) {
            var fitted = Math.max(8, Math.floor(basePt * (maxPx / actualW) * 10) / 10);
            el.style.fontSize = fitted + 'pt';
            var guard = 0;
            while (el.scrollWidth > maxPx && fitted > 8 && guard < 30) {
              fitted = Math.max(8, Math.round((fitted - 0.4) * 10) / 10);
              el.style.fontSize = fitted + 'pt';
              guard++;
            }
          }
        });
        setTimeout(function () {
          window.focus();
          window.print();
        }, 250);
      });
    })();
  </script>
</body>
</html>`;

  const printWin = window.open('', '_blank', 'width=1100,height=780');
  if (!printWin) {
    Swal.fire('Pop-up Diblokir', 'Izinkan pop-up browser untuk membuka pratinjau cetak sertifikat.', 'warning');
    return;
  }
  printWin.document.open();
  printWin.document.write(html);
  printWin.document.close();
}

// Compress uploaded image cleanly to keep crisp A4 quality while staying compact for DB storage
async function compressImageFile(file: File): Promise<{ dataUrl: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gagal membaca file gambar'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('File bukan gambar yang valid'));
      img.onload = () => {
        const maxDim = 2000;
        let w = img.naturalWidth;
        let h = img.naturalHeight;
        if (w > maxDim || h > maxDim) {
          const scale = maxDim / Math.max(w, h);
          w = Math.round(w * scale);
          h = Math.round(h * scale);
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve({ dataUrl: String(reader.result || ''), width: w, height: h });
          return;
        }
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        const compressed = canvas.toDataURL('image/jpeg', 0.88);
        resolve({ dataUrl: compressed, width: w, height: h });
      };
      img.src = String(reader.result || '');
    };
    reader.readAsDataURL(file);
  });
}

interface SertifikatKarakterModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTemplate: CertTemplateConfig;
  onSaved: (template: CertTemplateConfig) => void;
  sampleStudents: RekapSiswaCert[];
  traits: TraitDef[];
}

interface AlignGuide {
  axis: 'x' | 'y';
  pos: number; // percentage 0..100
  label: string;
  color: string;
}

interface PreviewFieldNodeProps {
  field: CertFieldConfig;
  text: string;
  pxPerPt: number;
  canvasWidthPx: number;
  isSelected: boolean;
  registerEl: (el: HTMLDivElement | null) => void;
  onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerUp: (e: React.PointerEvent<HTMLDivElement>) => void;
}

function PreviewFieldNode({
  field,
  text,
  pxPerPt,
  canvasWidthPx,
  isSelected,
  registerEl,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}: PreviewFieldNodeProps) {
  const localRef = useRef<HTMLDivElement | null>(null);
  const baseFontPx = Math.max(6, field.fontSize * pxPerPt);
  const hasMaxW = Number(field.maxWidth || 0) > 0;
  const isWrap = hasMaxW && field.overflowMode === 'wrap';
  const isShrink = hasMaxW && field.overflowMode !== 'wrap';
  const maxWidthPx = hasMaxW ? canvasWidthPx * (field.maxWidth / 100) : 0;

  useLayoutEffect(() => {
    const el = localRef.current;
    if (!el) return;

    const fitText = () => {
      el.style.fontSize = `${baseFontPx}px`;
      if (isShrink && maxWidthPx > 0) {
        const actualW = el.scrollWidth;
        if (actualW > maxWidthPx) {
          let fitted = Math.max(6, baseFontPx * (maxWidthPx / actualW));
          el.style.fontSize = `${fitted}px`;
          let guard = 0;
          while (el.scrollWidth > maxWidthPx && fitted > 6 && guard < 28) {
            fitted = Math.max(6, fitted - 0.35);
            el.style.fontSize = `${fitted}px`;
            guard++;
          }
        }
      }
    };

    fitText();
    if (typeof document !== 'undefined' && document.fonts) {
      document.fonts.ready.then(fitText).catch(() => {});
    }
  }, [text, baseFontPx, isShrink, maxWidthPx, field.fontFamily, field.bold, field.italic, field.textTransform]);

  const translateX = field.align === 'center' ? '-50%' : field.align === 'right' ? '-100%' : '0%';

  return (
    <div
      ref={(el) => {
        localRef.current = el;
        registerEl(el);
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      style={{
        position: 'absolute',
        left: `${field.x}%`,
        top: `${field.y}%`,
        transform: `translate(${translateX}, -50%)`,
        fontSize: `${baseFontPx}px`,
        fontFamily: field.fontFamily,
        color: field.color,
        fontWeight: field.bold ? 700 : 400,
        fontStyle: field.italic ? 'italic' : 'normal',
        textAlign: field.align,
        textTransform: field.textTransform,
        whiteSpace: isWrap ? 'normal' : 'nowrap',
        overflowWrap: isWrap ? 'break-word' : undefined,
        width: isWrap ? `${field.maxWidth}%` : undefined,
        lineHeight: 1.15,
        letterSpacing: '0.01em',
        cursor: 'grab',
        padding: 0,
        borderRadius: '2px',
        outline: isSelected ? '2px solid #0ea5e9' : '1px dashed rgba(14, 165, 233, 0.55)',
        outlineOffset: '3px',
        background: isSelected ? 'rgba(224, 242, 254, 0.35)' : 'rgba(255, 255, 255, 0.18)',
        zIndex: isSelected ? 20 : 10,
      }}
      title={`Geser posisi ${field.label} (atau pakai panah keyboard ↑↓←→)`}
    >
      {text}
    </div>
  );
}

export default function SertifikatKarakterModal({
  isOpen,
  onClose,
  initialTemplate,
  onSaved,
  sampleStudents,
  traits,
}: SertifikatKarakterModalProps) {
  const [draft, setDraft] = useState<CertTemplateConfig>(initialTemplate);
  const [selectedKey, setSelectedKey] = useState<CertFieldKey>('nama');
  const [sampleIndex, setSampleIndex] = useState<number>(0);
  const [saving, setSaving] = useState<boolean>(false);
  const [uploading, setUploading] = useState<boolean>(false);
  const [alignGuides, setAlignGuides] = useState<AlignGuide[]>([]);
  const [canvasWidthPx, setCanvasWidthPx] = useState<number>(640);
  const [hexColorInput, setHexColorInput] = useState<string>(initialTemplate.fields.nama.color);

  const canvasRef = useRef<HTMLDivElement>(null);
  const fieldElRefs = useRef<Partial<Record<CertFieldKey, HTMLDivElement | null>>>({});
  const draggingKeyRef = useRef<CertFieldKey | null>(null);
  const dragOffsetRef = useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 });
  const guideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const draftRef = useRef<CertTemplateConfig>(draft);
  const selectedKeyRef = useRef<CertFieldKey>(selectedKey);

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  useEffect(() => {
    selectedKeyRef.current = selectedKey;
  }, [selectedKey]);

  useEffect(() => {
    if (isOpen) {
      setDraft(mergeWithDefaultTemplate(initialTemplate));
      setSampleIndex(0);
      setAlignGuides([]);
    }
  }, [isOpen, initialTemplate]);

  useEffect(() => {
    setHexColorInput(draft.fields[selectedKey]?.color || '#1e293b');
  }, [selectedKey, draft.fields]);

  const computeAlignmentAndSnap = useCallback(
    (
      key: CertFieldKey,
      candidateX: number,
      candidateY: number,
      threshold: number,
      shouldSnap: boolean
    ): { x: number; y: number; guides: AlignGuide[] } => {
      const canvasEl = canvasRef.current;
      const currentDraft = draftRef.current;
      const activeFieldCfg = currentDraft.fields[key];
      if (!canvasEl || !activeFieldCfg) {
        return { x: candidateX, y: candidateY, guides: [] };
      }

      const canvasRect = canvasEl.getBoundingClientRect();
      if (canvasRect.width <= 0 || canvasRect.height <= 0) {
        return { x: candidateX, y: candidateY, guides: [] };
      }

      const activeEl = fieldElRefs.current[key];
      const activeWidthPct = activeEl ? (activeEl.getBoundingClientRect().width / canvasRect.width) * 100 : 0;

      const leftOffset =
        activeFieldCfg.align === 'left' ? 0 : activeFieldCfg.align === 'center' ? -activeWidthPct / 2 : -activeWidthPct;
      const centerOffset =
        activeFieldCfg.align === 'left' ? activeWidthPct / 2 : activeFieldCfg.align === 'center' ? 0 : -activeWidthPct / 2;
      const rightOffset =
        activeFieldCfg.align === 'left' ? activeWidthPct : activeFieldCfg.align === 'center' ? activeWidthPct / 2 : 0;

      const cLeft = candidateX + leftOffset;
      const cCenter = candidateX + centerOffset;
      const cRight = candidateX + rightOffset;

      type XTarget = { pos: number; edge: 'left' | 'center' | 'right'; label: string; color: string };
      const xTargets: XTarget[] = [
        { pos: 50, edge: 'center', label: 'Tengah Halaman', color: '#ef4444' },
      ];

      type YTarget = { pos: number; label: string; color: string };
      const yTargets: YTarget[] = [
        { pos: 50, label: 'Tengah Vertikal', color: '#ef4444' },
      ];

      for (const otherKey of FIELD_KEYS) {
        if (otherKey === key) continue;
        const otherCfg = currentDraft.fields[otherKey];
        if (!otherCfg?.enabled) continue;
        const otherEl = fieldElRefs.current[otherKey];
        if (!otherEl) continue;

        const r = otherEl.getBoundingClientRect();
        const oLeft = ((r.left - canvasRect.left) / canvasRect.width) * 100;
        const oCenterX = ((r.left + r.width / 2 - canvasRect.left) / canvasRect.width) * 100;
        const oRight = ((r.right - canvasRect.left) / canvasRect.width) * 100;
        const oCenterY = ((r.top + r.height / 2 - canvasRect.top) / canvasRect.height) * 100;

        xTargets.push(
          { pos: oLeft, edge: 'left', label: `Rata Kiri · ${otherCfg.label}`, color: '#d946ef' },
          { pos: oCenterX, edge: 'center', label: `Sejajar Tengah · ${otherCfg.label}`, color: '#0284c7' },
          { pos: oRight, edge: 'right', label: `Rata Kanan · ${otherCfg.label}`, color: '#d946ef' }
        );
        yTargets.push({ pos: oCenterY, label: `Sejajar Baris · ${otherCfg.label}`, color: '#10b981' });
      }

      let bestX: { target: XTarget; diff: number; snappedAnchorX: number } | null = null;
      for (const t of xTargets) {
        const edgeVal = t.edge === 'left' ? cLeft : t.edge === 'center' ? cCenter : cRight;
        const offset = t.edge === 'left' ? leftOffset : t.edge === 'center' ? centerOffset : rightOffset;
        const diff = Math.abs(edgeVal - t.pos);
        if (diff <= threshold && (!bestX || diff < bestX.diff)) {
          bestX = { target: t, diff, snappedAnchorX: t.pos - offset };
        }
      }

      let bestY: { target: YTarget; diff: number } | null = null;
      for (const t of yTargets) {
        const diff = Math.abs(candidateY - t.pos);
        if (diff <= threshold && (!bestY || diff < bestY.diff)) {
          bestY = { target: t, diff };
        }
      }

      const guides: AlignGuide[] = [];
      let finalX = candidateX;
      let finalY = candidateY;

      if (bestX) {
        if (shouldSnap) finalX = bestX.snappedAnchorX;
        guides.push({
          axis: 'x',
          pos: bestX.target.pos,
          label: bestX.target.label,
          color: bestX.target.color,
        });
      }
      if (bestY) {
        if (shouldSnap) finalY = bestY.target.pos;
        guides.push({
          axis: 'y',
          pos: bestY.target.pos,
          label: bestY.target.label,
          color: bestY.target.color,
        });
      }

      return {
        x: Math.max(0, Math.min(100, Math.round(finalX * 10) / 10)),
        y: Math.max(0, Math.min(100, Math.round(finalY * 10) / 10)),
        guides,
      };
    },
    []
  );

  // Keyboard arrow nudging (0.2% per press, 1% with Shift) when not typing inside an input/select
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;

      const activeEl = document.activeElement as HTMLElement | null;
      const tag = activeEl?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || activeEl?.isContentEditable) {
        return;
      }

      const key = selectedKeyRef.current;
      const fieldCfg = draftRef.current.fields[key];
      if (!fieldCfg?.enabled) return;

      e.preventDefault();
      const step = e.shiftKey ? 1.0 : 0.2;
      let nextX = fieldCfg.x;
      let nextY = fieldCfg.y;

      if (e.key === 'ArrowLeft') nextX -= step;
      if (e.key === 'ArrowRight') nextX += step;
      if (e.key === 'ArrowUp') nextY -= step;
      if (e.key === 'ArrowDown') nextY += step;

      nextX = Math.max(0, Math.min(100, Math.round(nextX * 10) / 10));
      nextY = Math.max(0, Math.min(100, Math.round(nextY * 10) / 10));

      const aligned = computeAlignmentAndSnap(key, nextX, nextY, 0.35, false);

      setDraft((prev) => ({
        ...prev,
        fields: {
          ...prev.fields,
          [key]: {
            ...prev.fields[key],
            x: nextX,
            y: nextY,
          },
        },
      }));

      setAlignGuides(aligned.guides);
      if (guideTimerRef.current) clearTimeout(guideTimerRef.current);
      if (aligned.guides.length > 0) {
        guideTimerRef.current = setTimeout(() => {
          setAlignGuides([]);
        }, 1600);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (guideTimerRef.current) clearTimeout(guideTimerRef.current);
    };
  }, [isOpen, computeAlignmentAndSnap]);

  // Inject Google Fonts once for accurate live preview inside the modal
  useEffect(() => {
    if (!isOpen || typeof document === 'undefined') return;
    const linkId = 'sertifikat-google-fonts';
    if (!document.getElementById(linkId)) {
      const link = document.createElement('link');
      link.id = linkId;
      link.rel = 'stylesheet';
      link.href =
        'https://fonts.googleapis.com/css2?family=Great+Vibes&family=Montserrat:ital,wght@0,400;0,700;1,400;1,700&family=Playfair+Display:ital,wght@0,400;0,700;1,400;1,700&family=Poppins:ital,wght@0,400;0,700;1,400;1,700&display=swap';
      document.head.appendChild(link);
    }
  }, [isOpen]);

  // Observe live preview width so pt -> px matches printed A4 1:1
  useEffect(() => {
    if (!isOpen) return;
    const el = canvasRef.current;
    if (!el) return;
    const updateWidth = () => {
      const w = el.getBoundingClientRect().width;
      if (w > 0) setCanvasWidthPx(w);
    };
    updateWidth();
    const ro = new ResizeObserver(updateWidth);
    ro.observe(el);
    return () => ro.disconnect();
  }, [isOpen, draft.orientation]);

  const longestStudentIndex = useMemo(() => {
    if (sampleStudents.length === 0) return -1;
    let bestIdx = 0;
    let bestLen = (sampleStudents[0]?.nama || '').length;
    for (let i = 1; i < sampleStudents.length; i++) {
      const len = (sampleStudents[i]?.nama || '').length;
      if (len > bestLen) {
        bestLen = len;
        bestIdx = i;
      }
    }
    return bestIdx;
  }, [sampleStudents]);

  const previewDropdownIndices = useMemo(() => {
    const indices: number[] = [];
    const maxCount = Math.min(sampleStudents.length, 30);
    for (let i = 0; i < maxCount; i++) indices.push(i);
    if (longestStudentIndex >= 0 && !indices.includes(longestStudentIndex)) {
      indices.unshift(longestStudentIndex);
    }
    return indices;
  }, [sampleStudents.length, longestStudentIndex]);

  const previewStudent = useMemo<RekapSiswaCert>(() => {
    if (sampleStudents.length > 0) {
      return sampleStudents[Math.min(sampleIndex, sampleStudents.length - 1)];
    }
    return {
      nisn: '0098765432',
      nama: 'Ahmad Fauzan Pratama',
      kelas: '8A',
      scores: { religius: 12, disiplin: 8 },
      total: 20,
    };
  }, [sampleStudents, sampleIndex]);

  if (!isOpen) return null;

  const isLandscape = draft.orientation === 'landscape';
  const a4WidthPt = isLandscape ? 841.89 : 595.28;
  const pxPerPt = canvasWidthPx / a4WidthPt;
  const activeField = draft.fields[selectedKey];

  const updateField = (key: CertFieldKey, patch: Partial<CertFieldConfig>) => {
    setDraft((prev) => ({
      ...prev,
      fields: {
        ...prev.fields,
        [key]: {
          ...prev.fields[key],
          ...patch,
        },
      },
    }));
  };

  const handleUploadBg = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      Swal.fire('Format Tidak Didukung', 'Silakan upload file gambar PNG atau JPG.', 'error');
      return;
    }

    setUploading(true);
    try {
      const { dataUrl, width, height } = await compressImageFile(file);
      const detectedOrientation: 'landscape' | 'portrait' = width >= height ? 'landscape' : 'portrait';
      setDraft((prev) => ({
        ...prev,
        bgImage: dataUrl,
        orientation: detectedOrientation,
      }));
      Swal.fire({
        icon: 'success',
        title: `Desain dimuat (${detectedOrientation === 'landscape' ? 'A4 Landscape' : 'A4 Portrait'})`,
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 2000,
      });
    } catch (err: any) {
      Swal.fire('Error', err?.message || 'Gagal memproses gambar desain', 'error');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handlePointerDownField = (e: React.PointerEvent<HTMLDivElement>, key: CertFieldKey) => {
    e.preventDefault();
    e.stopPropagation();
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setSelectedKey(key);
    draggingKeyRef.current = key;

    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        const ptrX = ((e.clientX - rect.left) / rect.width) * 100;
        const ptrY = ((e.clientY - rect.top) / rect.height) * 100;
        const cur = draftRef.current.fields[key];
        dragOffsetRef.current = {
          dx: ptrX - cur.x,
          dy: ptrY - cur.y,
        };
      }
    }

    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMoveField = (e: React.PointerEvent<HTMLDivElement>) => {
    const key = draggingKeyRef.current;
    if (!key || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const ptrX = ((e.clientX - rect.left) / rect.width) * 100;
    const ptrY = ((e.clientY - rect.top) / rect.height) * 100;

    const rawX = Math.max(0, Math.min(100, ptrX - dragOffsetRef.current.dx));
    const rawY = Math.max(0, Math.min(100, ptrY - dragOffsetRef.current.dy));

    const aligned = computeAlignmentAndSnap(key, rawX, rawY, 0.9, true);
    setAlignGuides(aligned.guides);

    updateField(key, {
      x: aligned.x,
      y: aligned.y,
    });
  };

  const handlePointerUpField = (e: React.PointerEvent<HTMLDivElement>) => {
    if (draggingKeyRef.current) {
      draggingKeyRef.current = null;
      setAlignGuides([]);
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {}
    }
  };

  const handleSave = async () => {
    if (!draft.bgImage) {
      Swal.fire('Desain Belum Diupload', 'Silakan upload gambar desain sertifikat (PNG/JPG) terlebih dahulu.', 'warning');
      return;
    }

    setSaving(true);
    try {
      await saveCertTemplateConfig(draft);
      onSaved(draft);
      Swal.fire({
        icon: 'success',
        title: 'Template sertifikat berhasil disimpan',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 2000,
      });
      onClose();
    } catch (err: any) {
      Swal.fire('Gagal Menyimpan', err?.message || 'Terjadi kesalahan saat menyimpan template.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleResetPositions = () => {
    const def = createDefaultCertTemplate();
    setDraft((prev) => ({
      ...prev,
      fields: def.fields,
    }));
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9990,
        background: 'rgba(15, 23, 42, 0.65)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '1260px',
          maxHeight: '94vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 24px 48px rgba(0, 0, 0, 0.3)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '14px 20px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            background: '#f8fafc',
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="fas fa-award" style={{ color: '#0ea5e9' }}></i>
              Pengaturan Desain &amp; Mapping Sertifikat Karakter
            </h3>
            <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: '#64748b' }}>
              Upload desain PNG/JPG lalu geser (drag &amp; drop) posisi teks langsung di atas sertifikat. Posisi preview sama persis dengan hasil cetak A4.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'white',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              width: '32px',
              height: '32px',
              cursor: 'pointer',
              color: '#475569',
              fontSize: '1rem',
            }}
            title="Tutup"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* Body: Left Canvas Preview + Right Controls */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            flex: 1,
            minHeight: 0,
            overflow: 'hidden',
          }}
        >
          {/* Left: Interactive Canvas Area */}
          <div
            style={{
              flex: '1 1 620px',
              background: '#e2e8f0',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              overflowY: 'auto',
              alignItems: 'center',
            }}
          >
            {/* Top Canvas Action Strip */}
            <div
              style={{
                width: '100%',
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
                background: 'white',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
              }}
            >
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px' }}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleUploadBg}
                  style={{ display: 'none' }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  style={{
                    padding: '7px 12px',
                    background: '#0ea5e9',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: 600,
                    fontSize: '0.84rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <i className={uploading ? 'fas fa-spinner fa-spin' : 'fas fa-upload'}></i>
                  {draft.bgImage ? 'Ganti Desain' : 'Upload Desain (PNG/JPG)'}
                </button>

                <div style={{ display: 'inline-flex', border: '1px solid #cbd5e1', borderRadius: '6px', overflow: 'hidden' }}>
                  <button
                    type="button"
                    onClick={() => setDraft((p) => ({ ...p, orientation: 'landscape' }))}
                    style={{
                      padding: '6px 10px',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      border: 'none',
                      cursor: 'pointer',
                      background: isLandscape ? '#1e293b' : 'white',
                      color: isLandscape ? 'white' : '#475569',
                    }}
                  >
                    A4 Landscape
                  </button>
                  <button
                    type="button"
                    onClick={() => setDraft((p) => ({ ...p, orientation: 'portrait' }))}
                    style={{
                      padding: '6px 10px',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      border: 'none',
                      borderLeft: '1px solid #cbd5e1',
                      cursor: 'pointer',
                      background: !isLandscape ? '#1e293b' : 'white',
                      color: !isLandscape ? 'white' : '#475569',
                    }}
                  >
                    A4 Portrait
                  </button>
                </div>
              </div>

              {sampleStudents.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#475569', flexWrap: 'wrap' }}>
                  <span>Preview:</span>
                  <select
                    value={sampleIndex}
                    onChange={(e) => setSampleIndex(Number(e.target.value))}
                    style={{
                      padding: '5px 8px',
                      border: '1px solid #cbd5e1',
                      borderRadius: '5px',
                      fontSize: '0.8rem',
                      maxWidth: '190px',
                    }}
                  >
                    {previewDropdownIndices.map((idx) => {
                      const s = sampleStudents[idx];
                      return (
                        <option key={`${s.nisn}-${idx}`} value={idx}>
                          {s.nama} ({s.kelas})
                        </option>
                      );
                    })}
                  </select>
                  {longestStudentIndex >= 0 && (
                    <button
                      type="button"
                      onClick={() => setSampleIndex(longestStudentIndex)}
                      style={{
                        padding: '5px 8px',
                        borderRadius: '5px',
                        border: '1px solid #f59e0b',
                        background: sampleIndex === longestStudentIndex ? '#fef3c7' : '#fffbeb',
                        color: '#b45309',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                      title={`Uji dengan siswa bernama terpanjang: ${sampleStudents[longestStudentIndex]?.nama || ''}`}
                    >
                      Cek Nama Terpanjang
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Interactive A4 Canvas */}
            <div
              ref={canvasRef}
              style={{
                position: 'relative',
                width: '100%',
                maxWidth: isLandscape ? '760px' : '460px',
                aspectRatio: isLandscape ? '297 / 210' : '210 / 297',
                background: '#ffffff',
                boxShadow: '0 10px 25px rgba(15, 23, 42, 0.2)',
                border: '1px solid #94a3b8',
                overflow: 'hidden',
                userSelect: 'none',
                touchAction: 'none',
              }}
            >
              {draft.bgImage ? (
                <img
                  src={draft.bgImage}
                  alt="Desain Sertifikat"
                  draggable={false}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: draft.fitMode,
                    pointerEvents: 'none',
                  }}
                />
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#64748b',
                    cursor: 'pointer',
                    background: 'repeating-linear-gradient(45deg, #f8fafc, #f8fafc 12px, #f1f5f9 12px, #f1f5f9 24px)',
                    padding: '24px',
                    textAlign: 'center',
                  }}
                >
                  <i className="fas fa-image" style={{ fontSize: '42px', color: '#94a3b8', marginBottom: '10px' }}></i>
                  <div style={{ fontWeight: 700, fontSize: '1rem', color: '#334155' }}>
                    Klik untuk Upload Desain Sertifikat (PNG / JPG)
                  </div>
                  <div style={{ fontSize: '0.82rem', marginTop: '4px' }}>
                    Disarankan export ukuran A4 dari Canva agar proporsi tepat.
                  </div>
                </div>
              )}

              {/* Smart alignment guide lines & badges */}
              {alignGuides.map((g, idx) =>
                g.axis === 'x' ? (
                  <React.Fragment key={`gx-${idx}`}>
                    <div
                      style={{
                        position: 'absolute',
                        top: 0,
                        bottom: 0,
                        left: `${g.pos}%`,
                        width: '1px',
                        borderLeft: `1.5px dashed ${g.color}`,
                        pointerEvents: 'none',
                        zIndex: 30,
                      }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        top: '6px',
                        left: `${Math.min(84, Math.max(16, g.pos))}%`,
                        transform: 'translateX(-50%)',
                        background: g.color,
                        color: 'white',
                        fontSize: '10px',
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: '4px',
                        whiteSpace: 'nowrap',
                        pointerEvents: 'none',
                        zIndex: 35,
                        boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                      }}
                    >
                      {g.label}
                    </div>
                  </React.Fragment>
                ) : (
                  <React.Fragment key={`gy-${idx}`}>
                    <div
                      style={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        top: `${g.pos}%`,
                        height: '1px',
                        borderTop: `1.5px dashed ${g.color}`,
                        pointerEvents: 'none',
                        zIndex: 30,
                      }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        left: '6px',
                        top: `${Math.min(92, Math.max(8, g.pos))}%`,
                        transform: 'translateY(-115%)',
                        background: g.color,
                        color: 'white',
                        fontSize: '10px',
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: '4px',
                        whiteSpace: 'nowrap',
                        pointerEvents: 'none',
                        zIndex: 35,
                        boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                      }}
                    >
                      {g.label}
                    </div>
                  </React.Fragment>
                )
              )}

              {/* Max-width visual boundary box for currently selected field */}
              {activeField?.enabled && Number(activeField.maxWidth || 0) > 0 && (() => {
                const translateX =
                  activeField.align === 'center' ? '-50%' : activeField.align === 'right' ? '-100%' : '0%';
                return (
                  <div
                    style={{
                      position: 'absolute',
                      left: `${activeField.x}%`,
                      top: `${activeField.y}%`,
                      width: `${activeField.maxWidth}%`,
                      height: `${Math.max(24, activeField.fontSize * pxPerPt * 1.5)}px`,
                      transform: `translate(${translateX}, -50%)`,
                      borderLeft: '1.5px dashed #f59e0b',
                      borderRight: '1.5px dashed #f59e0b',
                      background: 'rgba(254, 243, 199, 0.16)',
                      pointerEvents: 'none',
                      zIndex: 8,
                    }}
                  >
                    <span
                      style={{
                        position: 'absolute',
                        right: '2px',
                        top: '-15px',
                        fontSize: '9px',
                        fontWeight: 700,
                        color: '#b45309',
                        background: 'rgba(254, 243, 199, 0.92)',
                        padding: '1px 4px',
                        borderRadius: '3px',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Batas {activeField.maxWidth}%
                    </span>
                  </div>
                );
              })()}

              {/* Draggable Mapped Fields */}
              {FIELD_KEYS.map((key) => {
                const f = draft.fields[key];
                if (!f.enabled) return null;
                const text = resolveFieldText(previewStudent, f, traits);

                return (
                  <PreviewFieldNode
                    key={key}
                    field={f}
                    text={text}
                    pxPerPt={pxPerPt}
                    canvasWidthPx={canvasWidthPx}
                    isSelected={selectedKey === key}
                    registerEl={(el) => {
                      fieldElRefs.current[key] = el;
                    }}
                    onPointerDown={(e) => handlePointerDownField(e, key)}
                    onPointerMove={handlePointerMoveField}
                    onPointerUp={handlePointerUpField}
                  />
                );
              })}
            </div>

            <div style={{ fontSize: '0.78rem', color: '#475569', textAlign: 'center' }}>
              Tip: Geser teks dengan mouse/sentuh atau pakai tombol <b>Panah Keyboard (↑ ↓ ← →)</b> untuk geser halus (tahan <b>Shift</b> untuk lebih cepat). Garis bantu otomatis muncul saat sejajar rata kiri, tengah, rata kanan, atau sejajar baris.
            </div>
          </div>

          {/* Right: Field Mapping & Typography Inspector */}
          <div
            style={{
              width: '360px',
              flex: '0 0 360px',
              borderLeft: '1px solid #e2e8f0',
              padding: '16px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              background: '#ffffff',
            }}
          >
            {/* Field Selector List */}
            <div>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Data yang Di-mapping</span>
                <button
                  type="button"
                  onClick={handleResetPositions}
                  style={{ fontSize: '0.75rem', color: '#0284c7', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  Reset Posisi
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {FIELD_KEYS.map((key) => {
                  const f = draft.fields[key];
                  const isSelected = selectedKey === key;
                  return (
                    <div
                      key={key}
                      onClick={() => {
                        if (document.activeElement instanceof HTMLElement) {
                          document.activeElement.blur();
                        }
                        setSelectedKey(key);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 10px',
                        borderRadius: '7px',
                        cursor: 'pointer',
                        border: `1.5px solid ${isSelected ? '#0ea5e9' : '#e2e8f0'}`,
                        background: isSelected ? '#f0f9ff' : '#ffffff',
                      }}
                    >
                      <label
                        onClick={(e) => e.stopPropagation()}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0, flex: 1 }}
                      >
                        <input
                          type="checkbox"
                          checked={f.enabled}
                          onChange={(e) => {
                            updateField(key, { enabled: e.target.checked });
                            setSelectedKey(key);
                          }}
                        />
                        <span style={{ fontSize: '0.86rem', fontWeight: isSelected ? 700 : 500, color: f.enabled ? '#0f172a' : '#94a3b8' }}>
                          {f.label}
                        </span>
                      </label>
                      <span style={{ fontSize: '0.73rem', color: '#64748b' }}>
                        {f.x}%, {f.y}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Active Field Properties */}
            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0369a1' }}>
                Pengaturan: {activeField.label}
              </div>

              {/* Coordinates X & Y */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '8px', alignItems: 'end' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: '#475569', marginBottom: '3px' }}>Posisi X (%)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="100"
                    value={activeField.x}
                    onChange={(e) => updateField(selectedKey, { x: Math.max(0, Math.min(100, Number(e.target.value) || 0)) })}
                    style={{ width: '100%', padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: '5px', fontSize: '0.84rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: '#475569', marginBottom: '3px' }}>Posisi Y (%)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="100"
                    value={activeField.y}
                    onChange={(e) => updateField(selectedKey, { y: Math.max(0, Math.min(100, Number(e.target.value) || 0)) })}
                    style={{ width: '100%', padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: '5px', fontSize: '0.84rem' }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => updateField(selectedKey, { x: 50, align: 'center' })}
                  style={{
                    padding: '6px 9px',
                    background: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    borderRadius: '5px',
                    fontSize: '0.76rem',
                    fontWeight: 600,
                    color: '#334155',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                  title="Posisikan tepat di tengah horizontal"
                >
                  Tengah
                </button>
              </div>

              {/* Font Family */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#475569', marginBottom: '3px' }}>Jenis Font</label>
                <select
                  value={activeField.fontFamily}
                  onChange={(e) => updateField(selectedKey, { fontFamily: e.target.value })}
                  style={{ width: '100%', padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: '5px', fontSize: '0.84rem' }}
                >
                  {FONT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Font Size + Color (Picker + Hex Input) */}
              <div style={{ display: 'grid', gridTemplateColumns: '95px 1fr', gap: '8px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: '#475569', marginBottom: '3px' }}>Ukuran (pt)</label>
                  <input
                    type="number"
                    min="8"
                    max="80"
                    value={activeField.fontSize}
                    onChange={(e) => updateField(selectedKey, { fontSize: Math.max(8, Math.min(80, Number(e.target.value) || 12)) })}
                    style={{ width: '100%', padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: '5px', fontSize: '0.84rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: '#475569', marginBottom: '3px' }}>Warna (Hex)</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <input
                      type="color"
                      value={/^#[0-9a-fA-F]{6}$/.test(activeField.color) ? activeField.color : '#1e293b'}
                      onChange={(e) => {
                        const val = e.target.value.toLowerCase();
                        setHexColorInput(val);
                        updateField(selectedKey, { color: val });
                      }}
                      style={{ width: '38px', height: '34px', padding: '2px', border: '1px solid #cbd5e1', borderRadius: '5px', cursor: 'pointer', background: 'white', flexShrink: 0 }}
                    />
                    <input
                      type="text"
                      value={hexColorInput}
                      onChange={(e) => {
                        const raw = e.target.value;
                        setHexColorInput(raw);
                        const trimmed = raw.trim();
                        const withHash = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
                        if (/^#[0-9a-fA-F]{6}$/.test(withHash)) {
                          updateField(selectedKey, { color: withHash.toLowerCase() });
                        } else if (/^#[0-9a-fA-F]{3}$/.test(withHash)) {
                          const expanded = `#${withHash[1]}${withHash[1]}${withHash[2]}${withHash[2]}${withHash[3]}${withHash[3]}`;
                          updateField(selectedKey, { color: expanded.toLowerCase() });
                        }
                      }}
                      onBlur={() => setHexColorInput(activeField.color)}
                      placeholder="#c95f58"
                      maxLength={12}
                      style={{
                        width: '100%',
                        padding: '6px 8px',
                        border: '1px solid #cbd5e1',
                        borderRadius: '5px',
                        fontSize: '0.84rem',
                        fontFamily: 'monospace',
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Bold, Italic, Align */}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => updateField(selectedKey, { bold: !activeField.bold })}
                  style={{
                    padding: '6px 10px',
                    borderRadius: '5px',
                    border: '1px solid #cbd5e1',
                    background: activeField.bold ? '#0ea5e9' : 'white',
                    color: activeField.bold ? 'white' : '#334155',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontSize: '0.82rem',
                  }}
                >
                  B
                </button>
                <button
                  type="button"
                  onClick={() => updateField(selectedKey, { italic: !activeField.italic })}
                  style={{
                    padding: '6px 10px',
                    borderRadius: '5px',
                    border: '1px solid #cbd5e1',
                    background: activeField.italic ? '#0ea5e9' : 'white',
                    color: activeField.italic ? 'white' : '#334155',
                    fontStyle: 'italic',
                    cursor: 'pointer',
                    fontSize: '0.82rem',
                  }}
                >
                  I
                </button>

                <div style={{ display: 'inline-flex', border: '1px solid #cbd5e1', borderRadius: '5px', overflow: 'hidden', marginLeft: 'auto' }}>
                  {(['left', 'center', 'right'] as const).map((al) => (
                    <button
                      key={al}
                      type="button"
                      onClick={() => updateField(selectedKey, { align: al })}
                      style={{
                        padding: '6px 10px',
                        border: 'none',
                        borderLeft: al === 'left' ? 'none' : '1px solid #cbd5e1',
                        background: activeField.align === al ? '#0ea5e9' : 'white',
                        color: activeField.align === al ? 'white' : '#334155',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                      }}
                      title={`Rata ${al}`}
                    >
                      <i className={`fas fa-align-${al}`}></i>
                    </button>
                  ))}
                </div>
              </div>

              {/* Text Transform */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#475569', marginBottom: '3px' }}>Format Huruf</label>
                <select
                  value={activeField.textTransform}
                  onChange={(e) => updateField(selectedKey, { textTransform: e.target.value as CertFieldConfig['textTransform'] })}
                  style={{ width: '100%', padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: '5px', fontSize: '0.84rem' }}
                >
                  <option value="none">Sesuai Data Asli</option>
                  <option value="uppercase">HURUF KAPITAL SEMUA</option>
                  <option value="capitalize">Huruf Awal Kapital</option>
                </select>
              </div>

              {/* Prefix & Suffix */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: '#475569', marginBottom: '3px' }}>Teks Awalan (Opsional)</label>
                  <input
                    type="text"
                    value={activeField.prefix}
                    onChange={(e) => updateField(selectedKey, { prefix: e.target.value })}
                    placeholder='Misal: Kelas '
                    style={{ width: '100%', padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: '5px', fontSize: '0.82rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: '#475569', marginBottom: '3px' }}>Teks Akhiran (Opsional)</label>
                  <input
                    type="text"
                    value={activeField.suffix}
                    onChange={(e) => updateField(selectedKey, { suffix: e.target.value })}
                    placeholder="Opsional"
                    style={{ width: '100%', padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: '5px', fontSize: '0.82rem' }}
                  />
                </div>
              </div>

              {/* Batas Lebar & Penanganan Teks Panjang */}
              <div
                style={{
                  background: '#fffbeb',
                  border: '1px solid #fde68a',
                  borderRadius: '7px',
                  padding: '9px 10px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', fontWeight: 700, color: '#92400e', cursor: 'pointer', margin: 0 }}>
                    <input
                      type="checkbox"
                      checked={Number(activeField.maxWidth || 0) > 0}
                      onChange={(e) =>
                        updateField(selectedKey, {
                          maxWidth: e.target.checked ? 56 : 0,
                        })
                      }
                    />
                    Batasi Lebar (Nama Panjang)
                  </label>
                  {Number(activeField.maxWidth || 0) > 0 && (
                    <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#b45309' }}>
                      {activeField.maxWidth}%
                    </span>
                  )}
                </div>

                {Number(activeField.maxWidth || 0) > 0 && (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="range"
                        min="15"
                        max="95"
                        step="1"
                        value={activeField.maxWidth}
                        onChange={(e) => updateField(selectedKey, { maxWidth: Number(e.target.value) })}
                        style={{ flex: 1, accentColor: '#d97706', cursor: 'pointer' }}
                      />
                      <input
                        type="number"
                        min="15"
                        max="95"
                        value={activeField.maxWidth}
                        onChange={(e) =>
                          updateField(selectedKey, {
                            maxWidth: Math.max(15, Math.min(95, Number(e.target.value) || 56)),
                          })
                        }
                        style={{ width: '58px', padding: '4px 6px', border: '1px solid #fcd34d', borderRadius: '5px', fontSize: '0.8rem', background: 'white' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.72rem', color: '#92400e', marginBottom: '3px' }}>
                        Jika Teks Melebihi Batas:
                      </label>
                      <select
                        value={activeField.overflowMode || 'shrink'}
                        onChange={(e) =>
                          updateField(selectedKey, {
                            overflowMode: e.target.value as 'shrink' | 'wrap',
                          })
                        }
                        style={{ width: '100%', padding: '5px 8px', border: '1px solid #fcd34d', borderRadius: '5px', fontSize: '0.8rem', background: 'white' }}
                      >
                        <option value="shrink">Auto Kecilkan Font (Tetap 1 Baris)</option>
                        <option value="wrap">Turun ke Baris Berikutnya (2 Baris)</option>
                      </select>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid #e2e8f0',
            background: '#f8fafc',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
          }}
        >
          <button
            type="button"
            onClick={() => printStudentCertificates([previewStudent], draft, traits, `Test Cetak - ${previewStudent.nama}`)}
            disabled={!draft.bgImage}
            style={{
              padding: '8px 14px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              background: draft.bgImage ? 'white' : '#f1f5f9',
              color: draft.bgImage ? '#334155' : '#94a3b8',
              fontWeight: 600,
              fontSize: '0.86rem',
              cursor: draft.bgImage ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <i className="fas fa-print"></i> Uji Cetak 1 Siswa
          </button>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                background: 'white',
                color: '#475569',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !draft.bgImage}
              style={{
                padding: '8px 18px',
                borderRadius: '6px',
                border: 'none',
                background: saving || !draft.bgImage ? '#94a3b8' : '#10b981',
                color: 'white',
                fontWeight: 700,
                cursor: saving || !draft.bgImage ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <i className={saving ? 'fas fa-spinner fa-spin' : 'fas fa-save'}></i>
              {saving ? 'Menyimpan...' : 'Simpan Template'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
