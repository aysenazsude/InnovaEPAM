import React from 'react';
import { render, screen } from '@testing-library/react';
import { AdminIdeaList } from '@/components/admin/AdminIdeaList';
import type { AdminIdeaView } from '@/lib/ideas/anonymize';

jest.mock('next/link', () => {
  const MockLink = ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
  MockLink.displayName = 'MockLink';
  return MockLink;
});

function makeAdminIdeaView(overrides: Partial<AdminIdeaView> = {}): AdminIdeaView {
  return {
    id: 'idea-test-001',
    numericId: 1001,
    title: 'Test Idea Title',
    description: 'A detailed description.',
    category: 'technical_innovation',
    status: 'submitted',
    submittedAt: Math.floor(new Date('2024-01-15').getTime() / 1000),
    adminComment: null,
    evaluatingAdminId: null,
    evaluatedAt: null,
    activeClarificationId: null,
    attachments: [],
    categoryData: null,
    ...overrides,
  };
}

describe('AdminIdeaList', () => {
  it('should render idea titles in the list', () => {
    const ideas = [
      makeAdminIdeaView({ id: 'i1', title: 'First Idea' }),
      makeAdminIdeaView({ id: 'i2', title: 'Second Idea' }),
    ];
    render(<AdminIdeaList ideas={ideas} />);
    expect(screen.getByText('First Idea')).toBeInTheDocument();
    expect(screen.getByText('Second Idea')).toBeInTheDocument();
  });

  it('should show "No ideas in this category." when ideas list is empty', () => {
    render(<AdminIdeaList ideas={[]} />);
    expect(screen.getByText(/no ideas in this category/i)).toBeInTheDocument();
  });

  it('should render the idea status badge', () => {
    const ideas = [makeAdminIdeaView({ status: 'under_review' })];
    render(<AdminIdeaList ideas={ideas} />);
    expect(screen.getByText('under review')).toBeInTheDocument();
  });

  it('should NOT render any submitter user ID or personal identifier', () => {
    // The fixture deliberately does not include submitterId.
    // This test confirms the component renders cleanly from AdminIdeaView
    // (which has no submitterId field) — a compile-time + runtime guarantee.
    const ideas = [makeAdminIdeaView({ id: 'no-submitter-leak', title: 'Anonymous Idea' })];
    const { container } = render(<AdminIdeaList ideas={ideas} />);
    // No real user UUID should appear in the rendered output
    expect(container.innerHTML).not.toContain('user-secret-uuid');
    expect(container.innerHTML).not.toContain('submitterId');
    expect(container.innerHTML).not.toContain('submitter_id');
  });

  it('should link pipeline ideas to their review page', () => {
    const ideas = [makeAdminIdeaView({ id: 'pipeline-001', status: 'screening' })];
    render(<AdminIdeaList ideas={ideas} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/admin/ideas/pipeline-001/review');
  });

  it('should link non-pipeline ideas to their detail page', () => {
    const ideas = [makeAdminIdeaView({ id: 'phase1-001', status: 'submitted' })];
    render(<AdminIdeaList ideas={ideas} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/admin/ideas/phase1-001');
  });

  it('should display the aggregate score badge when aggregateScore is present', () => {
    const ideas = [makeAdminIdeaView({ id: 'scored-001', aggregateScore: 4.2 })];
    render(<AdminIdeaList ideas={ideas} />);
    expect(screen.getByText(/4\.2/)).toBeInTheDocument();
  });

  it('should not display a score badge when aggregateScore is absent', () => {
    const ideas = [makeAdminIdeaView({ id: 'unscored-001' })];
    render(<AdminIdeaList ideas={ideas} />);
    expect(screen.queryByText(/★/)).not.toBeInTheDocument();
  });
});
