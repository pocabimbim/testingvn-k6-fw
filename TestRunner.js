/**
 * TestRunner - Orchestrates multiple test scenarios
 * Allows running a collection of tests with shared configuration
 */
import { Settings } from './config/index.js';
import { ReportHelper } from './utils/index.js';

class TestRunner {
  constructor(config = {}) {
    this.settings = config.settings || Settings.smokeTest();
    this.tests = [];
    this.name = config.name || 'Test Suite';
    this.reportOptions = config.reportOptions || null;
  }

  /**
   * Add a test to the runner
   */
  addTest(testInstance) {
    this.tests.push(testInstance);
    return this;
  }

  /**
   * Add multiple tests at once
   */
  addTests(testInstances) {
    this.tests.push(...testInstances);
    return this;
  }

  /**
   * Get k6 options combining all test requirements
   */
  getOptions() {
    return this.settings.getK6Options();
  }

  /**
   * Run setup for all tests
   */
  setup() {
    console.log(`=== ${this.name} Setup ===`);
    console.log(`Running ${this.tests.length} test(s)`);

    for (const test of this.tests) {
      console.log(`Setting up: ${test.name}`);
      test.setup();
    }

    return {
      startedAt: new Date().toISOString(),
      testCount: this.tests.length,
      testNames: this.tests.map((t) => t.name),
    };
  }

  /**
   * Run all tests
   */
  run(data) {
    for (const test of this.tests) {
      test.run();
    }
  }

  /**
   * Run teardown for all tests
   */
  teardown(data) {
    console.log(`=== ${this.name} Teardown ===`);

    for (const test of this.tests) {
      console.log(`Tearing down: ${test.name}`);
      test.teardown();
    }

    console.log(`Test suite completed. Started at: ${data.startedAt}`);
  }

  /**
   * Generate summary report for all tests
   * Call this from handleSummary() in your main file
   */
  handleSummary(data) {
    if (this.reportOptions) {
      return ReportHelper.generateFullSummary(data, this.reportOptions);
    }
    return ReportHelper.defaultReport(data);
  }
}

export default TestRunner;
