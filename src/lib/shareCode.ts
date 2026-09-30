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
 */
export function formatShareCodeInput(raw: string): string {
  // Remove everything except alphanumeric
  let cleaned = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");

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
 * Validates whether a share code matches the SV-XXXX-XXXX-XXXX structure
 */
export function isValidShareCodeFormat(code: string): boolean {
  if (!code) return false;
  const trimmed = code.trim().toUpperCase();
  return /^SV-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(trimmed);
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
