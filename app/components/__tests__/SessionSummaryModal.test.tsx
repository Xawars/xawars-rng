import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SessionSummaryModal } from '../SessionSummaryModal';
import type { SessionDeltaData } from '../../types/database';

function buildNormalSession(): SessionDeltaData {
  return {
    kills: 10,
    deaths: 3,
    kdRatio: 3.33,
    isPerfect: false,
    isEmpty: false,
    operators: [
      { operatorId: 'ash', operatorName: 'Ash', kills: 6, deaths: 1 },
      { operatorId: 'thermite', operatorName: 'Thermite', kills: 4, deaths: 2 },
    ],
    bestMap: { mapId: 'bank', mapName: 'Bank', kd: 4.5 },
    mapWinLossSummary: null,
  };
}

function buildPerfectSession(): SessionDeltaData {
  return {
    kills: 5,
    deaths: 0,
    kdRatio: 5,
    isPerfect: true,
    isEmpty: false,
    operators: [
      { operatorId: 'ash', operatorName: 'Ash', kills: 5, deaths: 0 },
    ],
    bestMap: null,
    mapWinLossSummary: null,
  };
}

function buildEmptySession(): SessionDeltaData {
  return {
    kills: 0,
    deaths: 0,
    kdRatio: null,
    isPerfect: false,
    isEmpty: true,
    operators: [],
    bestMap: null,
    mapWinLossSummary: null,
  };
}

describe('SessionSummaryModal', () => {
  /**
   * Validates: Requirements 4.1, 4.2
   * Modal displays kills, deaths, and K/D ratio when open
   */
  it('displays kills, deaths, and K/D ratio', () => {
    const onClose = vi.fn();
    render(
      <SessionSummaryModal isOpen={true} onClose={onClose} sessionData={buildNormalSession()} />
    );

    expect(screen.getByText('Kills')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('Deaths')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('K/D')).toBeInTheDocument();
    expect(screen.getByText('3.33')).toBeInTheDocument();
  });

  /**
   * Validates: Requirement 4.3
   * "Perfect" label shown when isPerfect is true (kills > 0, deaths = 0)
   */
  it('shows "Perfect" label when isPerfect is true', () => {
    const onClose = vi.fn();
    render(
      <SessionSummaryModal isOpen={true} onClose={onClose} sessionData={buildPerfectSession()} />
    );

    expect(screen.getByText(/Perfect/)).toBeInTheDocument();
    // Should not show a numeric K/D ratio
    expect(screen.queryByText('5.00')).not.toBeInTheDocument();
  });

  /**
   * Validates: Requirement 4.4
   * Empty session message shown when isEmpty is true
   */
  it('shows empty session message when isEmpty is true', () => {
    const onClose = vi.fn();
    render(
      <SessionSummaryModal isOpen={true} onClose={onClose} sessionData={buildEmptySession()} />
    );

    expect(screen.getByText('No matches recorded this session')).toBeInTheDocument();
    // Should not show operator list or K/D
    expect(screen.queryByText('Operators')).not.toBeInTheDocument();
    expect(screen.queryByText('K/D')).not.toBeInTheDocument();
  });

  /**
   * Validates: Requirement 4.2
   * Operator list sorted by kills descending then name ascending
   */
  it('shows operator list sorted by kills desc then name asc', () => {
    const sessionData: SessionDeltaData = {
      kills: 15,
      deaths: 5,
      kdRatio: 3,
      isPerfect: false,
      isEmpty: false,
      operators: [
        { operatorId: 'ash', operatorName: 'Ash', kills: 5, deaths: 1 },
        { operatorId: 'thermite', operatorName: 'Thermite', kills: 5, deaths: 2 },
        { operatorId: 'zofia', operatorName: 'Zofia', kills: 3, deaths: 1 },
        { operatorId: 'buck', operatorName: 'Buck', kills: 2, deaths: 1 },
      ],
      bestMap: null,
      mapWinLossSummary: null,
    };

    const onClose = vi.fn();
    render(
      <SessionSummaryModal isOpen={true} onClose={onClose} sessionData={sessionData} />
    );

    const operatorNames = screen.getAllByText(/Ash|Thermite|Zofia|Buck/).map(el => el.textContent);
    // Ash and Thermite tie at 5 kills — sorted by name asc, then Zofia (3), Buck (2)
    expect(operatorNames).toEqual(['Ash', 'Thermite', 'Zofia', 'Buck']);
  });

  /**
   * Validates: Requirement 4.5
   * Best map section shown when bestMap is not null
   */
  it('shows best map section when bestMap is not null', () => {
    const onClose = vi.fn();
    render(
      <SessionSummaryModal isOpen={true} onClose={onClose} sessionData={buildNormalSession()} />
    );

    expect(screen.getByText('Best Map')).toBeInTheDocument();
    expect(screen.getByText('Bank')).toBeInTheDocument();
    expect(screen.getByText('4.50 K/D')).toBeInTheDocument();
  });

  /**
   * Validates: Requirement 4.5
   * Best map section NOT shown when bestMap is null
   */
  it('does not show best map section when bestMap is null', () => {
    const onClose = vi.fn();
    render(
      <SessionSummaryModal isOpen={true} onClose={onClose} sessionData={buildPerfectSession()} />
    );

    expect(screen.queryByText('Best Map')).not.toBeInTheDocument();
  });

  /**
   * Validates: Requirement 4.6
   * Close button calls onClose
   */
  it('calls onClose when Close button is clicked', () => {
    const onClose = vi.fn();
    render(
      <SessionSummaryModal isOpen={true} onClose={onClose} sessionData={buildNormalSession()} />
    );

    // Use the footer "Close" button (exact text match)
    const closeButton = screen.getByRole('button', { name: 'Close' });
    fireEvent.click(closeButton);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  /**
   * Validates: Requirement 4.1
   * Modal does not render when isOpen is false
   */
  it('does not render when isOpen is false', () => {
    const onClose = vi.fn();
    render(
      <SessionSummaryModal isOpen={false} onClose={onClose} sessionData={buildNormalSession()} />
    );

    expect(screen.queryByText('Session Summary')).not.toBeInTheDocument();
  });

  /**
   * Validates: Requirement 4.5
   * Map win/loss summary section shown when mapWinLossSummary is not null
   */
  it('shows map win/loss summary when wins or losses recorded during session', () => {
    const sessionData: SessionDeltaData = {
      ...buildNormalSession(),
      mapWinLossSummary: { wins: 3, losses: 2 },
    };
    const onClose = vi.fn();
    render(
      <SessionSummaryModal isOpen={true} onClose={onClose} sessionData={sessionData} />
    );

    expect(screen.getByText('Map Results')).toBeInTheDocument();
    expect(screen.getByText('3W')).toBeInTheDocument();
    expect(screen.getByText('2L')).toBeInTheDocument();
  });

  /**
   * Validates: Requirement 4.5
   * Map win/loss summary section NOT shown when mapWinLossSummary is null
   */
  it('does not show map win/loss summary when no wins or losses recorded', () => {
    const onClose = vi.fn();
    render(
      <SessionSummaryModal isOpen={true} onClose={onClose} sessionData={buildNormalSession()} />
    );

    expect(screen.queryByText('Map Results')).not.toBeInTheDocument();
  });
});
