export const KEREN_SESSION_COOKIE = 'keren_session';
export const PORTAL_SESSION_COOKIE = 'keren_portal_session';
export const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // 30 hari

export interface GuruSessionPayload {
  uid: number | string;
  username: string;
  nama: string;
  role: string;
  iat: number;
  exp: number;
}

export interface PortalSessionPayload {
  nisn: string;
  nis: string;
  nama: string;
  kelas: string;
  iat: number;
  exp: number;
}

function getSigningSecret(): string {
  return (
    process.env.SESSION_SECRET ||
    process.env.CRON_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.FONNTE_TOKEN ||
    process.env.GOOGLE_APPS_SCRIPT_UPLOAD_URL ||
    'keren-integrated-dev-only-secret-key'
  );
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlToBytes(b64url: string): Uint8Array {
  const padded = b64url.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((b64url.length + 3) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function getHmacKey(): Promise<CryptoKey> {
  const enc = new TextEncoder();
  return crypto.subtle.importKey(
    'raw',
    enc.encode(getSigningSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

export async function signToken<T extends { exp: number }>(payload: T): Promise<string> {
  const enc = new TextEncoder();
  const payloadB64 = bytesToBase64Url(enc.encode(JSON.stringify(payload)));
  const key = await getHmacKey();
  const sigBuf = await crypto.subtle.sign('HMAC', key, enc.encode(payloadB64));
  const sigB64 = bytesToBase64Url(new Uint8Array(sigBuf));
  return `${payloadB64}.${sigB64}`;
}

export async function verifyToken<T extends { exp: number }>(token: string | undefined | null): Promise<T | null> {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;

  try {
    const enc = new TextEncoder();
    const key = await getHmacKey();
    const sigBytes = base64UrlToBytes(parts[1]);
    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      sigBytes.buffer.slice(sigBytes.byteOffset, sigBytes.byteOffset + sigBytes.byteLength) as ArrayBuffer,
      enc.encode(parts[0])
    );
    if (!valid) return null;

    const dec = new TextDecoder();
    const parsed = JSON.parse(dec.decode(base64UrlToBytes(parts[0]))) as T;
    const nowSec = Math.floor(Date.now() / 1000);
    if (!parsed || typeof parsed.exp !== 'number' || parsed.exp < nowSec) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function parseCookieValue(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;
  const parts = cookieHeader.split(';');
  for (const part of parts) {
    const eqIdx = part.indexOf('=');
    if (eqIdx === -1) continue;
    const k = part.slice(0, eqIdx).trim();
    if (k === name) {
      return decodeURIComponent(part.slice(eqIdx + 1).trim());
    }
  }
  return null;
}

export async function getGuruSessionFromRequest(req: Request): Promise<GuruSessionPayload | null> {
  const raw = parseCookieValue(req.headers.get('cookie'), KEREN_SESSION_COOKIE);
  return verifyToken<GuruSessionPayload>(raw);
}

export async function getPortalSessionFromRequest(req: Request): Promise<PortalSessionPayload | null> {
  const raw = parseCookieValue(req.headers.get('cookie'), PORTAL_SESSION_COOKIE);
  return verifyToken<PortalSessionPayload>(raw);
}

export function isAdminOrPimpinanRole(role: string | undefined | null): boolean {
  const r = (role || '').trim().toLowerCase();
  return r === 'admin' || r === 'pimpinan';
}

export interface PerangkatUnlockPayload {
  scope: 'bendahara' | 'sekretaris';
  uid: number | string;
  exp: number;
}

export function getPerangkatCookieName(scope: 'bendahara' | 'sekretaris'): string {
  return scope === 'bendahara' ? 'keren_pu_bendahara' : 'keren_pu_sekretaris';
}

export async function isPerangkatUnlocked(
  req: Request,
  scope: 'bendahara' | 'sekretaris',
  uid: number | string
): Promise<boolean> {
  const raw = parseCookieValue(req.headers.get('cookie'), getPerangkatCookieName(scope));
  const parsed = await verifyToken<PerangkatUnlockPayload>(raw);
  return Boolean(parsed && parsed.scope === scope && String(parsed.uid) === String(uid));
}

export function isSensitiveStaffRole(role: string | undefined | null): boolean {
  const r = (role || '').trim().toLowerCase();
  return r === 'admin' || r === 'pimpinan' || r === 'bendahara' || r === 'sekretaris';
}
