import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { uploadFileToDrive } from '@/lib/google-drive';
import * as xlsx from 'xlsx';

export const dynamic = 'force-dynamic';

function getLombaInfo(lombaStr: string) {
  const l = (lombaStr || '').toLowerCase();
  let isAkademik = false;
  let isSeni = false;
  let lombaPrefix = 'UNK';

  if (l.includes('matematika')) { isAkademik = true; lombaPrefix = 'MAT'; }
  else if (l.includes('ipas') || l.includes('ipa')) { isAkademik = true; lombaPrefix = 'IPA'; }
  else if (l.includes('pai') || l.includes('agama')) { isAkademik = true; lombaPrefix = 'PAI'; }
  else if (l.includes('inggris') || l.includes('english')) { isAkademik = true; lombaPrefix = 'ING'; }
  else if (l.includes('arab')) { isAkademik = true; lombaPrefix = 'ARB'; }
  else if (l.includes('singer') || l.includes('solo')) { isSeni = true; lombaPrefix = 'SGR'; }
  else if (l.includes('banjari')) { isSeni = true; lombaPrefix = 'BAN'; }
  else if (l.includes('sandi') || l.includes('morse') || l.includes('sms')) { isSeni = true; lombaPrefix = 'SMS'; }

  let catPrefix = isAkademik ? 'OLM' : isSeni ? 'SEN' : 'UNK';
  return { catPrefix, lombaPrefix, isAkademik, isSeni };
}

function generateUsernameCbt() {
  const num = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
  return 'CBT' + num;
}

