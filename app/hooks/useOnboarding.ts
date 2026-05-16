'use client';

import { useState, useEffect, useCallback } from 'react';

const ONBOARDING_KEY = 'xawars_onboarding_complete';
const ENTRY_PLAYED_KEY = 'xawars_entry_played';
const FIRST_ROLL_KEY = 'xawars_first_roll_done';
const TIPS_DISABLED_KEY = 'xawars_tips_disabled';

// Progressive tip milestone keys
const TIP_PREFIX = 'xawars_tip_';

export interface OnboardingState {
  /** Whether the user has completed the welcome modal */
  isOnboardingComplete: boolean;
  /** Whether the entry animation has played this session */
  hasEntryPlayed: boolean;
  /** Whether the user has done their first roll */
  hasFirstRoll: boolean;
  /** Whether progressive tips are globally disabled */
  tipsDisabled: boolean;
}

export interface OnboardingActions {
  completeOnboarding: () => void;
  markEntryPlayed: () => void;
  markFirstRoll: () => void;
  disableTips: () => void;
  enableTips: () => void;
  /** Check if a specific progressive tip has been dismissed */
  isTipDismissed: (tipId: string) => boolean;
  /** Mark a progressive tip as dismissed */
  dismissTip: (tipId: string) => void;
  /** Reset all onboarding state (for testing) */
  resetOnboarding: () => void;
}

export function useOnboarding(): OnboardingState & OnboardingActions {
  const [isOnboardingComplete, setIsOnboardingComplete] = useState(true); // default true to avoid flash
  const [hasEntryPlayed, setHasEntryPlayed] = useState(true); // default true to avoid flash
  const [hasFirstRoll, setHasFirstRoll] = useState(true);
  const [tipsDisabled, setTipsDisabled] = useState(false);

  // Hydrate from storage on mount
  useEffect(() => {
    setIsOnboardingComplete(localStorage.getItem(ONBOARDING_KEY) === 'true');
    setHasEntryPlayed(sessionStorage.getItem(ENTRY_PLAYED_KEY) === 'true');
    setHasFirstRoll(localStorage.getItem(FIRST_ROLL_KEY) === 'true');
    setTipsDisabled(localStorage.getItem(TIPS_DISABLED_KEY) === 'true');
  }, []);

  const completeOnboarding = useCallback(() => {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    setIsOnboardingComplete(true);
  }, []);

  const markEntryPlayed = useCallback(() => {
    sessionStorage.setItem(ENTRY_PLAYED_KEY, 'true');
    setHasEntryPlayed(true);
  }, []);

  const markFirstRoll = useCallback(() => {
    localStorage.setItem(FIRST_ROLL_KEY, 'true');
    setHasFirstRoll(true);
  }, []);

  const disableTips = useCallback(() => {
    localStorage.setItem(TIPS_DISABLED_KEY, 'true');
    setTipsDisabled(true);
  }, []);

  const enableTips = useCallback(() => {
    localStorage.removeItem(TIPS_DISABLED_KEY);
    setTipsDisabled(false);
  }, []);

  const isTipDismissed = useCallback((tipId: string): boolean => {
    return localStorage.getItem(`${TIP_PREFIX}${tipId}`) === 'true';
  }, []);

  const dismissTip = useCallback((tipId: string) => {
    localStorage.setItem(`${TIP_PREFIX}${tipId}`, 'true');
  }, []);

  const resetOnboarding = useCallback(() => {
    localStorage.removeItem(ONBOARDING_KEY);
    localStorage.removeItem(FIRST_ROLL_KEY);
    localStorage.removeItem(TIPS_DISABLED_KEY);
    sessionStorage.removeItem(ENTRY_PLAYED_KEY);
    setIsOnboardingComplete(false);
    setHasEntryPlayed(false);
    setHasFirstRoll(false);
    setTipsDisabled(false);
  }, []);

  return {
    isOnboardingComplete,
    hasEntryPlayed,
    hasFirstRoll,
    tipsDisabled,
    completeOnboarding,
    markEntryPlayed,
    markFirstRoll,
    disableTips,
    enableTips,
    isTipDismissed,
    dismissTip,
    resetOnboarding,
  };
}
