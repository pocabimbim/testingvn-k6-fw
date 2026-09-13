/**
 * UserRegistrationTest - User registration flow test
 * 
 * Refactored from Grafana k6 Studio generated script (register.js)
 * into the OOP framework.
 * 
 * Test flow:
 * 1. Browse homepage (load images, JS assets)
 * 2. Navigate to login page
 * 3. Navigate to register page
 * 4. Sign up: Register new user via API, login, verify
 */

import { BaseTest } from '../core/index.js';
import {
  DataGenerator,
  extractScriptAssets,
} from '../utils/index.js';
import { registerGroup } from '../utils/GroupMetrics.js';

// Pre-register groups at module init time (required by k6 for per-group Trend metrics)
registerGroup('Browse Homepage');
registerGroup('Load Account Page');
registerGroup('Load Register Page');
registerGroup('Sign Up Flow');

class UserRegistrationTest extends BaseTest {
  constructor(config = {}) {
    super({
      name: 'User Registration Test',
      baseURL: config.baseURL || 'https://tvn-sut.info',
      thinkTime: config.thinkTime || 1,
      ...config,
    });

    // Correlation variables shared across requests
    this.correlationVars = {};

    // Test user data
    this.testUser = {
      full_name: config.testUser?.full_name || DataGenerator.randomName(),
      email: config.testUser?.email || DataGenerator.randomEmail(),
      password: config.testUser?.password || '123456',
    };
  }

  /**
   * Run the full registration flow
   */
  run() {
    // ============================================================
    // Group 1: Browse Homepage
    // ============================================================
    // Homepage flow is shared with the other scenarios (see BaseTest.browseHomepage)
    this.browseHomepage();

    this.thinkTime();

    // ============================================================
    // Group 2: Load Account/Login Page
    // ============================================================
    this.executeGroup('Load Account Page', () => {
      // GET login page
      const loginPageResp = this.request.get('/account/login', {
        headers: {
          accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
          referer: `${this.baseURL}/`,
        },
      });
      this.check.statusIs(loginPageResp, 200);

      // Dynamically extract JS assets from <script> tags on the login page
      const loginJsAssets = extractScriptAssets(loginPageResp.body);
      this.log(`Extracted ${loginJsAssets.length} JS assets from login page`);
      for (const jsPath of loginJsAssets) {
        const jsResp = this.request.get(jsPath, {
          headers: {
            accept: '*/*',
            referer: `${this.baseURL}/account/login`,
          },
        });
        this.check.statusIs(jsResp, 200);
      }
    });

    this.thinkTime();

    // ============================================================
    // Group 3: Load Register Page
    // ============================================================
    this.executeGroup('Load Register Page', () => {
      // GET register page
      const registerPageResp = this.request.get('/account/register', {
        headers: {
          accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
          referer: `${this.baseURL}/account/login`,
        },
      });
      this.check.statusIs(registerPageResp, 200);

      // Dynamically extract JS assets from <script> tags on the register page
      const registerJsAssets = extractScriptAssets(registerPageResp.body);
      this.log(`Extracted ${registerJsAssets.length} JS assets from register page`);
      for (const jsPath of registerJsAssets) {
        const jsResp = this.request.get(jsPath, {
          headers: {
            accept: '*/*',
            referer: `${this.baseURL}/account/register`,
          },
        });
        this.check.statusIs(jsResp, 200);
      }
    });

    this.thinkTime();

    // ============================================================
    // Group 4: Sign Up (Register + Login + Verify)
    // ============================================================
    this.executeGroup('Sign Up Flow', () => {
      // Step 1: POST register new customer
      const registerResp = this.request.post(
        '/api/customers',
        JSON.stringify({
          full_name: this.testUser.full_name,
          email: this.testUser.email,
          password: this.testUser.password,
        }),
        {
          headers: {
            'content-type': 'application/json',
            accept: '*/*',
            referer: `${this.baseURL}/account/register`,
          },
        },
      );
      this.check.statusIs(registerResp, 200);

      // Step 2: GET register page with ajax=true
      const ajaxResp = this.request.get('/account/register?ajax=true', {
        headers: {
          'content-type': 'application/json',
          accept: '*/*',
          referer: `${this.baseURL}/account/register`,
        },
      });
      this.check.statusIs(ajaxResp, 200);

      // Step 3: POST login with new credentials
      const loginResp = this.request.post(
        '/customer/login',
        JSON.stringify({
          email: this.testUser.email,
          password: this.testUser.password,
        }),
        {
          headers: {
            'content-type': 'application/json',
            accept: '*/*',
            referer: `${this.baseURL}/account/register`,
          },
        },
      );
      this.check.statusIs(loginResp, 200);

      // Step 4: GET register page with ajax=true (after login)
      const ajaxAfterLoginResp = this.request.get('/account/register?ajax=true', {
        headers: {
          'content-type': 'application/json',
          accept: '*/*',
          referer: `${this.baseURL}/account/register`,
          'if-none-match': 'W/"f2a-EonhbzK8DFehz1sCiOuUcrymjQg"',
        },
      });
      this.check.statusIs(ajaxAfterLoginResp, 200);

      // Step 5: GET homepage (after login, with auth cookies)
      const homeAfterLoginResp = this.request.get('/', {
        headers: {
          accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
          referer: `${this.baseURL}/account/register`,
          'if-none-match': 'W/"38ffd-oPg4yRrkh9gZtpRv0GBwterlcng"',
        },
      });
      this.check.statusIs(homeAfterLoginResp, 200);
    });

    this.thinkTime();
  }
}

export default UserRegistrationTest;