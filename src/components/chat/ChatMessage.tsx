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
    <div className={cn('flex gap-2 mb-3', isUser ? 'justify-end' : 'justify-start')}>
      {!isUser && (
        <div className="shrink-0">
          <KkobukAvatar variant={persona} size="sm" />
        </div>
      )}
      <div
        className={cn(
          'max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap',
          isUser ? 'bg-[var(--color-ink)] text-white rounded-br-sm' : 'bg-white text-[var(--color-ink)] rounded-bl-sm shadow-sm',
        )}
      >
        {renderCitedContent(content)}
      </div>
    </div>
  );
}
