# Traceveil — MVP Definition

**Version:** 0.3 (personal-project framing)
**Status:** Scope lock for 2-week solo build
**Window:** 14 calendar days
**Last revised:** 2026-05-12

> Companion docs: [FOUNDATION.md](FOUNDATION.md) · [ARCHITECTURE.md](ARCHITECTURE.md) · [EVENT-SYSTEM.md](EVENT-SYSTEM.md) · [ATTACK-SCENARIOS.md](ATTACK-SCENARIOS.md)

> **Read this first.** Traceveil is a personal cybersecurity engineering project, not a product launch. This MVP is the **finished form** of the project: a polished, end-to-end, demoable cybersecurity simulation lab. The success criterion is a 4-minute walkthrough I'd be happy to put on a portfolio site and feel proud of — not a pitch.

---

## 1. MVP Objective

Build, in 14 days and solo, a polished, end-to-end cybersecurity simulation lab that demonstrates the core idea:

> **Launch a simulated cyber attack against a live infrastructure topology, watch it propagate in real time, see detections fire, and then replay the entire incident on an interactive timeline.**

Three sub-objectives, ranked. If a feature serves #N at the expense of #N−1, it is cut.

1. **Cybersecurity surface.** The project must look and feel like a serious next-gen security tool. Topology, propagation, detections, replay — this is where most of the engineering effort goes.
2. **DevOps competence.** The repo shows containerized services, working CI/CD, a Kubernetes deployment, Prometheus + Grafana wired in, and a Trivy scan. Nothing is missing; nothing is faked. DevOps is a learning track, not a marketing surface.
3. **A coherent, demoable loop.** "Open Traceveil → launch attack → watch it spread → replay it → see the scorecard" must run end-to-end in under 4 minutes with zero manual intervention.

Non-objectives: production hardening, real exploitation, multi-tenancy, scenario authoring UI, anything that takes more than a day and serves none of the above.

---

## 2. MVP Philosophy

Five tenets that govern in-flight decisions during the build.

1. **Polish over surface area.** A small project that feels finished beats a large one that feels broken. Fewer features at higher visual quality.
2. **Cybersecurity is the foreground; DevOps is the backdrop.** Most of the engineering effort goes into the cybersecurity canvas (topology, propagation, detections, replay). DevOps gets enough effort to be real, modern, and self-respecting — not more.
3. **Real plumbing, simulated attacks.** The web app, the API, the database, the WebSocket, the event store — all real. The "attacks" are scripted YAML timelines. The boundary between real and simulated is honest, and the repo is up-front about it.
4. **One screen, deep.** A single primary screen — topology canvas with timeline and event rail — used in three modes (Live, Replay, Detections). No multi-page navigation maze.
5. **Cinematic, not corporate.** Dark theme, sparse chrome, deliberate motion. Animation timing carries meaning. The project should look like something I'd want to open on a Saturday.

---

## 3. Core User Journey

The user opens Traceveil and sees a dark topology canvas: 8 nodes (ingress, web frontend, API, auth, cache, queue, worker, database) connected by faint edges. A sidebar lists three pre-built **attack scenarios** with MITRE ATT&CK tags.

They click **Launch** on *"SQL Injection → Auth Bypass → Data Exfiltration"*.

Over the next ~90 seconds:

1. The **web frontend node**'s outer ring fills red as it compromises.
2. An animated edge brightens; a particle travels from frontend to API.
3. The **API node** compromises next. Event cards slide into the right rail.
4. A **detection fires** on the WAF — the detecting node briefly pulses with the rule name and a MITRE tag.
5. The attack laterally moves to the **database**. Another detection fires, late.
6. The bottom **timeline** fills left-to-right with attacker steps and detection ticks.
7. The run ends. A **scorecard** card animates in: *4 of 6 expected detections fired (1 late, 2 missed).*

The view transitions seamlessly into **Replay mode**. The user drags the playhead back to T+12s — the graph reverts to "only frontend compromised." They scrub forward at 0.5× speed and watch the breach again. They click the database node to inspect what happened to it.

Then a quick tab to the **Telemetry** view — an embedded Grafana panel shows live metrics from the run that just happened.

