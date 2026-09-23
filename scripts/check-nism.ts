import { supabase } from '../src/lib/supabase';
async function run() {
  const {data} = await supabase.from('data_induk').select('metadata');
  const nisms = (data || []).map((d: any) => d.metadata?.NISM || d.metadata?.['NISM']).filter(Boolean);
  console.log('Found ' + nisms.length + ' NISMs');
  console.log(nisms.slice(0, 50));
}
run();
