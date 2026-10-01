import fs from 'fs';

function hexToBytes(hex) {
  const clean = hex.trim().replace(/^0x/i, '');
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(clean.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes) {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function test() {
  const storeData = JSON.parse(fs.readFileSync('.payload-store.json', 'utf8'));
  const share = Object.values(storeData.shares).find(s => s.shareCode === 'SV-GBK8-W973-V5KN');
  const chunk = Object.values(storeData.chunks).find(c => c.fileId === share.fileId);
  const env = JSON.parse(share.quickShareEnvelope);

  console.log('Share:', share.shareCode);
  console.log('Chunk IV:', chunk.iv);
  console.log('Chunk hash:', chunk.hash);

  // Fetch the ciphertext from Pinata gateway
  const res = await fetch('https://gateway.pinata.cloud/ipfs/' + chunk.cid);
  const cipherBuf = await res.arrayBuffer();
  console.log('Ciphertext byteLength:', cipherBuf.byteLength);

  // The secret in the URL from the user screenshot:
  // http://localhost:3000/receive?code=SV-GBK8-W973-V5KN#secret=a33033170e6850c5ddd9aa59c22ab97884d9e3d8b3522806aed763f2e7...
  // Let's test with the secret in the screenshot:
  // In the screenshot, the secret field shows:
  // "a33033170e6850c5ddd9aa59c22ab97884d9e3d8b3522806aed763f2e7..."
  // But wait! Can we find the secret or the original file key in localStorage or indexedDB?
  // Let's check all files in .payload-store.json and .payload-db.json:
  console.log('Env encryptedFileKey length:', env.encryptedFileKey.length);
  console.log('Env IV:', env.iv);
}

test().catch(console.error);
