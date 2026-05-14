import React from 'react';
import { render, screen } from '@testing-library/react';
import { PipelineProgress } from '@/components/ideas/PipelineProgress';
import type { StageTransitionView } from '@/lib/pipeline/pipelineRepository';

const emptyHistory: StageTransitionView[] = [];

describe('PipelineProgress', () => {
  it('should render all four pipeline stage labels', () => {
    render(
      <PipelineProgress currentStatus="screening" history={emptyHistory} />
    );

    expect(screen.getByText('Screening')).toBeInTheDocument();
    expect(screen.getByText('Technical Review')).toBeInTheDocument();
    expect(screen.getByText('Business Review')).toBeInTheDocument();
    expect(screen.getByText('Final Decision')).toBeInTheDocument();
  });

  it('should mark the active stage visually for technical_review', () => {
    render(
      <PipelineProgress currentStatus="technical_review" history={emptyHistory} />
    );

    const activeEl = screen.getByLabelText('current stage');
    expect(activeEl).toHaveTextContent('Technical Review');
  });

  it('should show rejection message when status is rejected', () => {
    render(
      <PipelineProgress currentStatus="rejected" history={emptyHistory} />
    );

    expect(screen.getByText(/rejected/i)).toBeInTheDocument();
  });

  it('should show approved message when status is approved', () => {
    render(
      <PipelineProgress currentStatus="approved" history={emptyHistory} />
    );

    expect(screen.getByText(/approved/i)).toBeInTheDocument();
  });

  it('should show awaiting clarification message when status is awaiting_clarification', () => {
    render(
      <PipelineProgress currentStatus="awaiting_clarification" history={emptyHistory} />
    );

    expect(screen.getByText(/awaiting clarification/i)).toBeInTheDocument();
  });

  it('should render reviewer notes from history', () => {
    const history: StageTransitionView[] = [
      {
        id: 'h1',
        stage: 'screening',
        action: 'advanced',
        notes: 'Looks promising',
        adminDisplayName: 'Alice',
        adminId: 'admin-1',
        createdAt: 1700000000,
      },
    ];

    render(
      <PipelineProgress currentStatus="technical_review" history={history} />
    );

    expect(screen.getByText('Looks promising')).toBeInTheDocument();
  });
});
