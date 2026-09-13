# k6 OOP Framework

A **k6 performance-testing framework** built on Object-Oriented principles. It ships a reusable core (`BaseTest`, `BaseRequest`, `BaseCheck`, `DataDrivenTest`), ready-to-run end-to-end scenarios, per-group metrics with a dedicated report tab, dynamic HTML resource correlation, and HTML reports.

> **Framework tag:** `k6-oop` · **Default SUT:** `https://tvn-sut.info` (EverShop demo store)

---

## Features

- ✅ **OOP core** — `BaseTest` / `BaseRequest` / `BaseCheck` / `DataDrivenTest`
- ✅ **Ready-to-run scenarios** — sign-in, registration, product browse, parallel
- ✅ **Dynamic resource correlation** — catalog images, banner images, JS bundles and product links are parsed from each page's HTML (`HtmlExtractor`); **no hard-coded asset URLs**
- ✅ **Per-group metrics** — response time, error rate and call count per k6 group, plus a custom **Group Metrics** tab in the HTML report
- ✅ **HTML reports** — via [k6-reporter](https://github.com/benc-uk/k6-reporter)
- ✅ **Data-driven testing** — `SharedArray` + JSON data files (round-robin, random, iterate-all)
- ✅ **Config presets** — smoke / load / stress / spike / soak + multi-environment registry
- ✅ **Optional observability stack** — docker-compose with InfluxDB + Grafana

---

## Requirements

| Requirement | Notes |
| --- | --- |
| [k6](https://grafana.com/docs/k6/latest/set-up/install-k6/) **v1.8+** | Developed and verified with `k6 v1.8.1` |
| Internet access | The framework imports remote modules at runtime (`raw.githubusercontent.com`, `jslib.k6.io`) |
| Docker *(optional)* | Only for the InfluxDB / Grafana stack |

No Node/npm required — everything runs in the k6 runtime.

---

## Project structure

```
k6-fw/
├── core/                     # Framework base classes
│   ├── BaseRequest.js        # HTTP verbs, URL/header handling, per-group tracking
│   ├── BaseCheck.js          # Reusable assertions (status, time, body, JSON)
│   ├── BaseTest.js           # Abstract test: lifecycle, groups, think time, homepage flow
│   ├── DataDrivenTest.js     # BaseTest + JSON data loading
│   └── index.js
├── config/
│   ├── Settings.js           # Global settings + presets (smoke/load/stress/spike/soak)
│   ├── Environment.js        # Environment + EnvironmentRegistry
│   └── index.js
├── models/
│   ├── User.js               # User model (login payload, token, auth headers)
│   └── index.js
├── tests/                    # Test scenarios
│   ├── UserSignInTest.js
│   ├── UserRegistrationTest.js
│   ├── ProductBrowseTest.js
│   ├── UserLoginTest.js      # Minimal example
│   ├── ApiHealthCheckTest.js # Minimal example
│   ├── DataUsageExample.js   # 5 data-driven examples
│   └── index.js
├── utils/
│   ├── GroupMetrics.js       # Per-group k6 metrics (grp_*) + summary extraction
│   ├── GroupReportHelper.js  # HTML report + custom "Group Metrics" tab
│   ├── HtmlExtractor.js      # Correlate image / script / link URLs from HTML
│   ├── ReportHelper.js       # Wrapper around k6-reporter
│   ├── MetricsHelper.js      # Custom metric factory (Trend/Rate/Counter/Gauge)
│   ├── DataGenerator.js      # Random names, emails, strings, ints, UUIDs
│   ├── Logger.js             # Level-based structured logging
│   ├── RequestMetrics.js     # Per-URL metrics helpers (not wired into tests yet)
│   └── index.js
├── data/
│   ├── users.json            # Login accounts
│   └── products.json         # Product fixtures
├── docker/
│   ├── docker-compose.yml    # InfluxDB 1.12 + Grafana
│   └── grafana/dashboards/k6-response-time.json
├── run-signin.js             # Entry points
├── run-register.js
├── run-product.js
├── run-parallel.js
├── main.js
├── TestRunner.js             # Optional multi-test orchestrator (standalone)
└── loadproduct.js            # Original Grafana k6 Studio script (reference only)
```

---

## Quick start

```bash
k6 run run-signin.js      # Sign-in flow       -> signin-report.html
k6 run run-register.js    # Registration flow  -> register-report.html
k6 run run-product.js     # Product browsing   -> product-report.html
k6 run run-parallel.js    # Both in parallel   -> parallel-report.html
k6 run main.js            # Framework demo     -> report.html
```

Override the load from the CLI (k6 CLI options win over `options` in the script):

```bash
k6 run --vus 5 --iterations 20 run-signin.js
k6 run --stage 30s:10 --stage 1m:20 run-product.js
```

---

## Test scenarios

| Script | Test class | Flow | Load | Report |
| --- | --- | --- | --- | --- |
| `run-signin.js` | `UserSignInTest` | `POST /customer/login` → `GET /account/login?ajax=true` → `GET /` | 2 VUs / 2 iterations | `signin-report.html` |
| `run-register.js` | `UserRegistrationTest` | Browse homepage → account page → register page → register + login + verify | 2 VUs / 2 iterations | `register-report.html` |
| `run-product.js` | `ProductBrowseTest` | Sign in → browse homepage → `/accessories` → product detail | stages `0→20→20→0` VUs | `product-report.html` |
| `run-parallel.js` | `UserSignInTest` + `UserRegistrationTest` | Two k6 scenarios routed via `exec` | 2 VUs / 2 iterations each | `parallel-report.html` |
| `main.js` | `ApiHealthCheckTest`, `UserLoginTest`, `UserRegistrationTest` | Framework demonstration | `Settings.smokeTest()` | `report.html` |

All SUT scenarios target `https://tvn-sut.info` with `thinkTime: 1` and the shared thresholds:

```js
thresholds: {
  http_req_duration: ['p(95)<5000'],
  http_req_failed:   ['rate<0.10'],
}
```

### Named groups (metrics)

Each scenario runs its steps inside k6 groups, which become the per-group metric rows:

| Scenario | Groups |
| --- | --- |
| Sign-in | `Sign in` |
| Registration | `Browse Homepage`, `Load Account Page`, `Load Register Page`, `Sign Up Flow` |
| Product browse | `Sign In`, `Browse Homepage`, `Click on Shop Now button`, `View Product` |

> Groups must be **pre-registered at module-init time** with `registerGroup(...)` so k6 creates the per-group `Trend`/`Rate`/`Counter` metrics. Dynamic group names would break pre-registration, so keep names fixed.

---

## Configuration presets

`config/Settings.js` provides ready-made presets:

| Preset | VUs | Duration | Thresholds |
| --- | --- | --- | --- |
| `Settings.smokeTest()` | 1 | 30s | `p(95)<500`, `failed<1%` |
| `Settings.loadTest()` | ramp 0→20→20→0 | 9m | `p(95)<1000`, `p(99)<2000`, `failed<5%` |
| `Settings.stressTest()` | ramp 0→50→100→0 | 9m | `p(95)<2000`, `p(99)<3000`, `failed<10%` |
| `Settings.spikeTest()` | 10 → 200 → 0 | 3.5m | `p(95)<3000`, `failed<15%` |
| `Settings.soakTest()` | 50 held | 8h10m | `p(90)<800`, `p(95)<1200`, `failed<3%` |

```js
import { Settings } from './config/index.js';

const settings = Settings.smokeTest();
settings.baseURL = 'https://tvn-sut.info';
export const options = settings.getK6Options();
```

`config/Environment.js` exposes `Environment` and `EnvironmentRegistry` for multi-target runs (`dev` / `staging` / `prod`). See `main.js` for a working example.

---

## Core API

### `BaseTest` (`core/BaseTest.js`)

Every scenario extends `BaseTest` and implements `run()`.

| Member | Description |
| --- | --- |
| `setup()` / `teardown()` | Lifecycle hooks (override as needed) |
| `run()` | **Required** — the test logic |
| `executeGroup(name, fn)` | Runs `fn` inside a k6 group **and** starts/stops per-group metric tracking |
| `thinkTime(seconds?)` | Sleeps for `seconds`, or the configured `thinkTime` when omitted |
| `log(message, level?)` | Prefixed logging (`info` / `warn` / `error`) |
| `browseHomepage()` | GET `/`, load all referenced static resources, request favicon — all inside the `Browse Homepage` group |
| `loadStaticResources(html, referer)` | Correlate + load catalog images, banner images and JS bundles from a page |
| `loadFavicon(referer)` | Requests the browser-default `/favicon.ico` and asserts 404 |

Composed components: `this.request` (`BaseRequest`) and `this.check` (`BaseCheck`).

### `BaseRequest` (`core/BaseRequest.js`)

| Method | Notes |
| --- | --- |
| `get(path, { headers, tags, params, timeout })` | `params` is appended as a query string |
| `post(path, body, { ... })` | Objects are auto-`JSON.stringify`-ed |
| `put` / `patch` / `del` / `request(method, ...)` | Same option shape |
| `parseJSON(response)` | Safe JSON parse, returns `null` on failure |
| `setGroup(name)` | Sets the current group so requests are attributed to it |
| `buildURL(path)` | Absolute URLs pass through; otherwise prefixed with `baseURL` |
| `checkResponse(response, checks)` | Thin wrapper over k6 `check()` |

Default headers: `Content-Type: application/json`, `User-Agent: K6-OOP-Framework/1.0`. Every request is tagged `request_type: api` and timed into the current group.

### `BaseCheck` (`core/BaseCheck.js`)

| Assertion | Example |
| --- | --- |
| `statusIs(response, 200)` | exact status code |
| `statusIsSuccessful(response)` | 2xx |
| `responseTimeBelow(response, 1000)` | duration in ms |
| `bodyContains(response, text)` | substring match |
| `bodyMatches(response, regex)` | regex match |
| `hasHeader(response, name, value?)` | header presence / equality |
| `jsonFieldEquals(response, 'a.b', value)` | dotted-path JSON check |
| `custom(response, name, fn)` | arbitrary predicate |

### `DataDrivenTest` (`core/DataDrivenTest.js`)

Extends `BaseTest` with JSON data loading:

| Method | Description |
| --- | --- |
| `loadData(path)` | `JSON.parse(open(path))`, normalises to an array |
| `getDataRecord()` | Record for the current VU (`( __VU - 1) % length`) |
| `getRandomRecord()` | Random record per iteration |
| `getAllRecords()` / `getRecordCount()` | Introspection |
| `runForEachRecord((record, i) => ...)` | Iterate every record |

See `tests/DataUsageExample.js` for five complete patterns.

### `User` (`models/User.js`)

```js
const user = User.fromJSON({ username, password });
user.getLoginPayload();          // JSON string
user.setToken(token);
user.getAuthHeaders({ 'x-y': '1' });  // { Authorization: 'Bearer ...', ... }
User.fromArray(records);         // array of Users
```

---

## Dynamic resource correlation (`HtmlExtractor`)

Real browsers request every image, script and stylesheet the page references. Hard-coding those URLs makes tests brittle — so the framework **parses them out of the HTML** instead:

```js
import {
  extractCatalogImages,   // <img src="/images?src=%2Fassets%2Fcatalog%2F...">
  extractWidgetImages,    // <img src="/images?src=%2Fassets%2Fwidgets%2F...">
  extractScriptAssets,    // <script src="/assets/*.js">
  extractProductLinks,    // <a class="product__list__link" href="/cat/slug">
} from './utils/index.js';
```

- All helpers de-duplicate and convert HTML-encoded `&amp;` back to a raw `&` so the URL is valid.
- `extractCatalogImages(html, { width = 750, quality = 75 })` pins the `/images` resize endpoint to a rendering width.

`BaseTest.loadStaticResources(html, referer)` uses these to load every referenced asset with the correct `Accept` and `Referer` headers, asserting `200` on each.

**Why it matters:** when the SUT's catalog, slogans or JS bundle hashes change, the tests keep working with no code changes.

---

## Per-group metrics

k6's native `group()` gives you a hierarchy, but not per-group timing. The framework adds dedicated metrics **per group name**, aggregated across all VUs by k6 itself.

### How to use it

1. **Pre-register every group at module init** (top level of the test file):

```js
import { registerGroup } from '../utils/GroupMetrics.js';

registerGroup('Browse Homepage');
registerGroup('View Product');
```

2. **Wrap steps in `executeGroup`** (inherited from `BaseTest`):

```js
this.executeGroup('View Product', () => {
  const res = this.request.get('/accessories/modern-ceramic-vase-black');
  this.check.statusIs(res, 200);
});
```

### Metrics produced

| Metric | Type | Meaning |
| --- | --- | --- |
| `grp_dur_<group>` | `Trend` | Response time per group |
| `grp_err_<group>` | `Rate` | Error rate per group |
| `grp_cnt_<group>` | `Counter` | Request count per group |

Group names are sanitised (`Browse Homepage` → `grp_dur_Browse_Homepage`).

### Aggregation model

Per-VU snapshots **cannot** cross VU boundaries in k6, so the report reads the per-group `Trend`/`Rate`/`Counter` metrics from k6's aggregated summary:

- `getMetricsFromData(data)` — primary entry point for `handleSummary`
- `extractGroupMetricsFromSummary(data)` — walks `data.root_group` and joins it with the `grp_*` metrics

### Report integration

`GroupReportHelper.generateWithGroupMetrics(data, options)`:

1. strips the raw `grp_*` metrics so they don't clutter the standard **Custom Metrics** tab,
2. generates the normal k6-reporter HTML,
3. injects a **Group Metrics** tab with a per-group table (avg, p90/p95/p99, min/max, throughput, errors).

```js
export function handleSummary(data) {
  return GroupReportHelper.generateWithGroupMetrics(data, {
    title: 'User Registration Test - 2 VUs',
    theme: 'bootstrap',
    filename: 'register-report.html',
  });
}
```

| Method | Description |
| --- | --- |
| `generateWithGroupMetrics(data, options)` | HTML report with the Group Metrics tab + text summary |
| `bootstrapWithGroupMetrics(data, options)` | Same, forced to the `bootstrap` theme |
| `defaultWithGroupMetrics(data, options)` | Same, forced to the `default` theme |

---

## HTML reports (`ReportHelper`)

A thin wrapper around [k6-reporter](https://github.com/benc-uk/k6-reporter) for tests that don't need group metrics:

| Method | Description |
| --- | --- |
| `generateSummary(data, options)` | HTML report only |
| `generateFullSummary(data, options)` | HTML report + text summary on stdout |
| `defaultReport(data)` | Default theme |
| `bootstrapReport(data)` | Bootstrap 5 theme |
| `bootswatchReport(data, swatch)` | Bootswatch theme, e.g. `darkly` |
| `classicReport(data)` | Classic theme |

| Option | Type | Default |
| --- | --- | --- |
| `title` | string | `k6 Test Report - {date}` |
| `theme` | string | `default` |
| `filename` | string | `report.html` |

Themes: `default`, `classic`, `bootstrap`, `bootswatch:<swatch>` (e.g. `bootswatch:darkly`).

> Remote modules (`benc-uk/k6-reporter`, `jslib.k6.io`) are fetched by k6 **at run time**, so the first run needs internet access. To pin/vendor them, download the bundle into the repo and change the import in `utils/ReportHelper.js` / `utils/GroupReportHelper.js`.

---

## Test data

| File | Shape |
| --- | --- |
| `data/users.json` | `[{ "username", "password" }]` — login accounts |
| `data/products.json` | `[{ "id", "name", "price", "category" }]` |

Credentials are distributed across VUs with `( __VU - 1) % users.length`, and loaded once per test with `SharedArray`:

```js
import { SharedArray } from 'k6/data';

const allUsers = new SharedArray('users', () => {
  const raw = JSON.parse(open('../data/users.json'));
  return User.fromArray(raw);
});
```

`utils/DataGenerator.js` can generate random data at runtime (`randomName`, `randomEmail`, `randomString`, `randomInt`, `randomUUID`).

---

## Docker observability stack (optional)

`docker/docker-compose.yml` starts:

| Service | Image | Port | Notes |
| --- | --- | --- | --- |
| `influxdb` | `influxdb:1.12.4` | `8086` | Creates DB `k6`; admin `admin/admin123456`; app user `k6_user/k6_password` |
| `grafana` | `grafana/grafana` | `3000` | Persists to the `grafana-data` volume |

```bash
cd docker
docker compose up -d
```

Send k6 results to InfluxDB with the built-in output (not configured in the scripts — pass it on the CLI):

```bash
k6 run --out influxdb=http://k6_user:k6_password@localhost:8086/k6 run-product.js
```

Grafana then points at `http://influxdb:8086`, database `k6`, user `k6_user`, InfluxQL.

> ⚠️ The compose file only persists Grafana's data volume — it does **not** mount `docker/grafana/` for provisioning. The dashboard export `docker/grafana/dashboards/k6-response-time.json` must be imported manually (Grafana → Dashboards → Import), and the InfluxDB datasource added manually or by adding bind mounts:
> ```yaml
>     volumes:
>       - ./grafana/provisioning:/etc/grafana/provisioning
>       - ./grafana/dashboards:/var/lib/grafana/dashboards
> ```

> 🔐 The compose file ships **plaintext** credentials for local/demo use only. Change them before using this anywhere shared, and never commit real secrets.

---

## Creating a new test

```js
import { BaseTest } from '../core/index.js';
import { registerGroup } from '../utils/GroupMetrics.js';
import { extractCatalogImages } from '../utils/index.js';

// Required for per-group metrics — must run at module init time
registerGroup('My Group');

class MyCustomTest extends BaseTest {
  constructor(config = {}) {
    super({
      name: 'My Custom Test',
      baseURL: config.baseURL || 'https://tvn-sut.info',
      thinkTime: config.thinkTime || 1,
      ...config,
    });
  }

  run() {
    this.executeGroup('My Group', () => {
      const res = this.request.get('/some-page');
      this.check.statusIs(res, 200);

      // Correlate assets instead of hard-coding paths
      for (const img of extractCatalogImages(res.body)) {
        const imgRes = this.request.get(img, {
          headers: { accept: 'image/*', referer: `${this.baseURL}/some-page` },
        });
        this.check.statusIs(imgRes, 200);
      }
    });

    this.thinkTime();
  }
}

export default MyCustomTest;
```

Then add an entry script:

```js
import { MyCustomTest } from './tests/index.js';
import { GroupReportHelper } from './utils/index.js';

const test = new MyCustomTest({ baseURL: 'https://tvn-sut.info', thinkTime: 1 });

export const options = {
  vus: 2,
  iterations: 2,
  thresholds: {
    http_req_duration: ['p(95)<5000'],
    http_req_failed: ['rate<0.10'],
  },
  tags: { framework: 'k6-oop', test: 'my-test', environment: 'staging' },
};

export function setup() {
  test.setup();
  return { startedAt: new Date().toISOString() };
}

export default function () {
  test.run();
}

export function teardown(data) {
  test.teardown();
  console.log(`Test started at: ${data.startedAt}`);
}

export function handleSummary(data) {
  return GroupReportHelper.generateWithGroupMetrics(data, {
    title: 'My Custom Test',
    theme: 'bootstrap',
    filename: 'my-report.html',
  });
}
```

Finally, export it from `tests/index.js` so entry scripts can import it.

---

## Think time

| Layer | Default |
| --- | --- |
| `BaseTest` (framework) | **0s** — `config.thinkTime \|\| 0`; `thinkTime()` only sleeps when the delay is `> 0` |
| `Settings` / `Environment` | **0s** |
| Scenario test classes | **1s** (`config.thinkTime \|\| 1`) |
| `run-*.js` entry scripts | explicitly `thinkTime: 1` |

Override per instance or per call:

```js
new UserSignInTest({ thinkTime: 0.5 });  // instance default
this.thinkTime(2);                       // one-off
this.thinkTime(0);                       // disable for this call
```

`thinkTime: 0` works because the `...config` spread is applied **after** the `|| 1` fallback in the test constructors.

---

## Notes & known gaps

- **`utils/RequestMetrics.js`** provides per-URL `Trend`/`Rate`/`Counter` helpers (`registerUrl`, `recordUrlRequest`, `getUrlMetricsFromData`) but is **not imported anywhere yet** — it is not exported from `utils/index.js` and no test wires it up.
- **`TestRunner.js`** is a standalone test orchestrator; the `run-*.js` entry scripts do not use it.
- **`loadproduct.js`** is the original **Grafana k6 Studio generated** script kept for reference. It hard-codes every asset URL and is not used by any entry script — `run-product.js` + `ProductBrowseTest` are the maintained equivalent.
- **`test.js` / `script.js`** are scratch/demo snippets, not part of the framework.
- The favicon on the SUT does not exist, so `/favicon.ico` is expected to return **404** and the framework asserts that.
- **Generated artifacts** (`report.html`, `signin-report.html`, `register-report.html`, `product-report.html`, `parallel-report.html`, `result.json`, `test_results.json`, `debug-summary.json`) are run outputs — safe to delete and normally excluded from version control.
