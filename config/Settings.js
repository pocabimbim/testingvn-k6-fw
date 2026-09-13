/**
 * Global settings for the k6 test framework
 * Centralizes all configuration in one place
 */
class Settings {
  constructor(options = {}) {
    // Default settings
    this.stages = options.stages || [];
    this.thresholds = options.thresholds || {};
    this.vus = options.vus || 1;
    this.duration = options.duration || '30s';
    this.iterations = options.iterations || null;
    this.maxRedirects = options.maxRedirects || 10;
    this.userAgent = options.userAgent || 'K6-OOP-Framework/1.0';
    this.baseURL = options.baseURL || '';
    this.thinkTime = options.thinkTime || 0;
    this.logLevel = options.logLevel || 'info';
    this.tags = options.tags || { framework: 'k6-oop' };
  }

  /**
   * Get k6 options object for the test run
   */
  getK6Options() {
    const opts = {
      thresholds: this.thresholds,
      tags: this.tags,
      userAgent: this.userAgent,
      maxRedirects: this.maxRedirects,
    };

    if (this.stages.length > 0) {
      opts.stages = this.stages;
    } else {
      opts.vus = this.vus;
      opts.duration = this.duration;
    }

    if (this.iterations) {
      opts.iterations = this.iterations;
    }

    return opts;
  }

  /**
   * Create a settings preset for common test types
   */
  static smokeTest() {
    return new Settings({
      vus: 1,
      duration: '30s',
      thresholds: {
        http_req_duration: ['p(95)<500'],
        http_req_failed: ['rate<0.01'],
      },
    });
  }

  static loadTest() {
    return new Settings({
      stages: [
        { duration: '2m', target: 20 },
        { duration: '5m', target: 20 },
        { duration: '2m', target: 0 },
      ],
      thresholds: {
        http_req_duration: ['p(95)<1000', 'p(99)<2000'],
        http_req_failed: ['rate<0.05'],
      },
    });
  }

  static stressTest() {
    return new Settings({
      stages: [
        { duration: '2m', target: 50 },
        { duration: '5m', target: 100 },
        { duration: '2m', target: 0 },
      ],
      thresholds: {
        http_req_duration: ['p(95)<2000', 'p(99)<3000'],
        http_req_failed: ['rate<0.10'],
      },
    });
  }

  static spikeTest() {
    return new Settings({
      stages: [
        { duration: '1m', target: 10 },
        { duration: '30s', target: 200 },
        { duration: '2m', target: 0 },
      ],
      thresholds: {
        http_req_duration: ['p(95)<3000'],
        http_req_failed: ['rate<0.15'],
      },
    });
  }

  static soakTest() {
    return new Settings({
      stages: [
        { duration: '5m', target: 50 },
        { duration: '8h', target: 50 },
        { duration: '5m', target: 0 },
      ],
      thresholds: {
        http_req_duration: ['p(90)<800', 'p(95)<1200'],
        http_req_failed: ['rate<0.03'],
      },
    });
  }
}

export default Settings;
