/**
 * GroupReportHelper - Generates HTML reports with per-group metrics
 * 
 * Extends the standard k6-reporter with a custom "Group Metrics" tab
 * that shows response time, throughput, error rate, and call count
 * for each named group.
 * 
 * Usage:
 *   import { GroupReportHelper } from '../utils/index.js';
 *   
 *   export function handleSummary(data) {
 *     return GroupReportHelper.generateWithGroupMetrics(data, {
 *       title: 'My Test Report',
 *       theme: 'bootstrap',
 *     });
 *   }
 */

import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/3.0.4/dist/bundle.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.1.0/index.js';
import { getMetricsFromData, extractGroupMetricsFromSummary } from './GroupMetrics.js';

class GroupReportHelper {
  /**
   * Extract per-group metrics from the k6 summary data
   * 
   * Extracts group info from data.root_group and enriches it with
   * per-group response time stats read from k6's built-in aggregated
   * metrics in the summary data (see extractGroupMetricsFromSummary()).
   * 
   * @param {object} data - k6 handleSummary data
   * @returns {Array} Array of group metric objects
   */
  static extractGroupMetrics(data) {
    const groups = [];
    
    // Get the per-group metrics from the summary data
    let groupMetricsData = getMetricsFromData(data);
    
    // If no metrics found from any source, try the legacy fallback
    if (!groupMetricsData || Object.keys(groupMetricsData).length === 0) {
      const summaryMetrics = extractGroupMetricsFromSummary(data);
      if (summaryMetrics) {
        groupMetricsData = summaryMetrics;
      }
    }
    
    // Helper to get a formatted value or '-'
    const fmt = (val, decimals = 2) => {
      if (val === undefined || val === null || val === '-' || isNaN(val)) return '-';
      return Number(val).toFixed(decimals) + 'ms';
    };
    
    /**
     * Get per-group stats from the metrics snapshot
     */
    function getGroupStats(groupName) {
      const result = {
        avgDuration: '-',
        minDuration: '-',
        maxDuration: '-',
        p90Duration: '-',
        p95Duration: '-',
        requestCount: 0,
        errorCount: 0,
        throughput: '-',
      };
      
      if (groupMetricsData) {
        // Try to find metrics for this specific group name
        if (groupMetricsData[groupName]) {
          const gm = groupMetricsData[groupName];
          result.avgDuration = fmt(gm.avgResponseTime);
          result.minDuration = fmt(gm.minDuration);
          result.maxDuration = fmt(gm.maxDuration);
          result.p90Duration = fmt(gm.p90);
          result.p95Duration = fmt(gm.p95);
          result.requestCount = gm.requestCount || 0;
          result.errorCount = gm.errorCount || 0;
          if (gm.throughput && gm.throughput > 0) {
            result.throughput = Number(gm.throughput).toFixed(2) + '/s';
          }
        }
      }
      
      return result;
    }
    
    function walkGroup(group, parentName = '') {
      if (!group) return;
      
      const fullName = group.name || parentName;
      
      // Count checks in this group
      let totalPasses = 0;
      let totalFails = 0;
      let checkCount = 0;
      
      if (group.checks) {
        for (const check of group.checks) {
          totalPasses += parseInt(check.passes) || 0;
          totalFails += parseInt(check.fails) || 0;
          checkCount++;
        }
      }
      
      // Get per-group response time stats
      const stats = getGroupStats(fullName);
      
      groups.push({
        name: fullName,
        checkCount,
        passes: totalPasses,
        fails: totalFails,
        totalChecks: totalPasses + totalFails,
        passRate: totalPasses + totalFails > 0 
          ? ((totalPasses / (totalPasses + totalFails)) * 100).toFixed(2) + '%' 
          : '-',
        avgDuration: stats.avgDuration,
        minDuration: stats.minDuration,
        maxDuration: stats.maxDuration,
        p90Duration: stats.p90Duration,
        p95Duration: stats.p95Duration,
        requestCount: stats.requestCount,
        errorCount: stats.errorCount,
        throughput: stats.throughput,
        children: [],
      });
      
      // Process sub-groups
      if (group.groups) {
        for (const subGroup of group.groups) {
          const child = walkGroup(subGroup, subGroup.name);
          if (child) {
            groups[groups.length - 1].children.push(child);
          }
        }
      }
      
      return groups[groups.length - 1];
    }
    
    // Walk root groups
    if (data.root_group && data.root_group.groups) {
      for (const group of data.root_group.groups) {
        walkGroup(group);
      }
    }
    
    return groups;
  }

