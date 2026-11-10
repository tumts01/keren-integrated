export interface CabangLombaConfig {
  id: string;
  nama: string;
  kategori: 'Olimpiade Akademik' | 'Lomba Seni';
  label: string;
  satuan: 'peserta' | 'grup' | 'tim';
  biaya: number;
}

export const CABANG_AKADEMIK = ['Matematika', 'IPAS', 'PAI', 'Inggris', 'Arab'];
export const CABANG_SENI_CANONICAL = ['Singer Solo', 'Al Banjari', 'SMS'] as const;
export type CabangSeniName = (typeof CABANG_SENI_CANONICAL)[number];

export interface KriteriaAspekJuri {
  id: string;
  nama: string;
  bobotMaks: number;
  keterangan?: string;
}

export interface TabelPenilaianCabangConfig {
  cabang: string;
  modeHitung: 'sum' | 'avg'; // 'sum' = jumlah seluruh aspek, 'avg' = rata-rata aspek
  tampilkanCatatan: boolean;
  aspek: KriteriaAspekJuri[];
}

export const DEFAULT_TABEL_PENILAIAN_SENI: Record<string, TabelPenilaianCabangConfig> = {
  'Singer Solo': {
    cabang: 'Singer Solo',
    modeHitung: 'sum',
    tampilkanCatatan: true,
    aspek: [
      { id: 'vokal', nama: 'Materi Suara / Vokal', bobotMaks: 30, keterangan: 'Kejernihan, warna suara, dan jangkauan nada' },
      { id: 'teknik', nama: 'Teknik (Intonasi & Artikulasi)', bobotMaks: 40, keterangan: 'Ketepatan nada, pernapasan, dan pelafalan lirik' },
      { id: 'penampilan', nama: 'Penghayatan & Penampilan', bobotMaks: 30, keterangan: 'Ekspresi, penguasaan panggung, dan adab busana' }
    ]
  },
  'Al Banjari': {
    cabang: 'Al Banjari',
    modeHitung: 'sum',
    tampilkanCatatan: true,
    aspek: [
      { id: 'vokal', nama: 'Vokal, Koor & Fashohah', bobotMaks: 40, keterangan: 'Kepaduan suara, makharijul huruf, dan lagu' },
      { id: 'terbang', nama: 'Irama & Teknik Banjari', bobotMaks: 35, keterangan: 'Ketukan rebana, variasi pukulan, dan tempo' },
      { id: 'adab', nama: 'Adab & Kekompakan Grup', bobotMaks: 25, keterangan: 'Keserasian kostum, adab tampil, dan durasi' }
    ]
  },
  'SMS': {
    cabang: 'SMS',
    modeHitung: 'sum',
    tampilkanCatatan: true,
    aspek: [
      { id: 'sandi', nama: 'Ketepatan Sandi', bobotMaks: 35, keterangan: 'Kebenaran jawaban pemecahan sandi pramuka' },
      { id: 'morse', nama: 'Ketepatan Morse', bobotMaks: 35, keterangan: 'Ketepatan pengiriman dan penerimaan isyarat morse' },
      { id: 'semaphore', nama: 'Semaphore & Kecepatan Waktu', bobotMaks: 30, keterangan: 'Ketepatan gerakan bendera semaphore & kecepatan tim' }
    ]
  }
};

export function normalizeCabangSeni(raw: string): string {
  const l = (raw || '').toLowerCase().trim();
  if (l.includes('singer') || l.includes('solo') || l.includes('menyanyi')) return 'Singer Solo';
  if (l.includes('banjari') || l.includes('shalawat') || l.includes('sholawat')) return 'Al Banjari';
  if (l.includes('sms') || l.includes('sandi') || l.includes('morse') || l.includes('semaphore')) return 'SMS';
  return raw.trim();
}

export interface ItemBukaTutupConfig {
  id: string;
  nama: string;
  kategori: 'Olimpiade Akademik' | 'Lomba Seni';
  label: string;
  keterangan: string;
  cabangTerkait: string[];
  satuan: 'peserta' | 'grup' | 'tim';
}

export const DAFTAR_ITEM_BUKA_TUTUP: ItemBukaTutupConfig[] = [
  {
    id: 'Olimpiade Akademik',
    nama: 'Olimpiade Akademik',
    kategori: 'Olimpiade Akademik',
    label: 'Olimpiade Akademik',
    keterangan: 'Mencakup semua bidang: Matematika, IPAS, PAI, B. Inggris, dan B. Arab',
    cabangTerkait: ['Matematika', 'IPAS', 'PAI', 'Inggris', 'Arab'],
    satuan: 'peserta'
  },
  {
    id: 'Singer (solo)',
    nama: 'Singer (solo)',
    kategori: 'Lomba Seni',
    label: 'Singer (Solo)',
    keterangan: 'Lomba menyanyi tunggal',
    cabangTerkait: ['Singer (solo)'],
    satuan: 'peserta'
  },
  {
    id: 'Al Banjari',
    nama: 'Al Banjari',
    kategori: 'Lomba Seni',
    label: 'Al-Banjari (Grup)',
    keterangan: 'Festival Shalawat Al-Banjari',
    cabangTerkait: ['Al Banjari'],
    satuan: 'grup'
  },
  {
    id: 'Sandi Morse Semaphore (SMS)',
    nama: 'Sandi Morse Semaphore (SMS)',
    kategori: 'Lomba Seni',
    label: 'Pramuka SMS (Tim)',
    keterangan: 'Sandi, Morse, dan Semaphore',
    cabangTerkait: ['Sandi Morse Semaphore (SMS)'],
    satuan: 'tim'
  }
];

