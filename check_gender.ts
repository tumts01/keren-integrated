import { config } from 'dotenv';
config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data } = await supabase.from('data_induk').select('id, metadata').contains('metadata', {'NAMA': 'GANJAR MARTO WIBOWO'}).single();
  if (data) {
     data.metadata['JENIS KELAMIN'] = 'Laki-laki';
     await supabase.from('data_induk').update({ metadata: data.metadata }).eq('id', data.id);
     console.log('Fixed Ganjar!');
  }
}
check();
