import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import { createServerClient } from '@/lib/supabase/server';
import { PERSONAS, type PersonaKey } from '@/lib/llm/personas';

export const runtime = 'nodejs';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// 2x 슈퍼샘플(출력 2400×1260) — 임베드 캐릭터 PNG 가 카톡·레티나 확대에서 또렷하게.
const SCALE = 2;

// 페르소나별 캐릭터 원본(@2x)과 자연 비율(width/height 계산용).
const PERSONA_CHAR: Record<PersonaKey, { file: string; w: number; h: number }> = {
  kkobuk: { file: 'basic_friend_waving@2x.png', w: 1440, h: 1728 },
  dosa: { file: 'saju_master_staff-fixed@2x.png', w: 1145, h: 1374 },
  mudang: { file: 'direct_shaman_bell@2x.png', w: 1728, h: 1856 },
  bosal: { file: 'comfort_bodhisattva_beads@2x.png', w: 1464, h: 1856 },
};

// 페르소나 톤 색(우측 패널·배지).
const PERSONA_ACCENT: Record<PersonaKey, string> = {
  kkobuk: '#2E7D6B', // 민트 — 편한 친구
  dosa: '#2B3A55', // 먹빛 네이비 — 한학자
  mudang: '#C0455B', // 단심 — 직설 무당
  bosal: '#C98A3B', // 따뜻한 금 — 보살
};

const CREAM_TOP = '#FBF5E9';
const CREAM_BOT = '#F1E4C8';
const INK = '#22324A';
const MUTED = '#8A7F6B';

function charDataUri(persona: PersonaKey): string | null {
  const c = PERSONA_CHAR[persona];
  const dir = join(process.cwd(), 'public', 'characters', 'ggobuk', 'characters', 'hires');
  try {
    const buf = readFileSync(join(dir, c.file));
    return `data:image/png;base64,${buf.toString('base64')}`;
  } catch {
    return null;
  }
}

interface ShareCard {
  persona: PersonaKey;
  title: string;
  ownerName: string;
}

/** 토큰 → 공유 카드 표시용 최소 데이터. 만료/없음/에러는 모두 null(폴백 카드). */
async function fetchShareCard(token: string): Promise<ShareCard | null> {
  try {
    const admin = await createServerClient({ admin: true });
    const { data } = await admin
      .from('saju_shares')
      .select('persona, title, owner_name, expires_at')
      .eq('token', token)
      .maybeSingle();
    if (!data) return null;
    if (data.expires_at && new Date(data.expires_at).getTime() < Date.now()) {
      return null;
    }
    const persona = (data.persona as PersonaKey | null) ?? 'dosa';
    return {
      persona: PERSONA_CHAR[persona] ? persona : 'dosa',
      title: (data.title as string | null)?.trim() || '사주 풀이',
      ownerName: (data.owner_name as string | null)?.trim() || '누군가',
    };
  } catch {
    return null;
  }
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const card =
    (await fetchShareCard(token)) ??
    // 토큰 무효/만료여도 404 금지 — unfurler 는 robots 무시하므로 일반 카드로 폴백.
    ({ persona: 'dosa', title: '사주 풀이', ownerName: '누군가' } as ShareCard);

  const accent = PERSONA_ACCENT[card.persona];
  const personaName = PERSONAS[card.persona]?.displayName ?? '꼬북도사';
  const char = charDataUri(card.persona);
  const charDef = PERSONA_CHAR[card.persona];
  const charH = 520;
  const charW = Math.round((charDef.w / charDef.h) * charH);

  return new ImageResponse(
    (
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
            background: `linear-gradient(135deg, ${CREAM_TOP} 0%, ${CREAM_BOT} 100%)`,
            fontFamily: 'sans-serif',
            transform: `scale(${SCALE})`,
            transformOrigin: 'top left',
          }}
        >
          {/* 좌측 — 후크 텍스트 */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              padding: '60px 56px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 46,
                  height: 46,
                  borderRadius: 999,
                  background: INK,
                  color: CREAM_TOP,
                  fontSize: 26,
                  fontWeight: 900,
                }}
              >
                占
              </div>
              <div style={{ display: 'flex', fontSize: 30, fontWeight: 800, color: INK, opacity: 0.8 }}>
                꼬북점
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', fontSize: 36, fontWeight: 800, color: MUTED }}>
                {`${card.ownerName} 님의`}
              </div>
              <div
                style={{
                  display: 'flex',
                  marginTop: 4,
                  fontSize: 88,
                  fontWeight: 900,
                  color: INK,
                  lineHeight: 1.04,
                }}
              >
                {card.title}
              </div>
              <div
                style={{
                  display: 'flex',
                  alignSelf: 'flex-start',
                  marginTop: 22,
                  background: accent,
                  color: '#FFFFFF',
                  borderRadius: 999,
                  padding: '10px 24px',
                  fontSize: 28,
                  fontWeight: 800,
                }}
              >
                {`${personaName} 모드 풀이`}
              </div>
            </div>

            <div style={{ display: 'flex', fontSize: 27, fontWeight: 700, color: MUTED }}>
              내 사주는 어떨까? · 꼬북점에서 무료로 받기
            </div>
          </div>

          {/* 우측 — 페르소나 색 패널 + 캐릭터 */}
          <div
            style={{
              width: 430,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'flex-end',
              background: accent,
            }}
          >
            {char ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={char} alt="" width={charW} height={charH} style={{ objectFit: 'contain' }} />
            ) : (
              <div style={{ display: 'flex', fontSize: 220, paddingBottom: 60 }}>🐢</div>
            )}
          </div>
        </div>
      </div>
    ),
    { width: size.width * SCALE, height: size.height * SCALE },
  );
}
