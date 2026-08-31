import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

function getCurrentDateString() {
  const date = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
  return date.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatPhone(rawHp: string) {
  let hp = rawHp.replace(/\D/g, '');
  if (hp.startsWith('0')) hp = '62' + hp.substring(1);
  return hp;
}

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const dateWIB = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
    const dayOfWeek = dateWIB.getDay();

    if (dayOfWeek === 0) {
      return NextResponse.json({ skipped: true, reason: 'Hari Minggu libur.' });
    }

    const todayStr = getCurrentDateString();

    const { data: liburRows } = await supabase.from('libur_gtk').select('*');
    if (liburRows) {
      const isLibur = liburRows.some((r: any) => r.metadata?.tanggal === todayStr);
      if (isLibur) {
        const info = liburRows.find((r: any) => r.metadata?.tanggal === todayStr);
        return NextResponse.json({
          skipped: true,
          reason: `Hari ini libur: ${info?.metadata?.keterangan || 'Hari Libur'}`
        });
      }
    }

    const { data: rowsGtk } = await supabase.from('data_guru').select('*');
    const { data: rowsAbsen } = await supabase.from('absen_gtk').select('*').eq('tanggal', todayStr);

    if (!rowsGtk || !rowsAbsen) {
      return NextResponse.json({ error: 'Data tidak ditemukan' }, { status: 500 });
    }

    const activeGtk = rowsGtk
      .filter((r: any) => (r.metadata?.Status || r.metadata?.STATUS || '').toLowerCase().trim() === 'aktif')
      .map((r: any) => ({
        nama: (r.nama || '').trim(),
        noHp: (r.metadata?.['No WA'] || r.metadata?.['Whatsapp'] || '').trim()
      }))
      .filter((g: any) => g.nama && g.noHp);

    const sudahAbsenSet = new Set(
      rowsAbsen
        .filter((r: any) => r.tanggal === todayStr && r.jam_masuk)
        .map((r: any) => (r.nama || '').trim().toLowerCase())
    );

    const belumAbsen = activeGtk.filter((g: any) => !sudahAbsenSet.has(g.nama.toLowerCase()));

    if (belumAbsen.length === 0) {
      return NextResponse.json({ success: true, message: 'Semua guru sudah absen masuk.' });
    }

    const FONTEND_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://keren-integrated.vercel.app';
    const wablasEndpoint = process.env.WABLAS_DOMAIN;
    const wablasToken = process.env.WABLAS_TOKEN;
    const results = [];

    if (wablasEndpoint && wablasToken) {
      for (const g of belumAbsen) {
        const phone = formatPhone(g.noHp);
        const msg = `Assalamu'alaikum Bapak/Ibu *${g.nama}*\n\nIni adalah pengingat otomatis dari *Sistem Absensi KEREN*.\n\nSaat ini Anda belum melakukan absensi MASUK pada tanggal ${todayStr}.\nMohon segera klik link berikut untuk melakukan absensi (pastikan lokasi Anda berada di madrasah):\n\n${FONTEND_URL}/absensi\n\nAbaikan pesan ini jika Anda sedang berhalangan hadir atau sudah melakukan izin.\nTerima kasih, selamat bertugas!`;

        try {
          const payload = {
            data: [
              { phone, message: msg }
            ]
          };

          const res = await fetch(`${wablasEndpoint}/api/v2/send-message`, {
            method: 'POST',
            headers: {
              'Authorization': wablasToken,
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify(payload)
          });
          const json = await res.json();
          results.push({ nama: g.nama, success: true, response: json });
        } catch (e: any) {
          results.push({ nama: g.nama, success: false, error: e.message });
        }
      }
    }

    return NextResponse.json({
      success: true,
      notified: belumAbsen.length,
      details: results
    });

  } catch (error: any) {
    console.error('WA Reminder Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
