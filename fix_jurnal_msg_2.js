const fs = require('fs');
let content = fs.readFileSync('src/app/api/jurnal/route.ts', 'utf8');

const oldMessage = '`Ups: Anda tercatat sedang mengajar di kelas ${dbKelas} pada jam ke-${dbJam}. (Satu guru tidak bisa mengajar di kelas yang berbeda pada waktu yang sama) atau jangan-jangan Anda punya jurus Kagebunshin?!`';
const newMessage = '`Ups: Anda tercatat sedang mengajar di kelas ${dbKelas} pada jam ke-${dbJam}. (Satu guru tidak bisa mengajar di kelas yang berbeda pada waktu yang sama) atau jangan2 anda punya jurus Kagebunshin?!`';

content = content.split(oldMessage).join(newMessage);

fs.writeFileSync('src/app/api/jurnal/route.ts', content);
console.log('Success notification replaced again');
