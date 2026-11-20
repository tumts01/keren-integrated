export interface AnnouncementPopupData {
  pengirim?: string;
  tanggal?: string;
  jam?: string;
  pesan?: string;
  lampiran?: string;
  previewImageUrl?: string;
  attachmentName?: string;
}

export interface AnnouncementPopupOptions {
  allowOutsideClick?: boolean;
  isPreview?: boolean;
  confirmButtonText?: string;
}

export function extractDriveFileId(url?: string | null): string | null {
  if (!url) return null;
  const matchD = url.match(/\/[d]\/([a-zA-Z0-9_-]+)/);
  if (matchD?.[1]) return matchD[1];
  const matchId = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (matchId?.[1]) return matchId[1];
  return null;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatMessageHtml(rawText: string): string {
  const escaped = escapeHtml(rawText.trim());
  return escaped.replace(
    /(https?:\/\/[^\s<>"']+)/g,
    (url) =>
      `<a href="${url}" target="_blank" rel="noreferrer" style="color: #0284c7; font-weight: 600; text-decoration: underline; word-break: break-all;">${url}</a>`
  );
}

export async function showAnnouncementPopup(
  ann: AnnouncementPopupData,
  options: AnnouncementPopupOptions = {}
) {
  const Swal = (await import('sweetalert2')).default;

  const sender = escapeHtml(String(ann.pengirim || 'Admin').trim() || 'Admin');
  const tanggal = escapeHtml(String(ann.tanggal || '-').trim());
  const jam = escapeHtml(String(ann.jam || '').trim());
  const pesan = String(ann.pesan || '').trim();
  const lampiran = String(ann.lampiran || '').trim();
  const driveId = extractDriveFileId(lampiran);

  const resolvedImgUrl =
    ann.previewImageUrl ||
    (driveId ? `https://drive.google.com/thumbnail?id=${driveId}&sz=w800` : '');

  const previewBannerHtml = options.isPreview
    ? `<div style="margin-bottom: 12px; padding: 7px 12px; border-radius: 10px; background: #fef3c7; border: 1px solid #fcd34d; color: #92400e; font-size: 0.78rem; font-weight: 700; display: flex; align-items: center; gap: 8px; text-align: left;">
        <i class="fas fa-eye"></i>
        <span>Mode Pratinjau — Tampilan pop-up yang dilihat oleh user.</span>
      </div>`
    : '';

  const imgHtml = resolvedImgUrl
    ? `<div style="margin-bottom: 14px; border-radius: 14px; overflow: hidden; border: 1px solid #e2e8f0; background: #f8fafc; box-shadow: 0 4px 14px rgba(15, 23, 42, 0.06);">
        <img
          src="${escapeHtml(resolvedImgUrl)}"
          alt="Lampiran Pengumuman"
          style="width: 100%; max-height: 330px; object-fit: contain; display: block; margin: 0 auto;"
          onerror="this.parentElement.style.display='none'"
        />
      </div>`
    : '';

  const messageHtml = pesan
    ? `<div style="position: relative; background: linear-gradient(180deg, #ffffff 0%, #f0f9ff 100%); border: 1px solid #bae6fd; border-left: 5px solid #0284c7; border-radius: 14px; padding: 16px 18px; box-shadow: 0 2px 10px rgba(2, 132, 199, 0.06); max-height: 290px; overflow-y: auto; text-align: left;">
        <div style="font-size: 0.94rem; line-height: 1.68; color: #0f172a; white-space: pre-wrap; word-break: break-word;">${formatMessageHtml(pesan)}</div>
      </div>`
    : `<div style="background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 12px; padding: 14px; text-align: center; color: #64748b; font-size: 0.88rem; font-style: italic;">
        (Lihat informasi lengkap pada lampiran di atas)
      </div>`;

  const attachmentHtml = lampiran
    ? `<div style="margin-top: 14px; padding: 12px 14px; border-radius: 12px; background: #f8fafc; border: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap;">
        <div style="display: flex; align-items: center; gap: 9px; text-align: left;">
          <div style="width: 34px; height: 34px; border-radius: 9px; background: #e0f2fe; color: #0284c7; display: flex; align-items: center; justify-content: center; font-size: 0.95rem; flex-shrink: 0;">
            <i class="fas fa-paperclip"></i>
          </div>
          <div>
            <div style="font-size: 0.82rem; font-weight: 700; color: #1e293b;">Lampiran Tersedia</div>
            <div style="font-size: 0.72rem; color: #64748b;">Klik tombol untuk membuka atau mengunduh berkas</div>
          </div>
        </div>
        <a
          href="${escapeHtml(lampiran)}"
          target="_blank"
          rel="noreferrer"
          style="display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); color: #ffffff; text-decoration: none; border-radius: 9px; font-weight: 700; font-size: 0.82rem; box-shadow: 0 3px 10px rgba(2, 132, 199, 0.28);"
        >
          <i class="fas fa-external-link-alt"></i> Buka Lampiran
        </a>
      </div>`
    : ann.attachmentName
      ? `<div style="margin-top: 14px; padding: 10px 14px; border-radius: 12px; background: #f0fdf4; border: 1px solid #bbf7d0; display: flex; align-items: center; gap: 9px; color: #166534; font-size: 0.82rem; font-weight: 600;">
          <i class="fas fa-paperclip"></i>
          <span>File terlampir: ${escapeHtml(ann.attachmentName)}</span>
        </div>`
      : '';

  const html = `
    <div style="text-align: left; font-family: inherit;">
      ${previewBannerHtml}

      <!-- Header Banner -->
      <div style="position: relative; overflow: hidden; background: linear-gradient(135deg, #0f172a 0%, #0369a1 55%, #0ea5e9 100%); border-radius: 16px; padding: 18px 20px; color: #ffffff; margin-bottom: 14px; box-shadow: 0 8px 22px rgba(2, 132, 199, 0.25);">
        <div style="position: absolute; top: -22px; right: -18px; width: 96px; height: 96px; border-radius: 50%; background: rgba(255, 255, 255, 0.08);"></div>
        <div style="position: absolute; bottom: -28px; right: 42px; width: 64px; height: 64px; border-radius: 50%; background: rgba(255, 255, 255, 0.06);"></div>

        <div style="position: relative; z-index: 1; display: flex; align-items: center; gap: 14px;">
          <div style="width: 48px; height: 48px; border-radius: 14px; background: rgba(255, 255, 255, 0.18); border: 1px solid rgba(255, 255, 255, 0.3); backdrop-filter: blur(6px); display: flex; align-items: center; justify-content: center; font-size: 1.35rem; flex-shrink: 0; color: #fde047;">
            <i class="fas fa-bullhorn"></i>
          </div>
          <div style="min-width: 0;">
            <div style="display: inline-block; font-size: 0.68rem; font-weight: 800; letter-spacing: 0.8px; text-transform: uppercase; background: rgba(255, 255, 255, 0.18); padding: 3px 9px; border-radius: 999px; margin-bottom: 5px; color: #e0f2fe;">
              ✨ PENGUMUMAN RESMI
            </div>
            <div style="font-size: 1.15rem; font-weight: 800; line-height: 1.25; color: #ffffff;">
              Informasi Madrasah Terbaru
            </div>
            <div style="font-size: 0.78rem; color: #bae6fd; margin-top: 2px;">
              MTs Almaarif 01 Singosari
            </div>
          </div>
        </div>
      </div>

      <!-- Meta Sender & Timestamp Bar -->
      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; padding: 10px 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 14px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <div style="width: 28px; height: 28px; border-radius: 50%; background: #e0f2fe; color: #0369a1; display: flex; align-items: center; justify-content: center; font-size: 0.78rem;">
            <i class="fas fa-user-shield"></i>
          </div>
          <div style="font-size: 0.84rem; color: #334155;">
            Dari: <b style="color: #0f172a;">${sender}</b>
          </div>
        </div>
        <div style="display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 999px; background: #ffffff; border: 1px solid #e2e8f0; font-size: 0.76rem; font-weight: 600; color: #475569;">
          <i class="far fa-calendar-alt" style="color: #0284c7;"></i>
          <span>${tanggal}${jam ? ` • ${jam} WIB` : ''}</span>
        </div>
      </div>

      ${imgHtml}
      ${messageHtml}
      ${attachmentHtml}
    </div>
  `;

  return Swal.fire({
    html,
    confirmButtonText: options.confirmButtonText || '✓ Mengerti & Tutup',
    confirmButtonColor: '#0284c7',
    width: '540px',
    padding: '20px',
    background: '#ffffff',
    allowOutsideClick: options.allowOutsideClick ?? false,
    showCloseButton: true,
  });
}
