'use client';
import { useState, useEffect } from 'react';
import styles from './JurnalKegiatan.module.css';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, BorderStyle, WidthType, AlignmentType, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';

export default function JurnalKegiatanPage() {
  const [notulens, setNotulens] = useState<any[]>([]);
  const [gurus, setGurus] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(1);

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
      
      const dihadiriOleh = selectAllPeserta ? 'Seluruh GTK' : selectedPeserta.join(', ');
      payload.append('dihadiriOleh', dihadiriOleh);
      
      const fileInput = document.getElementById('dokumentasiFile') as HTMLInputElement;
      if (fileInput && fileInput.files && fileInput.files.length > 0) {
        payload.append('dokumentasi', fileInput.files[0]);
      } else {
        payload.append('dokumentasiUrl', formData.dokumentasi);
      }

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
        setStep(1);
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
    const doc = new Document({
      sections: [{
        properties: {
          page: {
            size: {
              width: 11906, // A4 width in twips
              height: 16838 // A4 height in twips
            }
          }
        },
        children: [
          new Paragraph({
            text: "NOTULEN RAPAT",
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 }
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.NONE },
              bottom: { style: BorderStyle.NONE },
              left: { style: BorderStyle.NONE },
              right: { style: BorderStyle.NONE },
              insideHorizontal: { style: BorderStyle.NONE },
              insideVertical: { style: BorderStyle.NONE },
            },
            rows: [
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph("Tanggal")], width: { size: 25, type: WidthType.PERCENTAGE } }),
                  new TableCell({ children: [new Paragraph(`: ${n.tanggal}`)] })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph("Waktu")] }),
                  new TableCell({ children: [new Paragraph(`: ${n.waktu}`)] })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph("Tempat")] }),
                  new TableCell({ children: [new Paragraph(`: ${n.tempatRapat}`)] })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph("Agenda")] }),
                  new TableCell({ children: [new Paragraph(`: ${n.agendaRapat}`)] })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph("Pimpinan Rapat")] }),
                  new TableCell({ children: [new Paragraph(`: ${n.pimpinanRapat}`)] })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph("Dihadiri Oleh")] }),
                  new TableCell({ children: [new Paragraph(`: ${n.dihadiriOleh}`)] })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph("Notulis")] }),
                  new TableCell({ children: [new Paragraph(`: ${n.notulis}`)] })
                ]
              }),
            ]
          }),
          new Paragraph({
            text: "",
            spacing: { before: 200, after: 200 }
          }),
          new Paragraph({
            text: "HASIL NOTULEN:",
            heading: HeadingLevel.HEADING_3,
            spacing: { after: 120 },
            pageBreakBefore: true
          }),
          ...n.hasilNotulen.split('\n').map((line: string) => 
            new Paragraph({ text: line, spacing: { after: 120 } })
          ),
        ],
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
                    <td style={{ textAlign: 'center' }}>
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
                    <div className={styles.checkboxList}>
                      {gurus.map(g => (
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
                      {/* Tombol Foto Kamera Langsung - hanya aktif di perangkat mobile */}
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <label style={{ 
                          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                          padding: '10px', border: '2px dashed #3b82f6', borderRadius: '8px',
                          cursor: 'pointer', color: '#3b82f6', fontWeight: 600, fontSize: '0.9rem',
                          background: '#eff6ff'
                        }}>
                          <i className="fas fa-camera"></i> Ambil Foto
                          <input type="file" id="dokumentasiFile" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={e => {
                            const f = e.target.files?.[0];
                            if (f) setFormData({...formData, dokumentasi: ''});
                          }} />
                        </label>
                        <label style={{ 
                          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                          padding: '10px', border: '2px dashed #10b981', borderRadius: '8px',
                          cursor: 'pointer', color: '#10b981', fontWeight: 600, fontSize: '0.9rem',
                          background: '#f0fdf4'
                        }}>
                          <i className="fas fa-images"></i> Pilih Galeri
                          <input type="file" id="dokumentasiGallery" accept="image/*" style={{ display: 'none' }} onChange={e => {
                            const f = e.target.files?.[0];
                            if (f) {
                              // copy file ke input utama
                              const dataTransfer = new DataTransfer();
                              dataTransfer.items.add(f);
                              const mainInput = document.getElementById('dokumentasiFile') as HTMLInputElement;
                              if (mainInput) mainInput.files = dataTransfer.files;
                              setFormData({...formData, dokumentasi: ''});
                            }
                          }} />
                        </label>
                      </div>
                      {/* Pratinjau nama file terpilih */}
                      <div id="fotoPreview" style={{ fontSize: '0.85rem', color: '#475569', padding: '4px 0' }}></div>
                      <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Atau masukkan link eksternal (Drive, dll):</span>
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
    </div>
  );
}
