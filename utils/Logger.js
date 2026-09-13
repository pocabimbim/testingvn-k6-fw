/**
 * Logger - Utility for structured logging in k6 tests
 */
class Logger {
  constructor(level = 'info') {
    this.level = level;
    this.levels = { error: 0, warn: 1, info: 2, debug: 3 };
  }

  /**
   * Check if a log level is enabled
   */
  isEnabled(level) {
    return this.levels[level] <= this.levels[this.level];
  }

  /**
   * Log an error message
   */
  error(message, data = null) {
    if (this.isEnabled('error')) {
      console.error(JSON.stringify({ level: 'ERROR', message, data, timestamp: new Date().toISOString() }));
    }
  }

  /**
   * Log a warning message
   */
  warn(message, data = null) {
    if (this.isEnabled('warn')) {
      console.warn(JSON.stringify({ level: 'WARN', message, data, timestamp: new Date().toISOString() }));
    }
  }

  /**
   * Log an info message
   */
  info(message, data = null) {
    if (this.isEnabled('info')) {
      console.log(JSON.stringify({ level: 'INFO', message, data, timestamp: new Date().toISOString() }));
    }
  }

  /**
   * Log a debug message
   */
  debug(message, data = null) {
    if (this.isEnabled('debug')) {
      console.log(JSON.stringify({ level: 'DEBUG', message, data, timestamp: new Date().toISOString() }));
    }
  }

  /**
   * Log request details
   */
  logRequest(method, url, status, duration) {
    this.info(`${method} ${url}`, { status, duration: `${duration}ms` });
  }

  /**
   * Log check results
   */
  logCheck(name, passed) {
    const level = passed ? 'info' : 'error';
    this[level](`Check: ${name}`, { passed });
  }
}

export default Logger;
