import React from 'react';
import { render, screen } from '@testing-library/react';
import { ScoreSummaryCard } from '@/components/admin/ScoreSummaryCard';
import type { ScoreSummary } from '@/lib/pipeline/pipelineRepository';

const emptySummary: ScoreSummary = {
  byStage: [],
  overallAverage: null,
};

const richSummary: ScoreSummary = {
  byStage: [
    {
      stage: 'screening',
      transitionId: 'tr-1',
      action: 'advanced',
      scores: { innovation: 4, feasibility: 3 },
      stageAverage: 3.5,
    },
    {
      stage: 'technical_review',
      transitionId: 'tr-2',
      action: 'rejected',
      scores: { business_impact: 2, strategic_alignment: 5 },
      stageAverage: 3.5,
    },
  ],
  overallAverage: 3.5,
};

describe('ScoreSummaryCard', () => {
  it('should show "no scores yet" message when summary has no stages', () => {
    render(<ScoreSummaryCard summary={emptySummary} />);
    expect(screen.getByText(/no scores/i)).toBeInTheDocument();
  });

  it('should display overall average score when present', () => {
    render(<ScoreSummaryCard summary={richSummary} />);
    expect(screen.getByText('3.5')).toBeInTheDocument();
  });

  it('should render a section per stage', () => {
    render(<ScoreSummaryCard summary={richSummary} />);
    expect(screen.getByText(/screening/i)).toBeInTheDocument();
    expect(screen.getByText(/technical review/i)).toBeInTheDocument();
  });

  it('should show dimension labels and their scores', () => {
    render(<ScoreSummaryCard summary={richSummary} />);
    expect(screen.getByText(/innovation/i)).toBeInTheDocument();
    expect(screen.getByText(/feasibility/i)).toBeInTheDocument();
    expect(screen.getByText(/business impact/i)).toBeInTheDocument();
    expect(screen.getByText(/strategic alignment/i)).toBeInTheDocument();
  });

  it('should show the stage average for each scored stage', () => {
    render(<ScoreSummaryCard summary={richSummary} />);
    // Overall average shown as "3.5"
    expect(screen.getByText('3.5')).toBeInTheDocument();
    // Stage averages shown as "avg 3.5"
    const avgLabels = screen.getAllByText(/avg 3\.5/i);
    expect(avgLabels).toHaveLength(2);
  });

  it('should not crash when a stage has no scores', () => {
    const noScoreSummary: ScoreSummary = {
      byStage: [
        { stage: 'screening', transitionId: 'tr-1', action: 'advanced', scores: {}, stageAverage: null },
      ],
      overallAverage: null,
    };
    render(<ScoreSummaryCard summary={noScoreSummary} />);
    expect(screen.getByText(/screening/i)).toBeInTheDocument();
  });
});
