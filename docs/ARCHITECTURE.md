# Traceveil — Architecture

**Version:** 0.2
**Status:** Engineering architecture for a personal project
**Last revised:** 2026-05-12

> Companion docs: [FOUNDATION.md](FOUNDATION.md) (project vision) · [MVP.md](MVP.md) (2-week build scope) · [EVENT-SYSTEM.md](EVENT-SYSTEM.md) (canonical event model) · [ATTACK-SCENARIOS.md](ATTACK-SCENARIOS.md) (scenarios, environment, detection rules).

This document describes **how Traceveil is built**, not what it does or why. The project story lives in FOUNDATION; the build scope lives in MVP; the event-model contracts live in EVENT-SYSTEM. Here I cover the realtime spine, the simulation engine, the replay model, and the supporting DevOps that gets it shipped.

---

## 1. High-Level System Overview

Traceveil is a **single full-stack application** organized around three primitives:

> **Environment** (a declared topology) → **Scenario** (a scripted attack timeline) → **Replay** (a scrub-able reconstruction of the resulting events).

Everything else — the API, the WebSocket gateway, the detection engine, the monitoring stack — exists to make those three primitives feel real, fast, and watchable.

```
                       ┌──────────────────────────────┐
                       │           Browser            │
                       │  React + Cytoscape + Tailwind│
                       └───────┬───────────────┬──────┘
                               │ HTTP (REST)   │ WebSocket
                               ▼               ▼
                       ┌──────────────────────────────┐
                       │     FastAPI Monolith         │
                       │  ┌────────────────────────┐  │
                       │  │ auth / environment /   │  │
                       │  │ scenario / runner /    │  │
                       │  │ events / detections /  │  │
                       │  │ replay / realtime      │  │
                       │  └─────────┬──────────────┘  │
                       └────────────┼─────────────────┘
                            ┌───────┼───────┐
                            ▼       ▼       ▼
                       ┌────────┐ ┌──────┐ ┌─────────┐
                       │Postgres│ │Redis │ │ /metrics│
                       │ events │ │pub/sub│ │  Prom  │
                       │ runs   │ │ cache │ │ Grafana│
                       └────────┘ └──────┘ └─────────┘
```

**One service** for MVP (a FastAPI monolith with strict internal module boundaries). **One Postgres** for everything persistent. **One Redis** for pub/sub and short-lived cache. **One frontend** SPA. The architecture is intentionally small — its quality lives in *how* the pieces are arranged, not in *how many* pieces there are.

The shape is microservice-ready: each backend module is isolated by contract, owns its own tables, and never imports another module's internals. Splitting `scenario-runner` or `replay-service` into separate processes later is a packaging change, not a redesign.

---

## 2. Frontend Architecture

**Stack.** React 18 + TypeScript + Vite. TailwindCSS for utilities, Framer Motion for transitions, Cytoscape.js for the topology graph, Zustand for state, TanStack Query for HTTP, native `WebSocket` for live updates.

**App shape.**

```
apps/web/src/
├── main.tsx                  # entry
├── routes.tsx                # router config
├── modules/
│   ├── topology/             # Cytoscape integration, node/edge renderers
│   │   ├── canvas.tsx        # the graph itself
│   │   ├── overlays/         # attack-path, detection-heat
│   │   └── animations.ts     # compromise ring, edge particle
│   ├── timeline/             # bottom timeline (live + scrub)
│   ├── event-stream/         # right-rail card feed
│   ├── scorecard/            # run scorecard card
│   ├── scenario-launcher/    # left-rail scenario picker
│   └── inspector/            # node click panel
├── state/
│   ├── realtime.ts           # WS client + subscription manager
│   ├── run.ts                # current run, current scrub time, filters
│   ├── topology.ts           # current frame (nodes + edges + compromise)
│   └── session.ts            # auth, prefs
├── lib/
│   ├── api.ts                # typed HTTP client
│   ├── ws.ts                 # WebSocket connector + reconnect
│   └── mitre.ts              # technique id → label lookup
└── design-system/            # tokens, primitives
```

**Rendering discipline.** Only two components are allowed to drive >5 re-renders per second: the topology canvas and the timeline scrubber. Everything else subscribes via Zustand selectors with shallow comparison.

