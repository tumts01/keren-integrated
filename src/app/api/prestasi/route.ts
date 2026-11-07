import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tahunPelajaran = searchParams.get('tahunPelajaran');

    let query = supabase.from('data_prestasi').select('id, metadata').range(0, 4999);
    
    const { data, error } = await query;
    if (error) throw error;

    let parsedData = data.map(row => ({ id: row.id, ...row.metadata }));

    if (tahunPelajaran && tahunPelajaran !== 'Semua') {
      parsedData = parsedData.filter(item => item.tahun_pelajaran === tahunPelajaran);
    }

    // Sort by tanggal descending
    parsedData.sort((a, b) => {
      const dateA = new Date(a.tanggal || 0).getTime();
      const dateB = new Date(b.tanggal || 0).getTime();
      return dateB - dateA;
    });

    return NextResponse.json({ success: true, data: parsedData }, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' }
    });
  } catch (error: any) {
    console.error('Error GET data_prestasi:', error);
    return NextResponse.json({ success: false, error: 'Gagal mengambil data prestasi' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Support bulk / batch insert from Excel import
    if (body.bulk && Array.isArray(body.items)) {
      const items = body.items;
      if (items.length === 0) {
        return NextResponse.json({ success: false, error: 'Tidak ada data untuk diimpor' }, { status: 400 });
      }

      // Ambil nomor urut terakhir agar nomor urut berkesinambungan
      const { data: existingRows } = await supabase
        .from('data_prestasi')
        .select('metadata')
        .range(0, 4999);

      let maxNo = 0;
      (existingRows || []).forEach(r => {
        const n = parseInt(r.metadata?.no, 10);
        if (!isNaN(n) && n > maxNo) maxNo = n;
      });

      const recordsToInsert = items.map((item: any, idx: number) => {
        const { id, ...meta } = item;
        let assignedNo = meta.no;
        if (!assignedNo || isNaN(parseInt(assignedNo, 10))) {
          assignedNo = maxNo + idx + 1;
        } else {
          assignedNo = parseInt(assignedNo, 10);
        }
        return {
          metadata: {
            ...meta,
            no: assignedNo
          }
        };
      });

      const CHUNK_SIZE = 100;
      let totalInserted = 0;
      for (let i = 0; i < recordsToInsert.length; i += CHUNK_SIZE) {
        const chunk = recordsToInsert.slice(i, i + CHUNK_SIZE);
        const { error, data } = await supabase.from('data_prestasi').insert(chunk).select('id');
        if (error) throw error;
        totalInserted += (data ? data.length : chunk.length);
      }

      return NextResponse.json({
        success: true,
        message: `Berhasil mengimpor ${totalInserted} data prestasi baru`,
        count: totalInserted
      });
    }

    const { id, ...metadata } = body;

    if (id) {
      // Update
      const { error } = await supabase
        .from('data_prestasi')
        .update({ metadata })
        .eq('id', id);
      if (error) throw error;
      return NextResponse.json({ success: true, message: 'Data berhasil diperbarui' });
    } else {
      // Insert
      const { error } = await supabase
        .from('data_prestasi')
        .insert([{ metadata }]);
      if (error) throw error;
      return NextResponse.json({ success: true, message: 'Data berhasil ditambahkan' });
    }
  } catch (error: any) {
    console.error('Error POST data_prestasi:', error);
    return NextResponse.json({ success: false, error: error.message || 'Gagal menyimpan data prestasi' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ success: false, error: 'ID tidak ditemukan' }, { status: 400 });
    }

    const { error } = await supabase
      .from('data_prestasi')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true, message: 'Data berhasil dihapus' });
  } catch (error: any) {
    console.error('Error DELETE data_prestasi:', error);
    return NextResponse.json({ success: false, error: 'Gagal menghapus data prestasi' }, { status: 500 });
  }
}
