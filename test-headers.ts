import { getIndukDoc } from './src/lib/google-sheets';

async function run() {
  const doc = await getIndukDoc();
  const sheet = doc.sheetsByTitle['DATABASE'];
  await sheet.loadHeaderRow();
  console.log(sheet.headerValues);
}
run();
