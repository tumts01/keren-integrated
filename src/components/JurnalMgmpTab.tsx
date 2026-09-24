'use client';
import { useState, useEffect, useRef } from 'react';
import Swal from 'sweetalert2';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface JurnalMgmp {
  id: number;
  namaGuru: string;
  bidangStudi: string;
  namaKegiatan: string;
  tempat: string;
  tanggal: string;
  penyelenggara: string;
  agenda: string;
  suratTugas: string;
  dokumentasi: string;
  notulen: string;
  daftarHadir: string;
}

interface Guru {
  nama: string;
  jabatan: string;
}

function compressImage(file: File, maxSize = 1200, quality = 0.7): Promise<Blob> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let w = img.width, h = img.height;
        if (w > maxSize || h > maxSize) {
          if (w > h) { h = Math.round(h * maxSize / w); w = maxSize; }
          else { w = Math.round(w * maxSize / h); h = maxSize; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
        canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', quality);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

function getProxiedUrl(url: string) {
  if (!url) return '';
  const match = url.match(/\/d\/([\w-]+)/);
  if (match) return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w800`;
  return url;
}

export default function JurnalMgmpTab() {
  const [data, setData] = useState<JurnalMgmp[]>([]);
  const [gurus, setGurus] = useState<Guru[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState<JurnalMgmp | null>(null);

  // Filter state
  const [filterGuru, setFilterGuru] = useState('');
  const [filterBulan, setFilterBulan] = useState('');

  // Form state
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({
    namaGuru: '',
    bidangStudi: '',
    namaKegiatan: '',
    tempat: '',
    tanggal: '',
    penyelenggara: '',
    agenda: '',
  });
  const [suratTugasFile, setSuratTugasFile] = useState<File | null>(null);
  const [dokumentasiFiles, setDokumentasiFiles] = useState<File[]>([]);
  const [daftarHadirFile, setDaftarHadirFile] = useState<File | null>(null);
  const [notulenFile, setNotulenFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState('');

  const suratTugasRef = useRef<HTMLInputElement>(null);
  const dokumentasiRef = useRef<HTMLInputElement>(null);
  const daftarHadirRef = useRef<HTMLInputElement>(null);
  const notulenRef = useRef<HTMLInputElement>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resData, resGuru] = await Promise.all([
        fetch('/api/jurnal-mgmp'),
        fetch('/api/guru'),
      ]);
      const jsonData = await resData.json();
      const jsonGuru = await resGuru.json();
      if (jsonData.success) setData(jsonData.data);
      if (jsonGuru.success) setGurus((jsonGuru.data || []).filter((g: any) => g.status === 'aktif'));
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const resetForm = () => {
    setEditId(null);
    setForm({ namaGuru: '', bidangStudi: '', namaKegiatan: '', tempat: '', tanggal: '', penyelenggara: '', agenda: '' });
    setSuratTugasFile(null);
    setDokumentasiFiles([]);
    setDaftarHadirFile(null);
    setNotulenFile(null);
    setUploadProgress('');
    if (suratTugasRef.current) suratTugasRef.current.value = '';
    if (dokumentasiRef.current) dokumentasiRef.current.value = '';
    if (daftarHadirRef.current) daftarHadirRef.current.value = '';
    if (notulenRef.current) notulenRef.current.value = '';
  };

  const handleEdit = (item: JurnalMgmp) => {
    setEditId(item.id);
    setForm({
      namaGuru: item.namaGuru,
      bidangStudi: item.bidangStudi,
      namaKegiatan: item.namaKegiatan,
      tempat: item.tempat,
      tanggal: item.tanggal,
      penyelenggara: item.penyelenggara,
      agenda: item.agenda,
    });
    setSuratTugasFile(null);
    setDokumentasiFiles([]);
    setDaftarHadirFile(null);
    setNotulenFile(null);
    if (suratTugasRef.current) suratTugasRef.current.value = '';
    if (dokumentasiRef.current) dokumentasiRef.current.value = '';
    if (daftarHadirRef.current) daftarHadirRef.current.value = '';
    if (notulenRef.current) notulenRef.current.value = '';
    setShowModal(true);
  };

  const uploadFile = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch('/api/jurnal-mgmp/upload', { method: 'POST', body: formData });
    const json = await res.json();
    if (!json.success) throw new Error(json.error);
    return json.url;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.namaGuru || !form.namaKegiatan || !form.tanggal) {
      return Swal.fire('Peringatan', 'Nama guru, nama kegiatan, dan tanggal wajib diisi!', 'warning');
    }

    setSubmitting(true);
    try {
      let suratTugasUrl = editId ? data.find(d => d.id === editId)?.suratTugas || '' : '';
      let dokumentasiUrlsStr = editId ? data.find(d => d.id === editId)?.dokumentasi || '' : '';
      let daftarHadirUrl = editId ? data.find(d => d.id === editId)?.daftarHadir || '' : '';
      let notulenUrl = editId ? data.find(d => d.id === editId)?.notulen || '' : '';

      if (suratTugasFile) {
        setUploadProgress('Mengunggah surat tugas...');
        const compressed = suratTugasFile.type.startsWith('image/') 
          ? await compressImage(suratTugasFile) 
          : suratTugasFile;
        suratTugasUrl = await uploadFile(new File([compressed], suratTugasFile.name, { type: suratTugasFile.type }));
      }

      if (daftarHadirFile) {
        setUploadProgress('Mengunggah daftar hadir...');
        const compressed = daftarHadirFile.type.startsWith('image/') 
          ? await compressImage(daftarHadirFile) 
          : daftarHadirFile;
        daftarHadirUrl = await uploadFile(new File([compressed], daftarHadirFile.name, { type: daftarHadirFile.type }));
      }

      if (notulenFile) {
        setUploadProgress('Mengunggah notulen...');
        const compressed = notulenFile.type.startsWith('image/') 
          ? await compressImage(notulenFile) 
          : notulenFile;
        notulenUrl = await uploadFile(new File([compressed], notulenFile.name, { type: notulenFile.type }));
      }

      if (dokumentasiFiles.length > 0) {
        let dokumentasiUrls: string[] = [];
        for (let i = 0; i < dokumentasiFiles.length; i++) {
          setUploadProgress(`Mengunggah foto dokumentasi ${i + 1}/${dokumentasiFiles.length}...`);
          const file = dokumentasiFiles[i];
          const compressed = await compressImage(file);
          const url = await uploadFile(new File([compressed], file.name, { type: 'image/jpeg' }));
          dokumentasiUrls.push(url);
        }
        dokumentasiUrlsStr = dokumentasiUrls.join(' || ');
      }

      setUploadProgress('Menyimpan data...');
      const res = await fetch('/api/jurnal-mgmp', {
        method: editId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          id: editId,
          suratTugas: suratTugasUrl,
          dokumentasi: dokumentasiUrlsStr,
          daftarHadir: daftarHadirUrl,
          notulen: notulenUrl,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);

      Swal.fire({ icon: 'success', title: 'Berhasil!', text: 'Jurnal MGMP berhasil disimpan.', timer: 2000, showConfirmButton: false });
      setShowModal(false);
      resetForm();
      fetchData();
    } catch (err: any) {
      Swal.fire('Error', 'Gagal menyimpan: ' + err.message, 'error');
    }
    setSubmitting(false);
    setUploadProgress('');
  };

  const handleDelete = async (id: number) => {
    const confirm = await Swal.fire({
      title: 'Hapus Data?',
      text: 'Data jurnal MGMP ini akan dihapus permanen.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonText: 'Batal',
      confirmButtonText: 'Ya, Hapus!'
    });
    if (!confirm.isConfirmed) return;

    const res = await fetch('/api/jurnal-mgmp', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    const json = await res.json();
    if (json.success) {
      Swal.fire({ icon: 'success', title: 'Terhapus!', timer: 1500, showConfirmButton: false });
      fetchData();
    } else {
      Swal.fire('Error', json.error, 'error');
    }
  };
  const loadImageForPDF = async (url: string): Promise<{ base64: string, width: number, height: number } | null> => {
    try {
      const res = await fetch(`/api/proxy-image?url=${encodeURIComponent(url)}&size=w1200`);
      if (!res.ok) return null;
      const blob = await res.blob();
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
      return await new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve({ base64, width: img.width, height: img.height });
        img.onerror = () => resolve(null);
        img.src = base64;
      });
    } catch { return null; }
  };

  const drawAttachment = async (doc: jsPDF, url: string, title: string) => {
    const imgData = await loadImageForPDF(url);
    if (!imgData) return;
    
    doc.addPage();
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`Lampiran: ${title}`, 105, 20, { align: 'center' });
    
    const margin = 15;
    const maxWidth = 210 - (margin * 2);
    const maxHeight = 297 - 40; // leaving top margin
    
    let finalWidth = imgData.width;
    let finalHeight = imgData.height;
    
    // Scale to fit width
    if (finalWidth > maxWidth) {
      const ratio = maxWidth / finalWidth;
      finalWidth = maxWidth;
      finalHeight = finalHeight * ratio;
    }
    
    // Scale to fit height
    if (finalHeight > maxHeight) {
      const ratio = maxHeight / finalHeight;
      finalHeight = maxHeight;
      finalWidth = finalWidth * ratio;
    }
    
    const x = (210 - finalWidth) / 2;
    // Format is optional, jsPDF usually infers it, but we can pass 'JPEG' or 'PNG'
    doc.addImage(imgData.base64, 'JPEG', x, 30, finalWidth, finalHeight);
  };

  const handleDownloadPDF = async (jurnal: JurnalMgmp) => {
    Swal.fire({ 
      title: 'Menyiapkan Dokumen...', 
      text: 'Mengunduh data dan seluruh lampiran. Mohon tunggu sebentar...', 
      allowOutsideClick: false, 
      didOpen: () => { Swal.showLoading(); } 
    });

    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      
      // Kop Surat
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text('LAPORAN HASIL MGMP', 105, 20, { align: 'center' });
      doc.setLineWidth(0.5);
      doc.line(20, 28, 190, 28);
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      
      // Data Table using autotable for easy alignment
      const tableData = [
        ['Nama Guru', ':', jurnal.namaGuru],
        ['Bidang Studi', ':', jurnal.bidangStudi || '-'],
        ['Nama Kegiatan', ':', jurnal.namaKegiatan],
        ['Tanggal', ':', formatDate(jurnal.tanggal)],
        ['Tempat', ':', jurnal.tempat || '-'],
        ['Penyelenggara', ':', jurnal.penyelenggara || '-'],
        ['Agenda', ':', jurnal.agenda || '-'],
      ];

      autoTable(doc, {
        startY: 35,
        head: [],
        body: tableData,
        theme: 'plain',
        styles: { cellPadding: 2, fontSize: 11, font: 'helvetica' },
        columnStyles: {
          0: { cellWidth: 40, fontStyle: 'bold' },
          1: { cellWidth: 5 },
          2: { cellWidth: 'auto' }
        }
      });

      const finalY = (doc as any).lastAutoTable.finalY + 10;
      doc.setFont('helvetica', 'bold');
      doc.text('Catatan:', 14, finalY);
      doc.setFont('helvetica', 'normal');
      doc.text('Bukti fisik lampiran (Surat Tugas, Notulen, Daftar Hadir, dan Dokumentasi) terlampir pada halaman berikutnya.', 14, finalY + 6, { maxWidth: 180 });

      // Embed Attachments
      if (jurnal.suratTugas) {
        await drawAttachment(doc, jurnal.suratTugas, 'Surat Tugas');
      }
      if (jurnal.daftarHadir) {
        await drawAttachment(doc, jurnal.daftarHadir, 'Daftar Hadir');
      }
      if (jurnal.notulen) {
        await drawAttachment(doc, jurnal.notulen, 'Notulen Kegiatan');
      }
      if (jurnal.dokumentasi) {
        const fotos = jurnal.dokumentasi.split(' || ');
        for (let i = 0; i < fotos.length; i++) {
          await drawAttachment(doc, fotos[i], `Dokumentasi Foto ${i + 1}`);
        }
      }

      doc.save(`Laporan_MGMP_${jurnal.namaGuru}_${jurnal.tanggal}.pdf`);
      Swal.close();
    } catch (error: any) {
      Swal.fire('Error', 'Gagal membuat PDF: ' + error.message, 'error');
    }
  };
  // Filter logic
  const filtered = data.filter(d => {
    const matchGuru = !filterGuru || d.namaGuru.toLowerCase().includes(filterGuru.toLowerCase());
    const matchBulan = !filterBulan || d.tanggal.startsWith(filterBulan);
    return matchGuru && matchBulan;
  });

  const formatDate = (str: string) => {
    if (!str) return '-';
    try {
      return new Date(str).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch { return str; }
  };

  return (
    <div style={{ padding: '20px 0', fontFamily: 'sans-serif' }}>
      {/* Filters & Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Cari nama guru..."
          value={filterGuru}
          onChange={e => setFilterGuru(e.target.value)}
          style={{ padding: '8px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', minWidth: '200px' }}
        />
        <input
          type="month"
          value={filterBulan}
          onChange={e => setFilterBulan(e.target.value)}
          style={{ padding: '8px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px' }}
        />
        {(filterGuru || filterBulan) && (
          <button onClick={() => { setFilterGuru(''); setFilterBulan(''); }} style={{ padding: '8px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#f8fafc', cursor: 'pointer', fontSize: '14px' }}>
            <i className="fas fa-times" style={{ marginRight: '6px' }}></i> Reset Filter
          </button>
        )}
        </div>
        <button
          onClick={() => { resetForm(); setShowModal(true); }}
          style={{ padding: '10px 20px', background: '#0ea5e9', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <i className="fas fa-plus"></i> Tambah Jurnal MGMP
        </button>
      </div>

      {/* Table */}
      <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>
            <i className="fas fa-spinner fa-spin" style={{ fontSize: '32px', marginBottom: '12px' }}></i>
            <p>Memuat data...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>
            <i className="fas fa-file-alt" style={{ fontSize: '48px', marginBottom: '16px' }}></i>
            <p>Belum ada data jurnal MGMP.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '14px 16px', textAlign: 'left', color: '#475569', fontSize: '13px', fontWeight: 600 }}>No</th>
                  <th style={{ padding: '14px 16px', textAlign: 'left', color: '#475569', fontSize: '13px', fontWeight: 600 }}>Tanggal</th>
                  <th style={{ padding: '14px 16px', textAlign: 'left', color: '#475569', fontSize: '13px', fontWeight: 600 }}>Nama Guru</th>
                  <th style={{ padding: '14px 16px', textAlign: 'left', color: '#475569', fontSize: '13px', fontWeight: 600 }}>Bidang Studi</th>
                  <th style={{ padding: '14px 16px', textAlign: 'left', color: '#475569', fontSize: '13px', fontWeight: 600 }}>Nama Kegiatan</th>
                  <th style={{ padding: '14px 16px', textAlign: 'left', color: '#475569', fontSize: '13px', fontWeight: 600 }}>Tempat</th>
                  <th style={{ padding: '14px 16px', textAlign: 'left', color: '#475569', fontSize: '13px', fontWeight: 600 }}>Penyelenggara</th>
                  <th style={{ padding: '14px 16px', textAlign: 'center', color: '#475569', fontSize: '13px', fontWeight: 600 }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item, idx) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'white')}
                  >
                    <td style={{ padding: '14px 16px', color: '#94a3b8', fontSize: '13px' }}>{idx + 1}</td>
                    <td style={{ padding: '14px 16px', color: '#475569', fontSize: '13px', whiteSpace: 'nowrap' }}>{formatDate(item.tanggal)}</td>
                    <td style={{ padding: '14px 16px', fontWeight: 600, color: '#1e293b', fontSize: '14px' }}>{item.namaGuru}</td>
                    <td style={{ padding: '14px 16px', color: '#475569', fontSize: '13px' }}>{item.bidangStudi || '-'}</td>
                    <td style={{ padding: '14px 16px', color: '#334155', fontSize: '13px' }}>{item.namaKegiatan}</td>
                    <td style={{ padding: '14px 16px', color: '#475569', fontSize: '13px' }}>{item.tempat || '-'}</td>
                    <td style={{ padding: '14px 16px', color: '#475569', fontSize: '13px' }}>{item.penyelenggara || '-'}</td>
                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <button onClick={() => setSelectedDetail(item)} style={{ padding: '6px 12px', background: '#0ea5e9', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>
                          <i className="fas fa-eye" style={{ marginRight: '4px' }}></i> Detail
                        </button>
                        <button onClick={() => handleDownloadPDF(item)} style={{ padding: '6px 12px', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>
                          <i className="fas fa-file-pdf" style={{ marginRight: '4px' }}></i> PDF
                        </button>
                        <button onClick={() => handleEdit(item)} style={{ padding: '6px 12px', background: '#f59e0b', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>
                          <i className="fas fa-edit"></i>
                        </button>
                        <button onClick={() => handleDelete(item.id)} style={{ padding: '6px 12px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>
                          <i className="fas fa-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflowY: 'auto', padding: '24px' }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '28px', width: '100%', maxWidth: '700px', margin: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>
                <i className={`fas ${editId ? 'fa-edit' : 'fa-plus-circle'}`} style={{ marginRight: '8px', color: '#0ea5e9' }}></i>
                {editId ? 'Edit Jurnal MGMP' : 'Tambah Jurnal MGMP'}
              </h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: '#94a3b8' }}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                {/* Nama Guru */}
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                    Nama Guru <span style={{ color: 'red' }}>*</span>
                  </label>
                  <input
                    list="guru-list"
                    value={form.namaGuru}
                    onChange={e => setForm(f => ({ ...f, namaGuru: e.target.value }))}
                    placeholder="Cari atau ketik nama guru..."
                    required
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
                  />
                  <datalist id="guru-list">
                    {gurus.map((g, i) => <option key={i} value={g.nama} />)}
                  </datalist>
                </div>

                {/* Bidang Studi */}
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>Bidang Studi</label>
                  <input
                    type="text"
                    value={form.bidangStudi}
                    onChange={e => setForm(f => ({ ...f, bidangStudi: e.target.value }))}
                    placeholder="Contoh: Matematika"
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
                  />
                </div>

                {/* Nama Kegiatan */}
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                    Nama Kegiatan <span style={{ color: 'red' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={form.namaKegiatan}
                    onChange={e => setForm(f => ({ ...f, namaKegiatan: e.target.value }))}
                    placeholder="Contoh: Workshop Pengembangan Silabus"
                    required
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
                  />
                </div>

                {/* Tanggal */}
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                    Tanggal <span style={{ color: 'red' }}>*</span>
                  </label>
                  <input
                    type="date"
                    value={form.tanggal}
                    onChange={e => setForm(f => ({ ...f, tanggal: e.target.value }))}
                    required
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
                  />
                </div>

                {/* Tempat */}
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>Tempat</label>
                  <input
                    type="text"
                    value={form.tempat}
                    onChange={e => setForm(f => ({ ...f, tempat: e.target.value }))}
                    placeholder="Contoh: Aula SMA Negeri 1"
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
                  />
                </div>

                {/* Penyelenggara */}
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>Penyelenggara</label>
                  <input
                    type="text"
                    value={form.penyelenggara}
                    onChange={e => setForm(f => ({ ...f, penyelenggara: e.target.value }))}
                    placeholder="Contoh: MGMP Matematika Kota Malang"
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
                  />
                </div>

                {/* Agenda */}
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>Agenda</label>
                  <textarea
                    value={form.agenda}
                    onChange={e => setForm(f => ({ ...f, agenda: e.target.value }))}
                    placeholder="Tuliskan agenda atau topik kegiatan..."
                    rows={3}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box', resize: 'vertical' }}
                  />
                </div>

                {/* Surat Tugas Upload */}
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                    <i className="fas fa-file-alt" style={{ marginRight: '6px', color: '#6366f1' }}></i>
                    Upload Surat Tugas (file/foto) {editId && <span style={{ color: '#ef4444', fontWeight: 'normal' }}>(Opsional, biarkan kosong jika tidak diubah)</span>}
                  </label>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    ref={suratTugasRef}
                    onChange={e => setSuratTugasFile(e.target.files?.[0] || null)}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box', background: '#f8fafc' }}
                  />
                  {suratTugasFile && (
                    <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#10b981' }}>
                      <i className="fas fa-check-circle" style={{ marginRight: '4px' }}></i>
                      {suratTugasFile.name}
                    </p>
                  )}
                </div>

                {/* Dokumentasi Upload */}
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                    <i className="fas fa-images" style={{ marginRight: '6px', color: '#f59e0b' }}></i>
                    Upload Foto Dokumentasi (bisa lebih dari 1) {editId && <span style={{ color: '#ef4444', fontWeight: 'normal' }}>(Opsional, biarkan kosong jika tidak diubah)</span>}
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    ref={dokumentasiRef}
                    onChange={e => setDokumentasiFiles(Array.from(e.target.files || []))}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box', background: '#f8fafc' }}
                  />
                  {dokumentasiFiles.length > 0 && (
                    <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#10b981' }}>
                      <i className="fas fa-check-circle" style={{ marginRight: '4px' }}></i>
                      {dokumentasiFiles.length} foto dipilih
                    </p>
                  )}
                </div>

                {/* Daftar Hadir Upload */}
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                    <i className="fas fa-users" style={{ marginRight: '6px', color: '#10b981' }}></i>
                    Upload Daftar Hadir (file/foto) {editId && <span style={{ color: '#ef4444', fontWeight: 'normal' }}>(Opsional, biarkan kosong jika tidak diubah)</span>}
                  </label>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    ref={daftarHadirRef}
                    onChange={e => setDaftarHadirFile(e.target.files?.[0] || null)}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box', background: '#f8fafc' }}
                  />
                  {daftarHadirFile && (
                    <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#10b981' }}>
                      <i className="fas fa-check-circle" style={{ marginRight: '4px' }}></i>
                      {daftarHadirFile.name}
                    </p>
                  )}
                </div>

                {/* Notulen Upload */}
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                    <i className="fas fa-file-word" style={{ marginRight: '6px', color: '#0ea5e9' }}></i>
                    Upload Notulen Kegiatan (PDF/Word/Foto) {editId && <span style={{ color: '#ef4444', fontWeight: 'normal' }}>(Opsional, biarkan kosong jika tidak diubah)</span>}
                  </label>
                  <input
                    type="file"
                    accept="image/*,.pdf,.doc,.docx"
                    ref={notulenRef}
                    onChange={e => setNotulenFile(e.target.files?.[0] || null)}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box', background: '#f8fafc' }}
                  />
                  {notulenFile && (
                    <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#10b981' }}>
                      <i className="fas fa-check-circle" style={{ marginRight: '4px' }}></i>
                      {notulenFile.name}
                    </p>
                  )}
                </div>
              </div>

              {uploadProgress && (
                <div style={{ marginBottom: '16px', padding: '12px', background: '#eff6ff', borderRadius: '8px', color: '#1d4ed8', fontSize: '14px' }}>
                  <i className="fas fa-spinner fa-spin" style={{ marginRight: '8px' }}></i>
                  {uploadProgress}
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowModal(false)} disabled={submitting}
                  style={{ padding: '10px 20px', border: '1px solid #cbd5e1', borderRadius: '8px', background: 'white', cursor: 'pointer', color: '#475569' }}>
                  Batal
                </button>
                <button type="submit" disabled={submitting}
                  style={{ padding: '10px 24px', background: submitting ? '#94a3b8' : '#0ea5e9', color: 'white', border: 'none', borderRadius: '8px', cursor: submitting ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>
                  {submitting ? <><i className="fas fa-spinner fa-spin" style={{ marginRight: '8px' }}></i>Menyimpan...</> : <><i className="fas fa-save" style={{ marginRight: '8px' }}></i>Simpan</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedDetail && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflowY: 'auto', padding: '24px' }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '28px', width: '100%', maxWidth: '720px', margin: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>
                <i className="fas fa-file-alt" style={{ marginRight: '8px', color: '#0ea5e9' }}></i>
                Detail Jurnal MGMP
              </h2>
              <button onClick={() => setSelectedDetail(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: '#94a3b8' }}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
              {[
                { label: 'Nama Guru', value: selectedDetail.namaGuru },
                { label: 'Bidang Studi', value: selectedDetail.bidangStudi || '-' },
                { label: 'Nama Kegiatan', value: selectedDetail.namaKegiatan, full: true },
                { label: 'Tanggal', value: formatDate(selectedDetail.tanggal) },
                { label: 'Tempat', value: selectedDetail.tempat || '-' },
                { label: 'Penyelenggara', value: selectedDetail.penyelenggara || '-', full: true },
              ].map((f, i) => (
                <div key={i} style={f.full ? { gridColumn: '1 / -1' } : {}}>
                  <p style={{ fontSize: '12px', color: '#94a3b8', margin: '0 0 4px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{f.label}</p>
                  <p style={{ fontSize: '15px', color: '#1e293b', margin: 0, fontWeight: f.label === 'Nama Guru' || f.label === 'Nama Kegiatan' ? 700 : 400 }}>{f.value}</p>
                </div>
              ))}

              {selectedDetail.agenda && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <p style={{ fontSize: '12px', color: '#94a3b8', margin: '0 0 4px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Agenda</p>
                  <p style={{ fontSize: '14px', color: '#334155', margin: 0, whiteSpace: 'pre-wrap', background: '#f8fafc', padding: '12px', borderRadius: '8px' }}>{selectedDetail.agenda}</p>
                </div>
              )}

              {selectedDetail.daftarHadir && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <p style={{ fontSize: '12px', color: '#94a3b8', margin: '0 0 8px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Daftar Hadir</p>
                  <a href={selectedDetail.daftarHadir} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: '#10b981', color: 'white', borderRadius: '8px', textDecoration: 'none', fontSize: '14px' }}>
                    <i className="fas fa-external-link-alt"></i> Buka Daftar Hadir
                  </a>
                </div>
              )}

              {selectedDetail.notulen && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <p style={{ fontSize: '12px', color: '#94a3b8', margin: '0 0 8px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Notulen Kegiatan</p>
                  <a href={selectedDetail.notulen} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: '#0ea5e9', color: 'white', borderRadius: '8px', textDecoration: 'none', fontSize: '14px' }}>
                    <i className="fas fa-external-link-alt"></i> Buka Notulen
                  </a>
                </div>
              )}

              {selectedDetail.suratTugas && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <p style={{ fontSize: '12px', color: '#94a3b8', margin: '0 0 8px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Surat Tugas</p>
                  <a href={selectedDetail.suratTugas} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: '#6366f1', color: 'white', borderRadius: '8px', textDecoration: 'none', fontSize: '14px' }}>
                    <i className="fas fa-external-link-alt"></i> Buka Surat Tugas
                  </a>
                </div>
              )}

              {selectedDetail.dokumentasi && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <p style={{ fontSize: '12px', color: '#94a3b8', margin: '0 0 12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Foto Dokumentasi ({selectedDetail.dokumentasi.split(' || ').filter(Boolean).length} foto)
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px' }}>
                    {selectedDetail.dokumentasi.split(' || ').filter(Boolean).map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                        <img
                          src={getProxiedUrl(url)}
                          alt={`Dokumentasi ${i + 1}`}
                          style={{ width: '100%', height: '120px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                          onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.png'; }}
                        />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setSelectedDetail(null)}
                style={{ padding: '10px 24px', border: '1px solid #cbd5e1', borderRadius: '8px', background: 'white', cursor: 'pointer', color: '#475569' }}>
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
