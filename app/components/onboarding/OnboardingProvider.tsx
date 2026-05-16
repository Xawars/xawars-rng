'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { useOnboarding, OnboardingState, OnboardingActions } from '../../hooks/useOnboarding';

type OnboardingContextValue = OnboardingState & OnboardingActions;

const OnboardingContext = createContext<OnboardingContextValue | undefined>(undefined);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const onboarding = useOnboarding();

  return (
    <OnboardingContext.Provider value={onboarding}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboardingContext(): OnboardingContextValue {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error('useOnboardingContext must be used within an OnboardingProvider');
  }
  return context;
}
