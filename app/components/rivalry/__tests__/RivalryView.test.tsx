import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RivalryView } from '../RivalryView';
import type { Operator } from '../../../data/types';
import type { UseRivalryReturn } from '../../../hooks/useRivalry';
import type { ComparisonResult } from '../../../lib/comparison-engine';

// Mock useRivalry hook
const mockUseRivalry = vi.fn<() => UseRivalryReturn>();
vi.mock('../../../hooks/useRivalry', () => ({
  useRivalry: (...args: unknown[]) => mockUseRivalry(...(args as [])),
}));

// Mock child components with complex dependencies
vi.mock('../../OperatorPickerModal', () => ({
  OperatorPickerModal: ({ isOpen, onClose, onSelect }: { isOpen: boolean; onClose: () => void; onSelect: (op: Operator) => void }) =>
    isOpen ? <div data-testid="operator-picker-modal"><button onClick={onClose}>Close Picker</button></div> : null,
}));

vi.mock('../../OperatorIcon', () => ({
  OperatorIcon: ({ id }: { id: string }) => <span data-testid={`operator-icon-${id}`} />,
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Share2: (props: React.SVGProps<SVGSVGElement>) => <svg data-testid="share-icon" {...props} />,
  X: (props: React.SVGProps<SVGSVGElement>) => <svg data-testid="x-icon" {...props} />,
  Plus: (props: React.SVGProps<SVGSVGElement>) => <svg data-testid="plus-icon" {...props} />,
}));

const mockOperatorLeft: Operator = {
  id: 'ash',
  name: 'Ash',
  side: 'attacker',
  primaries: ['R4-C', 'G36C'],
  secondaries: ['5.7 USG', 'M45 MEUSOC'],
  gadgets: ['Breach Charge', 'Claymore'],
  roles: ['Entry Fragger'],
};

const mockOperatorRight: Operator = {
  id: 'vigil',
  name: 'Vigil',
  side: 'defender',
  primaries: ['K1A'],
  secondaries: ['C75 Auto', 'SMG-12'],
  gadgets: ['Impact Grenade', 'Bulletproof Camera'],
  roles: ['Roamer'],
};

const mockComparison: ComparisonResult = {
  statCards: [
    {
      metric: 'kills' as never,
      label: 'Kills',
      leftValue: 50,
      rightValue: 30,
      leftDisplay: '50',
      rightDisplay: '30',
      advantage: 'left',
    },
    {
      metric: 'deaths' as never,
      label: 'Deaths',
      leftValue: 20,
      rightValue: 25,
      leftDisplay: '20',
      rightDisplay: '25',
      advantage: 'left',
    },
  ],
  verdict: {
    type: 'left-leads',
    leftWins: 4,
    rightWins: 2,
    message: 'Ash leads 4-2',
  },
};

function createDefaultMockReturn(overrides: Partial<UseRivalryReturn> = {}): UseRivalryReturn {
  return {
    leftOperator: null,
    rightOperator: null,
    setLeftOperator: vi.fn(),
    setRightOperator: vi.fn(),
    comparison: null,
    validationError: null,
    isExporting: false,
    exportImage: vi.fn().mockResolvedValue(undefined),
    comparisonRef: { current: null },
    ...overrides,
  };
}

