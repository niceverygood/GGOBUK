import { createServerClient } from '@/lib/supabase/server';

/**
 * 초대 토큰 → host(초대를 보낸 사람) 이름. 만료/없음/에러 모두 null 로 폴백한다.
 *
 * 공유형 초대 OG 카드(/api/og/invite/[token])와 초대 페이지 메타데이터
 * (/invite/[token]/layout.tsx)가 함께 쓴다. 둘 다 비로그인 외부 언퍼러
 * (카카오톡·트위터 등)가 때리므로 RLS 우회용 admin 클라이언트로 읽는다.
 */
export async function inviteHostName(token: string): Promise<string | null> {
  try {
    const admin = await createServerClient({ admin: true });
    const { data: invite } = await admin
      .from('relation_invites')
      .select('host_saju_id')
      .eq('token', token)
      .maybeSingle();
    if (!invite?.host_saju_id) return null;
    const { data: host } = await admin
      .from('saju_profiles')
      .select('name')
      .eq('id', invite.host_saju_id)
      .maybeSingle();
    return host?.name ?? null;
  } catch {
    return null;
  }
}
