import type { CitedCard } from '@/types/db';

export function CitedShellCard({ card }: { card: CitedCard }) {
  return (
    <span className="inline-flex items-center gap-1 mx-0.5 px-2 py-0.5 rounded-md bg-[var(--color-shell)]/15 border border-[var(--color-shell)]/40 text-[var(--color-ink)] text-sm">
      <span className="text-xs opacity-60">{card.position}</span>
      <span className="font-serif font-semibold">{card.char}</span>
    </span>
  );
}

// Replace [[위치:글자]] tokens in text with rendered React nodes.
export function renderCitedContent(content: string): React.ReactNode[] {
  const regex = /\[\[\s*([^:\]]+?)\s*:\s*([^\]]+?)\s*\]\]/g;
  const nodes: React.ReactNode[] = [];
  let lastIdx = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = regex.exec(content)) !== null) {
    if (m.index > lastIdx) nodes.push(content.slice(lastIdx, m.index));
    nodes.push(<CitedShellCard key={key++} card={{ position: m[1], char: m[2] }} />);
    lastIdx = regex.lastIndex;
  }
  if (lastIdx < content.length) nodes.push(content.slice(lastIdx));
  return nodes;
}
