# Traceveil — Event System

**Version:** 0.1
**Status:** Canonical event-model specification
**Last revised:** 2026-05-12

> Companion docs: [FOUNDATION.md](FOUNDATION.md) · [MVP.md](MVP.md) · [ARCHITECTURE.md](ARCHITECTURE.md)

This document defines **Traceveil's event model** — the canonical schema, taxonomy, lifecycle, and flow of every event that crosses a boundary in the system. Everything visual in Traceveil — the topology animation, the timeline, alerts, replay — is rendered from this event stream. If the event model is wrong, every renderer, scorer, and replay surface downstream is wrong too.

---

## 1. Event System Overview

**Events are the only state-change currency in Traceveil.**

A user clicks *Launch*. The scenario runner emits events. Those events:

- **persist** to Postgres,
- **publish** to Redis Pub/Sub,
- **stream** over WebSocket to the browser,
- **animate** on the topology canvas,
- **fire** detection rules,
- **score** against the scenario's expected detections,
- **reconstruct** the entire run when replayed.

The events *are* the simulation. The canvas is a renderer; the timeline is a viewer; the database is a tape. Without events, there is nothing to draw, replay, or score.

One canonical schema, one bus, one store, one stream. That is the entire event system.

```
[scenario runner] ─emits─▶ [Postgres] ─publishes─▶ [Redis] ─fans out─▶ [WebSocket] ─renders─▶ [browser]
                                │                                                                 │
                                └────────── replay engine folds events into Frame(t) ◀────────────┘
```

---

## 2. Event Philosophy

Six tenets that govern the event system. When in doubt during implementation, return here.

1. **One canonical schema.** Every event — attacker step, detection firing, node compromise, alert, system signal — uses the same `Event` envelope. Source-specific fields go under `raw`. Renderers and consumers never need to know which source produced what.
2. **Content-addressed and deterministic.** `event_id` is a deterministic ULID derived from `(run_id, seq, content_hash)`. The same scenario re-run produces the same event IDs. This is what makes detection regression testing possible.
3. **Monotonic per run.** Every event carries a `seq` that strictly increases within a `run_id`. Gaps mean drops, not reorderings.
4. **Time is microseconds since run start.** Wall-clock time appears once, on `RunStarted`. Every other event uses `ts_us` (microseconds since that anchor). This makes replay deterministic and makes scenarios re-runnable without timestamp drift.
5. **Causality is explicit.** Every event carries `caused_by[]` — the parent event IDs that produced it. The detection fired *because* the attacker stepped. The compromise propagated *because* of the lateral connection. The graph the operator scrubs through is a real DAG, not a guess.
6. **The bus is transport; the DB is truth.** Postgres is written before Redis is published. If the bus drops a message, the WebSocket client resyncs from the DB. If the DB write fails, the bus stays silent.

---

## 3. Core Event Structure

The canonical `Event` envelope (Pydantic v2):

```python
from typing import Literal
from pydantic import BaseModel, Field
from uuid import UUID

EventSource = Literal["attacker", "host", "app", "detection", "alert", "system"]
Severity = Literal["info", "low", "medium", "high", "critical"]

class Event(BaseModel):
    # Identity
    event_id: str                       # ULID, deterministic
    run_id: UUID
    seq: int                            # monotonic per run, starts at 1

    # Time
    ts_us: int                          # microseconds since run start
    wall_ts: str | None = None          # ISO-8601; only set on RunStarted/Completed

    # Classification
    source: EventSource
    kind: str                           # e.g. "attack.http.exploit", "detection.fired"
    severity: Severity = "info"

    # Subject
    node_id: str | None = None          # the node this event is about, if any
    actor: str                          # who did it: "external", "<node_id>", "system"
    target: dict = Field(default_factory=dict)
                                        # { service, path, identity, port, ... }

    # Causality
    caused_by: list[str] = Field(default_factory=list)
                                        # parent event_ids within this run

    # MITRE
    mitre: list[str] = Field(default_factory=list)
                                        # ATT&CK technique IDs, e.g. ["T1190", "T1059.004"]

    # Effect on simulation state
    effect: dict = Field(default_factory=dict)
                                        # state delta — see §6

    # Source-specific payload (never used for rendering, only for forensics)
    raw: dict = Field(default_factory=dict)
```

**Why every event has the same envelope.** The renderer is one component, not five. The animation pipeline doesn't branch on type until it has already passed through one filter. The replay engine folds one stream, not a join across five.

**Why deterministic event IDs matter.** When a detection engineer edits a rule and re-runs the same scenario, the system must be able to say *"this rule, on event `01H...A3`, used to fire at +6.1s; now it fires at +3.4s."* That comparison is only possible if `event_id` is stable across runs. Wall-clock-based IDs would defeat the entire regression-testing premise.

---

## 4. Event Metadata

Field-by-field commentary on the envelope. These are the *invariants* that the rest of the system relies on.

