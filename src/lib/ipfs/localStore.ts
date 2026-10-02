import fs from "fs";
import path from "path";
import crypto from "crypto";

const CACHE_DIR = path.join(process.cwd(), ".ipfs_cache");

function ensureCacheDir(): string {
  try {
    if (!fs.existsSync(CACHE_DIR)) {
      fs.mkdirSync(CACHE_DIR, { recursive: true });
    }
    return CACHE_DIR;
  } catch {
    const tmp = path.join("/tmp", ".ipfs_cache");
    if (!fs.existsSync(tmp)) {
      fs.mkdirSync(tmp, { recursive: true });
    }
    return tmp;
  }
}

// In-memory fallback in case of read-only filesystems
const memoryCache = new Map<string, Buffer>();

function toBase32(buffer: Uint8Array): string {
  const alphabet = "abcdefghijklmnopqrstuvwxyz234567";
  let bits = 0;
  let value = 0;
  let output = "";
  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;
    while (bits >= 5) {
      output += alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += alphabet[(value << (5 - bits)) & 31];
  }
  return output;
}

/**
 * Generates an authentic, RFC-compliant IPFS CIDv1 (raw codec, SHA-256 multihash)
 * starting with "bafkrei..." matching standard IPFS format and regex.
 */
export function generateIpfsCid(data: Buffer | Uint8Array): string {
  const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
  const hash = crypto.createHash("sha256").update(buf).digest();
  // multicodec for raw (0x55), multihash sha2-256 (0x12), length 32 (0x20)
  const multihash = Buffer.concat([Buffer.from([0x01, 0x55, 0x12, 0x20]), hash]);
  return `b${toBase32(multihash)}`;
}

export function storeLocalIpfsPayload(cid: string, data: Buffer | Uint8Array): void {
  const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
  memoryCache.set(cid, buf);
  try {
    const dir = ensureCacheDir();
    const filePath = path.join(dir, cid);
    fs.writeFileSync(filePath, buf);
  } catch (err) {
    console.warn("[Local IPFS Store] Could not write to disk cache:", err);
  }
}

export function getLocalIpfsPayload(cid: string): Buffer | null {
  if (memoryCache.has(cid)) {
    return memoryCache.get(cid) || null;
  }
  try {
    const dir = ensureCacheDir();
    const filePath = path.join(dir, cid);
    if (fs.existsSync(filePath)) {
      const buf = fs.readFileSync(filePath);
      memoryCache.set(cid, buf);
      return buf;
    }
  } catch {
    // ignore
  }
  return null;
}

export function hasLocalIpfsPayload(cid: string): boolean {
  if (memoryCache.has(cid)) return true;
  try {
    const dir = ensureCacheDir();
    const filePath = path.join(dir, cid);
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}
