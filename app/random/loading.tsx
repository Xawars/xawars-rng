import { ArrowLeft, Dices } from 'lucide-react';
import Link from 'next/link';

export default function RandomLoading() {
  return (
    <div className="min-h-dvh bg-black text-white flex flex-col">
      <header className="shrink-0 border-b border-zinc-800 bg-black/90 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/" className="p-2 rounded-lg text-zinc-400" aria-label="Back to home">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <Dices className="w-5 h-5 text-yellow-500" />
          <h1 className="text-lg font-black uppercase tracking-tight">Random Operator</h1>
        </div>
      </header>
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8 gap-6 max-w-5xl mx-auto w-full">
        {/* Side filter placeholder */}
        <div className="flex gap-1 p-0.5 bg-zinc-900 rounded-lg border border-zinc-700">
          <div className="px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-md bg-zinc-700 text-white">All</div>
          <div className="px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-md text-zinc-500">Attack</div>
          <div className="px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-md text-zinc-500">Defense</div>
        </div>

        {/* Three-column layout */}
        <div className="flex flex-col lg:flex-row items-center lg:items-start gap-6 w-full justify-center">
          {/* Left panel */}
          <div className="w-full max-w-xs flex flex-col gap-3">
            <div className="h-3 w-20 rounded bg-zinc-800" />
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 h-20" />
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 h-20" />
          </div>

          {/* Center card */}
          <div className="w-full max-w-sm flex flex-col items-center gap-6">
            <div className="w-full aspect-3/4 rounded-2xl border border-zinc-800 bg-zinc-900" />
            <div className="h-12 w-36 rounded-xl bg-zinc-800" />
          </div>

          {/* Right panel */}
          <div className="w-full max-w-xs flex flex-col gap-3">
            <div className="h-3 w-24 rounded bg-zinc-800" />
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 h-24" />
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 h-20" />
          </div>
        </div>
      </main>
    </div>
  );
}
