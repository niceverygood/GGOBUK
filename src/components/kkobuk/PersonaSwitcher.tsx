'use client';

import { PERSONAS, type PersonaKey } from '@/lib/llm/personas';
import { KkobukAvatar } from './KkobukAvatar';
import { cn } from '@/lib/utils/cn';

export function PersonaSwitcher({
  selected,
  onSelect,
}: {
  selected: PersonaKey;
  onSelect: (k: PersonaKey) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
      {(Object.keys(PERSONAS) as PersonaKey[]).map((k) => {
        const p = PERSONAS[k];
        const active = selected === k;
        return (
          <button
            key={k}
            onClick={() => onSelect(k)}
            className={cn(
              'flex flex-col items-center px-3 py-2 rounded-2xl shrink-0 border transition',
              active
                ? 'bg-[var(--color-ink)] text-white border-[var(--color-ink)]'
                : 'bg-white text-[var(--color-ink)] border-black/10',
            )}
          >
            <KkobukAvatar variant={k} size="sm" />
            <span className="text-xs mt-1">{p.displayName}</span>
          </button>
        );
      })}
    </div>
  );
}