  /**
   * Generate the per-group metrics HTML table
   * @param {Array} groups - Array of group metric objects
   * @param {object} data - k6 handleSummary data (for throughput)
   * @returns {string} HTML string
   */
  static generateGroupMetricsTable(groups, data = {}) {
    if (!groups || groups.length === 0) {
      return `
        <div class="group-empty-state">
          <div class="group-empty-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#a0aec0" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
          </div>
          <h4>No Group Metrics Available</h4>
          <p>Group metrics appear here when your test scenarios use named k6 groups. Ensure your tests call <code>registerGroup()</code> and <code>GroupMetrics.recordRequest()</code> within group blocks.</p>
        </div>
      `;
    }

    let html = `
    <style>
      /* ---- Group Metrics Summary Cards ---- */
      .group-metrics-card {
        background: white;
        border-radius: 12px;
        padding: 1.5rem;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
        border: 1px solid #e2e8f0;
        margin-bottom: 1.5rem;
      }
      .group-metrics-card h3 {
        margin: 0 0 1.25rem 0;
        color: #2d3748;
        font-size: 1.15rem;
        font-weight: 600;
        padding-bottom: 0.75rem;
        border-bottom: 2px solid #e2e8f0;
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
      .group-metrics-card h3 .card-icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 28px;
        border-radius: 6px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        font-size: 0.8rem;
      }

      .group-summary-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 1rem;
        margin-bottom: 1.5rem;
      }
      .group-summary-item {
        position: relative;
        border-radius: 12px;
        padding: 1.25rem 1rem;
        color: white;
        overflow: hidden;
        transition: transform 0.2s, box-shadow 0.2s;
        box-shadow: 0 2px 8px rgba(0,0,0,0.08);
      }
      .group-summary-item:hover {
        transform: translateY(-3px);
        box-shadow: 0 8px 20px rgba(0,0,0,0.15);
      }
      .group-summary-item .card-bg-icon {
        position: absolute;
        top: 50%;
        right: 0.75rem;
        transform: translateY(-50%);
        font-size: 3rem;
        opacity: 0.12;
        pointer-events: none;
      }
      .group-summary-item .label {
        font-size: 0.72rem;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        opacity: 0.85;
        position: relative;
        z-index: 1;
        font-weight: 500;
      }
      .group-summary-item .value {
        font-size: 1.65rem;
        font-weight: 700;
        position: relative;
        z-index: 1;
        margin-top: 0.15rem;
        line-height: 1.2;
      }
      .group-summary-item.card-purple {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      }
      .group-summary-item.card-teal {
        background: linear-gradient(135deg, #4fd1c5 0%, #319795 100%);
      }
      .group-summary-item.card-green {
        background: linear-gradient(135deg, #68d391 0%, #48bb78 100%);
      }
      .group-summary-item.card-red {
        background: linear-gradient(135deg, #fc8181 0%, #f56565 100%);
      }
      .group-summary-item.card-amber {
        background: linear-gradient(135deg, #f6ad55 0%, #ed8936 100%);
      }
      .group-summary-item.card-indigo {
        background: linear-gradient(135deg, #7f9cf5 0%, #5a67d8 100%);
      }

      /* ---- Group Metrics Table ---- */
      .group-table-wrapper {
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
      }
      .group-metrics-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.85rem;
        min-width: 900px;
      }
      .group-metrics-table thead th {
        background: #f7fafc;
        color: #4a5568;
        padding: 10px 10px;
        text-align: left;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        font-size: 0.72rem;
        border-bottom: 2px solid #e2e8f0;
        position: sticky;
        top: 0;
        z-index: 2;
        white-space: nowrap;
      }
      .group-metrics-table thead th:first-child {
        border-radius: 8px 0 0 0;
      }
      .group-metrics-table thead th:last-child {
        border-radius: 0 8px 0 0;
      }
      .group-metrics-table tbody td {
        padding: 8px 10px;
        border-bottom: 1px solid #edf2f7;
        vertical-align: middle;
      }
      .group-metrics-table tbody tr {
        transition: background 0.15s;
      }
      .group-metrics-table tbody tr:hover {
        background: #ebf4ff;
      }
      .group-metrics-table tbody tr:nth-child(even) {
        background: #fafbfc;
      }
      .group-metrics-table tbody tr:nth-child(even):hover {
        background: #ebf4ff;
      }
      .group-metrics-table tbody tr.group-parent-row {
        border-top: 2px solid #e2e8f0;
      }
      .group-metrics-table .group-name {
        font-weight: 600;
        color: #2d3748;
        max-width: 220px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .group-metrics-table .group-name .group-indicator {
        display: inline-block;
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        margin-right: 8px;
        flex-shrink: 0;
      }
      .group-metrics-table .child-name {
        font-weight: 500;
        color: #4a5568;
        padding-left: 2rem !important;
        font-size: 0.83rem;
      }
      .group-metrics-table .child-name .child-indicator {
        color: #a0aec0;
        margin-right: 6px;
        font-size: 0.7rem;
      }

      /* Duration bar visualization */
      .group-metrics-table .dur-cell {
        position: relative;
      }
      .group-metrics-table .dur-bar {
        position: absolute;
        bottom: 4px;
        left: 10px;
        height: 3px;
        border-radius: 2px;
        opacity: 0.5;
        transition: width 0.3s ease;
      }
      .dur-bar.dur-fast { background: #48bb78; }
      .dur-bar.dur-medium { background: #ed8936; }
      .dur-bar.dur-slow { background: #fc8181; }

      /* Metric value coloring */
      .metric-dur-fast { color: #38a169; }
      .metric-dur-medium { color: #dd6b20; }
      .metric-dur-slow { color: #e53e3e; font-weight: 600; }
      .metric-neutral { color: #4a5568; }
      .metric-good { color: #38a169; font-weight: 600; }
      .metric-bad { color: #e53e3e; font-weight: 600; }
      .metric-muted { color: #a0aec0; }

      /* Pass rate pill */
      .pass-rate-pill {
        display: inline-block;
        padding: 2px 8px;
        border-radius: 10px;
        font-size: 0.78rem;
        font-weight: 600;
        min-width: 50px;
        text-align: center;
      }
      .pass-rate-pill.pill-good {
        background: #c6f6d5;
        color: #276749;
      }
      .pass-rate-pill.pill-bad {
        background: #fed7d7;
        color: #9b2c2c;
      }
      .pass-rate-pill.pill-none {
        background: #edf2f7;
        color: #718096;
      }

      /* Empty state */
      .group-empty-state {
        text-align: center;
        padding: 3rem 2rem;
        background: white;
        border-radius: 12px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
        border: 1px solid #e2e8f0;
      }
      .group-empty-state .group-empty-icon {
        margin-bottom: 1rem;
      }
      .group-empty-state h4 {
        color: #4a5568;
        margin: 0 0 0.5rem 0;
        font-size: 1.1rem;
      }
      .group-empty-state p {
        color: #a0aec0;
        font-size: 0.85rem;
        max-width: 500px;
        margin: 0 auto;
        line-height: 1.5;
      }
      .group-empty-state code {
        background: #edf2f7;
        padding: 1px 5px;
        border-radius: 3px;
        font-size: 0.8rem;
        color: #5a67d8;
      }
    </style>
    `;

    // Get overall throughput from http_reqs
    let overallThroughput = '-';
    if (data.metrics && data.metrics.http_reqs && data.metrics.http_reqs.values) {
      const rate = data.metrics.http_reqs.values.rate;
      if (rate !== undefined && !isNaN(rate)) {
        overallThroughput = Number(rate).toFixed(2) + '/s';
      }
    }

    // Summary cards
    const totalGroups = groups.length;
    const totalChecks = groups.reduce((sum, g) => sum + g.totalChecks, 0);
    const totalPasses = groups.reduce((sum, g) => sum + g.passes, 0);
    const totalFails = groups.reduce((sum, g) => sum + g.fails, 0);
    const totalRequests = groups.reduce((sum, g) => sum + g.requestCount, 0);
    const overallPassRate = totalChecks > 0 ? ((totalPasses / totalChecks) * 100).toFixed(1) + '%' : '-';

    html += `
    <div class="group-summary-grid">
      <div class="group-summary-item card-purple">
        <div class="card-bg-icon">📁</div>
        <div class="label">Groups</div>
        <div class="value">${totalGroups}</div>
      </div>
      <div class="group-summary-item card-teal">
        <div class="card-bg-icon">📊</div>
        <div class="label">Total Requests</div>
        <div class="value">${totalRequests}</div>
      </div>
      <div class="group-summary-item card-indigo">
        <div class="card-bg-icon">✓</div>
        <div class="label">Total Checks</div>
        <div class="value">${totalChecks}</div>
      </div>
      <div class="group-summary-item ${totalFails > 0 ? 'card-red' : 'card-green'}">
        <div class="card-bg-icon">${totalFails > 0 ? '✗' : '✔'}</div>
        <div class="label">Pass Rate</div>
        <div class="value">${overallPassRate}</div>
      </div>
      <div class="group-summary-item ${totalFails > 0 ? 'card-amber' : 'card-teal'}">
        <div class="card-bg-icon">⚡</div>
        <div class="label">Failures</div>
        <div class="value">${totalFails}</div>
      </div>
      <div class="group-summary-item card-purple">
        <div class="card-bg-icon">🚀</div>
        <div class="label">Throughput</div>
        <div class="value">${overallThroughput}</div>
      </div>
    </div>
    `;

    // Get per-group throughput from the extracted group metrics data
    const groupMetricsData = getMetricsFromData(data) || extractGroupMetricsFromSummary(data);
    const getThroughput = (groupName) => {
      if (groupMetricsData && groupMetricsData[groupName] && groupMetricsData[groupName].throughput > 0) {
        return Number(groupMetricsData[groupName].throughput).toFixed(2) + '/s';
      }
      if (overallThroughput !== '-') {
        return overallThroughput;
      }
      return '-';
    };

    /**
     * Classify a duration value for color coding and bar visualization.
     * Returns { cssClass, barClass, barPercent }
     */
    const classifyDuration = (val) => {
      if (val === '-' || val === undefined || val === null) return { cssClass: 'metric-muted', barClass: '', barPercent: 0 };
      const numVal = parseFloat(val);
      if (isNaN(numVal)) return { cssClass: 'metric-muted', barClass: '', barPercent: 0 };
      const barPercent = Math.min(100, (numVal / 500) * 100);
      if (numVal <= 200) return { cssClass: 'metric-dur-fast', barClass: 'dur-fast', barPercent };
      if (numVal <= 500) return { cssClass: 'metric-dur-medium', barClass: 'dur-medium', barPercent };
      return { cssClass: 'metric-dur-slow', barClass: 'dur-slow', barPercent };
    };

    // Find the max avg duration across all groups for relative bar sizing
    const parseDurationNum = (val) => {
      if (val === '-' || val === undefined || val === null) return 0;
      const num = parseFloat(val);
      return isNaN(num) ? 0 : num;
    };
    const allAvgDurs = groups.map(g => parseDurationNum(g.avgDuration)).filter(n => n > 0);
    const maxAvgDur = allAvgDurs.length > 0 ? Math.max(...allAvgDurs) : 500;

    const getBarPercent = (val) => {
      const num = parseDurationNum(val);
      if (num <= 0 || maxAvgDur <= 0) return 0;
      return Math.min(100, (num / maxAvgDur) * 100);
    };

    // Per-group table
    html += `
    <div class="group-metrics-card">
      <h3><span class="card-icon"><i class="fas fa-chart-line"></i></span> Per-Group Performance Breakdown</h3>
      <div class="group-table-wrapper">
      <table class="group-metrics-table">
        <thead>
          <tr>
            <th>Group</th>
            <th>Checks</th>
            <th>Avg</th>
            <th>Min</th>
            <th>Max</th>
            <th>P90</th>
            <th>P95</th>
            <th>Thru'put</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
    `;

    /**
     * Render a single group row (used for both parent and child groups)
     */
    const renderGroupRow = (group, isChild = false) => {
      const passRateClass = group.fails > 0 ? 'pill-bad' : (group.totalChecks > 0 ? 'pill-good' : 'pill-none');
      const passRateDisplay = group.totalChecks > 0 ? ((group.passes / group.totalChecks) * 100).toFixed(1) + '%' : '-';
      const throughput = getThroughput(group.name);
      const avgClass = classifyDuration(group.avgDuration);
      const p95Class = classifyDuration(group.p95Duration);

      const barPercent = getBarPercent(group.avgDuration);
      const barClass = avgClass.barClass;

      let rowHtml = '';
      if (isChild) {
        rowHtml += `
          <tr>
            <td class="child-name"><span class="child-indicator">└─</span>${group.name}</td>
            <td class="metric-neutral">${group.totalChecks}</td>
            <td class="dur-cell ${avgClass.cssClass}">
              ${group.avgDuration}
              ${barPercent > 0 ? `<span class="dur-bar ${barClass}" style="width:${barPercent}%"></span>` : ''}
            </td>
            <td class="${classifyDuration(group.minDuration).cssClass}">${group.minDuration}</td>
            <td class="${classifyDuration(group.maxDuration).cssClass}">${group.maxDuration}</td>
            <td class="${classifyDuration(group.p90Duration).cssClass}">${group.p90Duration}</td>
            <td class="${p95Class.cssClass}">${group.p95Duration}</td>
            <td class="metric-neutral">${throughput}</td>
            <td><span class="pass-rate-pill ${passRateClass}">${passRateDisplay}</span></td>
          </tr>
        `;
      } else {
        rowHtml += `
          <tr class="group-parent-row">
            <td class="group-name"><span class="group-indicator"></span>${group.name}</td>
            <td class="metric-neutral">${group.totalChecks}</td>
            <td class="dur-cell ${avgClass.cssClass}">
              ${group.avgDuration}
              ${barPercent > 0 ? `<span class="dur-bar ${barClass}" style="width:${barPercent}%"></span>` : ''}
            </td>
            <td class="${classifyDuration(group.minDuration).cssClass}">${group.minDuration}</td>
            <td class="${classifyDuration(group.maxDuration).cssClass}">${group.maxDuration}</td>
            <td class="${classifyDuration(group.p90Duration).cssClass}">${group.p90Duration}</td>
            <td class="${p95Class.cssClass}">${group.p95Duration}</td>
            <td class="metric-neutral">${throughput}</td>
            <td><span class="pass-rate-pill ${passRateClass}">${passRateDisplay}</span></td>
          </tr>
        `;
      }
      return rowHtml;
    };

    for (const group of groups) {
      html += renderGroupRow(group, false);

      // Render children (sub-groups) if any
      if (group.children && group.children.length > 0) {
        for (const child of group.children) {
          html += renderGroupRow(child, true);
        }
      }
    }

    html += `
        </tbody>
      </table>
      </div>
      <div style="display:flex; gap: 1rem; margin-top: 0.75rem; font-size: 0.7rem; color: #a0aec0; flex-wrap: wrap;">
        <span><span style="color:#48bb78;font-weight:600;">●</span> Fast (<200ms)</span>
        <span><span style="color:#ed8936;font-weight:600;">●</span> Medium (200-500ms)</span>
        <span><span style="color:#fc8181;font-weight:600;">●</span> Slow (>500ms)</span>
        <span style="margin-left: auto;">Bar width relative to max group avg</span>
      </div>
    </div>
    `;

    return html;
  }

