import React from 'react';
import { describe, it, expect } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import { UserStatsPanel } from '@/components/dashboard/UserStatsPanel';
import type { UserStats, LastSubmission } from '@/lib/actions/dashboard';

const defaultUserStats: UserStats = {
  totalSubmitted: 5,
  totalApproved: 2,
  totalPending: 1,
};

const defaultLastSubmission: LastSubmission = {
  id: 'IDEA-0001',
  title: 'My Great Idea',
  status: 'screening',
  submittedAt: 1_700_000_000,
};

describe('UserStatsPanel', () => {
  it('should render personal stat counts', () => {
    render(
      <UserStatsPanel
        userStats={defaultUserStats}
        lastSubmission={defaultLastSubmission}
        userName="Alice"
      />
    );

    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('should render the last submission title', () => {
    render(
      <UserStatsPanel
        userStats={defaultUserStats}
        lastSubmission={defaultLastSubmission}
        userName="Alice"
      />
    );

    expect(screen.getByText('My Great Idea')).toBeInTheDocument();
  });

  it('should render the last submission status label', () => {
    render(
      <UserStatsPanel
        userStats={defaultUserStats}
        lastSubmission={defaultLastSubmission}
        userName="Alice"
      />
    );

    expect(screen.getByText(/screening/i)).toBeInTheDocument();
  });

  it('should render zero-state message when totalSubmitted is 0', () => {
    const emptyStats: UserStats = { totalSubmitted: 0, totalApproved: 0, totalPending: 0 };

    render(
      <UserStatsPanel
        userStats={emptyStats}
        lastSubmission={null}
        userName="Alice"
      />
    );

    expect(screen.getByText(/first idea yet/i)).toBeInTheDocument();
  });

  it('should render a CTA link in the zero state', () => {
    const emptyStats: UserStats = { totalSubmitted: 0, totalApproved: 0, totalPending: 0 };

    render(
      <UserStatsPanel
        userStats={emptyStats}
        lastSubmission={null}
        userName="Alice"
      />
    );

    const link = screen.getByRole('link', { name: /submit/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/ideas/new');
  });

  it('should not crash when lastSubmission is null but stats are non-zero', () => {
    const statsWithNoLast: UserStats = { totalSubmitted: 3, totalApproved: 1, totalPending: 1 };

    expect(() =>
      render(
        <UserStatsPanel
          userStats={statsWithNoLast}
          lastSubmission={null}
          userName="Alice"
        />
      )
    ).not.toThrow();
  });

  it('should display the user name in the greeting', () => {
    render(
      <UserStatsPanel
        userStats={defaultUserStats}
        lastSubmission={defaultLastSubmission}
        userName="Bob"
      />
    );

    expect(screen.getByText(/bob/i)).toBeInTheDocument();
  });
});