describe('RivalryView', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseRivalry.mockReturnValue(createDefaultMockReturn());
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('initial render with empty slots', () => {
    /**
     * Validates: Requirements 1.1
     */
    it('renders the dialog with proper ARIA attributes when isOpen is true', () => {
      render(<RivalryView isOpen={true} onClose={mockOnClose} />);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-label', 'Operator Rivalry Comparison');
    });

    it('renders both operator slots with "Select" prompts when no operators chosen', () => {
      render(<RivalryView isOpen={true} onClose={mockOnClose} />);

      const selectButtons = screen.getAllByText('Select');
      expect(selectButtons.length).toBe(2);
    });

    it('renders the VS divider between slots', () => {
      render(<RivalryView isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText('VS')).toBeInTheDocument();
    });
  });

  describe('returns null when closed', () => {
    it('renders nothing when isOpen is false', () => {
      const { container } = render(<RivalryView isOpen={false} onClose={mockOnClose} />);

      expect(container.innerHTML).toBe('');
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('same-operator validation message', () => {
    /**
     * Validates: Requirements 1.4
     */
    it('displays validation error with role="alert" when validationError is set', () => {
      mockUseRivalry.mockReturnValue(
        createDefaultMockReturn({
          leftOperator: mockOperatorLeft,
          rightOperator: { ...mockOperatorLeft },
          validationError: 'Select two different operators to compare',
        })
      );

      render(<RivalryView isOpen={true} onClose={mockOnClose} />);

      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveTextContent('Select two different operators to compare');
    });

    it('does not display validation message when validationError is null', () => {
      mockUseRivalry.mockReturnValue(createDefaultMockReturn({ validationError: null }));

      render(<RivalryView isOpen={true} onClose={mockOnClose} />);

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  describe('export button visibility', () => {
    /**
     * Validates: Requirements 4.1
     */
    it('shows share button when comparison is available', () => {
      mockUseRivalry.mockReturnValue(
        createDefaultMockReturn({
          leftOperator: mockOperatorLeft,
          rightOperator: mockOperatorRight,
          comparison: mockComparison,
        })
      );

      render(<RivalryView isOpen={true} onClose={mockOnClose} />);

      const shareButton = screen.getByLabelText('Share rivalry comparison as image');
      expect(shareButton).toBeInTheDocument();
    });

    it('does not show share button when comparison is null', () => {
      mockUseRivalry.mockReturnValue(
        createDefaultMockReturn({
          leftOperator: mockOperatorLeft,
          rightOperator: null,
          comparison: null,
        })
      );

      render(<RivalryView isOpen={true} onClose={mockOnClose} />);

      expect(screen.queryByLabelText('Share rivalry comparison as image')).not.toBeInTheDocument();
    });
  });

  describe('export error handling', () => {
    /**
     * Validates: Requirements 4.5
     */
    it('shows error toast when exportImage throws', async () => {
      const mockExportImage = vi.fn().mockRejectedValue(new Error('Canvas error'));
      mockUseRivalry.mockReturnValue(
        createDefaultMockReturn({
          leftOperator: mockOperatorLeft,
          rightOperator: mockOperatorRight,
          comparison: mockComparison,
          exportImage: mockExportImage,
        })
      );

      render(<RivalryView isOpen={true} onClose={mockOnClose} />);

      const shareButton = screen.getByLabelText('Share rivalry comparison as image');
      fireEvent.click(shareButton);

      await waitFor(() => {
        const alert = screen.getByRole('alert');
        expect(alert).toHaveTextContent('Export failed. Please try again.');
      });
    });

    it('auto-dismisses the error toast after 4 seconds', async () => {
      vi.useFakeTimers();
      const mockExportImage = vi.fn().mockRejectedValue(new Error('Canvas error'));
      mockUseRivalry.mockReturnValue(
        createDefaultMockReturn({
          leftOperator: mockOperatorLeft,
          rightOperator: mockOperatorRight,
          comparison: mockComparison,
          exportImage: mockExportImage,
        })
      );

      render(<RivalryView isOpen={true} onClose={mockOnClose} />);

      const shareButton = screen.getByLabelText('Share rivalry comparison as image');

      await act(async () => {
        fireEvent.click(shareButton);
        // Let the rejected promise resolve
        await Promise.resolve();
      });

      // Toast should be visible
      expect(screen.getByRole('alert')).toBeInTheDocument();

      // Advance time by 4 seconds
      act(() => {
        vi.advanceTimersByTime(4000);
      });

      // Toast should be dismissed
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  describe('keyboard navigation', () => {
    /**
     * Validates: Requirements 6.1
     */
    it('closes the modal when Escape key is pressed', () => {
      render(<RivalryView isOpen={true} onClose={mockOnClose} />);

      fireEvent.keyDown(document, { key: 'Escape' });

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('does not call onClose for non-Escape keys', () => {
      render(<RivalryView isOpen={true} onClose={mockOnClose} />);

      fireEvent.keyDown(document, { key: 'Enter' });

      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('focus trap behavior', () => {
    /**
     * Validates: Requirements 6.3
     */
    it('wraps focus from last to first element on Tab', () => {
      mockUseRivalry.mockReturnValue(
        createDefaultMockReturn({
          leftOperator: mockOperatorLeft,
          rightOperator: mockOperatorRight,
          comparison: mockComparison,
        })
      );

      render(<RivalryView isOpen={true} onClose={mockOnClose} />);

      const dialog = screen.getByRole('dialog');
      const focusableElements = dialog.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );

      expect(focusableElements.length).toBeGreaterThan(0);

      const lastElement = focusableElements[focusableElements.length - 1];
      lastElement.focus();

      fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: false });

      expect(document.activeElement).toBe(focusableElements[0]);
    });

    it('wraps focus from first to last element on Shift+Tab', () => {
      mockUseRivalry.mockReturnValue(
        createDefaultMockReturn({
          leftOperator: mockOperatorLeft,
          rightOperator: mockOperatorRight,
          comparison: mockComparison,
        })
      );

      render(<RivalryView isOpen={true} onClose={mockOnClose} />);

      const dialog = screen.getByRole('dialog');
      const focusableElements = dialog.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );

      expect(focusableElements.length).toBeGreaterThan(0);

      const firstElement = focusableElements[0];
      firstElement.focus();

      fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true });

      expect(document.activeElement).toBe(focusableElements[focusableElements.length - 1]);
    });
  });

  describe('pre-filled operator flow', () => {
    /**
     * Validates: Requirements 5.2, 5.3
     */
    it('passes prefilledOperator to useRivalry hook', () => {
      render(
        <RivalryView isOpen={true} onClose={mockOnClose} prefilledOperator={mockOperatorLeft} />
      );

      expect(mockUseRivalry).toHaveBeenCalledWith(mockOperatorLeft);
    });

    it('passes undefined when no prefilledOperator is provided', () => {
      render(<RivalryView isOpen={true} onClose={mockOnClose} />);

      expect(mockUseRivalry).toHaveBeenCalledWith(undefined);
    });
  });

  describe('ARIA roles and labels', () => {
    /**
     * Validates: Requirements 6.1, 6.2, 6.3
     */
    it('has role="dialog" with aria-modal="true"', () => {
      render(<RivalryView isOpen={true} onClose={mockOnClose} />);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
    });

    it('has aria-label="Operator Rivalry Comparison"', () => {
      render(<RivalryView isOpen={true} onClose={mockOnClose} />);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-label', 'Operator Rivalry Comparison');
    });

    it('close button has aria-label="Close rivalry view"', () => {
      render(<RivalryView isOpen={true} onClose={mockOnClose} />);

      const closeButton = screen.getByLabelText('Close rivalry view');
      expect(closeButton).toBeInTheDocument();
    });

    it('share button has aria-label="Share rivalry comparison as image"', () => {
      mockUseRivalry.mockReturnValue(
        createDefaultMockReturn({
          leftOperator: mockOperatorLeft,
          rightOperator: mockOperatorRight,
          comparison: mockComparison,
        })
      );

      render(<RivalryView isOpen={true} onClose={mockOnClose} />);

      const shareButton = screen.getByLabelText('Share rivalry comparison as image');
      expect(shareButton).toBeInTheDocument();
    });
  });

  describe('verdict display', () => {
    it('displays the verdict message when comparison has a verdict', () => {
      mockUseRivalry.mockReturnValue(
        createDefaultMockReturn({
          leftOperator: mockOperatorLeft,
          rightOperator: mockOperatorRight,
          comparison: mockComparison,
        })
      );

      render(<RivalryView isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText('Ash leads 4-2')).toBeInTheDocument();
    });

    it('does not display a verdict when comparison is null', () => {
      mockUseRivalry.mockReturnValue(createDefaultMockReturn({ comparison: null }));

      render(<RivalryView isOpen={true} onClose={mockOnClose} />);

      expect(screen.queryByText('Ash leads 4-2')).not.toBeInTheDocument();
    });
  });

  describe('XA Wars RNG watermark', () => {
    it('renders the XA Wars RNG watermark in the exportable area', () => {
      mockUseRivalry.mockReturnValue(
        createDefaultMockReturn({
          leftOperator: mockOperatorLeft,
          rightOperator: mockOperatorRight,
          comparison: mockComparison,
        })
      );

      render(<RivalryView isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText('XA Wars RNG')).toBeInTheDocument();
    });
  });
});
