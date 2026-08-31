import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { uploadFileToDrive } from '@/lib/google-drive';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { data: rows, error } = await supabase.from('data_notulen').select('*').order('id', { ascending: false });
    
    if (error) throw error;

    const data = (rows || []).map((row: any) => {
      const meta = row.metadata || {};
      return {
        id: meta['ID'] || row.id.toString(),
        db_id: row.id,
        tanggal: meta['Tanggal'] || '',
        waktu: meta['Waktu'] || '',
        tempatRapat: meta['Tempat Rapat'] || '',
        agendaRapat: meta['Agenda Rapat'] || '',
        pimpinanRapat: meta['Pimpinan Rapat'] || '',
        dihadiriOleh: meta['Dihadiri Oleh'] || '',
        notulis: meta['Notulis'] || '',
        hasilNotulen: meta['Hasil Notulen'] || '',
        dokumentasi: meta['Dokumentasi'] || '',
      };
    });

    return NextResponse.json({ success: true, data }, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' }
    });
  } catch (error: any) {
    console.error('API Notulen GET Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const action = formData.get('action') as string;
    
    if (action === 'update_dokumentasi') {
      const idToUpdate = formData.get('id') as string;
      const filesToUpdate = formData.getAll('dokumentasi') as File[];
      
      if (!idToUpdate || filesToUpdate.length === 0) {
        return NextResponse.json({ success: false, error: 'Data tidak lengkap' }, { status: 400 });
      }

      // Cari berdasarkan meta ID
      const { data: targetRows, error: findErr } = await supabase.from('data_notulen').select('*').contains('metadata', { 'ID': idToUpdate });
      if (findErr) throw findErr;
      
      const targetRow = targetRows && targetRows.length > 0 ? targetRows[0] : null;
      
      if (!targetRow) {
        return NextResponse.json({ success: false, error: 'Data notulen tidak ditemukan' }, { status: 404 });
      }
      
      const folderId = process.env.GOOGLE_DRIVE_PERSURATAN_FOLDER_ID || '';
      const urls: string[] = [];
      
      for (const file of filesToUpdate) {
        if (file.size > 0) {
          const arrayBuffer = await file.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const driveRes = await uploadFileToDrive(buffer, file.name, file.type, folderId);
          if (driveRes.webViewLink) {
            urls.push(driveRes.webViewLink);
          }
        }
      }
      
      if (urls.length > 0) {
        const existingUrl = targetRow.metadata['Dokumentasi'] || '';
        let newUrl = '';
        if (existingUrl) {
          newUrl = existingUrl + ' || ' + urls.join(' || ');
        } else {
          newUrl = urls.join(' || ');
        }
        
        const { error: updateErr } = await supabase.from('data_notulen').update({
          metadata: { ...targetRow.metadata, 'Dokumentasi': newUrl }
        }).eq('id', targetRow.id);
        
        if (updateErr) throw updateErr;
      }
      
      return NextResponse.json({ success: true, message: 'Dokumentasi berhasil ditambahkan' });
    }
    
    const tanggal = formData.get('tanggal') as string;
    const waktu = formData.get('waktu') as string;
    const tempatRapat = formData.get('tempatRapat') as string;
    const agendaRapat = formData.get('agendaRapat') as string;
    const pimpinanRapat = formData.get('pimpinanRapat') as string;
    const dihadiriOleh = formData.get('dihadiriOleh') as string;
    const notulis = formData.get('notulis') as string;
    const hasilNotulen = formData.get('hasilNotulen') as string;
    
    const files = formData.getAll('dokumentasi') as File[];
    let dokumentasiUrl = formData.get('dokumentasiUrl') as string || '';

    // Jika ada file gambar diupload
    if (files && files.length > 0) {
      const folderId = process.env.GOOGLE_DRIVE_PERSURATAN_FOLDER_ID || '';
      const urls: string[] = [];
      
      for (const file of files) {
        if (file.size > 0) {
          const arrayBuffer = await file.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const driveRes = await uploadFileToDrive(buffer, file.name, file.type, folderId);
          if (driveRes.webViewLink) {
            urls.push(driveRes.webViewLink);
          }
        }
      }
      
      if (urls.length > 0) {
        if (dokumentasiUrl) {
          dokumentasiUrl = dokumentasiUrl + ' || ' + urls.join(' || ');
        } else {
          dokumentasiUrl = urls.join(' || ');
        }
      }
    }

    const id = Date.now().toString();

    const { error: insertErr } = await supabase.from('data_notulen').insert([{
      metadata: {
        'ID': id,
        'Tanggal': tanggal,
        'Waktu': waktu,
        'Tempat Rapat': tempatRapat,
        'Agenda Rapat': agendaRapat,
        'Pimpinan Rapat': pimpinanRapat,
        'Dihadiri Oleh': dihadiriOleh,
        'Notulis': notulis || 'Admin',
        'Hasil Notulen': hasilNotulen,
        'Dokumentasi': dokumentasiUrl
      }
    }]);

    if (insertErr) throw insertErr;

    return NextResponse.json({ success: true, message: 'Notulen berhasil ditambahkan' });
  } catch (error: any) {
    console.error('API Notulen POST Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