**Canvas pipeline.**

1. On run start, the client fetches `GET /environment` → builds the Cytoscape graph once. Layout is force-directed at first load, then frozen and cached in `localStorage` so spatial memory is preserved across sessions.
2. The WS pushes **frame deltas** (compromise state changes, in-flight steps, detection firings). The canvas applies them and triggers Framer Motion animations on the affected nodes/edges.
3. In Replay mode, the scrubber drives an authoritative `frame?t=` fetch (debounced 50ms); the client interpolates positions between frames but never invents state.

**State separation.** Server state lives in TanStack Query caches. UI state (scrub time, selected node, overlay toggles) lives in Zustand. WebSocket-driven realtime state lives in a dedicated Zustand store that the canvas subscribes to with fine-grained selectors.

---

## 3. Backend Architecture

**Stack.** Python 3.12, FastAPI, async throughout. SQLAlchemy 2.x async + Alembic for Postgres. `redis-py` async for cache and pub/sub. Pydantic v2 for every cross-boundary schema.

**Module layout.**

```
services/api/app/
├── main.py                   # FastAPI app, lifespan
├── config.py                 # env-driven settings
├── modules/
│   ├── auth/                 # login, refresh, JWT, password
│   ├── environment/          # YAML loader, /environment endpoint
│   ├── scenario/             # catalog, plan compilation
│   ├── runner/               # async scenario execution coroutine
│   ├── events/               # event store, persistence, querying
│   ├── detections/           # rule predicates, scoring
│   ├── replay/               # /frame?t=, fold-events algorithm
│   └── realtime/             # WS gateway, Redis fan-out
├── domain/
│   ├── events.py             # canonical Event, Detection, Frame schemas
│   ├── topology.py           # Node, Edge, CompromiseState
│   └── mitre.py              # technique IDs as enum
├── infra/
│   ├── db.py                 # asyncpg session factory
│   ├── redis.py              # connection pool, pub/sub helpers
│   └── otel.py               # metrics + structured logging
└── api/
    ├── routes/               # FastAPI routers (one per module)
    └── deps.py               # auth dependency, current user
```

**Module boundary contract.** A module exposes:

- A **public API** under `app.modules.<name>.api` — Pydantic schemas and pure functions.
- An **internal implementation** under `app.modules.<name>.impl` — never imported across modules.
- A **router** mounted in `app.api.routes`.

Cross-module communication happens via published events (Redis pub/sub) or through explicit function calls into a module's public API. **No module imports another module's `impl`.** This is enforced by lint and by convention; it's what lets us split later without a rewrite.

**Async everywhere.** Every I/O call is awaited. Synchronous DB drivers, sync `requests`, and `time.sleep` are banned. The scenario runner uses `asyncio.sleep`, the WS gateway uses `asyncio.Queue` for per-client outbound buffers, and DB calls go through `asyncpg`.

**Lifespan.** A FastAPI lifespan context boots: DB pool, Redis pool, OTel exporter, then registers the realtime gateway's Redis subscriber as a background task. Shutdown cancels in-flight runs cleanly.

---

## 4. Event-Driven System Design

Events are the primary state-change currency in Traceveil. Three kinds, each with a distinct role:

| Class | Purpose | Examples | Transport |
|---|---|---|---|
| **Telemetry events** | Observations during a run | `attacker.http.exploit`, `host.cpu.spike` | Redis Pub/Sub |
| **Domain events** | Traceveil's own state changes | `RunStarted`, `NodeCompromised`, `DetectionFired`, `RunCompleted` | Redis Pub/Sub |
| **Commands** | Imperative requests | `LaunchScenario`, `AbortRun` | In-process function calls (MVP) |

**Why Redis Pub/Sub and not Kafka or RabbitMQ.** At MVP volumes (≤ 200 events per run, 1–5 concurrent viewers), Redis Pub/Sub has zero operational cost and sub-millisecond fan-out. Durability lives in Postgres — the bus is *transport*, not *log*. If we ever need replayable buses, we migrate `telemetry.*` to Kafka and leave `domain.*` on its current transport. This is a packaging change, not a re-architecture.

**Channel topology.**

