// Test setup configuration
require('dotenv').config({ path: '.env' });

// Set test timeout for property-based tests
jest.setTimeout(30000);

// Global test configuration
global.console = {
  ...console,
  // Suppress console.log during tests unless needed
  log: process.env.NODE_ENV === 'test' ? jest.fn() : console.log,
};