| Field | Type | Invariant | Notes |
|---|---|---|---|
| `event_id` | ULID string | Globally unique; deterministic given `(run_id, seq, content)` | Used as primary key in `events` table |
| `run_id` | UUID | Stable for the life of a run | Partitioning key for storage and pub/sub channels |
| `seq` | int | Strictly monotonic within a `run_id`; starts at 1 | Used for gap detection on client reconnect |
| `ts_us` | int | Non-decreasing within a `run_id`; ties broken by `seq` | Microseconds since `RunStarted.wall_ts` |
| `wall_ts` | ISO-8601 string | Set only on `RunStarted` and `RunCompleted` | Used to convert `ts_us` back to wall time for display |
| `source` | enum | One of: `attacker`, `host`, `app`, `detection`, `alert`, `system` | Determines storage retention class |
| `kind` | string | Dotted lowercase namespace, e.g. `attack.http.exploit` | Drives renderer dispatch |
| `severity` | enum | `info`, `low`, `medium`, `high`, `critical` | See §16 for derivation rules |
| `node_id` | string \| null | Must exist in the run's environment if set | Used to attach animation to the right node |
| `actor` | string | Either `external`, a `node_id`, or `system` | "Who did this" |
| `target` | dict | Free-form but schema-validated per `kind` | "What it was done to" |
| `caused_by` | list of event_ids | All entries must reference events in the same `run_id` with `seq < self.seq` | See §19 for propagation |
| `mitre` | list of strings | Each entry must be a valid ATT&CK technique ID | Tag, not classification |
| `effect` | dict | Must be one of a fixed set of effect shapes (§6) | The state delta applied to the simulation |
| `raw` | dict | Free-form; never used for rendering | Forensic detail only |

**Validation.** Every event is round-tripped through Pydantic on emit, on persist, and on consume. Invalid events are dropped with a structured log entry — never silently corrected.

---

## 5. Event Types

A small, closed taxonomy. Every event in the system has a `source` (where it came from) and a `kind` (what kind of thing it is). The product of these two is its **type**.

### By source

| Source | Origin | Examples |
|---|---|---|
| `attacker` | Scenario runner | `attack.http.exploit`, `attack.kube.exec`, `attack.data.exfil` |
| `host` | Synthetic telemetry generator | `host.cpu.spike`, `host.syscall.unusual`, `host.process.spawned` |
| `app` | Simulated application logs | `app.auth.failure`, `app.request.slow`, `app.error` |
| `detection` | Detection engine | `detection.fired`, `detection.scored` |
| `alert` | Alert generator | `alert.raised`, `alert.escalated`, `alert.acknowledged` |
| `system` | Run lifecycle | `run.started`, `run.completed`, `node.compromised`, `node.recovered` |

### By role in the pipeline

Events fall into four functional roles, each described in its own section:

- **Attack Events** (§6) — the attacker's actions on the topology.
- **Detection Events** (§7) — rule firings produced by the detection engine.
- **Alert Events** (§9) — operator-facing notifications wrapping one or more detections.
- **Replay / System Events** (§8) — run lifecycle markers and state transitions.

The taxonomy is intentionally closed for MVP — adding a new `source` requires a schema migration. Adding a new `kind` within an existing source is just a registration.

---

## 6. Attack Events

Attack events are emitted by the scenario runner and represent the attacker's actions on the simulated topology.

**Schema.**

```python
class AttackEvent(Event):
    source: Literal["attacker"] = "attacker"
    kind: str                          # "attack.<verb>.<sub>"
    actor: str                         # "external" or originating node_id
    target: AttackTarget               # see below
    effect: AttackEffect               # see below
```

**Target shape.**

```python
class AttackTarget(BaseModel):
    node_id: str                       # the node being acted upon
    service: str | None = None         # logical service name
    path: str | None = None            # HTTP path, file path, etc.
    port: int | None = None
    identity: str | None = None        # user/SA/token if applicable
```

**Effect shape.** One of a fixed set of effect types — this is what the topology renderer dispatches on:

```python
class CompromiseEffect(BaseModel):
    type: Literal["compromise"]
    node_id: str
    severity: Severity

class TraversalEffect(BaseModel):
    type: Literal["traversal"]
    from_node: str
    to_node: str
    protocol: str | None = None        # "http", "tcp", "amqp", etc.
    ghost_edge: bool = False           # if true, renderer draws a dynamic edge
                                       # that doesn't exist in the declared topology
                                       # (e.g. an attacker bypassing app-layer paths
                                       # to reach the DB directly with stolen creds)

class MarkEffect(BaseModel):
    type: Literal["mark"]              # arbitrary tag, e.g. "data_exfil_attempted"
    node_id: str
    tag: str

class PersistenceEffect(BaseModel):
    type: Literal["persistence"]
    node_id: str
    artifact: str                      # "cronjob", "image_tag", "ssh_key", ...

AttackEffect = Union[CompromiseEffect, TraversalEffect, MarkEffect, PersistenceEffect]
```

**Canonical attack kinds (MVP):**

| `kind` | What it represents | Typical effect | MITRE |
|---|---|---|---|
| `attack.http.exploit` | Exploiting an exposed HTTP endpoint | `compromise` | T1190 |
| `attack.kube.exec` | Container exec into a pod | `compromise` | T1059.004 |
| `attack.lateral.connect` | Lateral movement across a service edge | `traversal` + `compromise` | T1021.* |
| `attack.token.replay` | Replaying a stolen OAuth / session token | `compromise` | T1550.001 |
| `attack.image.swap` | Supply-chain image tag swap | `persistence` | T1195.002 |
| `attack.data.exfil` | Data egress from a compromised node | `mark` | T1005, T1041 |
| `attack.priv.escalate` | Privilege escalation within a node | (severity bump) | T1068, T1098 |

