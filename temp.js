const fs = require('fs');
const path = 'D:/keren-integrated/src/app/spmb/edit/[id]/page.tsx';
let lines = fs.readFileSync(path, 'utf8').split('\n');

const startIdx = lines.findIndex(l => l.includes('const handleSubmit = async'));
const endIdx = lines.findIndex((l, i) => i > startIdx && l.includes('return ('));

const newHandleSubmit = \  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.namaLengkap) {
      showToast('Nama Lengkap wajib diisi terlebih dahulu!', 'error');
      return;
    }
    setLoading(true);
    try {
      const safeName = formData.namaLengkap.trim().replace(/\\s+/g, '_');
      let newLinkKk = formData.linkKk || '';
      
      if (fileKk) newLinkKk = await uploadToDrive(fileKk, \\\KK_\\\\);

      const tempatTanggalLahir = \\\\, \\\\;
      const dbPayload = {
        ...formData,
        tempatTanggalLahir,
        linkKk: newLinkKk
      };

      const res = await fetch(\\\/api/spmb/\\\\, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dbPayload)
      });
      
      const result = await res.json();
      if (result.success) {
        showToast('Update Data SPMB Berhasil!', 'success');
        setTimeout(() => router.push('/spmb/rekap'), 1500);
      } else {
        showToast(\\\Gagal mengupdate: \\\\, 'error');
      }
    } catch (err: any) {
      showToast(\\\Error: \\\\, 'error');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return <div style={{ padding: '40px', textAlign: 'center' }}>Memuat data...</div>;

\;

lines.splice(startIdx, endIdx - startIdx, newHandleSubmit);
fs.writeFileSync(path, lines.join('\n'));
