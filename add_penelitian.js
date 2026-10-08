const fs = require('fs');
const path = 'src/app/jurnal-kegiatan/page.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  "import JurnalMgmpTab from '@/components/JurnalMgmpTab';",
  "import JurnalMgmpTab from '@/components/JurnalMgmpTab';\nimport PenelitianMahasiswaTab from '@/components/PenelitianMahasiswaTab';"
);

content = content.replace(
  "useState<'notulen' | 'lpj' | 'jurnal-staf' | 'jurnal-mgmp'>('notulen');",
  "useState<'notulen' | 'lpj' | 'jurnal-staf' | 'jurnal-mgmp' | 'penelitian-mahasiswa'>('notulen');"
);

content = content.replace(
  `<button \n                className={\`btn \${activeTab === 'jurnal-mgmp' ? 'btn-primary' : 'btn-secondary'}\`}\n                onClick={() => setActiveTab('jurnal-mgmp')}\n              >\n                <i className="fas fa-users-cog"></i> Jurnal MGMP\n              </button>`,
  `<button \n                className={\`btn \${activeTab === 'jurnal-mgmp' ? 'btn-primary' : 'btn-secondary'}\`}\n                onClick={() => setActiveTab('jurnal-mgmp')}\n              >\n                <i className="fas fa-users-cog"></i> Jurnal MGMP\n              </button>\n              <button \n                className={\`btn \${activeTab === 'penelitian-mahasiswa' ? 'btn-primary' : 'btn-secondary'}\`}\n                onClick={() => setActiveTab('penelitian-mahasiswa')}\n              >\n                <i className="fas fa-user-graduate"></i> Penelitian Mahasiswa\n              </button>`
);

content = content.replace(
  ") : activeTab === 'jurnal-mgmp' ? (\n          <JurnalMgmpTab />",
  ") : activeTab === 'jurnal-mgmp' ? (\n          <JurnalMgmpTab />\n        ) : activeTab === 'penelitian-mahasiswa' ? (\n          <PenelitianMahasiswaTab />"
);

fs.writeFileSync(path, content);
console.log('done');
