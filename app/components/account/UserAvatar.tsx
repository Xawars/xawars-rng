'use client';

import { User as UserIcon } from 'lucide-react';

interface UserAvatarProps {
  user: { displayName?: string; email?: string; avatarUrl?: string; id?: string } | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZES = {
  sm: 'w-6 h-6 text-[10px]',
  md: 'w-7 h-7 text-xs',
  lg: 'w-9 h-9 text-sm',
};

const ICON_SIZES = {
  sm: 'w-3.5 h-3.5',
  md: 'w-4 h-4',
  lg: 'w-5 h-5',
};

/**
 * Generates a deterministic hue from a string (user ID or email).
 */
function getHueFromString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % 360;
}

/**
 * Gets the initials to display for a user.
 */
function getInitials(user: { displayName?: string; email?: string } | null): string {
  if (!user) return '?';
  if (user.displayName) {
    const parts = user.displayName.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0][0].toUpperCase();
  }
  if (user.email) {
    return user.email[0].toUpperCase();
  }
  return '?';
}

/**
 * Reusable avatar component that handles all user states:
 * - OAuth avatar image
 * - Initials fallback (deterministic color)
 * - Generic icon for guests
 */
export function UserAvatar({ user, size = 'md', className = '' }: UserAvatarProps) {
  const sizeClass = SIZES[size];
  const iconSize = ICON_SIZES[size];

  // Guest / no user
  if (!user) {
    return (
      <div
        className={`${sizeClass} rounded-full bg-zinc-700 flex items-center justify-center ${className}`}
        aria-hidden="true"
      >
        <UserIcon className={`${iconSize} text-zinc-400`} />
      </div>
    );
  }

  // Has avatar URL (OAuth providers)
  if (user.avatarUrl) {
    return (
      <img
        src={user.avatarUrl}
        alt={user.displayName || user.email || 'User avatar'}
        className={`${sizeClass} rounded-full object-cover border border-zinc-600 ${className}`}
      />
    );
  }

  // Initials fallback
  const initials = getInitials(user);
  const hue = getHueFromString(user.id || user.email || 'default');

  return (
    <div
      className={`${sizeClass} rounded-full flex items-center justify-center font-bold uppercase border border-white/10 ${className}`}
      style={{ backgroundColor: `hsl(${hue}, 50%, 30%)`, color: `hsl(${hue}, 70%, 80%)` }}
      aria-hidden="true"
    >
      {initials}
    </div>
  );
}
