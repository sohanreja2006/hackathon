/**
 * SecureVault — Complete Receiving + Decryption End-to-End Verification Test
 *
 * Implements all 8 verification tests requested:
 * 1. Small File Test ("SecureVault receiving test")
 * 2. Multi-Chunk Test (out-of-order chunks, sorting, full reconstruction)
 * 3. Corruption Test (single flipped byte causes SHA-256 mismatch, halts before decrypt)
 * 4. Wrong Key Test (AES-GCM tag authentication failure stops without corrupt file output)
 * 5. Wrong Recipient Test (ECDH key agreement rejects adversary private key)
 * 6. Revocation Test (Owner revokes, subsequent recipient access denied)
 * 7. Expiration Test (Expired share returns 410 Expired)
 * 8. Download Limit Test (Max downloads reached returns 410 Download Limit Reached)
 */

import { x25519 } from "@noble/curves/ed25519";
import { hkdf } from "@noble/hashes/hkdf";
import { sha256 } from "@noble/hashes/sha256";
import { webcrypto } from "crypto";

if (!globalThis.crypto) {
  globalThis.crypto = webcrypto;
}

function bytesToHex(bytes) {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function hexToBytes(hex) {
  const clean = hex.trim().replace(/^0x/i, "");
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(clean.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

const HKDF_INFO = new TextEncoder().encode("SecureVault-E2EE-KeyWrapping-v1");
const HKDF_SALT = new Uint8Array(32);

function toBufferSource(bytes) {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

function buildAAD(fileId, chunkIndex, version = 2) {
  return new TextEncoder().encode(`SecureVault:v${version}:${fileId}:chunk${chunkIndex}`);
}

async function computeSha256(data) {
  const hashBuf = await crypto.subtle.digest("SHA-256", data);
  return bytesToHex(new Uint8Array(hashBuf));
}

async function createKeyEnvelope(fileKeyHex, recipientPubHex) {
  const recipientPubBytes = hexToBytes(recipientPubHex);
  const fileKeyBytes = hexToBytes(fileKeyHex);

  const ephemeralPrivBytes = x25519.utils.randomPrivateKey();
  const ephemeralPubBytes = x25519.getPublicKey(ephemeralPrivBytes);

  const sharedSecret = x25519.getSharedSecret(ephemeralPrivBytes, recipientPubBytes);
  const wrappingKeyBytes = hkdf(sha256, sharedSecret, HKDF_SALT, HKDF_INFO, 32);

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cryptoWrappingKey = await crypto.subtle.importKey(
    "raw",
    toBufferSource(wrappingKeyBytes),
    { name: "AES-GCM" },
    false,
    ["encrypt"]
  );

  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: toBufferSource(iv) },
    cryptoWrappingKey,
    toBufferSource(fileKeyBytes)
  );

  return {
    encryptedFileKey: bytesToHex(new Uint8Array(encryptedBuffer)),
    keyAgreementMetadata: {
      ephemeralPublicKey: bytesToHex(ephemeralPubBytes),
      iv: bytesToHex(iv),
      algorithm: "X25519-HKDF-SHA256-AES256GCM",
    },
  };
}

async function unwrapKeyEnvelope(encryptedFileKeyHex, metadata, recipientPrivHex) {
  const meta = typeof metadata === "string" ? JSON.parse(metadata) : metadata;
  const recipientPrivBytes = hexToBytes(recipientPrivHex);
  const ephemeralPubBytes = hexToBytes(meta.ephemeralPublicKey);
  const ivBytes = hexToBytes(meta.iv);
  const ciphertextBytes = hexToBytes(encryptedFileKeyHex);

  const sharedSecret = x25519.getSharedSecret(recipientPrivBytes, ephemeralPubBytes);
  const wrappingKeyBytes = hkdf(sha256, sharedSecret, HKDF_SALT, HKDF_INFO, 32);

  const cryptoWrappingKey = await crypto.subtle.importKey(
    "raw",
    toBufferSource(wrappingKeyBytes),
    { name: "AES-GCM" },
    false,
    ["decrypt"]
  );

  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: toBufferSource(ivBytes) },
    cryptoWrappingKey,
    toBufferSource(ciphertextBytes)
  );

  return bytesToHex(new Uint8Array(decryptedBuffer));
}

