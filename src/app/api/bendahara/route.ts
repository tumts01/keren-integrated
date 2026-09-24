import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
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
