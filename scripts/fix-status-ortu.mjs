import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function run() {
  console.log('Fetching all students via pagination...');
  
  let allStudents = [];
  let from = 0;
  let size = 1000;
  
  while (true) {
    const { data, error } = await supabase.from('data_induk').select('id, metadata').range(from, from + size - 1);
    if (error) {
      console.error('Fetch error:', error);
      break;
    }
    
    if (data.length === 0) break;
    allStudents.push(...data);
    from += size;
  }
  
  console.log(`Found ${allStudents.length} total students. Checking metadata...`);
  
  let updateCount = 0;
  
  for (const student of allStudents) {
    const meta = student.metadata || {};
    let modified = false;
    
    const statusIbu = meta['STATUS IBU KANDUNG'];
    if (statusIbu && statusIbu.toLowerCase().includes('ibu kandung')) {
      meta['STATUS IBU KANDUNG'] = 'Masih Hidup';
      modified = true;
    }
    
    const statusAyah = meta['STATUS AYAH KANDUNG'];
    if (statusAyah && statusAyah.toLowerCase().includes('ayah kandung')) {
      meta['STATUS AYAH KANDUNG'] = 'Masih Hidup';
      modified = true;
    }
    
    if (modified) {
      const { error: updateError } = await supabase
        .from('data_induk')
        .update({ metadata: meta })
        .eq('id', student.id);
        
      if (updateError) {
        console.error(`Failed to update ID ${student.id}:`, updateError);
      } else {
        updateCount++;
      }
    }
  }
  
  console.log(`Successfully fixed ${updateCount} students in this batch.`);
}

run();
