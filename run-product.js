/**
 * run-product.js - Run the Product Browse Test with staged ramp-up
 * 
 * Refactored from Grafana k6 Studio generated script (loadproduct.js)
 * which used a staged ramp-up pattern: 20 VUs over 1m, hold 3m30s, ramp down 1m.
 * 
 * To run: k6 run run-product.js
 */

import { ProductBrowseTest } from './tests/index.js';
import { GroupReportHelper } from './utils/index.js';

// ============================================================
// 1. CONFIGURATION
// ============================================================

// Staged ramp-up pattern from the original loadproduct.js
export const options = {
  stages: [
    { target: 20, duration: '5s' },
    { target: 20, duration: '5s' },
    { target: 0, duration: '5s' },
  ],
  thresholds: {
    http_req_duration: ['p(95)<5000'],
    http_req_failed: ['rate<0.10'],
  },
  tags: {
    framework: 'k6-oop',
    test: 'product-browse',
    environment: 'staging',
  },
};

// ============================================================
// 2. TEST INSTANTIATION
// ============================================================

// Create product browse test instance targeting the SUT
const productTest = new ProductBrowseTest({
  baseURL: 'https://tvn-sut.info',
  thinkTime: 1,
});

// ============================================================
// 3. EXPORT FOR K6
// ============================================================

// Export setup function (runs once per test)
export function setup() {
  console.log('=== Product Browse Test Setup ===');
  console.log('Running with staged ramp-up: 0 -> 20 VUs over 1m, hold 3m30s, ramp down');

  productTest.setup();

  return {
    startedAt: new Date().toISOString(),
  };
}

// Export default function (runs for each VU/iteration)
export default function (data) {
  productTest.run();
}

// Export teardown function (runs once after test)
export function teardown(data) {
  console.log('=== Product Browse Test Teardown ===');
  productTest.teardown();
  console.log(`Test started at: ${data.startedAt}`);
  console.log('Product browse test completed successfully');
}

// Export handleSummary function (runs after test to generate reports)
export function handleSummary(data) {
  return GroupReportHelper.generateWithGroupMetrics(data, {
    title: 'Product Browse Test - Staged Ramp-Up (20 VUs)',
    theme: 'bootstrap',
    filename: 'product-report.html',
  });
}
