import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getGuruSessionFromRequest } from '@/lib/auth-session';
import { encryptPinForAdmin, hashSecret, verifySecret } from '@/lib/pin-crypto';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const session = await getGuruSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Sesi login tidak valid' }, { status: 401 });
    }

    const { pin, oldPin } = await req.json();
    const cleanPin = String(pin ?? '').trim();

    if (!/^\d{6}$/.test(cleanPin)) {
      return NextResponse.json(
        { success: false, error: 'PIN keamanan harus terdiri dari tepat 6 digit angka.' },
        { status: 400 }
      );
    }

    const { data: userRow, error: fetchErr } = await supabase
      .from('data_users')
      .select('*')
      .eq('id', session.uid)
      .maybeSingle();

    if (fetchErr || !userRow) {
      return NextResponse.json({ success: false, error: 'Akun tidak ditemukan' }, { status: 404 });
    }

    const existingHashOrPlain = userRow.metadata?.['PIN_HASH'] || userRow.metadata?.['PIN'];
    if (existingHashOrPlain) {
      const checkOld = verifySecret(String(oldPin ?? ''), String(existingHashOrPlain));
      if (!checkOld.valid) {
        return NextResponse.json(
          { success: false, error: 'PIN lama tidak sesuai!' },
          { status: 403 }
        );
      }
    }

    const updatedMeta = { ...(userRow.metadata || {}) };
    updatedMeta['PIN_HASH'] = hashSecret(cleanPin);
    updatedMeta['PIN_ENC'] = encryptPinForAdmin(cleanPin);
    delete updatedMeta['PIN']; // Hapus PIN plaintext lama jika ada

    const { error: updateErr } = await supabase
      .from('data_users')
      .update({ metadata: updatedMeta })
      .eq('id', userRow.id);

    if (updateErr) throw updateErr;

    return NextResponse.json({
      success: true,
      message: 'PIN keamanan 6 digit berhasil diaktifkan.',
    });
  } catch (error: any) {
    console.error('Set PIN Error:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal menyimpan PIN keamanan' },
      { status: 500 }
    );
  }
}