async function verifyAndDecryptChunkTest(encryptedData, keyHex, chunkIndex, expectedSha256, ivHex, fileId, candidateIds = []) {
  if (expectedSha256) {
    const actualHash = await computeSha256(encryptedData);
    if (actualHash.toLowerCase() !== expectedSha256.toLowerCase()) {
      throw new Error(`Integrity verification failed for chunk ${chunkIndex}. Expected ${expectedSha256}, got ${actualHash}`);
    }
  }

  const key = await crypto.subtle.importKey("raw", toBufferSource(hexToBytes(keyHex)), { name: "AES-GCM" }, false, ["decrypt"]);
  const iv = hexToBytes(ivHex);

  const allCandidateIds = Array.from(new Set([fileId, ...candidateIds].filter(Boolean)));
  const aadsToTry = [];
  for (const cid of allCandidateIds) {
    aadsToTry.push(buildAAD(cid, chunkIndex, 2));
    aadsToTry.push(buildAAD(cid, chunkIndex, 1));
  }
  aadsToTry.push(undefined);

  for (const aad of aadsToTry) {
    try {
      const params = { name: "AES-GCM", iv: toBufferSource(iv) };
      if (aad) params.additionalData = toBufferSource(aad);
      const plaintext = await crypto.subtle.decrypt(params, key, encryptedData);
      return plaintext;
    } catch {
      // try next
    }
  }

  throw new Error(`AES-GCM authentication failed for chunk ${chunkIndex}.`);
}

