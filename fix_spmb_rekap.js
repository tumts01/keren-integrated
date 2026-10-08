const fs = require('fs');
let content = fs.readFileSync('src/app/spmb/rekap/page.tsx', 'utf8');

// 1. Add Swal import
const oldImport = `import styles from './Rekap.module.css';`;
const newImport = `import Swal from 'sweetalert2';\nimport styles from './Rekap.module.css';`;
if (content.includes(oldImport)) {
  content = content.replace(oldImport, newImport);
}

// 2. Add handleDelete function
const oldState = `const [isAdmin, setIsAdmin] = useState(false);`;
const newState = `const [isAdmin, setIsAdmin] = useState(false);

  const handleDelete = async (id: string, nama: string) => {
    const result = await Swal.fire({
      title: 'Hapus Data?',
      text: \`Yakin ingin menghapus pendaftar \${nama}?\`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'Ya, Hapus!'
    });

    if (result.isConfirmed) {
      try {
        const res = await fetch(\`/api/spmb?id=\${id}\`, { method: 'DELETE' });
        const resJson = await res.json();
        if (resJson.success) {
          Swal.fire('Terhapus!', 'Data berhasil dihapus.', 'success');
          setData(prev => prev.filter(item => item.rowNumber !== id));
        } else {
          Swal.fire('Gagal', resJson.error, 'error');
        }
      } catch (err) {
        Swal.fire('Error', 'Gagal menghapus data.', 'error');
      }
    }
  };`;
if (content.includes(oldState)) {
  content = content.replace(oldState, newState);
}

// 3. Add Delete Button
const oldButton = `{isAdmin && (
                            <button 
                              onClick={() => router.push(\`/spmb/edit/\${item.rowNumber}\`)} 
                              style={{ padding: '6px 12px', background: '#f59e0b', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                            >
                              <i className="fas fa-edit"></i> Edit Data
                            </button>
                          )}`;

const newButton = `{isAdmin && (
                            <>
                              <button 
                                onClick={() => router.push(\`/spmb/edit/\${item.rowNumber}\`)} 
                                style={{ padding: '6px 12px', background: '#f59e0b', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                              >
                                <i className="fas fa-edit"></i> Edit Data
                              </button>
                              <button 
                                onClick={() => handleDelete(item.rowNumber, item.namaLengkap)} 
                                style={{ padding: '6px 12px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                              >
                                <i className="fas fa-trash"></i> Hapus
                              </button>
                            </>
                          )}`;

if (content.includes(oldButton)) {
  content = content.replace(oldButton, newButton);
  fs.writeFileSync('src/app/spmb/rekap/page.tsx', content);
  console.log('Success');
} else {
  console.log('Could not find oldButton block');
}
