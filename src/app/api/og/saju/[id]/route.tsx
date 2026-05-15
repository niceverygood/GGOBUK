import { ImageResponse } from 'next/og';
import { createServerClient } from '@/lib/supabase/server';
import type { Palja } from '@/lib/saju/types';

export const runtime = 'nodejs';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerClient();
  const { data: profile } = await supabase
    .from('saju_profiles')
    .select('name, palja')
    .eq('id', id)
    .maybeSingle();
  if (!profile?.palja) {
    return new Response('not found', { status: 404 });
  }
  const palja = profile.palja as Palja;

  const cells = [
    palja.time?.ganHanja ?? '?',
    palja.day.ganHanja,
    palja.month.ganHanja,
    palja.year.ganHanja,
    palja.time?.jiHanja ?? '?',
    palja.day.jiHanja,
    palja.month.jiHanja,
    palja.year.jiHanja,
  ];

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#FAF6F0',
          color: '#2C3E50',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ fontSize: 36, opacity: 0.7 }}>{profile.name}의 등껍질</div>
        <div style={{ display: 'flex', flexDirection: 'column', marginTop: 36 }}>
          <div style={{ display: 'flex', gap: 16 }}>
            {cells.slice(0, 4).map((c, i) => (
              <div
                key={`g${i}`}
                style={{
                  width: 110,
                  height: 130,
                  background: '#4ECDC433',
                  border: '3px solid #2C3E50',
                  borderRadius: 16,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 80,
                }}
              >
                {c}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 16 }}>
            {cells.slice(4).map((c, i) => (
              <div
                key={`j${i}`}
                style={{
                  width: 110,
                  height: 130,
                  background: '#F4D03F33',
                  border: '3px solid #2C3E50',
                  borderRadius: 16,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 80,
                }}
              >
                {c}
              </div>
            ))}
          </div>
        </div>
        <div style={{ marginTop: 40, fontSize: 28, opacity: 0.6 }}>꼬북점 · 등껍질이 풀어주는 사주</div>
      </div>
    ),
    { ...size },
  );
}
