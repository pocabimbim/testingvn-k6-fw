/**
 * Utils module barrel export
 */
export { default as DataGenerator } from './DataGenerator.js';
export { default as Logger } from './Logger.js';
export { default as MetricsHelper } from './MetricsHelper.js';
export { default as ReportHelper } from './ReportHelper.js';
export { default as GroupMetrics, registerGroup, extractGroupMetricsFromSummary, getMetricsFromData } from './GroupMetrics.js';
export { default as GroupReportHelper } from './GroupReportHelper.js';
export {
  extractCatalogImages,
  extractWidgetImages,
  extractScriptAssets,
  extractProductLinks,
} from './HtmlExtractor.js';
