/**
 * GroupMetrics - Track per-group performance metrics
 * 
 * Tracks response time, throughput, error rate, and call count
 * for each named group in the test.
 * 
 * IMPORTANT: Tests MUST call registerGroup(groupName) at module init time
 * (top level of the test file) for each group they use. This pre-creates
 * dedicated k6 Trend metrics per group, which k6 then aggregates across
 * all VUs automatically.
 * 
 * Usage:
 *   import { GroupMetrics, registerGroup } from '../utils/index.js';
 *   
 *   // Pre-register groups at module init time (REQUIRED)
 *   registerGroup('Browse Homepage');
 *   registerGroup('Sign In');
 *   
 *   // In the test:
 *   GroupMetrics.startGroup('Browse Homepage');
 *   GroupMetrics.recordRequest('Browse Homepage', duration, success);
 *   GroupMetrics.endGroup('Browse Homepage');
 */

import { Trend, Rate, Counter } from 'k6/metrics';

// Module-level registry: one Trend/Rate/Counter per group
// Created at init time via registerGroup()
const groupTrends = {};
const groupErrorRates = {};
const groupCallCounts = {};

/**
 * Pre-register a group name at module init time.
 * Creates dedicated k6 metrics for this group so k6 can aggregate
 * across all VUs. Must be called at top level of test files.
 * 
 * @param {string} groupName - The group name used in executeGroup()
 */
export function registerGroup(groupName) {
  const sanitized = groupName.replace(/[^a-zA-Z0-9]/g, '_');
  
  if (!groupTrends[groupName]) {
    groupTrends[groupName] = new Trend(`grp_dur_${sanitized}`);
  }
  if (!groupErrorRates[groupName]) {
    groupErrorRates[groupName] = new Rate(`grp_err_${sanitized}`);
  }
  if (!groupCallCounts[groupName]) {
    groupCallCounts[groupName] = new Counter(`grp_cnt_${sanitized}`);
  }
}

/**
 * Get the metric name for a group (used when reading from summary data).
 */
function getGroupMetricName(groupName, prefix) {
  const sanitized = groupName.replace(/[^a-zA-Z0-9]/g, '_');
  return `${prefix}${sanitized}`;
}

class GroupMetrics {
  constructor() {
    this.activeGroups = {};
    this.groupNames = [];
  }

  /**
   * Calculate percentile from sorted array
   * @private
   */
  _percentile(sortedArr, p) {
    if (sortedArr.length === 0) return 0;
    const index = Math.ceil((p / 100) * sortedArr.length) - 1;
    return sortedArr[Math.max(0, Math.min(index, sortedArr.length - 1))];
  }

  /**
   * Start timing a group
   * @param {string} groupName - Name of the group
   */
  startGroup(groupName) {
    if (!this.activeGroups[groupName]) {
      this.activeGroups[groupName] = {
        startTime: Date.now(),
        firstRequestTime: null,
        lastRequestTime: null,
        requestCount: 0,
        errorCount: 0,
        totalDuration: 0,
        minDuration: Infinity,
        maxDuration: -Infinity,
        durations: [],
        groupDurations: [],
      };
      if (!this.groupNames.includes(groupName)) {
        this.groupNames.push(groupName);
      }
    } else {
      this.activeGroups[groupName].startTime = Date.now();
    }
  }

  /**
   * Record a request within a group.
   * Adds the duration to the group's dedicated k6 Trend metric
   * (which was pre-created by registerGroup() at init time).
   * 
   * @param {string} groupName - Name of the group
   * @param {number} duration - Request duration in ms
   * @param {boolean} success - Whether the request succeeded
   */
  recordRequest(groupName, duration, success) {
    if (!this.activeGroups[groupName]) {
      this.startGroup(groupName);
    }

    const group = this.activeGroups[groupName];
    const now = Date.now();
    
    group.requestCount++;
    group.totalDuration += duration;
    group.durations.push(duration);
    
    if (group.firstRequestTime === null) group.firstRequestTime = now;
    group.lastRequestTime = now;

    if (duration < group.minDuration) group.minDuration = duration;
    if (duration > group.maxDuration) group.maxDuration = duration;

    if (!success) {
      group.errorCount++;
    }

    // Record to the group's pre-created k6 Trend metric
    // k6 automatically aggregates these across all VUs
    if (groupTrends[groupName]) {
      groupTrends[groupName].add(duration);
    }
    if (groupErrorRates[groupName]) {
      groupErrorRates[groupName].add(!success);
    }
    if (groupCallCounts[groupName]) {
      groupCallCounts[groupName].add(1);
    }
  }

  /**
   * End tracking a group
   * @param {string} groupName - Name of the group
   */
  endGroup(groupName) {
    if (this.activeGroups[groupName]) {
      const group = this.activeGroups[groupName];
      const elapsed = Date.now() - group.startTime;
      group.groupDurations.push(elapsed);
    }
  }

