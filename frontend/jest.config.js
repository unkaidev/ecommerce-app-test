/** @type {import('jest').Config} */
const nextJest = require('next/jest');

const createJestConfig = nextJest({
  // Path to your Next.js app — loads next.config.mjs and .env.test
  dir: './',
});

/** @type {import('jest').Config} */
const customConfig = {
  displayName: 'frontend',

  // jsdom simulates a browser environment for React component tests
  testEnvironment: 'jsdom',

  // Module path aliases matching tsconfig paths
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },

  setupFilesAfterFramework: ['<rootDir>/jest.setup.ts'],

  // Collect coverage from all source files except generated configs and stories
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.stories.{ts,tsx}',
    '!src/**/index.ts',
    '!src/types/**',
  ],

  // Gate threshold: statement coverage >= 80%
  coverageThreshold: {
    global: {
      statements: 80,
      branches: 70,
      functions: 75,
      lines: 80,
    },
  },

  // Run test files matching these patterns
  testMatch: [
    '**/__tests__/**/*.[jt]s?(x)',
    '**/*.{spec,test}.{ts,tsx}',
  ],

  // Exclude node_modules, .next build output, and E2E tests (handled by Playwright)
  testPathIgnorePatterns: [
    '/node_modules/',
    '/.next/',
    '/e2e/',
  ],
};

module.exports = createJestConfig(customConfig);