```
run:{run_id}                    — domain events for a specific run
run:{run_id}:events             — telemetry for a specific run
run:{run_id}:detections         — detection firings for a specific run
system                          — global lifecycle messages (deploy, etc.)
```

A WebSocket client connected to `/ws/runs/{run_id}` subscribes to all three `run:{id}*` channels and receives a multiplexed stream.

**Canonical event schema.** The `Event` envelope — fields, invariants, severity rules, timestamping rules, content-addressed `event_id`s, `caused_by[]` chains — lives in **[EVENT-SYSTEM.md §3](EVENT-SYSTEM.md)**. That document is the single source of truth; this section does not re-declare it. The short version: every event carries `event_id`, `run_id`, `seq`, `ts_us`, `source`, `kind`, `actor`, `target`, `effect`, `caused_by`, `mitre`, `severity`, `raw`.

`event_id` is content-addressed (ULID with a deterministic seed in test scenarios) so the same scenario re-run produces the same event IDs. This is what makes detection regression testing possible.

**Idempotency.** Every consumer maintains a small Redis-backed dedup set keyed by `event_id`. At MVP volumes this is overkill, but the discipline is established now.

**Ordering.** Per-run ordering is preserved because all events for a given `run_id` flow through one Redis channel and one in-process consumer in `realtime/`. Cross-run ordering is not promised and not needed.

---

## 5. Realtime Communication Flow

End-to-end trace of a single attacker step from emission to pixel.

```
[scenario-runner coroutine]
  │  awaits step.at_offset
  │  publishes Event(action="http.exploit", target=frontend, ...)
  │  ────────────────────────────────────────────────────────────
  │            │
  │            ▼
  │   [events module] writes event row to Postgres
  │            │
  │            ▼
  │   [detections module] runs predicates; emits DetectionFired if matched
  │            │
  │            ▼
  │   [redis] PUBLISH run:{id} <serialized event>
  │            │
  │            ▼
  │   [realtime gateway] reads from Redis subscriber task
  │            │  filters by per-client subscriptions
  │            │  applies frame-delta compression
  │            ▼
  │   [websocket] pushes message to subscribed clients
  │            │
  │            ▼
  │   [browser WS client] applies delta to topology store
  │            │
  │            ▼
  │   [Cytoscape canvas] animates compromise ring + edge particle
```

**Latency budget (MVP, localhost):**
- emit → DB persist: **< 20ms**
- DB → Redis publish: **< 10ms**
- Redis → WS send: **< 50ms**
- WS receive → first paint: **< 50ms**
- **End-to-end target: < 200ms p95, < 400ms p99.**

**Backpressure (deferred).** At MVP scale (≤ 5 viewers per run), no backpressure is needed. The gateway uses a bounded `asyncio.Queue` per client (capacity 256); if it ever fills, we coalesce topology frames (last-write-wins) and emit a `degraded` indicator to the client. Detections and attacker events are never dropped.

**Reconnect.** WS clients track a `last_seq` per channel. On reconnect, the client sends `{ "op": "resync", "last_seq": N }`; the gateway replays missed events from Postgres (cheap query: `SELECT * FROM events WHERE run_id = ? AND seq > ? ORDER BY seq`).

---

## 6. Replay Engine Architecture

Replay is one of two hero features. Its contract is the architectural commitment of the entire product:

> For any `run_id`, at any time `t` (microseconds since run start), the engine returns the **exact reconstructed state** of the simulation at `t`: which nodes were compromised, which steps were in flight, which detections had fired.

**MVP implementation: fold all events in memory per request.**

```python
# replay/frame.py

async def build_frame(run_id: UUID, t_us: int) -> Frame:
    events = await db.fetch_events(run_id, until=t_us)   # SELECT ... WHERE ts_us <= t_us
    detections = await db.fetch_detections(run_id, until=t_us)

    nodes = init_node_states(environment.nodes)
    in_flight: list[StepRef] = []

    for ev in events:                                    # O(N), N ≤ 200 in MVP
        apply_effect(ev.effect, nodes, in_flight)

    return Frame(
        run_id=run_id,
        t_us=t_us,
        nodes=nodes,
        in_flight_steps=in_flight,
        detections_so_far=detections,
    )
```

