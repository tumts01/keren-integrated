/**
 * KEREN - Google Apps Script: Daftar Foto Siswa dari Google Drive
 * 
 * Cara Pakai:
 * 1. Buka Google Sheets baru
 * 2. Extensions → Apps Script
 * 3. Paste seluruh kode ini → Save
 * 4. Jalankan fungsi: daftarFotoSiswa()
 * 5. Masukkan Folder ID ketika diminta
 * 6. Hasil otomatis muncul di sheet aktif
 * 
 * Folder ID bisa didapat dari URL Google Drive:
 * drive.google.com/drive/folders/FOLDER_ID_ADA_DI_SINI
 */

function daftarFotoSiswa() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getActiveSheet();

  // Minta Folder ID dari user
  const ui = SpreadsheetApp.getUi();
  const result = ui.prompt(
    'Daftar Foto Siswa',
    'Masukkan Folder ID Google Drive tempat foto disimpan:\n(dari URL: drive.google.com/drive/folders/FOLDER_ID)',
    ui.ButtonSet.OK_CANCEL
  );

  if (result.getSelectedButton() !== ui.Button.OK) return;

  const folderId = result.getResponseText().trim();
  if (!folderId) {
    ui.alert('Folder ID tidak boleh kosong!');
    return;
  }

  // Bersihkan sheet
  sheet.clearContents();

  // Header
  const headers = ['No', 'Nama File Asli', 'Link Google Drive', 'Link Thumbnail', 'File ID', 'Tanggal Upload'];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#1e3a5f').setFontColor('white');

  // Ambil file dari folder
  let folder;
  try {
    folder = DriveApp.getFolderById(folderId);
  } catch (e) {
    ui.alert('Folder tidak ditemukan! Pastikan Folder ID benar dan folder sudah di-share ke akun ini.');
    return;
  }

  const files = folder.getFiles();
  const rows = [];
  let no = 1;

  while (files.hasNext()) {
    const file = files.next();
    const mimeType = file.getMimeType();

    // Hanya ambil file gambar
    if (!mimeType.startsWith('image/')) continue;

    const fileId = file.getId();
    const namaFile = file.getName();
    const tanggalUpload = file.getDateCreated();

    // Buat link shareable
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    const linkDrive = `https://drive.google.com/file/d/${fileId}/view`;
    const linkThumbnail = `https://drive.google.com/thumbnail?id=${fileId}&sz=w400-h400`;

    rows.push([
      no++,
      namaFile,
      linkDrive,
      linkThumbnail,
      fileId,
      Utilities.formatDate(tanggalUpload, Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm')
    ]);
  }

  if (rows.length === 0) {
    ui.alert('Tidak ada file gambar di folder tersebut!');
    return;
  }

  // Tulis data
  sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);

  // Format kolom link sebagai hyperlink
  rows.forEach((row, i) => {
    const rowNum = i + 2;
    const linkCell = sheet.getRange(rowNum, 3);
    linkCell.setFormula(`=HYPERLINK("${row[2]}", "${row[1]}")`);
    linkCell.setFontColor('#1155cc');
  });

  // Auto-resize kolom
  sheet.autoResizeColumns(1, headers.length);

  // Freeze baris header
  sheet.setFrozenRows(1);

  // Tambah kolom "Link Foto" kosong untuk template mapping
  const lastRow = rows.length + 1;
  sheet.getRange(1, headers.length + 1).setValue('Link Foto (untuk Excel Mapping)');
  sheet.getRange(1, headers.length + 1).setFontWeight('bold').setBackground('#0f9d58').setFontColor('white');

  // Formula otomatis: kolom Link Foto = pakai kolom Link Thumbnail (kolom D)
  for (let i = 2; i <= lastRow; i++) {
    sheet.getRange(i, headers.length + 1).setFormula(`=D${i}`);
  }

  ui.alert(`✅ Berhasil!\n\n${rows.length} foto ditemukan di folder.\n\nSekarang:\n1. Kolom "Link Foto" sudah terisi otomatis dengan link thumbnail\n2. Salin sheet ini → gunakan sebagai referensi\n3. Buka template Excel di aplikasi KEREN\n4. Copy-paste kolom "Link Foto" ke kolom "Link Foto" di template Excel\n5. Upload template Excel yang sudah diisi ke aplikasi KEREN`);
}

/**
 * Tambahan: Fungsi untuk membuat template mapping lengkap
 * Menggabungkan daftar siswa (dari sheet lain) dengan daftar foto
 */
function buatTemplateMappingLengkap() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();

  // Minta sheet nama siswa
  const sheetNames = ss.getSheets().map(s => s.getName()).join(', ');
  const result = ui.prompt(
    'Template Mapping',
    `Sheet yang tersedia: ${sheetNames}\n\nNama sheet daftar foto (hasil dari daftarFotoSiswa):`,
    ui.ButtonSet.OK_CANCEL
  );

  if (result.getSelectedButton() !== ui.Button.OK) return;
  const fotoSheetName = result.getResponseText().trim();
  const fotoSheet = ss.getSheetByName(fotoSheetName);

  if (!fotoSheet) {
    ui.alert('Sheet tidak ditemukan!');
    return;
  }

  // Buat sheet baru untuk hasil mapping
  let mappingSheet = ss.getSheetByName('MAPPING FOTO');
  if (mappingSheet) ss.deleteSheet(mappingSheet);
  mappingSheet = ss.insertSheet('MAPPING FOTO');

  // Header
  const headers = ['No', 'Nama File Foto', 'Link Foto'];
  mappingSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  mappingSheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#1e3a5f').setFontColor('white');

  // Ambil data foto
  const fotoData = fotoSheet.getDataRange().getValues();
  const rows = [];

  for (let i = 1; i < fotoData.length; i++) {
    const namaFile = fotoData[i][1]; // Kolom B: Nama File
    const linkFoto = fotoData[i][3]; // Kolom D: Link Thumbnail

    if (!namaFile) continue;
    rows.push([i, namaFile, linkFoto]);
  }

  if (rows.length > 0) {
    mappingSheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }

  mappingSheet.autoResizeColumns(1, headers.length);
  mappingSheet.setFrozenRows(1);

  ui.alert(`✅ Sheet MAPPING FOTO sudah dibuat dengan ${rows.length} foto.\n\nSalin kolom "Link Foto" ke template Excel KEREN!`);
}