**Why this structure.** The renderer takes the `effect.type` and dispatches to one of: *fill the compromise ring on `node_id`*, *animate a particle from `from_node` to `to_node`*, *attach a tag badge*, *show a persistence icon*. There is no branching on `kind` in the renderer; the effect is the contract.

---

## 7. Detection Events

Detection events are emitted by the detection engine and represent a rule firing against one or more upstream events.

**Schema.**

```python
class DetectionEvent(Event):
    source: Literal["detection"] = "detection"
    kind: Literal["detection.fired"] = "detection.fired"
    rule_id: str                       # registered rule slug, e.g. "waf_suspicious_payload"
    rule_version: str
    matched_event_ids: list[str]       # the upstream events this firing matched on
    on_time: bool                      # fired before the expected by_step deadline?
    severity_derived: Severity         # see §16
    actor: str = "detection-engine"
    target: dict                       # mirror of the primary matched event's target
```

**Lifecycle.**

1. An upstream event lands in the detection module.
2. Each registered predicate is evaluated against the event.
3. For each match, a `DetectionEvent` is persisted and published.
4. The scenario's `expected_detections` are checked: if this rule was expected by step *N* and step *N* completed before this firing, `on_time = false`.
5. The scorecard is updated incrementally.

**Detection rule registry (MVP).** Hardcoded Python predicates. Each registers its rule_id, MITRE tags, severity, and the predicate function. See [ARCHITECTURE.md §7](ARCHITECTURE.md) for the rule shape.

**Scoring.** A `DetectionScored` event of `kind = "detection.scored"` is emitted at run end summarizing fired-on-time / fired-late / missed / false-positive counts. The frontend uses this single event to render the scorecard card.

---

## 8. Replay Events

"Replay events" are a misnomer historically; in Traceveil they are **run lifecycle events** — the markers that bookend a run and define replay boundaries.

**Schema.**

```python
class RunStarted(Event):
    source: Literal["system"] = "system"
    kind: Literal["run.started"] = "run.started"
    wall_ts: str                       # required here; the anchor for ts_us in all other events
    scenario_id: str
    scenario_version: str
    environment_id: str
    seq: Literal[1] = 1                # always the first event in a run

class RunCompleted(Event):
    source: Literal["system"] = "system"
    kind: Literal["run.completed"] = "run.completed"
    wall_ts: str                       # required here; closes the run
    scorecard: Scorecard
    outcome: Literal["completed", "aborted", "error"]

class RunStepped(Event):                # internal marker for replay segmentation
    source: Literal["system"] = "system"
    kind: Literal["run.stepped"] = "run.stepped"
    step_index: int
    step_id: str
```

**Why these events matter for replay.**

- `RunStarted` is the **time anchor**. Every `ts_us` in every other event is relative to its `wall_ts`. Replay reconstructs wall time by adding `ts_us` to this anchor.
- `RunCompleted` is the **scrub bound**. The replay scrubber cannot move past this event's `ts_us`.
- `RunStepped` events segment the timeline into addressable chunks. The timeline UI renders one tick per step.

**Post-MVP additions (not in scope now but reserved in the schema):**

- `Snapshot` events — base-state checkpoints for delta replay when event volumes grow.
- `RunBookmarked` — operator-placed bookmarks during live or replay viewing.
- `RunAnnotated` — collaborative notes attached to a moment in the run.

---

## 9. Alert Events

Alerts are **operator-facing wrappers** around one or more detections. Where a `DetectionEvent` represents a rule firing (the security engineer's primitive), an `AlertEvent` represents *something the operator should look at* (the analyst's primitive).

In MVP, alerts are produced 1:1 from detections — every fired detection produces an alert. Post-MVP, alerts will aggregate multiple correlated detections into a single operator notification.

**Schema.**

```python
class AlertEvent(Event):
    source: Literal["alert"] = "alert"
    kind: Literal["alert.raised", "alert.escalated", "alert.acknowledged"]
    alert_id: str                      # ULID
    title: str                         # short human-readable
    description: str                   # one-paragraph context
    detection_ids: list[str]           # underlying DetectionEvent.event_ids
    severity: Severity                 # derived, never authored
    suggested_action: str | None = None
    state: Literal["raised", "acknowledged", "muted"] = "raised"
```

**Display contract.** The right-rail event stream renders `AlertEvent`s with stronger visual weight than ordinary events — a tinted border, the alert title in larger type, the MITRE tag chip, and a clickable "show in graph" affordance that selects the affected node.

**Why split from `DetectionEvent`.** A detection is *technical evidence*. An alert is *narrative*. The same evidence can produce different alerts under different policies (which is why MVP keeps the mapping trivial and leaves the correlation engine for later).

---

## 10. Event Lifecycle

Every event in Traceveil goes through the same six stages.

