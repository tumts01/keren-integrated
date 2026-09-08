const fs = require('fs');
let content = fs.readFileSync('src/app/siswa/page.tsx', 'utf8');

content = content.replace(/\.col-nama \{ width: 55%; \}/g, '.col-nama { width: 45%; }');

content = content.replace(
  /                          <th className="col-domisili" style={{ width: '25%' }}>Domisili<\/th>\r?\n                          <th className="col-ket">Keterangan<\/th>\r?\n                        <\/tr>/g,
  '                          <th className="col-domisili" style={{ width: \'20%\' }}>Domisili</th>\n                          <th className="col-ket">Keterangan</th>\n                          <th className="col-ket">Keterangan</th>\n                        </tr>'
);

content = content.replace(
  /                            <td className="col-domisili">{s\.domisili \|\| '-'\}<\/td>\r?\n                            <td className="col-ket"><\/td>\r?\n                          <\/tr>/g,
  '                            <td className="col-domisili">{s.domisili || \'-\'}</td>\n                            <td className="col-ket"></td>\n                            <td className="col-ket"></td>\n                          </tr>'
);

content = content.replace(
  /                            <th className="col-kelas" style={{ width: '20%' }}>Kelas<\/th>\r?\n                            <th className="col-domisili" style={{ width: '25%' }}>Domisili<\/th>/g,
  '                            <th className="col-kelas" style={{ width: \'20%\' }}>Kelas</th>\n                            <th className="col-domisili" style={{ width: \'20%\' }}>Domisili</th>'
);

content = content.replace(
  /                            <th className="col-domisili" style={{ width: '25%' }}>Domisili<\/th>\r?\n                            <th className="col-ket">Keterangan<\/th>\r?\n                          <\/>/g,
  '                            <th className="col-domisili" style={{ width: \'20%\' }}>Domisili</th>\n                            <th className="col-ket">Keterangan</th>\n                            <th className="col-ket">Keterangan</th>\n                          </>'
);

content = content.replace(
  /                              <td className="col-domisili">{s\.domisili \|\| '-'\}<\/td>\r?\n                              <td className="col-ket"><\/td>\r?\n                            <\/>/g,
  '                              <td className="col-domisili">{s.domisili || \'-\'}</td>\n                              <td className="col-ket"></td>\n                              <td className="col-ket"></td>\n                            </>'
);

fs.writeFileSync('src/app/siswa/page.tsx', content);
console.log('Fixed Print Modal columns with RegExp CRLF');
