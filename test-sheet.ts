
const { getNilaiSiswaDoc } = require('./src/lib/google-sheets');
(async () => {
  const doc = await getNilaiSiswaDoc();
  const sheet = doc.sheetsByTitle['PK'];
  await sheet.loadCells('A1:AC500');
  sheet.getCell(2, 1).value = null;
  await sheet.saveUpdatedCells();
})();