At MVP event volumes (≤ 200 per run), this fits in < 20ms per request. No snapshots, no precomputation.

**Frame API.**

```
GET /runs/{id}/frame?t=42500000     # t in microseconds since run start
→ 200 OK
{
  "run_id": "...",
  "t_us": 42500000,
  "nodes": { "frontend": { "compromise": "compromised", "since_us": 2000000 }, ... },
  "edges": [ { "from": "frontend", "to": "api", "highlighted": false }, ... ],
  "in_flight_steps": [],
  "detections_so_far": [ { "rule": "waf_suspicious_payload", "ts_us": 2100000, ... } ]
}
```

**Scrubber UX → API mapping.** The client debounces drag events (50ms) and issues one `frame?t=` request per debounced position. Play/pause uses `requestAnimationFrame` advancing `t` locally and refetching when the playhead crosses an event boundary.

**Caching.** Per-client LRU cache of the last 60 frames; the scrubber feels instantaneous because dragging back-and-forth replays from cache.

**Migration path (not MVP).** When event volumes per run exceed ~10k, switch to **snapshot-plus-delta**: write a snapshot row every 5 seconds during a run; on `frame?t=`, find the nearest preceding snapshot and replay deltas forward. The `Frame` contract does not change — only the implementation behind it.

---

## 7. Attack Simulation Architecture

Attacks are **scripted timelines**, not real exploitation. The simulation engine is intentionally tiny.

**Scenario contract.** A scenario is a YAML file under `scenarios/library/`:

```yaml
id: rce-lateral-db
version: 1
name: "Exposed API → RCE → Lateral to DB"
mitre_tags: [T1190, T1059.004, T1021.004, T1005]
expected_detections:
  - rule: waf_suspicious_payload
    by_step: 1
steps:
  - at: 2.0s
    actor: external
    action: http.exploit
    target: web-frontend
    effect: { compromise: web-frontend, severity: high }
    mitre: T1190
  - at: 6.5s
    actor: web-frontend
    action: kube.exec
    target: api-service
    effect: { compromise: api-service }
    mitre: T1059.004
  # ... more steps
```

**The runner is one coroutine.**

```python
# runner/engine.py

async def run_scenario(plan: ScenarioPlan, run_id: UUID) -> None:
    await emit(run_id, RunStarted(scenario=plan.id, started_at=now_us()))
    started = monotonic_us()

    for step in plan.steps:
        await asyncio.sleep_until(started + step.at_us)
        event = build_event(step, run_id, seq=next_seq(run_id))
        await events.persist(event)
        await emit_event(event)                  # to Redis pub/sub
        await detections.evaluate(event, run_id) # may emit DetectionFired

    await emit(run_id, RunCompleted(
        scorecard=await score(run_id),
        ended_at=now_us(),
    ))
```

That's the entire attack engine. No drivers, no agents, no plugins. The `effect` field on each step describes the state delta applied to the topology; everything else is data.

**Why scripted, architecturally.** Because attacks are scripted, the architecture has three properties that real-execution architectures don't:

1. **Deterministic** — the same plan produces the same event sequence.
2. **Safe** — no payload ever leaves the FastAPI process.
3. **Trivially testable** — the runner is a pure function over (plan, clock) → events.

**Detection rules** are Python predicates in `detections/rules.py`. The full canonical list of 6 rules (and the scenarios that exercise them) lives in [ATTACK-SCENARIOS.md §0](ATTACK-SCENARIOS.md). Two illustrative examples:

```python
def waf_suspicious_payload(event: Event) -> bool:
    return event.kind == "attack.http.exploit" and event.severity in ("high", "critical")

def k8s_privileged_change(event: Event) -> bool:
    return event.kind in ("attack.k8s.create_rolebinding", "attack.k8s.secret_read")
```

Each rule is registered with its MITRE tags and a severity. On each emitted event, the detection module evaluates registered predicates and persists matches as `DetectionFired` rows. The scorecard reconciles these against the scenario's `expected_detections` to compute on-time/late/missed counts.

---

## 8. Infrastructure Visualization Architecture

The topology canvas is the application's center of gravity. Its architecture is built around one principle: **the server is the authority on state; the client is the authority on motion.**

