'use client';
import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '@/lib/supabase';
import Swal from 'sweetalert2';
import { jsPDF } from 'jspdf';

interface Participant {
  nisn: string;
  noUjian: string;
  ruang: string;
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

export default function PerangkatUjianPage() {
  const [activeTab, setActiveTab] = useState<'nopes' | 'nobang'>('nopes');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const downloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet([{ NISN: '1234567890', 'NO UJIAN': '001-01', RUANG: 'Ruang 1' }]);
    XLSX.utils.book_append_sheet(wb, ws, 'Template Nopes');
    XLSX.writeFile(wb, 'Template_Import_Nopes.xlsx');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

      if (rows.length === 0) {
        Swal.fire('Error', 'File Excel kosong', 'error');
        setLoading(false);
        return;
      }

      const parsed: Participant[] = rows.map(r => ({
        nisn: String(r['NISN'] || ''),
        noUjian: String(r['NO UJIAN'] || ''),
        ruang: String(r['RUANG'] || '')
      })).filter(p => p.nisn);

      const pageSize = 1000;
      const pages = [0, 1, 2, 3];
      const results = await Promise.all(
        pages.map(page =>
          supabase
            .from('data_induk')
            .select('metadata')
            .range(page * pageSize, (page + 1) * pageSize - 1)
        )
      );

      let hasError = false;
      let dbData: { metadata: Record<string, string> }[] = [];

      for (const res of results) {
        if (res.error) hasError = true;
        if (res.data) dbData = [...dbData, ...res.data];
      }

      if (hasError) {
        Swal.fire('Error', 'Gagal memuat sebagian atau seluruh data dari Supabase', 'error');
      } else {
        const enriched = parsed.map(p => {
          const match = dbData.find(d => String(d.metadata?.['NISN']) === p.nisn);
          return {
            ...p,
            nama: match?.metadata?.['NAMA'] || 'TIDAK DITEMUKAN',
            foto: match?.metadata?.['LINK FOTO TERBARU'] || match?.metadata?.['LINK URL FOTO 1'] || ''
          };
        });
        setParticipants(enriched);
      }
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'Gagal membaca file Excel', 'error');
    }
    setLoading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const generatePDF = async () => {
    if (participants.length === 0) {
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

      // Load template background once
      const bgImg = await loadImage('/nopes%20sts%20ganjil.png');

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      // Pre-load all photos in parallel
      setProgress('Memuat foto siswa...');
      const photoPromises = participants.map(p => {
        if (!p.foto) return Promise.resolve(null);
        return loadImage(getPhotoUrl(p.foto)).catch(() => null);
      });
      const photos = await Promise.all(photoPromises);

      const totalPages = Math.ceil(participants.length / cardsPerPage);

      for (let i = 0; i < participants.length; i++) {
        const pageIdx = Math.floor(i / cardsPerPage);
        const posInPage = i % cardsPerPage;

        if (posInPage === 0 && i > 0) {
          pdf.addPage();
        }

        setProgress(`Merender kartu ${i + 1} / ${participants.length} (Hal ${pageIdx + 1}/${totalPages})`);

        const col = posInPage % cols;
        const row = Math.floor(posInPage / cols);

        // Draw card on canvas
        const canvas = document.createElement('canvas');
        canvas.width = cW;
        canvas.height = cH;
        const ctx = canvas.getContext('2d')!;

        // Draw background template
        ctx.drawImage(bgImg, 0, 0, cW, cH);

        // Draw photo
        const photo = photos[i];
        if (photo) {
          // Adjust to fit well within the template box
          const photoW = cW * 0.45;
          const photoH = cH * 0.33;
          const photoX = (cW - photoW) / 2;
          const photoY = cH * 0.31;

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
          ctx.drawImage(photo, photoX, photoY, photoW, photoH);
          ctx.restore();
        }

        // Draw name text
        const p = participants[i];
        ctx.fillStyle = '#000';
        // Base font size on canvas width so it scales perfectly
        ctx.font = `bold ${Math.round(cW * 0.055)}px Arial, sans-serif`;
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
        ctx.fillText(displayName, cW / 2, cH * 0.74);

        // Draw No Ujian | Ruang
        ctx.fillStyle = '#1e40af';
        ctx.font = `bold ${Math.round(cW * 0.065)}px Arial, sans-serif`;
        ctx.fillText(`${p.noUjian} | ${p.ruang}`, cW / 2, cH * 0.86);

        // Add card to PDF as compressed JPEG
        const imgData = canvas.toDataURL('image/jpeg', 0.85);
        const x = marginX + col * cardW;
        const y = marginY + row * cardH;
        pdf.addImage(imgData, 'JPEG', x, y, cardW, cardH);
      }

      setProgress('Menyimpan PDF...');
      pdf.save('Kartu_Nopes_Ujian.pdf');

      Swal.fire('Berhasil!', `PDF berhasil digenerate (${participants.length} kartu, ${totalPages} halaman)`, 'success');
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'Gagal generate PDF: ' + String(err), 'error');
    }

    setGenerating(false);
    setProgress('');
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e293b', marginBottom: '8px' }}>
          Perangkat Ujian
        </h1>
        <p style={{ color: '#64748b' }}>
          Generate Nomor Peserta (Nopes) dan Nomor Bangku (Nobang) untuk Ujian.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #e2e8f0', marginBottom: '20px' }}>
        <button
          onClick={() => setActiveTab('nopes')}
          style={{ padding: '12px 20px', background: 'none', border: 'none', borderBottom: activeTab === 'nopes' ? '3px solid #0ea5e9' : '3px solid transparent', color: activeTab === 'nopes' ? '#0ea5e9' : '#64748b', fontWeight: activeTab === 'nopes' ? 'bold' : 'normal', cursor: 'pointer', fontSize: '15px' }}
        >
          <i className="fas fa-id-badge" style={{ marginRight: '8px' }}></i>
          Generate Nopes
        </button>
        <button
          onClick={() => setActiveTab('nobang')}
          style={{ padding: '12px 20px', background: 'none', border: 'none', borderBottom: activeTab === 'nobang' ? '3px solid #0ea5e9' : '3px solid transparent', color: activeTab === 'nobang' ? '#0ea5e9' : '#64748b', fontWeight: activeTab === 'nobang' ? 'bold' : 'normal', cursor: 'pointer', fontSize: '15px' }}
        >
          <i className="fas fa-chair" style={{ marginRight: '8px' }}></i>
          Generate Nobang
        </button>
      </div>

      {/* Tab Content */}
      <div style={{ background: 'white', padding: '24px', borderRadius: '8px', border: '1px solid #e2e8f0', minHeight: '400px' }}>
        {activeTab === 'nopes' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#334155', margin: 0 }}>
                Daftar Nomor Peserta
              </h2>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={downloadTemplate} style={{ padding: '8px 16px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', color: '#475569' }}>
                  <i className="fas fa-download"></i> Template Excel
                </button>
                <label style={{ padding: '8px 16px', background: '#3b82f6', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', color: 'white', fontWeight: 'bold' }}>
                  <i className="fas fa-upload"></i> {loading ? 'Memproses...' : 'Import Data'}
                  <input type="file" accept=".xlsx, .xls" style={{ display: 'none' }} ref={fileInputRef} onChange={handleFileUpload} disabled={loading} />
                </label>
                {participants.length > 0 && (
                  <button onClick={generatePDF} disabled={generating} style={{ padding: '8px 16px', background: generating ? '#94a3b8' : '#10b981', border: 'none', borderRadius: '6px', cursor: generating ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px', color: 'white', fontWeight: 'bold' }}>
                    <i className={generating ? 'fas fa-spinner fa-spin' : 'fas fa-file-pdf'}></i>
                    {generating ? progress : `Download PDF (${participants.length} Kartu)`}
                  </button>
                )}
              </div>
            </div>

            {participants.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                      <th style={{ padding: '12px', textAlign: 'left', color: '#475569' }}>NISN</th>
                      <th style={{ padding: '12px', textAlign: 'left', color: '#475569' }}>Nama Siswa</th>
                      <th style={{ padding: '12px', textAlign: 'left', color: '#475569' }}>No Ujian</th>
                      <th style={{ padding: '12px', textAlign: 'left', color: '#475569' }}>Ruang</th>
                      <th style={{ padding: '12px', textAlign: 'center', color: '#475569' }}>Foto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {participants.map((p, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '12px' }}>{p.nisn}</td>
                        <td style={{ padding: '12px', fontWeight: 'bold' }}>{p.nama}</td>
                        <td style={{ padding: '12px' }}>
                          <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '4px 8px', borderRadius: '4px' }}>{p.noUjian}</span>
                        </td>
                        <td style={{ padding: '12px' }}>{p.ruang}</td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          {p.foto ? (
                            <img src={getPhotoUrl(p.foto)} alt="foto" style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '50%', border: '2px solid #e2e8f0' }} />
                          ) : (
                            <span style={{ color: '#94a3b8', fontSize: '12px' }}>Kosong</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                <i className="fas fa-file-excel" style={{ fontSize: '48px', color: '#cbd5e1', marginBottom: '16px', display: 'block' }}></i>
                Belum ada data peserta. Silakan import file Excel terlebih dahulu.
              </div>
            )}
          </div>
        )}

        {activeTab === 'nobang' && (
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px', color: '#334155' }}>
              Generate Nomor Bangku (Nobang)
            </h2>
            <p style={{ color: '#64748b' }}>Fitur untuk cetak Nobang akan ditambahkan di sini.</p>
          </div>
        )}
      </div>
    </div>
  );
}
