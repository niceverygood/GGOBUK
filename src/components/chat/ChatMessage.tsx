import { KkobukAvatar, type KkobukVariant } from '@/components/kkobuk/KkobukAvatar';
import { renderCitedContent } from './CitedShellCard';
import { cn } from '@/lib/utils/cn';

export function ChatMessage({
  role,
  content,
  persona,
}: {
  role: 'user' | 'assistant';
  content: string;
  persona: KkobukVariant;
}) {
  const isUser = role === 'user';
  return (
    <div className={cn('flex gap-2 mb-3 items-start', isUser ? 'justify-end' : 'justify-start')}>
      {!isUser && (
        <div className="shrink-0 w-10 h-10 rounded-2xl bg-mint/30 border border-navy/10 flex items-center justify-center overflow-hidden">
          <KkobukAvatar variant={persona} size="sm" />
        </div>
      )}
      <div
        className={cn(
          'max-w-[78%] rounded-3xl px-3.5 py-3 text-[13px] leading-snug whitespace-pre-wrap font-bold shadow-[0_7px_16px_rgba(44,62,80,0.06)]',
          isUser
            ? 'bg-mint text-[#143537] rounded-br-md'
            : 'bg-white text-navy rounded-bl-md',
        )}
      >
        {renderCitedContent(content)}
      </div>
    </div>
  );
}
