'use client';
import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';

const KELAS_LIST = [
  '7A','7B','7C','7D','7E','7F','7G','7H','7I',
  '8A','8B','8C','8D','8E','8F','8G','8H','8I',
  '9A','9B','9C','9D','9E','9F','9G','9H','9I',
];

interface PreviewRow {
  nis: string;
  nama: string;
  rombel: string;
  linkFoto: string;
}

export default function MappingFotoTab() {
  const [selectedKelas, setSelectedKelas] = useState('7A');
  const [downloading, setDownloading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [result, setResult] = useState<{ updated: number; skipped: number; errors: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Download template Excel dari API
  const handleDownloadTemplate = async () => {
    setDownloading(true);
    try {
      const res = await fetch(`/api/foto-siswa?kelas=${encodeURIComponent(selectedKelas)}`);
      if (!res.ok) throw new Error('Gagal generate template');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `template-foto-${selectedKelas}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      alert('Error: ' + e.message);
    } finally {
      setDownloading(false);
    }
  };

  // Preview Excel sebelum upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = new Uint8Array(ev.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 }) as string[][];

        // Skip header (row 0), ambil baris dengan Link Foto terisi
        const parsed: PreviewRow[] = rows.slice(1)
          .filter(row => row[4] && String(row[4]).trim() !== '')
          .map(row => ({
            nis: String(row[1] || '').trim(),
            nama: String(row[2] || '').trim(),
            rombel: String(row[3] || '').trim(),
            linkFoto: String(row[4] || '').trim(),
          }));

        setPreview(parsed);
        setResult(null);
      } catch {
        alert('File Excel tidak valid atau formatnya salah!');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Upload Excel ke API untuk update database
  const handleSave = async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/foto-siswa', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setResult({ updated: data.updated, skipped: data.skipped || 0, errors: data.errors || [] });
      setPreview([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (e: any) {
      alert('Error: ' + e.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#334155', marginBottom: '8px' }}>
        Mapping Foto Siswa
      </h2>
      <p style={{ color: '#64748b', marginBottom: '24px', fontSize: '14px' }}>
        Download template Excel, isi kolom Link Foto menggunakan link Google Drive, lalu upload kembali.
      </p>

      {/* Step 1 */}
      <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
        <div style={{ fontWeight: 'bold', color: '#166534', marginBottom: '12px' }}>
          <i className="fas fa-download" style={{ marginRight: '8px' }}></i>
          Langkah 1 — Download Template Excel
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            value={selectedKelas}
            onChange={e => setSelectedKelas(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
          >
            {KELAS_LIST.map(k => <option key={k} value={k}>Kelas {k}</option>)}
          </select>
          <button
            onClick={handleDownloadTemplate}
            disabled={downloading}
            style={{ background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', padding: '8px 20px', fontWeight: 'bold', cursor: downloading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <i className={downloading ? 'fas fa-spinner fa-spin' : 'fas fa-file-excel'}></i>
            {downloading ? 'Generating...' : `Download Template Kelas ${selectedKelas}`}
          </button>
        </div>
      </div>

      {/* Step 2 */}
      <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
        <div style={{ fontWeight: 'bold', color: '#92400e', marginBottom: '8px' }}>
          <i className="fas fa-table" style={{ marginRight: '8px' }}></i>
          Langkah 2 — Isi Kolom "Link Foto" di Excel
        </div>
        <p style={{ color: '#78350f', fontSize: '13px', margin: 0 }}>
          Buka template Excel yang didownload → isi kolom <strong>Link Foto</strong> dengan link Google Drive tiap foto siswa.
          <br />Gunakan <strong>Google Apps Script</strong> di bawah untuk mengambil semua link foto dari folder Drive secara otomatis.
        </p>
      </div>

      {/* Step 3 */}
      <div style={{ background: '#eff6ff', border: '1px solid #93c5fd', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
        <div style={{ fontWeight: 'bold', color: '#1e40af', marginBottom: '12px' }}>
          <i className="fas fa-upload" style={{ marginRight: '8px' }}></i>
          Langkah 3 — Upload Excel yang Sudah Diisi
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', marginBottom: '12px' }}>
          <div style={{ background: '#3b82f6', color: 'white', borderRadius: '6px', padding: '8px 16px', fontWeight: 'bold', fontSize: '14px' }}>
            <i className="fas fa-folder-open" style={{ marginRight: '8px' }}></i>Pilih File Excel
          </div>
          <span style={{ color: '#64748b', fontSize: '13px' }}>{fileInputRef.current?.files?.[0]?.name || 'Belum ada file dipilih'}</span>
          <input
            type="file"
            accept=".xlsx,.xls"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
        </label>

        {/* Preview */}
        {preview.length > 0 && (
          <div>
            <div style={{ color: '#1e40af', fontWeight: 'bold', marginBottom: '8px', fontSize: '14px' }}>
              Preview: {preview.length} siswa siap diupdate
            </div>
            <div style={{ overflowX: 'auto', maxHeight: '300px', overflowY: 'auto', marginBottom: '12px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#dbeafe', position: 'sticky', top: 0 }}>
                    <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #93c5fd' }}>NIS</th>
                    <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #93c5fd' }}>Nama</th>
                    <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #93c5fd' }}>Kelas</th>
                    <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #93c5fd' }}>Link Foto</th>
                    <th style={{ padding: '8px', textAlign: 'center', borderBottom: '1px solid #93c5fd' }}>Preview</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '6px 8px' }}>{row.nis}</td>
                      <td style={{ padding: '6px 8px', fontWeight: 'bold' }}>{row.nama}</td>
                      <td style={{ padding: '6px 8px' }}>{row.rombel}</td>
                      <td style={{ padding: '6px 8px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <a href={row.linkFoto} target="_blank" rel="noreferrer" style={{ color: '#3b82f6', fontSize: '12px' }}>
                          {row.linkFoto}
                        </a>
                      </td>
                      <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                        {row.linkFoto && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={row.linkFoto.includes('drive.google.com') && row.linkFoto.includes('/d/')
                              ? `https://drive.google.com/thumbnail?id=${row.linkFoto.match(/\/d\/([a-zA-Z0-9_-]+)/)?.[1]}&sz=w60-h60`
                              : row.linkFoto}
                            alt=""
                            style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #e2e8f0' }}
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button
              onClick={handleSave}
              disabled={uploading}
              style={{ background: uploading ? '#94a3b8' : '#10b981', color: 'white', border: 'none', borderRadius: '6px', padding: '10px 24px', fontWeight: 'bold', cursor: uploading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <i className={uploading ? 'fas fa-spinner fa-spin' : 'fas fa-save'}></i>
              {uploading ? 'Menyimpan ke database...' : `Simpan ${preview.length} Data Foto ke Database`}
            </button>
          </div>
        )}
      </div>

      {/* Hasil */}
      {result && (
        <div style={{ background: result.errors.length > 0 ? '#fff7ed' : '#f0fdf4', border: `1px solid ${result.errors.length > 0 ? '#fdba74' : '#86efac'}`, borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
          <div style={{ fontWeight: 'bold', color: result.errors.length > 0 ? '#c2410c' : '#166534', marginBottom: '8px' }}>
            <i className={`fas ${result.errors.length > 0 ? 'fa-exclamation-triangle' : 'fa-check-circle'}`} style={{ marginRight: '8px' }}></i>
            {result.errors.length > 0 ? 'Selesai dengan beberapa error' : 'Berhasil Disimpan!'}
          </div>
          <p style={{ margin: '0 0 4px', color: '#166534', fontSize: '14px' }}>✅ {result.updated} siswa berhasil diupdate</p>
          {result.skipped > 0 && <p style={{ margin: '0 0 4px', color: '#78350f', fontSize: '14px' }}>⏭️ {result.skipped} baris dilewati (link kosong)</p>}
          {result.errors.length > 0 && (
            <ul style={{ margin: '8px 0 0', paddingLeft: '20px', color: '#c2410c', fontSize: '13px' }}>
              {result.errors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          )}
        </div>
      )}

      {/* Info Apps Script */}
      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px' }}>
        <div style={{ fontWeight: 'bold', color: '#334155', marginBottom: '8px' }}>
          <i className="fas fa-code" style={{ marginRight: '8px', color: '#6366f1' }}></i>
          Cara Otomatis — Google Apps Script
        </div>
        <ol style={{ margin: 0, paddingLeft: '20px', color: '#64748b', fontSize: '13px', lineHeight: '1.8' }}>
          <li>Upload semua foto ke folder Google Drive</li>
          <li>Buka Google Sheets baru → <strong>Extensions → Apps Script</strong></li>
          <li>Paste script dari file <code>scripts/daftar-foto-siswa.gs</code> di repo</li>
          <li>Jalankan fungsi <code>daftarFotoSiswa()</code> → masukkan Folder ID</li>
          <li>Script otomatis isi semua link foto dalam hitungan detik</li>
          <li>Salin kolom <strong>&quot;Link Foto&quot;</strong> ke template Excel KEREN</li>
          <li>Upload Excel ke sini → Selesai!</li>
        </ol>
      </div>
    </div>
  );
}
