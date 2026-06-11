// 꼬북점 AAB를 Play Developer API(Edits)로 업로드하고 프로덕션 트랙에 배정 후 커밋.
// 사용: node /tmp/play-upload.mjs <aab경로>
import { readFileSync } from 'node:fs';
import { JWT } from 'google-auth-library';

const PKG = 'com.niceverygood.ggobuk';
const AAB = process.argv[2];
const KEY = JSON.parse(readFileSync(process.env.HOME + '/.ggobuk-play-sa.json', 'utf8'));

const jwt = new JWT({
  email: KEY.client_email,
  key: KEY.private_key,
  scopes: ['https://www.googleapis.com/auth/androidpublisher'],
});
const { token } = await jwt.getAccessToken();
const H = { Authorization: `Bearer ${token}` };
const BASE = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PKG}`;

async function call(method, url, body, contentType) {
  const res = await fetch(url, {
    method,
    headers: {
      ...H,
      ...(contentType ? { 'Content-Type': contentType } : {}),
    },
    body,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${url} -> ${res.status}: ${text.slice(0, 500)}`);
  return text ? JSON.parse(text) : {};
}

console.log('1) edit 생성...');
const edit = await call('POST', `${BASE}/edits`, '{}', 'application/json');
console.log('   editId =', edit.id);

console.log('2) AAB 업로드 (몇십초 걸릴 수 있음)...');
const aabBytes = readFileSync(AAB);
const up = await call(
  'POST',
  `https://androidpublisher.googleapis.com/upload/androidpublisher/v3/applications/${PKG}/edits/${edit.id}/bundles?uploadType=media`,
  aabBytes,
  'application/octet-stream',
);
console.log('   업로드됨 versionCode =', up.versionCode);

console.log('3) 프로덕션 트랙 배정...');
await call(
  'PUT',
  `${BASE}/edits/${edit.id}/tracks/production`,
  JSON.stringify({
    track: 'production',
    releases: [
      {
        name: `${up.versionCode} (1.0.2)`,
        versionCodes: [String(up.versionCode)],
        status: 'completed',
        releaseNotes: [
          {
            language: 'ko-KR',
            text: '- 인앱결제(꼬북알 충전) 안정화\n- 결제 모듈 개선 및 버그 수정',
          },
        ],
      },
    ],
  }),
  'application/json',
);
console.log('   트랙 배정 완료');

console.log('4) 커밋(검토 제출)...');
const commit = await call(
  'POST',
  `${BASE}/edits/${edit.id}:commit?changesNotSentForReview=false`,
  '',
);
console.log('   커밋 완료:', JSON.stringify(commit));
console.log('✅ 업로드+검토 제출 성공');
