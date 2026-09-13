/**
 * UserSignInTest - Sign-in flow test
 * 
 * Refactored from Grafana k6 Studio generated script (signin.ts)
 * into the OOP framework.
 * 
 * Reads login credentials from data/users.json and distributes
 * them across VUs using modulo-based data-driven approach.
 * 
 * Test flow:
 * 1. Sign in: POST login credentials, GET account page, GET homepage
 */

import { SharedArray } from 'k6/data';
import { BaseTest } from '../core/index.js';
import { User } from '../models/index.js';
import { registerGroup } from '../utils/GroupMetrics.js';

// Pre-register groups at module init time (required by k6 for per-group Trend metrics)
registerGroup('Sign in');

// Load users using SharedArray for memory efficiency across VUs
const allUsers = new SharedArray('users', function () {
  const rawUsers = JSON.parse(open('../data/users.json'));
  return User.fromArray(rawUsers);
});

class UserSignInTest extends BaseTest {
  constructor(config = {}) {
    super({
      name: 'User Sign-In Test',
      baseURL: config.baseURL || 'https://tvn-sut.info',
      thinkTime: config.thinkTime || 1,
      ...config,
    });

    this.currentUser = null;
  }

  /**
   * Setup: Log user data info
   */
  setup() {
    this.log(`Loaded ${allUsers.length} users for sign-in testing`);
  }

  /**
   * Run the sign-in flow
   */
  run() {
    // Get the user for this VU using modulo distribution
    if (allUsers.length === 0) {
      this.log('No users loaded from data file', 'error');
      return;
    }
    const index = (__VU - 1) % allUsers.length;
    this.currentUser = allUsers[index];
    this.log(`VU ${__VU} signing in as: ${this.currentUser.username}`);

    // ============================================================
    // Group: Sign In
    // ============================================================
    this.executeGroup('Sign in', () => {
      // Step 1: POST login credentials
      const loginResp = this.request.post(
        '/customer/login',
        JSON.stringify({
          email: this.currentUser.username,
          password: this.currentUser.password,
        }),
        {
          headers: {
            'content-type': 'application/json',
            accept: '*/*',
            referer: 'https://tvn-sut.info/account/login',
          },
        },
      );
      this.check.statusIs(loginResp, 200);

      // Step 2: GET account login page with ajax=true
      const ajaxResp = this.request.get('/account/login?ajax=true', {
        headers: {
          'content-type': 'application/json',
          accept: '*/*',
          referer: 'https://tvn-sut.info/account/login',
        },
      });
      this.check.statusIs(ajaxResp, 200);

      // Step 3: GET homepage (after login, with auth cookies)
      const homeResp = this.request.get('/', {
        headers: {
          accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
          referer: 'https://tvn-sut.info/account/login',
          'if-none-match': 'W/"38ffd-1FqY80uzeZm6bReDQx8koDd24dM"',
        },
      });
      this.check.statusIs(homeResp, 200);
    });

    this.thinkTime();
  }
}

export default UserSignInTest;