'use client';

import { useState, useEffect, useRef } from 'react';
import { operators } from '../data/operators';
import { OperatorIcon } from './OperatorIcon';

interface RollAnimationProps {
  isRolling: boolean;
  side?: 'attacker' | 'defender' | null;
}

/**
 * Rapid-cycling operator name/icon animation shown during the roll.
 * Creates a slot-machine effect before the final operator is revealed.
 */
export function RollAnimation({ isRolling, side }: RollAnimationProps) {
  const [currentOp, setCurrentOp] = useState<{ name: string; id: string; side: string } | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [speed, setSpeed] = useState(60);

  useEffect(() => {
    if (!isRolling) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setCurrentOp(null);
      setSpeed(60);
      return;
    }

    // Filter operators by side if specified
    const pool = side
      ? operators.filter(op => op.side === side)
      : operators;

    // Start cycling rapidly
    let tick = 0;
    intervalRef.current = setInterval(() => {
      const randomOp = pool[Math.floor(Math.random() * pool.length)];
      setCurrentOp({ name: randomOp.name, id: randomOp.id, side: randomOp.side });
      tick++;

      // Slow down over time for dramatic effect
      if (tick > 6) {
        setSpeed(100);
      }
      if (tick > 10) {
        setSpeed(150);
      }
    }, speed);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRolling, side, speed]);

  if (!isRolling || !currentOp) return null;

  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md rounded-xl">
      {/* Cycling operator icon */}
      <div className="w-16 h-16 mb-3 animate-pulse">
        <OperatorIcon id={currentOp.id} className="w-full h-full opacity-60">
          <span className="text-3xl font-black text-white/60">{currentOp.name[0]}</span>
        </OperatorIcon>
      </div>

      {/* Cycling name */}
      <p className="text-2xl font-black uppercase tracking-tight text-white animate-roll-name">
        {currentOp.name}
      </p>

      {/* Side indicator */}
      <p className={`text-[10px] font-bold uppercase tracking-widest mt-1 ${
        currentOp.side === 'attacker' ? 'text-orange-400' : 'text-blue-400'
      }`}>
        {currentOp.side}
      </p>

      {/* Scanning line effect */}
      <div className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-yellow-500/50 to-transparent animate-scan-line" />
    </div>
  );
}
