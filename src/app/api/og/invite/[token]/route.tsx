import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import { inviteHostName } from '@/lib/relations/invite_host';

export const runtime = 'nodejs';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// 2x 해상도(출력 2400×1260)로 렌더 — 임베드 캐릭터 PNG 가 확대 표시될 때 흐려지지
// 않게 출력 픽셀을 2배 확보(텍스트는 벡터라 무관). 디자인 좌표는 1200×630 유지.
const SCALE = 2;

// 브랜드 색 — globals.css 토큰과 동일.
const NAVY = '#2C3E50';
const MINT = '#4ECDC4';
const MINT_DARK = '#37AEA7';
const IVORY = '#FAF6F0';
const MUTED = '#8A8072';

// 손 흔드는 꼬북이 — 초대(환영)의 결. @2x 고해상도 원본 우선(또렷함), 실패 시
// 표준 → null 순으로 폴백(트레이싱 누락 대비). null 이면 캐릭터 없이 카드 완성.
function turtleDataUri(): string | null {
  const dir = join(process.cwd(), 'public', 'characters', 'ggobuk', 'characters');
  const candidates = [
    join(dir, 'hires', 'basic_friend_waving@2x.png'),
    join(dir, 'basic_friend_waving.png'),
  ];
  for (const path of candidates) {
    try {
      const buf = readFileSync(path);
      return `data:image/png;base64,${buf.toString('base64')}`;
    } catch {
      // hires 누락 시 표준 해상도로 폴백
    }
  }
  return null;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const hostName = await inviteHostName(token);
  const turtle = turtleDataUri();
  const line1 = hostName ? `${hostName}님이` : '누군가';

  return new ImageResponse(
    (
      // 2x 슈퍼샘플 래퍼: 디자인은 1200×630, 루트만 scale(2) 해 출력 2400×1260.
      <div
        style={{
          display: 'flex',
          width: size.width * SCALE,
          height: size.height * SCALE,
        }}
      >
        <div
          style={{
            width: size.width,
            height: size.height,
            display: 'flex',
            background: IVORY,
            color: NAVY,
            fontFamily: 'sans-serif',
            transform: `scale(${SCALE})`,
            transformOrigin: 'top left',
          }}
        >
        {/* 좌측 — 관계형 후크 */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '64px 56px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 44,
                height: 44,
                borderRadius: 999,
                background: NAVY,
                color: '#FFFFFF',
                fontSize: 26,
                fontWeight: 800,
              }}
            >
              占
            </div>
            <div
              style={{
                display: 'flex',
                fontSize: 28,
                fontWeight: 800,
                color: MINT_DARK,
              }}
            >
              꼬북점 · 궁합 초대
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div
              style={{
                display: 'flex',
                fontSize: 86,
                fontWeight: 900,
                lineHeight: 1.08,
                color: NAVY,
              }}
            >
              {line1}
            </div>
            <div
              style={{
                display: 'flex',
                fontSize: 86,
                fontWeight: 900,
                lineHeight: 1.08,
                color: NAVY,
              }}
            >
              너와의 궁합이
            </div>
            <div
              style={{
                display: 'flex',
                fontSize: 86,
                fontWeight: 900,
                lineHeight: 1.08,
                color: MINT_DARK,
              }}
            >
              궁금하대
            </div>
            <div
              style={{
                display: 'flex',
                marginTop: 26,
                fontSize: 34,
                fontWeight: 700,
                color: MUTED,
              }}
            >
              생년월일만 넣으면 1초 — 가입 없이 바로
            </div>
          </div>

          <div style={{ display: 'flex', fontSize: 24, fontWeight: 800, color: MUTED }}>
            꼬북점 占 · 사주로 보는 우리 궁합
          </div>
        </div>

        {/* 우측 — 민트 패널: 미스터리 점수(호기심 갭) + 꼬북이 */}
        <div
          style={{
            width: 460,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: MINT,
            color: '#FFFFFF',
            padding: 36,
          }}
        >
          <div style={{ display: 'flex', fontSize: 34, fontWeight: 800, opacity: 0.92 }}>
            우리 궁합 점수
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: 6,
              width: 240,
              height: 240,
              borderRadius: 999,
              border: '10px solid #FFFFFF66',
              fontSize: 170,
              fontWeight: 900,
              lineHeight: 1,
            }}
          >
            ?
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              marginTop: 16,
              background: '#FFFFFF2E',
              borderRadius: 999,
              padding: '8px 22px',
              fontSize: 30,
              fontWeight: 800,
            }}
          >
            확인하러 가기
          </div>
          {turtle ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={turtle}
              alt=""
              width={150}
              height={150}
              style={{ marginTop: 18, objectFit: 'contain' }}
            />
          ) : null}
        </div>
        </div>
      </div>
    ),
    { width: size.width * SCALE, height: size.height * SCALE },
  );
}
