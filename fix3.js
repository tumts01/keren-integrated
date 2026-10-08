const fs = require('fs');

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

function replaceRobust(text, search, replace) {
  const escapedSearch = escapeRegExp(search).replace(/\\r\?\\n/g, '\\r?\\n');
  const searchRegex = new RegExp(escapedSearch, 'g');
  return text.replace(searchRegex, replace);
}

// 1. CSS
const h0 = '.col-nama { width: 55%; }';
const r0 = '.col-nama { width: 45%; }';

// 2. Angkatan Header
const h1 = '                          <th className="col-domisili" style={{ width: \'25%\' }}>Domisili</th>\r\n                          <th className="col-ket">Keterangan</th>\r\n                        </tr>';
const r1 = '                          <th className="col-domisili" style={{ width: \'20%\' }}>Domisili</th>\n                          <th className="col-ket">Keterangan</th>\n                          <th className="col-ket">Keterangan</th>\n                        </tr>';

// 3. Angkatan Body
const h2 = '                            <td className="col-domisili">{s.domisili || \'-\'}</td>\r\n                            <td className="col-ket"></td>\r\n                          </tr>';
const r2 = '                            <td className="col-domisili">{s.domisili || \'-\'}</td>\n                            <td className="col-ket"></td>\n                            <td className="col-ket"></td>\n                          </tr>';

// 4. Kelas Header Manual
const h3 = '                            <th className="col-kelas" style={{ width: \'20%\' }}>Kelas</th>\r\n                            <th className="col-domisili" style={{ width: \'25%\' }}>Domisili</th>';
const r3 = '                            <th className="col-kelas" style={{ width: \'20%\' }}>Kelas</th>\n                            <th className="col-domisili" style={{ width: \'20%\' }}>Domisili</th>';

// 5. Kelas Header Normal
const h4 = '                            <th className="col-domisili" style={{ width: \'25%\' }}>Domisili</th>\r\n                            <th className="col-ket">Keterangan</th>\r\n                          </>';
const r4 = '                            <th className="col-domisili" style={{ width: \'20%\' }}>Domisili</th>\n                            <th className="col-ket">Keterangan</th>\n                            <th className="col-ket">Keterangan</th>\n                          </>';

// 6. Kelas Body
const h5 = '                              <td className="col-domisili">{s.domisili || \'-\'}</td>\r\n                              <td className="col-ket"></td>\r\n                            </>';
const r5 = '                              <td className="col-domisili">{s.domisili || \'-\'}</td>\n                              <td className="col-ket"></td>\n                              <td className="col-ket"></td>\n                            </>';


let content = fs.readFileSync('src/app/siswa/page.tsx', 'utf8');

content = replaceRobust(content, h0, r0);

// Use simple split-join but normalize CRLF first
content = content.replace(/\r\n/g, '\n');
const n_h1 = h1.replace(/\r\n/g, '\n');
const n_h2 = h2.replace(/\r\n/g, '\n');
const n_h3 = h3.replace(/\r\n/g, '\n');
const n_h4 = h4.replace(/\r\n/g, '\n');
const n_h5 = h5.replace(/\r\n/g, '\n');

content = content.split(n_h1).join(r1);
content = content.split(n_h2).join(r2);
content = content.split(n_h3).join(r3);
content = content.split(n_h4).join(r4);
content = content.split(n_h5).join(r5);

fs.writeFileSync('src/app/siswa/page.tsx', content);
console.log('Done replacement');