End of demo. Total time on screen: ~3:30.

---

## 4. Included Features

The complete list. If it's not here, it's not in the MVP.

### Cybersecurity Features

| # | Feature | Notes |
|---|---|---|
| C1 | Live infrastructure topology graph | 8 nodes, declared in YAML, force-layout once then frozen |
| C2 | Attack simulation panel | Sidebar lists 3 scenarios with MITRE tags; click to launch |
| C3 | Three pre-built attack scenarios | SQL injection, brute force, privilege escalation |
| C4 | Real-time attack propagation animation | Compromise rings, animated edges, particle traversal |
| C5 | Real-time event timeline | Bottom bar, fills live, scrubbable in replay |
| C6 | Right-rail event stream | Cards slide in per event; clickable for inspector |
| C7 | Detection engine + alert generation | 6 hardcoded rules, MITRE-tagged, fire against scripted events |
| C8 | Run scorecard | Expected vs fired detections, on-time/late/missed |
| C9 | Incident replay engine | Scrub, play/pause, 0.5×/1×/2× speeds |
| C10 | Attack storytelling overlays | Attack path overlay, detection coverage heat (replay only) |
| C11 | Run history | Last 20 runs, click to open replay |
| C12 | Node inspector | Click a node → side panel with state, related events |

### DevOps Features

| # | Feature | Notes |
|---|---|---|
| D1 | Dockerized frontend + backend | Multi-stage builds, distroless/alpine final, non-root |
| D2 | `docker-compose.yml` for local dev | One command brings up the whole product |
| D3 | GitHub Actions CI/CD | Lint, test, build, push to GHCR, scan |
| D4 | Kubernetes deployment | k3d-based, raw manifests + one minimal Helm chart |
| D5 | Prometheus scrape of backend `/metrics` | Real metrics from a running scenario |
| D6 | Provisioned Grafana dashboard | One dashboard, embedded in the app at `/telemetry` |
| D7 | Trivy container scanning in CI | Warn on MEDIUM, fail on HIGH/CRITICAL for direct deps |
| D8 | Single-user authentication | Email + password, seeded demo account |

That is the full MVP. **27 items.** Any addition cuts something else from this list.

---

## 5. Excluded Features

Hard cuts. Do not negotiate with these mid-sprint.

### Cybersecurity exclusions
- ❌ Real malware execution / real exploits / real CVE payloads
- ❌ Real attack infrastructure (no actual victim machines being compromised)
- ❌ Custom scenario authoring UI (scenarios are YAML in the repo)
- ❌ Custom environment authoring UI (one declared topology)
- ❌ Sigma / Falco / Wazuh / ModSecurity / YARA rule engines
- ❌ Counterfactual replay, compare-mode, multi-run diffs
- ❌ Identity graph view, data-flow sensitivity overlays
- ❌ Threat intel feeds, IOC lookups
- ❌ AI copilots, LLM-driven analysts, anomaly detection

### DevOps exclusions
- ❌ Kafka, RabbitMQ, NATS — Redis Pub/Sub only
- ❌ Terraform, Pulumi, CloudFormation
- ❌ AWS / GCP / Azure deployment (k3d local only)
- ❌ Service mesh (Linkerd, Istio)
- ❌ ArgoCD / Flux / any GitOps controller
- ❌ External Secrets Operator, Vault
- ❌ Cosign, SBOM publishing, OPA Gatekeeper, admission webhooks
- ❌ Helm chart with rich values; one minimal chart only

### Product exclusions
- ❌ Multi-tenancy, organizations, teams, invites
- ❌ Advanced RBAC — single user, single role
- ❌ TOTP, SSO, OIDC
- ❌ Public API, SDKs, marketplace
- ❌ Billing, plans, marketing site
- ❌ Mobile / responsive below 1280px
- ❌ i18n, dark/light theme toggle (dark only)

If I find myself wondering "where's X?" mid-build — X is in [FOUNDATION.md §15](FOUNDATION.md) as a future exploration. The MVP scope is locked.

---

## 6. Real vs Simulated Components

