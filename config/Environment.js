/**
 * Environment configuration class
 * Manages environment-specific settings like base URLs, timeouts, etc.
 */
class Environment {
  constructor(name, config) {
    this.name = name;
    this.baseURL = config.baseURL || '';
    this.timeout = config.timeout || '30s';
    this.thinkTime = config.thinkTime || 0;
    this.headers = config.headers || {};
    this.tags = config.tags || {};
  }

  /**
   * Get the full URL for a given path
   */
  getURL(path) {
    return `${this.baseURL}${path}`;
  }

  /**
   * Get default params with environment headers
   */
  getDefaultParams(customParams = {}) {
    return {
      headers: { ...this.headers, ...customParams.headers },
      timeout: customParams.timeout || this.timeout,
      tags: { ...this.tags, ...customParams.tags },
    };
  }
}

/**
 * Environment registry - holds all environment configurations
 */
class EnvironmentRegistry {
  constructor() {
    this.environments = {};
  }

  /**
   * Register an environment
   */
  register(name, config) {
    this.environments[name] = new Environment(name, config);
    return this;
  }

  /**
   * Get an environment by name
   */
  get(name) {
    const env = this.environments[name];
    if (!env) {
      throw new Error(`Environment "${name}" not found. Available: ${Object.keys(this.environments).join(', ')}`);
    }
    return env;
  }

  /**
   * Get all registered environment names
   */
  getNames() {
    return Object.keys(this.environments);
  }
}

export { Environment, EnvironmentRegistry };
