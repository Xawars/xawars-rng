'use client';

import { useState, useRef } from 'react';
import { ChevronDown, LogIn } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { UserAvatar } from './UserAvatar';
import { AccountMenu } from './AccountMenu';

interface AccountIndicatorProps {
  onOpenStats?: () => void;
  className?: string;
}

/**
 * The always-visible account trigger in the header.
 * Shows avatar + name for authenticated users, "Sign In" for guests.
 */
export function AccountIndicator({ onOpenStats, className = '' }: AccountIndicatorProps) {
  const { user, isGuest } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Guest mode: show sign-in button
  if (isGuest || !user) {
    return (
      <a
        href="/login"
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-yellow-500 border border-yellow-500/30 rounded-lg hover:bg-yellow-500/10 hover:border-yellow-500/50 transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-500 ${className}`}
      >
        <LogIn className="w-3.5 h-3.5" />
        Sign In
      </a>
    );
  }

  // Authenticated: show avatar + name + dropdown
  const displayName = user.displayName || 'Agent';
  const truncatedName = displayName.length > 12 ? displayName.slice(0, 12) + '…' : displayName;

  return (
    <div className={`relative ${className}`}>
      <button
        ref={triggerRef}
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        aria-haspopup="menu"
        aria-expanded={isMenuOpen}
        aria-label={`Account menu for ${displayName}`}
        className={`inline-flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-yellow-500 ${
          isMenuOpen
            ? 'bg-white/10 ring-1 ring-yellow-500/30'
            : 'hover:bg-white/5'
        }`}
      >
        <UserAvatar user={user} size="sm" />
        <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider hidden sm:inline">
          {truncatedName}
        </span>
        <ChevronDown className={`w-3 h-3 text-zinc-500 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} />
      </button>

      <AccountMenu
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        onOpenStats={onOpenStats}
      />
    </div>
  );
}
