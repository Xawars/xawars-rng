"use client";

import { Sparkles } from "lucide-react";

interface FloatingGeneratorButtonProps {
  onClick: () => void;
}

export function FloatingGeneratorButton({ onClick }: FloatingGeneratorButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Generate content"
      className="fixed bottom-6 right-6 z-40 inline-flex items-center gap-2 rounded-full bg-yellow-500 px-5 py-3 text-black font-bold uppercase tracking-wider shadow-lg shadow-yellow-500/20 min-w-[44px] min-h-[44px] transition-transform duration-150 hover:scale-105 hover:bg-yellow-400 active:scale-95 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2 focus:ring-offset-zinc-900"
    >
      <Sparkles className="w-5 h-5" />
      <span>Generate</span>
    </button>
  );
}
