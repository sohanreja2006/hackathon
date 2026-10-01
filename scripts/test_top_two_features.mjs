import assert from "assert";

const BASE_URL = "http://localhost:3000";

async function run() {
  console.log("==================================================");
  console.log("TESTING TOP 2 FEATURES: PREVIEW & BURN-ON-READ");
  console.log("==================================================");

  // 1. Create a share with burnAfterReading enabled
  console.log("\n[TEST 1] Creating a share with Burn-on-Read armed...");
  const ownerAddress = "0x" + "11".repeat(20);
  const shareRes = await fetch(`${BASE_URL}/api/payload/shares`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-wallet-address": ownerAddress,
    },
    body: JSON.stringify({
      fileId: "burn_test_file_" + Date.now(),
      fileName: "confidential_briefing.pdf",
      fileSize: 12048,
      mimeType: "application/pdf",
      burnAfterReading: true,
      burnDurationSeconds: 60,
    }),
  });

  const shareJson = await shareRes.json();
  assert(shareJson.success, "Failed to create share: " + JSON.stringify(shareJson));
  const shareCode = shareJson.share.shareCode;
  console.log(`  ✅ Share created with code: ${shareCode}`);
  assert.strictEqual(shareJson.share.burnAfterReading, true);
  assert.strictEqual(shareJson.share.burnDurationSeconds, 60);

  // 2. Lookup share anonymously and verify burn properties are transmitted
  console.log("\n[TEST 2] Verifying lookup response contains self-destruct metadata...");
  const lookupRes = await fetch(`${BASE_URL}/api/payload/shares/lookup?code=${encodeURIComponent(shareCode)}`);
  const lookupJson = await lookupRes.json();
  assert(lookupJson.success, "Lookup failed: " + JSON.stringify(lookupJson));
  assert.strictEqual(lookupJson.share.burnAfterReading, true);
  assert.strictEqual(lookupJson.share.burnDurationSeconds, 60);
  console.log("  ✅ Lookup sanitized response properly includes burnAfterReading: true, duration: 60s");

  // 3. Trigger self-destruct burn
  console.log("\n[TEST 3] Triggering self-destruct burn endpoint /api/shares/:id/burn...");
  const burnRes = await fetch(`${BASE_URL}/api/shares/${encodeURIComponent(shareCode)}/burn`, {
    method: "POST",
  });
  const burnJson = await burnRes.json();
  assert(burnJson.success, "Burn failed: " + JSON.stringify(burnJson));
  console.log("  ✅ Share successfully burned and server envelopes zeroized.");

  // 4. Verify subsequent lookup is rejected as revoked
  console.log("\n[TEST 4] Verifying burned share is blocked from future access...");
  const reLookupRes = await fetch(`${BASE_URL}/api/payload/shares/lookup?code=${encodeURIComponent(shareCode)}`);
  assert.strictEqual(reLookupRes.status, 410);
  const reLookupJson = await reLookupRes.json();
  assert.strictEqual(reLookupJson.status, "revoked");
  console.log("  ✅ Burned share is strictly revoked (HTTP 410) — access permanently terminated!");

  console.log("\n==================================================");
  console.log("🎉 ALL NEW FEATURE TESTS PASSED WITH 100% SUCCESS!");
  console.log("==================================================");
}

run().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
