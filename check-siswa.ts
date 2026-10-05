import { getAllCachedDataInduk } from './src/lib/data-induk';

async function run() {
  const siswa = await getAllCachedDataInduk();
  console.log('Total:', siswa.length);
  if (siswa.length > 0) {
     console.log('Sample metadata keys:', Object.keys(siswa[0].metadata || {}));
     console.log('Sample metadata values:', siswa[0].metadata);
     
     // Let's check domisili variants
     const doms = new Set(siswa.map(s => s.metadata?.['DOMISILI'] || s.metadata?.['Domisili']));
     console.log('Domisili variants:', [...doms].slice(0, 10));

     // Check kelas
     const kelas = new Set(siswa.map(s => s.metadata?.['KELAS'] || s.metadata?.['Kelas']));
     console.log('Kelas variants:', [...kelas].slice(0, 10));

     // Check TA
     const tas = new Set(siswa.map(s => s.metadata?.['TA KELAS 7']));
     console.log('TA Kelas 7 variants:', [...tas].slice(0, 10));
  }
}
run();
