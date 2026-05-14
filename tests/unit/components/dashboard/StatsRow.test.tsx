import React from 'react';
import { describe, it, expect } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import { StatsRow } from '@/components/dashboard/StatsRow';
import type { SystemStats } from '@/lib/actions/dashboard';

const defaultStats: SystemStats = {
  totalSubmitted: 45,
  totalApproved: 8,
  totalInPipeline: 5,
};

describe('StatsRow', () => {
  it('should render three stat cards', () => {
    render(<StatsRow stats={defaultStats} />);

    // Each card has a heading — verify three are present
    const cards = screen.getAllByRole('article');
    expect(cards).toHaveLength(3);
  });

  it('should display the totalSubmitted value', () => {
    render(<StatsRow stats={defaultStats} />);
    expect(screen.getByText('45')).toBeInTheDocument();
  });

  it('should display the totalApproved value', () => {
    render(<StatsRow stats={defaultStats} />);
    expect(screen.getByText('8')).toBeInTheDocument();
  });

  it('should display the totalInPipeline value', () => {
    render(<StatsRow stats={defaultStats} />);
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('should render correctly when all values are zero', () => {
    const zeroStats: SystemStats = { totalSubmitted: 0, totalApproved: 0, totalInPipeline: 0 };

    render(<StatsRow stats={zeroStats} />);

    const zeros = screen.getAllByText('0');
    expect(zeros).toHaveLength(3);
  });

  it('should use accessible labels for each card', () => {
    render(<StatsRow stats={defaultStats} />);

    expect(screen.getByText(/total ideas/i)).toBeInTheDocument();
    expect(screen.getByText(/approved/i)).toBeInTheDocument();
    expect(screen.getByText(/pipeline|review/i)).toBeInTheDocument();
  });
});
