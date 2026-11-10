import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const namaParam = (searchParams.get('nama') || '').trim().toLowerCase();
    const usernameParam = (searchParams.get('username') || '').trim().toLowerCase();

    if (!namaParam && !usernameParam) {
      return NextResponse.json({ success: true, needUpdate: false });
    }

    // Ambil data guru
    const { data: guruRows, error } = await supabase
      .from('data_guru')
      .select('id, nama, metadata');

    if (error) throw error;

    // Cari guru berdasarkan nama
    let matchedGuru = (guruRows || []).find((g: any) => {
      const gNama = (g.nama || '').trim().toLowerCase();
      return gNama === namaParam || (namaParam && gNama.includes(namaParam));
    });

    // Jika belum ketemu, coba cari dari data_users dulu untuk memastikan nama lengkapnya
    if (!matchedGuru && usernameParam) {
      const { data: userRow } = await supabase
        .from('data_users')
        .select('nama')
        .ilike('username', usernameParam)
        .single();

      if (userRow && userRow.nama) {
        const uNama = userRow.nama.trim().toLowerCase();
        matchedGuru = (guruRows || []).find((g: any) => (g.nama || '').trim().toLowerCase() === uNama);
      }
    }

    if (!matchedGuru) {
      // Bukan akun yang terdaftar di data_guru (misal Super Admin non-guru)
      return NextResponse.json({ success: true, needUpdate: false, reason: 'guru_not_found' });
    }

    const metadata = matchedGuru.metadata || {};
    const existingIbu = (metadata['Nama Ibu Kandung'] || metadata['NAMA IBU KANDUNG'] || metadata['Nama Ibu'] || '').trim();

    if (existingIbu.length > 0) {
      // Sudah ada isian
      return NextResponse.json({
        success: true,
        needUpdate: false,
        guruId: matchedGuru.id,
        nama: matchedGuru.nama,
        namaIbu: existingIbu
      });
    }

    // Belum diisi -> wajib popup!
    return NextResponse.json({
      success: true,
      needUpdate: true,
      guruId: matchedGuru.id,
      nama: matchedGuru.nama
    });
  } catch (err: any) {
    console.error('Check Ibu Kandung Error:', err);
    return NextResponse.json({ success: false, error: err.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { guruId, nama, namaIbuKandung } = body;

    const trimmedIbu = (namaIbuKandung || '').trim();
    if (!trimmedIbu || trimmedIbu.length < 2) {
      return NextResponse.json({
        success: false,
        error: 'Nama Ibu Kandung wajib diisi minimal 2 karakter'
      }, { status: 400 });
    }

    // Cari guru target
    let targetId = guruId;
    let targetMeta: Record<string, any> = {};

    if (targetId) {
      const { data: g } = await supabase
        .from('data_guru')
        .select('id, metadata')
        .eq('id', targetId)
        .single();
      if (g) {
        targetMeta = g.metadata || {};
      }
    } else if (nama) {
      const cleanNama = nama.trim().toLowerCase();
      const { data: allGuru } = await supabase.from('data_guru').select('id, nama, metadata');
      const found = (allGuru || []).find((g: any) => (g.nama || '').trim().toLowerCase() === cleanNama);
      if (found) {
        targetId = found.id;
        targetMeta = found.metadata || {};
      }
    }

    if (!targetId) {
      return NextResponse.json({ success: false, error: 'Data guru tidak ditemukan di sistem' }, { status: 404 });
    }

    const updatedMetadata = {
      ...targetMeta,
      'Nama Ibu Kandung': trimmedIbu
    };

    const { error: updateErr } = await supabase
      .from('data_guru')
      .update({ metadata: updatedMetadata })
      .eq('id', targetId);

    if (updateErr) throw updateErr;

    return NextResponse.json({
      success: true,
      message: 'Nama Ibu Kandung berhasil disimpan'
    });
  } catch (err: any) {
    console.error('Save Ibu Kandung Error:', err);
    return NextResponse.json({ success: false, error: err.message || 'Server error' }, { status: 500 });
  }
}
