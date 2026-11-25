import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import {
  getGuruSessionFromRequest,
  isAdminOrPimpinanRole,
  isPerangkatUnlocked,
} from '@/lib/auth-session';

async function checkBendaharaAuthorized(req: Request): Promise<boolean> {
  const session = await getGuruSessionFromRequest(req);
  if (!session) return false;
  if (isAdminOrPimpinanRole(session.role)) return true;
  return isPerangkatUnlocked(req, 'bendahara', session.uid);
}

export async function GET(req: Request) {
  try {
    if (!(await checkBendaharaAuthorized(req))) {
      return NextResponse.json({ success: false, message: 'Akses Bendahara Ujian belum dibuka' }, { status: 403 });
    }
    const { data, error } = await supabase
      .from('bendahara_data')
      .select('*')
      .eq('periode', 'active')
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching bendahara data:', error);
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: data || { columns: [], data_map: {}, config: {} } });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    if (!(await checkBendaharaAuthorized(req))) {
      return NextResponse.json({ success: false, message: 'Akses Bendahara Ujian belum dibuka' }, { status: 403 });
    }
    const body = await req.json();
    const { columns, dataMap, config } = body;

    // Upsert the data for the active periode
    const { data, error } = await supabase
      .from('bendahara_data')
      .upsert({
        periode: 'active',
        columns: columns || [],
        data_map: dataMap || {},
        config: config || {},
        updated_at: new Date().toISOString()
      }, { onConflict: 'periode' });

    if (error) {
      console.error('Error saving bendahara data:', error);
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Data saved successfully' });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