  /**
   * Get in-memory aggregated metrics for all groups (per-VU only)
   * @returns {object} Per-group metrics summary
   */
  getGroupMetrics() {
    const result = {};
    for (const name of this.groupNames) {
      const group = this.activeGroups[name];
      if (group && group.requestCount > 0) {
        const sorted = [...group.durations].sort((a, b) => a - b);
        let throughput = 0;
        if (group.firstRequestTime !== null && group.lastRequestTime !== null) {
          const elapsedSec = (group.lastRequestTime - group.firstRequestTime) / 1000;
          if (elapsedSec > 0) {
            throughput = group.requestCount / elapsedSec;
          }
        }

        result[name] = {
          requestCount: group.requestCount,
          errorCount: group.errorCount,
          errorRate: group.errorCount / group.requestCount,
          avgResponseTime: group.totalDuration / group.requestCount,
          totalDuration: group.totalDuration,
          minDuration: group.minDuration === Infinity ? 0 : group.minDuration,
          maxDuration: group.maxDuration === -Infinity ? 0 : group.maxDuration,
          throughput,
          p90: this._percentile(sorted, 90),
          p95: this._percentile(sorted, 95),
          p99: this._percentile(sorted, 99),
        };
      }
    }
    return result;
  }

  /**
   * Reset all group tracking
   */
  reset() {
    this.activeGroups = {};
    this.groupNames = [];
  }
}

// Singleton instance (per-VU)
const instance = new GroupMetrics();

// ============================================================
// Public API
// ============================================================

/**
 * Extract per-group metrics from the handleSummary data object.
 * Reads per-group Trend metrics (grp_dur_*) which k6 aggregates across VUs.
 * 
 * @param {object} data - k6 handleSummary data object
 * @returns {object|null} Per-group metrics or null if not available
 */
export function getMetricsFromData(data) {
  if (!data) return null;

  const summaryMetrics = extractGroupMetricsFromSummary(data);
  if (summaryMetrics && Object.keys(summaryMetrics).length > 0) {
    return summaryMetrics;
  }

  return null;
}

/**
 * Extract per-group metrics from k6's built-in summary data.
 * 
 * Reads per-group Trend metrics (grp_dur_*, grp_err_*, grp_cnt_*)
 * which are automatically aggregated across all VUs by k6.
 * Also reads per-group check data from the root_group hierarchy.
 * 
 * @param {object} data - k6 handleSummary data object
 * @returns {object|null} Per-group metrics or null if not available
 */
export function extractGroupMetricsFromSummary(data) {
  if (!data || !data.metrics) return null;

  const result = {};

  // Collect group names from root_group
  const checkData = {};
  const groupNames = [];

  if (data.root_group && data.root_group.groups) {
    function walk(group) {
      if (!group || !group.name) return;
      if (!groupNames.includes(group.name)) {
        groupNames.push(group.name);
      }

      let passes = 0;
      let fails = 0;
      if (group.checks) {
        for (const c of group.checks) {
          passes += parseInt(c.passes) || 0;
          fails += parseInt(c.fails) || 0;
        }
      }
      checkData[group.name] = { passes, fails, total: passes + fails };

      if (group.groups) {
        for (const sub of group.groups) {
          walk(sub);
        }
      }
    }
    for (const g of data.root_group.groups) {
      walk(g);
    }
  }

  // Calculate test duration for throughput
  let testDurationSec = 0;
  if (data.state && data.state.testRunDurationMs) {
    testDurationSec = data.state.testRunDurationMs / 1000;
  }
  if (!testDurationSec && data.metrics.iteration_duration && data.metrics.iteration_duration.values) {
    testDurationSec = (data.metrics.iteration_duration.values.max || 0) / 1000;
  }

  // Read per-group metrics from dedicated Trend/Counter/Rate metrics
  for (const name of groupNames) {
    const durMetricName = getGroupMetricName(name, 'grp_dur_');
    const cntMetricName = getGroupMetricName(name, 'grp_cnt_');
    const errMetricName = getGroupMetricName(name, 'grp_err_');

    const durMetric = data.metrics[durMetricName];
    const cntMetric = data.metrics[cntMetricName];
    const errMetric = data.metrics[errMetricName];

    result[name] = {
      avgResponseTime: 0,
      minDuration: 0,
      maxDuration: 0,
      p90: 0,
      p95: 0,
      requestCount: 0,
      errorCount: 0,
      throughput: 0,
    };

    // HTTP timing from per-group Trend metric
    if (durMetric && durMetric.type === 'trend' && durMetric.values) {
      result[name].avgResponseTime = durMetric.values.avg || 0;
      result[name].minDuration = durMetric.values.min || 0;
      result[name].maxDuration = durMetric.values.max || 0;
      result[name].p90 = durMetric.values['p(90)'] || 0;
      result[name].p95 = durMetric.values['p(95)'] || 0;
    }

    // Request count from Counter metric
    if (cntMetric && cntMetric.type === 'counter' && cntMetric.values) {
      result[name].requestCount = cntMetric.values.count || 0;
    }

    // Error count from Rate + Counter
    if (errMetric && errMetric.type === 'rate' && errMetric.values) {
      const rate = errMetric.values.rate || 0;
      const count = result[name].requestCount || 1;
      result[name].errorCount = Math.round(rate * count);
    }

    // Supplement with check data if available
    if (checkData[name]) {
      if (result[name].requestCount === 0) {
        result[name].requestCount = checkData[name].total;
      }
      if (checkData[name].fails > 0) {
        result[name].errorCount = checkData[name].fails;
      }
    }

    // Throughput
    if (testDurationSec > 0 && result[name].requestCount > 0) {
      result[name].throughput = result[name].requestCount / testDurationSec;
    }
  }

  return Object.keys(result).length > 0 ? result : null;
}

export default instance;
export { GroupMetrics, getGroupMetricName };