'use client';

import { KkobukSprite, SPRITE_MAP, type SpriteKey } from '@/components/kkobuk/KkobukSprite';

const ALL: SpriteKey[] = Object.keys(SPRITE_MAP) as SpriteKey[];

export default function SpriteTestPage() {
  return (
    <main className="min-h-dvh p-6 bg-ivory">
      <h1 className="text-xl font-black text-navy mb-4">Sprite calibration</h1>
      <p className="text-xs font-bold text-muted mb-6">
        Each cell shows one sprite + its (x, y, w, h) on the 1536×1024 sheet.
        Adjust SPRITE_MAP coordinates if a character is mis-cropped.
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {ALL.map((key) => {
          const r = SPRITE_MAP[key];
          return (
            <div key={key} className="rounded-2xl bg-white border border-navy/10 p-3 flex flex-col items-center">
              <div className="h-44 flex items-end">
                <KkobukSprite variant={key} size="xl" />
              </div>
              <div className="mt-2 text-xs font-black text-navy">{key}</div>
              <div className="text-[10px] font-mono text-muted">
                x:{r.x} y:{r.y} w:{r.w} h:{r.h}
              </div>
            </div>
          );
        })}
      </div>

      <h2 className="mt-10 text-lg font-black text-navy">Reference sheet (full)</h2>
      <div className="mt-3 rounded-2xl border border-navy/10 overflow-hidden bg-soft">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/characters/sheet.png" alt="reference" className="w-full" />
      </div>
    </main>
  );
}
