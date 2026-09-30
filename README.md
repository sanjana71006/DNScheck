# DNSCheck 🌐
### Global DNS Propagation & Record Misconfiguration Verifier
**CODEBEGUN HACKZEN 2026 — Topic #32**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-22.x-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18.x-cyan.svg)](https://react.dev/)
[![MongoDB](https://img.shields.io/badge/MongoDB-7.0-emerald.svg)](https://www.mongodb.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-sky.svg)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 📌 Executive Summary & Problem Statement

When engineering and DevOps teams launch websites, migrate cloud providers, or configure mail transfer services (SPF, DKIM, MX), DNS configuration errors can take hours to propagate globally. A missing CNAME, invalid MX priority, malformed SPF syntax, stale NS delegation, or dangling cloud alias can take down web services or cause email delivery failures for entire geographic continents.

Traditional DNS propagation checkers suffer from three major design flaws:
1. **Flawed Delineation:** They falsely equate public recursive resolvers (like `1.1.1.1` or `8.8.8.8`) with authoritative nameservers, making it impossible to distinguish between zone synchronization lag and recursive cache TTL.
2. **Superficial String Matching:** They evaluate responses with crude string comparisons that report false mismatches due to unordered IP sets, trailing dots, or case variations.
3. **Absence of Security Guardrails:** They fail to detect RFC violations such as duplicate SPF records (RFC 7208 PermError) or dangling CNAME records susceptible to subdomain takeover.

**DNSCheck** solves this by implementing an automated, full-stack DNS propagation and protocol validation platform powered by Node.js native DNS promises, authoritative nameserver discovery, 14 global resolver vantage points across 6 continents, and a dark SRE cloud operations dashboard.

---

## 🏗️ Defensible System Architecture

The core architectural differentiator of DNSCheck is the **strict delineation between Authoritative Nameservers and Recursive Observer Vantage Points**:

```text
                                DNSCheck Platform
                                        │
                         ┌──────────────┴──────────────┐
                         ▼                             ▼
                 React + Vite + TS             Node.js + Express API
              Tailwind CSS + Leaflet            (Native DNS Promises)
                         │                             │
                         │                   ┌─────────┴─────────┐
                         │                   ▼                   ▼
                         │          AUTHORITATIVE DNS     GLOBAL OBSERVATION
                         │             (Zone Truth)        (Cache Convergence)
                         │                   │                   │
                         │          NS Discovery & Query   14 Public Recursive
                         │          (SOA Serial Sync)      Resolver Vantages
                         │                   │                   │
                         │                   └─────────┬─────────┘
                         │                             ▼
                         │                     PROPAGATION ENGINE
                         │                   (Canonical Normalizer)
                         │                             │
                         │                   ┌─────────┴─────────┐
                         │                   ▼                   ▼
                         │             DNS Validation     Misconfiguration
                         │           (SPF, DMARC, MX)    (Dangling CNAMEs)
                         │                   │                   │
                         │                   └─────────┬─────────┘
                         │                             ▼
                         │                     MongoDB Database
                         │               (Scans, Records, Monitoring)
                         │                             ▲
                         └─────────────────────────────┘
```

### Why This Architecture Wins Hackathon Judging:
- **Authoritative Nameservers (Zone Baseline):** Discovered dynamically via NS queries (e.g. `elliott.ns.cloudflare.com`). Hostnames are resolved to IP addresses and queried directly using `Resolver.setServers([authIp])`. This yields the authoritative canonical records and SOA serial numbers to detect primary/secondary zone replication lag.
- **Recursive Resolver Vantage Points (Global Caching):** 14 distinct public resolver instances (Cloudflare, Google, Quad9, OpenDNS, AdGuard, CleanBrowsing, Alternate DNS, Level3, Control D) strategically chosen across **North America, Europe, Asia, Oceania, South America, and Africa**.
- **Accurate Propagation Calculation:** Observed recursive responses are normalized and compared against the authoritative canonical baseline. If authoritative servers are unreachable, the engine gracefully falls back to consensus majority scoring.

---

## ⚡ Key Features & Engineering Depth

### 1. Pure Node.js DNS Resolution Engine
- Direct resolver querying using `dns.promises.Resolver`.
- Controlled query concurrency using queue limits to avoid socket exhaustion.
- Query timeout isolation (`AbortSignal` / `Promise.race`) ensuring no hung queries crash the API.
- Error isolation using `Promise.allSettled()`.

### 2. Deep Canonical Normalization Layer
- **A / AAAA Records:** Deduplicated and sorted IP arrays.
- **CNAME / NS:** Case-insensitive comparison, trimmed whitespace, and normalized trailing dots.
- **MX Records:** Parsed into `{ priority, exchange }` objects, sorted by priority, then hostname. Supports **RFC 7505 Null MX** (`0 .`).
- **TXT / SPF:** Normalized and tokenized without destroying semantic formatting.

### 3. Protocol & Security Validation Engines
- **SPF Engine (RFC 7208):** Detects multiple SPF records (triggers RFC 7208 PermError on mail receivers!), missing SPF, 10-lookup evaluation limits, permissive `+all` policies, invalid CIDR ranges, and deprecated `ptr` mechanisms.
- **DMARC Engine (RFC 7489):** Queries `_dmarc.<domain>`, parses policy tags (`p=none|quarantine|reject`), validates aggregate reporting (`rua`), forensic reporting (`ruf`), coverage percentage (`pct`), and detects duplicate DMARC records.
- **MX & RFC 7505 Null MX Engine:** Validates priority bounds (0–65535), tests passive hostname resolution, and explicitly recognizes Null MX records declaring intentional non-acceptance of email.
- **Dangling CNAME Takeover Verification:** Safely and passively resolves CNAME targets. If a target returns `NXDOMAIN` or fails to resolve, flags a **CRITICAL** alert indicating potential cloud resource takeover risk.
- **Authoritative SOA Serial Synchronization:** Compares serial numbers across all authoritative nameservers to detect replication desynchronization.

### 4. Interactive Dark SRE UI & World Map
- **Global Map:** Leaflet map with OpenStreetMap tiles and custom glowing CSS markers (Green = Converged, Yellow = Stale, Red = Timeout) plus a Vector SVG fallback.
- **Vantage Drawer:** Click any node to inspect query latency, observed vs canonical records, TTL, and convergence status.
- **Live Execution Pipeline:** Step-by-step progress stepper reflecting backend stages.
- **History & Side-by-Side Diff Viewer:** Inspect previous scans or run a diff comparison (`Scan A vs Scan B`) highlighting changed IP addresses, propagation drift, and resolved issues.
- **Automated Monitoring Scheduler:** Configurable background cron (`1m`, `5m`, `15m`, `30m`, `1h`) saving historical snapshots into MongoDB with interactive timeline charts.
- **Export Engine:** One-click JSON, CSV, and Print-optimized reporting.

---

## 🗄️ MongoDB Database Architecture

```text
dnscheck/
├── scans                # Primary scan metadata, overall status, timing, propagation scores
├── dnsRecords           # Normalized individual DNS records (A, AAAA, MX, TXT, NS, SOA)
├── resolverResults      # Telemetry per vantage point (provider, latency, answers, status)
├── findings             # Security & misconfiguration alerts with actionable remediation
├── monitoringJobs       # Active background domain monitors and schedule intervals
└── monitoringSnapshots  # Historical time-series snapshots with 30-day auto TTL purge
```

### Key Schema Optimizations:
- Compound indexes on `{ normalizedDomain: 1, startedAt: -1 }` for sub-millisecond history queries.
- TTL index on `monitoringSnapshots.timestamp` (`expireAfterSeconds: 2592000`) for automatic self-pruning.
- Structured foreign key relations between `scans` and child collections.

---

## 📡 REST API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Service health, database connection, and uptime check |
| `POST` | `/api/scans` | Start DNS scan with domain & record types |
| `GET` | `/api/scans/stream` | Server-Sent Events (SSE) live scan execution stream |
| `GET` | `/api/scans/:id` | Retrieve complete scan report by ID |
| `GET` | `/api/scans/:id/propagation` | Retrieve propagation summary metrics |
| `GET` | `/api/scans/:id/resolvers` | Retrieve resolver vantage observations |
| `GET` | `/api/scans/:id/findings` | Retrieve security and misconfiguration findings |
| `GET` | `/api/scans/:id/records` | Retrieve discovered authoritative records |
| `DELETE` | `/api/scans/:id` | Delete scan and associated telemetry from MongoDB |
| `GET` | `/api/history?domain=...` | Retrieve scan history with optional domain filter |
| `GET` | `/api/compare?scanA=...&scanB=...` | Compare two scans side-by-side (diff view) |
| `POST` | `/api/monitoring` | Register a new domain monitoring job |
| `GET` | `/api/monitoring` | List active monitoring jobs |
| `PATCH` | `/api/monitoring/:id` | Pause / resume monitoring job or change interval |
| `DELETE` | `/api/monitoring/:id` | Delete monitoring job and snapshot history |
| `GET` | `/api/monitoring/:id/snapshots` | Retrieve timeline snapshots for time-series charts |

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v20+ (tested on Node v22.16.0)
- **npm**: v10+
- **MongoDB**: v6.0+ (running locally on port 27017 or via Docker)

---

### Method A: Local Development (Recommended)

1. **Clone & Install Dependencies:**
   ```bash
   git clone <repo-url>
   cd DNScheck
   npm install
   ```

2. **Configure Environment:**
   ```bash
   cp .env.example .env
   ```

3. **Build Packages:**
   ```bash
   npm run build
   ```

4. **Run Automated Tests:**
   ```bash
   npm run test
   ```

5. **Start Development Servers:**
   ```bash
   npm run dev
   ```
   - **Frontend:** `http://localhost:5173`
   - **Backend API:** `http://localhost:5000`

---

### Method B: Docker Compose (Full Stack)

To run MongoDB, the Backend API, and the Frontend Nginx container in an isolated container network:

```bash
docker compose up --build
```

- **Frontend:** `http://localhost:3000`
- **Backend API:** `http://localhost:5000/api/health`
- **MongoDB:** `localhost:27017`

---

## 🎬 The Strongest Hackathon Demo Flow

For presentations and judges, follow this sequence:

1. **Open the Dashboard:** Open `http://localhost:5173`.
2. **Observe Real DNS Scanning:**
   - Enter `example.com` or `cloudflare.com`.
   - Click **Run DNS Check**.
   - Watch the live execution stepper show authoritative discovery, 14 resolver vantage queries, normalization, and SPF/DMARC checks.
   - Notice the **RFC 7505 Null MX** finding explaining why `example.com` intentionally does not receive email.
3. **Inspect the Global World Map:**
   - Toggle continents (North America, Europe, Asia, Oceania, South America).
   - Click any green or amber marker to open the **Resolver Vantage Drawer** showing query latency, observed IP, and expected canonical baseline.
4. **Demonstrate Active Propagation Drift:**
   - Switch mode badge to **DEMO DATA** (or enter `drift.cloud-migration.net`).
   - Click **Run DNS Check**.
   - The map displays **amber pins** in Europe and Asia reflecting cached legacy IPs, with an overall propagation score of 78.6% and a warning flagging **Authoritative SOA Serial Mismatch**.
5. **Demonstrate Dangling CNAME Detection:**
   - Enter `app.stale-takeover.dev`.
   - Click **Run DNS Check**.
   - Review the **CRITICAL** finding: `The CNAME target "ghost-bucket-404.s3.amazonaws.com" returned NXDOMAIN. This indicates stale cloud storage and high takeover risk.`
6. **Demonstrate Diff Comparison:**
   - Navigate to the **History & Diff** tab.
   - Select any two scans using the checkboxes.
   - Click **Compare Selected (2/2)** to review changed records, propagation delta, and new/resolved security findings.
7. **Demonstrate Real-Time Monitoring:**
   - Navigate to the **Monitoring** tab.
   - Register a domain monitor (e.g. `cloudflare.com` every 1m).
   - Review the live propagation timeline chart updating as background jobs execute.

---

## 🛡️ Security & Passive Safety Guardrails

DNSCheck strictly adheres to non-intrusive security standards:
- **No Exploitation:** Does not attempt subdomain takeover, account claiming, bucket provisioning, or credential stuffing.
- **Passive DNS Queries Only:** All checks utilize standard RFC-compliant UDP/TCP DNS queries.
- **Rate Limiting & Cooldown:** Enforces per-IP scan limits (30 scans/min) and per-domain cooldown (3s) to protect public DNS infrastructure.
- **Zero Command Injection:** All user input is validated through strict regex and RFC 1035 label boundaries. No shell commands are executed from user input.

---

## 🏆 Hackathon Judging Criteria Alignment

| Criteria | Weight | How DNSCheck Excels |
|---|---|---|
| **Technical Architecture** | **20%** | Strict separation of Authoritative Nameservers vs Recursive Resolvers; canonical normalization pipeline; robust fallback to consensus when authoritative zone is unlisted. |
| **System Reliability & Security** | **20%** | Concurrency throttles; query timeout wrappers; passive CNAME takeover detection; RFC 7208 multiple-SPF detection; RFC 7505 Null MX support. |
| **Engineering Depth** | **20%** | Real Node.js DNS promises engine querying 14 global vantages; SOA serial synchronization analysis; DMARC tag parser; MongoDB compound indexing. |
| **Developer Experience** | **15%** | Dark SRE observability dashboard; interactive Leaflet map; JSON/CSV export; side-by-side scan diff viewer; comprehensive REST API docs. |
| **Scalability & Efficiency** | **15%** | Background cron scheduler; TTL-based cache layer preventing resolver spamming; Dockerized multi-stage containers; MongoDB TTL auto-purge. |
| **Live Demo & Code** | **10%** | Seamless REAL DNS mode with instant fallback to DEMO DATA presets; comprehensive automated test suite (13 passing tests); zero compilation errors. |

---

## 📄 License
This project is open-source under the **MIT License**.
Developed for **CODEBEGUN HACKZEN 2026 — Topic #32**.
