// 꼬북점 iOS: 대기 중인 1.0 심사 제출을 취소하고, 빌드 7 + IAP를 담아 재제출.
// 사용: node scripts/asc-resubmit.mjs
import { readFileSync } from 'node:fs';
import { createSign } from 'node:crypto';

const ISSUER = '0ba2fe17-6304-461d-9ab3-f4d8d3192dbd';
const KEY_ID = 'K542DR54N2';
const APP_ID = '6771285142';
const P8 = readFileSync(process.env.HOME + `/.private_keys/AuthKey_${KEY_ID}.p8`, 'utf8');

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
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${text.slice(0, 500)}`);
  return text ? JSON.parse(text) : {};
}

// 1) 빌드 7 id
const builds = await api('GET', `/v1/builds?filter[app]=${APP_ID}&filter[version]=7&limit=1`);
const build7 = builds.data[0];
if (!build7 || build7.attributes.processingState !== 'VALID') {
  throw new Error('빌드 7이 VALID 아님: ' + build7?.attributes?.processingState);
}
console.log('빌드 7 id =', build7.id);

// 2) 1.0 appStoreVersion
const versions = await api(
  'GET',
  `/v1/apps/${APP_ID}/appStoreVersions?filter[platform]=IOS&limit=5`,
);
const v10 = versions.data.find((v) => v.attributes.versionString === '1.0');
console.log('1.0 version id =', v10.id, 'state =', v10.attributes.appStoreState ?? v10.attributes.appVersionState);

// 3) 기존 review submission 취소 (있으면)
const subs = await api(
  'GET',
  `/v1/reviewSubmissions?filter[app]=${APP_ID}&filter[state]=WAITING_FOR_REVIEW,READY_FOR_REVIEW,IN_REVIEW&limit=5`,
);
for (const sub of subs.data) {
  console.log(`기존 제출 ${sub.id} (${sub.attributes.state}) 취소...`);
  await api('PATCH', `/v1/reviewSubmissions/${sub.id}`, {
    data: { type: 'reviewSubmissions', id: sub.id, attributes: { canceled: true } },
  });
  console.log('  취소됨');
}

// 4) 1.0 에 빌드 7 연결
await api('PATCH', `/v1/appStoreVersions/${v10.id}/relationships/build`, {
  data: { type: 'builds', id: build7.id },
});
console.log('빌드 7 연결 완료');

// 5) 새 review submission 생성
const newSub = await api('POST', '/v1/reviewSubmissions', {
  data: {
    type: 'reviewSubmissions',
    attributes: { platform: 'IOS' },
    relationships: { app: { data: { type: 'apps', id: APP_ID } } },
  },
});
console.log('새 제출 id =', newSub.data.id);

// 6) 항목 추가: 앱 버전 + READY_TO_SUBMIT 인 IAP 전부
await api('POST', '/v1/reviewSubmissionItems', {
  data: {
    type: 'reviewSubmissionItems',
    relationships: {
      reviewSubmission: { data: { type: 'reviewSubmissions', id: newSub.data.id } },
      appStoreVersion: { data: { type: 'appStoreVersions', id: v10.id } },
    },
  },
});
console.log('항목: 앱 버전 1.0(빌드 7) 추가');

const iaps = await api('GET', `/v1/apps/${APP_ID}/inAppPurchasesV2?limit=50`);
for (const iap of iaps.data) {
  if (iap.attributes.state !== 'READY_TO_SUBMIT') {
    console.log(`IAP ${iap.attributes.productId}: ${iap.attributes.state} → 스킵`);
    continue;
  }
  try {
    await api('POST', '/v1/reviewSubmissionItems', {
      data: {
        type: 'reviewSubmissionItems',
        relationships: {
          reviewSubmission: { data: { type: 'reviewSubmissions', id: newSub.data.id } },
          inAppPurchaseV2: { data: { type: 'inAppPurchases', id: iap.id } },
        },
      },
    });
    console.log(`항목: IAP ${iap.attributes.productId} 추가`);
  } catch (e) {
    console.log(`IAP ${iap.attributes.productId} 추가 실패:`, e.message.slice(0, 200));
  }
}

// 7) 제출
await api('PATCH', `/v1/reviewSubmissions/${newSub.data.id}`, {
  data: { type: 'reviewSubmissions', id: newSub.data.id, attributes: { submitted: true } },
});
console.log('✅ 심사 제출 완료 (빌드 7 + IAP 포함)');
