const xlsx = require('xlsx'); const wb = xlsx.readFile('Tugas Mengajar 26-27.xlsx'); const sheetName = wb.SheetNames[0]; console.log(xlsx.utils.sheet_to_json(wb.Sheets[sheetName]).slice(5, 10));  