```
┌──────────────────────────────────────────────────────────────────────────┐
│  1. EMIT                                                                 │
│     The scenario runner (or detection engine, etc.) constructs an Event  │
│     instance and calls events.emit(event).                               │
├──────────────────────────────────────────────────────────────────────────┤
│  2. VALIDATE                                                             │
│     Pydantic validates the envelope. Invalid events are dropped with a   │
│     structured log entry. seq is assigned by the emit() helper.          │
├──────────────────────────────────────────────────────────────────────────┤
│  3. PERSIST                                                              │
│     INSERT into events table. Postgres is the source of truth. If this   │
│     fails, the event never publishes.                                    │
├──────────────────────────────────────────────────────────────────────────┤
│  4. PUBLISH                                                              │
│     PUBLISH run:{run_id} <serialized event> to Redis Pub/Sub.            │
│     Fire-and-forget; bus is transport, not durability.                   │
├──────────────────────────────────────────────────────────────────────────┤
│  5. FAN OUT                                                              │
│     Realtime gateway reads from Redis subscriber, dispatches to each     │
│     subscribed WebSocket client, applies bounded per-client outbound     │
│     queue with coalescing on overflow.                                   │
├──────────────────────────────────────────────────────────────────────────┤
│  6. RENDER / FOLD                                                        │
│     Live: client applies effect to its topology store; renderer animates.│
│     Replay: client requests Frame(t) from server; server folds events    │
│     ≤ t into a Frame; client interpolates between frames.                │
└──────────────────────────────────────────────────────────────────────────┘
```

**Failure modes by stage:**

| Stage | Failure | Recovery |
|---|---|---|
| Emit | Invalid envelope | Drop + log; never partial-emit |
| Validate | Pydantic error | Drop + log |
| Persist | DB unreachable | Retry 3× with backoff; if still failing, abort the run with `RunCompleted{ outcome: "error" }` |
| Publish | Redis unreachable | Continue silently; clients resync from DB on reconnect |
| Fan out | Client queue full | Coalesce topology deltas (last-write-wins); never drop detections or alerts |
| Render | Animation overflow | Skip animation, snap to final state |

---

## 11. Event Flow Architecture

The full path of an event from emission to pixel.

```
                            ┌────────────────────────────┐
                            │   Scenario Runner Coroutine│
                            │  (events.emit(...))        │
                            └──────────────┬─────────────┘
                                           │
                                           ▼
                            ┌────────────────────────────┐
                            │   events module            │
                            │   • assign seq             │
                            │   • compute event_id       │
                            │   • Pydantic validate      │
                            │   • INSERT into Postgres   │ ◀── source of truth
                            └──────────────┬─────────────┘
                                           │
                                           ▼
                            ┌────────────────────────────┐
                            │   detection engine         │
                            │   • run predicates         │
                            │   • emit DetectionEvent    │
                            │   • emit AlertEvent        │
                            └──────────────┬─────────────┘
                                           │
                                           ▼
                            ┌────────────────────────────┐
                            │   Redis Pub/Sub            │
                            │   channel: run:{run_id}    │ ◀── transport
                            └──────────────┬─────────────┘
                                           │
                                           ▼
                            ┌────────────────────────────┐
                            │   Realtime Gateway         │
                            │   • subscriber task        │
                            │   • per-client fan-out     │
                            │   • bounded outbound queue │
                            └──────────────┬─────────────┘
                                           │
                                           ▼
                            ┌────────────────────────────┐
                            │   WebSocket                │
                            │   /ws/runs/{run_id}        │
                            └──────────────┬─────────────┘
                                           │
                                           ▼
                            ┌────────────────────────────┐
                            │   Browser                  │
                            │   • Zustand store update   │
                            │   • Cytoscape animation    │
                            │   • event stream card      │
                            │   • timeline tick          │
                            └────────────────────────────┘
```

**Two-stage emission.** Note that an emit happens in two database operations: first the upstream event (e.g. an `attack.http.exploit`), then any detection events it triggered. Both are persisted before the upstream is published, so the WebSocket sees attacker step and detection in the order they happened in the engine.

---

## 12. Realtime Streaming Flow

The streaming layer's job is to take the persisted event stream and deliver it to subscribed browsers with sub-200ms latency.

**Channels.**

```
run:{run_id}                 — all events for a specific run, multiplexed
run:{run_id}:events          — (reserved for post-MVP segregation)
run:{run_id}:detections      — (reserved for post-MVP segregation)
system                       — global lifecycle: deploy markers, etc.
```

For MVP, everything for a run flows through `run:{run_id}` as a single channel. Segregation is post-MVP optimization.

**WebSocket message shape.**

```ts
type ServerMessage =
  | { op: "snapshot"; seq: number; frame: Frame }                    // on connect/resync
  | { op: "event"; seq: number; event: Event }                       // every event
  | { op: "frame_delta"; seq: number; delta: FrameDelta }            // coalesced topology delta
  | { op: "detection"; seq: number; detection: DetectionEvent }      // duplicated for client priority
  | { op: "alert"; seq: number; alert: AlertEvent }                  // duplicated for client priority
  | { op: "run_completed"; scorecard: Scorecard }
  | { op: "degraded"; reason: string };
```

The same detection appears in both `event` (full stream) and `detection` (priority stream). The frontend filters duplicates by `event_id`. This duplication is what lets the renderer prioritize detection animations even when the firehose lags.

