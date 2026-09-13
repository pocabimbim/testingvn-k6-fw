import BaseTest from './BaseTest.js';

/**
 * DataDrivenTest - Extends BaseTest with data-driven testing capabilities
 * Allows running the same test logic with multiple data sets
 */
class DataDrivenTest extends BaseTest {
  constructor(config = {}) {
    super(config);
    this.dataSource = config.dataSource || null;
    this.currentRecord = null;
    this.currentIndex = 0;
  }

  /**
   * Load test data from a JSON file
   */
  loadData(filePath) {
    try {
      const rawData = JSON.parse(open(filePath));
      this.dataSource = Array.isArray(rawData) ? rawData : [rawData];
      this.log(`Loaded ${this.dataSource.length} data records from ${filePath}`);
      return this.dataSource;
    } catch (e) {
      this.log(`Failed to load data from ${filePath}: ${e.message}`, 'error');
      this.dataSource = [];
      return [];
    }
  }

  /**
   * Get the current data record based on VU number
   */
  getDataRecord() {
    if (!this.dataSource || this.dataSource.length === 0) {
      return null;
    }
    // Distribute data across VUs using modulo
    const index = (__VU - 1) % this.dataSource.length;
    this.currentIndex = index;
    this.currentRecord = this.dataSource[index];
    return this.currentRecord;
  }

  /**
   * Get a random data record
   */
  getRandomRecord() {
    if (!this.dataSource || this.dataSource.length === 0) {
      return null;
    }
    const index = Math.floor(Math.random() * this.dataSource.length);
    this.currentIndex = index;
    this.currentRecord = this.dataSource[index];
    return this.currentRecord;
  }

  /**
   * Get all data records
   */
  getAllRecords() {
    return this.dataSource || [];
  }

  /**
   * Get the count of data records
   */
  getRecordCount() {
    return this.dataSource ? this.dataSource.length : 0;
  }

  /**
   * Run test for each data record (iterates through all records)
   */
  runForEachRecord(testFn) {
    if (!this.dataSource) {
      this.log('No data source loaded', 'error');
      return;
    }

    for (let i = 0; i < this.dataSource.length; i++) {
      this.currentIndex = i;
      this.currentRecord = this.dataSource[i];
      testFn(this.currentRecord, i);
    }
  }
}

export default DataDrivenTest;
