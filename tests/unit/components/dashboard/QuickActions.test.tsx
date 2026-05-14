import React from 'react';
import { describe, it, expect } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import { QuickActions } from '@/components/dashboard/QuickActions';

describe('QuickActions', () => {
  it('should render a "Submit New Idea" link', () => {
    render(<QuickActions />);

    const link = screen.getByRole('link', { name: /submit new idea/i });
    expect(link).toBeInTheDocument();
  });

  it('should link "Submit New Idea" to /ideas/new', () => {
    render(<QuickActions />);

    const link = screen.getByRole('link', { name: /submit new idea/i });
    expect(link).toHaveAttribute('href', '/ideas/new');
  });

  it('should render a "View All My Ideas" link', () => {
    render(<QuickActions />);

    const link = screen.getByRole('link', { name: /view all my ideas/i });
    expect(link).toBeInTheDocument();
  });

  it('should link "View All My Ideas" to /ideas', () => {
    render(<QuickActions />);

    const link = screen.getByRole('link', { name: /view all my ideas/i });
    expect(link).toHaveAttribute('href', '/ideas');
  });

  it('should render both links', () => {
    render(<QuickActions />);

    const links = screen.getAllByRole('link');
    expect(links.length).toBeGreaterThanOrEqual(2);
  });
});
