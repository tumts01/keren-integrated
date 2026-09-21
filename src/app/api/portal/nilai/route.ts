import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const nisn = searchParams.get('nisn');
    
    if (!nisn) {
      return NextResponse.json({ success: false, error: 'Parameter nisn diperlukan' }, { status: 400 });
    }

    // TBD: Placeholder data until we map the actual Supabase tables for Nilai (STS / Perangkat Ujian)
    const dummyData = [
      { mapel: 'Matematika', ph1: 85, ph2: 90, pts: 88, pas: 90 },
      { mapel: 'Bahasa Indonesia', ph1: 90, ph2: 85, pts: 88, pas: 92 },
      { mapel: 'IPA', ph1: 80, ph2: 82, pts: 85, pas: 86 },
    ];

    return NextResponse.json({ 
      success: true, 
      data: dummyData,
      message: 'Data nilai masih dalam tahap sinkronisasi dengan Perangkat Ujian'
    });

  } catch (error: any) {
    console.error('Portal Nilai Error:', error);
    return NextResponse.json({ success: false, error: 'Gagal mengambil data' }, { status: 500 });
  }
}