**Latency budget (MVP, localhost):**

| Hop | p95 | p99 |
|---|---|---|
| emit → DB persist | < 20ms | < 40ms |
| DB → Redis publish | < 10ms | < 25ms |
| Redis → WS send | < 50ms | < 100ms |
| WS recv → first paint | < 50ms | < 100ms |
| **End-to-end** | **< 200ms** | **< 400ms** |

These are not aspirational. They are what the demo recording requires.

**Backpressure (MVP-deferred, contract-defined).** Per-client outbound queue is 256 messages. On overflow, the gateway *coalesces consecutive `frame_delta` messages* (last-write-wins per affected node) and *never drops* `detection`, `alert`, or `event` messages. If coalescing isn't enough, the client receives a `degraded` message and a small indicator appears in the UI. We do not engineer this in MVP because at ≤ 5 viewers and ≤ 200 events/run we are nowhere near overflow.

---

## 13. Replay Engine Integration

Replay is the most demanding consumer of events. Its contract:

> For any `run_id`, at any `t_us`, return a `Frame` describing the exact reconstructed state at that time.

**Fold algorithm (MVP).**

```python
async def build_frame(run_id: UUID, t_us: int) -> Frame:
    started = await db.fetch_one_event(run_id, kind="run.started")
    events  = await db.fetch_events(run_id, until_us=t_us)

    nodes = init_node_states(environment_for(run_id).nodes)
    edges = init_edge_states(environment_for(run_id).edges)
    in_flight: list[StepRef] = []
    detections: list[DetectionEvent] = []

    for ev in events:                       # ordered by (ts_us, seq)
        match ev.effect.get("type"):
            case "compromise":
                nodes[ev.effect["node_id"]].compromise = "compromised"
                nodes[ev.effect["node_id"]].compromised_at_us = ev.ts_us
            case "traversal":
                edges.mark_traversed(ev.effect["from_node"],
                                     ev.effect["to_node"], ev.ts_us)
            case "mark":
                nodes[ev.effect["node_id"]].marks.add(ev.effect["tag"])
            case "persistence":
                nodes[ev.effect["node_id"]].persistence.append(ev.effect["artifact"])

        if ev.source == "detection":
            detections.append(ev)

    return Frame(
        run_id=run_id,
        t_us=t_us,
        wall_ts=started.wall_ts,
        nodes=nodes,
        edges=edges,
        in_flight_steps=in_flight,
        detections_so_far=detections,
    )
```

**Why this works at MVP scale.** At ≤ 200 events per run, the fold completes in < 20ms on a SQL fetch + Python loop. We do not need snapshots, deltas, or projection tables.

**Why the algorithm scales.** Because the fold is a pure function over a totally-ordered event list, snapshots can be introduced later as a *cache* of the fold's intermediate state at fixed time intervals. The `build_frame` API does not change; only the implementation behind it gets smarter.

**Replay determinism guarantee.** `build_frame(r, t)` returns the same `Frame` byte-for-byte every time it is called for the same `r` and `t`. This is the contract that makes scrubbing back and forth feel solid and that makes detection regression testing possible.

---

## 14. Frontend Event Consumption

The browser receives events over WebSocket and turns them into pixels. The consumption pipeline is deliberately narrow.

**Store update path.**

```
WS message arrives
       │
       ▼
realtime.ts dispatches by op
       │
       ├── op === "event" → eventStream.push(event)
       │                   → topology.applyEffect(event.effect)
       │                   → timeline.addTick(event)
       │
       ├── op === "detection" → detections.push(detection)
       │                       → topology.flashDetectionAura(detection.target.node_id)
       │
       ├── op === "alert" → alerts.push(alert)
       │                   → eventStream.elevate(alert)
       │
       ├── op === "frame_delta" → topology.applyDelta(delta)
       │
       ├── op === "snapshot" → topology.replaceFrame(frame)
       │
       └── op === "run_completed" → run.finalize(scorecard)
                                  → ui.transitionToReplay()
```

**Animation triggers (one per effect type).**

| Effect | Animation |
|---|---|
| `compromise` | Outer ring of the affected node fills clockwise red over the step's wall duration |
| `traversal` | Edge from `from_node` to `to_node` brightens; single particle traverses in 800ms |
| `mark` | Small badge fades in on the node with the tag label |
| `persistence` | Persistence icon appears at the node corner; never fades |

**Detection aura.** When a `DetectionEvent` arrives, the affected node briefly displays the rule name and a MITRE tag chip for 1.2s. The aura is purely informational; it does not alter the node's compromise state.

**Idempotency on the client.** Each event has a stable `event_id`. The client maintains a small `Set<event_id>` per run; duplicate messages (which can happen during resync) are ignored. This is why detections appearing in both the `event` and `detection` priority streams don't double-animate.

**Replay mode consumption.** In replay, the WS is closed (or used only for receiving scrub-time annotations from collaborators, post-MVP). The store is driven by `Frame` objects fetched from `GET /runs/{id}/frame?t=`. Animations between frames are interpolated by Framer Motion / Cytoscape's built-in tween.

---

## 15. Event Storage Strategy

**Primary store: PostgreSQL.** One `events` table, plus `detections` and `alerts` as logical separations for indexing.

**Schema.**

