import http from 'k6/http';
import { check } from 'k6';
import GroupMetrics from '../utils/GroupMetrics.js';

/**
 * BaseRequest - Abstract base class for all API requests
 * Provides common HTTP methods and response handling
 */
class BaseRequest {
  constructor(baseURL = '', defaultHeaders = {}) {
    this.baseURL = baseURL;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'User-Agent': 'K6-OOP-Framework/1.0',
      ...defaultHeaders,
    };
    this.currentGroup = null;
  }

  /**
   * Set the current group name for metrics tracking
   * @param {string|null} groupName
   */
  setGroup(groupName) {
    this.currentGroup = groupName;
  }

  /**
   * Build full URL from path
   */
  buildURL(path) {
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }
    return `${this.baseURL}${path}`;
  }

  /**
   * Merge headers with defaults
   */
  mergeHeaders(headers = {}) {
    return { ...this.defaultHeaders, ...headers };
  }

  /**
   * Build request params object
   */
  buildParams(headers = {}, tags = {}, timeout = '30s') {
    return {
      headers: this.mergeHeaders(headers),
      tags: { request_type: 'api', ...tags },
      timeout,
    };
  }

  /**
   * Track a request in GroupMetrics
   * @private
   */
  _trackRequest(groupName, response) {
    if (groupName && GroupMetrics) {
      const duration = response.timings ? response.timings.duration : 0;
      const success = response.status >= 200 && response.status < 500;
      GroupMetrics.recordRequest(groupName, duration, success);
    }
  }

  /**
   * Send a GET request
   */
  get(path, { headers = {}, tags = {}, params = null, timeout } = {}) {
    const url = params ? `${this.buildURL(path)}?${params}` : this.buildURL(path);
    const requestParams = this.buildParams(headers, tags, timeout);
    const resp = http.get(url, requestParams);
    this._trackRequest(this.currentGroup, resp);
    return resp;
  }

  /**
   * Send a POST request
   */
  post(path, body = null, { headers = {}, tags = {}, timeout } = {}) {
    const url = this.buildURL(path);
    const requestParams = this.buildParams(headers, tags, timeout);
    const payload = typeof body === 'object' && body !== null ? JSON.stringify(body) : body;
    const resp = http.post(url, payload, requestParams);
    this._trackRequest(this.currentGroup, resp);
    return resp;
  }

  /**
   * Send a PUT request
   */
  put(path, body = null, { headers = {}, tags = {}, timeout } = {}) {
    const url = this.buildURL(path);
    const requestParams = this.buildParams(headers, tags, timeout);
    const payload = typeof body === 'object' && body !== null ? JSON.stringify(body) : body;
    const resp = http.put(url, payload, requestParams);
    this._trackRequest(this.currentGroup, resp);
    return resp;
  }

  /**
   * Send a PATCH request
   */
  patch(path, body = null, { headers = {}, tags = {}, timeout } = {}) {
    const url = this.buildURL(path);
    const requestParams = this.buildParams(headers, tags, timeout);
    const payload = typeof body === 'object' && body !== null ? JSON.stringify(body) : body;
    const resp = http.patch(url, payload, requestParams);
    this._trackRequest(this.currentGroup, resp);
    return resp;
  }

  /**
   * Send a DELETE request
   */
  del(path, { headers = {}, tags = {}, timeout } = {}) {
    const url = this.buildURL(path);
    const requestParams = this.buildParams(headers, tags, timeout);
    const resp = http.del(url, null, requestParams);
    this._trackRequest(this.currentGroup, resp);
    return resp;
  }

  /**
   * Send a request with a custom method
   */
  request(method, path, body = null, { headers = {}, tags = {}, timeout } = {}) {
    const url = this.buildURL(path);
    const requestParams = this.buildParams(headers, tags, timeout);
    const payload = typeof body === 'object' && body !== null ? JSON.stringify(body) : body;
    const resp = http.request(method.toUpperCase(), url, payload, requestParams);
    this._trackRequest(this.currentGroup, resp);
    return resp;
  }

  /**
   * Parse JSON response safely
   */
  parseJSON(response) {
    try {
      return JSON.parse(response.body);
    } catch (e) {
      console.error(`Failed to parse JSON response: ${e.message}`);
      return null;
    }
  }

  /**
   * Check response status and conditions
   */
  checkResponse(response, checks = {}) {
    return check(response, checks);
  }
}

export default BaseRequest;
