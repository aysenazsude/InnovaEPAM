import React from 'react';
import { render, screen } from '@testing-library/react';
import { PipelineForm } from '@/components/admin/PipelineForm';
import type { StageTransitionView } from '@/lib/pipeline/pipelineRepository';

jest.mock('@/lib/actions/pipeline', () => ({
  advanceStage: jest.fn(),
  approveAtFinalDecision: jest.fn(),
  rejectAtStage: jest.fn(),
  requestClarification: jest.fn(),
  cancelClarification: jest.fn(),
}));

const hookState: {
  pending: boolean;
  formAction: jest.Mock;
  state: { error?: string; conflict?: true } | null;
} = {
  pending: false,
  formAction: jest.fn(),
  state: null,
};

jest.mock('react', () => {
  const actual = jest.requireActual<typeof import('react')>('react');
  return {
    ...actual,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    useActionState: (..._: unknown[]) => [
      hookState.state,
      hookState.formAction,
      hookState.pending,
    ],
  };
});

const emptyHistory: StageTransitionView[] = [];

describe('PipelineForm', () => {
  beforeEach(() => {
    hookState.pending = false;
    hookState.state = null;
  });

  it('should render notes textarea and Advance button at screening stage', () => {
    render(
      <PipelineForm ideaId="idea-1" currentStage="screening" history={emptyHistory} />
    );

    expect(screen.getByRole('textbox', { name: /notes/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /advance to technical review/i })).toBeInTheDocument();
  });

  it('should render Approve and Reject buttons (not Advance) at final_decision stage', () => {
    render(
      <PipelineForm ideaId="idea-1" currentStage="final_decision" history={emptyHistory} />
    );

    expect(screen.getByRole('button', { name: /approve/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reject/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /advance/i })).not.toBeInTheDocument();
  });

  it('should show conflict error message when state has conflict', () => {
    hookState.state = { conflict: true };
    render(
      <PipelineForm ideaId="idea-1" currentStage="screening" history={emptyHistory} />
    );

    expect(
      screen.getByText(/this idea has already been moved/i)
    ).toBeInTheDocument();
  });

  it('should show error message when state has an error', () => {
    hookState.state = { error: 'Notes are required' };
    render(
      <PipelineForm ideaId="idea-1" currentStage="screening" history={emptyHistory} />
    );

    expect(screen.getByText('Notes are required')).toBeInTheDocument();
  });

  it('should render the notes textarea as required', () => {
    render(
      <PipelineForm ideaId="idea-1" currentStage="screening" history={emptyHistory} />
    );

    const textarea = screen.getByRole('textbox', { name: /notes/i });
    expect(textarea).toBeRequired();
  });

  it('should render Reject button at screening stage', () => {
    render(
      <PipelineForm ideaId="idea-1" currentStage="screening" history={emptyHistory} />
    );

    expect(screen.getByRole('button', { name: /reject/i })).toBeInTheDocument();
  });

  it('should render Request Clarification button at non-final stages', () => {
    render(
      <PipelineForm ideaId="idea-1" currentStage="technical_review" history={emptyHistory} />
    );

    expect(
      screen.getByRole('button', { name: /request clarification/i })
    ).toBeInTheDocument();
  });
});
