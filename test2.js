const getNilaiAkhir = (record) => {
  const keys = ['NILAI AKHIR', 'Nilai Akhir', 'NA'];
  for (const k of keys) {
    if (record[k] !== undefined && record[k] !== '') return record[k];
  }
  const stsKeys = ['STS', 'SUMATIF TENGAH SEMESTER', 'Nilai STS', 'NILAI STS'];
  for (const k of stsKeys) {
    if (record[k] !== undefined && record[k] !== '') return record[k];
  }
  return '';
};

console.log(getNilaiAkhir({"NO":1,"L/P":"P","SAS":"","STS":75,"NISN":"3126189495","NAMA SISWA":"AALIYAH AURAMADHAN PUTRI ADI PRAJNAPARAMITA","MATERI 1 S1":85,"MATERI 1 S2":80,"MATERI 1 S3":"","MATERI 2 S1":"","MATERI 2 S2":"","MATERI 2 S3":"","MATERI 3 S1":"","MATERI 3 S2":"","MATERI 3 S3":"","MATERI 4 S1":"","MATERI 4 S2":"","MATERI 4 S3":"","MATERI 5 S1":"","MATERI 5 S2":"","MATERI 5 S3":"","MATERI 6 S1":"","MATERI 6 S2":"","MATERI 6 S3":"","NILAI AKHIR":""}));
