import React from 'react';
import { describe, it, expect, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import { SpotlightCard } from '@/components/dashboard/SpotlightCard';
import type { SpotlightIdea } from '@/lib/actions/spotlight';

jest.mock('@/lib/actions/spotlight', () => ({
  pinEditorsPick: jest.fn(),
  unpinEditorsPick: jest.fn(),
}));

const baseSpotlight: SpotlightIdea = {
  id: 'idea-123',
  title: 'Revolutionary AI Solution',
  authorName: 'Jane Smith',
  category: 'technical_innovation',
  compositeScore: 4.5,
  submittedAt: Math.floor(new Date('2026-05-10').getTime() / 1000),
  label: 'Top Rated',
};

describe('SpotlightCard', () => {
  it('should render empty state when spotlight is null', () => {
    render(<SpotlightCard spotlight={null} isAdmin={false} currentPickIdeaId={null} />);

    expect(screen.getByText(/no spotlight yet this month/i)).toBeInTheDocument();
  });

  it('should render idea title when spotlight is provided', () => {
    render(<SpotlightCard spotlight={baseSpotlight} isAdmin={false} currentPickIdeaId={null} />);

    expect(screen.getByText('Revolutionary AI Solution')).toBeInTheDocument();
  });

  it('should render author name and category', () => {
    render(<SpotlightCard spotlight={baseSpotlight} isAdmin={false} currentPickIdeaId={null} />);

    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText(/technical_innovation/i)).toBeInTheDocument();
  });

  it('should render score as "X.X / 5" when compositeScore is provided', () => {
    render(<SpotlightCard spotlight={baseSpotlight} isAdmin={false} currentPickIdeaId={null} />);

    expect(screen.getByText(/4\.5\s*\/\s*5/)).toBeInTheDocument();
  });

  it('should render "Score Pending" when compositeScore is null', () => {
    const pending: SpotlightIdea = { ...baseSpotlight, compositeScore: null, label: 'Score Pending' };
    render(<SpotlightCard spotlight={pending} isAdmin={false} currentPickIdeaId={null} />);

    expect(screen.getByText(/score pending/i)).toBeInTheDocument();
  });

  it('should render "Top Rated" label badge', () => {
    render(<SpotlightCard spotlight={baseSpotlight} isAdmin={false} currentPickIdeaId={null} />);

    expect(screen.getByText(/top rated/i)).toBeInTheDocument();
  });

  it("should render \"Editor's Pick\" badge when label is Editor's Pick", () => {
    const editorPick: SpotlightIdea = { ...baseSpotlight, label: "Editor's Pick" };
    render(<SpotlightCard spotlight={editorPick} isAdmin={false} currentPickIdeaId={null} />);

    expect(screen.getByText(/editor's pick/i)).toBeInTheDocument();
  });

  it('should link the card to the idea detail page', () => {
    render(<SpotlightCard spotlight={baseSpotlight} isAdmin={false} currentPickIdeaId={null} />);

    const link = screen.getByRole('link', { name: /revolutionary ai solution/i });
    expect(link).toHaveAttribute('href', '/ideas/idea-123');
  });

  it('should NOT show pin button when isAdmin is false', () => {
    render(<SpotlightCard spotlight={baseSpotlight} isAdmin={false} currentPickIdeaId={null} />);

    expect(screen.queryByRole('button', { name: /pin|editor/i })).not.toBeInTheDocument();
  });

  it('should show pin button when isAdmin is true and idea is not pinned', () => {
    render(<SpotlightCard spotlight={baseSpotlight} isAdmin={true} currentPickIdeaId={null} />);

    expect(screen.getByRole('button', { name: /pin/i })).toBeInTheDocument();
  });

  it('should show unpin button when isAdmin is true and this idea is the current pick', () => {
    render(<SpotlightCard spotlight={baseSpotlight} isAdmin={true} currentPickIdeaId="idea-123" />);

    expect(screen.getByRole('button', { name: /unpin/i })).toBeInTheDocument();
  });
});
