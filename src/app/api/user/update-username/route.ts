import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { oldUsername, newUsername, userId } = await request.json();

    if (!newUsername || !newUsername.trim()) {
      return NextResponse.json({ success: false, error: 'Username baru harus diisi' }, { status: 400 });
    }
    
    const cleanNewUsername = newUsername.trim();
    if (cleanNewUsername.length < 3) {
      return NextResponse.json({ success: false, error: 'Username baru minimal 3 karakter' }, { status: 400 });
    }

    if (/\s/.test(cleanNewUsername)) {
      return NextResponse.json({ success: false, error: 'Username tidak boleh mengandung spasi' }, { status: 400 });
    }

    const { data: rows, error } = await supabase.from('data_users').select('*');
    if (error) throw error;

    // Cari user target berdasarkan userId atau oldUsername
    let userRow: any = null;
    if (userId) {
      userRow = (rows || []).find((r: any) => r.id === userId);
    }
    if (!userRow && oldUsername) {
      userRow = (rows || []).find((r: any) => {
        const dbCol = r.username;
        const dbMeta = r.metadata?.['Username'];
        return (
          (dbCol && dbCol.toString().toLowerCase().trim() === oldUsername.toLowerCase().trim()) ||
          (dbMeta && dbMeta.toString().toLowerCase().trim() === oldUsername.toLowerCase().trim())
        );
      });
    }

    if (!userRow) {
      return NextResponse.json({ success: false, error: 'User tidak ditemukan' }, { status: 404 });
    }

    // Pastikan username baru tidak dipakai oleh user LAIN
    const isNewTaken = (rows || []).some((r: any) => {
      if (r.id === userRow.id) return false;
      const dbCol = r.username;
      const dbMeta = r.metadata?.['Username'];
      return (
        (dbCol && dbCol.toString().toLowerCase().trim() === cleanNewUsername.toLowerCase()) ||
        (dbMeta && dbMeta.toString().toLowerCase().trim() === cleanNewUsername.toLowerCase())
      );
    });
    
    if (isNewTaken) {
      return NextResponse.json({
        success: false,
        error: `Username '${cleanNewUsername}' sudah dipakai oleh user/guru lain. Silakan pilih username yang berbeda.`
      }, { status: 400 });
    }

    // Update kolom username dan metadata
    const updatedMetadata = {
      ...(userRow.metadata || {}),
      'Username': cleanNewUsername,
      'Sudah Ganti Username': 'TRUE'
    };
    
    const { error: updateError } = await supabase
      .from('data_users')
      .update({
        username: cleanNewUsername,
        metadata: updatedMetadata
      })
      .eq('id', userRow.id);

    if (updateError) throw updateError;

    return NextResponse.json({
      success: true,
      message: `Username untuk ${userRow.nama || cleanNewUsername} berhasil diperbarui menjadi ${cleanNewUsername}`,
      user: {
        id: userRow.id,
        nama: userRow.nama || userRow.metadata?.['Nama'] || '',
        username: cleanNewUsername,
        role: userRow.role || userRow.metadata?.['Role'] || '',
        whatsapp: userRow.metadata?.['Whatsapp'] || '',
        pin: userRow.metadata?.['PIN'] || '',
        foto: userRow.metadata?.['Foto'] || userRow.metadata?.['foto'] || '',
        sudahGanti: true
      }
    });
  } catch (error: any) {
    console.error('Update Username Error:', error);
    return NextResponse.json({ success: false, error: 'Terjadi kesalahan pada server saat update username: ' + error.message }, { status: 500 });
  }
}
