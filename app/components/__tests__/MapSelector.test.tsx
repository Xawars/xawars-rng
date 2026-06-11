import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MapSelector } from '../MapSelector';
import { getActiveMaps } from '../../lib/map-performance';
import { MAPS } from '../../data/maps';

vi.mock('../../lib/map-performance', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/map-performance')>();
  return {
    ...actual,
    getActiveMaps: vi.fn(actual.getActiveMaps),
  };
});

const mockedGetActiveMaps = vi.mocked(getActiveMaps);

describe('MapSelector', () => {
  it('defaults to placeholder option when no map is selected', () => {
    render(<MapSelector selectedMapId={null} onMapChange={vi.fn()} />);

    const select = screen.getByRole('combobox', { name: 'Map selector' });
    expect(select).toHaveValue('');
    expect(screen.getByText('No map selected')).toBeInTheDocument();
  });

  it('is hidden when no active maps exist', () => {
    mockedGetActiveMaps.mockReturnValueOnce([]);

    const { container } = render(
      <MapSelector selectedMapId={null} onMapChange={vi.fn()} />
    );

    expect(container.innerHTML).toBe('');
  });

  it('displays only active maps in alphabetical order', () => {
    render(<MapSelector selectedMapId={null} onMapChange={vi.fn()} />);

    const options = screen.getAllByRole('option');
    // First option is the placeholder
    const mapOptions = options.slice(1);

    const activeMaps = getActiveMaps(MAPS);

    // Count matches the number of active maps
    expect(mapOptions).toHaveLength(activeMaps.length);

    // Options are in alphabetical order
    const optionTexts = mapOptions.map((opt) => opt.textContent);
    const sorted = [...optionTexts].sort((a, b) =>
      (a ?? '').localeCompare(b ?? '')
    );
    expect(optionTexts).toEqual(sorted);
  });
});
