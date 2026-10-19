'use client';
import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Swal from 'sweetalert2';
import styles from './Rekap.module.css';
import ModalAturJalur from '../components/ModalAturJalur';
import ModalPengumumanSpmb from '../components/ModalPengumumanSpmb';

export default function RekapSpmb() {
  const router = useRouter();
  const pathname = usePathname();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Modal states
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [viewerTitle, setViewerTitle] = useState('');
  
  const [isAdmin, setIsAdmin] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showPengumumanModal, setShowPengumumanModal] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [filterJalur, setFilterJalur] = useState('semua');
  const [filterVerifikasiKk, setFilterVerifikasiKk] = useState('semua');
  const [filterVerifikasiRapor, setFilterVerifikasiRapor] = useState('semua');
  const [filterKelulusan, setFilterKelulusan] = useState('semua');
  const [filterJadwal, setFilterJadwal] = useState('semua');
  const [sortOrder, setSortOrder] = useState<'terbaru' | 'terlama' | 'asc' | 'desc'>('terbaru');

  // Helper parsing timestamp SPMB
  const parseTimestamp = (item: any): number => {
    const str = item.timestamp || '';
    if (str) {
      const parts = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})[,\s]+(\d{1,2})[.:](\d{1,2})[.:](\d{1,2})/);
      if (parts) {
        const [, d, m, y, h, min, s] = parts;
        const t = new Date(Number(y), Number(m) - 1, Number(d), Number(h), Number(min), Number(s)).getTime();
        if (!isNaN(t)) return t;
      }
      const parsed = Date.parse(str);
      if (!isNaN(parsed)) return parsed;
    }
    const numId = Number(item.rowNumber || item.id || 0);
    return !isNaN(numId) ? numId : 0;
  };

  // Pagination States (default 20 pendaftar per halaman)
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Filtered and Sorted data calculation (default: Pendaftar Terbaru ke Terlama)
  const filteredData = data
    .filter(item => {
      // Search Term match
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const matchNama = (item.namaLengkap || '').toLowerCase().includes(q);
        const matchNopes = (item.nomorPendaftaran || '').toLowerCase().includes(q);
        const matchNisn = (item.nisn || '').toLowerCase().includes(q);
        const matchAsal = (item.asalSekolah || '').toLowerCase().includes(q);
        const matchOrtu = (item.namaAyah || '').toLowerCase().includes(q) || (item.namaIbu || '').toLowerCase().includes(q);
        if (!matchNama && !matchNopes && !matchNisn && !matchAsal && !matchOrtu) {
          return false;
        }
      }

      // Filter Jalur
      if (filterJalur !== 'semua') {
        if ((item.jalurPendaftaran || '').toLowerCase() !== filterJalur.toLowerCase()) {
          return false;
        }
      }

      // Filter Verifikasi KK
      if (filterVerifikasiKk !== 'semua') {
        const verifKk = (item.statusVerifikasi || 'menunggu').toLowerCase();
        if (verifKk !== filterVerifikasiKk.toLowerCase()) {
          return false;
        }
      }

      // Filter Verifikasi Rapor
      if (filterVerifikasiRapor !== 'semua') {
        const verifRapor = (item.statusVerifikasiRapor || 'menunggu').toLowerCase();
        if (verifRapor !== filterVerifikasiRapor.toLowerCase()) {
          return false;
        }
      }

      // Filter Kelulusan
      if (filterKelulusan !== 'semua') {
        const lulus = (item.statusKelulusan || 'proses').toLowerCase();
        if (lulus !== filterKelulusan.toLowerCase()) {
          return false;
        }
      }

      // Filter Jadwal
      if (filterJadwal === 'sudah') {
        if (!item.jadwalTes || !item.jadwalTes.trim()) return false;
      } else if (filterJadwal === 'belum') {
        if (item.jadwalTes && item.jadwalTes.trim()) return false;
      }

      return true;
    })
    .sort((a, b) => {
      if (sortOrder === 'terbaru') {
        const timeDiff = parseTimestamp(b) - parseTimestamp(a);
        if (timeDiff !== 0) return timeDiff;
        return Number(b.rowNumber || 0) - Number(a.rowNumber || 0);
      }
      if (sortOrder === 'terlama') {
        const timeDiff = parseTimestamp(a) - parseTimestamp(b);
        if (timeDiff !== 0) return timeDiff;
        return Number(a.rowNumber || 0) - Number(b.rowNumber || 0);
      }

      const valA = (a.nomorPendaftaran || '').trim();
      const valB = (b.nomorPendaftaran || '').trim();
      if (!valA && !valB) return 0;
      if (!valA) return 1;
      if (!valB) return -1;
      const cmp = valA.localeCompare(valB, undefined, { numeric: true, sensitivity: 'base' });
      if (cmp !== 0) {
        return sortOrder === 'asc' ? cmp : -cmp;
      }
      return String(a.rowNumber).localeCompare(String(b.rowNumber), undefined, { numeric: true });
    });

  // Reset to page 1 when any filter or sort changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterJalur, filterVerifikasiKk, filterVerifikasiRapor, filterKelulusan, filterJadwal, sortOrder]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (safeCurrentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, filteredData.length);
  const paginatedData = filteredData.slice(startIndex, startIndex + itemsPerPage);

  const isCurrentPageAllSelected = paginatedData.length > 0 && paginatedData.every(item => selectedIds.includes(item.rowNumber));

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllCurrentPage = () => {
    const pageIds = paginatedData.map(d => d.rowNumber);
    if (isCurrentPageAllSelected) {
      setSelectedIds(prev => prev.filter(id => !pageIds.includes(id)));
    } else {
      setSelectedIds(prev => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const handleSelectAllFiltered = () => {
    setSelectedIds(filteredData.map(d => d.rowNumber));
  };

  const handleResetFilter = () => {
    setSearchTerm('');
    setFilterJalur('semua');
    setFilterVerifikasiKk('semua');
    setFilterVerifikasiRapor('semua');
    setFilterKelulusan('semua');
    setFilterJadwal('semua');
    setSortOrder('terbaru');
    setCurrentPage(1);
  };

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (safeCurrentPage <= 4) {
        pages.push(1, 2, 3, 4, 5, '...', totalPages);
      } else if (safeCurrentPage >= totalPages - 3) {
        pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', safeCurrentPage - 1, safeCurrentPage, safeCurrentPage + 1, '...', totalPages);
      }
    }
    return pages;
  };

  const isFiltered = searchTerm.trim() !== '' || filterJalur !== 'semua' || filterVerifikasiKk !== 'semua' || filterVerifikasiRapor !== 'semua' || filterKelulusan !== 'semua' || filterJadwal !== 'semua' || sortOrder !== 'terbaru';

  const allJalurOptions = Array.from(new Set(data.map(d => d.jalurPendaftaran).filter(Boolean)));
  if (!allJalurOptions.includes('Reguler')) allJalurOptions.push('Reguler');
  if (!allJalurOptions.includes('Inden')) allJalurOptions.push('Inden');
  if (!allJalurOptions.includes('Prestasi')) allJalurOptions.push('Prestasi');

  const handleSetJadwalSelected = async () => {
    if (selectedIds.length === 0) return;

    const { value: jadwalTes } = await Swal.fire({
      title: `Atur Jadwal untuk ${selectedIds.length} Siswa`,
      html: `
        <div style="text-align: left; font-size: 13px; color: #475569; margin-bottom: 12px;">
          Tentukan jadwal tes / observasi yang akan diterapkan serentak untuk <b>${selectedIds.length} siswa terpilih</b>:
        </div>
      `,
      input: 'text',
      inputPlaceholder: 'Contoh: Sabtu, 24 Mei 2026, Pukul 08.00 WIB (Ruang 1)',
      showCancelButton: true,
      confirmButtonText: 'Terapkan Jadwal',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#0284c7',
      cancelButtonColor: '#94a3b8',
      inputValidator: (val) => {
        if (!val || !val.trim()) {
          return 'Isian jadwal tes tidak boleh kosong!';
        }
      }
    });

    if (jadwalTes) {
      try {
        Swal.fire({ title: 'Menerapkan Jadwal...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
        const res = await fetch('/api/spmb/jadwal-massal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: selectedIds, jadwalTes: jadwalTes.trim() })
        });
        const resJson = await res.json();
        if (resJson.success) {
          Swal.fire({
            icon: 'success',
            title: 'Berhasil!',
            text: `Jadwal tes berhasil diterapkan untuk ${resJson.updatedCount} siswa terpilih.`,
            timer: 2000,
            showConfirmButton: false
          });
          setSelectedIds([]);
          fetchData();
        } else {
          Swal.fire('Gagal', resJson.error || 'Gagal menerapkan jadwal', 'error');
        }
      } catch (e: any) {
        Swal.fire('Error', 'Gagal menghubungi server', 'error');
      }
    }
  };

  const handleClearJadwalSelected = async () => {
    if (selectedIds.length === 0) return;

    const confirm = await Swal.fire({
      title: 'Kosongkan Jadwal?',
      text: `Yakin ingin mengosongkan / menghapus jadwal tes untuk ${selectedIds.length} siswa terpilih?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'Ya, Kosongkan',
      cancelButtonText: 'Batal'
    });

    if (confirm.isConfirmed) {
      try {
        Swal.fire({ title: 'Mengosongkan Jadwal...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
        const res = await fetch('/api/spmb/jadwal-massal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: selectedIds, jadwalTes: '' })
        });
        const resJson = await res.json();
        if (resJson.success) {
          Swal.fire({
            icon: 'success',
            title: 'Berhasil!',
            text: `Jadwal tes telah dikosongkan untuk ${resJson.updatedCount} siswa.`,
            timer: 2000,
            showConfirmButton: false
          });
          setSelectedIds([]);
          fetchData();
        } else {
          Swal.fire('Gagal', resJson.error || 'Gagal mengosongkan jadwal', 'error');
        }
      } catch (e: any) {
        Swal.fire('Error', 'Gagal menghubungi server', 'error');
      }
    }
  };

  const handleSetKelulusanSelected = async () => {
    if (selectedIds.length === 0) return;

    const { value: formValues } = await Swal.fire({
      title: `Eksekusi Kelulusan (${selectedIds.length} Siswa)`,
      html: `
        <div style="text-align: left; font-size: 13px; color: #475569; margin-bottom: 14px;">
          Pilih status kelulusan yang akan diterapkan serentak untuk <b>${selectedIds.length} siswa terpilih</b>:
        </div>
        <div style="text-align: left; margin-bottom: 12px;">
          <label style="display: block; font-size: 12px; font-weight: 700; margin-bottom: 5px; color: #1e293b;">
            Pilih Status Kelulusan:
          </label>
          <select id="swal-status-selected" class="swal2-input" style="width: 100%; margin: 0; padding: 10px 12px; font-size: 13.5px; border-radius: 8px; box-sizing: border-box; border: 1.5px solid #cbd5e1;">
            <option value="diterima">🟢 Diterima (Lulus)</option>
            <option value="cadangan">🟡 Cadangan</option>
            <option value="tidak_diterima">🔴 Tidak Diterima</option>
            <option value="proses">⚪ Reset ke Dalam Proses</option>
          </select>
        </div>
        <div style="text-align: left;">
          <label style="display: block; font-size: 12px; font-weight: 700; margin-bottom: 5px; color: #1e293b;">
            Catatan Kelulusan (Opsional):
          </label>
          <input id="swal-catatan-selected" class="swal2-input" placeholder="Contoh: Selamat ananda dinyatakan lulus seleksi utama" style="width: 100%; margin: 0; padding: 10px 12px; font-size: 13px; border-radius: 8px; box-sizing: border-box; border: 1.5px solid #cbd5e1;" />
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Terapkan Status',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#059669',
      cancelButtonColor: '#94a3b8',
      preConfirm: () => {
        const statusKelulusan = (document.getElementById('swal-status-selected') as HTMLSelectElement)?.value;
        const catatan = (document.getElementById('swal-catatan-selected') as HTMLInputElement)?.value;
        return { statusKelulusan, catatan: (catatan || '').trim() };
      }
    });

    if (formValues) {
      try {
        Swal.fire({ title: 'Menerapkan Status Kelulusan...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
        const res = await fetch('/api/spmb/kelulusan-massal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ids: selectedIds,
            statusKelulusan: formValues.statusKelulusan,
            catatan: formValues.catatan
          })
        });
        const resJson = await res.json();
        if (resJson.success) {
          const statusLabel = 
            formValues.statusKelulusan === 'diterima' ? 'Diterima' :
            formValues.statusKelulusan === 'cadangan' ? 'Cadangan' :
            formValues.statusKelulusan === 'tidak_diterima' ? 'Tidak Diterima' : 'Dalam Proses';

          Swal.fire({
            icon: 'success',
            title: 'Berhasil!',
            text: `Status kelulusan berhasil diperbarui menjadi "${statusLabel}" untuk ${resJson.updatedCount} siswa terpilih.`,
            timer: 2000,
            showConfirmButton: false
          });
          setData(prev => prev.map(item => selectedIds.includes(item.rowNumber) ? { ...item, statusKelulusan: formValues.statusKelulusan } : item));
          setSelectedIds([]);
          fetchData();
        } else {
          Swal.fire('Gagal', resJson.error || 'Gagal mengubah status kelulusan', 'error');
        }
      } catch (e: any) {
        Swal.fire('Error', 'Gagal menghubungi server', 'error');
      }
    }
  };

  const handleDelete = async (id: string, nama: string) => {
    const result = await Swal.fire({
      title: 'Hapus Data?',
      text: `Yakin ingin menghapus pendaftar ${nama}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'Ya, Hapus!'
    });

    if (result.isConfirmed) {
      try {
        const res = await fetch(`/api/spmb?id=${id}`, { method: 'DELETE' });
        const resJson = await res.json();
        if (resJson.success) {
          Swal.fire('Terhapus!', 'Data berhasil dihapus.', 'success');
          setData(prev => prev.filter(item => item.rowNumber !== id));
        } else {
          Swal.fire('Gagal', resJson.error, 'error');
        }
      } catch (err) {
        Swal.fire('Error', 'Gagal menghapus data.', 'error');
      }
    }
  };

  const handleUpdateStatus = async (id: string, field: 'statusVerifikasi' | 'statusKelulusan' | 'jadwalTes', value: string) => {
    try {
      const res = await fetch(`/api/spmb/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value })
      });
      const resJson = await res.json();
      if (resJson.success) {
        setData(prev => prev.map(item => item.rowNumber === id ? { ...item, [field]: value } : item));
      } else {
        Swal.fire('Gagal', resJson.error || 'Gagal mengubah status', 'error');
      }
    } catch (err) {
      Swal.fire('Error', 'Gagal menghubungi server', 'error');
    }
  };

  const handleUpdateVerifikasiKk = async (id: string, nama: string, newStatus: string) => {
    let catatan = '';
    if (newStatus === 'perbaikan') {
      const { value: text, isConfirmed } = await Swal.fire({
        title: 'Catatan Perbaikan Dokumen KK / Akta',
        text: `Tuliskan catatan perbaikan dokumen identitas / KK untuk ${nama}:`,
        input: 'textarea',
        inputPlaceholder: 'Contoh: Foto KK buram/tidak terbaca, mohon kirim ulang KK yang jelas',
        showCancelButton: true,
        confirmButtonColor: '#059669',
        cancelButtonColor: '#94a3b8',
        confirmButtonText: 'Simpan',
        cancelButtonText: 'Batal'
      });
      if (!isConfirmed) return;
      catatan = text || 'Dokumen KK/Akta belum jelas/lengkap. Silakan unggah ulang atau kirim via WA Panitia.';
    }

    try {
      const res = await fetch(`/api/spmb/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          statusVerifikasi: newStatus,
          catatanVerifikasi: catatan
        })
      });
      const resJson = await res.json();
      if (resJson.success) {
        setData(prev => prev.map(item => item.rowNumber === id ? { ...item, statusVerifikasi: newStatus, catatanVerifikasi: catatan } : item));
      } else {
        Swal.fire('Gagal', resJson.error || 'Gagal mengubah status verifikasi KK', 'error');
      }
    } catch (err) {
      Swal.fire('Error', 'Gagal menghubungi server', 'error');
    }
  };

  const handleUpdateVerifikasiRapor = async (id: string, nama: string, newStatus: string) => {
    let catatan = '';
    if (newStatus === 'perbaikan') {
      const { value: text, isConfirmed } = await Swal.fire({
        title: 'Catatan Perbaikan Berkas Rapor',
        text: `Tuliskan catatan perbaikan berkas rapor untuk ${nama}:`,
        input: 'textarea',
        inputPlaceholder: 'Contoh: FC Rapor semester 2 belum dikumpulkan / nilai tidak terbaca',
        showCancelButton: true,
        confirmButtonColor: '#059669',
        cancelButtonColor: '#94a3b8',
        confirmButtonText: 'Simpan',
        cancelButtonText: 'Batal'
      });
      if (!isConfirmed) return;
      catatan = text || 'Berkas rapor kelas 5 belum lengkap. Silakan serahkan fisik ke madrasah atau kirim file via WA Panitia.';
    }

    try {
      const res = await fetch(`/api/spmb/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          statusVerifikasiRapor: newStatus,
          catatanVerifikasiRapor: catatan
        })
      });
      const resJson = await res.json();
      if (resJson.success) {
        setData(prev => prev.map(item => item.rowNumber === id ? { ...item, statusVerifikasiRapor: newStatus, catatanVerifikasiRapor: catatan } : item));
      } else {
        Swal.fire('Gagal', resJson.error || 'Gagal mengubah status verifikasi rapor', 'error');
      }
    } catch (err) {
      Swal.fire('Error', 'Gagal menghubungi server', 'error');
    }
  };

  const handleEditJadwalTes = async (id: string, nama: string, currentJadwal: string) => {
    const result = await Swal.fire({
      title: 'Atur Jadwal Tes / Observasi',
      html: `
        <div style="text-align: left; font-size: 13px; color: #475569; margin-bottom: 8px;">
          Tentukan jadwal tes/observasi untuk <b>${nama}</b>.<br/>
          Jadwal ini akan langsung ditampilkan di kartu status portal siswa.
        </div>
      `,
      input: 'text',
      inputValue: currentJadwal || '',
      inputPlaceholder: 'Contoh: Sabtu, 24 Mei 2026, Pukul 08.00 WIB (Ruang 1)',
      showCancelButton: true,
      confirmButtonText: 'Simpan Jadwal',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#059669',
      cancelButtonColor: '#94a3b8',
      showDenyButton: !!currentJadwal,
      denyButtonText: 'Hapus / Kosongkan',
      denyButtonColor: '#ef4444'
    });

    if (result.isConfirmed) {
      await handleUpdateStatus(id, 'jadwalTes', result.value || '');
      Swal.fire({ icon: 'success', title: 'Tersimpan!', text: 'Jadwal tes berhasil disimpan.', timer: 1500, showConfirmButton: false });
    } else if (result.isDenied) {
      await handleUpdateStatus(id, 'jadwalTes', '');
      Swal.fire({ icon: 'success', title: 'Dihapus!', text: 'Jadwal tes telah dikosongkan.', timer: 1500, showConfirmButton: false });
    }
  };

  const handleAturJadwalMassal = async () => {
    const jalurs = Array.from(new Set(data.map(d => d.jalurPendaftaran).filter(Boolean)));
    const jalurOptions = ['Semua Jalur', ...jalurs];
    const optionsHtml = jalurOptions.map(j => `<option value="${j}">${j}</option>`).join('');

    const { value: formValues } = await Swal.fire({
      title: 'Atur Jadwal Tes Massal',
      html: `
        <div style="text-align: left; font-size: 13px; color: #475569; margin-bottom: 14px;">
          Atur jadwal tes / observasi serentak untuk pendaftar pada jalur yang dipilih:
        </div>
        <div style="text-align: left; margin-bottom: 12px;">
          <label style="display: block; font-size: 12.5px; font-weight: 700; margin-bottom: 4px; color: #1e293b;">Pilih Target Jalur:</label>
          <select id="swal-target-jalur" class="swal2-input" style="width: 100%; margin: 0; padding: 8px 12px; font-size: 13.5px; border-radius: 8px; box-sizing: border-box;">
            ${optionsHtml}
          </select>
        </div>
        <div style="text-align: left;">
          <label style="display: block; font-size: 12.5px; font-weight: 700; margin-bottom: 4px; color: #1e293b;">Jadwal & Waktu Tes:</label>
          <input id="swal-jadwal-input" class="swal2-input" placeholder="Contoh: Sabtu, 24 Mei 2026, Pukul 08.00 WIB (Ruang 1)" style="width: 100%; margin: 0; padding: 8px 12px; font-size: 13.5px; border-radius: 8px; box-sizing: border-box;" />
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Terapkan Jadwal',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#0284c7',
      cancelButtonColor: '#94a3b8',
      preConfirm: () => {
        const targetJalur = (document.getElementById('swal-target-jalur') as HTMLSelectElement)?.value;
        const jadwalTes = (document.getElementById('swal-jadwal-input') as HTMLInputElement)?.value;
        return { targetJalur, jadwalTes: jadwalTes ? jadwalTes.trim() : '' };
      }
    });

    if (formValues) {
      try {
        Swal.fire({
          title: 'Menerapkan Jadwal...',
          allowOutsideClick: false,
          didOpen: () => Swal.showLoading()
        });

        const res = await fetch('/api/spmb/jadwal-massal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formValues)
        });

        const resJson = await res.json();
        if (resJson.success) {
          Swal.fire({
            icon: 'success',
            title: 'Berhasil!',
            text: `Jadwal tes berhasil diperbarui untuk ${resJson.updatedCount} siswa (${formValues.targetJalur}).`
          });
          fetchData();
        } else {
          Swal.fire('Gagal', resJson.error || 'Gagal menerapkan jadwal', 'error');
        }
      } catch (err: any) {
        Swal.fire('Error', 'Gagal menghubungi server', 'error');
      }
    }
  };

  const handleKelulusanMassal = async () => {
    const jalurs = Array.from(new Set(data.map(d => d.jalurPendaftaran).filter(Boolean)));
    const jalurOptions = ['Semua Jalur', ...jalurs];

    let targetOptionsHtml = '';
    if (selectedIds.length > 0) {
      targetOptionsHtml += `<option value="selected">📌 ${selectedIds.length} Siswa yang Tercentang</option>`;
    }
    targetOptionsHtml += `<option value="filtered">🔍 Semua Siswa Terfilter Saat Ini (${filteredData.length} Siswa)</option>`;
    jalurOptions.forEach(j => {
      const count = j === 'Semua Jalur' ? data.length : data.filter(d => (d.jalurPendaftaran || '').toLowerCase() === j.toLowerCase()).length;
      targetOptionsHtml += `<option value="jalur_${j}">🏷️ Jalur: ${j} (${count} Siswa)</option>`;
    });

    const { value: formValues } = await Swal.fire({
      title: 'Eksekusi Kelulusan Massal',
      html: `
        <div style="text-align: left; font-size: 13px; color: #475569; margin-bottom: 14px;">
          Tentukan status kelulusan pendaftar SPMB secara massal dan serentak:
        </div>

        <div style="text-align: left; margin-bottom: 12px;">
          <label style="display: block; font-size: 12px; font-weight: 700; margin-bottom: 5px; color: #1e293b;">
            1. Target Siswa:
          </label>
          <select id="swal-target-mode" class="swal2-input" style="width: 100%; margin: 0; padding: 9px 12px; font-size: 13px; border-radius: 8px; box-sizing: border-box; border: 1.5px solid #cbd5e1;">
            ${targetOptionsHtml}
          </select>
        </div>

        <div style="text-align: left; margin-bottom: 12px;">
          <label style="display: block; font-size: 12px; font-weight: 700; margin-bottom: 5px; color: #1e293b;">
            2. Ubah Status Kelulusan Menjadi:
          </label>
          <select id="swal-target-status" class="swal2-input" style="width: 100%; margin: 0; padding: 9px 12px; font-size: 13px; border-radius: 8px; box-sizing: border-box; border: 1.5px solid #cbd5e1;">
            <option value="diterima">🟢 Diterima (Lulus)</option>
            <option value="cadangan">🟡 Cadangan</option>
            <option value="tidak_diterima">🔴 Tidak Diterima</option>
            <option value="proses">⚪ Reset ke Dalam Proses</option>
          </select>
        </div>

        <div style="text-align: left; margin-bottom: 12px;">
          <label style="display: flex; align-items: center; gap: 8px; font-size: 12.5px; color: #334155; cursor: pointer;">
            <input type="checkbox" id="swal-only-proses" checked style="width: 16px; height: 16px; accent-color: #059669; cursor: pointer;" />
            <span>Hanya ubah siswa yang statusnya masih <b>Dalam Proses</b></span>
          </label>
          <div style="font-size: 11px; color: #64748b; margin-left: 24px; margin-top: 2px;">
            (Mencegah siswa yang sudah Diterima / Ditolak sebelumnya tertimpa secara tidak sengaja)
          </div>
        </div>

        <div style="text-align: left;">
          <label style="display: block; font-size: 12px; font-weight: 700; margin-bottom: 5px; color: #1e293b;">
            3. Catatan Kelulusan (Opsional):
          </label>
          <input id="swal-target-catatan" class="swal2-input" placeholder="Contoh: Selamat ananda dinyatakan lulus seleksi utama" style="width: 100%; margin: 0; padding: 9px 12px; font-size: 13px; border-radius: 8px; box-sizing: border-box; border: 1.5px solid #cbd5e1;" />
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Eksekusi Sekarang',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#059669',
      cancelButtonColor: '#94a3b8',
      preConfirm: () => {
        const targetMode = (document.getElementById('swal-target-mode') as HTMLSelectElement)?.value;
        const statusKelulusan = (document.getElementById('swal-target-status') as HTMLSelectElement)?.value;
        const onlyProses = (document.getElementById('swal-only-proses') as HTMLInputElement)?.checked;
        const catatan = (document.getElementById('swal-target-catatan') as HTMLInputElement)?.value;
        return { targetMode, statusKelulusan, onlyProses, catatan: (catatan || '').trim() };
      }
    });

    if (formValues) {
      let payload: any = {
        statusKelulusan: formValues.statusKelulusan,
        onlyProses: formValues.onlyProses,
        catatan: formValues.catatan
      };

      if (formValues.targetMode === 'selected') {
        payload.ids = selectedIds;
      } else if (formValues.targetMode === 'filtered') {
        payload.ids = filteredData.map(d => d.rowNumber);
      } else if (formValues.targetMode.startsWith('jalur_')) {
        const jName = formValues.targetMode.replace('jalur_', '');
        payload.targetJalur = jName;
      }

      try {
        Swal.fire({
          title: 'Mengeksekusi Kelulusan...',
          allowOutsideClick: false,
          didOpen: () => Swal.showLoading()
        });

        const res = await fetch('/api/spmb/kelulusan-massal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const resJson = await res.json();
        if (resJson.success) {
          const statusLabel = 
            formValues.statusKelulusan === 'diterima' ? 'Diterima' :
            formValues.statusKelulusan === 'cadangan' ? 'Cadangan' :
            formValues.statusKelulusan === 'tidak_diterima' ? 'Tidak Diterima' : 'Dalam Proses';

          Swal.fire({
            icon: 'success',
            title: 'Berhasil Dieksekusi!',
            text: `Status kelulusan berhasil diperbarui menjadi "${statusLabel}" untuk ${resJson.updatedCount} siswa.`
          });
          setSelectedIds([]);
          fetchData();
        } else {
          Swal.fire('Gagal', resJson.error || 'Gagal mengeksekusi kelulusan', 'error');
        }
      } catch (err: any) {
        Swal.fire('Error', 'Gagal menghubungi server', 'error');
      }
    }
  };

  useEffect(() => {
    const userStr = localStorage.getItem('keren_user_data');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user) {
          const role = (user.role || '').toLowerCase();
          setIsAdmin(role === 'admin' || role.includes('admin'));
        }
      } catch (e) {
        console.error(e);
      }
    }
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/spmb/rekap');
      const result = await res.json();
      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Gagal memuat data dari server.');
    } finally {
      setLoading(false);
    }
  };

  const openViewer = (url: string, title: string) => {
    setViewerUrl(url);
    setViewerTitle(title);
  };

  const closeViewer = () => {
    setViewerUrl(null);
    setViewerTitle('');
  };

  return (
    <div className={styles.container}>
      


      <div className={styles.header}>
        <div className={styles.title}>
          <div className={styles.titleIcon}>
            <i className="fas fa-list-alt"></i>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span>Rekap Pendaftar SPMB</span>
            {!loading && !error && data && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
                <span style={{ fontSize: '0.85rem', color: '#475569', fontWeight: 600 }}>
                  Total: {data.length}
                </span>
                <span style={{ fontSize: '0.78rem', background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }} title="Verifikasi Dokumen Identitas / KK">
                  KK Valid: {data.filter(d => (d.statusVerifikasi || '').toLowerCase() === 'valid').length}
                </span>
                <span style={{ fontSize: '0.78rem', background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }} title="Verifikasi Berkas FC Rapor">
                  Rapor Valid: {data.filter(d => (d.statusVerifikasiRapor || '').toLowerCase() === 'valid').length}
                </span>
                <span style={{ fontSize: '0.78rem', background: '#fef3c7', color: '#b45309', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }} title="Berkas Rapor Belum Lengkap / Belum Dikumpulkan">
                  Rapor Belum: {data.filter(d => (d.statusVerifikasiRapor || '').toLowerCase() !== 'valid' && (d.statusVerifikasiRapor || '').toLowerCase() !== 'perbaikan').length}
                </span>
                {data.some(d => (d.statusVerifikasiRapor || '').toLowerCase() === 'perbaikan') && (
                  <span style={{ fontSize: '0.78rem', background: '#fee2e2', color: '#b91c1c', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>
                    Rapor Perbaikan: {data.filter(d => (d.statusVerifikasiRapor || '').toLowerCase() === 'perbaikan').length}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {isAdmin && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={handleKelulusanMassal}
              style={{
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: 'white',
                border: 'none',
                padding: '9px 18px',
                borderRadius: '10px',
                fontSize: '0.88rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 2px 4px rgba(5, 150, 105, 0.25)'
              }}
            >
              <i className="fas fa-user-graduate"></i> Kelulusan Massal
            </button>

            <button
              type="button"
              onClick={handleAturJadwalMassal}
              style={{
                background: '#0891b2',
                color: 'white',
                border: 'none',
                padding: '9px 18px',
                borderRadius: '10px',
                fontSize: '0.88rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 2px 4px rgba(8, 145, 178, 0.2)'
              }}
            >
              <i className="fas fa-calendar-alt"></i> Jadwal Tes Massal
            </button>

            <button
              type="button"
              onClick={() => setShowPengumumanModal(true)}
              style={{
                background: '#0284c7',
                color: 'white',
                border: 'none',
                padding: '9px 18px',
                borderRadius: '10px',
                fontSize: '0.88rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 2px 4px rgba(2, 132, 199, 0.2)'
              }}
            >
              <i className="fas fa-bullhorn"></i> Pengumuman SPMB
            </button>

            <button
              type="button"
              onClick={() => setShowConfigModal(true)}
              style={{
                background: '#047857',
                color: 'white',
                border: 'none',
                padding: '9px 18px',
                borderRadius: '10px',
                fontSize: '0.88rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 2px 4px rgba(4, 120, 87, 0.2)'
              }}
            >
              <i className="fas fa-sliders-h"></i> Atur Jalur SPMB
            </button>
          </div>
        )}
      </div>

      {/* Filter & Pencarian Bar */}
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '18px 20px',
        marginBottom: '20px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
        border: '1px solid #e2e8f0'
      }}>
        {/* Baris 1: Search Box, Counter & Reset */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '14px',
          flexWrap: 'wrap'
        }}>
          {/* Input Pencarian */}
          <div style={{
            flex: '1 1 300px',
            position: 'relative'
          }}>
            <i className="fas fa-search" style={{
              position: 'absolute',
              left: '14px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#94a3b8',
              fontSize: '14px'
            }}></i>
            <input
              type="text"
              placeholder="Cari nama siswa, no. pendaftaran, NISN, atau asal sekolah..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px 10px 38px',
                borderRadius: '10px',
                border: '1.5px solid #cbd5e1',
                fontSize: '13.5px',
                outline: 'none',
                boxSizing: 'border-box',
                background: '#f8fafc'
              }}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                <i className="fas fa-times"></i>
              </button>
            )}
          </div>

          {/* Counter Badge */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '9px 14px',
            borderRadius: '8px',
            background: '#f1f5f9',
            color: '#334155',
            fontSize: '13px',
            fontWeight: 700
          }}>
            <i className="fas fa-users" style={{ color: '#047857' }}></i>
            <span>{filteredData.length} dari {data.length} Pendaftar</span>
          </div>

          {/* Tombol Reset Filter */}
          {isFiltered && (
            <button
              type="button"
              onClick={handleResetFilter}
              style={{
                background: '#fee2e2',
                border: '1px solid #fecaca',
                color: '#b91c1c',
                padding: '9px 14px',
                borderRadius: '8px',
                fontSize: '12.5px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <i className="fas fa-undo-alt"></i> Reset Filter
            </button>
          )}
        </div>

        {/* Baris 2: Dropdown Filters */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
          gap: '12px'
        }}>
          {/* Filter Jalur */}
          <div>
            <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
              Jalur Pendaftaran
            </label>
            <select
              value={filterJalur}
              onChange={e => setFilterJalur(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1.5px solid #cbd5e1',
                fontSize: '13px',
                background: filterJalur !== 'semua' ? '#ecfdf5' : 'white',
                fontWeight: filterJalur !== 'semua' ? 700 : 500,
                color: filterJalur !== 'semua' ? '#047857' : '#334155',
                outline: 'none',
                cursor: 'pointer',
                boxSizing: 'border-box'
              }}
            >
              <option value="semua">Semua Jalur</option>
              {allJalurOptions.map(j => (
                <option key={j} value={j}>{j}</option>
              ))}
            </select>
          </div>

          {/* Filter Verifikasi KK */}
          <div>
            <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
              Verifikasi KK / Identitas
            </label>
            <select
              value={filterVerifikasiKk}
              onChange={e => setFilterVerifikasiKk(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1.5px solid #cbd5e1',
                fontSize: '13px',
                background: filterVerifikasiKk !== 'semua' ? '#ecfdf5' : 'white',
                fontWeight: filterVerifikasiKk !== 'semua' ? 700 : 500,
                color: filterVerifikasiKk !== 'semua' ? '#047857' : '#334155',
                outline: 'none',
                cursor: 'pointer',
                boxSizing: 'border-box'
              }}
            >
              <option value="semua">Semua KK</option>
              <option value="menunggu">⏳ Menunggu Verifikasi</option>
              <option value="valid">✅ KK Valid</option>
              <option value="perbaikan">⚠️ Perbaikan KK</option>
            </select>
          </div>

          {/* Filter Verifikasi Rapor */}
          <div>
            <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
              Verifikasi FC Rapor
            </label>
            <select
              value={filterVerifikasiRapor}
              onChange={e => setFilterVerifikasiRapor(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1.5px solid #cbd5e1',
                fontSize: '13px',
                background: filterVerifikasiRapor !== 'semua' ? '#ecfdf5' : 'white',
                fontWeight: filterVerifikasiRapor !== 'semua' ? 700 : 500,
                color: filterVerifikasiRapor !== 'semua' ? '#047857' : '#334155',
                outline: 'none',
                cursor: 'pointer',
                boxSizing: 'border-box'
              }}
            >
              <option value="semua">Semua Rapor</option>
              <option value="menunggu">⏳ Belum Dikumpulkan</option>
              <option value="valid">✅ Rapor Valid</option>
              <option value="perbaikan">⚠️ Perbaikan Rapor</option>
            </select>
          </div>

          {/* Filter Jadwal Tes */}
          <div>
            <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
              Jadwal Tes / Observasi
            </label>
            <select
              value={filterJadwal}
              onChange={e => setFilterJadwal(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1.5px solid #cbd5e1',
                fontSize: '13px',
                background: filterJadwal !== 'semua' ? '#e0f2fe' : 'white',
                fontWeight: filterJadwal !== 'semua' ? 700 : 500,
                color: filterJadwal !== 'semua' ? '#0284c7' : '#334155',
                outline: 'none',
                cursor: 'pointer',
                boxSizing: 'border-box'
              }}
            >
              <option value="semua">Semua Jadwal</option>
              <option value="sudah">Sudah Dijadwalkan</option>
              <option value="belum">Belum Dijadwalkan</option>
            </select>
          </div>

          {/* Filter Kelulusan */}
          <div>
            <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
              Status Kelulusan
            </label>
            <select
              value={filterKelulusan}
              onChange={e => setFilterKelulusan(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1.5px solid #cbd5e1',
                fontSize: '13px',
                background: filterKelulusan !== 'semua' ? '#ecfdf5' : 'white',
                fontWeight: filterKelulusan !== 'semua' ? 700 : 500,
                color: filterKelulusan !== 'semua' ? '#047857' : '#334155',
                outline: 'none',
                cursor: 'pointer',
                boxSizing: 'border-box'
              }}
            >
              <option value="semua">Semua Kelulusan</option>
              <option value="proses">Dalam Proses</option>
              <option value="diterima">Diterima</option>
              <option value="cadangan">Cadangan</option>
              <option value="tidak_diterima">Tidak Diterima</option>
            </select>
          </div>

          {/* Urutan Pendaftar */}
          <div>
            <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
              Urutan Pendaftar
            </label>
            <select
              value={sortOrder}
              onChange={e => setSortOrder(e.target.value as any)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1.5px solid #cbd5e1',
                fontSize: '13px',
                background: sortOrder !== 'terbaru' ? '#eff6ff' : 'white',
                fontWeight: sortOrder !== 'terbaru' ? 700 : 500,
                color: sortOrder !== 'terbaru' ? '#1d4ed8' : '#334155',
                outline: 'none',
                cursor: 'pointer',
                boxSizing: 'border-box'
              }}
            >
              <option value="terbaru">⏰ Pendaftar: Terbaru &rarr; Terlama</option>
              <option value="terlama">⏰ Pendaftar: Terlama &rarr; Terbaru</option>
              <option value="asc">🔢 No. Reg: Kecil &rarr; Besar (A-Z)</option>
              <option value="desc">🔢 No. Reg: Besar &rarr; Kecil (Z-A)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Floating / Sticky Bulk Action Bar for Selected Students */}
      {isAdmin && selectedIds.length > 0 && (
        <div style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          color: 'white',
          padding: '14px 20px',
          borderRadius: '14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.25)',
          border: '1px solid #334155',
          flexWrap: 'wrap',
          gap: '12px',
          position: 'sticky',
          top: '12px',
          zIndex: 100
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: '#0284c7',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '13px'
            }}>
              {selectedIds.length}
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '14px' }}>
                {selectedIds.length} Siswa Terpilih
              </div>
              <div style={{ fontSize: '11.5px', color: '#94a3b8' }}>
                Terapkan status kelulusan, jadwal tes, atau kosongkan jadwal secara serentak
              </div>
            </div>
            {selectedIds.length < filteredData.length && (
              <button
                type="button"
                onClick={handleSelectAllFiltered}
                style={{
                  background: 'rgba(2, 132, 199, 0.25)',
                  color: '#38bdf8',
                  border: '1px solid rgba(56, 189, 248, 0.4)',
                  padding: '5px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  marginLeft: '8px'
                }}
              >
                Pilih Semua {filteredData.length} Siswa
              </button>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={handleSetKelulusanSelected}
              style={{
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: 'white',
                border: 'none',
                padding: '9px 16px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 6px rgba(16, 185, 129, 0.3)'
              }}
            >
              <i className="fas fa-user-graduate"></i> Set Kelulusan ({selectedIds.length} Siswa)
            </button>

            <button
              type="button"
              onClick={handleSetJadwalSelected}
              style={{
                background: '#0284c7',
                color: 'white',
                border: 'none',
                padding: '9px 16px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 6px rgba(2, 132, 199, 0.3)'
              }}
            >
              <i className="fas fa-calendar-check"></i> Atur Jadwal ({selectedIds.length} Siswa)
            </button>

            <button
              type="button"
              onClick={handleClearJadwalSelected}
              style={{
                background: '#ef4444',
                color: 'white',
                border: 'none',
                padding: '9px 14px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <i className="fas fa-calendar-times"></i> Kosongkan Jadwal
            </button>

            <button
              type="button"
              onClick={() => setSelectedIds([])}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                color: '#e2e8f0',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                padding: '8px 14px',
                borderRadius: '8px',
                fontSize: '12.5px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Batal
            </button>
          </div>
        </div>
      )}

      <div className={styles.card}>
        {loading ? (
          <div className={styles.loadingState}>
            <i className={`fas fa-spinner ${styles.loadingSpinner}`}></i>
            Mengambil data pendaftar terbaru...
          </div>
        ) : error ? (
          <div className={styles.emptyState}>
            <i className="fas fa-exclamation-triangle" style={{ fontSize: '3rem', color: '#ef4444' }}></i>
            <p>{error}</p>
          </div>
        ) : data.length === 0 ? (
          <div className={styles.emptyState}>
            <i className="fas fa-folder-open" style={{ fontSize: '3rem' }}></i>
            <p>Belum ada data pendaftar yang masuk.</p>
          </div>
        ) : filteredData.length === 0 ? (
          <div className={styles.emptyState}>
            <i className="fas fa-search" style={{ fontSize: '2.5rem', color: '#94a3b8' }}></i>
            <p style={{ marginTop: '12px', fontSize: '15px', fontWeight: 700, color: '#334155' }}>
              Tidak ada pendaftar yang cocok dengan filter.
            </p>
            <p style={{ margin: '4px 0 16px 0', fontSize: '13px', color: '#64748b' }}>
              Coba sesuaikan kata kunci pencarian atau reset filter.
            </p>
            <button
              type="button"
              onClick={handleResetFilter}
              style={{
                background: '#047857',
                color: 'white',
                border: 'none',
                padding: '8px 18px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Reset Filter
            </button>
          </div>
        ) : (
          <>
            <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  {isAdmin && (
                    <th style={{ width: '40px', textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={isCurrentPageAllSelected}
                        onChange={handleSelectAllCurrentPage}
                        style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#047857' }}
                        title="Pilih Semua Siswa di Halaman Ini"
                      />
                    </th>
                  )}
                  <th
                    onClick={() => setSortOrder(prev => prev === 'terbaru' ? 'terlama' : 'terbaru')}
                    style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
                    title="Klik untuk mengubah urutan waktu pendaftaran (terbaru/terlama)"
                  >
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <span>Waktu Daftar</span>
                      {(sortOrder === 'terbaru' || sortOrder === 'terlama') && (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: '#ecfdf5',
                          color: '#047857',
                          border: '1px solid #a7f3d0',
                          borderRadius: '4px',
                          padding: '1px 6px',
                          fontSize: '11px',
                          fontWeight: 700
                        }}>
                          <i className={`fas fa-sort-amount-${sortOrder === 'terlama' ? 'up' : 'down'}`} style={{ marginRight: '4px' }}></i>
                          {sortOrder === 'terlama' ? 'Terlama' : 'Terbaru'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th
                    onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                    style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
                    title="Klik untuk mengubah urutan No. Registrasi"
                  >
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <span>No. Reg & Nama</span>
                      {(sortOrder === 'asc' || sortOrder === 'desc') && (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: '#eff6ff',
                          color: '#1d4ed8',
                          border: '1px solid #bfdbfe',
                          borderRadius: '4px',
                          padding: '1px 6px',
                          fontSize: '11px',
                          fontWeight: 700
                        }}>
                          <i className={`fas fa-sort-numeric-${sortOrder === 'asc' ? 'down' : 'up-alt'}`} style={{ marginRight: '4px' }}></i>
                          {sortOrder === 'asc' ? '1-9' : '9-1'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th>Jalur</th>
                  <th>Verifikasi KK</th>
                  <th>Verifikasi Rapor</th>
                  <th>Jadwal Tes / Observasi</th>
                  <th>Status Kelulusan</th>
                  <th>Asal Sekolah</th>
                  <th>No. WA Ayah</th>
                  <th>No. WA Ibu</th>
                  <th>Berkas</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((item) => (
                  <tr key={item.id} style={{ background: selectedIds.includes(item.rowNumber) ? '#f0fdf4' : undefined }}>
                    {isAdmin && (
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(item.rowNumber)}
                          onChange={() => handleToggleSelect(item.rowNumber)}
                          style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#047857' }}
                        />
                      </td>
                    )}
                    <td>
                      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                        {item.timestamp.split(' ')[0]}
                      </div>
                      <div style={{ fontWeight: 600 }}>
                        {item.timestamp.split(' ')[1]}
                      </div>
                    </td>
                    <td>
                      <div style={{
                        display: 'inline-block',
                        background: '#ecfdf5',
                        color: '#047857',
                        border: '1px solid #a7f3d0',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontSize: '0.78rem',
                        fontWeight: 800,
                        marginBottom: '4px'
                      }}>
                        {item.nomorPendaftaran || '-'}
                      </div>
                      <div style={{ fontWeight: 700 }}>{item.namaLengkap}</div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>NISN: {item.nisn}</div>
                    </td>
                    <td>
                      <span className={`${styles.badge} ${styles[item.jalurPendaftaran] || styles.Reguler}`}>
                        {item.jalurPendaftaran}
                      </span>
                    </td>
                    {/* Verifikasi KK / Identitas */}
                    <td>
                      {isAdmin ? (
                        <select
                          value={item.statusVerifikasi || 'menunggu'}
                          onChange={(e) => handleUpdateVerifikasiKk(item.rowNumber, item.namaLengkap, e.target.value)}
                          style={{
                            padding: '6px 8px',
                            borderRadius: '6px',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            border: '1.5px solid',
                            borderColor: item.statusVerifikasi === 'valid' ? '#86efac' : item.statusVerifikasi === 'perbaikan' ? '#fca5a5' : '#fde68a',
                            background: item.statusVerifikasi === 'valid' ? '#f0fdf4' : item.statusVerifikasi === 'perbaikan' ? '#fef2f2' : '#fffbeb',
                            color: item.statusVerifikasi === 'valid' ? '#15803d' : item.statusVerifikasi === 'perbaikan' ? '#b91c1c' : '#b45309',
                            cursor: 'pointer',
                            outline: 'none'
                          }}
                          title="Klik untuk mengubah status verifikasi identitas / KK"
                        >
                          <option value="menunggu">⏳ Menunggu</option>
                          <option value="valid">✅ Valid</option>
                          <option value="perbaikan">⚠️ Perbaikan</option>
                        </select>
                      ) : (
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '6px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          background: item.statusVerifikasi === 'valid' ? '#dcfce7' : item.statusVerifikasi === 'perbaikan' ? '#fee2e2' : '#fef3c7',
                          color: item.statusVerifikasi === 'valid' ? '#15803d' : item.statusVerifikasi === 'perbaikan' ? '#b91c1c' : '#b45309'
                        }}>
                          {item.statusVerifikasi === 'valid' ? 'Valid' : item.statusVerifikasi === 'perbaikan' ? 'Perbaikan' : 'Menunggu'}
                        </span>
                      )}
                      {item.catatanVerifikasi && (
                        <div style={{ fontSize: '11px', color: '#b91c1c', marginTop: '4px', fontWeight: 600 }}>
                          Catatan: {item.catatanVerifikasi}
                        </div>
                      )}
                    </td>

                    {/* Verifikasi FC Rapor */}
                    <td>
                      {isAdmin ? (
                        <select
                          value={item.statusVerifikasiRapor || 'menunggu'}
                          onChange={(e) => handleUpdateVerifikasiRapor(item.rowNumber, item.namaLengkap, e.target.value)}
                          style={{
                            padding: '6px 8px',
                            borderRadius: '6px',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            border: '1.5px solid',
                            borderColor: item.statusVerifikasiRapor === 'valid' ? '#86efac' : item.statusVerifikasiRapor === 'perbaikan' ? '#fca5a5' : '#fde68a',
                            background: item.statusVerifikasiRapor === 'valid' ? '#f0fdf4' : item.statusVerifikasiRapor === 'perbaikan' ? '#fef2f2' : '#fffbeb',
                            color: item.statusVerifikasiRapor === 'valid' ? '#15803d' : item.statusVerifikasiRapor === 'perbaikan' ? '#b91c1c' : '#b45309',
                            cursor: 'pointer',
                            outline: 'none'
                          }}
                          title="Klik untuk mengubah status verifikasi berkas FC Rapor Kelas 5"
                        >
                          <option value="menunggu">⏳ Belum</option>
                          <option value="valid">✅ Valid</option>
                          <option value="perbaikan">⚠️ Perbaikan</option>
                        </select>
                      ) : (
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '6px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          background: item.statusVerifikasiRapor === 'valid' ? '#dcfce7' : item.statusVerifikasiRapor === 'perbaikan' ? '#fee2e2' : '#fef3c7',
                          color: item.statusVerifikasiRapor === 'valid' ? '#15803d' : item.statusVerifikasiRapor === 'perbaikan' ? '#b91c1c' : '#b45309'
                        }}>
                          {item.statusVerifikasiRapor === 'valid' ? 'Valid' : item.statusVerifikasiRapor === 'perbaikan' ? 'Perbaikan' : 'Belum'}
                        </span>
                      )}
                      {item.catatanVerifikasiRapor && (
                        <div style={{ fontSize: '11px', color: '#b91c1c', marginTop: '4px', fontWeight: 600 }}>
                          Catatan: {item.catatanVerifikasiRapor}
                        </div>
                      )}
                    </td>
                    <td>
                      {isAdmin ? (
                        <div>
                          {item.jadwalTes ? (
                            <button
                              type="button"
                              onClick={() => handleEditJadwalTes(item.rowNumber, item.namaLengkap, item.jadwalTes)}
                              style={{
                                padding: '4px 8px',
                                borderRadius: '6px',
                                fontSize: '0.78rem',
                                fontWeight: 700,
                                background: '#e0f2fe',
                                color: '#0369a1',
                                border: '1px solid #bae6fd',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                textAlign: 'left',
                                maxWidth: '180px'
                              }}
                              title="Klik untuk mengubah atau menghapus jadwal tes"
                            >
                              <i className="fas fa-calendar-alt"></i>
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.jadwalTes}</span>
                              <i className="fas fa-pen" style={{ fontSize: '9px', opacity: 0.7 }}></i>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleEditJadwalTes(item.rowNumber, item.namaLengkap, '')}
                              style={{
                                padding: '4px 8px',
                                borderRadius: '6px',
                                fontSize: '0.78rem',
                                fontWeight: 600,
                                background: '#f8fafc',
                                color: '#64748b',
                                border: '1px dashed #cbd5e1',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                              title="Klik untuk menentukan jadwal tes"
                            >
                              <i className="fas fa-plus-circle" style={{ color: '#0284c7' }}></i>
                              <span>Atur Jadwal</span>
                            </button>
                          )}
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: item.jadwalTes ? '#0369a1' : '#94a3b8', fontWeight: item.jadwalTes ? 700 : 400 }}>
                          {item.jadwalTes || '-'}
                        </span>
                      )}
                    </td>
                    <td>
                      {isAdmin ? (
                        <select
                          value={item.statusKelulusan || 'proses'}
                          onChange={(e) => handleUpdateStatus(item.rowNumber, 'statusKelulusan', e.target.value)}
                          style={{
                            padding: '5px 8px',
                            borderRadius: '6px',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            border: '1px solid',
                            borderColor: item.statusKelulusan === 'diterima' ? '#86efac' : item.statusKelulusan === 'tidak_diterima' ? '#fca5a5' : '#cbd5e1',
                            background: item.statusKelulusan === 'diterima' ? '#f0fdf4' : item.statusKelulusan === 'tidak_diterima' ? '#fef2f2' : '#f8fafc',
                            color: item.statusKelulusan === 'diterima' ? '#15803d' : item.statusKelulusan === 'tidak_diterima' ? '#b91c1c' : '#475569',
                            cursor: 'pointer',
                            outline: 'none'
                          }}
                        >
                          <option value="proses">Dalam Proses</option>
                          <option value="diterima">Diterima</option>
                          <option value="cadangan">Cadangan</option>
                          <option value="tidak_diterima">Tidak Diterima</option>
                        </select>
                      ) : (
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '6px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          background: item.statusKelulusan === 'diterima' ? '#dcfce7' : item.statusKelulusan === 'tidak_diterima' ? '#fee2e2' : '#f1f5f9',
                          color: item.statusKelulusan === 'diterima' ? '#15803d' : item.statusKelulusan === 'tidak_diterima' ? '#b91c1c' : '#64748b'
                        }}>
                          {item.statusKelulusan === 'diterima' ? 'Diterima' : item.statusKelulusan === 'tidak_diterima' ? 'Tidak Diterima' : item.statusKelulusan === 'cadangan' ? 'Cadangan' : 'Proses'}
                        </span>
                      )}
                    </td>
                    <td>{item.asalSekolah}</td>
                    <td>
                      {item.nomorWaAyah ? (
                        <a href={`https://wa.me/${item.nomorWaAyah.replace(/\D/g,'')}`} target="_blank" rel="noreferrer" style={{ color: '#16a34a', fontWeight: 600, textDecoration: 'none' }}>
                          <i className="fab fa-whatsapp" style={{ marginRight: 4 }}></i>{item.nomorWaAyah}
                        </a>
                      ) : '-'}
                    </td>
                    <td>
                      {item.nomorWaIbu ? (
                        <a href={`https://wa.me/${item.nomorWaIbu.replace(/\D/g,'')}`} target="_blank" rel="noreferrer" style={{ color: '#16a34a', fontWeight: 600, textDecoration: 'none' }}>
                          <i className="fab fa-whatsapp" style={{ marginRight: 4 }}></i>{item.nomorWaIbu}
                        </a>
                      ) : '-'}
                    </td>
                    <td>
                      <div className={styles.actionGroup}>
                        {item.linkKk ? (
                          <button onClick={() => openViewer(item.linkKk, `KK - ${item.namaLengkap}`)} className={styles.btnView} title="Lihat KK">
                            <i className="fas fa-id-card"></i> KK
                          </button>
                        ) : null}
                        {item.linkAkta ? (
                          <button onClick={() => openViewer(item.linkAkta, `Akta - ${item.namaLengkap}`)} className={styles.btnView} title="Lihat Akta">
                            <i className="fas fa-child"></i> Akta
                          </button>
                        ) : null}
                      </div>
                    </td>
                    <td>
                      {isAdmin ? (
                        <div style={{ display: 'flex', gap: '8px', flexDirection: 'column' }}>
                          <button onClick={() => openViewer(`/spmb/cetak/${item.rowNumber}`, `Cetak Kartu - ${item.namaLengkap}`)} className={styles.btnPrint}>
                            <i className="fas fa-print"></i> Cetak Kartu
                          </button>
                          <button 
                            onClick={() => router.push(`/spmb/edit/${item.rowNumber}`)} 
                            style={{ padding: '6px 12px', background: '#f59e0b', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginBottom: '6px' }}
                          >
                            <i className="fas fa-edit"></i> Edit Data
                          </button>
                          <button 
                            onClick={() => handleDelete(item.rowNumber, item.namaLengkap)} 
                            style={{ padding: '6px 12px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                          >
                            <i className="fas fa-trash"></i> Hapus
                          </button>
                        </div>
                      ) : (
                        <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.78rem', fontStyle: 'italic', padding: '6px', background: '#f8fafc', borderRadius: '6px', border: '1px dashed #cbd5e1' }}>
                          <i className="fas fa-eye" style={{ marginRight: '4px' }}></i> Hanya Lihat
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {filteredData.length > 0 && (
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '14px 20px',
              borderTop: '1px solid #e2e8f0',
              background: '#f8fafc',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              <div style={{ fontSize: '13px', color: '#475569', display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontWeight: 600 }}>Tampilkan:</span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    style={{
                      padding: '5px 10px',
                      borderRadius: '6px',
                      border: '1.5px solid #cbd5e1',
                      outline: 'none',
                      background: 'white',
                      color: '#334155',
                      fontWeight: 600,
                      fontSize: '13px',
                      cursor: 'pointer'
                    }}
                  >
                    <option value={10}>10 per halaman</option>
                    <option value={20}>20 per halaman</option>
                    <option value={50}>50 per halaman</option>
                    <option value={100}>100 per halaman</option>
                  </select>
                </div>
                <span>
                  Menampilkan <b>{startIndex + 1} - {endIndex}</b> dari <b>{filteredData.length}</b> pendaftar
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={safeCurrentPage === 1}
                  style={{
                    padding: '6px 12px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    background: safeCurrentPage === 1 ? '#f1f5f9' : 'white',
                    cursor: safeCurrentPage === 1 ? 'not-allowed' : 'pointer',
                    color: safeCurrentPage === 1 ? '#94a3b8' : '#334155',
                    fontSize: '13px',
                    fontWeight: 600,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <i className="fas fa-chevron-left" style={{ fontSize: '11px' }}></i> Sebelumnya
                </button>

                {getPageNumbers().map((page, idx) => (
                  typeof page === 'number' ? (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setCurrentPage(page)}
                      style={{
                        minWidth: '34px',
                        height: '34px',
                        padding: '0 8px',
                        border: safeCurrentPage === page ? 'none' : '1px solid #cbd5e1',
                        borderRadius: '6px',
                        background: safeCurrentPage === page ? '#047857' : 'white',
                        color: safeCurrentPage === page ? 'white' : '#334155',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: safeCurrentPage === page ? 700 : 500,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: safeCurrentPage === page ? '0 2px 4px rgba(4, 120, 87, 0.25)' : 'none'
                      }}
                    >
                      {page}
                    </button>
                  ) : (
                    <span key={idx} style={{ padding: '0 6px', color: '#94a3b8', fontSize: '13px', userSelect: 'none' }}>
                      {page}
                    </span>
                  )
                ))}

                <button
                  type="button"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={safeCurrentPage >= totalPages}
                  style={{
                    padding: '6px 12px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    background: safeCurrentPage >= totalPages ? '#f1f5f9' : 'white',
                    cursor: safeCurrentPage >= totalPages ? 'not-allowed' : 'pointer',
                    color: safeCurrentPage >= totalPages ? '#94a3b8' : '#334155',
                    fontSize: '13px',
                    fontWeight: 600,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  Selanjutnya <i className="fas fa-chevron-right" style={{ fontSize: '11px' }}></i>
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>

      {/* Document Viewer Modal */}
      {viewerUrl && (
        <div className={styles.modalOverlay} onClick={closeViewer}>
          <div className={styles.modalContent} style={{ maxWidth: viewerUrl.includes('/cetak') ? '800px' : '1000px' }} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitle}>{viewerTitle}</div>
              <button className={styles.closeBtn} onClick={closeViewer}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className={styles.modalBody}>
              <iframe 
                src={viewerUrl.includes('/cetak') ? viewerUrl : viewerUrl.replace('/view?usp=drivesdk', '/preview')} 
                className={styles.iframe}
                allow="autoplay; clipboard-write"
              ></iframe>
            </div>
          </div>
        </div>
      )}

      {/* Modal Pengaturan Jalur SPMB */}
      <ModalAturJalur
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
      />

      {/* Modal Pengumuman SPMB */}
      <ModalPengumumanSpmb
        isOpen={showPengumumanModal}
        onClose={() => setShowPengumumanModal(false)}
      />

    </div>
  );
}
