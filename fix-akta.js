const fs = require('fs');

let content = fs.readFileSync('src/app/spmb/page.tsx', 'utf8');

// 1 & 2. State & Ref
content = content.replace('const [fileAkta, setFileAkta] = useState<File | null>(null);\n', '');
content = content.replace('const fileAktaRef = useRef<HTMLInputElement>(null);\n', '');

// 3. Validation
content = content.replace('if (!fileKk || !fileAkta) {', 'if (!fileKk) {');
content = content.replace('showToast(\'File Kartu Keluarga dan Akta Kelahiran wajib diunggah!\', \'error\');', 'showToast(\'File Kartu Keluarga wajib diunggah!\', \'error\');');

// 4. Upload & Link
content = content.replace(/\/\/ 2\. Upload Akta dengan rename otomatis\s*const linkAkta = await uploadToDrive\(fileAkta, `AKTA_\$\{safeName\}`\);\s*/, '');
content = content.replace('linkKk: linkKk,\n          linkAkta: linkAkta\n', 'linkKk: linkKk\n');

// 6 & 7. Reset
content = content.replace('setFileAkta(null);\n', '');
content = content.replace('if (fileAktaRef.current) fileAktaRef.current.value = \'\';\n', '');

// 8. The UI Box
const aktaUploadBlock = `            {/* Akta Upload */}
            <div className={\`\${styles.fileUploadBox} \${fileAkta ? styles.hasFile : ''}\`} onClick={() => fileAktaRef.current?.click()}>
              <input 
                type="file" 
                accept="image/*,.pdf" 
                className={styles.hiddenInput} 
                ref={fileAktaRef} 
                onChange={(e) => setFileAkta(e.target.files?.[0] || null)}
              />
              <i className={\`fas fa-child \${styles.fileIcon}\`}></i>
              <div className={styles.fileTitle}>Akta Kelahiran <span>*</span></div>
              {fileAkta ? (
                <div className={styles.fileName}><i className="fas fa-check"></i> {fileAkta.name}</div>
              ) : (
                <div className={styles.fileDesc}>Klik untuk memilih file PDF atau Gambar</div>
              )}
            </div>`;

content = content.replace(aktaUploadBlock, '');

fs.writeFileSync('src/app/spmb/page.tsx', content);
console.log('Akta removed');
