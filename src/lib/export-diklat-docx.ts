import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, AlignmentType, WidthType, BorderStyle, ImageRun, PageBreak } from 'docx';
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
  dokumentasi?: string[];
}

async function fetchImageBuffer(url: string): Promise<Uint8Array | null> {
  try {
    const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(url)}&size=w800`;
    const res = await fetch(proxyUrl);
    if (!res.ok) return null;
    const arrayBuffer = await res.arrayBuffer();
    return new Uint8Array(arrayBuffer);
  } catch (err) {
    console.warn('Failed to fetch image for docx export:', url, err);
    return null;
  }
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

  // Unduh lampiran foto kegiatan (jika ada) untuk disematkan ke dalam Word
  const photoRuns: { buffer: Uint8Array; index: number }[] = [];
  if (data.dokumentasi && data.dokumentasi.length > 0) {
    for (let i = 0; i < data.dokumentasi.length; i++) {
      const imgUrl = data.dokumentasi[i];
      if (imgUrl && typeof imgUrl === 'string' && imgUrl.trim()) {
        const buf = await fetchImageBuffer(imgUrl.trim());
        if (buf) {
          photoRuns.push({ buffer: buf, index: photoRuns.length + 1 });
        }
      }
    }
  }

  const lampiranElements: (Paragraph | Table)[] = [];

  if (photoRuns.length > 0) {
    lampiranElements.push(
      new Paragraph({
        children: [new PageBreak()]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 200, after: 100 },
        children: [
          new TextRun({
            text: 'LAMPIRAN',
            font: 'Times New Roman',
            bold: true,
            size: 28,
          })
        ]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        children: [
          new TextRun({
            text: 'DOKUMENTASI FOTO KEGIATAN',
            font: 'Times New Roman',
            bold: true,
            size: 28,
            underline: {}
          })
        ]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
        children: [
          new TextRun({
            text: `${data.namaKegiatan} — ${data.tempat}`,
            font: 'Times New Roman',
            italics: true,
            size: 22,
            color: '444444'
          })
        ]
      })
    );

    const photoTableRows: TableRow[] = [];
    for (let i = 0; i < photoRuns.length; i += 2) {
      const p1 = photoRuns[i];
      const p2 = photoRuns[i + 1];

      const cells: TableCell[] = [
        new TableCell({
          width: { size: 50, type: WidthType.PERCENTAGE },
          borders: borderNone,
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 100 },
              children: [
                new ImageRun({
                  type: 'jpg',
                  data: p1.buffer,
                  transformation: { width: 270, height: 190 }
                })
              ]
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 300 },
              children: [
                new TextRun({
                  text: `Foto Dokumentasi ${p1.index}`,
                  font: 'Times New Roman',
                  bold: true,
                  italics: true,
                  size: 20
                })
              ]
            })
          ]
        })
      ];

      if (p2) {
        cells.push(
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            borders: borderNone,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 100 },
                children: [
                  new ImageRun({
                    type: 'jpg',
                    data: p2.buffer,
                    transformation: { width: 270, height: 190 }
                  })
                ]
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 300 },
                children: [
                  new TextRun({
                    text: `Foto Dokumentasi ${p2.index}`,
                    font: 'Times New Roman',
                    bold: true,
                    italics: true,
                    size: 20
                  })
                ]
              })
            ]
          })
        );
      } else {
        cells.push(
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            borders: borderNone,
            children: [new Paragraph({ children: [] })]
          })
        );
      }

      photoTableRows.push(new TableRow({ children: cells }));
    }

    lampiranElements.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: photoTableRows
      })
    );
  }

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
          }),

          // Lampiran Foto Dokumentasi Kegiatan jika ada
          ...lampiranElements
        ]
      }
    ]
  });

  const blob = await Packer.toBlob(doc);
  const cleanFilename = `Laporan_Diklat_${data.namaGuru.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_')}_${data.namaKegiatan.slice(0, 20).replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_')}.docx`;
  saveAs(blob, cleanFilename);
}
