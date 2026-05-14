import React from 'react';
import { describe, it, expect } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import { RecentlyApprovedFeed } from '@/components/dashboard/RecentlyApprovedFeed';
import type { RecentlyApprovedIdea } from '@/lib/actions/spotlight';

const makeIdea = (i: number): RecentlyApprovedIdea => ({
  id: `idea-${i}`,
  title: `Approved Idea ${i}`,
  category: 'technical_innovation',
  evaluatedAt: Math.floor(new Date('2026-05-10').getTime() / 1000) + i,
});

describe('RecentlyApprovedFeed', () => {
  it('should render empty state when no ideas are provided', () => {
    render(<RecentlyApprovedFeed ideas={[]} hasMore={false} />);

    expect(screen.getByText(/the first approved idea will appear here/i)).toBeInTheDocument();
  });

  it('should render all provided ideas (up to 5)', () => {
    const ideas = [1, 2, 3].map(makeIdea);
    render(<RecentlyApprovedFeed ideas={ideas} hasMore={false} />);

    expect(screen.getByText('Approved Idea 1')).toBeInTheDocument();
    expect(screen.getByText('Approved Idea 2')).toBeInTheDocument();
    expect(screen.getByText('Approved Idea 3')).toBeInTheDocument();
  });

  it('should render category for each idea', () => {
    const ideas = [makeIdea(1)];
    render(<RecentlyApprovedFeed ideas={ideas} hasMore={false} />);

    expect(screen.getByText(/technical_innovation/i)).toBeInTheDocument();
  });

  it('should render a formatted approval date for each idea', () => {
    const ideas = [makeIdea(1)];
    render(<RecentlyApprovedFeed ideas={ideas} hasMore={false} />);

    // Date should contain "May" (approval date is May 10, 2026)
    expect(screen.getByText(/may/i)).toBeInTheDocument();
  });

  it('should show "View all approved ideas" link when hasMore is true', () => {
    const ideas = [1, 2, 3, 4, 5].map(makeIdea);
    render(<RecentlyApprovedFeed ideas={ideas} hasMore={true} />);

    expect(screen.getByRole('link', { name: /view all approved ideas/i })).toBeInTheDocument();
  });

  it('should NOT show "View all" link when hasMore is false', () => {
    const ideas = [makeIdea(1)];
    render(<RecentlyApprovedFeed ideas={ideas} hasMore={false} />);

    expect(screen.queryByRole('link', { name: /view all/i })).not.toBeInTheDocument();
  });

  it('should link each idea title to its detail page', () => {
    const ideas = [makeIdea(7)];
    render(<RecentlyApprovedFeed ideas={ideas} hasMore={false} />);

    const link = screen.getByRole('link', { name: /approved idea 7/i });
    expect(link).toHaveAttribute('href', '/ideas/idea-7');
  });
});
