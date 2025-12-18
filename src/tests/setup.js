// Test setup file
process.env.NODE_ENV = 'test';

// Set test timeout
jest.setTimeout(30000);

// Mock console.log in tests to reduce noise
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

beforeAll(() => {
  console.log = jest.fn();
  console.error = jest.fn();
});

afterAll(() => {
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
});