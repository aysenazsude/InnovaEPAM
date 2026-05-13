/**
 * @jest-environment jsdom
 */
import { describe, it, expect } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { CategoryFields } from '@/components/ideas/CategoryFields';
import type { CategorySlug } from '@/lib/constants';

describe('CategoryFields', () => {
  it('renders nothing when category is undefined', () => {
    const { container } = render(<CategoryFields category={undefined} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing for "other" category (no fields defined)', () => {
    const { container } = render(<CategoryFields category="other" />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the Technology Area select for technical_innovation', () => {
    render(<CategoryFields category="technical_innovation" />);
    expect(screen.getByLabelText(/technology area/i)).toBeInTheDocument();
  });

  it('renders the Estimated Effort select for technical_innovation', () => {
    render(<CategoryFields category="technical_innovation" />);
    expect(screen.getByLabelText(/estimated effort/i)).toBeInTheDocument();
  });

  it('renders the Affected Team text input for process_improvement', () => {
    render(<CategoryFields category="process_improvement" />);
    expect(screen.getByLabelText(/affected team/i)).toBeInTheDocument();
  });

  it('renders the Current Pain Point textarea for process_improvement', () => {
    render(<CategoryFields category="process_improvement" />);
    expect(screen.getByLabelText(/current pain point/i)).toBeInTheDocument();
  });

  it('renders the Target Client Segment text input for client_solution', () => {
    render(<CategoryFields category="client_solution" />);
    expect(screen.getByLabelText(/target client segment/i)).toBeInTheDocument();
  });

  it('renders the Client Problem Statement textarea for client_solution', () => {
    render(<CategoryFields category="client_solution" />);
    expect(screen.getByLabelText(/client problem statement/i)).toBeInTheDocument();
  });

  it('renders the Affected Product text input for product_enhancement', () => {
    render(<CategoryFields category="product_enhancement" />);
    expect(screen.getByLabelText(/affected product/i)).toBeInTheDocument();
  });

  it('renders the Proposed User Benefit textarea for product_enhancement', () => {
    render(<CategoryFields category="product_enhancement" />);
    expect(screen.getByLabelText(/proposed user benefit/i)).toBeInTheDocument();
  });

  it('shows a validation error message when errors prop contains a matching key', () => {
    render(
      <CategoryFields
        category="process_improvement"
        errors={{ affected_team: 'Affected Team / Department must be 100 characters or fewer' }}
      />
    );
    expect(
      screen.getByText(/affected team.*100 characters/i)
    ).toBeInTheDocument();
  });

  it('error element has role="alert"', () => {
    render(
      <CategoryFields
        category="process_improvement"
        errors={{ affected_team: 'Too long' }}
      />
    );
    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
  });

  it('container div has aria-live="polite" and role="status"', () => {
    const { container } = render(<CategoryFields category="process_improvement" />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveAttribute('aria-live', 'polite');
    expect(wrapper).toHaveAttribute('role', 'status');
  });

  it('shows a character counter for textarea fields', () => {
    render(<CategoryFields category="process_improvement" />);
    // Textarea field: current_pain_point (max 500)
    expect(screen.getByText(/0\s*\/\s*500/i)).toBeInTheDocument();
  });

  it('guidance text container has aria-live="polite" and role="status"', () => {
    render(<CategoryFields category="technical_innovation" />);
    const guidanceEl = screen.getByTestId('category-guidance');
    expect(guidanceEl).toHaveAttribute('aria-live', 'polite');
    expect(guidanceEl).toHaveAttribute('role', 'status');
  });

  it('renders the correct guidance text for the category', () => {
    render(<CategoryFields category="technical_innovation" />);
    expect(screen.getByTestId('category-guidance')).toHaveTextContent(
      /technical problem|proposed approach/i
    );
  });

  it('does not render guidance when category is undefined', () => {
    render(<CategoryFields category={undefined} />);
    expect(screen.queryByTestId('category-guidance')).toBeNull();
  });
});
