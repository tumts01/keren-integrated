import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';

export function hashSecret(plain: string): string {
  const salt = randomBytes(16).toString('hex');
  const derived = scryptSync(plain, salt, 32).toString('hex');
  return `scrypt:${salt}:${derived}`;
}

export function verifySecret(
  input: string,
  storedHashOrPlain: string
): { valid: boolean; needsRehash: boolean } {
  const cleanInput = String(input ?? '').trim();
  const cleanStored = String(storedHashOrPlain ?? '').trim();
  if (!cleanInput || !cleanStored) {
    return { valid: false, needsRehash: false };
  }

  if (cleanStored.startsWith('scrypt:')) {
    const parts = cleanStored.split(':');
    if (parts.length !== 3) return { valid: false, needsRehash: false };
    const [, salt, expectedHex] = parts;
    try {
      const expectedBuf = Buffer.from(expectedHex, 'hex');
      const actualBuf = scryptSync(cleanInput, salt, expectedBuf.length);
      if (expectedBuf.length !== actualBuf.length) {
        return { valid: false, needsRehash: false };
      }
      return { valid: timingSafeEqual(expectedBuf, actualBuf), needsRehash: false };
    } catch {
      return { valid: false, needsRehash: false };
    }
  }

  // Kompatibilitas mundur untuk PIN lama berformat plaintext di database (otomatis di-upgrade ke scrypt saat berhasil login)
  const expectedPlain = Buffer.from(cleanStored, 'utf8');
  const actualPlain = Buffer.from(cleanInput, 'utf8');
  if (expectedPlain.length !== actualPlain.length) {
    return { valid: false, needsRehash: false };
  }
  const matched = timingSafeEqual(expectedPlain, actualPlain);
  return { valid: matched, needsRehash: matched };
}

interface RateBucket {
  count: number;
  resetAt: number;
}

const rateBuckets = new Map<string, RateBucket>();

export function getClientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) {
    return xff.split(',')[0].trim();
  }
  return req.headers.get('x-real-ip')?.trim() || 'local';
}

export function checkRateLimit(
  bucketKey: string,
  maxAttempts = 15,
  windowMs = 5 * 60 * 1000
): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now();
  if (rateBuckets.size > 2000) {
    for (const [k, v] of rateBuckets.entries()) {
      if (v.resetAt <= now) rateBuckets.delete(k);
    }
  }

  const existing = rateBuckets.get(bucketKey);
  if (!existing || existing.resetAt <= now) {
    rateBuckets.set(bucketKey, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSec: 0 };
  }

  if (existing.count >= maxAttempts) {
    return {
      allowed: false,
      retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  existing.count += 1;
  return { allowed: true, retryAfterSec: 0 };
}

export function clearRateLimit(bucketKey: string): void {
  rateBuckets.delete(bucketKey);
}
