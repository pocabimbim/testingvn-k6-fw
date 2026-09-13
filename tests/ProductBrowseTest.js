/**
 * ProductBrowseTest - Product browsing flow test (authenticated)
 * 
 * Refactored from Grafana k6 Studio generated script (loadproduct.js)
 * into the OOP framework, with an added sign-in step so the user
 * is authenticated before browsing products.
 * 
 * Product images are dynamically parsed from HTML responses using
 * regex correlation, extracting image paths from <img> src attributes
 * and converting HTML-encoded ampersands (&) to raw & for valid URLs.
 * 
 * Test flow:
 * 1. Sign In: Authenticate with credentials from data/users.json
 * 2. Browse Homepage: Load homepage, dynamically extract product image URLs
 * 3. Click on Shop Now button: Navigate to accessories category page
 * 4. Load product details: View a specific product page
 */

import { SharedArray } from 'k6/data';
import { BaseTest } from '../core/index.js';
import { User } from '../models/index.js';
import { registerGroup } from '../utils/GroupMetrics.js';
import {
  extractCatalogImages,
  extractScriptAssets,
  extractProductLinks,
} from '../utils/index.js';

// Pre-register groups at module init time (required by k6 for per-group Trend metrics)
registerGroup('Sign In');
registerGroup('Browse Homepage');
registerGroup('Click on Shop Now button');
registerGroup('View Product');

// Load users using SharedArray for memory efficiency across VUs
const allUsers = new SharedArray('users', function () {
  const rawUsers = JSON.parse(open('../data/users.json'));
  return User.fromArray(rawUsers);
});

class ProductBrowseTest extends BaseTest {
  constructor(config = {}) {
    super({
      name: 'Product Browse Test',
      baseURL: config.baseURL || 'https://tvn-sut.info',
      thinkTime: config.thinkTime || 1,
      ...config,
    });

    this.currentUser = null;
    this.correlationVars = {};
  }

  /**
   * Setup: Log user data info
   */
  setup() {
    this.log(`Loaded ${allUsers.length} users for authenticated browsing`);
  }

  /**
   * Extract a human-readable product name from a URL slug.
   * e.g. "/accessories/stainless-steel-thermos-yellow" -> "Stainless Steel Thermos - Yellow"
   */
  extractProductName(urlPath) {
    // Get the last segment of the URL path (the product slug)
    const segments = urlPath.split('/').filter(Boolean);
    const slug = segments[segments.length - 1] || 'unknown-product';
    // Replace hyphens with spaces and capitalize each word
    const name = slug
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    return name;
  }

  /**
   * Run the authenticated product browsing flow
   */
  run() {
    // Get the user for this VU using modulo distribution
    if (allUsers.length === 0) {
      this.log('No users loaded from data file', 'error');
      return;
    }
    const index = (__VU - 1) % allUsers.length;
    this.currentUser = allUsers[index];

    // ============================================================
    // Group 1: Sign In (authenticate before browsing)
    // ============================================================
    this.executeGroup('Sign In', () => {
      this.log(`VU ${__VU} signing in as: ${this.currentUser.username}`);

      // POST login credentials
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

      // GET account login page with ajax=true
      const ajaxResp = this.request.get('/account/login?ajax=true', {
        headers: {
          'content-type': 'application/json',
          accept: '*/*',
          referer: 'https://tvn-sut.info/account/login',
        },
      });
      this.check.statusIs(ajaxResp, 200);
    });

    this.thinkTime();

    // ============================================================
    // Group 2: Browse Homepage (dynamically extract assets)
    // ============================================================
    // Homepage flow is shared with the other scenarios (see BaseTest.browseHomepage)
    this.browseHomepage();

    this.thinkTime();

    // ============================================================
    // Group 3: Click on Shop Now button (Accessories category)
    // ============================================================
    this.executeGroup('Click on Shop Now button', () => {
      // GET accessories category page
      const categoryResp = this.request.get('/accessories', {
        headers: {
          accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
          referer: `${this.baseURL}/`,
        },
      });
      this.check.statusIs(categoryResp, 200);

      // Dynamically extract catalog images from <img> tags in the category page
      const categoryHtml = categoryResp.body;
      const categoryImages = extractCatalogImages(categoryHtml);
      this.log(`Extracted ${categoryImages.length} catalog images from category page`);

      // Load dynamically extracted category product images
      for (const imgPath of categoryImages) {
        const imgResp = this.request.get(imgPath, {
          headers: {
            accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
            referer: `${this.baseURL}/accessories`,
          },
        });
        this.check.statusIs(imgResp, 200);
      }

      // Dynamically extract JS assets from <script> tags
      const categoryJsAssets = extractScriptAssets(categoryHtml);
      for (const jsPath of categoryJsAssets) {
        const jsResp = this.request.get(jsPath, {
          headers: {
            accept: '*/*',
            referer: `${this.baseURL}/accessories`,
          },
        });
        this.check.statusIs(jsResp, 200);
      }

      // Extract product detail links for the next group
      const productLinks = extractProductLinks(categoryHtml);
      this.log(`Found ${productLinks.length} product links on category page`);
      if (productLinks.length > 0) {
        // Pick a random product link for variety across VUs/iterations
        const randomIndex = Math.floor(Math.random() * productLinks.length);
        this.correlationVars.productLink = productLinks[randomIndex];
        this.log(`Randomly selected product: ${this.correlationVars.productLink} (index ${randomIndex}/${productLinks.length})`);
      }
    });

    this.thinkTime();

    // ============================================================
    // Group 4: View product details (dynamically from correlation)
    // ============================================================
    // Use fixed group name for metrics aggregation (dynamic names break pre-registration)
    const productPath = this.correlationVars.productLink || '/accessories/modern-ceramic-vase-black';
    const productName = this.extractProductName(productPath);
    this.log(`Loading product details for: ${productPath} (${productName})`);

    this.executeGroup('View Product', () => {
      // GET product detail page
      const productResp = this.request.get(productPath, {
        headers: {
          accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
          referer: `${this.baseURL}/accessories`,
        },
      });
      this.check.statusIs(productResp, 200);

      // Dynamically extract catalog images from <img> tags in the product page
      const productHtml = productResp.body;
      const productDetailImages = extractCatalogImages(productHtml);
      this.log(`Extracted ${productDetailImages.length} images from product page`);

      // Load dynamically extracted product images
      for (const imgPath of productDetailImages) {
        const imgResp = this.request.get(imgPath, {
          headers: {
            accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
            referer: `${this.baseURL}${productPath}`,
          },
        });
        this.check.statusIs(imgResp, 200);
      }

      // Dynamically extract JS assets from <script> tags
      const productJsAssets = extractScriptAssets(productHtml);
      for (const jsPath of productJsAssets) {
        const jsResp = this.request.get(jsPath, {
          headers: {
            accept: '*/*',
            referer: `${this.baseURL}${productPath}`,
          },
        });
        this.check.statusIs(jsResp, 200);
      }
    });

    this.thinkTime();
  }
}

export default ProductBrowseTest;