import React from 'react';
import { render, screen } from '@testing-library/react';
import { IdeaForm } from '@/components/ideas/IdeaForm';

// ── Mocks ─────────────────────────────────────────────────────────────────────
jest.mock('@/lib/actions/ideas', () => ({
  submitIdea: jest.fn(),
}));

jest.mock('@/components/ideas/FileUpload', () => ({
  FileUpload: () => <div data-testid="file-upload-mock" />,
}));

jest.mock('@/components/ideas/CategoryFields', () => ({
  CategoryFields: () => null,
}));

// Control useActionState return value from tests via a shared state object.
// This avoids TDZ issues: the factory captures the hookState reference lazily.
const hookState: {
  pending: boolean;
  formAction: jest.Mock;
  state: null;
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

// ── Tests ─────────────────────────────────────────────────────────────────────
describe('IdeaForm — progress bar', () => {
  beforeEach(() => {
    hookState.pending = false;
    hookState.formAction = jest.fn();
    hookState.state = null;
  });

  it('renders role="progressbar" with aria-busy="true" when pending is true', () => {
    hookState.pending = true;
    render(<IdeaForm />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-busy', 'true');
  });

  it('renders progress bar with accessible label when pending is true', () => {
    hookState.pending = true;
    render(<IdeaForm />);
    expect(screen.getByRole('progressbar')).toHaveAttribute(
      'aria-label',
      'Uploading files…',
    );
  });

  it('disables the Submit button when pending is true', () => {
    hookState.pending = true;
    render(<IdeaForm />);
    expect(screen.getByRole('button', { name: /submit/i })).toBeDisabled();
  });

  it('does not render progressbar when pending is false', () => {
    hookState.pending = false;
    render(<IdeaForm />);
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('Submit button is enabled when pending is false', () => {
    hookState.pending = false;
    render(<IdeaForm />);
    expect(screen.getByRole('button', { name: /submit/i })).not.toBeDisabled();
  });
});