```sql
CREATE TABLE events (
    event_id    TEXT PRIMARY KEY,                       -- ULID
    run_id      UUID NOT NULL,
    seq         BIGINT NOT NULL,
    ts_us       BIGINT NOT NULL,                        -- microseconds since run start
    source      TEXT NOT NULL,
    kind        TEXT NOT NULL,
    severity    TEXT NOT NULL,
    node_id     TEXT,
    actor       TEXT NOT NULL,
    target      JSONB NOT NULL DEFAULT '{}',
    caused_by   TEXT[] NOT NULL DEFAULT '{}',
    mitre       TEXT[] NOT NULL DEFAULT '{}',
    effect      JSONB NOT NULL DEFAULT '{}',
    raw         JSONB NOT NULL DEFAULT '{}',
    UNIQUE (run_id, seq)
);

CREATE INDEX ix_events_run_ts        ON events (run_id, ts_us);
CREATE INDEX ix_events_run_kind      ON events (run_id, kind);
CREATE INDEX ix_events_run_node      ON events (run_id, node_id) WHERE node_id IS NOT NULL;
CREATE INDEX ix_events_run_source    ON events (run_id, source);
```

**Why one big table.** At MVP volumes (≤ 200 events × ≤ 20 runs/day = 4k rows/day), partitioning is overhead. The compound indexes on `(run_id, *)` give us O(log N) lookups for every replay query.

**Detections and alerts as views.**

```sql
CREATE VIEW detections AS SELECT * FROM events WHERE source = 'detection';
CREATE VIEW alerts     AS SELECT * FROM events WHERE source = 'alert';
```

They are the same envelope. Splitting them into separate tables in MVP would create join overhead for no benefit.

**Retention.** No retention policy in MVP. The `runs` table caps history at 20 entries surfaced in the UI, but events for older runs stay in the DB. A future `archive_run(run_id)` job will export to S3 and drop partitions.

**Partitioning (deferred).** The eventual partitioning strategy is hash-on-`run_id` (32 buckets), each sub-partitioned by `ts_us` hourly. We add this when the table exceeds ~10M rows. The schema is partition-ready; no change to application code will be required.

**Object storage for `raw` blobs (deferred).** If `raw` payloads grow large (e.g., full HTTP request captures), we move them to S3 and replace with `{ s3_key: ... }`. Not in MVP scope.

---

## 16. Event Severity System

Severity is **derived, never authored**. The runner does not set severity; the system computes it.

**Five levels.**

| Level | Use |
|---|---|
| `info` | Lifecycle, normal traffic, observation only |
| `low` | Failed auth, suspicious but recoverable |
| `medium` | Confirmed misuse, single-node compromise of a non-sensitive asset |
| `high` | Compromise of a sensitive asset, lateral movement |
| `critical` | Compromise of a crown-jewel asset (DB, identity provider), data exfiltration |

**Derivation rules (MVP).**

```python
def derive_severity(event: Event, env: Environment) -> Severity:
    # 1. Floor from MITRE tactic
    floor = max(severity_floor(t) for t in event.mitre) if event.mitre else "info"

    # 2. Asset criticality bump
    if event.node_id:
        asset = env.nodes[event.node_id]
        if asset.criticality == "crown_jewel" and event.effect.get("type") == "compromise":
            return "critical"
        if asset.criticality == "sensitive" and event.effect.get("type") == "compromise":
            return max("high", floor)

    # 3. Propagation distance bump (each lateral hop adds one level)
    distance = len(event.caused_by_chain())
    if distance >= 3:
        return bump(floor, by=1)

    return floor
```

**Why derived.** Authors of scenarios should be free to describe *what happened* without policing *how bad it is*. The product can recompute severity for the same event under different asset criticality maps, which is a future feature ("show me how this run looks if we re-rank the database as `crown_jewel`").

**Display.** The right-rail event stream tints each card by severity. The topology canvas uses the **highest current severity** affecting each node to choose its ring color (info: muted gray, critical: pulsing red).

---

## 17. Event Timestamping

Time is the single most error-prone aspect of an event system. Traceveil enforces three rules.

**Rule 1: One wall-clock anchor per run.**

`RunStarted.wall_ts` is the ISO-8601 UTC time when the run began. Every other event's `ts_us` is the number of microseconds since that anchor. `RunCompleted.wall_ts` closes the run.

```
wall_ts(event) = RunStarted.wall_ts + microseconds(event.ts_us)
```

This separation is what makes replay deterministic. A scenario re-run at 14:00 produces the same `ts_us` values as the one run at 09:00; only the anchor differs.

**Rule 2: `ts_us` is monotonic per run.**

Within a `run_id`, `ts_us` values are non-decreasing. Two events at the same `ts_us` are ordered by `seq`. This is enforced at emit time — the emit helper records `monotonic_us()` since the run started and assigns it as `ts_us`.

**Rule 3: Wall clocks are display-only.**

No business logic reads `wall_ts` for ordering, comparison, or filtering. Wall-clock fields appear only in `RunStarted` / `RunCompleted` and in `Frame.wall_ts` (computed from the anchor). All ordering, filtering, and replay operations use `(ts_us, seq)`.

