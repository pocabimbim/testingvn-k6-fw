import { group, sleep } from 'k6';
import BaseRequest from './BaseRequest.js';
import BaseCheck from './BaseCheck.js';
import GroupMetrics from '../utils/GroupMetrics.js';
import { extractCatalogImages, extractWidgetImages, extractScriptAssets } from '../utils/HtmlExtractor.js';

// Accept headers reused when loading pages and their static resources
const ACCEPT_HTML = 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7';
const ACCEPT_IMAGE = 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8';
const ACCEPT_ANY = '*/*';

/**
 * BaseTest - Abstract base class for all test scenarios
 * Provides the foundation for OOP-based test cases
 */
class BaseTest {
  constructor(config = {}) {
    this.name = config.name || this.constructor.name;
    this.baseURL = config.baseURL || '';
    this.thinkTimeDelay = config.thinkTime || 0;
    this.headers = config.headers || {};
    this.tags = config.tags || {};
    this.trackGroupMetrics = config.trackGroupMetrics !== false; // enabled by default

    // Initialize core components
    this.request = new BaseRequest(this.baseURL, this.headers);
    this.check = BaseCheck;
  }

  /**
   * Setup hook - runs once before the test
   * Override in subclasses for test data preparation
   */
  setup() {
    // Override in subclasses
  }

  /**
   * Teardown hook - runs once after the test
   * Override in subclasses for cleanup
   */
  teardown() {
    // Override in subclasses
  }

  /**
   * Main test execution - the core test logic
   * Must be overridden by subclasses
   */
  run() {
    throw new Error(`Subclass "${this.constructor.name}" must implement the run() method`);
  }

  /**
   * Execute a named group of actions with metrics tracking
   */
  executeGroup(groupName, actionsFn) {
    if (this.trackGroupMetrics) {
      GroupMetrics.startGroup(groupName);
      this.request.setGroup(groupName);
    }

    group(groupName, () => {
      actionsFn();
    });

    if (this.trackGroupMetrics) {
      GroupMetrics.endGroup(groupName);
      this.request.setGroup(null);
    }
  }

  /**
   * Simulate think time between actions
   */
  thinkTime(seconds = null) {
    const delay = seconds !== null ? seconds : this.thinkTimeDelay;
    if (delay > 0) {
      sleep(delay);
    }
  }

  /**
   * Get the full test configuration
   */
  getConfig() {
    return {
      name: this.name,
      baseURL: this.baseURL,
      thinkTime: this.thinkTimeDelay,
      tags: this.tags,
    };
  }

  /**
   * Log a message with test context
   */
  log(message, level = 'info') {
    const prefix = `[${this.name}]`;
    switch (level) {
      case 'error':
        console.error(`${prefix} ${message}`);
        break;
      case 'warn':
        console.warn(`${prefix} ${message}`);
        break;
      default:
        console.log(`${prefix} ${message}`);
    }
  }

  /**
   * Request a list of static resources and assert every one returns 200.
   * @private
   */
  _loadResources(paths, accept, referer) {
    for (const path of paths) {
      const response = this.request.get(path, { headers: { accept, referer } });
      this.check.statusIs(response, 200);
    }
  }

  /**
   * Load every static resource referenced by an HTML page.
   *
   * Catalog images, widget/banner images and JavaScript bundles are
   * correlated from the markup, so no asset path is hard-coded in tests.
   *
   * @param {string} html - HTML response body of the page
   * @param {string} referer - URL of the page that references the resources
   * @returns {{images: number, scripts: number}} Counts of resources loaded
   */
  loadStaticResources(html, referer) {
    const images = [...extractCatalogImages(html), ...extractWidgetImages(html)];
    this._loadResources(images, ACCEPT_IMAGE, referer);

    const scripts = extractScriptAssets(html);
    this._loadResources(scripts, ACCEPT_ANY, referer);

    this.log(`Loaded ${images.length} images and ${scripts.length} scripts from ${referer}`);
    return { images: images.length, scripts: scripts.length };
  }

  /**
   * Request the browser-default favicon. The SUT does not ship one, so a
   * 404 is the expected result.
   */
  loadFavicon(referer) {
    const response = this.request.get('/favicon.ico', {
      headers: { accept: ACCEPT_IMAGE, referer },
    });
    this.check.custom(response, 'favicon returns 404', (r) => r.status === 404);
  }

  /**
   * Browse the homepage and load all of its static resources.
   *
   * Shared by every test whose flow starts on the homepage. Runs inside the
   * 'Browse Homepage' group, so callers must pre-register that group with
   * registerGroup('Browse Homepage') at module init time.
   *
   * @returns {string} Homepage HTML body
   */
  browseHomepage() {
    const referer = `${this.baseURL}/`;
    let html = '';

    this.executeGroup('Browse Homepage', () => {
      const response = this.request.get('/', {
        headers: { accept: ACCEPT_HTML },
      });
      this.check.statusIs(response, 200);
      html = response.body;

      this.loadStaticResources(html, referer);
      this.loadFavicon(referer);
    });

    return html;
  }
}

export default BaseTest;
