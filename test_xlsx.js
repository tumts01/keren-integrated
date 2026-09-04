const XLSX = require('xlsx');
const wb = XLSX.utils.book_new();
const ws = XLSX.utils.json_to_sheet([{ NISN: '1234567890', 'NO UJIAN': '001-01', RUANG: 'Ruang 1' }]);
XLSX.utils.book_append_sheet(wb, ws, 'Template');
XLSX.writeFile(wb, 'template.xlsx');
