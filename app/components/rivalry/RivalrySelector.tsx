'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { OperatorIcon } from '../OperatorIcon';
import { OperatorPickerModal } from '../OperatorPickerModal';
import type { Operator } from '../../data/types';

interface RivalrySelectorProps {
  leftOperator: Operator | null;
  rightOperator: Operator | null;
  onSelectLeft: (op: Operator) => void;
  onSelectRight: (op: Operator) => void;
  validationError: string | null;
}

type ActiveSlot = 'left' | 'right' | null;

export function RivalrySelector({
  leftOperator,
  rightOperator,
  onSelectLeft,
  onSelectRight,
  validationError,
}: RivalrySelectorProps) {
  const [activeSlot, setActiveSlot] = useState<ActiveSlot>(null);

  function handleSlotClick(slot: 'left' | 'right') {
    setActiveSlot(slot);
  }

  function handleSlotKeyDown(e: React.KeyboardEvent, slot: 'left' | 'right') {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setActiveSlot(slot);
    }
  }

  function handleSelect(operator: Operator) {
    if (activeSlot === 'left') {
      onSelectLeft(operator);
    } else if (activeSlot === 'right') {
      onSelectRight(operator);
    }
    setActiveSlot(null);
  }

  function handleClose() {
    setActiveSlot(null);
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center gap-4 w-full justify-center">
        {/* Left Slot */}
        <OperatorSlot
          operator={leftOperator}
          label="Select left operator"
          onClick={() => handleSlotClick('left')}
          onKeyDown={(e) => handleSlotKeyDown(e, 'left')}
        />

        {/* VS divider */}
        <span className="text-zinc-500 text-sm font-bold uppercase tracking-wider">
          VS
        </span>

        {/* Right Slot */}
        <OperatorSlot
          operator={rightOperator}
          label="Select right operator"
          onClick={() => handleSlotClick('right')}
          onKeyDown={(e) => handleSlotKeyDown(e, 'right')}
        />
      </div>

      {/* Validation error */}
      {validationError && (
        <p className="text-red-400 text-sm" role="alert">
          {validationError}
        </p>
      )}

      {/* Operator Picker Modal */}
      <OperatorPickerModal
        isOpen={activeSlot !== null}
        onClose={handleClose}
        onSelect={handleSelect}
        currentSide={null}
      />
    </div>
  );
}

interface OperatorSlotProps {
  operator: Operator | null;
  label: string;
  onClick: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
}

function OperatorSlot({ operator, label, onClick, onKeyDown }: OperatorSlotProps) {
  return (
    <button
      type="button"
      role="button"
      aria-label={operator ? `${operator.name} selected, tap to change` : label}
      onClick={onClick}
      onKeyDown={onKeyDown}
      className="flex flex-col items-center justify-center gap-2 w-32 h-32 rounded-xl border border-zinc-700 bg-zinc-800/50 hover:border-zinc-500 hover:bg-zinc-800 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-yellow-500/50"
    >
      {operator ? (
        <>
          <OperatorIcon id={operator.id} className="w-12 h-12" />
          <span className="text-white text-xs font-bold uppercase tracking-wide text-center px-1 truncate max-w-[110px]">
            {operator.name}
          </span>
        </>
      ) : (
        <>
          <Plus className="w-8 h-8 text-zinc-500" />
          <span className="text-zinc-400 text-[10px] font-medium uppercase tracking-wider">
            Select
          </span>
        </>
      )}
    </button>
  );
}