**Server-authoritative state.**

- Topology declared in `environments/templates/<id>.yaml`.
- Compromise state, in-flight steps, detection history — all live in the backend's `replay.build_frame()`.
- Client never invents a node, an edge, or a compromise marker.

**Client-authoritative motion.**

- Frame transitions are animated client-side by Framer Motion / Cytoscape.
- Compromise ring fills clockwise over the actual step duration (server tells us start and end; client tweens).
- Edge traversal particles are pure visual sugar — they don't carry state, only timing.

**Rendering pipeline.**

```
[GET /environment]
       │
       ▼
[Cytoscape: build nodes & edges, run force-layout once]
       │
       ▼ (persist positions to localStorage)
       │
[WebSocket frame delta] ─→ [topology store update]
       │
       ▼
[Cytoscape: animate transition] ─→ [Framer Motion overlays]
```

**Node visual encoding.**

- **Shape/icon** — service kind (service, db, ingress, identity, cache, queue, worker).
- **Inner fill** — health.
- **Outer ring** — compromise state, fills clockwise red during compromise.
- **Pulse halo** — appears briefly when a detection fires *on this node*.

**Edge visual encoding.**

- **Baseline** — faint gray.
- **Attack traversal** — animated dashed stroke in accent red for ~1.2s, with a single particle traveling from source to target.
- **Detection edge** — amber tint, used when a detection rule references a specific edge.

**Layers (toggleable overlays):**

- **Attack path** — dims everything except the causal chain leading to the selected compromised node.
- **Detection coverage** (replay mode only) — recolor nodes green/amber/red by scorecard outcome at the current playhead time.

**Stability.** Once force-layout is computed, positions are frozen for the life of the environment. The operator may drag nodes manually; positions persist. The canvas is a *map*, not an animation; the attack is what moves across it.

**Specialized visual primitives** introduced by individual scenarios (full context in [ATTACK-SCENARIOS.md](ATTACK-SCENARIOS.md)) — the renderer must support all three:

- **Teal traversal.** Used for "legitimate-shape, malicious-intent" traffic — e.g. stolen-token replay after a successful brute force. Same particle/edge mechanic as a red traversal, but the particle is teal rather than red. Tells the viewer: *the network sees this as normal; the security context does not.*
- **Ghost edge.** A dashed red edge drawn dynamically between two nodes when an attacker bypasses the declared topology (e.g. an `api-service` connecting directly to the `db` with stolen credentials, off the application-layer path). Triggered by `effect.ghost_edge: true` on a `TraversalEffect` (see [EVENT-SYSTEM.md §6](EVENT-SYSTEM.md)). The edge is rendered for the lifetime of the run, not just the traversal animation.
- **Lock-icon overlay.** A small key/lock glyph rendered on a compromised node when the compromise is *credential-level* rather than OS-level — same red compromise ring, but with the overlay to signal "the attacker has the keys, not the box." Encoded via a `compromise_kind: "credential"` field on the node's frame state.

These three exist because the scenarios I designed exercise distinctions (legitimate-but-malicious traffic, off-graph movement, credential vs. OS compromise) that the basic node/edge encoding can't represent. They are first-class renderer commitments, not scenario-specific hacks.

---

## 9. API Layer

REST for resources, RPC-style verbs where REST is awkward. JSON-only.

**Endpoint surface (MVP-locked):**

```
# Auth
POST   /auth/login               { email, password }      → { access, refresh }
POST   /auth/refresh             { refresh }              → { access }
POST   /auth/logout              { refresh }              → 204

# Environment (singular for MVP)
GET    /environment                                       → Environment

# Scenarios
GET    /scenarios                                         → [ScenarioSummary]
GET    /scenarios/{id}                                    → ScenarioDetail

# Runs
POST   /runs                     { scenario_id }          → { run_id }
GET    /runs                     ?limit=&cursor=          → [RunSummary]
GET    /runs/{id}                                         → RunDetail
GET    /runs/{id}/events         ?from=&to=&seq_after=    → [Event]
GET    /runs/{id}/frame          ?t=<us>                  → Frame
GET    /runs/{id}/scorecard                               → Scorecard

# Detection rules
GET    /detections/rules                                  → [Rule]

# System
GET    /healthz                                           → { ok: true }
GET    /metrics                                           → Prometheus text
```

