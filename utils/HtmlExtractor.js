/**
 * HtmlExtractor - Correlate static resource URLs from HTML response bodies.
 *
 * The SUT references its images, scripts and product links through markup,
 * e.g.:
 *   <img src="/images?src=%2Fassets%2Fcatalog%2F1367%2F5867%2Fthermos-yellow.jpg&amp;w=300&amp;q=75">
 *   <script src="/assets/frontStore/homepage/client/dfc334de564d120d3e79.js">
 *
 * Parsing those values keeps the tests free of hard-coded asset paths: when
 * the catalog, the widgets or the front-end bundles change, the tests follow
 * the page automatically.
 *
 * All helpers return de-duplicated values with HTML-encoded ampersands
 * (&amp;) converted back to a raw & so they are valid request URLs.
 */

// <img ... src="/images?src=%2Fassets%2Fcatalog%2F...&amp;w=300&amp;q=75">
const CATALOG_IMAGE_RE = /<img[^>]+src="(\/images\?src=%2Fassets%2Fcatalog%2F[^"]+)"/gi;

// <img ... src="/images?src=%2Fassets%2Fwidgets%2F...&amp;w=2400&amp;q=75">
const WIDGET_IMAGE_RE = /<img[^>]+src="(\/images\?src=%2Fassets%2Fwidgets%2F[^"]+)"/gi;

// <script ... src="/assets/....js">
const SCRIPT_ASSET_RE = /<script[^>]+src="(\/assets\/[^"]+\.js)"/gi;

// <a href="/category-slug/product-slug" class="product__list__link ...">
const PRODUCT_LINK_RE = /<a[^>]+href="(\/[a-z0-9-]+\/[a-z0-9-]+)"[^>]*class="[^"]*product__list__link[^"]*"/gi;

/**
 * Decode HTML-encoded ampersands so the URL is valid for http requests.
 * @private
 */
function decodeAmpersands(url) {
  return url.replace(/&amp;/g, '&');
}

/**
 * Run a global regex over the HTML and collect the first capture group of
 * every match, decoded and de-duplicated.
 * @private
 */
function collect(html, regex) {
  const found = [];
  regex.lastIndex = 0;
  let match;
  while ((match = regex.exec(html)) !== null) {
    found.push(decodeAmpersands(match[1]));
  }
  return [...new Set(found)];
}

/**
 * Pin the /images resize endpoint to a specific width/quality.
 * The base path is everything before the first & (the src= parameter).
 * @private
 */
function withSize(url, width, quality) {
  const base = url.split('&')[0];
  return `${base}&w=${width}&q=${quality}`;
}

/**
 * Catalog product images referenced in markup.
 *
 * @param {string} html - HTML response body
 * @param {object} [options]
 * @param {number} [options.width=750] - Rendered width for the /images endpoint
 * @param {number} [options.quality=75] - Rendered quality for the /images endpoint
 * @returns {string[]} Unique image URLs
 */
export function extractCatalogImages(html, { width = 750, quality = 75 } = {}) {
  return collect(html, CATALOG_IMAGE_RE).map((url) => withSize(url, width, quality));
}

/**
 * Widget/banner images (slides, hero banners) referenced in markup.
 * Returned at the size declared by the page.
 *
 * @param {string} html - HTML response body
 * @returns {string[]} Unique image URLs
 */
export function extractWidgetImages(html) {
  return collect(html, WIDGET_IMAGE_RE);
}

/**
 * JavaScript bundles referenced by <script src> tags.
 *
 * @param {string} html - HTML response body
 * @returns {string[]} Unique script paths
 */
export function extractScriptAssets(html) {
  return collect(html, SCRIPT_ASSET_RE);
}

/**
 * Product detail links carrying the product__list__link class.
 *
 * @param {string} html - HTML response body
 * @returns {string[]} Unique product paths
 */
export function extractProductLinks(html) {
  return collect(html, PRODUCT_LINK_RE);
}