Honesty in this table is the most important section of the document. The MVP works because the boundary between real and simulated is the *right* boundary.

| Component | Status | Notes |
|---|---|---|
| Web SPA (React) | **Real** | Full implementation |
| Backend API (FastAPI) | **Real** | Monolith, real routes, real DB |
| PostgreSQL event store | **Real** | One DB, schemas separated logically |
| Redis (cache + pub/sub) | **Real** | Used for WS fan-out and rate limit |
| WebSocket transport | **Real** | In-process inside FastAPI |
| Authentication | **Real, minimal** | Email/password, Argon2id, JWT |
| Docker images | **Real** | All services containerized |
| docker-compose stack | **Real** | One-command bring-up |
| Kubernetes deployment | **Real** | k3d locally; manifests + Helm chart |
| GitHub Actions CI | **Real** | Lint → test → build → push → scan |
| Trivy container scan | **Real** | Runs in CI on every PR |
| Prometheus scrape | **Real** | Backend `/metrics` is genuine |
| Grafana dashboard | **Real** | Reads live data during demo |
| Topology data | **Real** (from YAML) | Declared environment, parsed and served |
| Attack scenarios | **Simulated** | Scripted YAML state machines |
| Compromise of "victim" services | **Simulated** | Status flips in DB; no real RCE |
| Detection rules | **Simulated** | Hardcoded Python predicates over events |
| Per-node telemetry samples | **Simulated** | Generator emits realistic CPU/syscall curves |
| MITRE ATT&CK tagging | **Real** | Genuine technique IDs throughout |
| Replay engine | **Real** | Reads real DB rows; scrubber is real |
| Scorecard math | **Real** | Computed from real rows; rows are scripted |

**The rule:** the *plumbing* is real; the *attacks* are theater. Every byte the UI renders travels real wires — Postgres → Redis → WS → React. The originating event is scripted, but nothing downstream knows or cares.

---

## 7. Frontend Scope

**Stack.** React 18, TypeScript, Vite, TailwindCSS, Framer Motion, Cytoscape.js, Zustand, TanStack Query, native `WebSocket`.

**Routes (final list, do not grow):**
- `/login` — single form, no signup
- `/` — environment dashboard with scenario sidebar and topology canvas (idle state)
- `/run/:id` — Live mode (active scenario)
- `/run/:id/replay` — Replay mode (scrubber active)
- `/telemetry` — embedded Grafana iframe
- `/runs` — run history list

**Components that matter, in priority order:**
1. **Topology canvas** — Cytoscape with custom node renderer, compromise ring overlay, animated edge stroke, particle effect on traversal.
2. **Bottom timeline** — fills left-to-right in live mode; scrubbable handle in replay.
3. **Right-rail event stream** — cards with stagger-in animation, MITRE tag chip, click to inspect.
4. **Scorecard card** — animates in at run end, shows expected/fired/late/missed.
5. **Scenario launcher** — left sidebar, three cards, MITRE tags visible.
6. **Node inspector** — slide-in panel on node click.
7. **Login screen** — one form, dark theme, no marketing copy.

**Visual targets.**
- 60fps on the canvas at our actual count (8 nodes, ≤ 12 edges).
- Dark theme only. One accent color (red for compromise, green for healthy, amber for detection).
- Animations capped — Framer Motion durations 200–600ms, no shader work, no canvas particle systems beyond a single dot per traversal.

**Anti-goals.** No Storybook, no design-system extraction, no i18n, no accessibility audit beyond keyboard nav and contrast, no responsive layouts.

---

## 8. Backend Scope

**One service. One framework. One database.**

- **FastAPI** monolith, Python 3.12, fully async.
- **Internal modules** (folders, not services): `auth`, `environment`, `scenario`, `runner`, `events`, `replay`, `detections`, `realtime`.
- **PostgreSQL** via SQLAlchemy 2.x async + Alembic migrations.
- **Redis** for pub/sub fan-out to WS clients, dedupe windows, and login rate limiting.
- **Background tasks** via `asyncio.create_task`. **No Celery, no RabbitMQ, no Kafka.**
- **Scenario runner** is a Python coroutine that walks a YAML scenario, sleeps the declared deltas, writes events to Postgres, publishes to Redis.
- **WebSocket endpoint** subscribes the client to a Redis channel and fans events out.

