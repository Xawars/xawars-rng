'use client';

import { Shield } from 'lucide-react';

interface OptionsRowProps {
  showRoles: boolean;
  onToggleRoles: (enabled: boolean) => void;
}

export function OptionsRow({ showRoles, onToggleRoles }: OptionsRowProps) {
  return (
    <div className="flex items-center justify-between py-3 px-4 bg-zinc-900/50 border border-zinc-800 rounded-lg">
      <div className="flex items-center gap-2">
        <Shield className="w-4 h-4 text-yellow-500" />
        <span className="text-sm font-medium text-zinc-300">Operator Roles</span>
      </div>
      <button
        onClick={() => onToggleRoles(!showRoles)}
        className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
          showRoles ? 'bg-yellow-500' : 'bg-zinc-700'
        }`}
        role="switch"
        aria-checked={showRoles}
      >
        <span
          className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 ${
            showRoles ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}