async function run() {
  console.log("==================================================");
  console.log("SECUREVAULT — 8 COMPREHENSIVE RECIPIENT FLOW TESTS");
  console.log("==================================================\n");

  const baseUrl = "http://localhost:3000";

  // Recipients
  const recipientPriv = x25519.utils.randomPrivateKey();
  const recipientPub = x25519.getPublicKey(recipientPriv);
  const recipientPrivHex = bytesToHex(recipientPriv);
  const recipientPubHex = bytesToHex(recipientPub);
  const recipientWallet = "0x70997970c51812dc3a010c7d01b50e0d17dc79c8";
  const ownerWallet = "0x32adaeda12be86106d8b9ffcae7df49bd7a8a6a8";

  // --------------------------------------------------------------------------
  // TEST 1: Small File Test ("SecureVault receiving test")
  // --------------------------------------------------------------------------
  console.log("[TEST 1/8] Small File End-to-End Test...");
  const smallText = "SecureVault receiving test";
  const smallBytes = new TextEncoder().encode(smallText);
  const smallFileId = `file_small_${Date.now()}`;
  const smallKeyRaw = crypto.getRandomValues(new Uint8Array(32));
  const smallKeyHex = bytesToHex(smallKeyRaw);
  const smallKey = await crypto.subtle.importKey("raw", smallKeyRaw, { name: "AES-GCM" }, false, ["encrypt"]);
  const smallIv = crypto.getRandomValues(new Uint8Array(12));
  const smallAad = buildAAD(smallFileId, 0, 2);

  const smallCiphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: toBufferSource(smallIv), additionalData: toBufferSource(smallAad) },
    smallKey,
    toBufferSource(smallBytes)
  );
  const smallHash = await computeSha256(smallCiphertext);

  // Wrap key for recipient
  const smallEnv = await createKeyEnvelope(smallKeyHex, recipientPubHex);

  // Recipient unwraps key
  const recoveredSmallKeyHex = await unwrapKeyEnvelope(smallEnv.encryptedFileKey, smallEnv.keyAgreementMetadata, recipientPrivHex);
  if (recoveredSmallKeyHex !== smallKeyHex) throw new Error("Key unwrapping failed for small file!");

  // Recipient decrypts chunk
  const smallPlainBuf = await verifyAndDecryptChunkTest(
    smallCiphertext,
    recoveredSmallKeyHex,
    0,
    smallHash,
    bytesToHex(smallIv),
    smallFileId
  );
  const decryptedSmallText = new TextDecoder().decode(smallPlainBuf);
  if (decryptedSmallText !== smallText) {
    throw new Error(`Small file text mismatch! Got: "${decryptedSmallText}"`);
  }
  console.log(`  ✅ Small file successfully decrypted: "${decryptedSmallText}"\n`);

  // --------------------------------------------------------------------------
  // TEST 2: Multi-Chunk Test with Out-of-Order Arrival & Sorting
  // --------------------------------------------------------------------------
  console.log("[TEST 2/8] Multi-Chunk Reordering & Reconstruction Test...");
  const multiText = "Chunked Data Block Content ".repeat(1500); // ~40KB
  const multiBytes = new TextEncoder().encode(multiText);
  const chunkSize = 8000;
  const numChunks = Math.ceil(multiBytes.length / chunkSize);
  const multiFileId = `file_multi_${Date.now()}`;
  const multiKeyRaw = crypto.getRandomValues(new Uint8Array(32));
  const multiKeyHex = bytesToHex(multiKeyRaw);
  const multiKey = await crypto.subtle.importKey("raw", multiKeyRaw, { name: "AES-GCM" }, false, ["encrypt"]);

  const multiChunks = [];
  for (let i = 0; i < numChunks; i++) {
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, multiBytes.length);
    const chunkSlice = multiBytes.slice(start, end);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const aad = buildAAD(multiFileId, i, 2);
    const encBuf = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: toBufferSource(iv), additionalData: toBufferSource(aad) },
      multiKey,
      toBufferSource(chunkSlice)
    );
    multiChunks.push({
      index: i,
      chunkIndex: i,
      iv: bytesToHex(iv),
      sha256: await computeSha256(encBuf),
      data: encBuf,
    });
  }

  // Simulate network arriving OUT OF ORDER: e.g. [3, 0, 4, 1, 2]
  const scrambledChunks = [...multiChunks].sort(() => Math.random() - 0.5);
  console.log(`  Simulated out-of-order network arrival: [${scrambledChunks.map(c => c.index).join(", ")}]`);

  // Recipient sorts by chunkIndex strictly
  const sortedChunks = [...scrambledChunks].sort((a, b) => a.chunkIndex - b.chunkIndex);
  console.log(`  Sorted for reconstruction: [${sortedChunks.map(c => c.index).join(", ")}]`);

  const decryptedParts = [];
  for (const c of sortedChunks) {
    const plain = await verifyAndDecryptChunkTest(c.data, multiKeyHex, c.chunkIndex, c.sha256, c.iv, multiFileId);
    decryptedParts.push(new Uint8Array(plain));
  }

  const totalLen = decryptedParts.reduce((s, p) => s + p.length, 0);
  const reconstructed = new Uint8Array(totalLen);
  let off = 0;
  for (const p of decryptedParts) {
    reconstructed.set(p, off);
    off += p.length;
  }
  const reconstructedMultiText = new TextDecoder().decode(reconstructed);
  if (reconstructedMultiText !== multiText) throw new Error("Multi-chunk reconstructed text mismatch!");
  console.log(`  ✅ Multi-chunk file (${numChunks} chunks, ${totalLen} bytes) reconstructed 100% identically.\n`);

  // --------------------------------------------------------------------------
  // TEST 3: Corruption Test
  // --------------------------------------------------------------------------
  console.log("[TEST 3/8] Corruption Test (Tampered Chunk Detection)...");
  const corruptedBuffer = multiChunks[1].data.slice(0);
  new Uint8Array(corruptedBuffer)[15] ^= 0xaa; // flip bits
  let corruptionCaught = false;
  try {
    await verifyAndDecryptChunkTest(corruptedBuffer, multiKeyHex, 1, multiChunks[1].sha256, multiChunks[1].iv, multiFileId);
  } catch (err) {
    if (err.message.includes("Integrity verification failed")) {
      corruptionCaught = true;
      console.log(`  ✅ Corruption detected: ${err.message}`);
    }
  }
  if (!corruptionCaught) throw new Error("Corruption test failed: corrupted chunk was not rejected!");
  console.log("  ✅ Tampered ciphertext stopped before decryption.\n");

  // --------------------------------------------------------------------------
  // TEST 4: Wrong Key Test
  // --------------------------------------------------------------------------
  console.log("[TEST 4/8] Wrong Key Test (AES-GCM Auth Tag Failure)...");
  const wrongKeyHex = bytesToHex(crypto.getRandomValues(new Uint8Array(32)));
  let wrongKeyCaught = false;
  try {
    await verifyAndDecryptChunkTest(multiChunks[0].data, wrongKeyHex, 0, multiChunks[0].sha256, multiChunks[0].iv, multiFileId);
  } catch (err) {
    if (err.message.includes("AES-GCM authentication failed")) {
      wrongKeyCaught = true;
      console.log(`  ✅ Decryption failed securely with auth tag mismatch: ${err.message}`);
    }
  }
  if (!wrongKeyCaught) throw new Error("Wrong key was unexpectedly accepted!");
  console.log("  ✅ Wrong key prevented corrupt output.\n");

  // --------------------------------------------------------------------------
  // TEST 5: Wrong Recipient Test
  // --------------------------------------------------------------------------
  console.log("[TEST 5/8] Wrong Recipient Test (Asymmetric Key Envelope Protection)...");
  const adversaryPrivHex = bytesToHex(x25519.utils.randomPrivateKey());
  let adversaryBlocked = false;
  try {
    await unwrapKeyEnvelope(smallEnv.encryptedFileKey, smallEnv.keyAgreementMetadata, adversaryPrivHex);
  } catch {
    adversaryBlocked = true;
    console.log("  ✅ Adversary private key failed ECDH key unwrapping.");
  }
  if (!adversaryBlocked) throw new Error("Adversary was able to unwrap recipient key!");
  console.log("  ✅ Only the intended recipient can recover the file key.\n");

  // --------------------------------------------------------------------------
  // TEST 6: Revocation Test via Next.js Backend
  // --------------------------------------------------------------------------
  console.log("[TEST 6/8] Share Revocation Test via Next.js API...");
  const revokeShareRes = await fetch(`${baseUrl}/api/payload/shares`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-wallet-address": ownerWallet },
    body: JSON.stringify({
      fileId: smallFileId,
      fileName: "test_revocation.txt",
      fileSize: smallBytes.length,
      mimeType: "text/plain",
      recipientUserId: recipientWallet,
      encryptedFileKey: smallEnv.encryptedFileKey,
      keyAgreementMetadata: smallEnv.keyAgreementMetadata,
      expirationOption: "24h",
      downloadLimitOption: "5",
      oneTime: false,
    }),
  });
  const revokeShareData = await revokeShareRes.json();
  const revokeShareCode = revokeShareData.share?.shareCode;
  const revokeShareId = revokeShareData.share?.shareId;

  // Revoke it
  await fetch(`${baseUrl}/api/shares/${encodeURIComponent(revokeShareId)}/revoke`, {
    method: "POST",
    headers: { "x-wallet-address": ownerWallet },
  });

  // Attempt to access revoked share
  const accessRevokedRes = await fetch(`${baseUrl}/api/payload/shares/access`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code: revokeShareCode, accessorWallet: recipientWallet }),
  });
  const accessRevokedData = await accessRevokedRes.json();
  if (accessRevokedRes.status === 410 || accessRevokedData.status === "revoked") {
    console.log(`  ✅ Revoked share rejected with status ${accessRevokedRes.status} (${accessRevokedData.status || accessRevokedData.error})`);
  } else {
    throw new Error(`Revocation test failed! Status: ${accessRevokedRes.status}`);
  }
  console.log("  ✅ Revocation successfully enforced.\n");

  // --------------------------------------------------------------------------
  // TEST 7: Expiration Test
  // --------------------------------------------------------------------------
  console.log("[TEST 7/8] Share Expiration Test...");
  const expiredShareRes = await fetch(`${baseUrl}/api/payload/shares`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-wallet-address": ownerWallet },
    body: JSON.stringify({
      fileId: smallFileId,
      fileName: "test_expired.txt",
      fileSize: smallBytes.length,
      mimeType: "text/plain",
      recipientUserId: recipientWallet,
      encryptedFileKey: smallEnv.encryptedFileKey,
      keyAgreementMetadata: smallEnv.keyAgreementMetadata,
      expirationOption: "1h",
      downloadLimitOption: "5",
      oneTime: false,
    }),
  });
  const expiredData = await expiredShareRes.json();
  const expiredShareCode = expiredData.share?.shareCode;

  // Manually backdate the share to test expiration
  import("fs").then(async (fs) => {
    try {
      const storeFile = ".payload-store.json";
      if (fs.existsSync(storeFile)) {
        const store = JSON.parse(fs.readFileSync(storeFile, "utf8"));
        for (const k of Object.keys(store.shares)) {
          if (store.shares[k].shareCode === expiredShareCode) {
            store.shares[k].expiresAt = new Date(Date.now() - 3600000).toISOString(); // 1h in the past
          }
        }
        fs.writeFileSync(storeFile, JSON.stringify(store, null, 2));
      }
    } catch {}

    const accessExpiredRes = await fetch(`${baseUrl}/api/payload/shares/access`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: expiredShareCode, accessorWallet: recipientWallet }),
    });
    const accessExpiredData = await accessExpiredRes.json();
    if (accessExpiredRes.status === 410 || accessExpiredData.status === "expired") {
      console.log(`  ✅ Expired share rejected with status ${accessExpiredRes.status} (${accessExpiredData.status || accessExpiredData.error})`);
    } else {
      throw new Error(`Expiration test failed! Status: ${accessExpiredRes.status}`);
    }
    console.log("  ✅ Share expiration verified.\n");

    // --------------------------------------------------------------------------
    // TEST 8: Download Limit Test (maxDownloads = 1)
    // --------------------------------------------------------------------------
    console.log("[TEST 8/8] Download Limit Test (maxDownloads = 1)...");
    const limitShareRes = await fetch(`${baseUrl}/api/payload/shares`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-wallet-address": ownerWallet },
      body: JSON.stringify({
        fileId: smallFileId,
        fileName: "test_single_download.txt",
        fileSize: smallBytes.length,
        mimeType: "text/plain",
        recipientUserId: recipientWallet,
        encryptedFileKey: smallEnv.encryptedFileKey,
        keyAgreementMetadata: smallEnv.keyAgreementMetadata,
        expirationOption: "24h",
        downloadLimitOption: "1",
        oneTime: true,
      }),
    });
    const limitShareData = await limitShareRes.json();
    const limitShareCode = limitShareData.share?.shareCode;

    // 1st access -> succeeds and increments count to 1
    const firstAccess = await fetch(`${baseUrl}/api/payload/shares/access`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: limitShareCode, accessorWallet: recipientWallet }),
    });
    const firstData = await firstAccess.json();
    console.log(`  First download attempt: status ${firstAccess.status}, success: ${firstData.success}`);

    // 2nd access -> rejected (limit reached)
    const secondAccess = await fetch(`${baseUrl}/api/payload/shares/access`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: limitShareCode, accessorWallet: recipientWallet }),
    });
    const secondData = await secondAccess.json();
    console.log(`  Second download attempt: status ${secondAccess.status}, status: ${secondData.status || secondData.error}`);
    if (secondAccess.status === 410 || secondData.status === "download-limit-reached") {
      console.log("  ✅ Download limit strictly enforced.\n");
    } else {
      throw new Error(`Download limit test failed! Status: ${secondAccess.status}`);
    }

    console.log("==================================================");
    console.log("🎉 ALL 8 TESTS PASSED WITH 100% FIDELITY!");
    console.log("==================================================");
  });
}

run().catch((e) => {
  console.error("Test failed:", e);
  process.exit(1);
});