  /**
   * Strip internal per-group metrics from the data object so they don't
   * appear with raw names (grp_cnt_*, grp_dur_*, grp_err_*) in the
   * standard report's "Custom Metrics" tab.
   * @param {object} data - k6 handleSummary data
   * @returns {object} Sanitized copy of data
   */
  static _stripGroupMetrics(data) {
    const copy = JSON.parse(JSON.stringify(data));
    if (!copy.metrics) return copy;

    const prefixes = ['grp_cnt_', 'grp_dur_', 'grp_err_'];
    const legacyNames = [
      'group_call_count', 'group_duration', 'group_error_rate',
      'group_request_count', 'group_response_time',
    ];

    for (const key of Object.keys(copy.metrics)) {
      if (prefixes.some(p => key.startsWith(p)) || legacyNames.includes(key)) {
        delete copy.metrics[key];
      }
    }

    return copy;
  }

  /**
   * Generate HTML report with embedded per-group metrics
   * @param {object} data - k6 handleSummary data
   * @param {object} options - Report options
   * @returns {object} Summary object for k6 handleSummary
   */
  static generateWithGroupMetrics(data, options = {}) {
    const title = options.title || `k6 Test Report - ${new Date().toISOString()}`;
    const theme = options.theme || 'bootstrap';
    const filename = options.filename || 'report.html';

    // Strip internal per-group metrics so they don't appear as ugly raw
    // metric names (grp_cnt_*, etc.) in the standard "Custom Metrics" tab
    const sanitizedData = this._stripGroupMetrics(data);

    // Generate standard HTML report from sanitized data
    const standardReport = htmlReport(sanitizedData, { title, theme });

    // Extract group metrics from the ORIGINAL data (still has grp_* metrics)
    const groups = this.extractGroupMetrics(data);
    const groupMetricsHtml = this.generateGroupMetricsTable(groups, data);

    // Inject the group metrics HTML into the report
    // We add it as a new tab or section after the "Checks & Groups" tab
    const enhancedReport = this._injectGroupMetrics(standardReport, groupMetricsHtml);

    return {
      [filename]: enhancedReport,
      stdout: textSummary(data, { indent: '  ', enableColors: true }),
    };
  }

