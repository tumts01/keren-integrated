const { getPresensiDoc } = require('./src/lib/google-sheets');
getPresensiDoc().then(doc => console.log(Object.keys(doc.sheetsByTitle))).catch(console.error);
