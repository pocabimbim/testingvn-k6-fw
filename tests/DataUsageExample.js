/**
 * DataUsageExample.js
 * 
 * This file demonstrates ALL the ways to use test data from JSON files
 * with the k6 OOP Framework.
 * 
 * Run with: k6 run main.js
 */

import { DataDrivenTest, BaseTest } from '../core/index.js';
import { User } from '../models/index.js';

// ============================================================
// EXAMPLE 1: Using DataDrivenTest (Easiest - Built-in JSON support)
// ============================================================
class SimpleDataTest extends DataDrivenTest {
  constructor(config = {}) {
    super({
      name: 'Simple Data Test',
      baseURL: config.baseURL || 'https://example.com',
      ...config,
    });
  }

  setup() {
    // loadData() automatically parses JSON and stores in this.dataSource
    this.loadData('./users.json');
  }

  run() {
    // --- Way 1: Get record by VU index (round-robin) ---
    // VU 1 -> record[0], VU 2 -> record[1], VU 3 -> record[2], VU 4 -> record[0]...
    const record = this.getDataRecord();
    
    if (record) {
      console.log(`VU ${__VU} using record: ${record.username}`);
      
      // Access fields directly from the JSON
      const payload = JSON.stringify({
        username: record.username,
        password: record.password,
      });
      
      // Or convert to a User model for more features
      const user = User.fromJSON(record);
      console.log(`User model payload: ${user.getLoginPayload()}`);
    }
  }
}

// ============================================================
// EXAMPLE 2: Using random records
// ============================================================
class RandomDataTest extends DataDrivenTest {
  constructor(config = {}) {
    super({
      name: 'Random Data Test',
      baseURL: config.baseURL || 'https://example.com',
      ...config,
    });
  }

  setup() {
    this.loadData('./data/products.json');
  }

  run() {
    // --- Way 2: Get a random record each iteration ---
    const record = this.getRandomRecord();
    
    if (record) {
      console.log(`Random product: ${record.name} ($${record.price})`);
      
      // Use the data in API requests
      const res = this.request.get(`/api/products/${record.id}`);
      this.check.statusIs(res, 200);
    }
  }
}

// ============================================================
// EXAMPLE 3: Iterating through ALL records
// ============================================================
class IterateAllDataTest extends DataDrivenTest {
  constructor(config = {}) {
    super({
      name: 'Iterate All Data Test',
      baseURL: config.baseURL || 'https://example.com',
      ...config,
    });
  }

  setup() {
    this.loadData('./data/products.json');
    console.log(`Loaded ${this.getRecordCount()} products`);
  }

  run() {
    // --- Way 3: Loop through every record ---
    this.runForEachRecord((record, index) => {
      console.log(`[${index}] Testing product: ${record.name} (ID: ${record.id})`);
      
      this.executeGroup(`Product: ${record.name}`, () => {
        const res = this.request.get(`/api/products/${record.id}`);
        this.check.statusIs(res, 200);
        this.check.responseTimeBelow(res, 1000);
      });
    });
  }
}

// ============================================================
// EXAMPLE 4: Manual JSON loading in BaseTest
// ============================================================
class ManualDataTest extends BaseTest {
  constructor(config = {}) {
    super({
      name: 'Manual Data Test',
      baseURL: config.baseURL || 'https://example.com',
      ...config,
    });
    this.users = [];
  }

  setup() {
    // --- Way 4: Load JSON manually using k6's open() ---
    const rawData = JSON.parse(open('./users.json'));
    
    // Convert to User model instances
    this.users = User.fromArray(rawData);
    
    console.log(`Loaded ${this.users.length} users manually`);
  }

  run() {
    // Access data by VU index
    const index = (__VU - 1) % this.users.length;
    const user = this.users[index];
    
    console.log(`VU ${__VU} using user: ${user.username}`);
    
    // User model provides helper methods
    const payload = user.getLoginPayload();
    console.log(`Login payload: ${payload}`);
  }
}

// ============================================================
// EXAMPLE 5: Multiple data sources
// ============================================================
class MultiSourceTest extends DataDrivenTest {
  constructor(config = {}) {
    super({
      name: 'Multi-Source Data Test',
      baseURL: config.baseURL || 'https://example.com',
      ...config,
    });
    this.products = [];
  }

  setup() {
    // Load multiple JSON files
    this.loadData('./users.json');           // Stored in this.dataSource
    this.products = JSON.parse(open('./data/products.json'));  // Manual load
    
    console.log(`Users: ${this.getRecordCount()}, Products: ${this.products.length}`);
  }

  run() {
    // Use data from first source
    const user = this.getDataRecord();
    
    // Use data from second source
    const productIndex = (__VU - 1) % this.products.length;
    const product = this.products[productIndex];
    
    if (user && product) {
      console.log(`User ${user.username} buying ${product.name}`);
      
      // Combine data from multiple sources in requests
      const orderPayload = JSON.stringify({
        userId: user.id,
        productId: product.id,
        quantity: 1,
      });
      
      const res = this.request.post('/api/orders', orderPayload);
      this.check.statusIs(res, 201);
    }
  }
}

// ============================================================
// EXPORT all examples
// ============================================================
export {
  SimpleDataTest,
  RandomDataTest,
  IterateAllDataTest,
  ManualDataTest,
  MultiSourceTest,
};
