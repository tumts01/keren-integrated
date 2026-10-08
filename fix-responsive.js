const fs = require('fs');
const path = require('path');

const cssFiles = [
  'src/app/page.module.css',
  'src/app/absensi-gtk/Absensi.module.css',
  'src/app/bon/Bon.module.css',
  'src/app/bon/tambah/AddBon.module.css',
  'src/app/guru/Guru.module.css',
  'src/app/jadwal-mengajar/Jadwal.module.css',
  'src/app/jurnal/jurnal.module.css',
  'src/app/kelas/Kelas.module.css',
  'src/app/loker-digital/Loker.module.css',
  'src/app/mata-pelajaran/Mapel.module.css',
  'src/app/pengumuman/pengumuman.module.css',
  'src/app/persuratan/Persuratan.module.css',
  'src/app/presensi/presensi.module.css',
  'src/app/siswa/Siswa.module.css',
  'src/app/spmb/Spmb.module.css',
  'src/app/spmb/rekap/Rekap.module.css',
];

// Common responsive patterns to detect and fix
function generateResponsive(content, filename) {
  const classes = [...content.matchAll(/\.(\w[\w-]*)\s*\{/g)].map(m => m[1]);
  const has = (cls) => classes.includes(cls);
  
  let rules768 = [];
  let rules420 = [];

  // Container padding
  if (has('container')) {
    rules768.push('  .container { padding: 16px; }');
    rules420.push('  .container { padding: 12px; }');
  }
  if (has('page')) {
    rules768.push('  .page { padding: 16px; }');
  }

  // Headers with flex
  for (const cls of ['header', 'pageHeader', 'headerRow', 'topBar', 'headerActions', 'filterBar', 'controls', 'toolBar', 'actionBar']) {
    if (has(cls)) {
      rules768.push(`  .${cls} { flex-direction: column; align-items: stretch; gap: 12px; }`);
    }
  }

  // Title areas
  for (const cls of ['title', 'pageTitle', 'sectionTitle', 'welcomeTitle']) {
    if (has(cls)) {
      rules768.push(`  .${cls} { font-size: 1.4rem; }`);
      rules420.push(`  .${cls} { font-size: 1.2rem; }`);
    }
  }

  // Grids
  for (const cls of ['grid', 'cardGrid', 'statsGrid', 'detailsGrid', 'cardsGrid', 'summaryGrid', 'rekapGrid', 'tingkatGrid', 'mapelGrid', 'categoryGrid']) {
    if (has(cls)) {
      rules768.push(`  .${cls} { grid-template-columns: repeat(2, 1fr); gap: 12px; }`);
      rules420.push(`  .${cls} { grid-template-columns: 1fr; gap: 10px; }`);
    }
  }

  // Welcome card
  if (has('welcomeCard')) {
    rules768.push('  .welcomeCard { padding: 20px; }');
  }

  // Profile hero
  if (has('profileHero')) {
    rules768.push('  .profileHero { flex-direction: column; text-align: center; padding: 20px 16px; }');
  }
  if (has('heroInfo')) {
    rules768.push('  .heroInfo { align-items: center; }');
  }
  if (has('photoFrame')) {
    rules768.push('  .photoFrame { width: 80px; height: 80px; }');
  }
  if (has('photo')) {
    rules768.push('  .photo { width: 80px; height: 80px; }');
  }
  if (has('badgeGrid')) {
    rules768.push('  .badgeGrid { justify-content: center; flex-wrap: wrap; }');
  }
  if (has('badge')) {
    rules768.push('  .badge { font-size: 0.8rem; padding: 4px 10px; }');
  }
  if (has('name')) {
    rules768.push('  .name { font-size: 1.4rem; }');
  }

  // Buttons
  for (const cls of ['actionArea', 'actions', 'headerButtons', 'buttonGroup', 'btnGroup']) {
    if (has(cls)) {
      rules768.push(`  .${cls} { width: 100%; flex-direction: column; }`);
      rules768.push(`  .${cls} button, .${cls} a { width: 100%; justify-content: center; box-sizing: border-box; }`);
    }
  }

  // Individual buttons
  for (const cls of ['btnPrimary', 'btnSecondary', 'btnExcel', 'btnAdd', 'submitBtn', 'addButton', 'exportBtn']) {
    if (has(cls)) {
      rules768.push(`  .${cls} { padding: 12px 16px; font-size: 0.9rem; width: 100%; justify-content: center; box-sizing: border-box; }`);
    }
  }

  // Search / filters
  for (const cls of ['searchBar', 'searchInput', 'searchBox', 'filterGroup', 'filters']) {
    if (has(cls)) {
      rules768.push(`  .${cls} { flex-direction: column; gap: 8px; width: 100%; }`);
    }
  }

  // Inputs and selects
  for (const cls of ['input', 'select', 'searchField', 'dateInput', 'textInput']) {
    if (has(cls)) {
      rules768.push(`  .${cls} { width: 100%; box-sizing: border-box; font-size: 0.9rem; }`);
    }
  }

  // Tables
  for (const cls of ['table', 'dataTable']) {
    if (has(cls)) {
      rules768.push(`  .${cls} th, .${cls} td { padding: 10px 8px; font-size: 0.85rem; }`);
    }
  }
  for (const cls of ['tableWrapper', 'tableResponsive', 'tableContainer', 'tableScroll']) {
    if (has(cls)) {
      rules768.push(`  .${cls} { overflow-x: auto; -webkit-overflow-scrolling: touch; }`);
    }
  }
  if (has('tableSection')) {
    rules768.push('  .tableSection { padding: 16px; border-radius: 12px; }');
  }
  if (has('tableHeader')) {
    rules768.push('  .tableHeader { flex-direction: column; align-items: stretch; gap: 12px; }');
  }

  // Cards
  for (const cls of ['card', 'detailCard', 'guruCard', 'fileCard', 'rekapCard', 'statCard', 'summaryCard', 'infoCard']) {
    if (has(cls)) {
      rules768.push(`  .${cls} { padding: 16px; }`);
    }
  }

  // Modal
  if (has('modalContent') || has('modal')) {
    const mcls = has('modalContent') ? 'modalContent' : 'modal';
    rules768.push(`  .${mcls} { width: 95%; padding: 20px; max-height: 90vh; overflow-y: auto; }`);
  }
  if (has('modalTitle')) {
    rules768.push('  .modalTitle { font-size: 1.2rem; }');
  }
  if (has('modalActions') || has('modalButtons') || has('modalFooter')) {
    const mcls = has('modalActions') ? 'modalActions' : has('modalButtons') ? 'modalButtons' : 'modalFooter';
    rules768.push(`  .${mcls} { flex-direction: column-reverse; gap: 8px; }`);
    rules768.push(`  .${mcls} button { width: 100%; justify-content: center; padding: 12px; box-sizing: border-box; }`);
  }

  // Form groups
  if (has('formGroup') || has('formRow')) {
    const fcls = has('formGroup') ? 'formGroup' : 'formRow';
    rules768.push(`  .${fcls} { margin-bottom: 16px; }`);
  }

  // Tabs
  if (has('tabs') || has('tabBar') || has('tabList')) {
    const tcls = has('tabs') ? 'tabs' : has('tabBar') ? 'tabBar' : 'tabList';
    rules768.push(`  .${tcls} { overflow-x: auto; -webkit-overflow-scrolling: touch; gap: 4px; }`);
  }
  if (has('tab') || has('tabButton')) {
    const tcls = has('tab') ? 'tab' : 'tabButton';
    rules768.push(`  .${tcls} { padding: 8px 12px; font-size: 0.85rem; white-space: nowrap; }`);
  }

  // Stats
  for (const cls of ['statNumber', 'statValue', 'bigNumber']) {
    if (has(cls)) {
      rules768.push(`  .${cls} { font-size: 1.5rem; }`);
    }
  }

  // Info list items
  if (has('infoList')) {
    rules768.push('  .infoList { gap: 12px; }');
  }
  if (has('infoItem')) {
    rules768.push('  .infoItem { padding: 12px 0; }');
  }
  if (has('infoLabel')) {
    rules768.push('  .infoLabel { font-size: 0.8rem; }');
  }
  if (has('infoValue')) {
    rules768.push('  .infoValue { font-size: 0.95rem; }');
  }

  // Card header
  if (has('cardHeader')) {
    rules768.push('  .cardHeader { font-size: 1rem; }');
  }
  if (has('cardIcon')) {
    rules768.push('  .cardIcon { width: 32px; height: 32px; font-size: 0.9rem; }');
  }

  // History / timeline items
  for (const cls of ['historyItem', 'historyCard', 'announcement', 'messageCard']) {
    if (has(cls)) {
      rules768.push(`  .${cls} { padding: 14px; }`);
    }
  }

  // File/doc items
  for (const cls of ['fileItem', 'fileList', 'docGrid', 'folderGrid']) {
    if (has(cls)) {
      rules768.push(`  .${cls} { gap: 10px; }`);
    }
  }

  // Suggestions / autocomplete
  if (has('suggestions')) {
    rules768.push('  .suggestions { max-height: 160px; }');
  }
  if (has('suggestionItem')) {
    rules768.push('  .suggestionItem { padding: 10px 12px; font-size: 0.9rem; }');
  }

  // Loading
  if (has('loading')) {
    rules768.push('  .loading { min-height: 50vh; font-size: 1rem; }');
  }

  // Build output
  let output = '';
  
  if (rules768.length > 0) {
    output += '\n/* ===== MOBILE RESPONSIVE ===== */\n';
    output += '@media (max-width: 768px) {\n';
    output += [...new Set(rules768)].join('\n') + '\n';
    output += '}\n';
  }
  
  if (rules420.length > 0) {
    output += '\n@media (max-width: 420px) {\n';
    output += [...new Set(rules420)].join('\n') + '\n';
    output += '}\n';
  }
  
  return output;
}

let totalUpdated = 0;

for (const file of cssFiles) {
  const fullPath = path.join(__dirname, file);
  const content = fs.readFileSync(fullPath, 'utf8');
  
  // Skip if already has media queries
  if (content.includes('@media')) {
    console.log(`SKIP (already has @media): ${path.basename(file)}`);
    continue;
  }
  
  const responsive = generateResponsive(content, path.basename(file));
  
  if (responsive.trim()) {
    fs.appendFileSync(fullPath, responsive);
    console.log(`UPDATED: ${path.basename(file)} (+${responsive.split('\n').length} lines)`);
    totalUpdated++;
  } else {
    console.log(`NO CHANGES: ${path.basename(file)}`);
  }
}

console.log(`\nDone! Updated ${totalUpdated} files.`);
