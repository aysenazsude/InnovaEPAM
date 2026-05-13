/**
 * @jest-environment jsdom
 */
import { describe, it, expect, jest } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

// Mock the submitIdea server action
jest.mock('@/lib/actions/ideas', () => ({
  submitIdea: jest.fn(),
}));

// Mock useActionState to avoid server-action complexity in unit tests
jest.mock('react', () => {
  const actual = jest.requireActual<typeof import('react')>('react');
  return {
    ...actual,
    useActionState: jest.fn((action: unknown, initialState: unknown) => [initialState, action, false]),
  };
});

import { IdeaForm } from '@/components/ideas/IdeaForm';

describe('IdeaForm', () => {
  it('renders title, description, category, and file inputs', () => {
    render(<IdeaForm />);
    expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/attachment/i)).toBeInTheDocument();
  });

  it('renders a submit button', () => {
    render(<IdeaForm />);
    expect(screen.getByRole('button', { name: /submit idea/i })).toBeInTheDocument();
  });

  it('title input preserves its value when typed', () => {
    render(<IdeaForm />);
    const titleInput = screen.getByLabelText(/title/i) as HTMLInputElement;
    fireEvent.change(titleInput, { target: { value: 'My New Idea' } });
    expect(titleInput.value).toBe('My New Idea');
  });

  it('description textarea preserves its value when typed', () => {
    render(<IdeaForm />);
    const descInput = screen.getByLabelText(/description/i) as HTMLTextAreaElement;
    fireEvent.change(descInput, { target: { value: 'A detailed description.' } });
    expect(descInput.value).toBe('A detailed description.');
  });

  it('does not render CategoryFields until a category is selected', () => {
    render(<IdeaForm />);
    // No category-specific field should be visible initially
    expect(screen.queryByTestId('category-guidance')).toBeNull();
  });
});
