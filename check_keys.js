require('dotenv').config({path: '.env.local'});
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
sb.from('data_induk').select('metadata').not('metadata', 'is', null).limit(10).then(r => {
  for (const row of r.data) {
    const keys = Object.keys(row.metadata);
    const asal = keys.filter(k => k.toLowerCase().includes('asal'));
    if (asal.length > 0) {
      console.log('Found ASAL keys:', asal);
      console.log('Values:', asal.map(k => row.metadata[k]));
      return;
    }
  }
  console.log('No ASAL key found in first 10 rows. Checking all keys of row 0:');
  if (r.data.length > 0) console.log(Object.keys(r.data[0].metadata));
}).catch(console.error);