  /**
   * Inject group metrics HTML into the standard report
   * @private
   */
  static _injectGroupMetrics(reportHtml, groupMetricsHtml) {
    // Find the closing </body> tag and inject before it
    // Or better: inject after the "Checks & Groups" tab section
    const searchPattern = '<!-- ---- end tab ---- -->';
    const lastIndex = reportHtml.lastIndexOf(searchPattern);
    
    if (lastIndex !== -1) {
      // Create a new tab for group metrics
      const groupTabHtml = `
          <!-- ---- Group Metrics Tab ---- -->
          <input type="radio" name="tabs" id="tabgroupmetrics">
          <label for="tabgroupmetrics"><i class="fas fa-chart-bar"></i> Group Metrics</label>
          <div class="tab">
            ${groupMetricsHtml}
          </div>
          <!-- ---- end tab ---- -->
      `;
      
      return reportHtml.slice(0, lastIndex + searchPattern.length) + 
             groupTabHtml + 
             reportHtml.slice(lastIndex + searchPattern.length);
    }

    // Fallback: inject before </body>
    const bodyEnd = reportHtml.lastIndexOf('</body>');
    if (bodyEnd !== -1) {
      const groupSection = `
        <div style="padding: 2rem; max-width: 1400px; margin: 0 auto;">
          <h2 style="margin: 2rem 0 1rem 0; padding-bottom: 0.75rem; border-bottom: 2px solid #e2e8f0; color: #2d3748;">
            <i class="fas fa-chart-bar"></i> Per-Group Metrics
          </h2>
          ${groupMetricsHtml}
        </div>
      `;
      return reportHtml.slice(0, bodyEnd) + groupSection + reportHtml.slice(bodyEnd);
    }

    return reportHtml;
  }

  /**
   * Generate standard report with group metrics (bootstrap theme)
   * @param {object} data - k6 handleSummary data
   * @param {object} options - Report options
   * @returns {object} Summary object for k6 handleSummary
   */
  static bootstrapWithGroupMetrics(data, options = {}) {
    return this.generateWithGroupMetrics(data, { ...options, theme: 'bootstrap' });
  }

  /**
   * Generate standard report with group metrics (default theme)
   * @param {object} data - k6 handleSummary data
   * @param {object} options - Report options
   * @returns {object} Summary object for k6 handleSummary
   */
  static defaultWithGroupMetrics(data, options = {}) {
    return this.generateWithGroupMetrics(data, { ...options, theme: 'default' });
  }
}

export default GroupReportHelper;