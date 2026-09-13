/**
 * run-signin.js - Run the User Sign-In Test with 2 VUs
 * 
 * To run: k6 run run-signin.js
 */

import { UserSignInTest } from './tests/index.js';
import { GroupReportHelper } from './utils/index.js';

// ============================================================
// 1. CONFIGURATION
// ============================================================

// Configure for 2 VUs running the sign-in flow
export const options = {
  vus: 2,
  iterations: 2,
  thresholds: {
    http_req_duration: ['p(95)<5000'],
    http_req_failed: ['rate<0.10'],
  },
  tags: {
    framework: 'k6-oop',
    test: 'user-signin',
    environment: 'staging',
  },
};

// ============================================================
// 2. TEST INSTANTIATION
// ============================================================

// Create sign-in test instance targeting the SUT
const signInTest = new UserSignInTest({
  baseURL: 'https://tvn-sut.info',
  thinkTime: 1,
});

// ============================================================
// 3. EXPORT FOR K6
// ============================================================

// Export setup function (runs once per test)
export function setup() {
  console.log('=== User Sign-In Test Setup ===');
  console.log('Running with 2 VUs');

  signInTest.setup();

  return {
    startedAt: new Date().toISOString(),
  };
}

// Export default function (runs for each VU/iteration)
export default function (data) {
  signInTest.run();
}

// Export teardown function (runs once after test)
export function teardown(data) {
  console.log('=== User Sign-In Test Teardown ===');
  signInTest.teardown();
  console.log(`Test started at: ${data.startedAt}`);
  console.log('Test completed successfully');
}

// Export handleSummary function (runs after test to generate reports)
export function handleSummary(data) {
  return GroupReportHelper.generateWithGroupMetrics(data, {
    title: 'User Sign-In Test - 2 VUs',
    theme: 'bootstrap',
    filename: 'signin-report.html',
  });
}
