/**
 * run-parallel.js - Run Sign-In and Registration tests in parallel
 * 
 * Uses k6 scenarios to run both test flows simultaneously with
 * dedicated VUs for each scenario.
 * 
 * Each scenario is mapped to a specific exported function via the
 * `exec` option, so no manual routing is needed.
 * 
 * To run: k6 run run-parallel.js
 */

import { UserSignInTest, UserRegistrationTest } from './tests/index.js';
import { GroupReportHelper } from './utils/index.js';

// ============================================================
// 1. TEST INSTANTIATION
// ============================================================

// Create sign-in test instance
const signInTest = new UserSignInTest({
  baseURL: 'https://tvn-sut.info',
  thinkTime: 1,
});

// Create registration test instance
const registrationTest = new UserRegistrationTest({
  baseURL: 'https://tvn-sut.info',
  thinkTime: 1,
});

// ============================================================
// 2. SCENARIO CONFIGURATION
// ============================================================

// Each scenario runs independently with its own VUs, iterations,
// and is mapped to a specific exported function via `exec`.
export const options = {
  scenarios: {
    // Scenario 1: Sign-In - 2 VUs, 2 iterations
    signin_scenario: {
      executor: 'shared-iterations',
      vus: 2,
      iterations: 2,
      maxDuration: '5m',
      exec: 'signin', // calls the exported `signin` function
      tags: {
        scenario: 'signin',
        test: 'user-signin',
      },
    },
    // Scenario 2: Registration - 2 VUs, 2 iterations
    register_scenario: {
      executor: 'shared-iterations',
      vus: 2,
      iterations: 2,
      maxDuration: '5m',
      exec: 'register', // calls the exported `register` function
      tags: {
        scenario: 'register',
        test: 'user-registration',
      },
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<5000'],
    http_req_failed: ['rate<0.10'],
  },
  tags: {
    framework: 'k6-oop',
    environment: 'staging',
  },
};

// ============================================================
// 3. SETUP & TEARDOWN (shared across all scenarios)
// ============================================================

export function setup() {
  console.log('=== Parallel Test Setup ===');
  console.log('Running Sign-In and Registration tests in parallel');

  signInTest.setup();
  registrationTest.setup();

  return {
    startedAt: new Date().toISOString(),
  };
}

export function teardown(data) {
  console.log('=== Parallel Test Teardown ===');
  signInTest.teardown();
  registrationTest.teardown();
  console.log(`Test started at: ${data.startedAt}`);
  console.log('Parallel test completed successfully');
}

// ============================================================
// 4. SCENARIO FUNCTIONS (mapped via `exec` in options)
// ============================================================

/**
 * Sign-In scenario function
 * Called by signin_scenario (2 VUs, 2 iterations)
 */
export function signin(data) {
  signInTest.run();
}

/**
 * Registration scenario function
 * Called by register_scenario (2 VUs, 2 iterations)
 */
export function register(data) {
  registrationTest.run();
}

// ============================================================
// 5. REPORTING
// ============================================================

export function handleSummary(data) {
  return GroupReportHelper.generateWithGroupMetrics(data, {
    title: 'Parallel Test - Sign-In & Registration (2 VUs each)',
    theme: 'bootstrap',
    filename: 'parallel-report.html',
  });
}
