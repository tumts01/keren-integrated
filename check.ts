import { config } from 'dotenv';
config({ path: '.env.local' });
import { supabase } from './src/lib/supabase';

async function run() {
  const { data } = await supabase.from('cbt_soal').select('cabang_lomba');
  if (!data) return console.log('No data');
  
  const uniqueCabang = [...new Set(data.map((d: any) => d.cabang_lomba))];
  console.log('Unique Cabang in DB:', uniqueCabang);
  console.log('Total questions:', data.length);
}

run();