**Conventions.**

- All time fields are **microseconds since run start** (`*_us`) for in-run events, ISO-8601 UTC otherwise.
- **Pagination is cursor-based** on `/runs/{id}/events` (the only endpoint that can return >100 rows). Others use `limit/offset` for simplicity.
- **Idempotency** — `POST /runs` accepts an `Idempotency-Key` header; repeats return the same `run_id`.
- **Errors** follow RFC 7807 (`application/problem+json`) with a stable `type` URI.
- **Auth** — `Authorization: Bearer <jwt>` for HTTP; `Sec-WebSocket-Protocol` for WS (or query-param token, depending on browser quirks).
- **Versioning** — `/v1` prefix from day one; breaking changes require `/v2`.

The API surface is intentionally tiny — about 13 routes. Anything beyond that is either covered by the WebSocket or out of MVP scope.

---

## 10. WebSocket Layer

One WebSocket per client per run. The realtime gateway is in-process inside the FastAPI app (no separate service).

**Connection lifecycle.**

```
Client → upgrade WS to /ws/runs/{run_id}?token=<jwt>
Server → validate JWT, attach client to per-run subscriber set, return snapshot
Client → subscribed; receives events as they happen
Client → on disconnect, server cleans up subscriber set
Client → on reconnect, sends { op: "resync", last_seq: N }; server replays gap
```

**Server-side gateway shape.**

```python
# realtime/gateway.py

class RealtimeGateway:
    def __init__(self):
        self.subscribers: dict[UUID, set[ClientConnection]] = defaultdict(set)
        self._redis_task: asyncio.Task | None = None

    async def attach(self, run_id: UUID, ws: WebSocket) -> None:
        client = ClientConnection(ws, outbound=asyncio.Queue(maxsize=256))
        self.subscribers[run_id].add(client)
        try:
            await self._send_snapshot(client, run_id)
            await asyncio.gather(
                self._pump_outbound(client),
                self._receive_control(client),
            )
        finally:
            self.subscribers[run_id].discard(client)

    async def _redis_loop(self):
        async for channel, payload in redis.psubscribe("run:*"):
            run_id = parse_run_id(channel)
            for client in self.subscribers[run_id]:
                client.outbound.put_nowait(payload)   # bounded; drops topology on overflow
```

**Message types (server → client).**

```ts
type ServerMessage =
  | { op: "snapshot"; seq: number; frame: Frame }
  | { op: "event"; seq: number; event: Event }
  | { op: "detection"; seq: number; detection: Detection }
  | { op: "frame_delta"; seq: number; delta: FrameDelta }
  | { op: "run_started"; run_id: string; scenario_id: string }
  | { op: "run_completed"; scorecard: Scorecard }
  | { op: "degraded"; reason: string };
```

**Client → server messages** are minimal: `resync`, `ping`. We do not allow clients to drive run state over the WS — those go over HTTP for auditability.

**Why in-process for MVP.** With one process handling ≤ 100 concurrent WS connections, a separate gateway service adds operational cost with no benefit. The gateway code is isolated in `app.modules.realtime` so extracting it later is a `helm install` away.

---

## 11. Data Flow Overview

Three flows worth understanding in full.

**Flow A — Live run.**

```
[user clicks Launch]
       │ POST /runs
       ▼
[scenario module] compiles plan from YAML
       │
       ▼
[runner module] spawned as asyncio.Task
       │ for each step:
       │   sleep → persist Event → publish to Redis → evaluate detections
       │
       ▼
[realtime gateway] consumes Redis → fans out to WS clients
       │
       ▼
[browser] applies deltas → animates canvas
```

**Flow B — Replay.**

```
[user drags scrubber]
       │ GET /runs/{id}/frame?t=42500000  (debounced 50ms)
       ▼
[replay module] folds events ≤ t into a Frame
       │
       ▼
[browser] applies Frame to canvas
       │ Framer Motion interpolates between previous and current Frame
       ▼
[Cytoscape] paints the topology at time t
```

**Flow C — Scorecard.**

