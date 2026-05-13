import { CategorySlug } from '@/lib/constants';

export type FieldType = 'text' | 'textarea' | 'select';

export interface FieldDefinition {
  name: string;
  label: string;
  type: FieldType;
  options?: readonly string[];
  maxLength?: number;
  placeholder?: string;
}

export const CATEGORY_FIELDS: Record<CategorySlug, FieldDefinition[]> = {
  technical_innovation: [
    {
      name: 'technology_area',
      label: 'Technology Area',
      type: 'select',
      options: ['Frontend', 'Backend', 'Infrastructure', 'Data / AI', 'Security', 'Other'],
    },
    {
      name: 'estimated_effort',
      label: 'Estimated Effort',
      type: 'select',
      options: ['Days', 'Weeks', 'Months'],
    },
  ],
  process_improvement: [
    {
      name: 'affected_team',
      label: 'Affected Team / Department',
      type: 'text',
      maxLength: 100,
      placeholder: 'e.g. Platform Engineering',
    },
    {
      name: 'current_pain_point',
      label: 'Current Pain Point',
      type: 'textarea',
      maxLength: 500,
      placeholder: 'Describe the current inefficiency or blocker…',
    },
  ],
  client_solution: [
    {
      name: 'target_client_segment',
      label: 'Target Client Segment',
      type: 'text',
      maxLength: 100,
      placeholder: 'e.g. Financial Services',
    },
    {
      name: 'client_problem_statement',
      label: 'Client Problem Statement',
      type: 'textarea',
      maxLength: 500,
      placeholder: "Describe the client's challenge…",
    },
  ],
  product_enhancement: [
    {
      name: 'affected_product',
      label: 'Affected Product / Feature',
      type: 'text',
      maxLength: 100,
      placeholder: 'e.g. Reporting Dashboard',
    },
    {
      name: 'proposed_user_benefit',
      label: 'Proposed User Benefit',
      type: 'textarea',
      maxLength: 500,
      placeholder: 'Describe how this improves the user experience…',
    },
  ],
  other: [],
};
