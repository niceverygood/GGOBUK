import { notFound, redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import { ChatThread } from '@/components/chat/ChatThread';
import type { PersonaKey } from '@/lib/llm/personas';

export default async function ChatSessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: session } = await supabase
    .from('chat_sessions')
    .select('*')
    .eq('id', sessionId)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!session) notFound();

  const { data: messages } = await supabase
    .from('chat_messages')
    .select('role, content')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });

  return (
    <ChatThread
      sessionId={sessionId}
      persona={session.persona as PersonaKey}
      initialMessages={(messages ?? []) as Array<{ role: 'user' | 'assistant'; content: string }>}
    />
  );
}
