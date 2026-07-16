import { NextResponse } from 'next/server';
import { getIndukDoc } from '@/lib/google-sheets';

export async function POST(request: Request) {
  try {
    const { username } = await request.json();

    if (!username) {
      return NextResponse.json({ success: false, error: 'Username harus diisi' }, { status: 400 });
    }

    const doc = await getIndukDoc();
    // Assuming the tab is named 'Users'. We can also try by index if the name is slightly different.
    let sheet = doc.sheetsByTitle['Users'];
    
    if (!sheet) {
      // Fallback to first sheet if 'Users' tab is not found
      sheet = doc.sheetsByIndex[0];
    }

    const rows = await sheet.getRows();
    
    // Find user by Username (case-insensitive for convenience)
    const userRow = rows.find(row => {
      const dbUsername = row.get('Username');
      return dbUsername && dbUsername.toString().toLowerCase().trim() === username.toLowerCase().trim();
    });

    if (userRow) {
      // Login Success
      return NextResponse.json({
        success: true,
        user: {
          nama: userRow.get('Nama') || '',
          username: userRow.get('Username') || '',
          foto: userRow.get('Foto') || '',
          rule: userRow.get('Rule') || 'Staf', // Default to Staf if empty
          sudahGantiUsername: userRow.get('Sudah Ganti Username')?.toString().toLowerCase() === 'true' || false,
        }
      });
    } else {
      return NextResponse.json({ success: false, error: 'Username tidak ditemukan di Database' }, { status: 401 });
    }

  } catch (error: any) {
    console.error('Login Error:', error);
    return NextResponse.json({ success: false, error: 'Gagal terhubung ke Database. Cek ID Spreadsheet Anda.' }, { status: 500 });
  }
}
