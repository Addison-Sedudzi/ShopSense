import type { RestockRecommendation } from '@shopsense/shared';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RestockPanel } from './restock-panel';

const useRestockRecommendationsMock = vi.fn();
vi.mock('./use-intelligence', () => ({
  useRestockRecommendations: () => useRestockRecommendationsMock(),
}));

// The component keys its localStorage record off the real current date
// (there's no injectable clock), so tests read it back the same way rather
// than mocking `Date` -- faking the system clock alongside userEvent's own
// internal timers turned out to make clicks hang indefinitely.
const today = new Date().toISOString().slice(0, 10);
const storageKey = `shopsense.restock-decisions.${today}`;

function recommendation(overrides: Partial<RestockRecommendation> = {}): RestockRecommendation {
  return {
    productId: 'p1',
    productName: 'Milo 400g',
    suggestedQuantity: 12,
    reason: 'Sold out twice this week',
    currentStock: 2,
    reorderThreshold: 10,
    quantitySoldLast4Weeks: 40,
    supplierName: 'Kasapreko Distributors',
    supplierLeadTimeDays: 3,
    ...overrides,
  };
}

beforeEach(() => {
  localStorage.clear();
});

describe('RestockPanel', () => {
  it('shows a loading message while fetching', () => {
    useRestockRecommendationsMock.mockReturnValue({ isLoading: true, isError: false, data: undefined });
    render(<RestockPanel />);
    expect(screen.getByText('Checking stock levels…')).toBeInTheDocument();
  });

  it('falls back to a plain message when the AI call fails', () => {
    useRestockRecommendationsMock.mockReturnValue({ isLoading: false, isError: true, data: undefined });
    render(<RestockPanel />);
    expect(screen.getByText(/available right now/)).toBeInTheDocument();
  });

  it('shows an empty state when there are no recommendations', () => {
    useRestockRecommendationsMock.mockReturnValue({ isLoading: false, isError: false, data: [] });
    render(<RestockPanel />);
    expect(screen.getByText('No restock suggestions right now.')).toBeInTheDocument();
  });

  it('always shows the underlying verification data alongside the recommendation', () => {
    useRestockRecommendationsMock.mockReturnValue({ isLoading: false, isError: false, data: [recommendation()] });
    render(<RestockPanel />);

    expect(screen.getByText('Milo 400g')).toBeInTheDocument();
    expect(screen.getByText('Suggest ordering 12 units')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument(); // current stock
    expect(screen.getByText('10')).toBeInTheDocument(); // reorder threshold
    expect(screen.getByText('40')).toBeInTheDocument(); // sold last 4 weeks
    expect(screen.getByText(/Kasapreko Distributors/)).toBeInTheDocument();
  });

  it('moves a recommendation to Reviewed on dismiss, and persists the decision to localStorage', async () => {
    useRestockRecommendationsMock.mockReturnValue({ isLoading: false, isError: false, data: [recommendation()] });
    const user = userEvent.setup();
    render(<RestockPanel />);

    await user.click(screen.getByRole('button', { name: 'Dismiss' }));

    expect(screen.getByText('All caught up — no pending suggestions.')).toBeInTheDocument();
    const reviewed = screen.getByText('Reviewed (1)');
    await user.click(reviewed);
    expect(within(reviewed.closest('details')!).getByText('Dismissed')).toBeInTheDocument();

    const stored = JSON.parse(localStorage.getItem(storageKey)!);
    expect(stored).toEqual({ p1: 'dismissed' });
  });

  it('moves a recommendation to Reviewed as Accepted, and undo returns it to pending', async () => {
    useRestockRecommendationsMock.mockReturnValue({ isLoading: false, isError: false, data: [recommendation()] });
    const user = userEvent.setup();
    render(<RestockPanel />);

    await user.click(screen.getByRole('button', { name: 'Accept' }));
    await user.click(screen.getByText('Reviewed (1)'));
    expect(screen.getByText('Accepted')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Undo' }));

    expect(screen.getByText('Suggest ordering 12 units')).toBeInTheDocument();
    expect(screen.queryByText('Reviewed (1)')).not.toBeInTheDocument();
  });

  it('restores a previously-made decision for today from localStorage on mount', () => {
    localStorage.setItem(storageKey, JSON.stringify({ p1: 'accepted' }));
    useRestockRecommendationsMock.mockReturnValue({ isLoading: false, isError: false, data: [recommendation()] });

    render(<RestockPanel />);

    expect(screen.getByText('All caught up — no pending suggestions.')).toBeInTheDocument();
    expect(screen.getByText('Reviewed (1)')).toBeInTheDocument();
  });
});
