import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { uploadFileToDrive } from '@/lib/google-drive';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

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

    if (id) {
      const single = data.find((d: any) => d.id === id || d.db_id?.toString() === id);
      if (!single) {
        return NextResponse.json({ success: false, error: 'Data notulen tidak ditemukan' }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: single });
    }

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

export async function PUT(request: Request) {
  try {
    const contentType = request.headers.get('content-type') || '';
    let id = '';
    let db_id = '';
    let tanggal = '';
    let waktu = '';
    let tempatRapat = '';
    let agendaRapat = '';
    let pimpinanRapat = '';
    let dihadiriOleh = '';
    let notulis = '';
    let hasilNotulen = '';
    let dokumentasiUrl = '';
    let files: File[] = [];

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      id = (formData.get('id') as string) || '';
      db_id = (formData.get('db_id') as string) || '';
      tanggal = (formData.get('tanggal') as string) || '';
      waktu = (formData.get('waktu') as string) || '';
      tempatRapat = (formData.get('tempatRapat') as string) || '';
      agendaRapat = (formData.get('agendaRapat') as string) || '';
      pimpinanRapat = (formData.get('pimpinanRapat') as string) || '';
      dihadiriOleh = (formData.get('dihadiriOleh') as string) || '';
      notulis = (formData.get('notulis') as string) || '';
      hasilNotulen = (formData.get('hasilNotulen') as string) || '';
      dokumentasiUrl = (formData.get('dokumentasiUrl') as string) || '';
      files = formData.getAll('dokumentasi') as File[];
    } else {
      const body = await request.json();
      id = body.id || '';
      db_id = body.db_id ? body.db_id.toString() : '';
      tanggal = body.tanggal || '';
      waktu = body.waktu || '';
      tempatRapat = body.tempatRapat || '';
      agendaRapat = body.agendaRapat || '';
      pimpinanRapat = body.pimpinanRapat || '';
      dihadiriOleh = body.dihadiriOleh || '';
      notulis = body.notulis || '';
      hasilNotulen = body.hasilNotulen || '';
      dokumentasiUrl = body.dokumentasi || '';
    }

    if (!id && !db_id) {
      return NextResponse.json({ success: false, error: 'ID notulen tidak disertakan' }, { status: 400 });
    }

    let query = supabase.from('data_notulen').select('*');
    if (db_id) {
      query = query.eq('id', db_id);
    } else {
      query = query.contains('metadata', { 'ID': id });
    }

    const { data: rows, error: findErr } = await query;
    if (findErr) throw findErr;
    const targetRow = rows && rows.length > 0 ? rows[0] : null;

    if (!targetRow) {
      return NextResponse.json({ success: false, error: 'Data notulen tidak ditemukan' }, { status: 404 });
    }

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

    const updatedMetadata = {
      ...targetRow.metadata,
      'Tanggal': tanggal !== undefined && tanggal !== '' ? tanggal : targetRow.metadata['Tanggal'],
      'Waktu': waktu !== undefined && waktu !== '' ? waktu : targetRow.metadata['Waktu'],
      'Tempat Rapat': tempatRapat !== undefined && tempatRapat !== '' ? tempatRapat : targetRow.metadata['Tempat Rapat'],
      'Agenda Rapat': agendaRapat !== undefined && agendaRapat !== '' ? agendaRapat : targetRow.metadata['Agenda Rapat'],
      'Pimpinan Rapat': pimpinanRapat !== undefined && pimpinanRapat !== '' ? pimpinanRapat : targetRow.metadata['Pimpinan Rapat'],
      'Dihadiri Oleh': dihadiriOleh !== undefined && dihadiriOleh !== '' ? dihadiriOleh : targetRow.metadata['Dihadiri Oleh'],
      'Notulis': notulis !== undefined && notulis !== '' ? notulis : targetRow.metadata['Notulis'],
      'Hasil Notulen': hasilNotulen !== undefined && hasilNotulen !== '' ? hasilNotulen : targetRow.metadata['Hasil Notulen'],
      'Dokumentasi': dokumentasiUrl !== undefined ? dokumentasiUrl : targetRow.metadata['Dokumentasi'],
    };

    const { error: updateErr } = await supabase.from('data_notulen').update({
      metadata: updatedMetadata
    }).eq('id', targetRow.id);

    if (updateErr) throw updateErr;

    return NextResponse.json({ success: true, message: 'Notulen berhasil diperbarui' });
  } catch (error: any) {
    console.error('API Notulen PUT Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    let id = searchParams.get('id');
    let db_id = searchParams.get('db_id');

    if (!id && !db_id) {
      try {
        const body = await request.json();
        id = body.id;
        db_id = body.db_id ? body.db_id.toString() : null;
      } catch {}
    }

    if (!id && !db_id) {
      return NextResponse.json({ success: false, error: 'ID notulen tidak disertakan' }, { status: 400 });
    }

    let query = supabase.from('data_notulen').delete();
    if (db_id) {
      query = query.eq('id', db_id);
    } else if (id) {
      query = query.contains('metadata', { 'ID': id });
    }

    const { error } = await query;
    if (error) throw error;

    return NextResponse.json({ success: true, message: 'Notulen berhasil dihapus' });
  } catch (error: any) {
    console.error('API Notulen DELETE Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
