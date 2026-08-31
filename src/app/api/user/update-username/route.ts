import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { oldUsername, newUsername } = await request.json();

    if (!oldUsername || !newUsername) {
      return NextResponse.json({ success: false, error: 'Username lama dan baru harus diisi' }, { status: 400 });
    }
    
    if (newUsername.length < 4) {
      return NextResponse.json({ success: false, error: 'Username baru minimal 4 karakter' }, { status: 400 });
    }

    const { data: rows, error } = await supabase.from('data_users').select('*');
    if (error) throw error;
    
    // Pastikan username baru tidak dipakai orang lain
    const isNewTaken = (rows || []).some((row: any) => {
      const dbUser = row.metadata?.['Username'];
      return dbUser && dbUser.toString().toLowerCase().trim() === newUsername.toLowerCase().trim();
    });
    
    if (isNewTaken) {
      return NextResponse.json({ success: false, error: 'Username tersebut sudah dipakai orang lain. Silakan pilih yang lain.' }, { status: 400 });
    }

    // Cari baris user berdasarkan username lama
    const userRow = (rows || []).find((row: any) => {
      const dbUsername = row.metadata?.['Username'];
      return dbUsername && dbUsername.toString().toLowerCase().trim() === oldUsername.toLowerCase().trim();
    });

    if (userRow) {
      // Update the metadata
      const updatedMetadata = { ...userRow.metadata, 'Username': newUsername, 'Sudah Ganti Username': 'TRUE' };
      
      const { error: updateError } = await supabase.from('data_users').update({ metadata: updatedMetadata }).eq('id', userRow.id);
      if (updateError) throw updateError;

      return NextResponse.json({
        success: true,
        user: {
          nama: userRow.nama || userRow.metadata?.['Nama'] || '',
          username: newUsername,
          role: userRow.metadata?.['Role'] || '',
          whatsapp: userRow.metadata?.['Whatsapp'] || '',
          pin: userRow.metadata?.['PIN'] || ''
        }
      });
    }

    return NextResponse.json({ success: false, error: 'User lama tidak ditemukan. Silakan logout dan login ulang.' }, { status: 401 });
  } catch (error) {
    console.error('Update Username Error:', error);
    return NextResponse.json({ success: false, error: 'Terjadi kesalahan pada server saat update username' }, { status: 500 });
  }
}
