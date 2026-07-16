import { NextResponse } from 'next/server';
import { getIndukDoc } from '@/lib/google-sheets';

export async function POST(request: Request) {
  try {
    const { oldUsername, newUsername } = await request.json();

    if (!oldUsername || !newUsername) {
      return NextResponse.json({ success: false, error: 'Username lama dan baru harus diisi' }, { status: 400 });
    }
    
    if (newUsername.length < 4) {
      return NextResponse.json({ success: false, error: 'Username baru minimal 4 karakter' }, { status: 400 });
    }

    const doc = await getIndukDoc();
    let sheet = doc.sheetsByTitle['Users'];
    
    if (!sheet) {
      sheet = doc.sheetsByIndex[0];
    }

    const rows = await sheet.getRows();
    
    // Pastikan username baru tidak dipakai orang lain
    const isNewTaken = rows.some(row => {
      const dbUser = row.get('Username');
      return dbUser && dbUser.toString().toLowerCase().trim() === newUsername.toLowerCase().trim();
    });
    
    if (isNewTaken) {
      return NextResponse.json({ success: false, error: 'Username tersebut sudah dipakai orang lain. Silakan pilih yang lain.' }, { status: 400 });
    }

    // Cari baris user berdasarkan username lama
    const userRow = rows.find(row => {
      const dbUsername = row.get('Username');
      return dbUsername && dbUsername.toString().toLowerCase().trim() === oldUsername.toLowerCase().trim();
    });

    if (userRow) {
      // Update the row
      userRow.set('Username', newUsername);
      userRow.set('Sudah Ganti Username', 'TRUE');
      
      await userRow.save(); // Save changes back to Google Sheets

      return NextResponse.json({
        success: true,
        user: {
          nama: userRow.get('Nama') || '',
          username: newUsername,
          foto: userRow.get('Foto') || '',
          rule: userRow.get('Rule') || 'Staf',
          sudahGantiUsername: true
        }
      });
    } else {
      return NextResponse.json({ success: false, error: 'Data user tidak ditemukan' }, { status: 404 });
    }

  } catch (error: any) {
    console.error('Update Username Error:', error);
    return NextResponse.json({ success: false, error: 'Gagal memperbarui username. Coba lagi nanti.' }, { status: 500 });
  }
}
