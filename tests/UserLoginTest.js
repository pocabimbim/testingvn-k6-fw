import { DataDrivenTest } from '../core/index.js';
import { User } from '../models/index.js';
import { registerGroup } from '../utils/GroupMetrics.js';

// Pre-register groups at module init time (required by k6 for per-group Trend metrics)
registerGroup('Login Flow');
registerGroup('Authenticated Actions');

/**
 * UserLoginTest - Example test scenario for user login flow
 * Demonstrates OOP approach with data-driven testing
 */
class UserLoginTest extends DataDrivenTest {
  constructor(config = {}) {
    super({
      name: 'User Login Test',
      baseURL: config.baseURL || 'https://example.com',
      thinkTime: config.thinkTime || 1,
      ...config,
    });

    this.users = [];
  }

  /**
   * Setup: Load user data and create User model instances
   */
  setup() {
    this.log('Loading test data...');
    const rawData = this.loadData('./users.json');
    this.users = User.fromArray(rawData);
    this.log(`Loaded ${this.users.length} users for testing`);
  }

  /**
   * Main test execution
   */
  run() {
    // Get the data record for this VU
    const record = this.getDataRecord();
    if (!record) {
      this.log('No test data available', 'error');
      return;
    }

    const user = User.fromJSON(record);
    this.log(`VU ${__VU} testing with user: ${user.username}`);

    this.executeGroup('Login Flow', () => {
      // Step 1: Send login request
      const loginResponse = this.request.post('/api/login', user.getLoginPayload());

      // Step 2: Validate response
      this.check.statusIs(loginResponse, 200);
      this.check.responseTimeBelow(loginResponse, 2000);

      // Step 3: Parse response and extract token
      const responseBody = this.request.parseJSON(loginResponse);
      if (responseBody && responseBody.token) {
        user.setToken(responseBody.token);
        this.log(`User ${user.username} authenticated successfully`);
      }

      this.thinkTime();
    });

    if (user.token) {
      this.executeGroup('Authenticated Actions', () => {
        // Example: Get user profile with auth token
        const profileResponse = this.request.get('/api/user/profile', {
          headers: user.getAuthHeaders(),
        });

        this.check.statusIs(profileResponse, 200);
        this.check.jsonFieldEquals(profileResponse, 'username', user.username);

        this.thinkTime();
      });
    }
  }

  /**
   * Teardown: Cleanup after test
   */
  teardown() {
    this.log('Test completed, cleaning up...');
  }
}

export default UserLoginTest;