const fs = require('fs');

let content = fs.readFileSync('src/app/siswa/page.tsx', 'utf8');

// 1. CSS
content = content.split('.col-nama { width: 55%; }').join('.col-nama { width: 45%; }');

// 2. Angkatan Header
const h1 = `                          <th className="col-domisili" style={{ width: '25%' }}>Domisili</th>
                          <th className="col-ket">Keterangan</th>
                        </tr>`;
const r1 = `                          <th className="col-domisili" style={{ width: '20%' }}>Domisili</th>
                          <th className="col-ket">Keterangan</th>
                          <th className="col-ket">Keterangan</th>
                        </tr>`;
content = content.split(h1).join(r1);

// 3. Angkatan Body
const h2 = `                            <td className="col-domisili">{s.domisili || '-'}</td>
                            <td className="col-ket"></td>
                          </tr>`;
const r2 = `                            <td className="col-domisili">{s.domisili || '-'}</td>
                            <td className="col-ket"></td>
                            <td className="col-ket"></td>
                          </tr>`;
content = content.split(h2).join(r2);

// 4. Kelas Header Manual
const h3 = `                            <th className="col-kelas" style={{ width: '20%' }}>Kelas</th>
                            <th className="col-domisili" style={{ width: '25%' }}>Domisili</th>`;
const r3 = `                            <th className="col-kelas" style={{ width: '20%' }}>Kelas</th>
                            <th className="col-domisili" style={{ width: '20%' }}>Domisili</th>`;
content = content.split(h3).join(r3);

// 5. Kelas Header Normal
const h4 = `                            <th className="col-domisili" style={{ width: '25%' }}>Domisili</th>
                            <th className="col-ket">Keterangan</th>
                          </>`;
const r4 = `                            <th className="col-domisili" style={{ width: '20%' }}>Domisili</th>
                            <th className="col-ket">Keterangan</th>
                            <th className="col-ket">Keterangan</th>
                          </>`;
content = content.split(h4).join(r4);

// 6. Kelas Body
const h5 = `                              <td className="col-domisili">{s.domisili || '-'}</td>
                              <td className="col-ket"></td>
                            </>`;
const r5 = `                              <td className="col-domisili">{s.domisili || '-'}</td>
                              <td className="col-ket"></td>
                              <td className="col-ket"></td>
                            </>`;
content = content.split(h5).join(r5);

// To fix Windows CRLF vs LF issues in replace:
function replaceRobust(text, search, replace) {
  const searchRegex = new RegExp(search.replace(/\r?\n/g, '\\r?\\n'), 'g');
  return text.replace(searchRegex, replace);
}

let content2 = fs.readFileSync('src/app/siswa/page.tsx', 'utf8');
content2 = content2.split('.col-nama { width: 55%; }').join('.col-nama { width: 45%; }');
content2 = replaceRobust(content2, h1, r1);
content2 = replaceRobust(content2, h2, r2);
content2 = replaceRobust(content2, h3, r3);
content2 = replaceRobust(content2, h4, r4);
content2 = replaceRobust(content2, h5, r5);

fs.writeFileSync('src/app/siswa/page.tsx', content2);
console.log('Done replacement');
