import React from 'react';
import { describe, it, expect } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import { MonthlyActivityStrip } from '@/components/dashboard/MonthlyActivityStrip';
import type { MonthlyActivity } from '@/lib/actions/spotlight';

const defaultActivity: MonthlyActivity = {
  submitted: 12,
  inReview: 4,
  approved: 2,
  monthLabel: 'May 2026',
};

describe('MonthlyActivityStrip', () => {
  it('should render the month label', () => {
    render(<MonthlyActivityStrip activity={defaultActivity} />);

    expect(screen.getByText(/may 2026/i)).toBeInTheDocument();
  });

  it('should render the submitted count', () => {
    render(<MonthlyActivityStrip activity={defaultActivity} />);

    expect(screen.getByText('12')).toBeInTheDocument();
  });

  it('should render the inReview count', () => {
    render(<MonthlyActivityStrip activity={defaultActivity} />);

    expect(screen.getByText('4')).toBeInTheDocument();
  });

  it('should render the approved count', () => {
    render(<MonthlyActivityStrip activity={defaultActivity} />);

    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('should render zero counts as "0" not blank', () => {
    const zeros: MonthlyActivity = { submitted: 0, inReview: 0, approved: 0, monthLabel: 'May 2026' };
    render(<MonthlyActivityStrip activity={zeros} />);

    const zeroCounts = screen.getAllByText('0');
    expect(zeroCounts.length).toBeGreaterThanOrEqual(3);
  });

  it('should render counter labels for each metric', () => {
    render(<MonthlyActivityStrip activity={defaultActivity} />);

    expect(screen.getByText(/submitted/i)).toBeInTheDocument();
    expect(screen.getByText(/in review/i)).toBeInTheDocument();
    expect(screen.getByText(/approved/i)).toBeInTheDocument();
  });
});
