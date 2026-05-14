import React from 'react';
import { render, screen } from '@testing-library/react';
import { ScoringPanel } from '@/components/admin/ScoringPanel';

describe('ScoringPanel', () => {
  it('should render a fieldset for each of the five evaluation dimensions', () => {
    render(<ScoringPanel />);
    expect(screen.getByRole('group', { name: /innovation/i })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: /feasibility/i })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: /business impact/i })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: /strategic alignment/i })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: /technical soundness/i })).toBeInTheDocument();
  });

  it('should render radio buttons with values 1 through 5 for each dimension', () => {
    render(<ScoringPanel />);
    const radios = screen.getAllByRole('radio');
    // 5 dimensions × 5 values = 25 radio buttons
    expect(radios).toHaveLength(25);
    for (const radio of radios) {
      const value = Number((radio as HTMLInputElement).value);
      expect(value).toBeGreaterThanOrEqual(1);
      expect(value).toBeLessThanOrEqual(5);
    }
  });

  it('should not mark any radio input as required', () => {
    render(<ScoringPanel />);
    const radios = screen.getAllByRole('radio');
    for (const radio of radios) {
      expect(radio).not.toBeRequired();
    }
  });

  it('should name each radio input as score_{dimension}', () => {
    render(<ScoringPanel />);
    const expectedNames = [
      'score_innovation',
      'score_feasibility',
      'score_business_impact',
      'score_strategic_alignment',
      'score_technical_soundness',
    ];
    const radios = screen.getAllByRole('radio') as HTMLInputElement[];
    const names = [...new Set(radios.map((r) => r.name))];
    expect(names.sort()).toEqual(expectedNames.sort());
  });

  it('should apply a custom namePrefix to input names', () => {
    render(<ScoringPanel namePrefix="reject" />);
    const radios = screen.getAllByRole('radio') as HTMLInputElement[];
    for (const radio of radios) {
      expect(radio.name).toMatch(/^reject_/);
    }
  });

  it('should render a legend label for each dimension fieldset', () => {
    render(<ScoringPanel />);
    expect(screen.getByText('Innovation')).toBeInTheDocument();
    expect(screen.getByText('Feasibility')).toBeInTheDocument();
    expect(screen.getByText('Business Impact')).toBeInTheDocument();
    expect(screen.getByText('Strategic Alignment')).toBeInTheDocument();
    expect(screen.getByText('Technical Soundness')).toBeInTheDocument();
  });

  it('should render rating labels 1 to 5 for each dimension', () => {
    render(<ScoringPanel />);
    // Each value 1-5 appears 5 times (once per dimension)
    const ones = screen.getAllByLabelText('1');
    expect(ones).toHaveLength(5);
    const fives = screen.getAllByLabelText('5');
    expect(fives).toHaveLength(5);
  });
});
