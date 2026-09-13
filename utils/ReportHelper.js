/**
 * ReportHelper - Generates HTML reports using k6-reporter
 * 
 * Uses the handleSummary() function in k6 to generate an HTML report
 * after the test run completes.
 * 
 * Usage:
 *   import { ReportHelper } from '../utils/index.js';
 *   
 *   export function handleSummary(data) {
 *     return ReportHelper.generateSummary(data, {
 *       title: 'My Test Report',
 *       theme: 'default',
 *     });
 *   }
 * 
 * Reference: https://github.com/benc-uk/k6-reporter
 */

import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/3.0.4/dist/bundle.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.1.0/index.js';

class ReportHelper {
  /**
   * Generate HTML report from k6 summary data
   * @param {object} data - The k6 handleSummary data object
   * @param {object} options - Report options
   * @param {string} options.title - Report title (default: 'k6 Test Report - {date}')
   * @param {string} options.theme - Theme: 'default', 'classic', 'bootstrap', 'bootswatch:darkly'
   * @param {string} options.filename - Output filename (default: 'report.html')
   * @returns {object} Summary object for k6 handleSummary
   */
  static generateSummary(data, options = {}) {
    const title = options.title || `k6 Test Report - ${new Date().toISOString()}`;
    const theme = options.theme || 'default';
    const filename = options.filename || 'report.html';

    return {
      [filename]: htmlReport(data, { title, theme }),
    };
  }

  /**
   * Generate both HTML report and text summary (stdout)
   * @param {object} data - The k6 handleSummary data object
   * @param {object} options - Report options
   * @returns {object} Summary object with HTML file and text output
   */
  static generateFullSummary(data, options = {}) {
    const title = options.title || `k6 Test Report - ${new Date().toISOString()}`;
    const theme = options.theme || 'default';
    const filename = options.filename || 'report.html';

    return {
      [filename]: htmlReport(data, { title, theme }),
      stdout: textSummary(data, { indent: '  ', enableColors: true }),
    };
  }

  /**
   * Generate HTML report with default settings
   * @param {object} data - The k6 handleSummary data object
   * @returns {object} Summary object for k6 handleSummary
   */
  static defaultReport(data) {
    return ReportHelper.generateSummary(data, {
      title: 'k6 Test Report',
      theme: 'default',
    });
  }

  /**
   * Generate HTML report with bootstrap theme
   * @param {object} data - The k6 handleSummary data object
   * @returns {object} Summary object for k6 handleSummary
   */
  static bootstrapReport(data) {
    return ReportHelper.generateSummary(data, {
      title: 'k6 Test Report',
      theme: 'bootstrap',
    });
  }

  /**
   * Generate HTML report with a bootswatch theme
   * @param {object} data - The k6 handleSummary data object
   * @param {string} swatch - Bootswatch theme name (e.g., 'darkly', 'cerulean', 'cosmo')
   * @returns {object} Summary object for k6 handleSummary
   */
  static bootswatchReport(data, swatch = 'darkly') {
    return ReportHelper.generateSummary(data, {
      title: 'k6 Test Report',
      theme: `bootswatch:${swatch}`,
    });
  }

  /**
   * Generate HTML report with classic theme
   * @param {object} data - The k6 handleSummary data object
   * @returns {object} Summary object for k6 handleSummary
   */
  static classicReport(data) {
    return ReportHelper.generateSummary(data, {
      title: 'k6 Test Report',
      theme: 'classic',
    });
  }
}

export default ReportHelper;
