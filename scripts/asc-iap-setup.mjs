// App Store Connect API로 꼬북점 인앱구입(소모품) 6개를 일괄 세팅한다.
// - 없는 상품 생성 → ko 현지화 → KRW 기준가 스케줄 → 전 지역 판매 설정
// 사용: node scripts/asc-iap-setup.mjs
// 필요: ~/.private_keys/AuthKey_MKLD29GN78.p8 (앱 관리 권한 팀 키)
import { readFileSync } from 'node:fs';
import { createSign } from 'node:crypto';

const ISSUER = '0ba2fe17-6304-461d-9ab3-f4d8d3192dbd';
const KEY_ID = 'MKLD29GN78';
const APP_ID = '6771285142'; // 꼬북점
const P8 = readFileSync(process.env.HOME + `/.private_keys/AuthKey_${KEY_ID}.p8`, 'utf8');

const PRODUCTS = [
  { pid: 'ggobuk.credits.mini', name: '꼬북알 2개', krw: 900, desc: '사주 풀이·궁합·채팅 등에 사용하는 꼬북알 2개를 충전합니다.' },
  { pid: 'ggobuk.credits.entry', name: '꼬북알 8개', krw: 2900, desc: '사주 풀이·궁합·채팅 등에 사용하는 꼬북알 8개를 충전합니다.' },
  { pid: 'ggobuk.credits.focus', name: '꼬북알 42개', krw: 12900, desc: '꼬북알 42개를 충전합니다. (보너스 6알 포함)' },
  { pid: 'ggobuk.credits.deep', name: '꼬북알 120개', krw: 29900, desc: '꼬북알 120개를 충전합니다. (보너스 30알 포함)' },
  { pid: 'ggobuk.credits.master', name: '꼬북알 260개', krw: 59000, desc: '꼬북알 260개를 충전합니다. (보너스 80알 포함)' },
  { pid: 'ggobuk.credits.firstdeal', name: '웰컴 꼬북알 20개', krw: 1900, desc: '가입 첫 충전 전용 웰컴 특가. 꼬북알 20개(보너스 8알 포함).' },
];

function jwt() {
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const head = b64({ alg: 'ES256', kid: KEY_ID, typ: 'JWT' });
  const body = b64({ iss: ISSUER, iat: now, exp: now + 1100, aud: 'appstoreconnect-v1' });
  const sign = createSign('SHA256');
  sign.update(`${head}.${body}`);
  const sig = sign.sign({ key: P8, dsaEncoding: 'ieee-p1363' }).toString('base64url');
  return `${head}.${body}.${sig}`;
}

const BASE = 'https://api.appstoreconnect.apple.com';
async function api(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      Authorization: `Bearer ${jwt()}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${text.slice(0, 600)}`);
  return text ? JSON.parse(text) : {};
}

// 0) 기존 상품 목록
const existing = await api('GET', `/v1/apps/${APP_ID}/inAppPurchasesV2?limit=50`);
const byPid = new Map(existing.data.map((d) => [d.attributes.productId, d]));
console.log('기존 IAP:', [...byPid.keys()].join(', ') || '(없음)');

// 전 지역 territory id 목록 (availability 용)
const territories = [];
let turl = '/v1/territories?limit=200';
while (turl) {
  const t = await api('GET', turl);
  territories.push(...t.data.map((d) => d.id));
  turl = t.links?.next ? t.links.next.replace(BASE, '') : null;
}
console.log('지역 수:', territories.length);

for (const p of PRODUCTS) {
  console.log(`\n=== ${p.pid} ===`);
  // 1) 생성(없으면)
  let iap = byPid.get(p.pid);
  if (!iap) {
    const created = await api('POST', '/v2/inAppPurchases', {
      data: {
        type: 'inAppPurchases',
        attributes: {
          name: `ggobuk credits ${p.pid.split('.').pop()}`,
          productId: p.pid,
          inAppPurchaseType: 'CONSUMABLE',
        },
        relationships: { app: { data: { type: 'apps', id: APP_ID } } },
      },
    });
    iap = created.data;
    console.log('생성됨 id=', iap.id);
  } else {
    console.log('이미 존재 id=', iap.id);
  }

  // 2) ko 현지화 (이미 있으면 무시)
  try {
    await api('POST', '/v1/inAppPurchaseLocalizations', {
      data: {
        type: 'inAppPurchaseLocalizations',
        attributes: { locale: 'ko', name: p.name, description: p.desc },
        relationships: {
          inAppPurchaseV2: { data: { type: 'inAppPurchases', id: iap.id } },
        },
      },
    });
    console.log('ko 현지화 추가');
  } catch (e) {
    console.log('ko 현지화:', /409|already|ENTITY_ERROR/.test(e.message) ? '이미 있음(스킵)' : e.message.slice(0, 200));
  }

  // 3) KRW 가격 포인트 찾기 → 가격 스케줄
  const pts = await api(
    'GET',
    `/v2/inAppPurchases/${iap.id}/pricePoints?filter[territory]=KOR&limit=8000`,
  );
  const point = pts.data.find((d) => Number(d.attributes.customerPrice) === p.krw);
  if (!point) {
    console.log(`⚠️ KRW ${p.krw} 가격 포인트 없음 — 후보:`, pts.data.slice(0, 5).map((d) => d.attributes.customerPrice).join(','));
    continue;
  }
  try {
    await api('POST', '/v1/inAppPurchasePriceSchedules', {
      data: {
        type: 'inAppPurchasePriceSchedules',
        relationships: {
          inAppPurchase: { data: { type: 'inAppPurchases', id: iap.id } },
          baseTerritory: { data: { type: 'territories', id: 'KOR' } },
          manualPrices: { data: [{ type: 'inAppPurchasePrices', id: '${price1}' }] },
        },
      },
      included: [
        {
          type: 'inAppPurchasePrices',
          id: '${price1}',
          attributes: { startDate: null },
          relationships: {
            inAppPurchasePricePoint: { data: { type: 'inAppPurchasePricePoints', id: point.id } },
            inAppPurchaseV2: { data: { type: 'inAppPurchases', id: iap.id } },
          },
        },
      ],
    });
    console.log(`가격 설정 ₩${p.krw}`);
  } catch (e) {
    console.log('가격:', e.message.slice(0, 200));
  }

  // 4) 전 지역 판매 가능
  try {
    await api('POST', '/v1/inAppPurchaseAvailabilities', {
      data: {
        type: 'inAppPurchaseAvailabilities',
        attributes: { availableInNewTerritories: true },
        relationships: {
          inAppPurchase: { data: { type: 'inAppPurchases', id: iap.id } },
          availableTerritories: {
            data: territories.map((id) => ({ type: 'territories', id })),
          },
        },
      },
    });
    console.log('전 지역 판매 설정');
  } catch (e) {
    console.log('지역:', e.message.slice(0, 200));
  }
}
console.log('\n✅ ASC IAP 세팅 완료');
