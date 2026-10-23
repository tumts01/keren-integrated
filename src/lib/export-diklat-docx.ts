import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, AlignmentType, WidthType, BorderStyle } from 'docx';
import { saveAs } from 'file-saver';

export interface DiklatDocxData {
  namaGuru: string;
  jabatan: string;
  namaKegiatan: string;
  tempat: string;
  tanggal: string;
  lama: string;
  penyelenggara: string;
  tujuanSingkat?: string;
  noSuratTugas?: string;
  noSertifikat?: string;
  tujuan: string;
  isi: string;
  tindakLanjut: string;
  dampak: string;
}

export async function exportDiklatToDocx(data: DiklatDocxData) {
  const borderNone = {
    top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  };

  const createInfoRow = (label: string, value: string) => {
    return new TableRow({
      children: [
        new TableCell({
          width: { size: 28, type: WidthType.PERCENTAGE },
          borders: borderNone,
          children: [
            new Paragraph({
              children: [new TextRun({ text: label, font: 'Times New Roman', size: 24, bold: true })]
            })
          ]
        }),
        new TableCell({
          width: { size: 4, type: WidthType.PERCENTAGE },
          borders: borderNone,
          children: [
            new Paragraph({
              children: [new TextRun({ text: ':', font: 'Times New Roman', size: 24, bold: true })]
            })
          ]
        }),
        new TableCell({
          width: { size: 68, type: WidthType.PERCENTAGE },
          borders: borderNone,
          children: [
            new Paragraph({
              children: [new TextRun({ text: value || '-', font: 'Times New Roman', size: 24 })]
            })
          ]
        }),
      ]
    });
  };

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440, // 1 inch
              bottom: 1440,
              left: 1440,
              right: 1440,
            }
          }
        },
        children: [
          // Title
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: 'LAPORAN',
                font: 'Times New Roman',
                bold: true,
                size: 28, // 14pt
              })
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
            children: [
              new TextRun({
                text: 'HASIL WORKSHOP / DIKLAT',
                font: 'Times New Roman',
                bold: true,
                size: 32, // 16pt
              })
            ]
          }),

          // Identitas Peserta & Kegiatan Table
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              createInfoRow('Nama', data.namaGuru),
              createInfoRow('Jabatan', data.jabatan),
              createInfoRow('Nama Kegiatan', data.namaKegiatan),
              createInfoRow('Tempat', data.tempat),
              createInfoRow('Tanggal', data.tanggal),
              createInfoRow('Lama', data.lama),
              createInfoRow('Penyelenggara', data.penyelenggara),
              createInfoRow('Tujuan', data.tujuanSingkat || data.tujuan || '-'),
              createInfoRow('Surat Tugas', data.noSuratTugas || '-'),
              createInfoRow('Sertifikat', data.noSertifikat || '-'),
            ]
          }),

          new Paragraph({ spacing: { after: 300 } }),

          // Section Header: URAIAN KEGIATAN
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 200, after: 300 },
            children: [
              new TextRun({
                text: 'URAIAN KEGIATAN',
                font: 'Times New Roman',
                bold: true,
                size: 26,
                underline: {}
              })
            ]
          }),

          // 1. TUJUAN
          new Paragraph({
            spacing: { before: 200, after: 100 },
            children: [
              new TextRun({
                text: 'TUJUAN:',
                font: 'Times New Roman',
                bold: true,
                size: 24,
              })
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            spacing: { after: 300 },
            children: [
              new TextRun({
                text: data.tujuan || '-',
                font: 'Times New Roman',
                size: 24,
              })
            ]
          }),

          // 2. ISI
          new Paragraph({
            spacing: { before: 200, after: 100 },
            children: [
              new TextRun({
                text: 'ISI MATERI / KEGIATAN:',
                font: 'Times New Roman',
                bold: true,
                size: 24,
              })
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            spacing: { after: 300 },
            children: [
              new TextRun({
                text: data.isi || '-',
                font: 'Times New Roman',
                size: 24,
              })
            ]
          }),

          // 3. TINDAK LANJUT WORKSHOP
          new Paragraph({
            spacing: { before: 200, after: 100 },
            children: [
              new TextRun({
                text: 'TINDAK LANJUT WORKSHOP:',
                font: 'Times New Roman',
                bold: true,
                size: 24,
              })
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            spacing: { after: 300 },
            children: [
              new TextRun({
                text: data.tindakLanjut || '-',
                font: 'Times New Roman',
                size: 24,
              })
            ]
          }),

          // 4. DAMPAK WORKSHOP
          new Paragraph({
            spacing: { before: 200, after: 100 },
            children: [
              new TextRun({
                text: 'DAMPAK WORKSHOP:',
                font: 'Times New Roman',
                bold: true,
                size: 24,
              })
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            spacing: { after: 500 },
            children: [
              new TextRun({
                text: data.dampak || '-',
                font: 'Times New Roman',
                size: 24,
              })
            ]
          }),

          // Signatures Table
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    borders: borderNone,
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({ text: 'Mengetahui,', font: 'Times New Roman', size: 24 }),
                        ]
                      }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 1200 }, // space for signature
                        children: [
                          new TextRun({ text: 'Kepala MTs Almaarif 01 Singosari', font: 'Times New Roman', size: 24 }),
                        ]
                      }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({ text: 'Dwi Retno Palupi, M.Pd.', font: 'Times New Roman', bold: true, underline: {}, size: 24 }),
                        ]
                      })
                    ]
                  }),
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    borders: borderNone,
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({ text: 'Singosari, ' + new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }), font: 'Times New Roman', size: 24 }),
                        ]
                      }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 1200 }, // space for signature
                        children: [
                          new TextRun({ text: 'Guru yang Melaporkan,', font: 'Times New Roman', size: 24 }),
                        ]
                      }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({ text: data.namaGuru, font: 'Times New Roman', bold: true, underline: {}, size: 24 }),
                        ]
                      })
                    ]
                  }),
                ]
              })
            ]
          })
        ]
      }
    ]
  });

  const blob = await Packer.toBlob(doc);
  const cleanFilename = `Laporan_Diklat_${data.namaGuru.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_')}_${data.namaKegiatan.slice(0, 20).replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_')}.docx`;
  saveAs(blob, cleanFilename);
}
