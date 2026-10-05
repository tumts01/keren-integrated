fetch('https://bontu-keren-integrated.vercel.app/api/cbt/admin/soal')
  .then(r => r.json())
  .then(data => {
     if (data.data) {
       const unique = [...new Set(data.data.map(a => a.cabang_lomba))];
       console.log('Unique:', unique);
     } else {
       console.log(data);
     }
  });
