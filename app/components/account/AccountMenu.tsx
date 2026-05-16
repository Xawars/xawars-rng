'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { LogOut, BarChart3, Settings, Pencil } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { UserAvatar } from './UserAvatar';
import { EditCallsignModal } from './EditCallsignModal';

interface AccountMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenStats?: () => void;
}

/**
 * Dropdown menu showing user identity and account actions.
 * Keyboard navigable with arrow keys, Escape to close.
 */
export function AccountMenu({ isOpen, onClose, onOpenStats }: AccountMenuProps) {
  const { user, signOut } = useAuth();
  const menuRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef<HTMLButtonElement[]>([]);
  const [isEditCallsignOpen, setIsEditCallsignOpen] = useState(false);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    // Delay to avoid the trigger click from immediately closing
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const items = itemsRef.current.filter(Boolean);
    const currentIndex = items.indexOf(document.activeElement as HTMLButtonElement);

    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (currentIndex < items.length - 1) {
          items[currentIndex + 1]?.focus();
        } else {
          items[0]?.focus();
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (currentIndex > 0) {
          items[currentIndex - 1]?.focus();
        } else {
          items[items.length - 1]?.focus();
        }
        break;
      case 'Tab':
        e.preventDefault();
        onClose();
        break;
    }
  }, [onClose]);

  // Focus first item on open
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        itemsRef.current[0]?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleSignOut = async () => {
    onClose();
    await signOut();
  };

  const handleOpenStats = () => {
    onClose();
    onOpenStats?.();
  };

  const handleEditCallsign = () => {
    onClose();
    setIsEditCallsignOpen(true);
  };

  if (!user) return null;

  // Render the edit modal even when menu is closed (it has its own open state)
  if (!isOpen) {
    return (
      <EditCallsignModal
        isOpen={isEditCallsignOpen}
        onClose={() => setIsEditCallsignOpen(false)}
      />
    );
  }

  return (
    <>
    <div
      ref={menuRef}
      role="menu"
      aria-label="Account menu"
      onKeyDown={handleKeyDown}
      className="absolute top-full right-0 mt-2 w-[240px] bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl overflow-hidden animate-fade-in z-50"
    >
      {/* Identity header */}
      <div className="px-4 py-3 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <UserAvatar user={user} size="lg" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-white truncate">
              {user.displayName || 'Agent'}
            </p>
            <p className="text-[10px] font-mono text-zinc-500 truncate">
              {user.email}
            </p>
          </div>
        </div>
      </div>

      {/* Menu items */}
      <div className="py-1">
        <MenuItem
          ref={(el) => { if (el) itemsRef.current[0] = el; }}
          icon={<Pencil className="w-4 h-4" />}
          label="Edit Callsign"
          onClick={handleEditCallsign}
        />
        {onOpenStats && (
          <MenuItem
            ref={(el) => { if (el) itemsRef.current[1] = el; }}
            icon={<BarChart3 className="w-4 h-4" />}
            label="My Stats"
            onClick={handleOpenStats}
          />
        )}
        <MenuItem
          ref={(el) => { if (el) itemsRef.current[onOpenStats ? 2 : 1] = el; }}
          icon={<Settings className="w-4 h-4" />}
          label="Settings"
          onClick={() => { /* Future: open settings */ onClose(); }}
          disabled
        />
      </div>

      {/* Sign out */}
      <div className="border-t border-zinc-800 py-1">
        <MenuItem
          ref={(el) => { if (el) itemsRef.current[onOpenStats ? 3 : 2] = el; }}
          icon={<LogOut className="w-4 h-4" />}
          label="Sign Out"
          onClick={handleSignOut}
          variant="danger"
        />
      </div>
    </div>

    {/* Edit Callsign Modal (rendered outside the dropdown) */}
    <EditCallsignModal
      isOpen={isEditCallsignOpen}
      onClose={() => setIsEditCallsignOpen(false)}
    />
    </>
  );
}

interface MenuItemProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  variant?: 'default' | 'danger';
  disabled?: boolean;
}

const MenuItem = React.forwardRef<HTMLButtonElement, MenuItemProps>(
  ({ icon, label, onClick, variant = 'default', disabled = false }, ref) => {
    const textColor = variant === 'danger'
      ? 'text-red-400 hover:text-red-300'
      : disabled
        ? 'text-zinc-600'
        : 'text-zinc-300 hover:text-white';

    const hoverBg = disabled ? '' : 'hover:bg-white/5';

    return (
      <button
        ref={ref}
        role="menuitem"
        onClick={onClick}
        disabled={disabled}
        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm font-medium transition-colors ${textColor} ${hoverBg} focus:outline-none focus:bg-white/5 focus:ring-inset focus:ring-1 focus:ring-yellow-500/50 disabled:cursor-not-allowed`}
      >
        {icon}
        <span className="uppercase tracking-wider text-xs font-bold">{label}</span>
      </button>
    );
  }
);

MenuItem.displayName = 'MenuItem';