function generatePasswordCbt() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let pass = '';
  for (let i = 0; i < 6; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pass;
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const jenisPendaftaran = formData.get('jenisPendaftaran') as string;
    const kategori = formData.get('kategori') as string || '';
    
    // Bukti Pembayaran
    const buktiFile = formData.get('buktiPembayaran') as File | null;
    let buktiUrl = '';

    // Folder ID Google Drive
    const folderId = process.env.GOOGLE_DRIVE_OLIMPIADE_FOLDER_ID || '1XMpQqdTzx0i_WaD79AHdgzhRUUmgQX6z';

    // Fetch existing records to find max IDs
    const { data: allData } = await supabase.from('data_olimpiade_seni').select('metadata');
    let maxIdMap: Record<string, number> = {};

    if (allData) {
      allData.forEach(row => {
        const nomor = row.metadata?.NOMOR_PESERTA;
        if (nomor && typeof nomor === 'string') {
          const parts = nomor.split('-');
          if (parts.length === 3) {
            const prefix = `${parts[0]}-${parts[1]}`;
            const num = parseInt(parts[2], 10);
            if (!isNaN(num)) {
              maxIdMap[prefix] = Math.max(maxIdMap[prefix] || 0, num);
            }
          }
        }
      });
    }

    function generateNextNomor(lomba: string) {
      const { catPrefix, lombaPrefix } = getLombaInfo(lomba);
      const prefix = `${catPrefix}-${lombaPrefix}`;
      let nextNum = (maxIdMap[prefix] || 0) + 1;
      maxIdMap[prefix] = nextNum;
      const paddedNum = nextNum.toString().padStart(3, '0');
      return `${prefix}-${paddedNum}`;
    }

    if (buktiFile) {
      const arrayBuffer = await buktiFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const res = await uploadFileToDrive(buffer, buktiFile.name, buktiFile.type, folderId);
      buktiUrl = res.webViewLink || '';
    } else {
      // For individu, if not Akademik, it's required.
      // For kolektif, it might also be required unless it's only Akademik, but the prompt says:
      // "Check if Bukti Pembayaran is optional (it is optional if Kategori is 'Olimpiade Akademik'). Don't throw error if it's missing for Akademik."
      if (kategori !== 'Olimpiade Akademik') {
        return NextResponse.json({ success: false, error: 'Bukti pembayaran wajib dilampirkan' }, { status: 400 });
      }
    }

    if (jenisPendaftaran === 'kolektif') {
      const excelFile = formData.get('fileExcel') as File | null;
      if (!excelFile) {
        return NextResponse.json({ success: false, error: 'File Excel wajib dilampirkan untuk pendaftaran kolektif' }, { status: 400 });
      }
      
      const arrayBuffer = await excelFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      const workbook = xlsx.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const dataExcel = xlsx.utils.sheet_to_json<any>(worksheet);

      const namaSekolahKolektif = formData.get('namaSekolah') as string || '';
      
      const rowsToInsert = [];
      const updatedExcelData = [];

      for (const row of dataExcel) {
        let lomba = '';
        for (const key of Object.keys(row)) {
          if (key.toLowerCase().includes('lomba')) {
            lomba = row[key];
            break;
          }
        }

        const { isAkademik } = getLombaInfo(lomba);
        const nomorPeserta = generateNextNomor(lomba);
        
        let usernameCbt = '';
        let passwordCbt = '';
        if (isAkademik) {
          usernameCbt = generateUsernameCbt();
          passwordCbt = generatePasswordCbt();
        }
        
        const newRow = { ...row };
        newRow['Nomor Peserta'] = nomorPeserta;
        if (isAkademik) {
          newRow['Username CBT'] = usernameCbt;
          newRow['Password CBT'] = passwordCbt;
        }
        updatedExcelData.push(newRow);

        const participantMetadata: any = {
          ...row,
          'ASAL_SEKOLAH': namaSekolahKolektif,
          'NOMOR_PESERTA': nomorPeserta,
          'WAKTU_DAFTAR': new Date().toISOString()
        };

        if (usernameCbt) participantMetadata['USERNAME_CBT'] = usernameCbt;
        if (passwordCbt) participantMetadata['PASSWORD_CBT'] = passwordCbt;

        rowsToInsert.push({
          jenis_pendaftaran: 'individu',
          bukti_pembayaran_url: buktiUrl,
          file_excel_url: null,
          metadata: participantMetadata
        });
      }

      // Generate new Excel file
      const newWorkbook = xlsx.utils.book_new();
      const newWorksheet = xlsx.utils.json_to_sheet(updatedExcelData);
      xlsx.utils.book_append_sheet(newWorkbook, newWorksheet, 'Peserta');
      const newExcelBuffer = xlsx.write(newWorkbook, { type: 'buffer', bookType: 'xlsx' });
      
      const res = await uploadFileToDrive(newExcelBuffer, `Credentials_${excelFile.name}`, excelFile.type, folderId);
      const newExcelUrl = res.webViewLink || '';

      // Update file_excel_url for the rows, optional but good for reference
      rowsToInsert.forEach(row => {
        row.file_excel_url = newExcelUrl;
      });

      // Insert all participants
      const { error } = await supabase.from('data_olimpiade_seni').insert(rowsToInsert);

      if (error) {
        console.error('Supabase Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: 'Pendaftaran kolektif berhasil disimpan!', excelDownloadUrl: newExcelUrl });
      
    } else if (jenisPendaftaran === 'individu') {
      const lombaDipilih = formData.get('lombaDipilih') as string || '';
      const { isAkademik } = getLombaInfo(lombaDipilih);
      const nomorPeserta = generateNextNomor(lombaDipilih);

      let usernameCbt = '';
      let passwordCbt = '';
      if (kategori === 'Olimpiade Akademik' || isAkademik) {
        usernameCbt = generateUsernameCbt();
        passwordCbt = generatePasswordCbt();
      }

      const metadata: any = {
        'NAMA': formData.get('nama') || '',
        'NISN': formData.get('nisn') || '',
        'KELAS': formData.get('kelas') || '',
        'ASAL_SEKOLAH': formData.get('namaSekolah') || '',
        'NPSN': formData.get('npsn') || '',
        'KATEGORI': kategori,
        'LOMBA_DIPILIH': lombaDipilih,
        'NAMA_REGU': formData.get('namaRegu') || '',
        'NO_HP': formData.get('noHp') || '',
        'NOMOR_PESERTA': nomorPeserta,
        'WAKTU_DAFTAR': new Date().toISOString()
      };

      if (usernameCbt) metadata['USERNAME_CBT'] = usernameCbt;
      if (passwordCbt) metadata['PASSWORD_CBT'] = passwordCbt;

      const { error } = await supabase.from('data_olimpiade_seni').insert([{
        jenis_pendaftaran: 'individu',
        bukti_pembayaran_url: buktiUrl,
        file_excel_url: null,
        metadata
      }]);

      if (error) {
        console.error('Supabase Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: 'Pendaftaran berhasil disimpan!', pesertaData: metadata });
    } else {
      return NextResponse.json({ success: false, error: 'Jenis pendaftaran tidak valid' }, { status: 400 });
    }

  } catch (error: any) {
    console.error('POST Pendaftaran Olimpiade Error:', error);
    return NextResponse.json({ success: false, error: 'Terjadi kesalahan sistem: ' + error.message }, { status: 500 });
  }
}
