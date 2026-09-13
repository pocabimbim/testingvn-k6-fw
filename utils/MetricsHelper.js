import { Trend, Rate, Counter, Gauge } from 'k6/metrics';

/**
 * MetricsHelper - Utility for creating and managing custom metrics
 */
class MetricsHelper {
  constructor() {
    this.metrics = {};
  }

  /**
   * Create a Trend metric (tracks time-series values)
   */
  createTrend(name, tags = {}) {
    if (!this.metrics[name]) {
      this.metrics[name] = {
        instance: new Trend(name),
        type: 'trend',
        tags,
      };
    }
    return this.metrics[name].instance;
  }

  /**
   * Create a Rate metric (tracks pass/fail ratio)
   */
  createRate(name, tags = {}) {
    if (!this.metrics[name]) {
      this.metrics[name] = {
        instance: new Rate(name),
        type: 'rate',
        tags,
      };
    }
    return this.metrics[name].instance;
  }

  /**
   * Create a Counter metric (tracks cumulative count)
   */
  createCounter(name, tags = {}) {
    if (!this.metrics[name]) {
      this.metrics[name] = {
        instance: new Counter(name),
        type: 'counter',
        tags,
      };
    }
    return this.metrics[name].instance;
  }

  /**
   * Create a Gauge metric (tracks min/max/last values)
   */
  createGauge(name, tags = {}) {
    if (!this.metrics[name]) {
      this.metrics[name] = {
        instance: new Gauge(name),
        type: 'gauge',
        tags,
      };
    }
    return this.metrics[name].instance;
  }

  /**
   * Add a value to a Trend metric
   */
  addTrend(name, value, tags = {}) {
    const metric = this.metrics[name];
    if (metric && metric.type === 'trend') {
      metric.instance.add(value, { ...metric.tags, ...tags });
    }
  }

  /**
   * Add a value to a Rate metric
   */
  addRate(name, value, tags = {}) {
    const metric = this.metrics[name];
    if (metric && metric.type === 'rate') {
      metric.instance.add(value, { ...metric.tags, ...tags });
    }
  }

  /**
   * Increment a Counter metric
   */
  incrementCounter(name, value = 1, tags = {}) {
    const metric = this.metrics[name];
    if (metric && metric.type === 'counter') {
      metric.instance.add(value, { ...metric.tags, ...tags });
    }
  }

  /**
   * Set a Gauge metric value
   */
  setGauge(name, value, tags = {}) {
    const metric = this.metrics[name];
    if (metric && metric.type === 'gauge') {
      metric.instance.add(value, { ...metric.tags, ...tags });
    }
  }

  /**
   * Get a metric by name
   */
  getMetric(name) {
    return this.metrics[name] ? this.metrics[name].instance : null;
  }
}

export default MetricsHelper;
