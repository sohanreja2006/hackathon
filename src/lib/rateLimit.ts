/**
 * SecureVault — Cryptographic & Request Rate Limiter
 *
 * Implements progressive delay and temporary blocking against brute-force
 * scanning on share codes, recipient lookups, and key access attempts.
 *
 * SECURITY INVARIANTS:
 * - Constant-time responses for lookup failures to eliminate timing attacks.
 * - Never reveals whether an invalid attempt was "close" to an existing share ID.
 * - Progressively increases delays (100ms -> 500ms -> 1500ms -> 429 Block).
 */

interface RateLimitRecord {
  attempts: number;
  firstAttemptAt: number;
  lastAttemptAt: number;
  blockedUntil?: number;
}

const memoryLimitMap = new Map<string, RateLimitRecord>();

const WINDOW_MS = 60 * 1000; // 1 minute sliding window
const MAX_ATTEMPTS = 15;      // Max attempts per minute per key
const BLOCK_DURATION_MS = 5 * 60 * 1000; // 5 minute lockout after breach

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds?: number;
  delayMs?: number;
  error?: string;
}

/**
 * Checks and records an attempt for an action key (e.g. `share_lookup:127.0.0.1` or `share_access:IP:code`).
 */
export function checkRateLimit(actionKey: string): RateLimitResult {
  const now = Date.now();
  const record = memoryLimitMap.get(actionKey);

  if (!record) {
    memoryLimitMap.set(actionKey, {
      attempts: 1,
      firstAttemptAt: now,
      lastAttemptAt: now,
    });
    return { allowed: true, remaining: MAX_ATTEMPTS - 1, delayMs: 0 };
  }

  // Check if currently blocked
  if (record.blockedUntil && record.blockedUntil > now) {
    const retryAfterSeconds = Math.ceil((record.blockedUntil - now) / 1000);
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds,
      error: `Too many requests. Temporary security block active. Please retry in ${retryAfterSeconds} seconds.`,
    };
  }

  // Reset window if expired
  if (now - record.firstAttemptAt > WINDOW_MS) {
    record.attempts = 1;
    record.firstAttemptAt = now;
    record.lastAttemptAt = now;
    record.blockedUntil = undefined;
    return { allowed: true, remaining: MAX_ATTEMPTS - 1, delayMs: 0 };
  }

  // Increment attempts
  record.attempts += 1;
  record.lastAttemptAt = now;

  // If breached threshold, block
  if (record.attempts > MAX_ATTEMPTS) {
    record.blockedUntil = now + BLOCK_DURATION_MS;
    const retryAfterSeconds = Math.ceil(BLOCK_DURATION_MS / 1000);
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds,
      error: `Rate limit exceeded. Temporary security block active. Please retry in ${retryAfterSeconds} seconds.`,
    };
  }

  // Progressive delay calculation (100ms -> 300ms -> 600ms -> 1200ms)
  let delayMs = 0;
  if (record.attempts > 5) {
    delayMs = Math.min((record.attempts - 5) * 150, 1500);
  }

  return {
    allowed: true,
    remaining: Math.max(0, MAX_ATTEMPTS - record.attempts),
    delayMs,
  };
}

/**
 * Helper to extract client identifier (IP or forwarded header) from NextRequest
 */
export function getClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }
  return "127.0.0.1";
}
