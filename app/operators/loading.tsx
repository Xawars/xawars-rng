import { ArrowLeft, Search } from 'lucide-react';
import Link from 'next/link';

// ponytail: Next.js automatic Suspense boundary — shows during server fetch in page.tsx
function SkeletonCard() {
  return (
    <div className="relative rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
      <div className="absolute top-0 left-3 right-3 h-px rounded-full bg-zinc-700/40" />
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-zinc-800 animate-shimmer" />
          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="h-3.5 w-24 rounded bg-zinc-800 animate-shimmer" />
            <div className="h-2.5 w-32 rounded bg-zinc-800/60 animate-shimmer" />
          </div>
        </div>
        <div className="h-3 w-36 rounded bg-zinc-800/50 animate-shimmer" />
        <div className="flex gap-4">
          <div className="h-2.5 w-12 rounded bg-zinc-800/40 animate-shimmer" />
          <div className="h-2.5 w-12 rounded bg-zinc-800/40 animate-shimmer" />
          <div className="h-2.5 w-12 rounded bg-zinc-800/40 animate-shimmer" />
        </div>
        <div className="flex gap-1">
          <div className="h-4 w-14 rounded bg-zinc-800/30 animate-shimmer" />
          <div className="h-4 w-16 rounded bg-zinc-800/30 animate-shimmer" />
        </div>
      </div>
    </div>
  );
}

export default function OperatorsLoading() {
  return (
    <div className="min-h-dvh bg-black text-white">
      <header className="sticky top-0 z-10 bg-black/90 backdrop-blur-md border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
          <Link
            href="/"
            className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
            aria-label="Back to home"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-lg font-black uppercase tracking-tight">Operators</h1>
          <span className="text-xs text-zinc-500 ml-auto">
            <div className="h-3 w-12 rounded bg-zinc-800 animate-shimmer" />
          </span>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-5 space-y-4">
        {/* Filter bar skeleton */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
            <div className="w-full h-[42px] pl-9 bg-zinc-900 border border-zinc-700 rounded-lg" />
          </div>
          <div className="flex gap-1 p-0.5 bg-zinc-900 rounded-lg border border-zinc-700 shrink-0">
            <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider rounded-md bg-zinc-700 text-white shadow-sm">All</div>
            <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider rounded-md text-zinc-500">ATK</div>
            <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider rounded-md text-zinc-500">DEF</div>
          </div>
          <div className="h-[42px] w-28 bg-zinc-900 border border-zinc-700 rounded-lg shrink-0" />
        </div>

        {/* Grid skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {Array.from({ length: 12 }, (_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </main>
    </div>
  );
}
