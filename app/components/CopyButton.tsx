"use client";

import { useState } from "react";
import { Clipboard, Check } from "lucide-react";

interface CopyButtonProps {
  text: string;
  label?: string;
  className?: string;
}

export function CopyButton({ text, label = "Copy", className = "" }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fail silently — stay in default state
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`inline-flex items-center gap-1.5 text-xs transition-colors duration-150 ${
        copied
          ? "text-green-400"
          : "text-white/60 hover:text-white"
      } ${className}`}
      aria-label={copied ? "Copied" : label}
    >
      {copied ? (
        <>
          <Check className="w-4 h-4" />
          <span>Copied!</span>
        </>
      ) : (
        <>
          <Clipboard className="w-4 h-4" />
          <span>{label}</span>
        </>
      )}
    </button>
  );
}
