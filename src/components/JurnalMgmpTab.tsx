'use client';
import { useState, useEffect, useRef } from 'react';
import Swal from 'sweetalert2';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import InlineLoading from '@/components/InlineLoading';
import styles from '@/app/jurnal-kegiatan/JurnalKegiatan.module.css';

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
  const [filterSearch, setFilterSearch] = useState('');
  const [filterMapel, setFilterMapel] = useState('');
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
    const maxHeight = 297 - 40;
    
    let finalWidth = imgData.width;
    let finalHeight = imgData.height;
    
    if (finalWidth > maxWidth) {
      const ratio = maxWidth / finalWidth;
      finalWidth = maxWidth;
      finalHeight = finalHeight * ratio;
    }
    
    if (finalHeight > maxHeight) {
      const ratio = maxHeight / finalHeight;
      finalHeight = maxHeight;
      finalWidth = finalWidth * ratio;
    }
    
    const x = (210 - finalWidth) / 2;
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

  const formatDate = (str: string) => {
    if (!str) return '-';
    try {
      return new Date(str).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch { return str; }
  };

  // Dynamic mapel list
  const mapelList = Array.from(new Set(data.map(d => d.bidangStudi).filter(Boolean))).sort();

  // Filter logic
  const filtered = data.filter(d => {
    const q = filterSearch.toLowerCase().trim();
    const matchSearch = !q || 
      (d.namaGuru || '').toLowerCase().includes(q) ||
      (d.namaKegiatan || '').toLowerCase().includes(q) ||
      (d.tempat || '').toLowerCase().includes(q) ||
      (d.penyelenggara || '').toLowerCase().includes(q);

    const matchMapel = !filterMapel || (d.bidangStudi || '').toLowerCase() === filterMapel.toLowerCase();
    const matchBulan = !filterBulan || (d.tanggal || '').startsWith(filterBulan);
    return matchSearch && matchMapel && matchBulan;
  });

  return (
    <div style={{ marginTop: '20px' }}>
      {/* Header & Filter Bar */}
      <div style={{ 
        background: '#f8fafc', 
        padding: '16px 20px', 
        borderRadius: '12px', 
        border: '1px solid #e2e8f0', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        flexWrap: 'wrap', 
        gap: '12px',
        marginBottom: '20px' 
      }}>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <i className="fas fa-search" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '0.85rem' }}></i>
            <input
              type="text"
              placeholder="Cari guru, kegiatan, tempat..."
              value={filterSearch}
              onChange={e => setFilterSearch(e.target.value)}
              style={{ padding: '8px 12px 8px 34px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.85rem', minWidth: '220px', background: 'white' }}
            />
          </div>

          <select
            value={filterMapel}
            onChange={e => setFilterMapel(e.target.value)}
            style={{ padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.85rem', background: 'white', color: '#334155' }}
          >
            <option value="">Semua Bidang Studi</option>
            {mapelList.map((m, i) => (
              <option key={i} value={m}>{m}</option>
            ))}
          </select>

          <input
            type="month"
            value={filterBulan}
            onChange={e => setFilterBulan(e.target.value)}
            style={{ padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.85rem', background: 'white', color: '#334155' }}
          />

          {(filterSearch || filterMapel || filterBulan) && (
            <button 
              type="button" 
              onClick={() => { setFilterSearch(''); setFilterMapel(''); setFilterBulan(''); }}
              style={{ padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', background: 'white', cursor: 'pointer', fontSize: '0.85rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <i className="fas fa-times"></i> Reset Filter
            </button>
          )}
        </div>

        <button
          onClick={() => { resetForm(); setShowModal(true); }}
          className={styles.btnPrimary}
        >
          <i className="fas fa-plus"></i> Tambah Jurnal MGMP
        </button>
      </div>

      {/* Table Container */}
      <div className={styles.tableContainer} style={{ border: '1px solid #e2e8f0', borderRadius: '12px' }}>
        {loading ? (
          <div style={{ padding: '40px 0' }}>
            <InlineLoading message="Memuat data Jurnal MGMP..." />
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
            <i className="fas fa-file-alt" style={{ fontSize: '48px', marginBottom: '16px', color: '#cbd5e1' }}></i>
            <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: 500, color: '#64748b' }}>
              {data.length === 0 ? 'Belum ada data jurnal MGMP.' : 'Tidak ada data jurnal MGMP yang sesuai dengan filter.'}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className={styles.table} style={{ width: '100%', minWidth: '960px' }}>
              <thead>
                <tr>
                  <th style={{ width: '45px', textAlign: 'center' }}>No</th>
                  <th style={{ width: '115px' }}>Tanggal</th>
                  <th style={{ width: '200px' }}>Guru & Mapel</th>
                  <th>Kegiatan & Agenda</th>
                  <th style={{ width: '190px' }}>Tempat & Penyelenggara</th>
                  <th style={{ width: '130px' }}>Lampiran</th>
                  <th style={{ width: '185px', textAlign: 'center' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item, idx) => (
                  <tr key={item.id}>
                    <td style={{ textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>{idx + 1}</td>
                    <td style={{ fontSize: '0.85rem', color: '#475569', whiteSpace: 'nowrap' }}>
                      <div style={{ fontWeight: 600, color: '#1e293b' }}>
                        {formatDate(item.tanggal)}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.9rem' }}>
                        {item.namaGuru}
                      </div>
                      {item.bidangStudi && (
                        <span style={{ 
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          gap: '4px', 
                          padding: '2px 8px', 
                          background: '#f1f5f9', 
                          color: '#475569', 
                          borderRadius: '4px', 
                          fontSize: '0.75rem', 
                          fontWeight: 500,
                          marginTop: '4px' 
                        }}>
                          <i className="fas fa-book" style={{ fontSize: '0.7rem', color: '#94a3b8' }}></i>
                          {item.bidangStudi}
                        </span>
                      )}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.9rem', marginBottom: item.agenda ? '4px' : '0' }}>
                        {item.namaKegiatan}
                      </div>
                      {item.agenda && (
                        <div style={{ fontSize: '0.8rem', color: '#64748b', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }} title={item.agenda}>
                          <i className="fas fa-info-circle" style={{ marginRight: '4px', color: '#94a3b8' }}></i>
                          {item.agenda}
                        </div>
                      )}
                    </td>
                    <td>
                      {item.tempat && (
                        <div style={{ fontSize: '0.85rem', color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <i className="fas fa-map-marker-alt" style={{ color: '#ef4444', fontSize: '0.8rem', flexShrink: 0 }}></i>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.tempat}</span>
                        </div>
                      )}
                      {item.penyelenggara && (
                        <div style={{ fontSize: '0.8rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px' }}>
                          <i className="fas fa-building" style={{ color: '#94a3b8', fontSize: '0.75rem', flexShrink: 0 }}></i>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.penyelenggara}</span>
                        </div>
                      )}
                      {!item.tempat && !item.penyelenggara && (
                        <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>-</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {item.suratTugas && (
                          <a href={item.suratTugas} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: '#4f46e5', background: '#eef2ff', padding: '2px 6px', borderRadius: '4px', textDecoration: 'none', width: 'fit-content' }}>
                            <i className="fas fa-file-alt"></i> Tugas
                          </a>
                        )}
                        {item.daftarHadir && (
                          <a href={item.daftarHadir} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: '#059669', background: '#ecfdf5', padding: '2px 6px', borderRadius: '4px', textDecoration: 'none', width: 'fit-content' }}>
                            <i className="fas fa-users"></i> Hadir
                          </a>
                        )}
                        {item.notulen && (
                          <a href={item.notulen} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: '#0284c7', background: '#f0f9ff', padding: '2px 6px', borderRadius: '4px', textDecoration: 'none', width: 'fit-content' }}>
                            <i className="fas fa-file-word"></i> Notulen
                          </a>
                        )}
                        {item.dokumentasi && (
                          <button onClick={() => setSelectedDetail(item)} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: '#d97706', background: '#fffbeb', padding: '2px 6px', borderRadius: '4px', border: '1px solid #fef3c7', cursor: 'pointer', width: 'fit-content' }}>
                            <i className="fas fa-images"></i> {item.dokumentasi.split(' || ').filter(Boolean).length} Foto
                          </button>
                        )}
                        {!item.suratTugas && !item.daftarHadir && !item.notulen && !item.dokumentasi && (
                          <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>-</span>
                        )}
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '5px', justifyContent: 'center', alignItems: 'center' }}>
                        <button 
                          type="button"
                          className="btn btn-sm" 
                          style={{ background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', padding: '4px 7px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                          onClick={() => setSelectedDetail(item)} 
                          title="Lihat Detail"
                        >
                          <i className="fas fa-eye"></i> Detail
                        </button>
                        <button 
                          type="button"
                          className="btn btn-sm" 
                          style={{ background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', padding: '4px 7px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                          onClick={() => handleDownloadPDF(item)} 
                          title="Cetak PDF Lengkap"
                        >
                          <i className="fas fa-file-pdf"></i> PDF
                        </button>
                        <button 
                          type="button"
                          className="btn btn-sm" 
                          style={{ background: '#fef3c7', color: '#d97706', border: '1px solid #fde68a', padding: '4px 7px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem' }}
                          onClick={() => handleEdit(item)} 
                          title="Edit"
                        >
                          <i className="fas fa-edit"></i>
                        </button>
                        <button 
                          type="button"
                          className="btn btn-sm" 
                          style={{ background: '#fee2e2', color: '#ef4444', border: '1px solid #fca5a5', padding: '4px 7px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem' }}
                          onClick={() => handleDelete(item.id)} 
                          title="Hapus"
                        >
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

      {/* Add / Edit Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflowY: 'auto', padding: '24px' }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '28px', width: '100%', maxWidth: '700px', margin: 'auto', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#1e293b', margin: 0 }}>
                <i className={`fas ${editId ? 'fa-edit' : 'fa-plus-circle'}`} style={{ marginRight: '8px', color: '#10b981' }}></i>
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

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '16px' }}>
                <button type="button" onClick={() => setShowModal(false)} disabled={submitting}
                  style={{ padding: '10px 20px', border: '1px solid #cbd5e1', borderRadius: '8px', background: 'white', cursor: 'pointer', color: '#475569', fontWeight: 600 }}>
                  Batal
                </button>
                <button type="submit" disabled={submitting} className={styles.btnPrimary} style={{ minWidth: '120px', justifyContent: 'center' }}>
                  {submitting ? <><i className="fas fa-spinner fa-spin"></i> Menyimpan...</> : <><i className="fas fa-save"></i> Simpan</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedDetail && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflowY: 'auto', padding: '24px' }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '28px', width: '100%', maxWidth: '720px', margin: 'auto', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#1e293b', margin: 0 }}>
                <i className="fas fa-file-alt" style={{ marginRight: '8px', color: '#10b981' }}></i>
                Detail Jurnal MGMP
              </h2>
              <button onClick={() => setSelectedDetail(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: '#94a3b8' }}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
              <div>
                <p style={{ fontSize: '12px', color: '#94a3b8', margin: '0 0 4px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Nama Guru</p>
                <p style={{ fontSize: '15px', color: '#1e293b', margin: 0, fontWeight: 700 }}>{selectedDetail.namaGuru}</p>
              </div>

              <div>
                <p style={{ fontSize: '12px', color: '#94a3b8', margin: '0 0 4px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Bidang Studi</p>
                <p style={{ fontSize: '15px', color: '#1e293b', margin: 0 }}>{selectedDetail.bidangStudi || '-'}</p>
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <p style={{ fontSize: '12px', color: '#94a3b8', margin: '0 0 4px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Nama Kegiatan</p>
                <p style={{ fontSize: '15px', color: '#1e293b', margin: 0, fontWeight: 600 }}>{selectedDetail.namaKegiatan}</p>
              </div>

              <div>
                <p style={{ fontSize: '12px', color: '#94a3b8', margin: '0 0 4px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Tanggal</p>
                <p style={{ fontSize: '15px', color: '#1e293b', margin: 0 }}>{formatDate(selectedDetail.tanggal)}</p>
              </div>

              <div>
                <p style={{ fontSize: '12px', color: '#94a3b8', margin: '0 0 4px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Tempat</p>
                <p style={{ fontSize: '15px', color: '#1e293b', margin: 0 }}>{selectedDetail.tempat || '-'}</p>
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <p style={{ fontSize: '12px', color: '#94a3b8', margin: '0 0 4px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Penyelenggara</p>
                <p style={{ fontSize: '15px', color: '#1e293b', margin: 0 }}>{selectedDetail.penyelenggara || '-'}</p>
              </div>

              {selectedDetail.agenda && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <p style={{ fontSize: '12px', color: '#94a3b8', margin: '0 0 4px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Agenda</p>
                  <p style={{ fontSize: '14px', color: '#334155', margin: 0, whiteSpace: 'pre-wrap', background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>{selectedDetail.agenda}</p>
                </div>
              )}

              {/* Lampiran Dokumen Buttons */}
              <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '8px' }}>
                {selectedDetail.suratTugas && (
                  <a href={selectedDetail.suratTugas} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 14px', background: '#eef2ff', color: '#4f46e5', border: '1px solid #c7d2fe', borderRadius: '8px', textDecoration: 'none', fontSize: '13px', fontWeight: 600 }}>
                    <i className="fas fa-file-alt"></i> Buka Surat Tugas
                  </a>
                )}
                {selectedDetail.daftarHadir && (
                  <a href={selectedDetail.daftarHadir} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 14px', background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', borderRadius: '8px', textDecoration: 'none', fontSize: '13px', fontWeight: 600 }}>
                    <i className="fas fa-users"></i> Buka Daftar Hadir
                  </a>
                )}
                {selectedDetail.notulen && (
                  <a href={selectedDetail.notulen} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 14px', background: '#f0f9ff', color: '#0284c7', border: '1px solid #bae6fd', borderRadius: '8px', textDecoration: 'none', fontSize: '13px', fontWeight: 600 }}>
                    <i className="fas fa-file-word"></i> Buka Notulen
                  </a>
                )}
              </div>

              {selectedDetail.dokumentasi && (
                <div style={{ gridColumn: '1 / -1', marginTop: '8px' }}>
                  <p style={{ fontSize: '12px', color: '#94a3b8', margin: '0 0 10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Foto Dokumentasi ({selectedDetail.dokumentasi.split(' || ').filter(Boolean).length} foto)
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '12px' }}>
                    {selectedDetail.dokumentasi.split(' || ').filter(Boolean).map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                        <img
                          src={getProxiedUrl(url)}
                          alt={`Dokumentasi ${i + 1}`}
                          style={{ width: '100%', height: '110px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #e2e8f0', transition: 'transform 0.2s' }}
                          onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.png'; }}
                        />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
              <button 
                type="button" 
                onClick={() => handleDownloadPDF(selectedDetail)}
                className="btn btn-sm"
                style={{ background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <i className="fas fa-file-pdf"></i> Unduh PDF Laporan
              </button>
              <button onClick={() => setSelectedDetail(null)}
                style={{ padding: '8px 20px', border: '1px solid #cbd5e1', borderRadius: '8px', background: 'white', cursor: 'pointer', color: '#475569', fontWeight: 600, fontSize: '13px' }}>
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