```
[runner emits RunCompleted]
       │
       ▼
[detections module] computes scorecard:
       │   expected_detections × DetectionFired rows
       │   per detection: on_time / late / missed
       ▼
[Postgres] write Scorecard row
       │
       ▼
[Redis] publish RunCompleted{ scorecard }
       │
       ▼
[browser] scorecard card animates in
```

**Authoritative writes are always in Postgres first, bus second.** The bus is for latency; the DB is for truth. If the bus drops a message, a client resync recovers it from the DB. If the DB write fails, the bus message is never published.

---

## 12. DevOps Layer

The DevOps stack exists to **support the cybersecurity product**, not to be the story. Detail lives in [MVP.md §9–§10](MVP.md); the architectural shape is:

```
[git push]
     │
     ▼
[GitHub Actions]
     ├── lint-test      (ruff, mypy, vitest, pytest)
     ├── build-push     (buildx → ghcr.io/<user>/traceveil-{backend,web}:<sha>)
     ├── scan           (Trivy → SARIF; fail HIGH/CRITICAL on direct deps)
     └── k8s-validate   (kubectl apply --dry-run against ephemeral k3d)
                  │
                  ▼
          [GHCR image registry]
                  │
                  ▼
       [k3d local Kubernetes]
                  │
                  ▼
     ┌────────────┴────────────────────────┐
     ▼            ▼          ▼          ▼  ▼
  backend        web      postgres    redis  monitoring
  Deployment  Deployment  StatefulSet  Dep.  (Prom+Graf)
```

**Containerization.** Multi-stage Dockerfiles. Backend: `python:3.12-slim` build stage → distroless final. Web: `node:20` build → `nginx:alpine` final. Non-root user, read-only root FS where possible, image sizes capped (backend < 200 MB, web < 50 MB).

**Local dev.** Single `docker-compose.yml` brings up Postgres, Redis, backend, web, Prometheus, Grafana. `make demo` is the only entrypoint a reviewer needs.

**Kubernetes.** k3d locally only. Raw manifests + one minimal Helm chart in `deploy/`. Ingress via Traefik on `traceveil.localhost`. No HPA, NetPol, mTLS, service mesh, or operators in MVP scope.

**CI/CD.** Four GitHub Actions jobs (see diagram). The Trivy scan publishes SARIF results that show up in the PR security tab. Branch protection requires all four to be green on `main`.

**Explicitly out of scope:** Terraform, ArgoCD, Helm umbrella charts, secrets managers, multi-environment promotion, blue/green or canary, supply-chain signing. Listed in [FOUNDATION.md §15](FOUNDATION.md) as long-term direction.

---

## 13. Monitoring Layer

Observability in MVP is a **credible 60–90 second demo segment**, not an SRE practice. The infrastructure is real; the scope is bounded.

**Prometheus scrape target:** `backend:8000/metrics`, exposed via `prometheus-fastapi-instrumentator`.

**Metric inventory (final list):**

```
traceveil_http_requests_total{route,method,status}    counter
traceveil_http_request_duration_seconds{route}        histogram
traceveil_ws_connected_clients                        gauge
traceveil_active_runs                                 gauge
traceveil_events_published_total{source}              counter
traceveil_scenario_step_duration_seconds{scenario}    histogram
traceveil_detection_fired_total{rule,on_time}         counter
traceveil_replay_frame_build_seconds                  histogram
```

**Grafana** runs alongside Prometheus in `docker-compose` and k8s. One provisioned dashboard, **"Traceveil Live"**, with panels:

- Active runs (stat) · WS clients (stat) · Events/sec (timeseries)
- Detections fired by rule (bar gauge) · Scenario step duration p95 (timeseries)
- HTTP error rate (timeseries) · Replay frame build p95 (timeseries)

The dashboard is embedded in the app at `/telemetry` via iframe.

**Logging.** Structured JSON via `structlog`, mandatory fields: `service`, `run_id` (if present), `event_id` (if present), `level`, `ts`. Output to stdout; `docker compose logs -f` is the MVP log aggregator. No Loki, no Elasticsearch.

