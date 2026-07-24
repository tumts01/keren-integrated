'use client';
import { useState, useEffect } from 'react';
import styles from './JurnalKegiatan.module.css';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, BorderStyle, WidthType, AlignmentType, HeadingLevel, ImageRun } from 'docx';
import { saveAs } from 'file-saver';

export default function JurnalKegiatanPage() {
  const [notulens, setNotulens] = useState<any[]>([]);
  const [gurus, setGurus] = useState<any[]>([]);
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
      const res = await fetch('/api/notulen');
      const json = await res.json();
      if (json.success) {
        setNotulens(json.data);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
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
        alert('Gagal menyimpan notulen: ' + json.error);
      }
    } catch (err: any) {
      alert('Error: ' + err.message);
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
      <div className={styles.header}>
        <h1 className={styles.title}><i className="fas fa-book-open"></i> Notulen Rapat</h1>
        <button className={styles.btnPrimary} onClick={() => setShowModal(true)}>
          <i className="fas fa-plus"></i> Buat Notulen
        </button>
      </div>

      <div className={styles.tableContainer}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
            <i className="fas fa-spinner fa-spin fa-2x"></i>
            <p>Memuat data notulen...</p>
          </div>
        ) : (
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
                          <input type="file" id="dokumentasiFile" accept="image/*" capture="environment" multiple style={{ display: 'none' }} onChange={e => {
                            if (e.target.files && e.target.files.length > 0) {
                              setDokumentasiFiles(prev => [...prev, ...Array.from(e.target.files!)]);
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
                          <input type="file" id="dokumentasiGallery" accept="image/*" multiple style={{ display: 'none' }} onChange={e => {
                            if (e.target.files && e.target.files.length > 0) {
                              setDokumentasiFiles(prev => [...prev, ...Array.from(e.target.files!)]);
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
                  alert(json.error);
                }
              } catch (err: any) {
                alert(err.message);
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
                    <input type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={e => {
                      if (e.target.files) {
                        setUploadFiles(prev => [...prev, ...Array.from(e.target.files!)]);
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
    </div>
  );
}
