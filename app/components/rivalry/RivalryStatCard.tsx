import React from 'react';
import type { StatCardResult, Advantage } from '../../lib/comparison-engine';

export interface RivalryStatCardProps {
  result: StatCardResult;
  leftOperatorName: string;
  rightOperatorName: string;
}

/**
 * Builds an accessible ARIA label describing the stat card's content,
 * including metric name, both values, and advantage determination.
 */
function buildAriaLabel(
  result: StatCardResult,
  leftOperatorName: string,
  rightOperatorName: string
): string {
  const { label, leftDisplay, rightDisplay, advantage } = result;

  let advantageText: string;
  if (advantage === 'left') {
    advantageText = `${leftOperatorName} leads`;
  } else if (advantage === 'right') {
    advantageText = `${rightOperatorName} leads`;
  } else {
    advantageText = 'tie';
  }

  return `${label}: ${leftOperatorName} ${leftDisplay}, ${rightOperatorName} ${rightDisplay}, ${advantageText}`;
}

/**
 * Returns Tailwind classes for the value cell based on advantage and side.
 */
function getValueClasses(advantage: Advantage, side: 'left' | 'right'): string {
  if (advantage === side) {
    return 'text-green-400 font-semibold';
  }
  return 'text-zinc-300';
}

/**
 * Renders a supplementary text indicator for the leading side.
 * Uses an arrow "▲" so color-blind users can perceive advantage without color alone.
 * Returns null for tie state or the non-leading side.
 */
function AdvantageIndicator({ advantage, side }: { advantage: Advantage; side: 'left' | 'right' }) {
  if (advantage !== side) {
    return null;
  }

  return (
    <span className="text-green-400 text-xs ml-1" aria-hidden="true">
      ▲
    </span>
  );
}

/**
 * A single stat row within the Rivalry View that displays one metric
 * for both operators with advantage highlighting and accessibility support.
 */
export function RivalryStatCard({ result, leftOperatorName, rightOperatorName }: RivalryStatCardProps) {
  const { label, leftDisplay, rightDisplay, advantage } = result;

  const ariaLabel = buildAriaLabel(result, leftOperatorName, rightOperatorName);

  return (
    <div
      className="flex items-center justify-between py-2 px-3 rounded-md bg-zinc-800/50"
      role="group"
      aria-label={ariaLabel}
    >
      {/* Left value */}
      <div className="flex items-center min-w-[80px]">
        <span className={`text-sm ${getValueClasses(advantage, 'left')}`}>
          {leftDisplay}
        </span>
        <AdvantageIndicator advantage={advantage} side="left" />
      </div>

      {/* Stat label (center) */}
      <div className="flex-1 text-center">
        <span className="text-xs text-zinc-400 uppercase tracking-wide">
          {label}
        </span>
      </div>

      {/* Right value */}
      <div className="flex items-center justify-end min-w-[80px]">
        <AdvantageIndicator advantage={advantage} side="right" />
        <span className={`text-sm ${getValueClasses(advantage, 'right')}`}>
          {rightDisplay}
        </span>
      </div>
    </div>
  );
}