**Endpoints — final list:**
- `POST /auth/login` · `POST /auth/refresh` · `POST /auth/logout`
- `GET /environment` (the one declared environment)
- `GET /scenarios` · `GET /scenarios/{id}`
- `POST /runs` (launch) · `GET /runs` · `GET /runs/{id}`
- `GET /runs/{id}/events?from=&to=` · `GET /runs/{id}/frame?t=`
- `GET /detections/rules` · `GET /runs/{id}/scorecard`
- `GET /healthz` · `GET /metrics`
- `WS /ws/runs/{id}`

That's it. ~13 routes. If a new route is needed, something else gets cut.

---

## 9. DevOps Scope

DevOps in the MVP exists to **support the cybersecurity product, demonstrate competence, and not be embarrassing to a senior engineer reviewing the repo**. Nothing more.

**Docker.**
- Multi-stage Dockerfiles for backend (`python:3.12-slim` → distroless) and web (`node:20` build → `nginx:alpine`).
- Non-root user (`USER 10001`), read-only root FS where possible.
- Image size targets: backend < 200 MB, web < 50 MB compressed.

**docker-compose.**
- One root `docker-compose.yml` brings up: postgres, redis, backend, web, prometheus, grafana.
- `make demo` is the single entrypoint. A reviewer clones → runs → sees Traceveil running in < 3 minutes.

**GitHub Actions CI.** One workflow file, four jobs:
1. **lint-test** — ruff, mypy, vitest, pytest.
2. **build-push** — buildx, push to `ghcr.io/<user>/traceveil-{backend,web}:<sha>` (and `:latest` on `main`).
3. **scan** — Trivy on both images. Warn on MEDIUM, **fail on HIGH/CRITICAL** for direct deps. Result uploaded as a SARIF artifact.
4. **k8s-validate** — `kubectl apply --dry-run=server` against an ephemeral k3d cluster to prove manifests are valid.

**Repo hygiene.** Branch protection on `main`, required CI green, `CODEOWNERS` (self), `gitleaks` pre-commit hook, Dependabot weekly.

**Deliberately out of DevOps scope:** Terraform, ArgoCD, multi-environment promotion, blue/green or canary, secrets managers, supply-chain signing. Listed in [FOUNDATION.md](FOUNDATION.md), skipped here.

---

## 10. Kubernetes Scope

The K8s story is **demonstrated, not productionized**. It exists to show this is cloud-native, not to run real workloads.

- **Local cluster via k3d.** `make k8s` brings up a single-node cluster and applies the manifests. No EKS, no GKE, no cloud cost.
- **Manifests under `deploy/k8s/`:**
  - `Namespace: traceveil`
  - `Deployment + Service` for: backend, web, postgres (single-replica + PVC), redis, prometheus, grafana.
  - `Ingress` via Traefik (k3d default) on `traceveil.localhost`.
  - `ConfigMap` for backend config, `Secret` for DB credentials.
  - One `ServiceMonitor` (or static Prom scrape config — whichever is shorter).
- **One minimal Helm chart** wrapping the above. Existence is the point; rich `values.yaml` is not.
- **Explicitly out of scope:** HPA, PDBs, NetworkPolicies, mTLS, service meshes, operators, sealed secrets, multi-namespace tenancy.

The Kubernetes deployment is a ~30-second moment in the recorded demo — `make k8s && open http://traceveil.localhost` — not the main act.

---

## 11. Monitoring Scope

Observability in MVP is a **credible 60–90 second segment** of the demo, not an SRE practice.

**Prometheus** scrapes backend `/metrics` (exposed via `prometheus-fastapi-instrumentator`).

**Instrumented metrics — final list:**
- `traceveil_http_requests_total{route,method,status}`
- `traceveil_ws_connected_clients`
- `traceveil_events_published_total{source}`
- `traceveil_scenario_step_duration_seconds`
- `traceveil_detection_fired_total{rule,on_time}`
- `traceveil_active_runs`

