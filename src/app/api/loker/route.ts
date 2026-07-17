import { NextResponse } from 'next/server';
import { getIndukDoc } from '@/lib/google-sheets';
import { getFoldersInDrive } from '@/lib/google-drive';

// Fungsi untuk membersihkan nama dari gelar dan tanda baca untuk pencocokan
function cleanString(str: string) {
  if (!str) return '';
  return str.toLowerCase().replace(/[^a-z]/g, '');
}

// Algoritma Smart Fuzzy Matching untuk mencocokkan nama
function isMatch(nameDrive: string, nameDb: string) {
  const driveClean = cleanString(nameDrive);
  const dbClean = cleanString(nameDb);
  
  if (!driveClean || !dbClean) return false;
  
  // Jika nama di DB cukup panjang, gunakan metode substring (karena gelar biasanya di awal atau akhir folder)
  // Misalnya folder: "Drs. H. FACHRUDIN SUBEKTI" -> drshfachrudinsubekti
  // DB: "Fachrudin Subekti" -> fachrudinsubekti
  // "drshfachrudinsubekti".includes("fachrudinsubekti") === true
  if (dbClean.length > 5) {
    return driveClean.includes(dbClean) || dbClean.includes(driveClean);
  } else {
    // Jika nama pendek, pastikan sama persis
    return driveClean === dbClean;
  }
}

export async function GET() {
  try {
    const folderId = process.env.GOOGLE_DRIVE_LOKER_GTK_FOLDER_ID;
    
    if (!folderId) {
      return NextResponse.json({ 
        success: false, 
        error: 'GOOGLE_DRIVE_LOKER_GTK_FOLDER_ID belum diatur di .env.local',
        needsConfig: true
      }, { status: 400 });
    }

    // 1. Ambil data guru dari db_GTK
    const doc = await getIndukDoc();
    const sheet = doc.sheetsByTitle['db_GTK'];
    const sheetUsers = doc.sheetsByTitle['Users']; 
    
    if (!sheet) {
      return NextResponse.json({ success: false, error: 'Tab db_GTK tidak ditemukan' }, { status: 404 });
    }

    const rows = await sheet.getRows();
    
    // Ambil foto dari Users
    const userPhotos: Record<string, string> = {};
    if (sheetUsers) {
      const userRows = await sheetUsers.getRows();
      userRows.forEach(uRow => {
        const uNama = uRow.get('Nama');
        const uFoto = uRow.get('Foto');
        if (uNama && uFoto) {
          userPhotos[uNama.trim().toLowerCase()] = uFoto;
        }
      });
    }

    const getImageUrl = (url: string) => {
      if (!url) return '';
      const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
      if (url.includes('drive.google.com') && match && match[1]) {
        return `https://lh3.googleusercontent.com/d/${match[1]}=w200-h200`;
      }
      return url;
    };

    // 2. Ambil daftar folder dari Google Drive
    const driveFolders = await getFoldersInDrive(folderId);

    // 3. Gabungkan (Map) data guru dengan folder drive mereka
    const data = rows.map((row, index) => {
      const nama = row.get('Nama') || '';
      const status = row.get('Status') || '';
      const rawFoto = userPhotos[nama.trim().toLowerCase()] || '';
      const foto = getImageUrl(rawFoto);
      
      // Cari folder yang cocok
      let lokerFolder = null;
      for (const folder of driveFolders) {
        if (isMatch(folder.name || '', nama)) {
          lokerFolder = folder;
          break; // Stop jika sudah ketemu 1
        }
      }

      return {
        id: index,
        nama,
        status,
        foto,
        lokerFolder
      };
    });

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Fetch Loker Error:', error);
    return NextResponse.json({ success: false, error: 'Gagal mengambil data Loker Digital' }, { status: 500 });
  }
}
