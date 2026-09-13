import { BaseTest } from '../core/index.js';
import { registerGroup } from '../utils/GroupMetrics.js';

// Pre-register groups at module init time (required by k6 for per-group Trend metrics)
registerGroup('Health Check Endpoints');

/**
 * ApiHealthCheckTest - Example test for API health/readiness endpoints
 * Demonstrates a simple smoke test using the OOP framework
 */
class ApiHealthCheckTest extends BaseTest {
  constructor(config = {}) {
    super({
      name: 'API Health Check',
      baseURL: config.baseURL || 'https://example.com',
      ...config,
    });
  }

  /**
   * Run health check tests
   */
  run() {
    this.executeGroup('Health Check Endpoints', () => {
      // Check root endpoint
      const rootResponse = this.request.get('/');
      this.check.statusIsSuccessful(rootResponse);
      this.check.responseTimeBelow(rootResponse, 1000);

      this.thinkTime(1);

      // Check health endpoint
      const healthResponse = this.request.get('/health');
      this.check.statusIs(healthResponse, 200);
      this.check.responseTimeBelow(healthResponse, 500);

      // Verify health response body
      const healthBody = this.request.parseJSON(healthResponse);
      if (healthBody) {
        this.check.custom(healthResponse, 'health response has status field', () => {
          return healthBody.status !== undefined;
        });
      }

      this.thinkTime(1);

      // Check readiness endpoint
      const readyResponse = this.request.get('/ready');
      this.check.statusIs(readyResponse, 200);
      this.check.responseTimeBelow(readyResponse, 500);
    });
  }
}

export default ApiHealthCheckTest;