**Why microseconds and not milliseconds.** Two scenario steps can land within the same millisecond. Microseconds give us 1000× headroom for free, and Postgres stores them efficiently as `BIGINT`.

**Why not nanoseconds.** JavaScript number precision tops out at 2⁵³, which gives roughly 285 years in nanoseconds but only ~14 days in microseconds since epoch. Since we use *microseconds since run start* (not since epoch), 2⁵³ µs is ~285 years — comfortable forever. Nanoseconds would require BigInt on the client, which is friction we don't need.

---

## 18. Infrastructure Node Events

Beyond attacker events, a class of events describes **state changes on the simulated infrastructure itself** — observations that aren't attacks but feed the same renderer.

**Kinds.**

| `kind` | Description | Source |
|---|---|---|
| `host.cpu.spike` | CPU usage spike on a node | synthetic generator |
| `host.syscall.unusual` | Unusual syscall pattern | synthetic generator |
| `host.process.spawned` | New process started | synthetic generator |
| `host.network.connection` | New outbound connection | synthetic generator |
| `app.auth.failure` | Failed authentication attempt | simulated app |
| `app.request.slow` | Slow HTTP response | simulated app |
| `app.error` | Application error logged | simulated app |
| `node.compromised` | A node transitioned to compromised | system |
| `node.recovered` | A node transitioned back to healthy | system |
| `node.traffic.spike` | Traffic volume spike on a node | synthetic generator |

**Why these matter.** Detections often fire on combinations: "unusual syscall *within* 500ms of HTTP exploit" is a much stronger signal than either alone. The synthetic telemetry generator emits these events *around* attacker steps to give detection rules realistic context.

**Synthetic generator shape.**

```python
async def emit_baseline_telemetry(run_id: UUID, env: Environment):
    """
    Emits a steady baseline of host/app events on a sine + jitter curve.
    Spikes deterministically when an attacker event references that node.
    """
    while run_active(run_id):
        for node in env.nodes:
            await events.emit(Event(
                kind="host.cpu.spike" if is_spike_moment(node) else "host.cpu.sample",
                source="host",
                node_id=node.id,
                severity="info",
                effect={},
                raw={"cpu_pct": current_cpu(node)},
            ))
        await asyncio.sleep(1.0)
```

The generator is small, deterministic given a seed, and ties spikes to attacker step timing — so when the attacker exploits the frontend, the frontend's CPU spikes ~500ms later as a side effect. This is theater, but it is the *kind* of theater that makes a detection engineer say "yes, that's how it would actually look."

---

## 19. Attack Propagation Events

Attack propagation is encoded entirely through `caused_by[]` chains and `traversal` effects.

**The chain.**

```
Step 1: attack.http.exploit (target = frontend)
        event_id = E1, caused_by = []
        effect = compromise(frontend)
              │
              ▼
Step 2: attack.kube.exec (target = api)
        event_id = E2, caused_by = [E1]      ← explicit causality
        effect = compromise(api)
              │
              ▼
Step 3: attack.lateral.connect (frontend → api → db)
        event_id = E3, caused_by = [E2]
        effect = traversal(api → db) + compromise(db)
              │
              ▼
Step 4: attack.data.exfil
        event_id = E4, caused_by = [E3]
        effect = mark(db, "data_exfil_attempted")
```

**Propagation rules.**

1. **Causality is authored, not inferred.** The scenario YAML declares each step's `caused_by`. The runner does not guess.
2. **Detection events inherit causality.** A `DetectionEvent` fired on `E2` carries `caused_by = [E2]`, transitively rooting it in the attack chain.
3. **The `caused_by` graph is queryable.** A `GET /runs/{id}/chain?root=E1` endpoint (post-MVP) returns the full subtree. In MVP, the frontend renders the chain by walking `caused_by` arrays in the loaded event set.

**Why this matters for the UI.** The "attack path overlay" highlights exactly the nodes and edges in the `caused_by` closure of the selected step. Without explicit causality, the overlay would be a heuristic — and a wrong heuristic would silently mislead the operator.

**Compromise propagation visuals.**

- A compromise effect lights the affected node's outer ring.
- A traversal effect emits a particle along the edge.
- The two effects in the same event (lateral movement) chain visually: the particle arrives at the target node *exactly as* its compromise ring begins to fill.

Timing between these visuals is driven by the event's `ts_us` and the next event's `ts_us`. The renderer does not invent delays.

---

## 20. Example Event Payloads

Concrete JSON for the events you will see most often. These are what arrives over the WebSocket and what's stored in Postgres.

**Run started.**

```json
{
  "event_id": "01HX5VWNQ5XAAAAA0000000001",
  "run_id":   "f1d4a8c0-7e2b-4a8d-9f5c-3c4b1e0a6e91",
  "seq": 1,
  "ts_us": 0,
  "wall_ts": "2026-05-12T16:42:11.184Z",
  "source": "system",
  "kind": "run.started",
  "severity": "info",
  "actor": "system",
  "target": {},
  "caused_by": [],
  "mitre": [],
  "effect": {},
  "raw": {
    "scenario_id": "sql-injection-data-exfil",
    "scenario_version": "1",
    "environment_id": "env-microservices-small"
  }
}
```

**Attack: HTTP exploit.**

