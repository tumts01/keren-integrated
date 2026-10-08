'use client';
import { useState, useEffect, useMemo } from 'react';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';

interface PoinRecord {
  id: string;
  tanggal: string;
  timestamp: string;
  namaSiswa: string;
  kelas: string;
  tipe: 'Apresiasi' | 'Pelanggaran';
  keterangan: string;
  poin: number;
  petugas: string;
  dbId?: number;
}

interface Siswa {
  id: string;
  nama: string;
  rombel: string;
}

export default function PoinSiswaPage() {
  const [data, setData] = useState<PoinRecord[]>([]);
  const [siswaList, setSiswaList] = useState<Siswa[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'input' | 'riwayat' | 'rekap'>('input');
  
  // Form States
  const [tipe, setTipe] = useState<'Apresiasi' | 'Pelanggaran'>('Apresiasi');
  const [searchSiswa, setSearchSiswa] = useState('');
  const [selectedSiswa, setSelectedSiswa] = useState<Siswa | null>(null);
  const [keterangan, setKeterangan] = useState('');
  const [poin, setPoin] = useState(5);
  const [tanggal, setTanggal] = useState(new Date().toISOString().slice(0, 10));
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter States
  const [filterBulan, setFilterBulan] = useState('Semua');
  const [filterKelas, setFilterKelas] = useState('Semua');
  const [filterTipe, setFilterTipe] = useState('Semua');
  const [searchRiwayat, setSearchRiwayat] = useState('');

  const [userName, setUserName] = useState('');

  useEffect(() => {
    const userStr = localStorage.getItem('keren_user_data');
    if (userStr) {
      try {
        const u = JSON.parse(userStr);
        setUserName(u.nama || '');
      } catch (e) {}
    }
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resPoin, resSiswa] = await Promise.all([
        fetch('/api/poin-siswa').then(r => r.json()),
        fetch('/api/siswa').then(r => r.json())
      ]);
      
      if (resPoin.success) setData(resPoin.data);
      if (resSiswa.success) {
        setSiswaList(resSiswa.data.filter((s: any) => s.isLatest && s.status?.toLowerCase() === 'aktif'));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredSiswaList = useMemo(() => {
    if (!searchSiswa.trim()) return [];
    return siswaList.filter(s => s.nama.toLowerCase().includes(searchSiswa.toLowerCase())).slice(0, 5);
  }, [searchSiswa, siswaList]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSiswa || !keterangan || !poin || !tanggal) {
      Swal.fire('Error', 'Lengkapi semua data form!', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        tanggal,
        namaSiswa: selectedSiswa.nama,
        kelas: selectedSiswa.rombel,
        tipe,
        keterangan,
        poin: tipe === 'Pelanggaran' ? -Math.abs(poin) : Math.abs(poin),
        petugas: userName
      };

      const res = await fetch('/api/poin-siswa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      
      if (json.success) {
        Swal.fire('Berhasil!', `Data ${tipe} berhasil ditambahkan.`, 'success');
        setSearchSiswa('');
        setSelectedSiswa(null);
        setKeterangan('');
        setPoin(5);
        fetchData();
      } else {
        Swal.fire('Gagal', json.error, 'error');
      }
    } catch (err) {
      Swal.fire('Error', 'Terjadi kesalahan sistem.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    const result = await Swal.fire({
      title: 'Hapus Data?',
      text: 'Data yang dihapus tidak dapat dikembalikan.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Ya, Hapus'
    });

    if (result.isConfirmed) {
      try {
        const res = await fetch(`/api/poin-siswa?id=${id}`, { method: 'DELETE' });
        const json = await res.json();
        if (json.success) {
          Swal.fire('Terhapus!', 'Data berhasil dihapus.', 'success');
          setData(prev => prev.filter(item => item.id !== id));
        } else {
          Swal.fire('Gagal', json.error, 'error');
        }
      } catch (err) {
        Swal.fire('Error', 'Gagal menghapus data.', 'error');
      }
    }
  };

  const riwayatData = useMemo(() => {
    return data.filter(r => {
      if (filterTipe !== 'Semua' && r.tipe !== filterTipe) return false;
      if (filterKelas !== 'Semua' && r.kelas !== filterKelas) return false;
      if (filterBulan !== 'Semua') {
        const m = new Date(r.tanggal).getMonth() + 1;
        if (m.toString() !== filterBulan) return false;
      }
      if (searchRiwayat) {
        return r.namaSiswa.toLowerCase().includes(searchRiwayat.toLowerCase()) || 
               r.keterangan.toLowerCase().includes(searchRiwayat.toLowerCase());
      }
      return true;
    });
  }, [data, filterTipe, filterKelas, filterBulan, searchRiwayat]);

  const rekapData = useMemo(() => {
    const map: Record<string, { nama: string, kelas: string, apresiasi: number, pelanggaran: number, total: number }> = {};
    data.forEach(r => {
      const key = `${r.namaSiswa}_${r.kelas}`;
      if (!map[key]) map[key] = { nama: r.namaSiswa, kelas: r.kelas, apresiasi: 0, pelanggaran: 0, total: 0 };
      if (r.tipe === 'Apresiasi') {
        map[key].apresiasi += Math.abs(r.poin);
      } else {
        map[key].pelanggaran += Math.abs(r.poin);
      }
    });
    return Object.values(map).map(m => ({
      ...m,
      total: m.apresiasi - m.pelanggaran
    })).sort((a, b) => b.total - a.total); // Sort by highest points
  }, [data]);

  const uniqueKelas = Array.from(new Set(siswaList.map(s => s.rombel))).sort();

  const handleExportRiwayat = () => {
    const rows = riwayatData.map((r, i) => ({
      'No': i + 1,
      'Tanggal': r.tanggal,
      'Tipe': r.tipe,
      'Nama Siswa': r.namaSiswa,
      'Kelas': r.kelas,
      'Keterangan': r.keterangan,
      'Poin': Math.abs(r.poin),
      'Petugas': r.petugas
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Riwayat Poin");
    XLSX.writeFile(wb, `Riwayat_Poin_Siswa_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  const handleExportRekap = () => {
    const rows = rekapData.map((r, i) => ({
      'No': i + 1,
      'Nama Siswa': r.nama,
      'Kelas': r.kelas,
      'Total Apresiasi': r.apresiasi,
      'Total Pelanggaran': r.pelanggaran,
      'Poin Bersih': r.total
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Rekap Poin");
    XLSX.writeFile(wb, `Rekap_Poin_Siswa_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  if (loading) {
    return <div className="p-6 text-center text-gray-500">Memuat data...</div>;
  }

  return (
    <div className="p-4 md:p-6 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Apresiasi & Pelanggaran</h1>
          <p className="text-gray-500 text-sm mt-1">Kelola poin apresiasi dan catatan pelanggaran siswa</p>
        </div>
      </div>

      <div className="flex gap-2 mb-6 border-b border-gray-200">
        <button 
          onClick={() => setActiveTab('input')} 
          className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 ${activeTab === 'input' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          <i className="fas fa-edit mr-2"></i> Input Data
        </button>
        <button 
          onClick={() => setActiveTab('riwayat')} 
          className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 ${activeTab === 'riwayat' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          <i className="fas fa-history mr-2"></i> Riwayat Input
        </button>
        <button 
          onClick={() => setActiveTab('rekap')} 
          className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 ${activeTab === 'rekap' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          <i className="fas fa-chart-bar mr-2"></i> Rekap Poin
        </button>
      </div>

      {activeTab === 'input' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 max-w-2xl">
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Tipe Data</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="tipe" checked={tipe === 'Apresiasi'} onChange={() => { setTipe('Apresiasi'); setPoin(5); }} className="w-4 h-4 text-blue-600" />
                  <span className="font-medium text-blue-700">Apresiasi</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="tipe" checked={tipe === 'Pelanggaran'} onChange={() => { setTipe('Pelanggaran'); setPoin(5); }} className="w-4 h-4 text-red-600" />
                  <span className="font-medium text-red-700">Pelanggaran</span>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Tanggal</label>
                <input 
                  type="date" 
                  value={tanggal} 
                  onChange={e => setTanggal(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
              </div>
              <div className="relative">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Cari Siswa</label>
                {!selectedSiswa ? (
                  <>
                    <input 
                      type="text" 
                      value={searchSiswa} 
                      onChange={e => setSearchSiswa(e.target.value)}
                      placeholder="Ketik nama siswa..."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                    {filteredSiswaList.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg">
                        {filteredSiswaList.map(s => (
                          <div 
                            key={s.id} 
                            onClick={() => setSelectedSiswa(s)}
                            className="px-4 py-2 hover:bg-blue-50 cursor-pointer border-b last:border-0"
                          >
                            <div className="font-medium text-sm text-gray-800">{s.nama}</div>
                            <div className="text-xs text-gray-500">Kelas {s.rombel}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex items-center justify-between px-4 py-2 border border-green-500 bg-green-50 rounded-lg">
                    <div>
                      <div className="font-medium text-sm text-green-800">{selectedSiswa.nama}</div>
                      <div className="text-xs text-green-600">Kelas {selectedSiswa.rombel}</div>
                    </div>
                    <button type="button" onClick={() => setSelectedSiswa(null)} className="text-green-700 hover:text-green-900">
                      <i className="fas fa-times"></i>
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Keterangan {tipe}
              </label>
              <input 
                type="text" 
                value={keterangan} 
                onChange={e => setKeterangan(e.target.value)}
                placeholder={tipe === 'Apresiasi' ? 'Contoh: Juara 1 Lomba Pidato' : 'Contoh: Terlambat masuk kelas, Membuang sampah sembarangan'}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Poin {tipe}
              </label>
              <select 
                value={poin} 
                onChange={e => setPoin(Number(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value={5}>{tipe === 'Apresiasi' ? '+5 Poin (Ringan)' : '-5 Poin (Ringan)'}</option>
                <option value={10}>{tipe === 'Apresiasi' ? '+10 Poin (Sedang)' : '-10 Poin (Sedang)'}</option>
                <option value={15}>{tipe === 'Apresiasi' ? '+15 Poin (Tinggi)' : '-15 Poin (Berat)'}</option>
                <option value={20}>{tipe === 'Apresiasi' ? '+20 Poin (Sangat Tinggi)' : '-20 Poin (Sangat Berat)'}</option>
                <option value={50}>{tipe === 'Apresiasi' ? '+50 Poin (Luar Biasa)' : '-50 Poin (Fatal)'}</option>
              </select>
            </div>

            <button 
              type="submit" 
              disabled={isSubmitting || !selectedSiswa}
              className="mt-2 w-full py-2.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? 'Menyimpan...' : 'Simpan Data'}
            </button>
          </form>
        </div>
      )}

      {activeTab === 'riwayat' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex flex-wrap gap-4 items-center justify-between">
            <div className="flex flex-wrap gap-3">
              <select value={filterTipe} onChange={e => setFilterTipe(e.target.value)} className="px-3 py-1.5 border border-gray-300 rounded-md text-sm outline-none">
                <option value="Semua">Semua Tipe</option>
                <option value="Apresiasi">Apresiasi</option>
                <option value="Pelanggaran">Pelanggaran</option>
              </select>
              <select value={filterKelas} onChange={e => setFilterKelas(e.target.value)} className="px-3 py-1.5 border border-gray-300 rounded-md text-sm outline-none">
                <option value="Semua">Semua Kelas</option>
                {uniqueKelas.map(k => <option key={k} value={k}>{k}</option>)}
              </select>
              <select value={filterBulan} onChange={e => setFilterBulan(e.target.value)} className="px-3 py-1.5 border border-gray-300 rounded-md text-sm outline-none">
                <option value="Semua">Semua Bulan</option>
                {Array.from({length: 12}).map((_, i) => (
                  <option key={i+1} value={(i+1).toString()}>{new Date(2000, i).toLocaleString('id-ID', {month:'long'})}</option>
                ))}
              </select>
              <input 
                type="text" 
                value={searchRiwayat}
                onChange={e => setSearchRiwayat(e.target.value)}
                placeholder="Cari siswa/keterangan..." 
                className="px-3 py-1.5 border border-gray-300 rounded-md text-sm outline-none min-w-[200px]"
              />
            </div>
            <button onClick={handleExportRiwayat} className="px-4 py-1.5 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 flex items-center gap-2">
              <i className="fas fa-file-excel"></i> Export Excel
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-600">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-center">No</th>
                  <th className="px-4 py-3">Tanggal</th>
                  <th className="px-4 py-3">Tipe</th>
                  <th className="px-4 py-3">Nama Siswa</th>
                  <th className="px-4 py-3">Kelas</th>
                  <th className="px-4 py-3">Keterangan</th>
                  <th className="px-4 py-3 text-center">Poin</th>
                  <th className="px-4 py-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {riwayatData.length > 0 ? riwayatData.map((r, i) => (
                  <tr key={r.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 text-center">{i + 1}</td>
                    <td className="px-4 py-3">{r.tanggal}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs rounded-full font-medium ${r.tipe === 'Apresiasi' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>
                        {r.tipe}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">{r.namaSiswa}</td>
                    <td className="px-4 py-3">{r.kelas}</td>
                    <td className="px-4 py-3">{r.keterangan}</td>
                    <td className={`px-4 py-3 text-center font-bold ${r.tipe === 'Apresiasi' ? 'text-blue-600' : 'text-red-600'}`}>
                      {r.tipe === 'Apresiasi' ? '+' : '-'}{Math.abs(r.poin)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => handleDelete(r.id)} className="text-red-500 hover:text-red-700 p-1">
                        <i className="fas fa-trash"></i>
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-gray-500">Data tidak ditemukan.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'rekap' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex justify-between items-center">
            <h3 className="font-semibold text-gray-700">Rekapitulasi Poin Siswa</h3>
            <button onClick={handleExportRekap} className="px-4 py-1.5 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 flex items-center gap-2">
              <i className="fas fa-file-excel"></i> Export Rekap
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-600">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-center">Peringkat</th>
                  <th className="px-4 py-3">Nama Siswa</th>
                  <th className="px-4 py-3">Kelas</th>
                  <th className="px-4 py-3 text-center">Total Apresiasi</th>
                  <th className="px-4 py-3 text-center">Total Pelanggaran</th>
                  <th className="px-4 py-3 text-center bg-gray-100">Poin Bersih</th>
                </tr>
              </thead>
              <tbody>
                {rekapData.length > 0 ? rekapData.map((r, i) => (
                  <tr key={i} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 text-center font-bold text-gray-400">#{i + 1}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{r.nama}</td>
                    <td className="px-4 py-3">{r.kelas}</td>
                    <td className="px-4 py-3 text-center text-blue-600">+{r.apresiasi}</td>
                    <td className="px-4 py-3 text-center text-red-600">-{r.pelanggaran}</td>
                    <td className={`px-4 py-3 text-center font-bold bg-gray-50 ${r.total > 0 ? 'text-blue-700' : r.total < 0 ? 'text-red-700' : 'text-gray-500'}`}>
                      {r.total > 0 ? '+' : ''}{r.total}
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">Belum ada data rekap.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
