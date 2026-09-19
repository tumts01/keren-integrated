require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await supabase.from("nilai_pk").upsert([{ 
    tahun_ajaran: "2026/2027", 
    kelas: "7E", 
    mata_pelajaran: "Test", 
    tipe: "materi_harian", 
    materi: "Materi 1", 
    sub_materi: "S1", 
    data_nilai: [], 
    guru: "Test" 
  }], { 
    onConflict: "tahun_ajaran,kelas,mata_pelajaran,tipe,materi,sub_materi" 
  }).select();

  console.log("Data:", data);
  console.log("Error:", error);
}

run();