```json
{
  "event_id": "01HX5VWNQ5XAAAAA0000000002",
  "run_id":   "f1d4a8c0-7e2b-4a8d-9f5c-3c4b1e0a6e91",
  "seq": 2,
  "ts_us": 2000000,
  "source": "attacker",
  "kind": "attack.http.exploit",
  "severity": "high",
  "node_id": "web-frontend",
  "actor": "external",
  "target": {
    "node_id": "web-frontend",
    "service": "web-frontend",
    "path": "/api/debug",
    "port": 8080
  },
  "caused_by": [],
  "mitre": ["T1190"],
  "effect": {
    "type": "compromise",
    "node_id": "web-frontend",
    "severity": "high"
  },
  "raw": {
    "payload": "${jndi:ldap://...}",
    "user_agent": "curl/7.88.1"
  }
}
```

**Host telemetry: CPU spike.**

```json
{
  "event_id": "01HX5VWNQ5XAAAAA0000000003",
  "run_id":   "f1d4a8c0-7e2b-4a8d-9f5c-3c4b1e0a6e91",
  "seq": 3,
  "ts_us": 2480000,
  "source": "host",
  "kind": "host.cpu.spike",
  "severity": "info",
  "node_id": "web-frontend",
  "actor": "system",
  "target": { "node_id": "web-frontend" },
  "caused_by": ["01HX5VWNQ5XAAAAA0000000002"],
  "mitre": [],
  "effect": {},
  "raw": { "cpu_pct": 94.2, "duration_ms": 320 }
}
```

**Detection fired.**

```json
{
  "event_id": "01HX5VWNQ5XAAAAA0000000004",
  "run_id":   "f1d4a8c0-7e2b-4a8d-9f5c-3c4b1e0a6e91",
  "seq": 4,
  "ts_us": 2520000,
  "source": "detection",
  "kind": "detection.fired",
  "severity": "high",
  "node_id": "web-frontend",
  "actor": "detection-engine",
  "target": { "node_id": "web-frontend" },
  "caused_by": ["01HX5VWNQ5XAAAAA0000000002"],
  "mitre": ["T1190"],
  "effect": {},
  "raw": {
    "rule_id": "waf_suspicious_payload",
    "rule_version": "1",
    "matched_event_ids": ["01HX5VWNQ5XAAAAA0000000002"],
    "on_time": true,
    "severity_derived": "high"
  }
}
```

**Alert raised.**

```json
{
  "event_id": "01HX5VWNQ5XAAAAA0000000005",
  "run_id":   "f1d4a8c0-7e2b-4a8d-9f5c-3c4b1e0a6e91",
  "seq": 5,
  "ts_us": 2530000,
  "source": "alert",
  "kind": "alert.raised",
  "severity": "high",
  "node_id": "web-frontend",
  "actor": "alert-engine",
  "target": { "node_id": "web-frontend" },
  "caused_by": ["01HX5VWNQ5XAAAAA0000000004"],
  "mitre": ["T1190"],
  "effect": {},
  "raw": {
    "alert_id": "01HX5VWNQALERT0000000000001",
    "title": "Suspicious HTTP payload blocked at web frontend",
    "description": "WAF rule waf_suspicious_payload matched a request to /api/debug from an external IP.",
    "detection_ids": ["01HX5VWNQ5XAAAAA0000000004"],
    "suggested_action": "Review WAF logs and confirm the request did not bypass the rule.",
    "state": "raised"
  }
}
```

**Attack: lateral movement.**

```json
{
  "event_id": "01HX5VWNQ5XAAAAA0000000010",
  "run_id":   "f1d4a8c0-7e2b-4a8d-9f5c-3c4b1e0a6e91",
  "seq": 10,
  "ts_us": 12000000,
  "source": "attacker",
  "kind": "attack.lateral.connect",
  "severity": "critical",
  "node_id": "db",
  "actor": "api-service",
  "target": {
    "node_id": "db",
    "service": "postgres",
    "port": 5432,
    "identity": "api-service-token"
  },
  "caused_by": ["01HX5VWNQ5XAAAAA0000000007"],
  "mitre": ["T1021.004"],
  "effect": {
    "type": "traversal",
    "from_node": "api-service",
    "to_node": "db",
    "protocol": "postgres"
  },
  "raw": {}
}
```

**Run completed.**

```json
{
  "event_id": "01HX5VWNQ5XAAAAA0000000020",
  "run_id":   "f1d4a8c0-7e2b-4a8d-9f5c-3c4b1e0a6e91",
  "seq": 20,
  "ts_us": 92000000,
  "wall_ts": "2026-05-12T16:43:43.184Z",
  "source": "system",
  "kind": "run.completed",
  "severity": "info",
  "actor": "system",
  "target": {},
  "caused_by": [],
  "mitre": [],
  "effect": {},
  "raw": {
    "outcome": "completed",
    "scorecard": {
      "expected": 6,
      "fired_on_time": 3,
      "fired_late": 1,
      "missed": 2,
      "false_positive": 0,
      "score_pct": 0.58
    }
  }
}
```

These six payloads are what the rest of the system — renderer, replay engine, scorecard, alert inbox — is built to consume. If a new event type doesn't fit this envelope, it doesn't belong in Traceveil.

— *End of Event System v0.1*
