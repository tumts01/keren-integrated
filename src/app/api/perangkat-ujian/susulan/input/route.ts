import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { data, error } = await supabase.from('data_input_susulan').select('*').order('id', { ascending: true });
    
    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json({ success: true, data: [] });
      }
      throw error;
    }
    
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('API GET Input Susulan Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, id, payload } = body;

    if (action === 'add') {
      const { data, error } = await supabase.from('data_input_susulan').insert([{ metadata: payload }]).select();
      if (error) throw error;
      return NextResponse.json({ success: true, data: data[0] });
    } 
    
    else if (action === 'edit') {
      if (!id) return NextResponse.json({ success: false, error: 'ID is required' }, { status: 400 });
      const { data, error } = await supabase.from('data_input_susulan').update({ metadata: payload }).eq('id', id).select();
      if (error) throw error;
      return NextResponse.json({ success: true, data: data[0] });
    }

    else if (action === 'delete') {
      if (!id) return NextResponse.json({ success: false, error: 'ID is required' }, { status: 400 });
      const { error } = await supabase.from('data_input_susulan').delete().eq('id', id);
      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('API POST Input Susulan Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
