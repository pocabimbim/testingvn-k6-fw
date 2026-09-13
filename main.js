/**
 * main.js - Entry point for the k6 OOP Framework
 * 
 * This file demonstrates how to use the framework.
 * To run: k6 run main.js
 * 
 * The framework follows OOP principles:
 * - Encapsulation: Each class manages its own state
 * - Inheritance: Tests extend BaseTest/DataDrivenTest
 * - Polymorphism: Tests implement their own run() method
 * - Composition: Tests compose request, check, and utility objects
 */

import { Settings, EnvironmentRegistry } from './config/index.js';
import { UserLoginTest, ApiHealthCheckTest, UserRegistrationTest } from './tests/index.js';
import { ReportHelper } from './utils/index.js';

// ============================================================
// 1. CONFIGURATION
// ============================================================

// Configure test settings using presets or custom config
const testSettings = Settings.smokeTest();
// For load testing, use: Settings.loadTest()
// For stress testing, use: Settings.stressTest()

// Customize settings as needed
testSettings.baseURL = 'https://example.com';
testSettings.tags = {
  ...testSettings.tags,
  environment: 'staging',
  team: 'qa',
};

// Register environments (optional - for multi-environment testing)
const envRegistry = new EnvironmentRegistry();
envRegistry.register('dev', {
  baseURL: 'https://dev.example.com',
  timeout: '30s',
  headers: { 'X-Environment': 'dev' },
  tags: { env: 'dev' },
});
envRegistry.register('staging', {
  baseURL: 'https://staging.example.com',
  timeout: '30s',
  headers: { 'X-Environment': 'staging' },
  tags: { env: 'staging' },
});
envRegistry.register('prod', {
  baseURL: 'https://example.com',
  timeout: '10s',
  headers: { 'X-Environment': 'production' },
  tags: { env: 'production' },
});

// ============================================================
// 2. TEST INSTANTIATION
// ============================================================

// Create test instances with OOP approach
const healthCheckTest = new ApiHealthCheckTest({
  baseURL: testSettings.baseURL,
  thinkTime: 0.5,
});

const loginTest = new UserLoginTest({
  baseURL: testSettings.baseURL,
  thinkTime: 1,
});

const registrationTest = new UserRegistrationTest({
  baseURL: 'https://tvn-sut.info',
  thinkTime: 1,
});

// ============================================================
// 3. EXPORT FOR K6
// ============================================================

// Export k6 options
export const options = testSettings.getK6Options();

// Export setup function (runs once per test)
export function setup() {
  console.log('=== k6 OOP Framework Setup ===');
  console.log(`Test: ${testSettings.tags.framework}`);
  console.log(`Environment: ${testSettings.tags.environment || 'default'}`);

  // Run test setups
  healthCheckTest.setup();
  loginTest.setup();
  registrationTest.setup();

  return {
    startedAt: new Date().toISOString(),
    settings: testSettings,
  };
}

// Export default function (runs for each VU/iteration)
export default function (data) {
  // Run the health check test
  healthCheckTest.run();

  // Run the login test
  loginTest.run();

  // Run the user registration test
  registrationTest.run();
}

// Export teardown function (runs once after test)
export function teardown(data) {
  console.log('=== k6 OOP Framework Teardown ===');

  // Run test teardowns
  healthCheckTest.teardown();
  loginTest.teardown();
  registrationTest.teardown();

  console.log(`Test started at: ${data.startedAt}`);
  console.log('Test completed successfully');
}

// Export handleSummary function (runs after test to generate reports)
export function handleSummary(data) {
  return ReportHelper.generateFullSummary(data, {
    title: 'k6 OOP Framework Test Report',
    theme: 'default',
    filename: 'report.html',
  });
}
