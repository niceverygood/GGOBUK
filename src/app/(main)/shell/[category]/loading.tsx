import { Card } from '@/components/ui/primitives';

export default function ShellCategoryLoading() {
  return (
    <main className="px-5 pt-8 pb-[14rem] relative min-h-dvh">
      <div className="hanji-overlay" />
      <div className="relative">
        <div className="h-4 w-16 rounded-full bg-navy/10" />
        <div className="mt-5 flex items-start justify-between">
          <div className="space-y-2">
            <div className="h-3 w-28 rounded-full bg-navy/10" />
            <div className="h-8 w-36 rounded-full bg-navy/10" />
          </div>
          <div className="h-16 w-16 rounded-2xl bg-mint/15" />
        </div>
        <Card className="mt-4 p-5">
          <div className="space-y-3">
            <div className="h-4 w-10/12 animate-pulse rounded-full bg-navy/10" />
            <div className="h-4 w-full animate-pulse rounded-full bg-navy/10" />
            <div className="h-4 w-9/12 animate-pulse rounded-full bg-navy/10" />
            <div className="h-4 w-11/12 animate-pulse rounded-full bg-navy/10" />
          </div>
        </Card>
      </div>
    </main>
  );
}
