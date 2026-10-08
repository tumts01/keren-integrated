const fs = require('fs');
let content = fs.readFileSync('src/app/api/jurnal/route.ts', 'utf8');

// The error string currently is:
// `Gagal menyimpan: Anda tercatat sedang mengajar di kelas ${dbKelas} pada jam ke-${dbJam}. (Satu guru tidak bisa mengajar di kelas yang berbeda pada waktu yang sama)`

const oldMessage = '`Gagal menyimpan: Anda tercatat sedang mengajar di kelas ${dbKelas} pada jam ke-${dbJam}. (Satu guru tidak bisa mengajar di kelas yang berbeda pada waktu yang sama)`';
const newMessage = '`Ups: Anda tercatat sedang mengajar di kelas ${dbKelas} pada jam ke-${dbJam}. (Satu guru tidak bisa mengajar di kelas yang berbeda pada waktu yang sama) atau jangan-jangan Anda punya jurus Kagebunshin?!`';

// Using split/join to replace all instances globally without regex issues
content = content.split(oldMessage).join(newMessage);

fs.writeFileSync('src/app/api/jurnal/route.ts', content);
console.log('Success notification replaced');
