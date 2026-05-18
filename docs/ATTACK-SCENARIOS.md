# Traceveil — Attack Scenarios

**Version:** 0.1
**Status:** Scenario specifications — simulation, visualization, and replay
**Last revised:** 2026-05-12

> Companion docs: [FOUNDATION.md](FOUNDATION.md) · [MVP.md](MVP.md) · [ARCHITECTURE.md](ARCHITECTURE.md) · [EVENT-SYSTEM.md](EVENT-SYSTEM.md)

This document specifies three canonical attack scenarios that Traceveil simulates. Each scenario is a **deterministic, scripted timeline** designed for visualization, detection testing, and replay. Nothing here describes real exploitation — the simulation reproduces *the shape and signal of an attack* without touching any real target.

> All three scenarios are intentionally educational. They map to real MITRE ATT&CK techniques, generate realistic detection signals, and exercise the topology canvas, detection engine, alert pipeline, and replay engine end-to-end.

---

## 0. Shared Context

**Reference environment** (declared in `environments/templates/microservices-small.yaml`):

```
              ┌──────────┐
              │ ingress  │
              └────┬─────┘
                   │
            ┌──────▼──────┐
            │ web-frontend│
            └──────┬──────┘
                   │
       ┌───────────▼───────────┐
       │      api-service      │────┐
       └─┬───────┬───────┬─────┘    │
         │       │       │          │
       ┌─▼──┐  ┌─▼────┐ ┌▼──────┐  ┌▼─────────┐
       │auth│  │cache │ │  db   │  │  queue   │
       └────┘  └──────┘ └───────┘  └────┬─────┘
                                        │
                                   ┌────▼─────┐
                                   │ worker   │
                                   └──────────┘
```

**Conventions used throughout this document:**

