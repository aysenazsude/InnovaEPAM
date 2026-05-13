import { CategorySlug } from '@/lib/constants';

export const CATEGORY_GUIDANCE: Record<CategorySlug, string> = {
  technical_innovation:
    'Describe the technical problem this solves, the proposed approach, and the expected measurable improvement.',
  process_improvement:
    'Explain the current inefficiency, who is affected, and how this idea would improve the situation.',
  client_solution:
    "Describe the client's challenge clearly and explain how this idea addresses their pain point and the value it delivers.",
  product_enhancement:
    'Describe the current limitation and how this enhancement would improve the user experience or product capability.',
  other:
    'Please provide as much detail as possible to help evaluators understand and assess your idea.',
};
