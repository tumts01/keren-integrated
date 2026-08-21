
const { getNilaiSiswaDoc } = require('./src/lib/google-sheets');
(async () => {
  const doc = await getNilaiSiswaDoc();
  const sheet = doc.sheetsByTitle['PK'];
  await sheet.loadCells('A1:AC2');
  let row = [];
  for (let j = 0; j < 29; j++) row.push(sheet.getCell(0, j).value);
  console.log('Row 1:', row);
})();

