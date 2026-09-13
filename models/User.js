/**
 * User model - represents a test user
 */
class User {
  constructor({ id, username, password, email, role, metadata = {} }) {
    this.id = id;
    this.username = username;
    this.password = password;
    this.email = email || `${username}@test.com`;
    this.role = role || 'user';
    this.metadata = metadata;
    this.token = null;
    this.sessionData = {};
  }

  /**
   * Get login payload
   */
  getLoginPayload() {
    return JSON.stringify({
      username: this.username,
      password: this.password,
    });
  }

  /**
   * Set auth token after successful login
   */
  setToken(token) {
    this.token = token;
  }

  /**
   * Get auth headers for authenticated requests
   */
  getAuthHeaders(extraHeaders = {}) {
    if (!this.token) {
      return extraHeaders;
    }
    return {
      Authorization: `Bearer ${this.token}`,
      ...extraHeaders,
    };
  }

  /**
   * Store session data
   */
  setSessionData(key, value) {
    this.sessionData[key] = value;
  }

  /**
   * Get session data
   */
  getSessionData(key) {
    return this.sessionData[key];
  }

  /**
   * Create a User from a plain object
   */
  static fromJSON(data) {
    return new User(data);
  }

  /**
   * Create multiple Users from an array
   */
  static fromArray(dataArray) {
    return dataArray.map((data) => new User(data));
  }
}

export default User;
