/**
 * DataGenerator - Utility for generating test data
 * Provides methods to create random test data on the fly
 */
class DataGenerator {
  /**
   * Generate a random string
   */
  static randomString(length = 10, prefix = '') {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = prefix;
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Generate a random email
   */
  static randomEmail(prefix = 'test') {
    const domain = ['example.com', 'test.org', 'mail.com'];
    const randomDomain = domain[Math.floor(Math.random() * domain.length)];
    return `${prefix}.${this.randomString(8)}@${randomDomain}`;
  }

  /**
   * Generate a random number between min and max
   */
  static randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Generate a random UUID v4
   */
  static randomUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /**
   * Generate a random phone number
   */
  static randomPhone() {
    const area = this.randomInt(200, 999);
    const prefix = this.randomInt(200, 999);
    const line = this.randomInt(1000, 9999);
    return `${area}-${prefix}-${line}`;
  }

  /**
   * Pick a random item from an array
   */
  static randomFrom(array) {
    return array[Math.floor(Math.random() * array.length)];
  }

  /**
   * Generate a random full name
   */
  static randomName() {
    const firstNames = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Hank', 'Ivy', 'Jack', 'Kate', 'Leo', 'Mia', 'Noah', 'Olivia', 'Pham', 'Quynh', 'Minh', 'Anh', 'Linh'];
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Nguyen', 'Tran', 'Le', 'Pham', 'Hoang'];
    return `${this.randomFrom(firstNames)} ${this.randomFrom(lastNames)}`;
  }

  /**
   * Generate a random user payload
   */
  static randomUserPayload() {
    return {
      username: this.randomString(8, 'user_'),
      password: this.randomString(12),
      email: this.randomEmail(),
    };
  }

  /**
   * Generate a timestamp string
   */
  static timestamp() {
    return new Date().toISOString();
  }
}

export default DataGenerator;