**Grafana** with one provisioned dashboard, **"Traceveil Live"**:
- Active runs (stat)
- WebSocket clients (stat)
- Events/sec (timeseries)
- Detections fired by rule (bar gauge)
- Scenario step duration p95 (timeseries)
- HTTP error rate (timeseries)

Embedded in the app via `/telemetry` (iframe). If iframe auth proves fiddly mid-sprint, fall back to opening Grafana in a new tab.

**Out of MVP scope:** Loki, Tempo, OpenTelemetry traces, Pyroscope, custom recording rules, alerting. `docker compose logs -f` is the MVP "log aggregator."

---

## 12. Security Scope

We are a cybersecurity product. We do not need to be *hardened*, but we must not be *embarrassing*.

**In scope:**
- **Argon2id** for password hashing (`argon2-cffi`).
- **JWT** access tokens (15-min TTL), refresh tokens stored hashed in DB.
- **HTTPS-only, SameSite cookies** for refresh; access in memory on the SPA.
- **CORS** locked to the configured frontend origin.
- **Login rate limit** via Redis counter (10/min/IP). The only rate limit.
- **Pydantic input validation** on every route.
- **`.env` for local secrets, `Secret` in k8s.** Never in Git.
- **`gitleaks` pre-commit hook** to enforce that.
- **Trivy** runs in CI on every PR; fails on HIGH/CRITICAL for direct deps.
- **`pip-audit` + `npm audit`** in CI, warn-only.
- **Demo account credentials** seeded by a migration so the README can say `demo@traceveil.dev / demo1234`.

**Out of scope:** TOTP, SSO, OIDC, cosign, SBOM publishing, OPA, advanced RBAC, threat modeling docs, penetration testing, SOC2 controls.

The security posture is *demo-credible*. Anything beyond that lives in [FOUNDATION.md](FOUNDATION.md).

---

## 13. Replay Engine Scope

Replay is one of two hero features. Corner-cutting here is what the user *feels* most.

**In scope:**

- Every run writes events to Postgres with `(run_id, seq, ts_us, source, actor, action, target, mitre, effect, raw_jsonb)`. Events are the ground truth.
- **`GET /runs/{id}/frame?t=`** returns the reconstructed state at time *t* (microseconds since run start). Implementation: a single SQL query for all events with `ts_us ≤ t` plus an in-memory fold to compute current node compromise states. At ≤ 200 events/run this is trivially fast — no snapshot system needed.
- **Scrubber UI** calls `frame?t=` on debounced drag (50ms throttle) and animates between frames.
- **Play / pause / 0.5× / 1× / 2× speeds** via client-side `requestAnimationFrame` advancing *t* and refetching when the visible frame would change.
- **"Jump to event"** — clicking an event in the right rail seeks the playhead.

**Out of scope:**
- Server-side snapshots (not needed at this event volume).
- Compare mode (two runs side-by-side).
- Counterfactual replay.
- Range-select scorecard.
- Bookmarks / shareable URLs with `?t=`.

**Acceptance bar:** scrub a 90-second run end-to-end on a clean M-series MacBook without perceptible stutter. If that bar isn't hit, the MVP fails objective #1.

---

## 14. Attack Simulation Scope

Attacks are **YAML-defined scripted timelines**. No real exploitation, ever.

**Scenario file shape:**

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
steps:
  - at: 2.8s
    actor: external
    action: http.exploit
    target: web-frontend
    effect: { compromise: web-frontend, severity: low }
    mitre: T1190
  - at: 8.2s
    actor: web-frontend
    action: sqli.payload
    target: api-service
    effect: { compromise: api-service, severity: medium }
    mitre: T1190
  - at: 14.0s
    actor: api-service
    action: data.read
    target: db
    effect: { mark: large_read }
    mitre: T1213
  - at: 28.0s
    actor: worker
    action: data.exfil
    target: external
    effect: { mark: data_exfil_attempted, node: db }
    mitre: T1005
