/**
 * Helper untuk memformat simbol matematika umum seperti meter/cm persegi (m², cm²),
 * kubik (m³, cm³), serta notasi pangkat (^2, ^3).
 */
export function formatMathSymbols(str?: string | null): string {
  if (!str || typeof str !== 'string') return str || '';

  return str
    // Unit area (persegi): km2, hm2, dam2, dm2, cm2, mm2 -> km², cm²...
    .replace(/\b(km|hm|dam|dm|cm|mm)\s*\^?2(?!\d|[a-zA-Z])/gi, (match, unit) => `${unit.toLowerCase()}²`)
    // m2, m^2 -> m²
    .replace(/\bm\s*\^2(?!\d|[a-zA-Z])/gi, 'm²')
    .replace(/\bm2(?!\d|[a-zA-Z])/gi, 'm²')
    .replace(/(\d+)\s*m\s*2(?!\d|[a-zA-Z])/gi, '$1 m²')

    // Unit volume (kubik): km3, hm3, dam3, dm3, cm3, mm3 -> km³, cm³...
    .replace(/\b(km|hm|dam|dm|cm|mm)\s*\^?3(?!\d|[a-zA-Z])/gi, (match, unit) => `${unit.toLowerCase()}³`)
    // m3, m^3 -> m³
    .replace(/\bm\s*\^3(?!\d|[a-zA-Z])/gi, 'm³')
    .replace(/\bm3(?!\d|[a-zA-Z])/gi, 'm³')
    .replace(/(\d+)\s*m\s*3(?!\d|[a-zA-Z])/gi, '$1 m³')

    // Handle saat angka menempel langsung dengan satuan tanpa spasi: 100cm2, 50m2, 9cm3
    .replace(/(\d+)\s*(km|hm|dam|dm|cm|mm|m)2(?!\d|[a-zA-Z])/gi, '$1 $2²')
    .replace(/(\d+)\s*(km|hm|dam|dm|cm|mm|m)3(?!\d|[a-zA-Z])/gi, '$1 $2³')

    // Handle satuan percepatan /s2 -> /s²
    .replace(/\/s\s*\^?2(?!\d|[a-zA-Z])/gi, '/s²')

    // Generic carets ^2, ^3, ^4, dst.
    .replace(/\^2/g, '²')
    .replace(/\^3/g, '³')
    .replace(/\^4/g, '⁴')
    .replace(/\^5/g, '⁵')
    .replace(/\^0/g, '⁰')
    .replace(/\^1/g, '¹')
    .replace(/\^n/gi, 'ⁿ');
}
