import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import {
  iljuBySlug,
  iljuTheme,
  type OhaengKey,
} from '@/lib/saju/ilju_profile';

export const runtime = 'nodejs';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// 카드를 2배 해상도(출력 2400×1260)로 그린다. satori 텍스트는 벡터라 이미
// 또렷하지만 임베드한 캐릭터 PNG 는 래스터라, 카드가 확대 표시될 때(공유
// 미리보기·레티나) 혼자 '물감 번진 듯' 흐려졌다. 디자인은 1200×630 좌표 그대로
// 두고 루트를 scale(2) 하여 출력 픽셀만 2배로 — 캐릭터가 텍스트만큼 딱 떨어진다.
const SCALE = 2;

// 오행별 꼬북이 포즈(베이스명) — 정체성 카드의 분위기를 결에 맞춘다.
const POSE_BY_OHAENG: Record<OhaengKey, string> = {
  목: 'pose_reading_book', // 자라남·배움
  화: 'pose_singing', // 표현·활달
  토: 'pose_holding_tea', // 안정·포용
  금: 'pose_fortune_board', // 판단·결단
  수: 'pose_walking_bag', // 흐름·탐구
};

// public PNG → base64 data URI. @3x 고해상도 원본을 우선 사용(다운샘플 시 디테일
// 보존 → 또렷함). 둘 다 실패하면 null 을 반환해 캐릭터 없이도 카드가 완성되게
// 한다(우아한 폴백 — Vercel 트레이싱이 public/ 파일을 누락할 수 있으므로).
function characterDataUri(ohaeng: OhaengKey): string | null {
  const base = POSE_BY_OHAENG[ohaeng];
  const dir = join(process.cwd(), 'public', 'characters', 'ggobuk', 'poses');
  const candidates = [join(dir, 'hires', `${base}@3x.png`), join(dir, `${base}.png`)];
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
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const profile = iljuBySlug(slug);
  if (!profile) return new Response('not found', { status: 404 });

  const theme = iljuTheme(profile.index);
  const char = characterDataUri(theme.ohaeng);

  // ganNote: "이미지 — 본질" → 시적인 앞부분(이미지)을 태그라인으로.
  const [imagery, essence] = profile.ganNote.split('—').map((s) => s.trim());
  const keywords = profile.keywords.slice(0, 4);

  return new ImageResponse(
    (
      // 2x 슈퍼샘플 래퍼: 디자인은 1200×630 좌표 그대로, 루트만 scale(2) 해
      // 출력 픽셀을 2배(2400×1260)로 키운다(캐릭터 래스터를 또렷하게).
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
            background: theme.soft,
            color: theme.on,
            fontFamily: 'sans-serif',
            transform: `scale(${SCALE})`,
            transformOrigin: 'top left',
          }}
        >
        {/* 좌측 — 텍스트 정체성 */}
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
                background: theme.accent,
                color: '#FFFFFF',
                fontSize: 26,
                fontWeight: 800,
              }}
            >
              占
            </div>
            <div style={{ display: 'flex', fontSize: 28, fontWeight: 800, opacity: 0.72 }}>
              꼬북점 · 내 사주 캐릭터
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', fontSize: 100, fontWeight: 900, lineHeight: 1.05 }}>
              {`${profile.name}일주`}
            </div>
            <div
              style={{
                display: 'flex',
                marginTop: 12,
                fontSize: 38,
                fontWeight: 800,
                color: theme.accent,
              }}
            >
              {`${profile.hanja}日柱 · ${theme.hanja}(${theme.element})의 기운`}
            </div>
            {imagery ? (
              <div
                style={{
                  display: 'flex',
                  marginTop: 24,
                  fontSize: 36,
                  fontWeight: 700,
                  opacity: 0.92,
                }}
              >
                {imagery}
              </div>
            ) : null}
            {essence ? (
              <div
                style={{
                  display: 'flex',
                  marginTop: 6,
                  fontSize: 28,
                  fontWeight: 600,
                  opacity: 0.66,
                }}
              >
                {essence}
              </div>
            ) : null}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 28 }}>
              {keywords.map((kw) => (
                <div
                  key={kw}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    background: '#FFFFFFCC',
                    border: `2px solid ${theme.accent}`,
                    color: theme.on,
                    borderRadius: 999,
                    padding: '8px 18px',
                    fontSize: 24,
                    fontWeight: 800,
                  }}
                >
                  {`#${kw}`}
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', fontSize: 24, fontWeight: 700, opacity: 0.62 }}>
            나는 무슨 일주일까? · 생년월일만 넣으면 1초
          </div>
        </div>

        {/* 우측 — 오행 색 패널: 큰 한자 + 캐릭터 */}
        <div
          style={{
            width: 460,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: theme.accent,
            color: '#FFFFFF',
            padding: 36,
          }}
        >
          <div style={{ display: 'flex', fontSize: 230, fontWeight: 900, lineHeight: 1 }}>
            {profile.hanja}
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              marginTop: 8,
              background: '#FFFFFF2E',
              borderRadius: 999,
              padding: '8px 22px',
              fontSize: 30,
              fontWeight: 800,
            }}
          >
            {`${theme.hanja} ${theme.element}`}
          </div>
          {char ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={char}
              alt=""
              width={190}
              height={190}
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
