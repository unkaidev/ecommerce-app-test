import '@testing-library/jest-dom';

// Suppress Next.js server-component warnings in jsdom environment
// (these are expected when rendering async Server Components in tests)
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: unknown[]) => {
    const msg = String(args[0]);
    if (
      msg.includes('Warning: An update to') ||
      msg.includes('Warning: ReactDOM.render') ||
      msg.includes('Error: Not implemented: window.scrollTo')
    ) {
      return;
    }
    originalError(...args);
  };
});

afterAll(() => {
  console.error = originalError;
});
