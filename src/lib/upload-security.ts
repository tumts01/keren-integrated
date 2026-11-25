export const MAX_UPLOAD_DOC_BYTES = 10 * 1024 * 1024; // 10 MB
export const MAX_UPLOAD_EXCEL_BYTES = 10 * 1024 * 1024; // 10 MB

export function isValidImageMagicBytes(buf: Buffer): boolean {
  if (!buf || buf.length < 4) return false;

  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return true;

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buf.length >= 8 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  ) {
    return true;
  }

  // GIF87a / GIF89a: 47 49 46 38
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38) {
    return true;
  }

  // BMP: 42 4D ("BM")
  if (buf[0] === 0x42 && buf[1] === 0x4d) {
    return true;
  }

  // WebP: "RIFF" .... "WEBP"
  if (
    buf.length >= 12 &&
    buf[0] === 0x52 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x46 &&
    buf[8] === 0x57 &&
    buf[9] === 0x45 &&
    buf[10] === 0x42 &&
    buf[11] === 0x50
  ) {
    return true;
  }

  // HEIC / HEIF / AVIF ISO Base Media File Format: bytes 4..7 === "ftyp"
  if (buf.length >= 12 && buf.subarray(4, 8).toString('ascii') === 'ftyp') {
    const brand = buf.subarray(8, 12).toString('ascii').toLowerCase();
    const allowedBrands = new Set(['heic', 'heix', 'hevc', 'hevx', 'mif1', 'msf1', 'avif', 'avis']);
    if (allowedBrands.has(brand)) return true;
  }

  return false;
}

export function isValidPdfMagicBytes(buf: Buffer): boolean {
  if (!buf || buf.length < 5) return false;
  // "%PDF-" pada awal berkas (toleransi BOM/whitespace kecil di awal hingga 64 byte)
  const head = buf.subarray(0, Math.min(buf.length, 64)).toString('latin1');
  return head.includes('%PDF-');
}

export function isValidExcelMagicBytes(buf: Buffer): boolean {
  if (!buf || buf.length < 8) return false;

  // .xlsx (OOXML ZIP): 50 4B 03 04
  if (buf[0] === 0x50 && buf[1] === 0x4b && buf[2] === 0x03 && buf[3] === 0x04) {
    return true;
  }

  // .xls (OLE2 Compound Binary): D0 CF 11 E0 A1 B1 1A E1
  if (
    buf[0] === 0xd0 &&
    buf[1] === 0xcf &&
    buf[2] === 0x11 &&
    buf[3] === 0xe0 &&
    buf[4] === 0xa1 &&
    buf[5] === 0xb1 &&
    buf[6] === 0x1a &&
    buf[7] === 0xe1
  ) {
    return true;
  }

  return false;
}
