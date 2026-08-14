import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import { resolveRepresentativeProfile } from '@/lib/profiles/resolve';
import { ChatThread } from '@/components/chat/ChatThread';

// 세션 get-or-create가 요청마다 살아있어야 해서 정적 캐시 금지.
export const dynamic = 'force-dynamic';

/**
 * 꼬북이와 대화 — 단일 스레드.
 * v2 단순화: 세션 목록/새 대화 만들기 없이, 사용자당 꼬북이 세션 하나를
 * 서버에서 get-or-create 해서 바로 이어 대화한다.
 */
export default async function ChatPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const resolved = await resolveRepresentativeProfile(supabase, user.id);
  if (!resolved.ok) redirect('/onboarding/saju');
  const profile = resolved.profile;

  let { data: session } = await supabase
    .from('chat_sessions')
    .select('id')
    .eq('user_id', user.id)
    .eq('persona', 'kkobuk')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!session) {
    const { data: created, error } = await supabase
      .from('chat_sessions')
      .insert({
        user_id: user.id,
        saju_id: profile.id,
        persona: 'kkobuk',
        title: null,
      })
      .select('id')
      .single();
    if (error || !created) redirect('/home');
    session = created;
  }

  const { data: messages } = await supabase
    .from('chat_messages')
    .select('role, content')
    .eq('session_id', session.id)
    .order('created_at', { ascending: true })
    .limit(100);

  return (
    <ChatThread
      sessionId={session.id}
      initialMessages={
        (messages ?? []) as Array<{
          role: 'user' | 'assistant';
          content: string;
        }>
      }
    />
  );
}
