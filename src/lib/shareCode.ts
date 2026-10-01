/**
 * Secure Share Code Generator & Validator
 *
 * Generates cryptographically secure, human-readable codes (e.g. SV-9X4K-7P2M-Q81D)
 * Uses unambiguous characters (no 0/O, 1/I/L) to prevent transcription mistakes.
 */

// Unambiguous Base-32 alphanumeric character set
const CHAR_SET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

/**
 * Generates a unique SecureVault share code: SV-XXXX-XXXX-XXXX
 */
export function generateShareCode(): string {
  const getRandomChars = (count: number): string => {
    let result = "";
    if (typeof crypto !== "undefined" && crypto.getRandomValues) {
      const bytes = new Uint8Array(count);
      crypto.getRandomValues(bytes);
      for (let i = 0; i < count; i++) {
        result += CHAR_SET[bytes[i] % CHAR_SET.length];
      }
    } else {
      for (let i = 0; i < count; i++) {
        result += CHAR_SET[Math.floor(Math.random() * CHAR_SET.length)];
      }
    }
    return result;
  };

  const group1 = getRandomChars(4);
  const group2 = getRandomChars(4);
  const group3 = getRandomChars(4);

  return `SV-${group1}-${group2}-${group3}`;
}

/**
 * Normalizes and automatically formats raw user input into SV-XXXX-XXXX-XXXX
 * or preserves shr_ IDs. Intelligently extracts share codes from full URLs.
 */
export function formatShareCodeInput(raw: string): string {
  if (!raw) return "";
  const trimmed = raw.trim();

  // If a full URL or string containing an explicit SV code was pasted, extract it cleanly
  const matchSv = trimmed.match(/SV-[A-Za-z0-9]{4}-[A-Za-z0-9]{4}-[A-Za-z0-9]{4}/i);
  if (matchSv) {
    return matchSv[0].toUpperCase();
  }

  // If a URL parameter ?code=... was pasted
  const matchParam = trimmed.match(/[?&]code=([A-Za-z0-9_-]+)/i);
  if (matchParam && matchParam[1]) {
    return formatShareCodeInput(matchParam[1]);
  }

  // If shr_ or file_ ID was pasted
  const matchShr = trimmed.match(/(shr_[A-Za-z0-9_]+|file_[A-Za-z0-9_]+)/i);
  if (matchShr) {
    return matchShr[1];
  }

  if (trimmed.startsWith("shr_") || trimmed.startsWith("file_")) {
    return trimmed;
  }

  // Remove everything except alphanumeric
  let cleaned = trimmed.toUpperCase().replace(/[^A-Z0-9]/g, "");

  // If user pasted something starting with "SV", strip the prefix first to avoid duplicate
  if (cleaned.startsWith("SV")) {
    cleaned = cleaned.slice(2);
  }

  // Limit to 12 body characters (3 groups of 4)
  cleaned = cleaned.slice(0, 12);

  if (cleaned.length === 0) {
    return "";
  }

  let formatted = "SV";
  for (let i = 0; i < cleaned.length; i++) {
    if (i % 4 === 0) {
      formatted += "-";
    }
    formatted += cleaned[i];
  }

  return formatted;
}

/**
 * Extracts Quick Share secret from a URL, hash fragment, query param, or raw string.
 */
export function extractSecretFromText(raw: string): string | null {
  if (!raw) return null;
  const match = raw.match(/secret=([a-fA-F0-9]{32,64})/i) ||
                raw.match(/#secret=([a-fA-F0-9]{32,64})/i) ||
                raw.match(/#([a-fA-F0-9]{64})/i);
  if (match) return match[1];

  const clean = raw.trim().replace(/^#?secret=/i, "").replace(/^0x/i, "");
  if (/^[a-fA-F0-9]{64}$/i.test(clean)) {
    return clean;
  }
  return null;
}

/**
 * Validates whether a share code matches the SV-XXXX-XXXX-XXXX structure or shr_ ID
 */
export function isValidShareCodeFormat(code: string): boolean {
  if (!code) return false;
  const trimmed = code.trim();
  if (trimmed.startsWith("shr_") || trimmed.startsWith("file_")) {
    return trimmed.length >= 8;
  }
  return /^SV-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/i.test(trimmed);
}

/**
 * Hashes a share password using SHA-256 with salt
 */
export async function hashSharePassword(password: string, salt = "SV_SHARE_SALT_v1"): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`${salt}:${password.trim()}`);
  
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  
  // Fallback for node server runtime
  const cryptoModule = await import("crypto");
  return cryptoModule.createHash("sha256").update(data).digest("hex");
}

/**
 * Computes ISO expiration string from option
 */
export function computeExpiresAt(option: "never" | "1h" | "24h" | "7d" | "30d"): string | null {
  if (option === "never") return null;

  const now = new Date();
  switch (option) {
    case "1h":
      now.setHours(now.getHours() + 1);
      break;
    case "24h":
      now.setHours(now.getHours() + 24);
      break;
    case "7d":
      now.setDate(now.getDate() + 7);
      break;
    case "30d":
      now.setDate(now.getDate() + 30);
      break;
  }
  return now.toISOString();
}
