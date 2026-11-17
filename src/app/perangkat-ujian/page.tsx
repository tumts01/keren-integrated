'use client';
import { useState, useEffect, useMemo } from 'react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { supabase } from '@/lib/supabase';
import Swal from 'sweetalert2';
import { jsPDF } from 'jspdf';
import KonfigurasiRuangTab from './components/KonfigurasiRuangTab';
import PaginationBar from './components/PaginationBar';

interface Participant {
  nisn: string;
  noUjian: string;
  ruang: string;
  kelas?: string;
  nama?: string;
  foto?: string;
}

function getPhotoUrl(url?: string) {
  if (!url) return '';
  return '/api/proxy-image?url=' + encodeURIComponent(url);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load: ' + src));
    img.src = src;
  });
}

const KELAS_LIST = [
  '7A','7B','7C','7D','7E','7F','7G','7H','7I',
  '8A','8B','8C','8D','8E','8F','8G','8H','8I',
  '9A','9B','9C','9D','9E','9F','9G','9H','9I',
];

function CetakIdentitasTab() {
  const [selectedKelas, setSelectedKelas] = useState('7A');
  const [showPreview, setShowPreview] = useState(false);
  const url = `/perangkat-ujian/cetak-identitas/${encodeURIComponent(selectedKelas)}`;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#334155', margin: 0 }}>
          Cetak Identitas Rapor
        </h2>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '420px', margin: '0 auto', padding: '20px 0' }}>
        <p style={{ color: '#64748b', textAlign: 'center', margin: 0 }}>
          Pilih kelas untuk mencetak semua halaman Identitas Peserta Didik per kelas. Format A4, satu halaman per siswa.
        </p>
        <select
          value={selectedKelas}
          onChange={e => setSelectedKelas(e.target.value)}
          style={{ padding: '10px 15px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '1rem', width: '100%' }}
        >
          {KELAS_LIST.map(k => (
            <option key={k} value={k}>Kelas {k}</option>
          ))}
        </select>
        <button
          onClick={() => setShowPreview(true)}
          style={{ background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', padding: '10px 20px', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
        >
          <i className="fas fa-id-card"></i> Generate Identitas Kelas {selectedKelas}
        </button>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          style={{ background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', padding: '10px 20px', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', textDecoration: 'none' }}
        >
          <i className="fas fa-external-link-alt"></i> Buka di Tab Baru
        </a>
      </div>

      {showPreview && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', flexDirection: 'column' }}>
          <div style={{ background: 'white', padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
            <span style={{ fontWeight: 'bold', fontSize: '1rem' }}>
              <i className="fas fa-id-card" style={{ color: '#10b981', marginRight: '8px' }}></i>
              Preview Identitas Rapor Kelas {selectedKelas}
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                style={{ padding: '6px 14px', background: '#2563eb', color: 'white', borderRadius: '6px', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 'bold' }}
              >
                <i className="fas fa-external-link-alt"></i> Buka Tab Baru
              </a>
              <button onClick={() => setShowPreview(false)} style={{ padding: '6px 14px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem' }}>
                <i className="fas fa-times"></i> Tutup
              </button>
            </div>
          </div>
          <iframe
            src={url}
            style={{ flex: 1, border: 'none', width: '100%' }}
            title={`Preview Identitas Kelas ${selectedKelas}`}
          />
        </div>
      )}
    </div>
  );
}

function CetakSampulTab() {
  const [selectedKelas, setSelectedKelas] = useState('7A');
  const [showPreview, setShowPreview] = useState(false);
  const url = `/perangkat-ujian/sampul-rapor/${encodeURIComponent(selectedKelas)}`;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#334155', margin: 0 }}>
          Cetak Sampul Rapor
        </h2>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '420px', margin: '0 auto', padding: '20px 0' }}>
        <p style={{ color: '#64748b', textAlign: 'center', margin: 0 }}>
          Pilih kelas untuk mencetak semua halaman Sampul Rapor per kelas. Format A4, satu halaman per siswa.
        </p>
        <select
          value={selectedKelas}
          onChange={e => setSelectedKelas(e.target.value)}
          style={{ padding: '10px 15px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '1rem', width: '100%' }}
        >
          {KELAS_LIST.map(k => (
            <option key={k} value={k}>Kelas {k}</option>
          ))}
        </select>
        <button
          onClick={() => setShowPreview(true)}
          style={{ background: '#8b5cf6', color: 'white', border: 'none', borderRadius: '6px', padding: '10px 20px', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
        >
          <i className="fas fa-book"></i> Generate Sampul Kelas {selectedKelas}
        </button>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          style={{ background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', padding: '10px 20px', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', textDecoration: 'none' }}
        >
          <i className="fas fa-external-link-alt"></i> Buka di Tab Baru
        </a>
      </div>

      {showPreview && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', flexDirection: 'column' }}>
          <div style={{ background: 'white', padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
            <span style={{ fontWeight: 'bold', fontSize: '1rem' }}>
              <i className="fas fa-book" style={{ color: '#8b5cf6', marginRight: '8px' }}></i>
              Preview Sampul Rapor Kelas {selectedKelas}
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                style={{ padding: '6px 14px', background: '#2563eb', color: 'white', borderRadius: '6px', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 'bold' }}
              >
                <i className="fas fa-external-link-alt"></i> Buka Tab Baru
              </a>
              <button onClick={() => setShowPreview(false)} style={{ padding: '6px 14px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem' }}>
                <i className="fas fa-times"></i> Tutup
              </button>
            </div>
          </div>
          <iframe
            src={url}
            style={{ flex: 1, border: 'none', width: '100%' }}
            title={`Preview Sampul Rapor Kelas ${selectedKelas}`}
          />
        </div>
      )}
    </div>
  );
}

export default function PerangkatUjianPage() {
  const [activeTab, setActiveTab] = useState<'konfigurasi-ruang' | 'nopes' | 'nobang' | 'identitas' | 'sampul' | 'mapping-foto'>('konfigurasi-ruang');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState('');
  const [customDesign, setCustomDesign] = useState<string | null>(null);
  const [roomFilter, setRoomFilter] = useState<string>('ALL');
  const [searchText, setSearchText] = useState<string>('');
  const [tablePage, setTablePage] = useState<number>(1);
  const [tablePageSize, setTablePageSize] = useState<number>(25);

  const roomOptions = useMemo(() => {
    return Array.from(new Set(participants.map(p => p.ruang).filter(Boolean))).sort((a, b) =>
      a.localeCompare(b, 'id', { numeric: true })
    );
  }, [participants]);

  const filteredParticipants = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return participants.filter(p => {
      if (roomFilter !== 'ALL' && p.ruang !== roomFilter) return false;
      if (q) {
        const hit =
          (p.nama || '').toLowerCase().includes(q) ||
          (p.nisn || '').toLowerCase().includes(q) ||
          (p.noUjian || '').toLowerCase().includes(q) ||
          (p.kelas || '').toLowerCase().includes(q);
        if (!hit) return false;
      }
      return true;
    });
  }, [participants, roomFilter, searchText]);

  useEffect(() => {
    setTablePage(1);
  }, [roomFilter, searchText, participants.length, activeTab]);

  const safeTablePage = Math.min(
    tablePage,
    Math.max(1, Math.ceil(filteredParticipants.length / tablePageSize))
  );

  const paginatedParticipants = useMemo(() => {
    const start = (safeTablePage - 1) * tablePageSize;
    return filteredParticipants.slice(start, start + tablePageSize);
  }, [filteredParticipants, safeTablePage, tablePageSize]);

  const handleDesignUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setCustomDesign(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const [nobangDesign, setNobangDesign] = useState<string | null>(null);
  const handleNobangDesignUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setNobangDesign(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Default layout settings in percentages
  const [layout, setLayout] = useState({
    photoW: 45,
    photoH: 33,
    photoY: 32,
    nameY: 72.5,
    nameSize: 5.0,
    detailY: 81.5,
    detailSize: 5.0,
  });
  const [layoutNobang, setLayoutNobang] = useState({
    nameX: 58,
    nameY: 55,
    nameSize: 7.0,
    detailX: 58,
    detailY: 75,
    detailSize: 7.0,
  });

  const updateLayoutNobang = (key: string, value: number) => {
    const newLayout = { ...layoutNobang, [key]: value };
    setLayoutNobang(newLayout);
    localStorage.setItem('nopes_layout_nobang', JSON.stringify(newLayout));
  };
  const [isAdmin, setIsAdmin] = useState(false);

  const mapConfigAssignments = (rawAssignments: any[]): Participant[] =>
    rawAssignments.map((a: any) => ({
      nisn: String(a.nisn || ''),
      noUjian: String(a.noUjian || ''),
      ruang: String(a.ruang || ''),
      kelas: String(a.rombel || a.kelas || '-'),
      nama: String(a.nama || ''),
      foto: String(a.foto || '')
    }));

  // Load saved layout + konfigurasi ruang on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('keren_user_data');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        if ((parsedUser.role || '').toLowerCase() === 'admin') {
          setIsAdmin(true);
        }
      } catch(e) {}
    }

    const loadGlobalConfig = async () => {
      try {
        // Coba load dari Supabase (Global): layout + konfigurasi_ruang_ujian dalam 1 query
        const { data, error } = await supabase
          .from('rapor_config')
          .select('*')
          .in('key', ['nopes_layout', 'nobang_layout', 'konfigurasi_ruang_ujian']);
        
        let loadedNopes = false;
        let loadedNobang = false;
        let loadedParticipants = false;

        if (!error && data) {
          const nopesCfg = data.find((d: any) => d.key === 'nopes_layout');
          if (nopesCfg && nopesCfg.value) {
            setLayout(JSON.parse(nopesCfg.value));
            loadedNopes = true;
          }
          
          const nobangCfg = data.find((d: any) => d.key === 'nobang_layout');
          if (nobangCfg && nobangCfg.value) {
            setLayoutNobang(JSON.parse(nobangCfg.value));
            loadedNobang = true;
          }

          const roomCfg = data.find((d: any) => d.key === 'konfigurasi_ruang_ujian');
          if (roomCfg && roomCfg.value) {
            const parsedRoom = JSON.parse(roomCfg.value);
            if (Array.isArray(parsedRoom.assignments) && parsedRoom.assignments.length > 0) {
              setParticipants(mapConfigAssignments(parsedRoom.assignments));
              loadedParticipants = true;
            }
          }
        }

        // Fallback ke local storage jika di Supabase belum ada
        if (!loadedNopes) {
          const saved = localStorage.getItem('nopesLayoutConfig');
          if (saved) setLayout(JSON.parse(saved));
        }
        if (!loadedNobang) {
          const savedNobang = localStorage.getItem('nopes_layout_nobang');
          if (savedNobang) setLayoutNobang(JSON.parse(savedNobang));
        }
        if (!loadedParticipants) {
          const savedRoom = localStorage.getItem('konfigurasi_ruang_ujian');
          if (savedRoom) {
            const parsedRoom = JSON.parse(savedRoom);
            if (Array.isArray(parsedRoom.assignments) && parsedRoom.assignments.length > 0) {
              setParticipants(mapConfigAssignments(parsedRoom.assignments));
            }
          }
        }
      } catch (err) {}
    };

    loadGlobalConfig();
  }, []);

  const saveLayoutGlobal = async () => {
    try {
      Swal.fire({ title: 'Menyimpan...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
      const { error: e1 } = await supabase.from('rapor_config').upsert({ key: 'nopes_layout', value: JSON.stringify(layout) }, { onConflict: 'key' });
      if (e1) throw e1;
      const { error: e2 } = await supabase.from('rapor_config').upsert({ key: 'nobang_layout', value: JSON.stringify(layoutNobang) }, { onConflict: 'key' });
      if (e2) throw e2;
      Swal.fire('Berhasil', 'Posisi layout telah disimpan secara global untuk semua pengguna.', 'success');
    } catch (error: any) {
      Swal.fire('Error', error.message, 'error');
    }
  };

  const updateLayout = (key: keyof typeof layout, value: number) => {
    const newLayout = { ...layout, [key]: value };
    setLayout(newLayout);
    localStorage.setItem('nopesLayoutConfig', JSON.stringify(newLayout));
  };

  const syncFromKonfigurasiRuang = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('rapor_config')
        .select('value')
        .eq('key', 'konfigurasi_ruang_ujian')
        .maybeSingle();

      let rawValue: string | null = !error && data?.value ? data.value : null;
      if (!rawValue) {
        rawValue = localStorage.getItem('konfigurasi_ruang_ujian');
      }

      if (!rawValue) {
        Swal.fire('Belum Ada Data', 'Konfigurasi pembagian ruang belum tersimpan. Silakan bagi ruang terlebih dahulu di tab 1. Konfigurasi Ruang.', 'info');
        return;
      }

      const parsed = JSON.parse(rawValue);
      if (!Array.isArray(parsed.assignments) || parsed.assignments.length === 0) {
        Swal.fire('Belum Ada Data', 'Data pembagian peserta di Konfigurasi Ruang masih kosong.', 'info');
        return;
      }

      const mapped = mapConfigAssignments(parsed.assignments);
      setParticipants(mapped);
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: `${mapped.length} peserta dimuat dari Konfigurasi Ruang.`,
        showConfirmButton: false,
        timer: 2000
      });
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'Gagal memuat data dari Konfigurasi Ruang.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const generateNobangPDF = async () => {
    const targetList = filteredParticipants;
    if (targetList.length === 0) {
      Swal.fire('Oops', 'Data peserta masih kosong!', 'warning');
      return;
    }

    if (!nobangDesign) {
      Swal.fire('Oops', 'Silakan impor design Nobang terlebih dahulu!', 'warning');
      return;
    }

    setGenerating(true);
    setProgress('Memuat template Nobang...');

    try {
      // Canvas render size (sesuai request: 660×250px)
      const cW = 660;
      const cH = 250;

      // Card dimensions in mm — 3 kartu per baris (hemat kertas)
      // 3 × 66 = 198mm → sisa 6mm kiri + 6mm kanan
      const cardW = 66;
      // Hitung cardH dari rasio pixel canvas agar proporsional (tidak mleyot)
      const cardH = Math.round(cardW * (cH / cW) * 10) / 10; // = 66 × (250/660) = 25mm
      const cols = 3;
      const rows = 11; // 11 × 25mm = 275mm → margin atas/bawah ~11mm
      const cardsPerPage = cols * rows; // 33

      // A4 size in mm: 210 x 297
      const pageW = 210;
      const pageH = 297;
      const marginX = (pageW - cols * cardW) / 2; // (210 - 198)/2 = 6mm
      const marginY = (pageH - rows * cardH) / 2; // (297 - 250)/2 = 23.5mm

      // Load template background once
      const bgImg = await loadImage(nobangDesign);

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      // Helper to draw crop marks (garis bantu potong)
      const drawCropMarks = (doc: any) => {
        doc.setDrawColor(100, 100, 100);
        doc.setLineWidth(0.2);
        const markLen = 3; // 3mm length since margins are small

        // Vertical marks (top and bottom)
        for (let c = 0; c <= cols; c++) {
          const vx = marginX + c * cardW;
          doc.line(vx, marginY - markLen, vx, marginY);
          doc.line(vx, pageH - marginY, vx, pageH - marginY + markLen);
        }

        // Horizontal marks (left and right)
        for (let r = 0; r <= rows; r++) {
          const hy = marginY + r * cardH;
          doc.line(marginX - markLen, hy, marginX, hy);
          doc.line(pageW - marginX, hy, pageW - marginX + markLen, hy);
        }
      };

      // Draw crop marks on the first page
      drawCropMarks(pdf);

      const totalPages = Math.ceil(targetList.length / cardsPerPage);

      for (let i = 0; i < targetList.length; i++) {
        const pageIdx = Math.floor(i / cardsPerPage);
        const posInPage = i % cardsPerPage;

        if (posInPage === 0 && i > 0) {
          pdf.addPage();
          drawCropMarks(pdf);
        }

        setProgress(`Merender nobang ${i + 1} / ${targetList.length} (Hal ${pageIdx + 1}/${totalPages})`);

        const col = posInPage % cols;
        const row = Math.floor(posInPage / cols);

        // Draw card on canvas
        const canvas = document.createElement('canvas');
        canvas.width = cW;
        canvas.height = cH;
        const ctx = canvas.getContext('2d')!;

        // Draw background template
        ctx.drawImage(bgImg, 0, 0, cW, cH);

        // Draw Text
        const p = targetList[i];
        ctx.fillStyle = '#000';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // NAME
        ctx.font = `bold ${Math.round(cH * (layoutNobang.nameSize / 100))}px Arial, sans-serif`;
        const nameText = (p.nama || '').toUpperCase();
        const maxTextWidth = cW * 0.8;
        let displayName = nameText;
        if (ctx.measureText(nameText).width > maxTextWidth) {
          while (ctx.measureText(displayName + '...').width > maxTextWidth && displayName.length > 0) {
            displayName = displayName.slice(0, -1);
          }
          displayName += '...';
        }
        ctx.fillText(displayName, cW * (layoutNobang.nameX / 100), cH * (layoutNobang.nameY / 100));

        // DETAIL (Kelas | No Ujian | Ruang)
        ctx.fillStyle = '#000000';
        ctx.font = `bold ${Math.round(cH * (layoutNobang.detailSize / 100))}px Arial, sans-serif`;
        ctx.fillText(`${p.kelas || ''} | ${p.noUjian || ''} | ${p.ruang || ''}`, cW * (layoutNobang.detailX / 100), cH * (layoutNobang.detailY / 100));

        // Add card to PDF as compressed JPEG
        const imgData = canvas.toDataURL('image/jpeg', 0.85);
        const x = marginX + col * cardW;
        const y = marginY + row * cardH;
        pdf.addImage(imgData, 'JPEG', x, y, cardW, cardH);
      }

      setProgress('Menyimpan PDF...');
      pdf.save('Kartu_Nobang_Ujian.pdf');

      Swal.fire('Berhasil!', `PDF Nobang berhasil digenerate (${targetList.length} kartu, ${totalPages} halaman)`, 'success');
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'Gagal generate PDF: ' + String(err), 'error');
    }

    setGenerating(false);
    setProgress('');
  };

  const generatePDF = async () => {
    const targetList = filteredParticipants;
    if (targetList.length === 0) {
      Swal.fire('Oops', 'Data peserta masih kosong!', 'warning');
      return;
    }

    setGenerating(true);
    setProgress('Memuat template...');

    try {
      // Card dimensions in mm (5.58cm x 9.5cm)
      const cardW = 55.8;
      const cardH = 95;
      const cols = 3;
      const rows = 3;
      const cardsPerPage = cols * rows;

      // A4 size in mm: 210 x 297
      const pageW = 210;
      const pageH = 297;
      const marginX = (pageW - cols * cardW) / 2;
      const marginY = (pageH - rows * cardH) / 2;

      // Canvas pixel dimensions (300 DPI = ~11.81 pixels per mm)
      const scale = 11.81;
      const cW = Math.round(cardW * scale); // ~659px
      const cH = Math.round(cardH * scale); // ~1122px

      // Require custom design
      if (!customDesign) {
        Swal.fire('Oops', 'Silakan impor design terlebih dahulu!', 'warning');
        setGenerating(false);
        setProgress('');
        return;
      }

      // Load template background once
      const bgImg = await loadImage(customDesign);

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      // Helper to draw crop marks (garis bantu potong)
      const drawCropMarks = (doc: any) => {
        doc.setDrawColor(100, 100, 100); // gray
        doc.setLineWidth(0.2); // thin line
        const markLen = 6; // 6mm length

        // Vertical marks (top and bottom)
        for (let c = 0; c <= cols; c++) {
          const vx = marginX + c * cardW;
          // Top
          doc.line(vx, marginY - markLen, vx, marginY);
          // Bottom
          doc.line(vx, pageH - marginY, vx, pageH - marginY + markLen);
        }

        // Horizontal marks (left and right)
        for (let r = 0; r <= rows; r++) {
          const hy = marginY + r * cardH;
          // Left
          doc.line(marginX - markLen, hy, marginX, hy);
          // Right
          doc.line(pageW - marginX, hy, pageW - marginX + markLen, hy);
        }
      };

      // Draw crop marks on the first page
      drawCropMarks(pdf);

      // Pre-load all photos in parallel
      setProgress('Memuat foto siswa...');
      const photoPromises = targetList.map(p => {
        if (!p.foto) return Promise.resolve(null);
        return loadImage(getPhotoUrl(p.foto)).catch(() => null);
      });
      const photos = await Promise.all(photoPromises);

      const totalPages = Math.ceil(targetList.length / cardsPerPage);

      for (let i = 0; i < targetList.length; i++) {
        const pageIdx = Math.floor(i / cardsPerPage);
        const posInPage = i % cardsPerPage;

        if (posInPage === 0 && i > 0) {
          pdf.addPage();
          drawCropMarks(pdf);
        }

        setProgress(`Merender kartu ${i + 1} / ${targetList.length} (Hal ${pageIdx + 1}/${totalPages})`);

        const col = posInPage % cols;
        const row = Math.floor(posInPage / cols);

        // Draw card on canvas
        const canvas = document.createElement('canvas');
        canvas.width = cW;
        canvas.height = cH;
        const ctx = canvas.getContext('2d')!;

        // Draw background template
        ctx.drawImage(bgImg, 0, 0, cW, cH);

        // Draw photo or placeholder
        const photo = photos[i];
        
        // Dynamic sizing based on layout state
        const photoW = cW * (layout.photoW / 100);
        const photoH = cH * (layout.photoH / 100);
        const photoX = (cW - photoW) / 2;
        const photoY = cH * (layout.photoY / 100);

        // Draw rounded rect clip
        const radius = 15; // 15px radius for 600px width
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(photoX + radius, photoY);
        ctx.lineTo(photoX + photoW - radius, photoY);
        ctx.quadraticCurveTo(photoX + photoW, photoY, photoX + photoW, photoY + radius);
        ctx.lineTo(photoX + photoW, photoY + photoH - radius);
        ctx.quadraticCurveTo(photoX + photoW, photoY + photoH, photoX + photoW - radius, photoY + photoH);
        ctx.lineTo(photoX + radius, photoY + photoH);
        ctx.quadraticCurveTo(photoX, photoY + photoH, photoX, photoY + photoH - radius);
        ctx.lineTo(photoX, photoY + radius);
        ctx.quadraticCurveTo(photoX, photoY, photoX + radius, photoY);
        ctx.closePath();
        ctx.clip();

        if (photo) {
          ctx.drawImage(photo, photoX, photoY, photoW, photoH);
        } else {
          // Draw silhouette placeholder
          ctx.fillStyle = '#e2e8f0'; // Light gray background
          ctx.fillRect(photoX, photoY, photoW, photoH);
          
          ctx.fillStyle = '#94a3b8'; // Darker gray for silhouette
          
          // Head
          const headRadius = photoW * 0.25;
          const headX = photoX + photoW / 2;
          const headY = photoY + photoH * 0.35;
          ctx.beginPath();
          ctx.arc(headX, headY, headRadius, 0, Math.PI * 2);
          ctx.fill();
          
          // Body (shoulders)
          const bodyRadius = photoW * 0.45;
          const bodyX = photoX + photoW / 2;
          const bodyY = photoY + photoH * 1.05; // Positioned low
          ctx.beginPath();
          // Draw a semi-circle for shoulders
          ctx.arc(bodyX, bodyY, bodyRadius, Math.PI, 0); 
          ctx.fill();
        }
        ctx.restore();

        // Draw name text
        const p = targetList[i];
        ctx.fillStyle = '#000';
        ctx.font = `bold ${Math.round(cW * (layout.nameSize / 100))}px Arial, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const nameText = (p.nama || '').toUpperCase();
        const maxTextWidth = cW * 0.84;
        let displayName = nameText;
        if (ctx.measureText(nameText).width > maxTextWidth) {
          while (ctx.measureText(displayName + '...').width > maxTextWidth && displayName.length > 0) {
            displayName = displayName.slice(0, -1);
          }
          displayName += '...';
        }
        ctx.fillText(displayName, cW / 2, cH * (layout.nameY / 100));

        // Draw Kelas | No Ujian | Ruang
        ctx.fillStyle = '#1e40af';
        ctx.font = `bold ${Math.round(cW * (layout.detailSize / 100))}px Arial, sans-serif`;
        ctx.fillText(`${p.kelas} | ${p.noUjian} | ${p.ruang}`, cW / 2, cH * (layout.detailY / 100));

        // Add card to PDF as compressed JPEG
        const imgData = canvas.toDataURL('image/jpeg', 0.85);
        const x = marginX + col * cardW;
        const y = marginY + row * cardH;
        pdf.addImage(imgData, 'JPEG', x, y, cardW, cardH);
      }

      setProgress('Menyimpan PDF...');
      pdf.save('Kartu_Nopes_Ujian.pdf');

      Swal.fire('Berhasil!', `PDF berhasil digenerate (${targetList.length} kartu, ${totalPages} halaman)`, 'success');
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'Gagal generate PDF: ' + String(err), 'error');
    }

    setGenerating(false);
    setProgress('');
  };

  const renderParticipantSection = ({
    title,
    designValue,
    onDesignUpload,
    onDownloadPdf,
    showPhoto
  }: {
    title: string;
    designValue: string | null;
    onDesignUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onDownloadPdf: () => void;
    showPhoto: boolean;
  }) => (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#334155', margin: 0 }}>
          {title}
        </h2>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <label style={{ padding: '8px 16px', background: designValue ? '#10b981' : '#f59e0b', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', color: 'white', fontWeight: 'bold' }}>
            <i className="fas fa-image"></i> {designValue ? 'Design OK' : 'Import Design'}
            <input type="file" accept="image/png, image/jpeg" style={{ display: 'none' }} onChange={onDesignUpload} disabled={loading || generating} />
          </label>
          <button onClick={syncFromKonfigurasiRuang} disabled={loading || generating} style={{ padding: '8px 16px', background: '#3b82f6', border: 'none', borderRadius: '6px', cursor: loading || generating ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px', color: 'white', fontWeight: 'bold' }}>
            <i className={loading ? 'fas fa-spinner fa-spin' : 'fas fa-sync-alt'}></i>
            {loading ? 'Memuat...' : 'Muat dari Konfigurasi Ruang'}
          </button>
          {(filteredParticipants.length > 0 && designValue) && (
            <button onClick={onDownloadPdf} disabled={generating} style={{ padding: '8px 16px', background: generating ? '#94a3b8' : '#10b981', border: 'none', borderRadius: '6px', cursor: generating ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px', color: 'white', fontWeight: 'bold' }}>
              <i className={generating ? 'fas fa-spinner fa-spin' : 'fas fa-file-pdf'}></i>
              {generating ? progress : `Download PDF (${filteredParticipants.length} Kartu)`}
            </button>
          )}
        </div>
      </div>

      {participants.length > 0 ? (
        <>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '12px', padding: '10px 12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <input
              type="text"
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              placeholder="Cari nama, NISN, kelas, atau No. Ujian..."
              style={{ flex: '1 1 240px', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', background: 'white' }}
            />
            <select
              value={roomFilter}
              onChange={e => setRoomFilter(e.target.value)}
              style={{ padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', background: 'white', minWidth: '150px' }}
            >
              <option value="ALL">Semua Ruang ({participants.length})</option>
              {roomOptions.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            {(searchText || roomFilter !== 'ALL') && (
              <button
                type="button"
                onClick={() => { setSearchText(''); setRoomFilter('ALL'); }}
                style={{ padding: '7px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', background: 'white', color: '#475569', fontSize: '12.5px', fontWeight: 600, cursor: 'pointer' }}
              >
                Reset
              </button>
            )}
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '12px', textAlign: 'center', color: '#475569', width: '52px' }}>No</th>
                  <th style={{ padding: '12px', textAlign: 'left', color: '#475569' }}>NISN</th>
                  <th style={{ padding: '12px', textAlign: 'left', color: '#475569' }}>Nama Siswa</th>
                  <th style={{ padding: '12px', textAlign: 'left', color: '#475569' }}>No Ujian</th>
                  <th style={{ padding: '12px', textAlign: 'left', color: '#475569' }}>Ruang</th>
                  {showPhoto && <th style={{ padding: '12px', textAlign: 'center', color: '#475569' }}>Foto</th>}
                </tr>
              </thead>
              <tbody>
                {paginatedParticipants.length === 0 ? (
                  <tr>
                    <td colSpan={showPhoto ? 6 : 5} style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
                      Tidak ada peserta yang cocok dengan filter.
                    </td>
                  </tr>
                ) : (
                  paginatedParticipants.map((p, idx) => {
                    const rowNo = (safeTablePage - 1) * tablePageSize + idx + 1;
                    return (
                      <tr key={`${p.nisn}-${p.noUjian}-${rowNo}`} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '12px', textAlign: 'center', color: '#64748b' }}>{rowNo}</td>
                        <td style={{ padding: '12px' }}>{p.nisn}</td>
                        <td style={{ padding: '12px', fontWeight: 'bold', color: '#334155' }}>{p.nama}</td>
                        <td style={{ padding: '12px' }}>
                          {showPhoto ? (
                            <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '4px 8px', borderRadius: '4px' }}>{p.noUjian}</span>
                          ) : (
                            p.noUjian
                          )}
                        </td>
                        <td style={{ padding: '12px' }}>{p.ruang}</td>
                        {showPhoto && (
                          <td style={{ padding: '12px', textAlign: 'center' }}>
                            {p.foto ? (
                              <img src={getPhotoUrl(p.foto)} alt="foto" style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '50%', border: '2px solid #e2e8f0' }} />
                            ) : (
                              <div style={{ width: '40px', height: '40px', background: '#e2e8f0', borderRadius: '50%', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', border: '2px solid #e2e8f0' }}>
                                <i className="fas fa-user"></i>
                              </div>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <PaginationBar
            totalItems={filteredParticipants.length}
            currentPage={safeTablePage}
            pageSize={tablePageSize}
            onPageChange={setTablePage}
            onPageSizeChange={setTablePageSize}
          />
        </>
      ) : (
        <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
          <i className="fas fa-door-open" style={{ fontSize: '48px', color: '#cbd5e1', marginBottom: '16px', display: 'block' }}></i>
          Belum ada data peserta. Silakan bagi ruang terlebih dahulu di tab <b>1. Konfigurasi Ruang</b>, lalu klik <b>Muat dari Konfigurasi Ruang</b>.
        </div>
      )}
    </div>
  );

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e293b', marginBottom: '8px' }}>
          Perangkat Ujian
        </h1>
        <p style={{ color: '#64748b' }}>
          Konfigurasi Ruang, Daftar Hadir, Generate Nomor Peserta (Nopes), dan Nomor Bangku (Nobang) untuk Ujian.
        </p>
      </div>

      {isAdmin && activeTab === 'nopes' && (
        <details style={{ marginBottom: '20px', background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
          <summary style={{ fontWeight: 'bold', cursor: 'pointer', color: '#334155' }}>
            <i className="fas fa-sliders-h" style={{ marginRight: '8px' }}></i>
            Atur Posisi Desain Nopes (Klik untuk membuka)
          </summary>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginTop: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Lebar Foto (%)</label>
              <input type="number" step="0.5" value={layout.photoW} onChange={e => updateLayout('photoW', parseFloat(e.target.value))} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Tinggi Foto (%)</label>
              <input type="number" step="0.5" value={layout.photoH} onChange={e => updateLayout('photoH', parseFloat(e.target.value))} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Posisi Y Foto (%)</label>
              <input type="number" step="0.5" value={layout.photoY} onChange={e => updateLayout('photoY', parseFloat(e.target.value))} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Posisi Y Nama (%)</label>
              <input type="number" step="0.5" value={layout.nameY} onChange={e => updateLayout('nameY', parseFloat(e.target.value))} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Ukuran Font Nama (%)</label>
              <input type="number" step="0.5" value={layout.nameSize} onChange={e => updateLayout('nameSize', parseFloat(e.target.value))} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Posisi Y Detail (%)</label>
              <input type="number" step="0.5" value={layout.detailY} onChange={e => updateLayout('detailY', parseFloat(e.target.value))} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Ukuran Font Detail (%)</label>
              <input type="number" step="0.5" value={layout.detailSize} onChange={e => updateLayout('detailSize', parseFloat(e.target.value))} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
            </div>
          </div>
          <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={saveLayoutGlobal} style={{ background: '#3b82f6', color: 'white', padding: '8px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>
              <i className="fas fa-save" style={{ marginRight: '8px' }}></i> Simpan Posisi ke Semua PC
            </button>
          </div>
        </details>
      )}

      {isAdmin && activeTab === 'nobang' && (
        <details style={{ marginBottom: '20px', background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
          <summary style={{ fontWeight: 'bold', cursor: 'pointer', color: '#334155' }}>
            <i className="fas fa-sliders-h" style={{ marginRight: '8px' }}></i>
            Atur Posisi Desain Nobang (Klik untuk membuka)
          </summary>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginTop: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Posisi X Nama (%)</label>
              <input type="number" step="0.5" value={layoutNobang.nameX} onChange={e => updateLayoutNobang('nameX', parseFloat(e.target.value))} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Posisi Y Nama (%)</label>
              <input type="number" step="0.5" value={layoutNobang.nameY} onChange={e => updateLayoutNobang('nameY', parseFloat(e.target.value))} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Ukuran Font Nama (%)</label>
              <input type="number" step="0.5" value={layoutNobang.nameSize} onChange={e => updateLayoutNobang('nameSize', parseFloat(e.target.value))} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Posisi X Detail (%)</label>
              <input type="number" step="0.5" value={layoutNobang.detailX} onChange={e => updateLayoutNobang('detailX', parseFloat(e.target.value))} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Posisi Y Detail (%)</label>
              <input type="number" step="0.5" value={layoutNobang.detailY} onChange={e => updateLayoutNobang('detailY', parseFloat(e.target.value))} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Ukuran Font Detail (%)</label>
              <input type="number" step="0.5" value={layoutNobang.detailSize} onChange={e => updateLayoutNobang('detailSize', parseFloat(e.target.value))} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
            </div>
          </div>
          <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={saveLayoutGlobal} style={{ background: '#3b82f6', color: 'white', padding: '8px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>
              <i className="fas fa-save" style={{ marginRight: '8px' }}></i> Simpan Posisi ke Semua PC
            </button>
          </div>
        </details>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', borderBottom: '1px solid #e2e8f0', marginBottom: '20px' }}>
        <button
          onClick={() => setActiveTab('konfigurasi-ruang')}
          style={{ padding: '12px 20px', background: 'none', border: 'none', borderBottom: activeTab === 'konfigurasi-ruang' ? '3px solid #0ea5e9' : '3px solid transparent', color: activeTab === 'konfigurasi-ruang' ? '#0ea5e9' : '#64748b', fontWeight: activeTab === 'konfigurasi-ruang' ? 'bold' : 'normal', cursor: 'pointer', fontSize: '15px' }}
        >
          <i className="fas fa-door-open" style={{ marginRight: '8px' }}></i>
          1. Konfigurasi Ruang
        </button>
        <button
          onClick={() => setActiveTab('nopes')}
          style={{ padding: '12px 20px', background: 'none', border: 'none', borderBottom: activeTab === 'nopes' ? '3px solid #0ea5e9' : '3px solid transparent', color: activeTab === 'nopes' ? '#0ea5e9' : '#64748b', fontWeight: activeTab === 'nopes' ? 'bold' : 'normal', cursor: 'pointer', fontSize: '15px' }}
        >
          <i className="fas fa-id-badge" style={{ marginRight: '8px' }}></i>
          2. Generate Nopes
        </button>
        <button
          onClick={() => setActiveTab('nobang')}
          style={{ padding: '12px 20px', background: 'none', border: 'none', borderBottom: activeTab === 'nobang' ? '3px solid #0ea5e9' : '3px solid transparent', color: activeTab === 'nobang' ? '#0ea5e9' : '#64748b', fontWeight: activeTab === 'nobang' ? 'bold' : 'normal', cursor: 'pointer', fontSize: '15px' }}
        >
          <i className="fas fa-chair" style={{ marginRight: '8px' }}></i>
          3. Generate Nobang
        </button>
        <button
          onClick={() => setActiveTab('identitas')}
          style={{ padding: '12px 20px', background: 'none', border: 'none', borderBottom: activeTab === 'identitas' ? '3px solid #0ea5e9' : '3px solid transparent', color: activeTab === 'identitas' ? '#0ea5e9' : '#64748b', fontWeight: activeTab === 'identitas' ? 'bold' : 'normal', cursor: 'pointer', fontSize: '15px' }}
        >
          <i className="fas fa-id-card" style={{ marginRight: '8px' }}></i>
          4. Cetak Identitas Rapor
        </button>
        <button
          onClick={() => setActiveTab('sampul')}
          style={{ padding: '12px 20px', background: 'none', border: 'none', borderBottom: activeTab === 'sampul' ? '3px solid #0ea5e9' : '3px solid transparent', color: activeTab === 'sampul' ? '#0ea5e9' : '#64748b', fontWeight: activeTab === 'sampul' ? 'bold' : 'normal', cursor: 'pointer', fontSize: '15px' }}
        >
          <i className="fas fa-book" style={{ marginRight: '8px' }}></i>
          5. Cetak Sampul Rapor
        </button>
      </div>

      {/* Tab Content */}
      <div style={{ background: 'white', padding: '24px', borderRadius: '8px', border: '1px solid #e2e8f0', minHeight: '400px' }}>
        {activeTab === 'konfigurasi-ruang' && (
          <KonfigurasiRuangTab />
        )}
        {activeTab === 'nopes' &&
          renderParticipantSection({
            title: 'Daftar Nomor Peserta',
            designValue: customDesign,
            onDesignUpload: handleDesignUpload,
            onDownloadPdf: generatePDF,
            showPhoto: true
          })}

        {activeTab === 'nobang' &&
          renderParticipantSection({
            title: 'Daftar Nomor Bangku',
            designValue: nobangDesign,
            onDesignUpload: handleNobangDesignUpload,
            onDownloadPdf: generateNobangPDF,
            showPhoto: false
          })}

        {activeTab === 'identitas' && (
          <CetakIdentitasTab />
        )}

        {activeTab === 'sampul' && (
          <CetakSampulTab />
        )}
      </div>
    </div>
  );
}




