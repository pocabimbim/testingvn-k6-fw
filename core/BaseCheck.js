import { check, group } from 'k6';

/**
 * BaseCheck - Provides reusable assertion/check utilities
 * Encapsulates common response validation patterns
 */
class BaseCheck {
  /**
   * Check HTTP status code
   */
  static statusIs(response, expectedStatus) {
    return check(response, {
      [`status is ${expectedStatus}`]: (r) => r.status === expectedStatus,
    });
  }

  /**
   * Check that status is in a range of success codes
   */
  static statusIsSuccessful(response) {
    return check(response, {
      'status is 2xx': (r) => r.status >= 200 && r.status < 300,
    });
  }

  /**
   * Check response time is under threshold
   */
  static responseTimeBelow(response, thresholdMs) {
    return check(response, {
      [`response time < ${thresholdMs}ms`]: (r) => r.timings.duration < thresholdMs,
    });
  }

  /**
   * Check response body contains a string
   */
  static bodyContains(response, text) {
    return check(response, {
      [`body contains "${text}"`]: (r) => r.body.includes(text),
    });
  }

  /**
   * Check response body matches a regex pattern
   */
  static bodyMatches(response, pattern) {
    return check(response, {
      [`body matches pattern`]: (r) => pattern.test(r.body),
    });
  }

  /**
   * Check response has a specific header
   */
  static hasHeader(response, headerName, expectedValue = null) {
    const headers = response.headers;
    const headerKeys = Object.keys(headers).map((k) => k.toLowerCase());
    const hasHeader = headerKeys.includes(headerName.toLowerCase());

    if (expectedValue === null) {
      return check(response, {
        [`has header "${headerName}"`]: () => hasHeader,
      });
    }

    return check(response, {
      [`header "${headerName}" = "${expectedValue}"`]: () => {
        if (!hasHeader) return false;
        const actualKey = Object.keys(headers).find((k) => k.toLowerCase() === headerName.toLowerCase());
        return headers[actualKey] === expectedValue;
      },
    });
  }

  /**
   * Check JSON response body has a field with expected value
   */
  static jsonFieldEquals(response, fieldPath, expectedValue) {
    let body;
    try {
      body = JSON.parse(response.body);
    } catch {
      return check(response, {
        [`json field "${fieldPath}" = "${expectedValue}"`]: () => false,
      });
    }

    const actualValue = fieldPath.split('.').reduce((obj, key) => {
      return obj && obj[key] !== undefined ? obj[key] : undefined;
    }, body);

    return check(response, {
      [`json field "${fieldPath}" = "${expectedValue}"`]: () => actualValue === expectedValue,
    });
  }

  /**
   * Run multiple checks at once
   */
  static runChecks(response, checkDefinitions) {
    const checks = {};
    for (const [name, fn] of Object.entries(checkDefinitions)) {
      checks[name] = fn;
    }
    return check(response, checks);
  }

  /**
   * Custom check with a user-defined function
   */
  static custom(response, name, checkFn) {
    return check(response, { [name]: checkFn });
  }
}

export default BaseCheck;
