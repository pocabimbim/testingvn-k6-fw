# k6 OOP Framework

A **production-ready** k6 load testing framework built with **Object-Oriented Programming** principles.

## Architecture

```
k6-fw/
├── core/               # Core framework classes
│   ├── BaseRequest.js  # HTTP request abstraction
│   ├── BaseCheck.js    # Reusable assertions/checks
│   ├── BaseTest.js     # Abstract base test class
│   └── DataDrivenTest.js # Data-driven test extension
├── config/             # Configuration management
│   ├── Settings.js     # Test settings & presets
│   └── Environment.js  # Multi-environment support
├── models/             # Data models
│   └── User.js         # User model with auth support
├── tests/              # Test scenarios
│   ├── UserLoginTest.js    # Login flow test
│   └── ApiHealthCheckTest.js # Health check test
├── utils/              # Utilities
│   ├── DataGenerator.js    # Random test data generation
│   ├── Logger.js           # Structured logging
│   ├── MetricsHelper.js    # Custom metrics management
│   └── ReportHelper.js     # HTML report generation
├── data/               # Test data files
├── main.js             # Entry point
├── TestRunner.js       # Test orchestrator
└── users.json          # Sample test data
```

## OOP Principles Applied

### 1. Encapsulation
- Each class manages its own state internally
- `BaseRequest` encapsulates HTTP methods and headers
- `User` model encapsulates user data and auth tokens
- `Settings` encapsulates all test configuration

### 2. Inheritance
- `DataDrivenTest` extends `BaseTest` with data loading capabilities
- `UserLoginTest` extends `DataDrivenTest` for login scenarios
- `ApiHealthCheckTest` extends `BaseTest` for health checks

### 3. Polymorphism
- All tests implement their own `run()` method
- Tests can override `setup()` and `teardown()` hooks
- `TestRunner` treats all tests uniformly via the base interface

### 4. Composition
- `BaseTest` composes `BaseRequest` and `BaseCheck`
- `TestRunner` composes multiple test instances
- `main.js` composes settings, environments, and tests

## Quick Start

### Prerequisites
- [k6](https://k6.io/docs/getting-started/installation/) installed

### Run Tests

```bash
# Run the main test suite (smoke test)
k6 run main.js

# Run with more VUs
k6 run --vus 5 --iterations 20 main.js

# Run with stages (load test)
# Edit main.js to use Settings.loadTest() then:
k6 run main.js
```

After running, an HTML report (`report.html`) will be generated automatically.

### Create a New Test

```javascript
import { BaseTest } from '../core/index.js';

class MyCustomTest extends BaseTest {
  constructor(config = {}) {
    super({
      name: 'My Custom Test',
      baseURL: config.baseURL || 'https://api.example.com',
      ...config,
    });
  }

  run() {
    this.executeGroup('My Test Group', () => {
      const response = this.request.get('/my-endpoint');
      this.check.statusIs(response, 200);
      this.check.responseTimeBelow(response, 1000);
    });
  }
}

export default MyCustomTest;
```

## Test Presets

| Preset | VUs | Duration | Description |
|--------|-----|----------|-------------|
| `smokeTest()` | 1 | 30s | Quick validation |
| `loadTest()` | 20 (ramp) | 9m | Average load |
| `stressTest()` | 50-100 (ramp) | 9m | High load |
| `spikeTest()` | 10-200 (spike) | 3.5m | Sudden spike |
| `soakTest()` | 50 | 8h+ | Endurance test |

## HTML Reports

The framework integrates [k6-reporter](https://github.com/benc-uk/k6-reporter) to generate beautiful HTML reports after each test run.

### How it works

The `ReportHelper` utility wraps the `htmlReport()` function from k6-reporter and integrates it with k6's `handleSummary()` callback. After your test completes, an HTML file is automatically written to the filesystem.

### Usage in main.js

```javascript
import { ReportHelper } from './utils/index.js';

export function handleSummary(data) {
  return ReportHelper.generateFullSummary(data, {
    title: 'My Test Report',
    theme: 'default',
    filename: 'report.html',
  });
}
```

### ReportHelper API

| Method | Description |
|--------|-------------|
| `generateSummary(data, options)` | Generate HTML report only |
| `generateFullSummary(data, options)` | Generate HTML report + text summary to stdout |
| `defaultReport(data)` | Default theme report |
| `bootstrapReport(data)` | Bootstrap 5 themed report |
| `bootswatchReport(data, swatch)` | Bootswatch themed report (e.g., 'darkly') |
| `classicReport(data)` | Classic theme report |

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `title` | string | `'k6 Test Report - {date}'` | Report title |
| `theme` | string | `'default'` | Theme: `default`, `classic`, `bootstrap`, `bootswatch:darkly` |
| `filename` | string | `'report.html'` | Output filename |

### Themes

- **default** - Modern, clean design (recommended)
- **classic** - Original chunky style
- **bootstrap** - Vanilla Bootstrap 5 styling
- **bootswatch:darkly** - Bootswatch themes (e.g., `cerulean`, `cyborg`, `darkly`)

## Features

- ✅ **OOP Design** - Clean, maintainable, reusable test code
- ✅ **Data-Driven Testing** - Load test data from JSON files
- ✅ **Multi-Environment** - Dev/Staging/Prod configurations
- ✅ **Custom Metrics** - Trend, Rate, Counter, Gauge support
- ✅ **Structured Logging** - Level-based logging (debug/info/warn/error)
- ✅ **Test Hooks** - Setup/Teardown lifecycle methods
- ✅ **Named Groups** - Organized test execution with k6 groups
- ✅ **Think Time** - Realistic user simulation
- ✅ **Auth Support** - Token management in User model
- ✅ **Test Runner** - Orchestrate multiple test scenarios
- ✅ **HTML Reports** - Beautiful HTML reports with k6-reporter
