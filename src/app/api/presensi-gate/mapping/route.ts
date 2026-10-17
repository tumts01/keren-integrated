import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAllCachedDataInduk } from '@/lib/data-induk';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const kelas = searchParams.get('kelas');
    const cleanK = (kelas || '').trim().toUpperCase();

    // 1. JIKA PILIH GURU / GTK
    if (cleanK === 'GURU' || cleanK === 'GTK') {
      const { data: rowsGuru, error: errGuru } = await supabase.from('data_guru').select('*');
      if (errGuru) throw errGuru;

      const data = (rowsGuru || []).map((g: any) => {
        const meta = g.metadata || {};
        return {
          id: g.id,
          nama: g.nama || '',
          nisn: g.nomor_induk || meta['NIP'] || '-',
          nis: meta['PEG ID'] || meta['PegID'] || '',
          kelas: 'GURU / GTK',
          role: 'GURU',
          rfidUid: meta['RFID_UID'] || meta['NO_RFID'] || ''
        };
      });

      data.sort((a, b) => a.nama.localeCompare(b.nama));
      return NextResponse.json({ success: true, data });
    }

    // 2. JIKA PILIH KELAS SISWA
    const allStudents = await getAllCachedDataInduk();
    
    let filtered = allStudents;
    if (cleanK) {
      filtered = allStudents.filter(s => {
        const meta = s.metadata || {};
        const r7 = String(meta['ROMBEL KELAS 7'] || '').trim().toUpperCase();
        const r8 = String(meta['ROMBEL KELAS 8'] || '').trim().toUpperCase();
        const r9 = String(meta['ROMBEL KELAS 9'] || '').trim().toUpperCase();
        const rMain = String(meta['ROMBEL'] || '').trim().toUpperCase();
        const activeR = r9 || r8 || r7 || rMain;
        return activeR === cleanK;
      });
    }

    const data = filtered.map(s => {
      const meta = s.metadata || {};
      let r7 = String(meta['ROMBEL KELAS 7'] || '').trim().toUpperCase();
      let r8 = String(meta['ROMBEL KELAS 8'] || '').trim().toUpperCase();
      let r9 = String(meta['ROMBEL KELAS 9'] || '').trim().toUpperCase();
      let rMain = String(meta['ROMBEL'] || '').trim().toUpperCase();
      let rombel = r9 || r8 || r7 || rMain;

      return {
        id: s.id,
        nama: meta['NAMA'] || s.nama || '',
        nisn: meta['NISN'] || '',
        nis: meta['ID SISWA'] || s.id_siswa || '',
        kelas: rombel,
        role: 'SISWA',
        rfidUid: meta['RFID_UID'] || meta['NO_RFID'] || ''
      };
    });

    data.sort((a, b) => a.nama.localeCompare(b.nama));

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('GET Mapping RFID Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { studentId, nisn, rfidUid, role } = await req.json();

    if (!rfidUid || !String(rfidUid).trim()) {
      return NextResponse.json({ success: false, error: 'Nomor RFID tidak boleh kosong' }, { status: 400 });
    }

    if (!studentId && !nisn) {
      return NextResponse.json({ success: false, error: 'Identitas siswa/guru diperlukan' }, { status: 400 });
    }

    const cleanUid = String(rfidUid).trim();

    // ==========================================
    // 1. PROSES REGISTRASI KARTU GURU / GTK
    // ==========================================
    if (role === 'GURU') {
      const { data: targetGuru } = await supabase.from('data_guru').select('*').eq('id', studentId).single();
      if (!targetGuru) {
        return NextResponse.json({ success: false, error: 'Data guru tidak ditemukan' }, { status: 404 });
      }

      // Cek apakah UID sudah dipakai guru lain
      const { data: dupGuru } = await supabase.from('data_guru').select('id, nama, metadata').neq('id', studentId);
      const isDup = (dupGuru || []).find((g: any) => {
        const u = g.metadata?.['RFID_UID'] || g.metadata?.['NO_RFID'] || '';
        return String(u).trim().toLowerCase() === cleanUid.toLowerCase();
      });

      if (isDup) {
        return NextResponse.json({
          success: false,
          error: `Kartu RFID (${cleanUid}) sudah dipakai oleh Guru "${isDup.nama}".`
        }, { status: 400 });
      }

      const updatedMeta = {
        ...targetGuru.metadata,
        'RFID_UID': cleanUid
      };

      const { error: updErr } = await supabase.from('data_guru').update({ metadata: updatedMeta }).eq('id', studentId);
      if (updErr) throw updErr;

      return NextResponse.json({
        success: true,
        message: `Kartu RFID (${cleanUid}) berhasil ditautkan ke ${targetGuru.nama}.`,
        data: {
          id: targetGuru.id,
          nama: targetGuru.nama,
          rfidUid: cleanUid,
          role: 'GURU'
        }
      });
    }

    // ==========================================
    // 2. PROSES REGISTRASI KARTU SISWA
    // ==========================================
    let targetRow: any = null;
    if (studentId) {
      const { data } = await supabase.from('data_induk').select('*').eq('id', studentId).single();
      targetRow = data;
    } else if (nisn) {
      const { data } = await supabase.from('data_induk').select('*').ilike('metadata->>NISN', `%${nisn.trim()}%`).limit(1);
      targetRow = data?.[0];
    }

    if (!targetRow) {
      return NextResponse.json({ success: false, error: 'Data siswa tidak ditemukan' }, { status: 404 });
    }

    // Cek apakah UID RFID ini sudah terpakai oleh siswa lain
    const { data: duplicateRows } = await supabase
      .from('data_induk')
      .select('id, metadata')
      .neq('id', targetRow.id);

    const duplicateStudent = (duplicateRows || []).find((row: any) => {
      const existingUid = row.metadata?.['RFID_UID'] || row.metadata?.['NO_RFID'] || '';
      return String(existingUid).trim().toLowerCase() === cleanUid.toLowerCase();
    });

    if (duplicateStudent) {
      const dupName = duplicateStudent.metadata?.['NAMA'] || 'Siswa lain';
      return NextResponse.json({
        success: false,
        error: `Kartu RFID (${cleanUid}) sudah dipakai oleh "${dupName}". Mohon gunakan kartu lain atau cabut dulu dari siswa tersebut.`
      }, { status: 400 });
    }

    // Update metadata siswa
    const updatedMeta = {
      ...targetRow.metadata,
      'RFID_UID': cleanUid
    };

    const { error: updateErr } = await supabase
      .from('data_induk')
      .update({ metadata: updatedMeta })
      .eq('id', targetRow.id);

    if (updateErr) throw updateErr;

    return NextResponse.json({
      success: true,
      message: `Kartu RFID (${cleanUid}) berhasil ditautkan ke ${targetRow.metadata?.['NAMA'] || 'siswa'}.`,
      data: {
        id: targetRow.id,
        nama: targetRow.metadata?.['NAMA'],
        rfidUid: cleanUid,
        role: 'SISWA'
      }
    });

  } catch (error: any) {
    console.error('POST Mapping RFID Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE: Hapus tautan RFID dari siswa atau guru
export async function DELETE(req: Request) {
  try {
    const { studentId, role } = await req.json();
    if (!studentId) {
      return NextResponse.json({ success: false, error: 'ID diperlukan' }, { status: 400 });
    }

    // 1. CABUT DARI GURU
    if (role === 'GURU') {
      const { data: targetGuru } = await supabase.from('data_guru').select('*').eq('id', studentId).single();
      if (!targetGuru) {
        return NextResponse.json({ success: false, error: 'Guru tidak ditemukan' }, { status: 404 });
      }

      const updatedMeta = { ...targetGuru.metadata };
      delete updatedMeta['RFID_UID'];
      delete updatedMeta['NO_RFID'];

      const { error } = await supabase.from('data_guru').update({ metadata: updatedMeta }).eq('id', studentId);
      if (error) throw error;

      return NextResponse.json({ success: true, message: 'Tautan kartu RFID guru berhasil dicabut' });
    }

    // 2. CABUT DARI SISWA
    const { data: targetRow } = await supabase.from('data_induk').select('*').eq('id', studentId).single();
    if (!targetRow) {
      return NextResponse.json({ success: false, error: 'Siswa tidak ditemukan' }, { status: 404 });
    }

    const updatedMeta = { ...targetRow.metadata };
    delete updatedMeta['RFID_UID'];
    delete updatedMeta['NO_RFID'];

    const { error } = await supabase
      .from('data_induk')
      .update({ metadata: updatedMeta })
      .eq('id', studentId);

    if (error) throw error;

    return NextResponse.json({ success: true, message: 'Tautan kartu RFID berhasil dihapus' });
  } catch (error: any) {
    console.error('DELETE Mapping RFID Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
