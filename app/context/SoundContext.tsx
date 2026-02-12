'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface SoundContextType {
  isMuted: boolean;
  toggleMute: () => void;
  volume: number; // 0.0 to 1.0
  setVolume: (vol: number) => void;
}

const SoundContext = createContext<SoundContextType | undefined>(undefined);

export function SoundProvider({ children }: { children: ReactNode }) {
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.5); // Default volume

  // Load preference from localStorage on mount
  useEffect(() => {
    const savedMute = localStorage.getItem('xawars-rng-mute');
    if (savedMute !== null) {
      setIsMuted(savedMute === 'true');
    }
  }, []);

  const toggleMute = () => {
    setIsMuted(prev => {
      const newState = !prev;
      localStorage.setItem('xawars-rng-mute', String(newState));
      return newState;
    });
  };

  return (
    <SoundContext.Provider value={{ isMuted, toggleMute, volume, setVolume }}>
      {children}
    </SoundContext.Provider>
  );
}

export function useSoundContext() {
  const context = useContext(SoundContext);
  if (context === undefined) {
    throw new Error('useSoundContext must be used within a SoundProvider');
  }
  return context;
}
