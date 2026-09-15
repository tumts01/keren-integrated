import { config } from 'dotenv';
config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function fix() {
  const { data } = await supabase.from('data_presensi_siswa').select('*').eq('kelas', 'MULTIPLE');
  if (!data || data.length === 0) {
    console.log('No MULTIPLE found');
    return;
  }
  
  for (let r of data) {
    const { data: d2 } = await supabase.from('data_induk').select('metadata').contains('metadata', {'NAMA': r.metadata['NAMA SISWA']}).limit(1);
    if (d2 && d2.length > 0 && d2[0].metadata['ROMBEL']) {
      const realClass = d2[0].metadata['ROMBEL'];
      r.metadata['KELAS'] = realClass;
      await supabase.from('data_presensi_siswa').update({ kelas: realClass, metadata: r.metadata }).eq('id', r.id);
      console.log('Fixed', r.metadata['NAMA SISWA'], 'to', realClass);
    }
  }
}
fix();
