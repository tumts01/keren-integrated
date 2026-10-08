const fs = require('fs');
let content = fs.readFileSync('src/app/spmb/page.tsx', 'utf8');

// Fix uploadToDrive fetch
const oldUpload = `    const res = await fetch('/api/spmb/upload', {
      method: 'POST',
      body: uploadFormData
    });
    
    const result = await res.json();
    if (!result.success) throw new Error(result.error);`;

const newUpload = `    const res = await fetch('/api/spmb/upload', {
      method: 'POST',
      body: uploadFormData
    });
    
    let result;
    try {
      result = await res.json();
    } catch (e) {
      if (res.status === 413) throw new Error("Ukuran file terlalu besar (Maksimal 2.5 MB).");
      throw new Error(\`Gagal upload file (Error sistem / \${res.status})\`);
    }
    if (!result.success) throw new Error(result.error);`;

content = content.replace(oldUpload, newUpload);

// Fix form submission fetch
const oldSubmit = `      const res = await fetch('/api/spmb', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dbPayload)
      });

      const result = await res.json();`;

const newSubmit = `      const res = await fetch('/api/spmb', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dbPayload)
      });

      let result;
      try {
        result = await res.json();
      } catch (e) {
        throw new Error(\`Gagal menyimpan data (Error sistem / \${res.status})\`);
      }`;

content = content.replace(oldSubmit, newSubmit);

// Fix file input onChange
const oldInput = `onChange={(e) => setFileKk(e.target.files?.[0] || null)}`;
const newInput = `onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file && file.size > 2.5 * 1024 * 1024) {
                    showToast('Ukuran file terlalu besar! Maksimal 2.5 MB.', 'error');
                    if (fileKkRef.current) fileKkRef.current.value = '';
                    setFileKk(null);
                  } else {
                    setFileKk(file || null);
                  }
                }}`;

content = content.replace(oldInput, newInput);

fs.writeFileSync('src/app/spmb/page.tsx', content);
console.log('Fixed SPMB form');