export const DAFTAR_CABANG_LOMBA: CabangLombaConfig[] = [
  { id: 'Matematika', nama: 'Matematika', kategori: 'Olimpiade Akademik', label: 'Matematika', satuan: 'peserta', biaya: 0 },
  { id: 'IPAS', nama: 'IPAS', kategori: 'Olimpiade Akademik', label: 'IPAS', satuan: 'peserta', biaya: 0 },
  { id: 'PAI', nama: 'PAI', kategori: 'Olimpiade Akademik', label: 'PAI (Pendidikan Agama Islam)', satuan: 'peserta', biaya: 0 },
  { id: 'Inggris', nama: 'Inggris', kategori: 'Olimpiade Akademik', label: 'Bahasa Inggris', satuan: 'peserta', biaya: 0 },
  { id: 'Arab', nama: 'Arab', kategori: 'Olimpiade Akademik', label: 'Bahasa Arab', satuan: 'peserta', biaya: 0 },
  { id: 'Singer (solo)', nama: 'Singer (solo)', kategori: 'Lomba Seni', label: 'Singer (Solo)', satuan: 'peserta', biaya: 50000 },
  { id: 'Al Banjari', nama: 'Al Banjari', kategori: 'Lomba Seni', label: 'Al-Banjari (Grup)', satuan: 'grup', biaya: 100000 },
  { id: 'Sandi Morse Semaphore (SMS)', nama: 'Sandi Morse Semaphore (SMS)', kategori: 'Lomba Seni', label: 'Pramuka SMS (Tim)', satuan: 'tim', biaya: 50000 },
];

export function isAkademikLomba(name: string): boolean {
  const t = (name || '').toLowerCase().trim();
  if (t.includes('olimpiade') || t.includes('akademik')) return true;
  return ['matematika', 'ipas', 'ipa', 'pai', 'inggris', 'arab'].some(m => {
    if (t === m) return true;
    if (m === 'ipa' && (t === 'ipas' || t.includes('ipa'))) return true;
    if (m === 'inggris' && t.includes('inggris')) return true;
    if (m === 'arab' && t.includes('arab')) return true;
    if (m === 'pai' && (t === 'pai' || t.includes('agama'))) return true;
    return false;
  });
}

export function isLombaClosed(
  lombaName: string, 
  pendaftaranBuka: boolean = true, 
  closedLombas: string[] = []
): boolean {
  if (!pendaftaranBuka) return true;
  if (!closedLombas || closedLombas.length === 0) return false;

  const target = (lombaName || '').toLowerCase().trim();
  if (!target) return false;

  // Cek apakah 'Olimpiade Akademik' secara keseluruhan ditutup
  const isAkademikClosed = closedLombas.some(cl => {
    const c = cl.toLowerCase().trim();
    return c === 'olimpiade akademik' || c === 'olimpiade' || c === 'akademik';
  }) || ['matematika', 'ipas', 'pai', 'inggris', 'arab'].every(m =>
    closedLombas.some(cl => {
      const c = cl.toLowerCase().trim();
      return c === m || (m === 'ipas' && c === 'ipa');
    })
  );

  // Jika Olimpiade Akademik ditutup dan yang diperiksa adalah bidang akademik atau 'Olimpiade Akademik'
  if (isAkademikClosed && isAkademikLomba(target)) {
    return true;
  }

  return closedLombas.some(cl => {
    const c = cl.toLowerCase().trim();
    if (target === c) return true;
    if (c === 'inggris' && target.includes('inggris')) return true;
    if (c === 'arab' && target.includes('arab')) return true;
    if (c.includes('singer') && (target.includes('singer') || target.includes('solo'))) return true;
    if (c.includes('banjari') && target.includes('banjari')) return true;
    if ((c.includes('sms') || c.includes('semaphore') || c.includes('morse')) &&
        (target.includes('sms') || target.includes('semaphore') || target.includes('morse') || target.includes('sandi'))) return true;
    if (c === 'ipas' && (target === 'ipa' || target === 'ipas')) return true;
    if (c === 'matematika' && (target === 'mtk' || target === 'matematika')) return true;
    if (c === 'pai' && (target === 'pai' || target.includes('agama'))) return true;
    return false;
  });
}