**Tracing.** OTel SDK installed but not exported in MVP. The hooks are in place (`infra/otel.py`); the exporter is wired up later when there's a Tempo or Jaeger to send to.

---

## 14. Security Layer

We are a cybersecurity product. The bar is "not embarrassing," not "hardened."

**Authentication.**

- **Argon2id** password hashing (`argon2-cffi`), tuned to ~100ms per verify.
- **JWT** access tokens, 15-minute TTL, signed with a per-environment secret.
- **Refresh tokens** stored hashed in Postgres, rotated on every use, revocable.
- **WebSocket auth** validates the JWT on upgrade; expired tokens cause WS close with code 4401.

**Authorization (MVP).**

- Single user, single role. RBAC primitives exist as no-op `requires_permission()` decorators so the surface is in place when multi-tenant lands.

**Transport.**

- HTTPS in deployed environments (Traefik with self-signed for local k3d; cert-manager later).
- HTTPS-only, `SameSite=Strict` cookies for refresh tokens.
- CORS pinned to the configured frontend origin.

**Input validation.**

- Pydantic on every request body and query param.
- Rate limit on `POST /auth/login`: Redis counter, 10/min/IP. The only rate limit.

**Secrets.**

- `.env` for local; Kubernetes `Secret` in cluster. Never in Git.
- `gitleaks` pre-commit hook to enforce.
- Backend reads secrets only via `config.py`, never `os.environ` directly — keeps the surface auditable.

**Supply chain.**

- **Trivy** runs on every PR. Fail on HIGH/CRITICAL for direct dependencies; warn-only on transitive.
- **Dependabot** (weekly) opens PRs for dep bumps; security updates are auto-mergeable when CI is green.
- `pip-audit` and `npm audit` in CI as a second-opinion check.

**Code hygiene.**

- `ruff` lints forbid `eval`, `exec`, bare `subprocess`, and raw SQL.
- `mypy --strict` on the backend; TS `strict` on the frontend.

**Explicitly out of MVP scope.** TOTP, SSO, OIDC, cosign signing, SBOM publishing, OPA Gatekeeper, advanced RBAC, threat modeling artifacts, penetration testing. Each is captured in [FOUNDATION.md](FOUNDATION.md) as part of the longer arc.

The principle: **a senior security engineer reviewing the repo finds nothing actively wrong, and a clear path to everything that's missing.**

---

## 15. Scaling Notes (For Curiosity, Not Commitment)

The project runs comfortably on a laptop. None of the axes below are MVP scope or even on the personal-project roadmap — they exist mainly as a thought exercise: *if I ever wanted to push this past the personal-lab shape, where would each bottleneck live, and what would I do about it?*

**Axis 1 — Events per run.**

- *Current:* fold all events in memory at frame-build time. Fine to ~10k events.
- *Next:* snapshot-plus-delta — write a snapshot every 5s of run time; `frame?t=` finds nearest snapshot, replays deltas.
- *Trigger:* p95 `frame?t=` exceeds 150ms.

**Axis 2 — Concurrent replay viewers per run.**

- *Current:* in-process fan-out. Fine to ~50 viewers per run.
- *Next:* extract the realtime gateway as a sharded WebSocket service behind a sticky LB; use Redis Pub/Sub between gateway shards.
- *Trigger:* > 100 concurrent WS connections per run.

**Axis 3 — Telemetry throughput.**

- *Current:* Redis Pub/Sub. Fine to ~5k events/s.
- *Next:* migrate `run:{id}:events` to Kafka or Redpanda with one partition per run hash bucket. Domain events stay on Redis.
- *Trigger:* sustained > 5k events/s, or a desire to learn Kafka end-to-end.

**Axis 4 — Detection rules.**

- *Current:* 6 hardcoded Python predicates evaluated per event.
- *Next:* a small Sigma-rule compiler that emits an intermediate representation, dispatched by event `(source, kind)` prefix. This is the axis I'd most enjoy exploring as a follow-on.
- *Trigger:* > ~50 rules, or curiosity about Sigma internals.

Each axis is **independently triggerable**. The architecture's quality lives in this property: growth would be composition, not rewriting. The closed loop — *Environment → Scenario → Replay* — does not change; only the implementations behind each verb would.

— *End of Architecture v0.2*
