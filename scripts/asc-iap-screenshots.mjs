// 6개 인앱구입에 심사 스크린샷(/tmp/iap-review.png) 업로드 + 상태/빌드 확인.
import { readFileSync } from 'node:fs';
import { createSign, createHash } from 'node:crypto';

const ISSUER = '0ba2fe17-6304-461d-9ab3-f4d8d3192dbd';
const KEY_ID = 'K542DR54N2';
const APP_ID = '6771285142';
const P8 = readFileSync(process.env.HOME + `/.private_keys/AuthKey_${KEY_ID}.p8`, 'utf8');
const IMG = readFileSync('/tmp/iap-review.png');
const MD5 = createHash('md5').update(IMG).digest('hex');

function jwt() {
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const head = b64({ alg: 'ES256', kid: KEY_ID, typ: 'JWT' });
  const body = b64({ iss: ISSUER, iat: now, exp: now + 1100, aud: 'appstoreconnect-v1' });
  const s = createSign('SHA256');
  s.update(`${head}.${body}`);
  return `${head}.${body}.${s.sign({ key: P8, dsaEncoding: 'ieee-p1363' }).toString('base64url')}`;
}
const BASE = 'https://api.appstoreconnect.apple.com';
async function api(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: { Authorization: `Bearer ${jwt()}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${text.slice(0, 400)}`);
  return text ? JSON.parse(text) : {};
}

const iaps = await api('GET', `/v1/apps/${APP_ID}/inAppPurchasesV2?limit=50`);
for (const iap of iaps.data) {
  const pid = iap.attributes.productId;
  const state = iap.attributes.state;
  // 이미 스크린샷 있으면 스킵
  try {
    const existing = await api('GET', `/v2/inAppPurchases/${iap.id}/appStoreReviewScreenshot`);
    if (existing.data) {
      console.log(`${pid}: 스크린샷 이미 있음 (state=${state})`);
      continue;
    }
  } catch {
    /* 404 = 없음 → 진행 */
  }
  const reserved = await api('POST', '/v1/inAppPurchaseAppStoreReviewScreenshots', {
    data: {
      type: 'inAppPurchaseAppStoreReviewScreenshots',
      attributes: { fileName: 'store.png', fileSize: IMG.length },
      relationships: {
        inAppPurchaseV2: { data: { type: 'inAppPurchases', id: iap.id } },
      },
    },
  });
  const op = reserved.data.attributes.uploadOperations[0];
  const headers = {};
  for (const h of op.requestHeaders ?? []) headers[h.name] = h.value;
  const up = await fetch(op.url, { method: op.method, headers, body: IMG });
  if (!up.ok) throw new Error(`upload ${up.status}`);
  await api('PATCH', `/v1/inAppPurchaseAppStoreReviewScreenshots/${reserved.data.id}`, {
    data: {
      type: 'inAppPurchaseAppStoreReviewScreenshots',
      id: reserved.data.id,
      attributes: { uploaded: true, sourceFileChecksum: MD5 },
    },
  });
  console.log(`${pid}: 스크린샷 업로드 완료 (state=${state})`);
}

// 빌드 7 처리 상태
const builds = await api('GET', `/v1/builds?filter[app]=${APP_ID}&sort=-version&limit=3`);
for (const b of builds.data) {
  console.log(`빌드 ${b.attributes.version}: ${b.attributes.processingState}`);
}

// IAP 최종 상태
const after = await api('GET', `/v1/apps/${APP_ID}/inAppPurchasesV2?limit=50`);
for (const d of after.data) console.log(`IAP ${d.attributes.productId}: ${d.attributes.state}`);
