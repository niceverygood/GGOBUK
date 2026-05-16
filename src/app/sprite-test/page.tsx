'use client';

import { KkobukSprite, SPRITE_MAP, type SpriteKey } from '@/components/kkobuk/KkobukSprite';

const ALL: SpriteKey[] = Object.keys(SPRITE_MAP) as SpriteKey[];

export default function SpriteTestPage() {
  return (
    <main className="min-h-dvh p-6 bg-ivory">
      <h1 className="text-xl font-black text-navy mb-4">Sprite calibration</h1>
      <p className="text-xs font-bold text-muted mb-6">
        Each cell shows one extracted character asset and its source PNG dimensions.
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {ALL.map((key) => {
          const r = SPRITE_MAP[key];
          return (
            <div key={key} className="rounded-2xl bg-white border border-navy/10 p-3 flex flex-col items-center">
              <div className="h-56 flex items-end">
                <KkobukSprite variant={key} size="xl" />
              </div>
              <div className="mt-2 text-xs font-black text-navy">{key}</div>
              <div className="text-[10px] font-mono text-muted">
                {r.w}×{r.h}
              </div>
              <div className="mt-1 max-w-full truncate text-[10px] font-mono text-muted">{r.src}</div>
            </div>
          );
        })}
      </div>

      <h2 className="mt-10 text-lg font-black text-navy">Extracted asset manifest</h2>
      <div className="mt-3 rounded-2xl border border-navy/10 overflow-hidden bg-soft">
        <a
          href="/characters/ggobuk/manifest.json"
          className="block p-4 text-sm font-bold text-navy underline underline-offset-4"
        >
          /characters/ggobuk/manifest.json
        </a>
      </div>
    </main>
  );
}
