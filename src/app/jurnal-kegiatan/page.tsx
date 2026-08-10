'use client';
import { useState, useEffect } from 'react';
import styles from './JurnalKegiatan.module.css';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, BorderStyle, WidthType, AlignmentType, HeadingLevel, ImageRun } from 'docx';
import { saveAs } from 'file-saver';
import Swal from 'sweetalert2';

const compressImage = async (file: File): Promise<File> => {
  if (!file.type.startsWith('image/')) return file;
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1200;
        const MAX_HEIGHT = 1200;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height = Math.round((height *= MAX_WIDTH / width));
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = Math.round((width *= MAX_HEIGHT / height));
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob((blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            } else {
              resolve(file);
            }
          }, 'image/jpeg', 0.7);
        } else {
          resolve(file);
        }
      };
      img.onerror = () => resolve(file);
    };
    reader.onerror = () => resolve(file);
  });
};

export default function JurnalKegiatanPage() {
  const [activeTab, setActiveTab] = useState<'notulen' | 'lpj' | 'jurnal-staf'>('notulen');
  const [jurnalStafSubTab, setJurnalStafSubTab] = useState<'isi' | 'rekap'>('isi');
  const [jurnalStafData, setJurnalStafData] = useState<any[]>([]);
  const [savingJurnalStaf, setSavingJurnalStaf] = useState(false);
  const [jurnalStafForm, setJurnalStafForm] = useState({
    namaStaf: '', kegiatan: '', tanggal: new Date().toISOString().split('T')[0], mulaiDari: '', sampaiDengan: '', keterangan: ''
  });
  const [jurnalStafFile, setJurnalStafFile] = useState<File | null>(null);
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterName, setFilterName] = useState('');
  const [notulens, setNotulens] = useState<any[]>([]);
  const [lpjList, setLpjList] = useState<any[]>([]);
  const [gurus, setGurus] = useState<any[]>([]);

  // States for LPJ Modal
  const [showLpjModal, setShowLpjModal] = useState(false);
  const [savingLpj, setSavingLpj] = useState(false);
  const [lpjForm, setLpjForm] = useState({
    tanggal: new Date().toISOString().split('T')[0],
    namaKegiatan: '',
    pjKegiatan: ''
  });
  const [lpjFile, setLpjFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(1);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadTarget, setUploadTarget] = useState<any>(null);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);

  const [formData, setFormData] = useState({
    tanggal: new Date().toISOString().split('T')[0],
    waktu: '',
    tempatRapat: '',
    agendaRapat: '',
    pimpinanRapat: '',
    notulis: '',
    hasilNotulen: '',
    dokumentasi: ''
  });

  const [selectedPeserta, setSelectedPeserta] = useState<string[]>([]);
  const [selectAllPeserta, setSelectAllPeserta] = useState(false);
  const [searchPeserta, setSearchPeserta] = useState('');
  const [dokumentasiFiles, setDokumentasiFiles] = useState<File[]>([]);

  useEffect(() => {
    fetchData();
    fetchGuru();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resNotulen, resLpj, resJurnalStaf] = await Promise.all([
        fetch('/api/notulen'),
        fetch('/api/lpj-kegiatan'),
        fetch('/api/jurnal-staf')
      ]);
      const jsonNotulen = await resNotulen.json();
      const jsonLpj = await resLpj.json();
      const jsonJurnalStaf = await resJurnalStaf.json();
      if (jsonNotulen.success) setNotulens(jsonNotulen.data);
      if (jsonLpj.success) setLpjList(jsonLpj.data);
      if (jsonJurnalStaf.success) setJurnalStafData(jsonJurnalStaf.data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleLpjSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lpjFile) {
      Swal.fire({ icon: 'warning', title: 'Perhatian', text: 'File LPJ wajib diupload' });
      return;
    }
    setSavingLpj(true);
    
    try {
      const payload = new FormData();
      payload.append('tanggal', lpjForm.tanggal);
      payload.append('namaKegiatan', lpjForm.namaKegiatan);
      payload.append('pjKegiatan', lpjForm.pjKegiatan);
      payload.append('file', lpjFile);
      
      const res = await fetch('/api/lpj-kegiatan', {
        method: 'POST',
        body: payload
      });
      
      const json = await res.json();
      if (json.success) {
        setShowLpjModal(false);
        setLpjForm({
          tanggal: new Date().toISOString().split('T')[0],
          namaKegiatan: '',
          pjKegiatan: ''
        });
        setLpjFile(null);
        fetchData(); // refresh data
      } else {
        Swal.fire({ icon: 'error', title: 'Gagal', text: 'Gagal menyimpan LPJ: ' + json.error });
      }
    } catch (e) {
      Swal.fire({ icon: 'error', title: 'Kesalahan', text: 'Terjadi kesalahan saat menyimpan LPJ' });
    }
    setSavingLpj(false);
  };

  const handleJurnalStafSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jurnalStafForm.namaStaf || !jurnalStafForm.kegiatan) {
      Swal.fire({ icon: 'warning', title: 'Perhatian', text: 'Nama dan Kegiatan wajib diisi' });
      return;
    }
    
    setSavingJurnalStaf(true);
    try {
      let fotoUrl = '';
      if (jurnalStafFile) {
        const compressed = await compressImage(jurnalStafFile);
        const formFile = new FormData();
        formFile.append('file', compressed);
        const upRes = await fetch('/api/jurnal-staf/upload', { method: 'POST', body: formFile });
        const upJson = await upRes.json();
        if (upJson.success) {
          fotoUrl = upJson.link;
        } else {
          Swal.fire({ icon: 'error', title: 'Gagal', text: 'Gagal mengupload foto jurnal staf' });
          setSavingJurnalStaf(false);
          return;
        }
      }

      const res = await fetch('/api/jurnal-staf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...jurnalStafForm, fotoKegiatan: fotoUrl })
      });
      const json = await res.json();
      if (json.success) {
        Swal.fire({ icon: 'success', title: 'Berhasil!', text: 'Jurnal Kegiatan berhasil disimpan!' });
        setJurnalStafForm({ ...jurnalStafForm, kegiatan: '', mulaiDari: '', sampaiDengan: '', keterangan: '' });
        setJurnalStafFile(null);
        // Refresh data
        const jsRes = await fetch('/api/jurnal-staf');
        const jsJson = await jsRes.json();
        if (jsJson.success) setJurnalStafData(jsJson.data);
      } else {
        Swal.fire({ icon: 'error', title: 'Gagal', text: json.error || "Gagal menyimpan jurnal" });
      }
    } catch (error) {
      console.error(error);
      Swal.fire({ icon: 'error', title: 'Kesalahan', text: 'Terjadi kesalahan jaringan' });
    }
    setSavingJurnalStaf(false);
  };



  const fetchGuru = async () => {
    try {
      const res = await fetch('/api/guru');
      const json = await res.json();
      if (json.success) {
        setGurus(json.data.filter((g: any) => ['aktif'].includes(g.status?.toLowerCase().trim())));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCheckboxChange = (nama: string) => {
    if (selectedPeserta.includes(nama)) {
      setSelectedPeserta(selectedPeserta.filter(n => n !== nama));
    } else {
      setSelectedPeserta([...selectedPeserta, nama]);
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setSelectAllPeserta(checked);
    if (checked) {
      setSelectedPeserta(gurus.map(g => g.nama));
    } else {
      setSelectedPeserta([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      const payload = new FormData();
      payload.append('tanggal', formData.tanggal);
      payload.append('waktu', formData.waktu);
      payload.append('tempatRapat', formData.tempatRapat);
      payload.append('agendaRapat', formData.agendaRapat);
      payload.append('notulis', formData.notulis);
      payload.append('pimpinanRapat', formData.pimpinanRapat);
      payload.append('hasilNotulen', formData.hasilNotulen);
      
      const dihadiriOleh = selectAllPeserta ? 'Seluruh GTK' : selectedPeserta.join(' || ');
      payload.append('dihadiriOleh', dihadiriOleh);
      
      if (dokumentasiFiles.length > 0) {
        dokumentasiFiles.forEach(f => payload.append('dokumentasi', f));
      }
      payload.append('dokumentasiUrl', formData.dokumentasi);

      const res = await fetch('/api/notulen', {
        method: 'POST',
        body: payload
      });
      const json = await res.json();
      if (json.success) {
        setShowModal(false);
        setFormData({
          tanggal: new Date().toISOString().split('T')[0],
          waktu: '',
          tempatRapat: '',
          agendaRapat: '',
          pimpinanRapat: '',
          notulis: '',
          hasilNotulen: '',
          dokumentasi: ''
        });
        setSelectedPeserta([]);
        setSelectAllPeserta(false);
        setSearchPeserta('');
        setDokumentasiFiles([]);
        setStep(1);
        const fileInput = document.getElementById('dokumentasiFile') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
        fetchData();
      } else {
        Swal.fire({ icon: 'error', title: 'Gagal', text: 'Gagal menyimpan notulen: ' + json.error });
      }
    } catch (err: any) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.message });
    }
    setSaving(false);
  };

  const generateWord = async (n: any) => {
    // Buat map nama -> jabatan
    const guruMap: Record<string, string> = {};
    gurus.forEach((g: any) => { guruMap[g.nama] = g.jabatan || ''; });

    // Pisahkan peserta - gunakan separator ' || ' agar nama bergelar tidak terpotong
    const pesertaList: string[] = n.dihadiriOleh === 'Seluruh GTK'
      ? gurus.map((g: any) => g.nama)
      : n.dihadiriOleh.split(' || ').map((s: string) => s.trim()).filter(Boolean);

    const sz = 24; // 12pt dalam half-points
    const szCs = 24;

    const txt = (text: string, options: any = {}) => new TextRun({ text, size: sz, sizeComplexScript: szCs, ...options });
    const bold = (text: string) => new TextRun({ text, bold: true, size: sz, sizeComplexScript: szCs });
    const para = (children: any[], opts: any = {}) => new Paragraph({ children, ...opts });

    const noBorder = {
      top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      insideVertical: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    };

    const makeInfoRow = (label: string, value: string) => new TableRow({
      children: [
        new TableCell({ children: [para([bold(label)])], width: { size: 28, type: WidthType.PERCENTAGE } }),
        new TableCell({ children: [para([txt(':')])] , width: { size: 3, type: WidthType.PERCENTAGE } }),
        new TableCell({ children: [para([txt(value)])] }),
      ]
    });

    const pesertaRows = pesertaList.map((nama: string, idx: number) =>
      new TableRow({
        children: [
          new TableCell({ children: [para([txt(String(idx + 1))], { alignment: AlignmentType.CENTER })], width: { size: 8, type: WidthType.PERCENTAGE } }),
          new TableCell({ children: [para([txt(nama)])], width: { size: 42, type: WidthType.PERCENTAGE } }),
          new TableCell({ children: [para([txt(guruMap[nama] || '')])], width: { size: 25, type: WidthType.PERCENTAGE } }),
          new TableCell({ children: [para([txt('Hadir')])], width: { size: 25, type: WidthType.PERCENTAGE } }),
        ]
      })
    );

    // Ambil gambar kop
    const kopRes = await fetch('/kop_surat_mts.png');
    const kopBuffer = await kopRes.arrayBuffer();

    // Ambil foto dokumentasi jika ada link (bisa lebih dari satu, dipisahkan oleh ||)
    const fotoBuffers: ArrayBuffer[] = [];
    if (n.dokumentasi) {
      const urls = n.dokumentasi.split('||').map((u: string) => u.trim()).filter((u: string) => u.startsWith('http'));
      for (const url of urls) {
        try {
          const fotoRes = await fetch(`/api/proxy-image?url=${encodeURIComponent(url)}`);
          if (fotoRes.ok) {
            const buf = await fotoRes.arrayBuffer();
            fotoBuffers.push(buf);
          }
        } catch (e) { /* skip */ }
      }
    }

    const pageChildren: any[] = [
      // KOP GAMBAR
      new Paragraph({
        children: [
          new ImageRun({
            data: kopBuffer,
            transformation: { width: 600, height: 129 },
            type: 'png',
          })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 }
      }),

      // JUDUL
      para([bold('NOTULEN RAPAT')], { alignment: AlignmentType.CENTER, spacing: { before: 100, after: 80 } }),
      para([bold(n.agendaRapat.toUpperCase())], { alignment: AlignmentType.CENTER, spacing: { after: 300 } }),

      // TABEL INFO
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: noBorder,
        rows: [
          makeInfoRow('Hari / Tanggal', n.tanggal),
          makeInfoRow('Waktu', `${n.waktu} WIB`),
          makeInfoRow('Tempat', n.tempatRapat),
          makeInfoRow('Pimpinan Rapat', n.pimpinanRapat),
          makeInfoRow('Notulis', n.notulis),
        ]
      }),

      para([], { spacing: { before: 240, after: 80 } }),

      // I. DAFTAR HADIR
      para([bold('I.   DAFTAR HADIR')], { spacing: { after: 120 } }),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            tableHeader: true,
            children: [
              new TableCell({ children: [para([bold('No.')], { alignment: AlignmentType.CENTER })], width: { size: 8, type: WidthType.PERCENTAGE } }),
              new TableCell({ children: [para([bold('Nama')])], width: { size: 40, type: WidthType.PERCENTAGE } }),
              new TableCell({ children: [para([bold('Jabatan')])], width: { size: 27, type: WidthType.PERCENTAGE } }),
              new TableCell({ children: [para([bold('Keterangan')])], width: { size: 25, type: WidthType.PERCENTAGE } }),
            ]
          }),
          ...pesertaRows,
        ]
      }),

      para([], { spacing: { before: 300, after: 80 } }),

      // II. HASIL DAN KEPUTUSAN RAPAT
      para([bold('II.  HASIL DAN KEPUTUSAN RAPAT')], { spacing: { after: 200 }, pageBreakBefore: true }),
      ...n.hasilNotulen.split('\n').map((line: string) =>
        para([txt(line)], { spacing: { after: 120 } })
      ),

      para([], { spacing: { before: 400, after: 80 } }),

      // TANDA TANGAN - 3 kolom: kiri (Mengetahui), tengah kosong, kanan (Notulis)
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: noBorder,
        rows: [
          new TableRow({
            children: [
              new TableCell({
                width: { size: 40, type: WidthType.PERCENTAGE },
                children: [
                  para([bold('Mengetahui,')], { alignment: AlignmentType.CENTER }),
                  para([bold('Kepala Madrasah,')], { alignment: AlignmentType.CENTER }),
                  para([txt('')], { spacing: { before: 1200, after: 0 } }),
                  para([txt('Dwi Retno Palupi, M.Pd.')], { alignment: AlignmentType.CENTER }),
                ]
              }),
              new TableCell({
                width: { size: 20, type: WidthType.PERCENTAGE },
                children: [para([txt('')])]
              }),
              new TableCell({
                width: { size: 40, type: WidthType.PERCENTAGE },
                children: [
                  para([bold('Notulis,')], { alignment: AlignmentType.CENTER }),
                  para([txt('')], { alignment: AlignmentType.CENTER }), // blank para so it matches 2 lines on the left
                  para([txt('')], { spacing: { before: 1200, after: 0 } }),
                  para([txt(n.notulis)], { alignment: AlignmentType.CENTER }),
                ]
              }),
            ]
          })
        ]
      }),
    ];

    // Lampiran foto dokumentasi di halaman baru jika ada
    if (fotoBuffers.length > 0) {
      pageChildren.push(
        para([bold('DOKUMENTASI KEGIATAN')], { pageBreakBefore: true, alignment: AlignmentType.CENTER, spacing: { after: 200 } })
      );
      
      for (const buf of fotoBuffers) {
        pageChildren.push(
          new Paragraph({
            children: [
              new ImageRun({
                data: buf,
                transformation: { width: 450, height: 300 },
                type: 'jpg',
              })
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 }
          })
        );
      }
    }

    const doc = new Document({
      sections: [{
        properties: {
          page: {
            size: { width: 11906, height: 16838 },
            margin: { top: 1080, right: 1080, bottom: 1080, left: 1800 }
          }
        },
        children: pageChildren,
      }],
    });

    Packer.toBlob(doc).then((blob) => {
      saveAs(blob, `Notulen_${n.tanggal}_${n.agendaRapat.substring(0, 20)}.docx`);
    });
  };

  return (
    <div className={styles.container}>
      <div className={styles.header} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '16px' }}>
        <h1 className={styles.title}><i className="fas fa-book-open"></i> Jurnal & LPJ Kegiatan</h1>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              className={`btn ${activeTab === 'notulen' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveTab('notulen')}
            >
              <i className="fas fa-file-signature"></i> Notulen Rapat
            </button>
            <button 
              className={`btn ${activeTab === 'lpj' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveTab('lpj')}
            >
              <i className="fas fa-file-archive"></i> LPJ Kegiatan
            </button>
            <button 
              className={`btn ${activeTab === 'jurnal-staf' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveTab('jurnal-staf')}
            >
              <i className="fas fa-user-clock"></i> Jurnal Guru & Staf
            </button>
          </div>
          
          {activeTab === 'notulen' ? (
            <button className={styles.btnPrimary} onClick={() => setShowModal(true)}>
              <i className="fas fa-plus"></i> Buat Notulen
            </button>
          ) : (
            <button className={styles.btnPrimary} onClick={() => setShowLpjModal(true)}>
              <i className="fas fa-upload"></i> Tambah LPJ
            </button>
          )}
        </div>
      </div>

      <div className={styles.tableContainer}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
            <i className="fas fa-spinner fa-spin fa-2x"></i>
            <p>Memuat data {activeTab === 'notulen' ? 'notulen' : 'LPJ'}...</p>
          </div>
        ) : activeTab === 'notulen' ? (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Agenda</th>
                <th>Pimpinan</th>
                <th>Notulis</th>
                <th style={{ textAlign: 'center' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {notulens.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', color: '#64748b', padding: '24px' }}>
                    Belum ada data notulen.
                  </td>
                </tr>
              ) : (
                notulens.map((n, i) => (
                  <tr key={i}>
                    <td>{n.tanggal} <br/><span style={{ fontSize: '0.8rem', color: '#64748b' }}>{n.waktu}</span></td>
                    <td><strong>{n.agendaRapat}</strong><br/><span style={{ fontSize: '0.8rem', color: '#64748b' }}>{n.tempatRapat}</span></td>
                    <td>{n.pimpinanRapat}</td>
                    <td>{n.notulis}</td>
                    <td style={{ textAlign: 'center', display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => { setUploadTarget(n); setShowUploadModal(true); }} title="Lampirkan Foto Tambahan">
                        <i className="fas fa-camera"></i> Foto
                      </button>
                      <button className="btn btn-primary btn-sm" onClick={() => generateWord(n)} title="Download Word">
                        <i className="fas fa-file-word"></i> Word
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        ) : activeTab === 'lpj' ? (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Nama Kegiatan</th>
                <th>PJ Kegiatan</th>
                <th style={{ textAlign: 'center' }}>Arsip File</th>
              </tr>
            </thead>
            <tbody>
              {lpjList.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', color: '#64748b', padding: '24px' }}>
                    Belum ada data LPJ Kegiatan.
                  </td>
                </tr>
              ) : (
                lpjList.map((l, i) => (
                  <tr key={i}>
                    <td>{l.tanggal}</td>
                    <td style={{ fontWeight: 600 }}>{l.namaKegiatan}</td>
                    <td>{l.pjKegiatan}</td>
                    <td style={{ textAlign: 'center' }}>
                      {l.fileUpload ? (
                        <a href={l.fileUpload} target="_blank" rel="noopener noreferrer" className="btn btn-sm" style={{ background: '#dcfce7', color: '#16a34a' }}>
                          <i className="fas fa-external-link-alt"></i> Buka File
                        </a>
                      ) : (
                        <span style={{ color: '#ef4444' }}>Tidak ada file</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        ) : (
          <div className={styles.card}>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
              <button 
                onClick={() => setJurnalStafSubTab('isi')}
                style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: jurnalStafSubTab === 'isi' ? '#eff6ff' : 'transparent', color: jurnalStafSubTab === 'isi' ? '#3b82f6' : '#64748b', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
              >
                <i className="fas fa-pen" style={{ marginRight: '8px' }}></i> Isi Jurnal Kegiatan
              </button>
              <button 
                onClick={() => setJurnalStafSubTab('rekap')}
                style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: jurnalStafSubTab === 'rekap' ? '#eff6ff' : 'transparent', color: jurnalStafSubTab === 'rekap' ? '#3b82f6' : '#64748b', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
              >
                <i className="fas fa-table" style={{ marginRight: '8px' }}></i> Rekap Jurnal Kegiatan
              </button>
            </div>
            
            {jurnalStafSubTab === 'isi' ? (
              <form onSubmit={handleJurnalStafSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                  <div className={styles.formGroup} style={{ marginBottom: 0 }}>
                    <label>Nama Guru / Staf <span style={{ color: 'red' }}>*</span></label>
                    <input list="gurus-list" type="text" required placeholder="Ketik atau pilih nama"
                      value={jurnalStafForm.namaStaf} onChange={e => setJurnalStafForm({...jurnalStafForm, namaStaf: e.target.value})} />
                    <datalist id="gurus-list">
                      {gurus.map((g, i) => <option key={i} value={g.nama} />)}
                    </datalist>
                  </div>
                  <div className={styles.formGroup} style={{ marginBottom: 0 }}>
                    <label>Tanggal <span style={{ color: 'red' }}>*</span></label>
                    <input type="date" required
                      value={jurnalStafForm.tanggal} onChange={e => setJurnalStafForm({...jurnalStafForm, tanggal: e.target.value})} />
                  </div>
                  <div className={styles.formGroup} style={{ gridColumn: '1 / -1', marginBottom: 0 }}>
                    <label>Kegiatan <span style={{ color: 'red' }}>*</span></label>
                    <input type="text" required placeholder="Contoh: Menginput absensi bulanan ke sistem"
                      value={jurnalStafForm.kegiatan} onChange={e => setJurnalStafForm({...jurnalStafForm, kegiatan: e.target.value})} />
                  </div>
                  <div className={styles.formGroup} style={{ marginBottom: 0 }}>
                    <label>Waktu Mulai Dari</label>
                    <input type="time"
                      value={jurnalStafForm.mulaiDari} onChange={e => setJurnalStafForm({...jurnalStafForm, mulaiDari: e.target.value})} />
                  </div>
                  <div className={styles.formGroup} style={{ marginBottom: 0 }}>
                    <label>Waktu Sampai Dengan</label>
                    <input type="time"
                      value={jurnalStafForm.sampaiDengan} onChange={e => setJurnalStafForm({...jurnalStafForm, sampaiDengan: e.target.value})} />
                  </div>
                  <div className={styles.formGroup} style={{ gridColumn: '1 / -1', marginBottom: 0 }}>
                    <label>Keterangan</label>
                    <textarea placeholder="Catatan tambahan (opsional)" rows={3}
                      value={jurnalStafForm.keterangan} onChange={e => setJurnalStafForm({...jurnalStafForm, keterangan: e.target.value})}></textarea>
                  </div>
                  <div style={{ gridColumn: '1 / -1', marginBottom: '16px' }}>
                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '0.9rem', color: '#334155' }}>
                      Upload Foto Kegiatan (Opsional)
                    </label>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <label style={{ 
                        flex: 1, padding: '16px', border: '2px dashed #3b82f6', borderRadius: '8px', 
                        textAlign: 'center', cursor: 'pointer', color: '#3b82f6', fontWeight: 600, background: '#eff6ff',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
                      }}>
                        <i className="fas fa-camera" style={{ fontSize: '1.5rem', marginBottom: '8px' }}></i> 
                        <span>Pilih File Foto</span>
                        <input type="file" accept="image/*" 
                          style={{ position: 'absolute', width: '1px', height: '1px', padding: 0, margin: '-1px', overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', whiteSpace: 'nowrap', borderWidth: 0 }}
                          onChange={e => setJurnalStafFile(e.target.files ? e.target.files[0] : null)} />
                      </label>
                    </div>
                    {jurnalStafFile && (
                      <div style={{ padding: '8px 12px', marginTop: '8px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.9rem', color: '#16a34a', fontWeight: 600 }}>
                        ✅ {jurnalStafFile.name}
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button type="submit" disabled={savingJurnalStaf} className="btn btn-primary" style={{ padding: '12px 24px', fontSize: '1rem', minWidth: '140px' }}>
                    {savingJurnalStaf ? <><i className="fas fa-spinner fa-spin"></i> Menyimpan...</> : <><i className="fas fa-save"></i> Save Jurnal</>}
                  </button>
                </div>
              </form>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <div style={{ flex: '1 1 200px' }}>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>Dari Tanggal</label>
                    <input type="date" style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }} value={filterStartDate} onChange={e => setFilterStartDate(e.target.value)} />
                  </div>
                  <div style={{ flex: '1 1 200px' }}>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>Sampai Tanggal</label>
                    <input type="date" style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }} value={filterEndDate} onChange={e => setFilterEndDate(e.target.value)} />
                  </div>
                  <div style={{ flex: '2 1 300px' }}>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>Cari Nama Guru / Staf</label>
                    <input type="text" placeholder="Ketik nama..." style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }} value={filterName} onChange={e => setFilterName(e.target.value)} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                    <button type="button" onClick={() => { setFilterStartDate(''); setFilterEndDate(''); setFilterName(''); }} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', color: '#475569', fontWeight: 600, cursor: 'pointer' }}>Reset Filter</button>
                  </div>
                </div>
                
                <div style={{ overflowX: 'auto' }}>
                  <table className={styles.table}>
                  <thead>
                    <tr>
                      <th style={{ width: '150px' }}>Waktu</th>
                      <th>Nama Staf</th>
                      <th>Kegiatan</th>
                      <th style={{ width: '250px' }}>Keterangan</th>
                      <th style={{ width: '100px', textAlign: 'center' }}>Foto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const filtered = jurnalStafData.filter(j => {
                        let match = true;
                        if (filterStartDate && j.tanggal < filterStartDate) match = false;
                        if (filterEndDate && j.tanggal > filterEndDate) match = false;
                        if (filterName && !j.namaStaf?.toLowerCase().includes(filterName.toLowerCase())) match = false;
                        return match;
                      });
                      return filtered.length > 0 ? filtered.map((j, i) => (
                      <tr key={i}>
                        <td>
                          <div style={{ fontWeight: 600, color: '#334155' }}>{j.tanggal}</div>
                          <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                            {j.mulaiDari && j.sampaiDengan ? `${j.mulaiDari} s/d ${j.sampaiDengan}` : j.mulaiDari || j.sampaiDengan || ''}
                          </div>
                        </td>
                        <td style={{ fontWeight: 600, color: '#0f172a' }}>{j.namaStaf}</td>
                        <td>{j.kegiatan}</td>
                        <td>{j.keterangan || '-'}</td>
                        <td style={{ textAlign: 'center' }}>
                          {j.fotoKegiatan ? (
                            <a href={j.fotoKegiatan} target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', fontWeight: 600 }}>
                              <i className="fas fa-image"></i> Lihat
                            </a>
                          ) : '-'}
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                          Tidak ada data jurnal kegiatan yang sesuai filter.
                        </td>
                      </tr>
                    );
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>

      {showModal && (
        <div className={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <div className={styles.modalCard} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2><i className="fas fa-edit"></i> Buat Notulen Baru</h2>
              <button className={styles.closeBtn} onClick={() => setShowModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className={styles.modalBody}>
                {step === 1 && (
                  <>
                    <div style={{ display: 'flex', gap: '16px' }}>
                  <div className={styles.formGroup} style={{ flex: 1 }}>
                    <label>Tanggal Rapat</label>
                    <input type="date" required value={formData.tanggal} onChange={e => setFormData({...formData, tanggal: e.target.value})} />
                  </div>
                  <div className={styles.formGroup} style={{ flex: 1 }}>
                    <label>Waktu (Jam)</label>
                    <input type="text" placeholder="Misal: 13:30" required value={formData.waktu} onChange={e => setFormData({...formData, waktu: e.target.value})} />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label>Tempat Rapat</label>
                  <input type="text" placeholder="Misal: Ruang Guru" required value={formData.tempatRapat} onChange={e => setFormData({...formData, tempatRapat: e.target.value})} />
                </div>

                <div className={styles.formGroup}>
                  <label>Agenda Rapat</label>
                  <input type="text" required value={formData.agendaRapat} onChange={e => setFormData({...formData, agendaRapat: e.target.value})} />
                </div>

                <div className={styles.formGroup}>
                  <label>Nama Notulis</label>
                  <input type="text" placeholder="Misal: Bapak/Ibu X" required value={formData.notulis} onChange={e => setFormData({...formData, notulis: e.target.value})} />
                </div>

                <div className={styles.formGroup}>
                  <label>Pimpinan Rapat</label>
                  <input type="text" required value={formData.pimpinanRapat} onChange={e => setFormData({...formData, pimpinanRapat: e.target.value})} />
                </div>

                <div className={styles.formGroup}>
                  <label>Dihadiri Oleh</label>
                  <div style={{ marginBottom: '8px' }}>
                    <label className={styles.checkboxItem}>
                      <input type="checkbox" checked={selectAllPeserta} onChange={handleSelectAll} />
                      <strong>Seluruh GTK</strong>
                    </label>
                  </div>
                    {!selectAllPeserta && (
                      <>
                        <input
                          type="text"
                          placeholder="🔍 Cari nama guru..."
                          value={searchPeserta}
                          onChange={e => setSearchPeserta(e.target.value)}
                          style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', marginBottom: '8px', fontSize: '0.9rem' }}
                        />
                        <div className={styles.checkboxList}>
                          {gurus
                            .filter((g: any) => g.nama.toLowerCase().includes(searchPeserta.toLowerCase()))
                            .map((g: any) => (
                            <label key={g.nama} className={styles.checkboxItem}>
                              <input 
                                type="checkbox" 
                                checked={selectedPeserta.includes(g.nama)}
                                onChange={() => handleCheckboxChange(g.nama)}
                              />
                              {g.nama}
                            </label>
                          ))}
                        </div>
                      </>
                    )}
                </div>
                </>
                )}

                {step === 2 && (
                <>
                <div className={styles.formGroup}>
                  <label>Hasil Notulen</label>
                  <textarea rows={6} required value={formData.hasilNotulen} onChange={e => setFormData({...formData, hasilNotulen: e.target.value})} placeholder="Ketik hasil/keputusan rapat di sini..."></textarea>
                </div>

                <div className={styles.formGroup}>
                  <label>Dokumentasi Kegiatan</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <label style={{ 
                          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                          padding: '10px', border: '2px dashed #3b82f6', borderRadius: '8px',
                          cursor: 'pointer', color: '#3b82f6', fontWeight: 600, fontSize: '0.9rem',
                          background: '#eff6ff'
                        }}>
                          <i className="fas fa-camera"></i> Ambil Foto
                          <input type="file" id="dokumentasiFile" accept="image/*" capture="environment" multiple style={{ display: 'none' }} onChange={async e => {
                            if (e.target.files && e.target.files.length > 0) {
                              const files = Array.from(e.target.files);
                              const compressed = await Promise.all(files.map(f => compressImage(f)));
                              setDokumentasiFiles(prev => [...prev, ...compressed]);
                              setFormData({...formData, dokumentasi: ''});
                            }
                          }} />
                        </label>
                        <label style={{ 
                          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                          padding: '10px', border: '2px dashed #10b981', borderRadius: '8px',
                          cursor: 'pointer', color: '#10b981', fontWeight: 600, fontSize: '0.9rem',
                          background: '#f0fdf4'
                        }}>
                          <i className="fas fa-images"></i> Pilih Galeri
                          <input type="file" id="dokumentasiGallery" accept="image/*" multiple style={{ display: 'none' }} onChange={async e => {
                            if (e.target.files && e.target.files.length > 0) {
                              const files = Array.from(e.target.files);
                              const compressed = await Promise.all(files.map(f => compressImage(f)));
                              setDokumentasiFiles(prev => [...prev, ...compressed]);
                              setFormData({...formData, dokumentasi: ''});
                            }
                          }} />
                        </label>
                      </div>
                      {/* Pratinjau nama file terpilih */}
                      {dokumentasiFiles.length > 0 && (
                        <div style={{ padding: '8px', fontSize: '0.9rem', color: '#16a34a', fontWeight: '500', background: '#dcfce7', borderRadius: '6px', border: '1px solid #86efac', textAlign: 'center' }}>
                          ✅ {dokumentasiFiles.length} foto dipilih:<br/>
                          <div style={{ fontSize: '0.8rem', marginTop: '4px', opacity: 0.8 }}>
                            {dokumentasiFiles.map(f => f.name).join(', ')}
                          </div>
                          <button type="button" onClick={(e) => { e.preventDefault(); setDokumentasiFiles([]); }} style={{ marginTop: '8px', padding: '4px 8px', color: '#ef4444', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
                            <i className="fas fa-trash"></i> Hapus Semua Foto
                          </button>
                        </div>
                      )}
                      <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Atau masukkan link eksternal (Drive, dll), pisahkan dengan || jika lebih dari satu:</span>
                      <input type="url" placeholder="Link Gambar / Google Drive" value={formData.dokumentasi} onChange={e => setFormData({...formData, dokumentasi: e.target.value})} style={{ padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px' }} />
                    </div>
                  </div>
                </>
                )}
              </div>

              <div className={styles.modalFooter}>
                {step === 1 ? (
                  <>
                    <button type="button" className={styles.btnSecondary} onClick={() => { setShowModal(false); setStep(1); }} disabled={saving}>
                      Batal
                    </button>
                    <button type="button" className={styles.btnPrimary} onClick={() => setStep(2)}>
                      Berikutnya <i className="fas fa-arrow-right"></i>
                    </button>
                  </>
                ) : (
                  <>
                    <button type="button" className={styles.btnSecondary} onClick={() => setStep(1)} disabled={saving}>
                      <i className="fas fa-arrow-left"></i> Kembali
                    </button>
                    <button type="submit" className={styles.btnPrimary} disabled={saving}>
                      {saving ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-save"></i>}
                      Simpan Notulen
                    </button>
                  </>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {showUploadModal && uploadTarget && (
        <div className={styles.modalOverlay} onClick={() => setShowUploadModal(false)}>
          <div className={styles.modalCard} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2><i className="fas fa-camera"></i> Lampirkan Foto Tambahan</h2>
              <button className={styles.closeBtn} onClick={() => setShowUploadModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            <form onSubmit={async (e) => {
              e.preventDefault();
              setSaving(true);
              try {
                const payload = new FormData();
                payload.append('action', 'update_dokumentasi');
                payload.append('id', uploadTarget.id);
                uploadFiles.forEach(f => payload.append('dokumentasi', f));
                const res = await fetch('/api/notulen', { method: 'POST', body: payload });
                const json = await res.json();
                if (json.success) {
                  setShowUploadModal(false);
                  setUploadTarget(null);
                  setUploadFiles([]);
                  fetchData();
                } else {
                  Swal.fire({ icon: 'error', title: 'Gagal', text: json.error });
                }
              } catch (err: any) {
                Swal.fire({ icon: 'error', title: 'Error', text: err.message });
              }
              setSaving(false);
            }}>
              <div className={styles.modalBody}>
                <p style={{ marginBottom: '16px', fontSize: '0.9rem', color: '#475569' }}>
                  Tambahkan foto dokumentasi untuk <strong>{uploadTarget.agendaRapat}</strong>.
                </p>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <label style={{ 
                    flex: 1, padding: '16px', border: '2px dashed #10b981', borderRadius: '8px', 
                    textAlign: 'center', cursor: 'pointer', color: '#10b981', fontWeight: 600, background: '#f0fdf4' 
                  }}>
                    <i className="fas fa-images" style={{ display: 'block', fontSize: '1.5rem', marginBottom: '8px' }}></i> 
                    Pilih File Foto
                    <input type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={async e => {
                      if (e.target.files && e.target.files.length > 0) {
                        const files = Array.from(e.target.files);
                        const compressed = await Promise.all(files.map(f => compressImage(f)));
                        setUploadFiles(prev => [...prev, ...compressed]);
                      }
                    }} />
                  </label>
                </div>
                {uploadFiles.length > 0 && (
                  <div style={{ padding: '12px', marginTop: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#16a34a', marginBottom: '8px' }}>
                      ✅ {uploadFiles.length} foto dipilih:
                    </div>
                    <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.85rem', color: '#475569', opacity: 0.9 }}>
                      {uploadFiles.map((f, i) => <li key={i}>{f.name}</li>)}
                    </ul>
                    <button type="button" onClick={() => setUploadFiles([])} style={{ marginTop: '12px', padding: '6px 12px', color: '#ef4444', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
                      <i className="fas fa-trash"></i> Hapus Semua Pilihan
                    </button>
                  </div>
                )}
              </div>
              <div className={styles.modalFooter}>
                <button type="button" className={styles.btnSecondary} onClick={() => setShowUploadModal(false)} disabled={saving}>Batal</button>
                <button type="submit" className={styles.btnPrimary} disabled={saving || uploadFiles.length === 0}>
                  {saving ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-upload"></i>} Simpan Lampiran
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal Tambah LPJ */}
      {showLpjModal && (
        <div className={styles.modalOverlay} onClick={() => setShowLpjModal(false)}>
          <div className={styles.modalCard} onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className={styles.modalHeader}>
              <h2><i className="fas fa-upload"></i> Tambah LPJ Kegiatan</h2>
              <button className={styles.closeBtn} onClick={() => setShowLpjModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            <form onSubmit={handleLpjSubmit}>
              <div className={styles.modalBody}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#334155' }}>Tanggal Kegiatan <span style={{ color: 'red' }}>*</span></label>
                  <input type="date" value={lpjForm.tanggal} onChange={e => setLpjForm({...lpjForm, tanggal: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px' }} required />
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#334155' }}>Nama Kegiatan <span style={{ color: 'red' }}>*</span></label>
                  <input type="text" value={lpjForm.namaKegiatan} onChange={e => setLpjForm({...lpjForm, namaKegiatan: e.target.value})} placeholder="Contoh: Classmeeting" style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px' }} required />
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#334155' }}>PJ Kegiatan <span style={{ color: 'red' }}>*</span></label>
                  <input type="text" value={lpjForm.pjKegiatan} onChange={e => setLpjForm({...lpjForm, pjKegiatan: e.target.value})} list="guru-list" placeholder="Pilih/Ketik Nama PJ" style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px' }} required />
                  <datalist id="guru-list">
                    {gurus.map((g, i) => <option key={i} value={g.nama} />)}
                  </datalist>
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#334155' }}>File LPJ (PDF/Scan) <span style={{ color: 'red' }}>*</span></label>
                  <input type="file" accept=".pdf,image/*,.doc,.docx,.xls,.xlsx" onChange={e => setLpjFile(e.target.files ? e.target.files[0] : null)} style={{ width: '100%', padding: '10px', border: '1px dashed #3b82f6', borderRadius: '8px', background: '#eff6ff' }} required />
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button type="button" className={styles.btnSecondary} onClick={() => setShowLpjModal(false)} disabled={savingLpj}>Batal</button>
                <button type="submit" className={styles.btnPrimary} disabled={savingLpj}>
                  {savingLpj ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-save"></i>} Simpan LPJ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