```

The full canonical scenario definition (including all steps, detection-rule wiring, and frame examples) lives in [ATTACK-SCENARIOS.md §1](ATTACK-SCENARIOS.md). This is just the shape.

**The runner:**

1. Loads the YAML.
2. Iterates steps; `asyncio.sleep` to each step's relative time.
3. Writes an `Event` row, applies `effect` to the run's topology state.
4. Evaluates declared detection rules against the new event; if matched within `by_step`, writes a `DetectionFired` row.
5. Publishes the event and any detection to Redis pub/sub → WS clients.

**Three scenarios** ship in MVP, each ~20–50 steps, ~55–75 seconds wall-clock. They are specified in full in [ATTACK-SCENARIOS.md](ATTACK-SCENARIOS.md):

1. **SQL Injection → Auth Bypass → Data Exfiltration** (T1190 → T1213 → T1005 → T1041)
2. **Credential Brute Force → Account Takeover** (T1110 → T1110.003 → T1078)
3. **ServiceAccount Abuse → Cluster Admin → Secret Theft** (T1078.004 → T1098 → T1548.003 → T1552.007)

Between them they exercise every effect type (`compromise`, `traversal`, `mark`, `persistence`) and every renderer mode the MVP ships.

**Detection rules** are **6 hardcoded Python predicates** in `backend/detections/rules.py`. Each takes an `Event` and returns `bool`. Canonical list: `waf_suspicious_payload`, `db_anomalous_query`, `auth_brute_force`, `auth_success_after_failures`, `k8s_privileged_change`, `egress_unusual_destination`. Each is MITRE-tagged. Not Sigma, not Falco — functions over events.

---

## 15. UI/UX Scope

**Mood.** Dark, cinematic, dense without being noisy. Closer to a strategy game's HUD than to a Grafana board.

**Color system.**
- **Background:** near-black, two depths.
- **Accent (one):** electric red for compromise and danger.
- **Secondary:** muted teal for healthy state.
- **Detection signal:** amber pulse, used sparingly.
- **Type:** one mono font (canvas labels), one sans (body), four sizes.

**Motion principles.**
- Animation timing **encodes meaning** — compromise rings fill clockwise over the actual step duration, so attack speed is felt.
- Motion is reserved for **moments that mean something** — compromise, detection, edge traversal. Idle states are still.
- Durations capped at 600ms for hero animations, 120–250ms for chrome.
- **`prefers-reduced-motion`** respected — animations fall back to instant state changes with brief opacity cross-fade.

**Layout primitives.**
- **Left rail:** scenario launcher and scene switcher.
- **Center:** topology canvas, full bleed.
- **Right rail:** event stream (slides in during a run).
- **Bottom:** timeline (live-fills, then scrubs).
- **Top corner:** scorecard card (appears at run end).

**Component density target.** Every pixel of UI should be in service of telling the attack story. No empty marketing-style hero sections, no decorative iconography, no "Welcome back!" banners.

---

## 16. Technical Simplifications

Every simplification below is a deliberate downgrade from [FOUNDATION.md](FOUNDATION.md) chosen for the 2-week, solo budget.

| Foundation says | MVP does | Reason |
|---|---|---|
| 9 microservices | 1 FastAPI monolith with internal modules | Solo dev, 2 weeks |
| RabbitMQ / future Kafka | Redis Pub/Sub only | One less moving piece |
| Snapshot-plus-delta replay | Fold all events in memory per request | Trivial at ≤ 200 events |
| Per-env Kubernetes namespace + agent | No agent; "environment" is data in Postgres | No real workload to isolate |
| mTLS agent boundary | Plain JWT auth | No agent exists |
| Falco / Wazuh / ModSec ingest | Scripted events with realistic shape | Nothing is actually being attacked |
| Sigma rule compilation | Hardcoded Python predicates | 6 rules; not worth the engine |
| Cosign + OPA + SBOM | Trivy in CI | Pick the highest-signal one |
| ArgoCD GitOps | `kubectl apply` in a Makefile target | Demo doesn't need a control plane |
| Schema-per-service Postgres | One schema, one DB | One service |
| Cursor pagination everywhere | LIMIT/OFFSET for the run list | 20 runs in demo |
| Cytoscape canvas + LOD culling | Cytoscape default renderer | 8 nodes |
| Linkerd service mesh | Plain ClusterIP services | No mesh, no problem at this size |
| External Secrets Operator | k8s `Secret` from `.env` | Demo-grade is fine |
| Terraform | k3d locally | No cloud spend, no infra to manage |

---

## 17. Engineering Tradeoffs

Calling these out so they aren't surprises mid-build.

- **No agent → no real environment.** "Infrastructure" is data in Postgres; "compromise" is a status update. The README and demo are explicit that the infrastructure is simulated, not a live cluster. Honesty is the contract.
- **Scripted attacks → zero authenticity to a deep code inspector.** A security-savvy reviewer reading `scenarios/*.yaml` sees immediately that this is theater. That's fine — the project is about the *experience and the engineering*, not pretending to be a red-team tool. The repo is up-front.
- **Monolith → harder to story-tell as "microservices."** Counter: modules are split cleanly along the boundaries described in [ARCHITECTURE.md §3](ARCHITECTURE.md), the README has an architecture diagram showing the *intended* service split, and the Helm chart is shaped to be split later if I ever want to.
- **Redis Pub/Sub → events are not durable on the bus.** That's fine — durability is Postgres. Bus is transport only.
- **k3d locally → no public URL.** Counter: the recorded demo and GIFs in the README do the lifting. A live deploy to Fly.io or Render is a stretch goal for days 13–14, never a commitment.
- **6 hardcoded rules → small detection surface.** Counter: each maps to a real MITRE technique and has a realistic name. The rule code is visible in the repo; nothing is hidden.
- **No real telemetry agents → no Falco/Wazuh story.** Counter: a `telemetry-faker` generator emits realistic per-node CPU and syscall curves that spike during attack steps. The Grafana panel shows real Prometheus data — the *source* of the spike is synthetic.

---

## 18. Feasibility Analysis

Day-by-day with explicit cut-lines. 14 calendar days, solo.

### Week 1 — Spine

- **Day 1 — Repo + skeleton.** Monorepo, pnpm + uv, Dockerfiles, `docker-compose.yml`, `Makefile`, `make demo` boots an empty backend and a blank web app. CI scaffold (lint-only job green).
- **Day 2 — Backend foundation.** FastAPI app, Postgres + Alembic, auth (login/refresh/logout), `/healthz`, `/metrics`. Seed demo user via migration.
- **Day 3 — Models + WebSocket.** Run, Event, DetectionFired, Scorecard tables. WS endpoint + Redis pub/sub. Smoke test: post a fake event via a script, see it on a WS client.
- **Day 4 — Scenario runner.** YAML loader, async timeline executor, scenario #1 authored end-to-end. Events land in DB and on the bus.
- **Day 5 — Topology + remaining backend APIs.** Environment YAML loader, `/environment` endpoint, `/scenarios`, `/runs` create/list/get, `/runs/{id}/events`, `/runs/{id}/frame?t=`, `/runs/{id}/scorecard`.

**Cut-line at end of Week 1.** If scenario runner + WS + events-in-DB do not work end-to-end, **drop scenario #3 and the Kubernetes segment**. The product matters more than the K8s portion of the demo.

### Week 2 — Surface

- **Day 6 — Frontend skeleton.** Vite + Tailwind + routing + login screen + topology canvas with the 8-node environment rendered statically.
- **Day 7 — Live mode.** WS client, event-stream right rail, compromise-ring animation, edge attack animation. Wire to a live run end-to-end.
- **Day 8 — Timeline + scenario launcher.** Bottom timeline component, left sidebar with three scenarios, launch button. Author scenarios #2 and #3.
- **Day 9 — Replay mode.** Scrubber, play/pause, speeds, `frame?t=` integration, scorecard card animation.
- **Day 10 — Detections + polish.** Detection aura, attack-path overlay, detection-coverage heat overlay, full color and motion pass. **Polish day** — do not start new features.
- **Day 11 — Kubernetes + observability.** k3d manifests, minimal Helm chart, Prometheus scrape, Grafana dashboard provisioning, `/telemetry` route, Trivy in CI.
- **Day 12 — CI hardening + README.** Push images to GHCR, README with one-command demo, architecture diagram, GIFs, badges.
- **Day 13 — Bug bash + demo recording.** Record the 4-minute walkthrough. Fix every visible jank. Re-record until it's clean.
- **Day 14 — Buffer.** Stretch goals only if green: Fly.io public deploy, sound design, Loom commentary track, a fourth scenario.

**Feasibility verdict.** Achievable for a focused solo engineer with no major detours. The single largest risk is **canvas animation polish** (Day 7 + Day 10) — where time silently disappears. Mitigation: timebox Day 7 to "functional, not pretty"; Day 10 is the polish day, no new features allowed.

---

## 19. Final Demo Expectations

The recorded demo is the artifact I'd want to put on a portfolio site or pin to the README. It is the project's "finished form" in video — more important than any individual feature, because it's how a stranger will experience the whole thing in four minutes.

**Recording target.** ≤ 4 minutes, 1920×1080, system audio + brief voice-over, no edits hiding bugs.

**Demo script:**

- **0:00 — Cold open.** Title card: *"Traceveil — Simulate. Visualize. Replay."* Cut to dark topology canvas, idle, 8 nodes laid out, bottom timeline empty.
- **0:15 — One-line narration.** *"Traceveil is a personal cybersecurity engineering project — a lab for running attack scenarios against simulated infrastructure, watching them propagate live, and replaying every second."*
- **0:25 — Launch.** Click *Launch* on Scenario #1 (SQL Injection). Frontend node compromises (red ring fills). Event card slides in. Cursor follows the edge to API.
- **1:30 — Mid-run beat.** Detection fires; detecting node pulses with rule name. Scorecard updates in corner: *"2/6 detections so far."*
- **2:00 — Run completes.** Timeline full. Auto-transition to Replay mode. Scorecard expands.
- **2:15 — Scrub.** Drag playhead back to 0:08. Graph reverts. Drag forward to 0:18, then 0:45. Breach replays.
- **2:45 — DevOps interlude.** Tab over: GitHub Actions green, GHCR images, Trivy results, `make demo` README, Grafana dashboard showing live metrics from the run just played.
- **3:30 — Closing.** Cut back to topology. *"Versioned scenarios, replayable telemetry, real DevOps under the hood. A solo two-week experiment in attack simulation, replay, and DevSecOps integration."*

**Demo non-negotiables.**
- No browser dev tools open.
- No console errors.
- Whole demo runs from `make demo` on a clean clone with zero manual fix-ups.
- Grafana shows real, non-zero data because the recording is made during an active run.
- No `setTimeout`-faked events. No JSON files masquerading as live data.

---

## 20. MVP Success Criteria

The MVP is finished when **all five** are true. Any one missing = keep iterating.

1. **End-to-end loop works headless.** Fresh clone → `make demo` → log in as the seed user → launch any of the three scenarios → watch it animate live → scrub the resulting replay → see a scorecard. Zero manual intervention.
2. **DevOps story is real and visible.** GitHub Actions green on `main`; images published to GHCR; Trivy scan green; `make k8s` deploys to a local k3d cluster reachable at `traceveil.localhost`; Grafana dashboard shows live metrics during a run.
3. **A demo recording I'd put on my portfolio.** A ≤ 4-minute video, no edits hiding bugs, following the script in §19. Embedded in the README.
4. **The repo is presentable.** README leads with a GIF and the one-command bring-up. An architecture diagram is included. Code is linted, typed, and free of TODOs in committed files. The link to [FOUNDATION.md](FOUNDATION.md) explains what the project is.
5. **No visible theater.** No `setTimeout` faking events on the frontend. No checked-in JSON pretending to be a server response. Every animation reacts to a real WS message that came from a real DB write that came from a real scenario step. The simulation is honest about being a simulation; the plumbing beneath it is not.

If any one of these slips at the end of the 14-day window, the right call is to keep iterating until they're all true rather than declaring done on a half-baked loop. The deadline is the budget, not the floor.

— *End of MVP Definition v0.3*
