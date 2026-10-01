import { privateKeyToAccount } from "viem/accounts";

const BASE_URL = "http://localhost:3000";

async function runPayloadBackendVerification() {
  console.log("=== SECUREVAULT PAYLOAD CMS BACKEND INTEGRATION TEST SUITE ===\n");

  // Generate a test wallet account
  const testAccount = privateKeyToAccount(
    "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
  );
  const walletAddress = testAccount.address.toLowerCase();
  console.log(`[Step 1] Test Wallet: ${walletAddress}`);

  // 1. Request single-use nonce
  const nonceRes = await fetch(`${BASE_URL}/api/auth/nonce`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ walletAddress }),
  });
  if (!nonceRes.ok) throw new Error(`Nonce request failed: ${nonceRes.status}`);
  const nonceData = await nonceRes.json();
  console.log(`[Step 2] Nonce Generated: ${nonceData.nonce.slice(0, 16)}...`);

  // 2. Sign message with private key
  const signature = await testAccount.signMessage({ message: nonceData.message });
  console.log(`[Step 3] Cryptographic Signature Generated: ${signature.slice(0, 20)}...`);

  // 3. Verify signature and obtain authenticated session cookie
  const verifyRes = await fetch(`${BASE_URL}/api/auth/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      walletAddress,
      nonce: nonceData.nonce,
      signature,
      message: nonceData.message,
    }),
  });
  if (!verifyRes.ok) {
    const errText = await verifyRes.text();
    throw new Error(`Verify failed (${verifyRes.status}): ${errText}`);
  }
  const verifyData = await verifyRes.json();
  console.log(`[Debug] Headers:`, Object.fromEntries(verifyRes.headers.entries()));
  const cookiesList = typeof verifyRes.headers.getSetCookie === "function"
    ? verifyRes.headers.getSetCookie()
    : [verifyRes.headers.get("set-cookie") || ""];
  console.log(`[Debug] getSetCookie:`, cookiesList);
  const allCookies = cookiesList.join("; ");
  const cookieMatch = allCookies.match(/(?:cyber10_session|sv_auth_session)=([^;]+)/);
  const sessionCookie = cookieMatch ? `${cookieMatch[0].split("=")[0]}=${cookieMatch[1]}` : "";
  console.log(`[Step 4b] Session Cookie Extracted: ${sessionCookie ? "YES" : "NO"}`);

  const authHeaders = {
    "Content-Type": "application/json",
    ...(sessionCookie ? { Cookie: sessionCookie } : {}),
  };

  // 4. Test Replay Attack Prevention (Reusing Nonce MUST Fail)
  const replayRes = await fetch(`${BASE_URL}/api/auth/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      walletAddress,
      nonce: nonceData.nonce,
      signature,
      message: nonceData.message,
    }),
  });
  if (replayRes.status !== 401) {
    throw new Error(`Replay attack test failed: expected 401, got ${replayRes.status}`);
  }
  console.log(`[Step 5] Nonce Replay Attack Prevention: PASSED (Replay rejected with 401)`);

  // 5. Register Public Encryption Key
  const pubKeyHex = "04" + "aa".repeat(32);
  const regKeyRes = await fetch(`${BASE_URL}/api/users/me/encryption-key`, {
    method: "PATCH",
    headers: authHeaders,
    body: JSON.stringify({
      publicEncryptionKey: pubKeyHex,
      keyFingerprint: "fp_test_12345",
    }),
  });
  if (!regKeyRes.ok) throw new Error(`Register key failed: ${regKeyRes.status}`);
  console.log(`[Step 6] Public Encryption Key Registered`);

  // 6. Query Public Key
  const queryKeyRes = await fetch(`${BASE_URL}/api/users/${walletAddress}/public-key`);
  if (!queryKeyRes.ok) throw new Error(`Query key failed: ${queryKeyRes.status}`);
  const keyData = await queryKeyRes.json();
  if (keyData.publicEncryptionKey !== pubKeyHex) {
    throw new Error(`Public key mismatch: expected ${pubKeyHex}, got ${keyData.publicEncryptionKey}`);
  }
  console.log(`[Step 7] Public Key Discovery: PASSED (${keyData.publicEncryptionKey.slice(0, 16)}...)`);

  // 7. Create File Record (Total 3 Chunks)
  const createFileRes = await fetch(`${BASE_URL}/api/files`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      filename: "financial_report_q3.xlsx",
      size: 24 * 1024 * 1024, // 24 MB
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      chunkSize: 8 * 1024 * 1024,
      totalChunks: 3,
      encryptionAlgorithm: "AES-256-GCM",
      integrityAlgorithm: "SHA-256",
    }),
  });
  if (!createFileRes.ok) throw new Error(`Create file failed: ${createFileRes.status}`);
  const fileData = await createFileRes.json();
  const fileId = fileData.file.fileId;
  console.log(`[Step 8] File Created in Payload: ${fileId} (Owner: ${fileData.file.owner})`);

  // 8. Register Chunk 0 and Chunk 2 (leaving Chunk 1 missing to test resumability)
  await fetch(`${BASE_URL}/api/files/${fileId}/chunks`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      chunkIndex: 0,
      ipfsCID: "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
      sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      iv: "0102030405060708090a0b0c0d0e0f10",
      encryptedSize: 8388608,
    }),
  });

  await fetch(`${BASE_URL}/api/files/${fileId}/chunks`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      chunkIndex: 2,
      ipfsCID: "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzda",
      sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b857",
      iv: "0102030405060708090a0b0c0d0e0f12",
      encryptedSize: 8388608,
    }),
  });

  // 9. Query Upload Status for Resumable Upload
  const statusRes = await fetch(`${BASE_URL}/api/files/${fileId}/upload-status`, {
    headers: authHeaders,
  });
  const statusData = await statusRes.json();
  console.log(`[Step 9] Resumable Upload Status:`);
  console.log(`  - Total Chunks: ${statusData.totalChunks}`);
  console.log(`  - Uploaded Chunks: [${statusData.uploadedChunks.join(", ")}]`);
  console.log(`  - Missing Chunks: [${statusData.missingChunks.join(", ")}]`);
  if (!statusData.missingChunks.includes(1) || statusData.missingChunks.length !== 1) {
    throw new Error(`Expected missing chunks to contain [1], got [${statusData.missingChunks.join(",")}]`);
  }

  // 10. Attempt to complete upload with missing chunks (MUST BE REJECTED)
  const prematureCompleteRes = await fetch(`${BASE_URL}/api/files/${fileId}/complete`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({ manifestCID: "bafy_manifest_mock" }),
  });
  if (prematureCompleteRes.status !== 400) {
    throw new Error(`Expected completion to fail with 400 when chunks are missing, got ${prematureCompleteRes.status}`);
  }
  console.log(`[Step 10] Server-Side Completeness Verification: PASSED (Premature completion rejected)`);

  // 11. Upload missing Chunk 1
  await fetch(`${BASE_URL}/api/files/${fileId}/chunks`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      chunkIndex: 1,
      ipfsCID: "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdb",
      sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b856",
      iv: "0102030405060708090a0b0c0d0e0f11",
      encryptedSize: 8388608,
    }),
  });

  // 12. Complete upload now that all chunks are present
  const completeRes = await fetch(`${BASE_URL}/api/files/${fileId}/complete`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({ manifestCID: "bafy_manifest_mock_final" }),
  });
  if (!completeRes.ok) throw new Error(`Completion failed: ${completeRes.status}`);
  console.log(`[Step 11] All Chunks Verified: File Marked COMPLETE`);

  // 13. Create Share with Download Limit = 1 (One-Time Share)
  const shareRes = await fetch(`${BASE_URL}/api/shares`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      fileId,
      recipient: walletAddress,
      encryptedFileKey: "enc_key_envelope_mock_12345",
      keyAgreementMetadata: { algorithm: "X25519-HKDF-SHA256-AES256GCM" },
      maxDownloads: 1,
      oneTime: true,
    }),
  });
  if (!shareRes.ok) throw new Error(`Create share failed: ${shareRes.status}`);
  const shareData = await shareRes.json();
  const shareId = shareData.share.shareId;
  console.log(`[Step 12] Secure Share Created: ${shareId} (One-Time / Max Downloads: 1)`);

  // 14. Access Share (First Access -> Success)
  const access1Res = await fetch(`${BASE_URL}/api/shares/${shareId}`, { headers: authHeaders });
  if (!access1Res.ok) throw new Error(`Share access failed: ${access1Res.status}`);
  const access1Data = await access1Res.json();
  console.log(`[Step 13] Share Access 1: Success (Download Count: ${access1Data.share.downloadCount})`);

  // 15. Access Share Again (Second Access -> Must Be Denied because oneTime = true)
  const access2Res = await fetch(`${BASE_URL}/api/shares/${shareId}`, { headers: authHeaders });
  if (access2Res.status !== 403 && access2Res.status !== 410) {
    throw new Error(`Expected access 2 to be denied, got status ${access2Res.status}`);
  }
  console.log(`[Step 14] One-Time Share Invalidation: PASSED (Access rejected with ${access2Res.status})`);

  // 16. Audit Activity Log
  const actRes = await fetch(`${BASE_URL}/api/activity`, { headers: authHeaders });
  if (!actRes.ok) throw new Error(`Activity query failed: ${actRes.status}`);
  const actData = await actRes.json();
  console.log(`[Step 15] Activity Audit Log Verified (${actData.logs.length} logged events)`);

  console.log("\nALL PAYLOAD BACKEND INTEGRATION TESTS PASSED 100%!");
}

runPayloadBackendVerification().catch((err) => {
  console.error("TEST FAILED:", err);
  process.exit(1);
});
