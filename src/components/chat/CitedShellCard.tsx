import type { CitedCard } from '@/types/db';

const OHAENG_TONE: Record<string, string> = {
  목: 'bg-ohaeng-wood',
  화: 'bg-red',
  토: 'bg-gold',
  금: 'bg-white-metal',
  수: 'bg-ohaeng-water',
};

function guessOhaeng(char: string): string {
  if ('甲乙寅卯'.includes(char)) return '목';
  if ('丙丁巳午'.includes(char)) return '화';
  if ('戊己辰戌丑未'.includes(char)) return '토';
  if ('庚辛申酉'.includes(char)) return '금';
  if ('壬癸子亥'.includes(char)) return '수';
  return '토';
}

// Inline pill rendered within chat bubble text.
export function CitedShellCardInline({ card }: { card: CitedCard }) {
  return (
    <span className="inline-flex items-center gap-1 mx-0.5 px-2 py-0.5 rounded-md bg-mint/20 border border-mint/40 text-navy text-sm align-baseline">
      <span className="text-[10px] opacity-60 font-extrabold">{card.position}</span>
      <span className="font-hanja font-extrabold">{card.char}</span>
    </span>
  );
}

// Larger quote-style card that can be inserted after a paragraph.
export function CitedShellCardBlock({ card }: { card: CitedCard }) {
  const ohaeng = guessOhaeng(card.char);
  return (
    <div className="mt-2 bg-[#F8F1E5] border border-navy/10 rounded-xl p-2.5 flex items-center gap-2">
      <div className={`w-9 h-9 rounded-lg ${OHAENG_TONE[ohaeng]} flex items-center justify-center font-hanja font-black text-navy`}>
        {card.char}
      </div>
      <div>
        <p className="text-[11px] font-black text-navy">등껍질 인용 카드</p>
        <p className="text-[10px] font-bold text-muted">
          {card.position} {card.char} · 오행 {ohaeng}
        </p>
      </div>
    </div>
  );
}

// Replace [[위치:글자]] tokens. The first occurrence in a message is rendered as a block card;
// later occurrences inline.
export function renderCitedContent(content: string): React.ReactNode[] {
  const regex = /\[\[\s*([^:\]]+?)\s*:\s*([^\]]+?)\s*\]\]/g;
  const nodes: React.ReactNode[] = [];
  let lastIdx = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  let firstSeen = false;
  while ((m = regex.exec(content)) !== null) {
    if (m.index > lastIdx) nodes.push(content.slice(lastIdx, m.index));
    const card = { position: m[1], char: m[2] };
    if (!firstSeen) {
      // first → render the pill inline AND attach a block card after
      nodes.push(<CitedShellCardInline key={key++} card={card} />);
      nodes.push(<CitedShellCardBlock key={key++} card={card} />);
      firstSeen = true;
    } else {
      nodes.push(<CitedShellCardInline key={key++} card={card} />);
    }
    lastIdx = regex.lastIndex;
  }
  if (lastIdx < content.length) nodes.push(content.slice(lastIdx));
  return nodes;
}
