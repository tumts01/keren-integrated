export interface CabangLombaConfig {
  id: string;
  nama: string;
  kategori: 'Olimpiade Akademik' | 'Lomba Seni';
  label: string;
  satuan: 'peserta' | 'grup' | 'tim';
  biaya: number;
}

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

export function isLombaClosed(
  lombaName: string, 
  pendaftaranBuka: boolean = true, 
  closedLombas: string[] = []
): boolean {
  if (!pendaftaranBuka) return true;
  if (!closedLombas || closedLombas.length === 0) return false;

  const target = (lombaName || '').toLowerCase().trim();
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
