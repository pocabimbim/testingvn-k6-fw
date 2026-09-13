import { Trend, Rate, Counter } from 'k6/metrics';

const urlTrends = {};
const urlErrorRates = {};
const urlCallCounts = {};
const sanitizedToKey = {};

function buildKey(url, method) { return `${method}:${url}`; }
export { buildKey };

export function registerUrl(url, method) {
  const key = buildKey(url, method);
  const sanitized = key.replace(/[^a-zA-Z0-9]/g, '_');
  sanitizedToKey[sanitized] = key;
  if (!urlTrends[key]) urlTrends[key] = new Trend(`req_dur_${sanitized}`);
  if (!urlErrorRates[key]) urlErrorRates[key] = new Rate(`req_err_${sanitized}`);
  if (!urlCallCounts[key]) urlCallCounts[key] = new Counter(`req_cnt_${sanitized}`);
}

/**
 * Convert a wildcard URL pattern (using * glob) to a RegExp.
 * Escapes special regex chars except *, which becomes .*
 */
function patternToRegex(pattern) {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*');
  return new RegExp('^' + escaped + '$');
}

// Lazy-built cache of wildcard matchers: { method -> [{ key, regex }] }
const wildcardMatchers = {};

export function recordUrlRequest(url, method, duration, success) {
  const key = buildKey(url, method);

  // 1. Try exact match first (fast path for pre-registered static URLs)
  if (urlTrends[key]) {
    urlTrends[key].add(duration);
    urlErrorRates[key].add(!success);
    urlCallCounts[key].add(1);
    return;
  }

  // 2. Build wildcard matchers if not yet built for this method
  if (!wildcardMatchers[method]) {
    wildcardMatchers[method] = [];
    for (const registeredKey of Object.keys(urlTrends)) {
      const ci = registeredKey.indexOf(':');
      if (ci < 0) continue;
      const regMethod = registeredKey.substring(0, ci);
      const regUrl = registeredKey.substring(ci + 1);
      if (regMethod === method && regUrl.includes('*')) {
        wildcardMatchers[method].push({
          key: registeredKey,
          regex: patternToRegex(regUrl),
        });
      }
    }
  }

  // 3. Try wildcard match against registered patterns
  //    e.g. /accessories/thermos-yellow matches /accessories/*
  for (const matcher of wildcardMatchers[method]) {
    if (matcher.regex.test(url)) {
      urlTrends[matcher.key].add(duration);
      urlErrorRates[matcher.key].add(!success);
      urlCallCounts[matcher.key].add(1);
      return;
    }
  }
}

export function getUrlRegistry() { return { ...sanitizedToKey }; }
export function getRawMetricsForTeardown() { return {}; }
export function getUrlMetricName() { return ''; }
export function getUrlMetricsFromData(data) { return extractUrlMetricsFromSummary(data); }

/**
 * Extract per-URL metrics from the handleSummary data.
 *
 * Reads both:
 *   1. k6's built-in http_req_duration{url:...,method:...} tagged sub-metrics (if available)
 *   2. Custom req_dur_* Trend/Counter/Rate metrics from registerUrl()
 *
 * Wildcard patterns (e.g. /accessories/*) appear as single rows aggregating
 * all matching URLs.
 */
export function extractUrlMetricsFromSummary(data) {
  if (!data || !data.metrics) return null;
  const result = {};
  const registry = data.urlRegistry || sanitizedToKey;

  let testDurationSec = 0;
  if (data.state && data.state.testRunDurationMs) {
    testDurationSec = data.state.testRunDurationMs / 1000;
  }

  // Source 1: k6's built-in http_req_duration{url:...,method:...}
  parseTaggedMetrics(data.metrics, result);

  // Source 2: custom req_dur_* Trend metrics (pre-registered per-URL or wildcard)
  for (const metricName of Object.keys(data.metrics)) {
    if (!metricName.startsWith('req_dur_')) continue;
    const m = data.metrics[metricName];
    if (!m || m.type !== 'trend' || !m.values) continue;
    const sanitized = metricName.slice(8);
    if (resultBySanitized(result, registry, sanitized)) continue;

    const cnt = data.metrics[`req_cnt_${sanitized}`];
    const err = data.metrics[`req_err_${sanitized}`];
    const key = registry[sanitized] || m.contains || sanitized;
    let method = 'GET', url = key;
    const ci = key.indexOf(':');
    if (ci > 0) { method = key.substring(0, ci); url = key.substring(ci + 1); }

    const rc = cnt && cnt.values ? cnt.values.count || 0 : 0;
    if (rc === 0) continue;

    addResult(result, key, url, method.toUpperCase(), m.values, rc, err, testDurationSec);
  }

  return Object.keys(result).length > 0 ? result : null;
}

function parseTaggedMetrics(metrics, result) {
  for (const metricName of Object.keys(metrics)) {
    if (!metricName.includes('{') || !metricName.includes('url:')) continue;
    if (!metricName.startsWith('http_req_duration')) continue;

    const urlMatch = metricName.match(/url:([^,}]+)/);
    const methodMatch = metricName.match(/method:([^,}]+)/);
    if (!urlMatch) continue;

    const url = urlMatch[1].trim();
    const method = (methodMatch ? methodMatch[1] : 'GET').trim().toUpperCase();
    const key = buildKey(url, method);
    if (result[key]) continue;

    const m = metrics[metricName];
    if (!m || !m.values) continue;

    let rc = 0;
    const reqsKey = `http_reqs{url:${url},method:${method}}`;
    if (metrics[reqsKey] && metrics[reqsKey].values) {
      rc = metrics[reqsKey].values.count || 0;
    }

    let err = null;
    const failKey = `http_req_failed{url:${url},method:${method}}`;
    if (metrics[failKey] && metrics[failKey].values) {
      err = { values: { rate: metrics[failKey].values.rate || 0 } };
    }

    if (rc === 0) continue;
    addResult(result, key, url, method, m.values, rc, err, 0);
  }
}

function resultBySanitized(result, registry, sanitized) {
  const key = registry[sanitized];
  return key && result[key];
}

function addResult(result, key, url, method, values, rc, err, testDurationSec) {
  result[key] = {
    url, method,
    avgResponseTime: values.avg || 0,
    minDuration: values.min || 0,
    maxDuration: values.max || 0,
    p90: values['p(90)'] || 0,
    p95: values['p(95)'] || 0,
    requestCount: rc,
    errorCount: err && err.values ? Math.round((err.values.rate || 0) * (rc || 1)) : 0,
    throughput: testDurationSec > 0 ? rc / testDurationSec : 0,
  };
}