- All events conform to the canonical `Event` envelope ([EVENT-SYSTEM.md §3](EVENT-SYSTEM.md#L62)).
- `ts_us` is **microseconds since `RunStarted.wall_ts`**. Run length is given in seconds for readability.
- `event_id` values shown are illustrative (`E1`, `E2`, …); in production they are deterministic ULIDs.
- `caused_by[]` references previous events in the same run by their `event_id`.
- Severity is **derived** at emit time; the value shown is what the system computes, not what the YAML declares.
- Visualizations follow the rules in [EVENT-SYSTEM.md §14](EVENT-SYSTEM.md#L505) — effect type drives the animation.

**Detection rules referenced** (all 6 hardcoded predicates that ship in MVP):

| Rule ID | Trigger | MITRE |
|---|---|---|
| `waf_suspicious_payload` | HTTP request body matches known exploit signatures | T1190 |
| `db_anomalous_query` | Query shape unusual for this service / large result set | T1213 |
| `auth_brute_force` | ≥ N failed auths from same source within window | T1110 |
| `auth_success_after_failures` | Successful auth following ≥ N failures from same source | T1078 |
| `k8s_privileged_change` | Sensitive Kubernetes API call (RoleBinding, exec, secret read) | T1098, T1548 |
| `egress_unusual_destination` | Outbound connection to never-before-seen destination | T1041 |

Each scenario declares which detections it **expects** to fire and by which step. The scorecard at run end reconciles expected vs. actual.

---

## SCENARIO 1 — SQL Injection

### 1.1 Attack Overview

A SQL injection campaign against the public web frontend. The attacker probes for parameter injection points, discovers an unsanitized search endpoint, exploits it to bypass authentication and extract sensitive data from the database, and exfiltrates the result to an external endpoint.

This scenario exercises: the WAF detection layer, anomalous-query detection at the database tier, egress anomaly detection, and the full attack-path overlay across `ingress → web-frontend → api-service → db`.

**Total run duration:** ~75 seconds wall-clock.
**Event count:** ~28.
**Expected detections:** 4 (target — see scorecard).

**Scenario YAML (abridged):**

```yaml
id: sql-injection-data-exfil
version: 1
name: "SQL Injection → Auth Bypass → Data Exfiltration"
mitre_tags: [T1190, T1213, T1005, T1041]
expected_detections:
  - rule: waf_suspicious_payload
    by_step: 2
  - rule: db_anomalous_query
    by_step: 4
  - rule: db_anomalous_query
    by_step: 6
  - rule: egress_unusual_destination
    by_step: 8
```

### 1.2 Attack Goal

- **Tactic:** Initial Access → Discovery → Collection → Exfiltration
- **Objective:** Extract the `users` table (containing email + password hashes) from the database and exfiltrate it to an attacker-controlled endpoint.
- **Success condition:** A `mark` effect of `data_exfil_attempted` is applied to the `db` node, and the `worker` node has an outbound connection to an external destination.

### 1.3 Infrastructure Targets

| Node | Role | What changes |
|---|---|---|
| `ingress` | Entry point | Receives malicious HTTP traffic; logs WAF events |
| `web-frontend` | Public-facing app | Forwards malicious query to API |
| `api-service` | Backend API | Compromised — issues attacker-controlled SQL via ORM injection |
| `db` | PostgreSQL | Returns sensitive rows; marked `data_exfil_attempted` |
| `worker` | Async processor | Used as exfil pivot — outbound connection to external IP |

Untouched: `auth-service`, `cache`, `queue` (queue is traversed but not compromised).

### 1.4 Event Sequence

| # | t (s) | Source | Kind | Actor → Target | Effect |
|---|---|---|---|---|---|
| 1 | 0.0 | system | `run.started` | system | — |
| 2 | 1.2 | attacker | `attack.http.probe` | external → web-frontend | (none — reconnaissance) |
| 3 | 2.8 | attacker | `attack.http.exploit` | external → web-frontend | `compromise(web-frontend, low)` |
| 4 | 3.1 | host | `host.cpu.spike` | system → web-frontend | — |
| 5 | 4.5 | attacker | `attack.sqli.payload` | web-frontend → api-service | `traversal(web-frontend → api-service)` |
| 6 | 5.0 | app | `app.db.query` | api-service → db | (annotation: query shape unusual) |
| 7 | 8.2 | attacker | `attack.sqli.payload` | web-frontend → api-service | `traversal(web-frontend → api-service)` (auth bypass) |
| 8 | 8.6 | app | `app.auth.bypass` | api-service → auth-service | (logical, no traversal effect) |
| 9 | 9.0 | system | `node.compromised` | system → api-service | `compromise(api-service, medium)` |
| 10 | 14.0 | attacker | `attack.data.read` | api-service → db | (read of `users` table) |
| 11 | 14.3 | app | `app.db.query` | api-service → db | (annotation: large result set) |
| 12 | 22.0 | attacker | `attack.data.stage` | api-service → queue | `traversal(api-service → queue)` |
| 13 | 25.0 | attacker | `attack.data.stage` | queue → worker | `traversal(queue → worker)` |
| 14 | 28.0 | attacker | `attack.data.exfil` | worker → external | `mark(db, data_exfil_attempted)` |
| 15 | 28.4 | host | `host.network.connection` | worker → external IP | — |
| 16 | 72.0 | system | `run.completed` | system | scorecard |

Detections (§1.5) and alerts (§1.6) are emitted inline with the above; they receive their own `seq` numbers and `event_id`s.

### 1.5 Detection Events

| At step | Rule | On time? | Why it fires |
|---|---|---|---|
| 3 | `waf_suspicious_payload` | ✅ on time | HTTP request body contains `' OR 1=1--` pattern |
| 6 | `db_anomalous_query` | ✅ on time | Query references columns not in this service's prepared-statement registry |
| 11 | `db_anomalous_query` | ✅ on time | Result set size exceeds the service's 95th percentile by 8× |
| 15 | `egress_unusual_destination` | ⚠️ late | Outbound IP not seen in baseline; fires 400ms after the exfil event closed |

**Expected total: 4. Actual fired: 4 (3 on time, 1 late). Scored as `4/6 expected detections fired (1 late, 2 missed)`** — two intentionally missed detections (the auth-bypass step at #7 and the data-staging traversal at #12) are not covered by the MVP rule set; their absence is itself instructive content for the demo.

### 1.6 Alert Events

Each on-time detection generates an alert. The four alerts produced (in order):

1. **"Suspicious SQL pattern blocked at edge"** — severity `high`, suggested action: review WAF, confirm payload was blocked or passed.
2. **"Unusual database query shape from API service"** — severity `medium`, suggested action: review query, confirm whether application-level injection is possible.
3. **"Large data read from `users` table"** — severity `high`, suggested action: confirm legitimate; check API audit log.
4. **"Outbound connection to never-before-seen destination from worker"** — severity `critical`, suggested action: block egress, isolate worker, investigate.

Alert #4 escalates to `critical` via the severity derivation rule ([EVENT-SYSTEM.md §16](EVENT-SYSTEM.md#L601)) because (a) the originating chain touches a `crown_jewel` node (db), and (b) the propagation distance from initial access exceeds 3 hops.

### 1.7 Replay Timeline

Key timeline anchors a viewer is expected to scrub to:

```
[T+00:00] ────●────●────●────●────●────●────●────●────●────●─── [T+01:15]
              │    │    │    │    │    │    │    │    │    │
              │    │    │    │    │    │    │    │    │    └─ run.completed
              │    │    │    │    │    │    │    │    └────── exfil + late detection
              │    │    │    │    │    │    │    └─────────── exfil staging to worker
              │    │    │    │    │    │    └──────────────── db_anomalous_query #2 (large read)
              │    │    │    │    │    └─────────────────── attack.data.read
              │    │    │    │    └──────────────────────── api-service compromised
              │    │    │    └─────────────────────────── auth bypass via SQLi #2
              │    │    └────────────────────────────── db_anomalous_query #1
              │    └────────────────────────────────── SQLi probe through to db
              └──────────────────────────────────── waf_suspicious_payload fires
```

A typical demo scrub path: drag back to `T+00:02.8` (the WAF detection fires), then forward through `T+00:09` (api compromised) → `T+00:28` (exfil moment). Each scrub call hits `GET /runs/{id}/frame?t=` ([ARCHITECTURE.md §6](ARCHITECTURE.md#L233)) and returns the precise compromise state at that time.

### 1.8 Attack Propagation Behavior

The propagation is **linear with one fan-out**:

```
external ──http──▶ web-frontend ──http──▶ api-service ──sql──▶ db
                                                 │
                                                 └──amqp──▶ queue ──amqp──▶ worker ──tcp──▶ external
```

`caused_by[]` chains in payloads (§1.11) make this graph explicit. Every detection and alert in this scenario traces back through `caused_by` to the original `attack.http.exploit` event — the **attack-path overlay** in the UI dims all other nodes and lights only this chain.

### 1.9 Infrastructure Impact

| Node | Final compromise state | Marks | Notes |
|---|---|---|---|
| `ingress` | uncompromised | — | Traffic passed through; logged |
| `web-frontend` | compromised (low) | — | Used as injection conduit, not exploited at the OS level |
| `api-service` | compromised (medium) | `injection_endpoint:/search` | Logical compromise via SQLi auth bypass |
| `auth-service` | uncompromised | — | Bypassed, not exploited |
| `cache` | uncompromised | — | — |
| `queue` | uncompromised | `data_in_transit` | Used as staging only |
| `worker` | compromised (high) | `egress_origin` | Performed the exfil |
| `db` | uncompromised at OS level | `data_exfil_attempted` | Data left via legitimate read path |

Note that the database is **not** marked "compromised" — SQLi did not give the attacker code execution on the DB host. This distinction matters for the demo: the renderer shows db with an *amber mark badge*, not the red compromise ring. Visual honesty about what happened.

### 1.10 Frontend Visualization Behavior

| Event | Animation |
|---|---|
| `attack.http.exploit` on web-frontend | Compromise ring fills clockwise red (low intensity, ~30% opacity) over 600ms |
| `attack.sqli.payload` traversal | Edge `web-frontend → api-service` brightens; particle travels in 800ms |
| `db_anomalous_query` detection | `db` node pulses with amber aura; rule chip "db_anomalous_query · T1213" floats 1.2s |
| `node.compromised` on api-service | Full clockwise red ring fill over the actual step duration (~4s) |
| `attack.data.read` | Edge `api-service → db` highlights; `db` shows brief data-flow particle |
| `attack.data.stage` to queue | Particle along `api-service → queue`, then `queue → worker` (chained) |
| `attack.data.exfil` | `worker` emits a particle along a *new dashed edge* that exits the canvas to a small "external" sigil that fades in |
| `egress_unusual_destination` (late) | The external sigil pulses red with rule chip; timeline shows "LATE" indicator on the tick |
| `run.completed` | Canvas fades by 20%, scorecard card animates in from top-right |

The "exit to external" sigil is the visual payoff of the scenario — most of the canvas's drama lives inside the topology, but exfiltration breaks out of it deliberately.

### 1.11 Example Event Payloads

**The SQLi exploit event (step 3):**

```json
{
  "event_id": "01HX...SQL01",
  "run_id":   "9a8d-...-sqli",
  "seq": 3,
  "ts_us": 2800000,
  "source": "attacker",
  "kind": "attack.http.exploit",
  "severity": "high",
  "node_id": "web-frontend",
  "actor": "external",
  "target": {
    "node_id": "web-frontend",
    "service": "web-frontend",
    "path": "/api/search",
    "port": 443
  },
  "caused_by": [],
  "mitre": ["T1190"],
  "effect": {
    "type": "compromise",
    "node_id": "web-frontend",
    "severity": "low"
  },
  "raw": {
    "method": "GET",
    "query": "q=' OR 1=1--",
    "user_agent": "sqlmap/1.7"
  }
}
```

**The large-read detection (step 11):**

```json
{
  "event_id": "01HX...SQL11D",
  "run_id":   "9a8d-...-sqli",
  "seq": 12,
  "ts_us": 14300000,
  "source": "detection",
  "kind": "detection.fired",
  "severity": "high",
  "node_id": "db",
  "actor": "detection-engine",
  "target": { "node_id": "db" },
  "caused_by": ["01HX...SQL10R"],
  "mitre": ["T1213"],
  "effect": {},
  "raw": {
    "rule_id": "db_anomalous_query",
    "rule_version": "1",
    "matched_event_ids": ["01HX...SQL10R"],
    "on_time": true,
    "severity_derived": "high",
    "evidence": {
      "rows_returned": 24817,
      "baseline_p95": 142,
      "table": "users"
    }
  }
}
```

**The exfil event (step 14):**

```json
{
  "event_id": "01HX...SQLEXFIL",
  "run_id":   "9a8d-...-sqli",
  "seq": 17,
  "ts_us": 28000000,
  "source": "attacker",
  "kind": "attack.data.exfil",
  "severity": "critical",
  "node_id": "worker",
  "actor": "worker",
  "target": {
    "node_id": "external",
    "service": "attacker-c2",
    "port": 443
  },
  "caused_by": ["01HX...SQL13S"],
  "mitre": ["T1005", "T1041"],
  "effect": {
    "type": "mark",
    "node_id": "db",
    "tag": "data_exfil_attempted"
  },
  "raw": {
    "destination_ip": "203.0.113.42",
    "destination_asn": "AS64512",
    "bytes": 1834221
  }
}
```

### 1.12 Replay Engine Integration

When the user scrubs to `T+00:14.3` (right at the large-read detection), `GET /runs/{id}/frame?t=14300000` returns:

```json
{
  "run_id": "9a8d-...-sqli",
  "t_us": 14300000,
  "wall_ts": "2026-05-12T19:42:11.184Z",
  "nodes": {
    "web-frontend": { "compromise": "compromised", "severity": "low",   "since_us": 2800000 },
    "api-service":  { "compromise": "compromised", "severity": "medium","since_us": 9000000 },
    "db":           { "compromise": "uncompromised", "marks": [], "severity": "info" },
    "worker":       { "compromise": "uncompromised", "marks": [], "severity": "info" },
    "queue":        { "compromise": "uncompromised", "marks": [], "severity": "info" },
    "cache":        { "compromise": "uncompromised", "marks": [], "severity": "info" },
    "auth-service": { "compromise": "uncompromised", "marks": [], "severity": "info" },
    "ingress":      { "compromise": "uncompromised", "marks": [], "severity": "info" }
  },
  "edges": [ /* with highlighted=true on web-frontend→api-service and api-service→db */ ],
  "in_flight_steps": [
    { "kind": "attack.data.read", "started_us": 14000000, "expected_end_us": 22000000 }
  ],
  "detections_so_far": [
    { "rule": "waf_suspicious_payload",    "ts_us":  2900000, "on_time": true },
    { "rule": "db_anomalous_query",        "ts_us":  5100000, "on_time": true },
    { "rule": "db_anomalous_query",        "ts_us": 14400000, "on_time": true }
  ]
}
```

This is what the canvas paints when the playhead is at 14.3s — partial compromise, one in-flight step, three detections fired so far. Scrub forward 14 seconds and the exfil event lights the worker; scrub another 400ms and the late `egress_unusual_destination` detection appears.

---

## SCENARIO 2 — Brute Force

### 2.1 Attack Overview

A credential brute-force campaign against the login endpoint. The attacker sprays common-password attempts from a rotating set of source IPs against a known username, eventually succeeds, and uses the legitimate session token to access the API.

This scenario exercises: the **authentication detection layer**, rate-based correlation, and **valid-account follow-on detection** — the textbook "the brute force fired, but the *real* signal is the successful login that came after."

**Total run duration:** ~60 seconds wall-clock.
**Event count:** ~42 (most are repeating failed-auth attempts).
**Expected detections:** 3.

**Scenario YAML (abridged):**

```yaml
id: brute-force-credential-spray
version: 1
name: "Credential Brute Force → Account Takeover"
mitre_tags: [T1110, T1110.003, T1078]
expected_detections:
  - rule: auth_brute_force
    by_step: 20
  - rule: auth_success_after_failures
    by_step: 35
  - rule: egress_unusual_destination
    by_step: 40
```

### 2.2 Attack Goal

- **Tactic:** Credential Access → Initial Access via Valid Accounts
- **Objective:** Compromise a valid user account (`alice@example.com`) by password spraying, then use that account's session token to access protected API resources.
- **Success condition:** A `compromise` effect with `severity: medium` is applied to `auth-service` reflecting the takeover; a follow-on `attack.token.replay` event lands on `api-service`.

### 2.3 Infrastructure Targets

| Node | Role | What changes |
|---|---|---|
| `ingress` | Entry point | Receives high volume of login traffic |
| `web-frontend` | Hosts login page | Forwards auth attempts |
| `auth-service` | Identity provider | Records ~30 failed auths followed by 1 success; receives `compromise` |
| `api-service` | Protected API | Accessed with valid-but-stolen token |
| `cache` | Session store | Stores the successful session — observed but not compromised |

Untouched: `db`, `queue`, `worker`.

### 2.4 Event Sequence

The sequence is dominated by repeated failed-auth events. To keep the table readable, those are collapsed into ranges.

| # | t (s) | Source | Kind | Notes |
|---|---|---|---|---|
| 1 | 0.0 | system | `run.started` | — |
| 2–6 | 1.2–4.8 | attacker | `attack.auth.attempt` × 5 | First wave; from IP set A (3 distinct IPs) |
| 7 | 5.1 | app | `app.auth.failure` × 5 | Auth-service emits failures |
| 8 | 7.0 | attacker | `attack.auth.attempt` × 8 | Second wave; rotating IPs |
| 9–14 | 7.0–18.0 | app | `app.auth.failure` × 8 | Wave 2 failures |
| 15 | 19.5 | detection | `detection.fired` | **`auth_brute_force` fires** — 13 failures in 18s |
| 16 | 20.0 | alert | `alert.raised` | "Probable credential brute force on `alice@example.com`" |
| 17–28 | 20–42 | attacker | `attack.auth.attempt` × 12 | Continued spray (slower, lower-and-slower evasion attempt) |
| 29–40 | 20–42 | app | `app.auth.failure` × 12 | Continued failures |
| 41 | 43.5 | attacker | `attack.auth.attempt` | **The successful one** — password `Spring2026!` works |
| 42 | 43.6 | app | `app.auth.success` | Session token issued; cached |
| 43 | 43.8 | system | `node.compromised` | `compromise(auth-service, medium)` |
| 44 | 43.9 | detection | `detection.fired` | **`auth_success_after_failures` fires on time** |
| 45 | 44.0 | alert | `alert.raised` | "Successful login from suspicious source after 25 failures" |
| 46 | 47.0 | attacker | `attack.token.replay` | Stolen token used against `api-service` |
| 47 | 47.4 | app | `app.api.access` | API returns 200; sensitive endpoint accessed |
| 48 | 50.0 | host | `host.network.connection` | api-service → unusual external endpoint |
| 49 | 50.4 | detection | `detection.fired` | **`egress_unusual_destination` fires** |
| 50 | 50.5 | alert | `alert.raised` | "Outbound connection to never-before-seen destination from API" |
| 51 | 60.0 | system | `run.completed` | scorecard |

### 2.5 Detection Events

| Step | Rule | On time? | Why |
|---|---|---|---|
| 15 | `auth_brute_force` | ✅ on time | 13 failed auths against same user within rolling 60s window exceeds threshold of 10 |
| 44 | `auth_success_after_failures` | ✅ on time | Successful auth from a source that produced ≥ 5 failures in last 5 minutes |
| 49 | `egress_unusual_destination` | ✅ on time | New outbound IP from api-service |

**Expected total: 3. Actual fired: 3 (all on time). Scored as `3/3 expected detections fired`.**

This scenario is the closest the MVP has to a "good defender" run — every expected rule fires on time. The pedagogical value is **comparing the on-time scorecard to Scenario 1's late one**.

### 2.6 Alert Events

The three alerts surface progressively higher severity:

1. **"Probable credential brute force on alice@example.com"** — severity `medium`. Suggested action: rate-limit the source, force MFA re-challenge on the account.
2. **"Successful login from suspicious source after 25 failures"** — severity `high`. Suggested action: invalidate the new session, force password reset.
3. **"Outbound connection to never-before-seen destination from API"** — severity `critical`. Suggested action: isolate the API pod, audit recent API calls.

The third alert is the "this turned out to matter" alert — the kind a SOC analyst should triage *first* even though it appeared last. In replay, the operator can step backwards from this alert through `caused_by` to see the full chain that led there.

### 2.7 Replay Timeline

```
[T+00:00] ─●──•••••──●──••••──●──●──●─••─●──●──●─ [T+01:00]
           │  fails  │ fails  │  │  │ fails │  │
           │         │        │  │  │       │  └─ run.completed
           │         │        │  │  │       └──── egress detection
           │         │        │  │  └──────────── token replay against api
           │         │        │  └─────────────── alert: success after failures
           │         │        └────────────────── auth_success_after_failures fires
           │         │                            (and auth-service compromised)
           │         └───────────────────────── alert: probable brute force
           │                                    auth_brute_force fires
           └────────────────────────────────── first failed auth wave begins
```

Scrub targets: `T+00:19.5` (brute force detection), `T+00:43.9` (the moment of takeover), `T+00:50.4` (downstream exfil signal). Replay at 0.5× speed makes the rhythm of the failed-auth bursts feel real — this is where the brute-force scenario shines visually.

### 2.8 Attack Propagation Behavior

Propagation is **two-phase**:

**Phase 1 — credential discovery** (linear, low intensity):

```
external (rotating IPs) ──https──▶ ingress ──https──▶ web-frontend ──https──▶ auth-service
                                                                                   │
                                                                          (~30× failure, 1× success)
```

**Phase 2 — account takeover** (compromised credentials used as legitimate traffic):

```
external (one IP) ──https──▶ ingress ──https──▶ web-frontend ──https──▶ auth-service
                                                                              │
                                                                       session token issued
                                                                              │
                                                                              ▼
                                                                          api-service ──tcp──▶ external
```

The second phase is what makes brute-force scenarios narratively powerful: the attacker is now *using the front door*. Detection has to lean on *behavior* (this user never logs in from this IP) rather than *signature* (this request is malformed).

### 2.9 Infrastructure Impact

| Node | Final state | Marks | Notes |
|---|---|---|---|
| `ingress` | uncompromised | `traffic_spike` | Logged the storm |
| `web-frontend` | uncompromised | — | Reverse-proxied; nothing exploited |
| `auth-service` | compromised (medium) | `account_takeover:alice@example.com` | Logical compromise — valid credentials issued |
| `cache` | uncompromised | `session_token_cached` | Holds the stolen session |
| `api-service` | uncompromised at OS level | `accessed_via_stolen_token` | The token is real; the user is not |
| `db`, `queue`, `worker` | uncompromised | — | Not in the path |

Visually, `auth-service` gets the red compromise ring; `api-service` gets an amber mark but no ring — it was *abused*, not *compromised*.

### 2.10 Frontend Visualization Behavior

| Event | Animation |
|---|---|
| `attack.auth.attempt` (per attempt) | A small red dot pulses on the edge `web-frontend → auth-service` and fades in 200ms. Repeated firing produces a **shimmer** effect along the edge — the visual signature of brute force |
| `app.auth.failure` | Small "✕" badge briefly appears at `auth-service` |
| `auth_brute_force` detection | `auth-service` pulses amber for 1.2s; rule chip appears in the right rail |
| `app.auth.success` (the takeover moment) | The "✕" badges momentarily turn into a green "✓" then **immediately back to red** — a 400ms beat that telegraphs "this was the wrong one to succeed" |
| `node.compromised` on auth-service | Red compromise ring fills clockwise over 800ms |
| `auth_success_after_failures` detection | Auth-service ring brightens; alert card slides in with **high-severity tint** |
| `attack.token.replay` | A *teal* particle (not red — this is "legitimate" traffic) travels `web-frontend → api-service`. The teal color is the visual tell: legitimate-shape, malicious-intent |
| `egress_unusual_destination` | External sigil pulses with the rule chip |

The teal traversal is intentional. It separates **brute-force-followed-by-valid-traffic** from a raw exploit visually. A viewer learns the visual grammar: red = exploited, amber = anomalous behavior, teal = legitimate-shape suspicious flow.

### 2.11 Example Event Payloads

**A single failed-auth attempt (step 7-ish):**

```json
{
  "event_id": "01HX...BF07",
  "run_id":   "b2c1-...-brute",
  "seq": 8,
  "ts_us": 5100000,
  "source": "app",
  "kind": "app.auth.failure",
  "severity": "low",
  "node_id": "auth-service",
  "actor": "auth-service",
  "target": {
    "node_id": "auth-service",
    "identity": "alice@example.com"
  },
  "caused_by": ["01HX...BF02"],
  "mitre": ["T1110"],
  "effect": {},
  "raw": {
    "source_ip": "198.51.100.7",
    "reason": "invalid_password",
    "attempt_number_for_user_60s": 5
  }
}
```

**The brute-force detection (step 15):**

```json
{
  "event_id": "01HX...BFDET1",
  "run_id":   "b2c1-...-brute",
  "seq": 27,
  "ts_us": 19500000,
  "source": "detection",
  "kind": "detection.fired",
  "severity": "medium",
  "node_id": "auth-service",
  "actor": "detection-engine",
  "target": { "node_id": "auth-service", "identity": "alice@example.com" },
  "caused_by": [
    "01HX...BF02", "01HX...BF03", "01HX...BF04",
    "01HX...BF05", "01HX...BF06", "01HX...BF07",
    "01HX...BF08", "01HX...BF09", "01HX...BF10",
    "01HX...BF11", "01HX...BF12", "01HX...BF13",
    "01HX...BF14"
  ],
  "mitre": ["T1110"],
  "effect": {},
  "raw": {
    "rule_id": "auth_brute_force",
    "rule_version": "1",
    "matched_event_ids": [ "01HX...BF02", "01HX...BF03", "..." ],
    "window_us": 18000000,
    "failure_count": 13,
    "threshold": 10,
    "on_time": true,
    "severity_derived": "medium"
  }
}
```

**The compromise event (step 43):**

```json
{
  "event_id": "01HX...BFCOMP",
  "run_id":   "b2c1-...-brute",
  "seq": 56,
  "ts_us": 43800000,
  "source": "system",
  "kind": "node.compromised",
  "severity": "medium",
  "node_id": "auth-service",
  "actor": "system",
  "target": { "node_id": "auth-service" },
  "caused_by": ["01HX...BFSUCC"],
  "mitre": ["T1078"],
  "effect": {
    "type": "compromise",
    "node_id": "auth-service",
    "severity": "medium"
  },
  "raw": {
    "reason": "credentials_confirmed_via_brute_force",
    "principal": "alice@example.com"
  }
}
```

### 2.12 Replay Engine Integration

At `t = 44s` the frame returned looks like:

```json
{
  "t_us": 44000000,
  "nodes": {
    "auth-service": { "compromise": "compromised", "severity": "medium", "since_us": 43800000 },
    "ingress":     { "marks": ["traffic_spike"], "severity": "info" },
    "cache":       { "marks": ["session_token_cached"], "severity": "info" },
    "api-service": { "compromise": "uncompromised", "severity": "info" }
  },
  "detections_so_far": [
    { "rule": "auth_brute_force",          "ts_us": 19500000 },
    { "rule": "auth_success_after_failures","ts_us": 43900000 }
  ],
  "in_flight_steps": []
}
```

A scrub *backward* to `t = 19500000` shows auth-service still uncompromised but with the brute-force detection already fired — a useful teaching moment: **"the detection fired but the attack succeeded anyway because the threshold was too lenient."** This is the kind of insight Traceveil exists to surface.

---

## SCENARIO 3 — Privilege Escalation

### 3.1 Attack Overview

An attacker who has already obtained a low-privilege foothold on `api-service` (assumed via earlier compromise; this scenario picks up after) abuses an overly permissive Kubernetes ServiceAccount to create a privileged RoleBinding, then uses that elevation to read a secret from the cluster and pivot.

This scenario exercises: **Kubernetes-aware detection**, multi-step causal chains, and the visual difference between **node compromise** and **identity-level escalation** — Traceveil's most architecturally interesting visualization beat.

**Total run duration:** ~55 seconds wall-clock.
**Event count:** ~22.
**Expected detections:** 4.

**Scenario YAML (abridged):**

```yaml
id: priv-esc-k8s-rolebinding
version: 1
name: "ServiceAccount Abuse → Cluster Admin → Secret Theft"
mitre_tags: [T1078.004, T1068, T1548.003, T1098, T1552.007]
preconditions:
  - api-service.compromise == "compromised"      # scenario starts post-compromise
expected_detections:
  - rule: k8s_privileged_change
    by_step: 4
  - rule: k8s_privileged_change
    by_step: 6
  - rule: db_anomalous_query
    by_step: 9
  - rule: egress_unusual_destination
    by_step: 11
```

### 3.2 Attack Goal

- **Tactic:** Privilege Escalation → Credential Access → Lateral Movement
- **Objective:** Elevate from a constrained `api-service` ServiceAccount to cluster-admin equivalence; read the database credentials secret; connect directly to the database with stolen creds; exfiltrate.
- **Success condition:** A `persistence` effect (`rolebinding:attacker-admin`) on `api-service`, and a direct `compromise` effect on `db` (this time at the credential level, not via the API).

### 3.3 Infrastructure Targets

| Node | Role | What changes |
|---|---|---|
| `api-service` | Foothold | Already compromised at scenario start; ServiceAccount abused |
| `auth-service` | Issuer of secrets / tokens | Sees secret-read API calls |
| `db` | PostgreSQL | Accessed directly with stolen credentials; `compromise(high)` |
| `worker` | Pivot node | Receives extracted secret; performs egress |

The K8s control plane is represented as a logical node `k8s-api` that does not appear on the topology canvas but is referenced in event payloads. Its API calls are surfaced as events targeting the affected workload nodes.

### 3.4 Event Sequence

| # | t (s) | Source | Kind | Notes |
|---|---|---|---|---|
| 1 | 0.0 | system | `run.started` | Preconditions assert api-service compromised |
| 2 | 0.0 | system | `node.compromised` | Snapshot of precondition for replay determinism |
| 3 | 2.5 | attacker | `attack.k8s.enumerate` | `kubectl auth can-i --list` equivalent |
| 4 | 4.0 | attacker | `attack.k8s.create_rolebinding` | Bind `cluster-admin` to compromised SA |
| 5 | 4.2 | detection | `detection.fired` | **`k8s_privileged_change` fires** |
| 6 | 4.5 | alert | `alert.raised` | "Privileged RoleBinding created from a workload" |
| 7 | 8.0 | attacker | `attack.k8s.secret_read` | Read `db-credentials` secret |
| 8 | 8.2 | detection | `detection.fired` | **`k8s_privileged_change` fires** (sensitive secret access) |
| 9 | 8.5 | alert | `alert.raised` | "Cluster secret read from non-control-plane workload" |
| 10 | 14.0 | attacker | `attack.lateral.connect` | api-service → db using stolen creds (not via app layer) |
| 11 | 14.4 | system | `node.compromised` | `compromise(db, high)` — credential-level, not OS-level |
| 12 | 15.0 | attacker | `attack.data.read` | Bulk SELECT on `users` and `secrets` tables |
| 13 | 15.3 | detection | `detection.fired` | **`db_anomalous_query` fires** — query path bypasses normal API |
| 14 | 15.5 | alert | `alert.raised` | "Direct database access from workload pod (no API path)" |
| 15 | 22.0 | attacker | `attack.data.stage` | api-service → worker (via direct gRPC, atypical) |
| 16 | 25.0 | attacker | `attack.data.exfil` | worker → external |
| 17 | 25.4 | detection | `detection.fired` | **`egress_unusual_destination` fires** |
| 18 | 25.5 | alert | `alert.raised` | "Outbound connection to never-before-seen destination from worker" |
| 19 | 30.0 | attacker | `attack.persistence` | Persist the malicious RoleBinding; effect `persistence(api-service, rolebinding:attacker-admin)` |
| 20 | 55.0 | system | `run.completed` | scorecard |

### 3.5 Detection Events

| Step | Rule | On time? | Why |
|---|---|---|---|
| 5 | `k8s_privileged_change` | ✅ on time | RoleBinding creation by a workload SA is anomalous |
| 8 | `k8s_privileged_change` | ✅ on time | Secret access pattern that workload pods rarely perform |
| 13 | `db_anomalous_query` | ✅ on time | Connection origin (api-service pod IP) but bypassing the application connection pool |
| 17 | `egress_unusual_destination` | ✅ on time | New external IP from worker |

**Expected total: 4. Actual fired: 4 (all on time). Scored as `4/4 expected detections fired`.**

Note: this scenario assumes detections are well-tuned. A common variation (for demo) is to *disable* `k8s_privileged_change` to show how a single missing rule cascades through the scorecard.

### 3.6 Alert Events

Each detection produces an alert with progressive escalation:

1. **"Privileged RoleBinding created from a workload"** — severity `high`. Suggested action: revoke binding, audit ServiceAccount.
2. **"Cluster secret read from non-control-plane workload"** — severity `high`. Suggested action: rotate the affected secret immediately.
3. **"Direct database access from workload pod (no API path)"** — severity `critical`. Suggested action: rotate DB credentials, isolate workload, audit recent queries.
4. **"Outbound connection to never-before-seen destination from worker"** — severity `critical`. Suggested action: block egress, isolate worker, escalate to IR.

Two `critical` alerts cluster within ~10 seconds (steps 14, 18). The right rail visually piles up — the rhythm of escalation is part of the storytelling.

### 3.7 Replay Timeline

```
[T+00:00] ─●─●─●─●─●─●─●─●─●─●─●─ [T+00:55]
           │ │ │ │ │ │ │ │ │ │ │
           │ │ │ │ │ │ │ │ │ │ └─ run.completed
           │ │ │ │ │ │ │ │ │ └─── persistence (rolebinding pinned)
           │ │ │ │ │ │ │ │ └───── egress detection + alert
           │ │ │ │ │ │ │ └─────── data.exfil
           │ │ │ │ │ │ └───────── data.stage to worker
           │ │ │ │ │ └─────────── db_anomalous_query + alert (DIRECT db access)
           │ │ │ │ └───────────── node.compromised on db
           │ │ │ └─────────────── attack.lateral.connect (with stolen creds)
           │ │ └───────────────── secret read + k8s detection #2
           │ └─────────────────── rolebinding + k8s detection #1
           └───────────────────── preconditions: api-service already compromised
```

Scrub targets for the demo: `T+00:04.2` (first k8s detection — the **earliest preventable moment**), `T+00:14.4` (database compromise — the **point of no return**), `T+00:25.4` (exfil — the **observable consequence**). The educational beat is showing all three on the same timeline and asking "which one would you have caught first?"

### 3.8 Attack Propagation Behavior

Propagation is **identity-led, not network-led** — and this is what makes the scenario visually distinct:

```
api-service (compromised)
       │
       │ k8s API: create rolebinding
       ▼
  [k8s control plane]   ← not a topology node; rendered as a logical overlay badge
       │
       │ now: cluster-admin tokens available
       ▼
api-service (with elevated identity)
       │
       │ k8s API: read secret/db-credentials
       ▼
api-service (now holding db creds)
       │
       │ direct postgres connection (bypassing api → db edge as designed)
       ▼
       db ──→  data ──→ worker ──→ external
```

The key visualization beat: the api-service → db connection at step 10 uses a **dashed edge that does not exist in the declared topology**. The renderer draws it as a "ghost edge" in red, emphasizing that the attacker is no longer traveling the documented paths.

### 3.9 Infrastructure Impact

| Node | Final state | Marks / persistence | Notes |
|---|---|---|---|
| `api-service` | compromised (high, escalated) | `persistence:rolebinding/attacker-admin` | Now holds cluster-admin equivalent |
| `auth-service` | uncompromised | `secret_read_anomaly` | Observed unusual API calls but is not the target |
| `db` | compromised (high, credential-level) | `direct_access_from_workload` | Connection by-passed application layer |
| `worker` | compromised (high) | `egress_origin` | Final pivot |
| Others | uncompromised | — | — |

`api-service` is shown with **both** a red ring *and* a small key icon at the corner — the key encodes "identity-level escalation in addition to compromise." It is the only scenario in MVP that uses this visual.

### 3.10 Frontend Visualization Behavior

| Event | Animation |
|---|---|
| `attack.k8s.enumerate` | api-service node briefly shows a small "👁" reconnaissance badge for 600ms |
| `attack.k8s.create_rolebinding` | A **gold key icon** materializes at api-service's corner with a 400ms scale-in. Persists for the rest of the run |
| `k8s_privileged_change` detection | Detection aura around api-service; rule chip "k8s_privileged_change · T1098 / T1548" hovers for 1.2s |
| `attack.k8s.secret_read` | A **dotted line** flashes between api-service and a small `auth-service` secret-store glyph; the secret glyph briefly turns amber |
| `attack.lateral.connect` (api-service → db via stolen creds) | The renderer draws a **new dashed red edge** directly between api-service and db (this edge does not exist in the declared topology). Particle traverses |
| `node.compromised` on db | Red compromise ring fills, but **with a small lock icon overlay** distinguishing credential-level from OS-level compromise |
| `attack.data.stage` to worker | Standard particle traversal |
| `attack.data.exfil` | External sigil + particle out of canvas |
| `attack.persistence` | The gold key icon at api-service gets a small "pin" — persistence is now locked in across run boundaries |

The gold key + ghost edge + lock icon combination is the visual signature of the privilege-escalation scenario. A returning user recognizes the scenario by these cues alone.

### 3.11 Example Event Payloads

**The RoleBinding creation event (step 4):**

```json
{
  "event_id": "01HX...PE04",
  "run_id":   "c3d2-...-privesc",
  "seq": 5,
  "ts_us": 4000000,
  "source": "attacker",
  "kind": "attack.k8s.create_rolebinding",
  "severity": "high",
  "node_id": "api-service",
  "actor": "api-service",
  "target": {
    "node_id": "api-service",
    "service": "k8s-api",
    "identity": "system:serviceaccount:traceveil:api-service-sa",
    "path": "/apis/rbac.authorization.k8s.io/v1/clusterrolebindings"
  },
  "caused_by": ["01HX...PE03"],
  "mitre": ["T1098", "T1548.003"],
  "effect": {
    "type": "compromise",
    "node_id": "api-service",
    "severity": "high"
  },
  "raw": {
    "k8s_verb": "create",
    "k8s_resource": "clusterrolebinding",
    "k8s_object_name": "attacker-admin",
    "k8s_role_ref": "cluster-admin",
    "k8s_subjects": [
      { "kind": "ServiceAccount", "name": "api-service-sa", "namespace": "traceveil" }
    ]
  }
}
```

**The k8s_privileged_change detection (step 5):**

```json
{
  "event_id": "01HX...PEDET1",
  "run_id":   "c3d2-...-privesc",
  "seq": 6,
  "ts_us": 4200000,
  "source": "detection",
  "kind": "detection.fired",
  "severity": "high",
  "node_id": "api-service",
  "actor": "detection-engine",
  "target": { "node_id": "api-service" },
  "caused_by": ["01HX...PE04"],
  "mitre": ["T1098"],
  "effect": {},
  "raw": {
    "rule_id": "k8s_privileged_change",
    "rule_version": "1",
    "matched_event_ids": ["01HX...PE04"],
    "evidence": {
      "verb": "create",
      "resource": "clusterrolebinding",
      "originator_pod": "api-service-7b9f...",
      "role_ref": "cluster-admin",
      "is_baseline": false
    },
    "on_time": true,
    "severity_derived": "high"
  }
}
```

**The direct db connection (step 10):**

```json
{
  "event_id": "01HX...PE10",
  "run_id":   "c3d2-...-privesc",
  "seq": 13,
  "ts_us": 14000000,
  "source": "attacker",
  "kind": "attack.lateral.connect",
  "severity": "critical",
  "node_id": "db",
  "actor": "api-service",
  "target": {
    "node_id": "db",
    "service": "postgres",
    "port": 5432,
    "identity": "postgres-superuser"
  },
  "caused_by": ["01HX...PE07"],
  "mitre": ["T1078.004", "T1021.004"],
  "effect": {
    "type": "traversal",
    "from_node": "api-service",
    "to_node": "db",
    "protocol": "postgres",
    "ghost_edge": true
  },
  "raw": {
    "credentials_source": "k8s_secret:db-credentials",
    "stolen_at_event": "01HX...PE07"
  }
}
```

Note `effect.ghost_edge: true` — this is the renderer's signal to draw a new edge that wasn't in the declared topology. It's a small protocol detail with a big visual payoff.

**The persistence event (step 19):**

```json
{
  "event_id": "01HX...PE19",
  "run_id":   "c3d2-...-privesc",
  "seq": 23,
  "ts_us": 30000000,
  "source": "attacker",
  "kind": "attack.persistence",
  "severity": "high",
  "node_id": "api-service",
  "actor": "api-service",
  "target": { "node_id": "api-service" },
  "caused_by": ["01HX...PE04"],
  "mitre": ["T1098"],
  "effect": {
    "type": "persistence",
    "node_id": "api-service",
    "artifact": "rolebinding:attacker-admin"
  },
  "raw": {
    "survives_pod_restart": true,
    "survives_namespace_delete": false
  }
}
```

### 3.12 Replay Engine Integration

At `t = 14500000` (right after db compromise via stolen creds):

```json
{
  "t_us": 14500000,
  "nodes": {
    "api-service": {
      "compromise": "compromised",
      "severity": "high",
      "since_us": 0,
      "marks": ["identity_escalated"],
      "persistence": []
    },
    "db": {
      "compromise": "compromised",
      "severity": "high",
      "since_us": 14400000,
      "marks": ["direct_access_from_workload"],
      "compromise_kind": "credential"
    },
    "auth-service": {
      "compromise": "uncompromised",
      "marks": ["secret_read_anomaly"],
      "severity": "info"
    }
  },
  "edges": [
    /* ... declared edges with appropriate highlights ... */
    { "from": "api-service", "to": "db", "kind": "ghost", "highlighted": true, "protocol": "postgres" }
  ],
  "detections_so_far": [
    { "rule": "k8s_privileged_change", "ts_us":  4200000, "on_time": true },
    { "rule": "k8s_privileged_change", "ts_us":  8200000, "on_time": true }
  ],
  "in_flight_steps": [
    { "kind": "attack.data.read", "started_us": 15000000, "expected_end_us": 22000000 }
  ]
}
```

Two non-standard fields visible here: `compromise_kind: "credential"` on db (instead of OS-level compromise) and the `kind: "ghost"` edge that the renderer adds dynamically. Both are demonstrations of how the replay frame is the **complete, authoritative state** at time `t` — even ad-hoc constructs like ghost edges live in the frame, not in client-side animation logic.

The scrub experience for this scenario is the richest of the three: identities elevate, edges materialize, and node compromise distinguishes between OS-level (red ring) and credential-level (red ring + lock icon). A demo viewer can scrub the playhead through `T+00:04` → `T+00:08` → `T+00:14` and watch the attacker's *posture* on the same node change three times without the node itself moving.

---

## Closing Notes

These three scenarios are designed to **cover the visual grammar** of Traceveil:

- **SQL Injection** — application-layer compromise, linear propagation, exfiltration.
- **Brute Force** — identity-layer compromise, behavioral detection, the "legitimate-looking but malicious" traversal.
- **Privilege Escalation** — identity-layer elevation, k8s-aware detection, ghost edges, persistence.

Together they exercise every effect type (`compromise`, `traversal`, `mark`, `persistence`), every event source (`attacker`, `host`, `app`, `detection`, `alert`, `system`), and every visual mode (compromise ring, ghost edge, identity badge, exfiltration sigil) that the renderer ships in MVP.

Adding a fourth scenario should not require adding new event kinds — if it does, that's a signal the scenario wants a renderer change. Worth noting as a future task before extending the catalog.

All three scenarios are **intentionally simulated for educational and visualization purposes.** No real exploit primitive lives in this repository. The payloads above describe *what an attack looks like to a defender*, which is what the platform exists to teach.

— *End of Attack Scenarios v0.1*
