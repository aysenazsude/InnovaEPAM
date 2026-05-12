import type { PartialStrykerOptions } from '@stryker-mutator/api/core';

const config: PartialStrykerOptions = {
  testRunner: '@stryker-mutator/jest-runner',
  mutate: ['src/lib/**/*.ts'],
  thresholds: {
    high: 80,
    low: 75,
    break: 70,
  },
  reporters: ['html', 'clear-text', 'progress'],
  coverageAnalysis: 'perTest',
};

export default config;
