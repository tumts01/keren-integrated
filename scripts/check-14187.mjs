import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
async function run() {
  const { data, error } = await supabase.from('data_induk').select('*').eq('id_siswa', '14187');
  console.log('Result:', data);
  if (error) console.error('Error:', error);
}
run();
