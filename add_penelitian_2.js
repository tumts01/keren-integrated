const fs = require('fs');
const path = 'src/app/jurnal-kegiatan/page.tsx';
let content = fs.readFileSync(path, 'utf8');

// Replace button
content = content.replace(
  /<button\s+className=\{\`btn \$\{activeTab === 'jurnal-mgmp' \? 'btn-primary' : 'btn-secondary'\}\`\}\s+onClick=\{\(\) => setActiveTab\('jurnal-mgmp'\)\}\s+>\s*<i className="fas fa-users-cog"><\/i> Jurnal MGMP\s*<\/button>/,
  `<button 
                className={\`btn \${activeTab === 'jurnal-mgmp' ? 'btn-primary' : 'btn-secondary'}\`}
                onClick={() => setActiveTab('jurnal-mgmp')}
              >
                <i className="fas fa-users-cog"></i> Jurnal MGMP
              </button>
              <button 
                className={\`btn \${activeTab === 'penelitian-mahasiswa' ? 'btn-primary' : 'btn-secondary'}\`}
                onClick={() => setActiveTab('penelitian-mahasiswa')}
              >
                <i className="fas fa-user-graduate"></i> Penelitian Mahasiswa
              </button>`
);

// Replace component
content = content.replace(
  /\) : activeTab === 'jurnal-mgmp' \? \(\s*<JurnalMgmpTab \/>/,
  `) : activeTab === 'jurnal-mgmp' ? (
          <JurnalMgmpTab />
        ) : activeTab === 'penelitian-mahasiswa' ? (
          <PenelitianMahasiswaTab />`
);

fs.writeFileSync(path, content);
console.log('done2');
