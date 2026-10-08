const fetch = require('node-fetch');
async function run() {
  const dataNilai = [
    { induk: '123', nama: 'Test', jk: 'L', 'MATERI 1 S1': '90', 'STS': '85' }
  ];
  
  const res = await fetch('http://localhost:3000/api/nilai-siswa/pk/bulk', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      kelas: '8F',
      mapel: 'Keterampilan Kreatif Produktif',
      tahunAjaran: '2026/2027',
      dataNilai,
      guru: 'Admin'
    })
  });
  
  const text = await res.text();
  console.log('Status:', res.status);
  console.log('Response:', text);
}
run();
