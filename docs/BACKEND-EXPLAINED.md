# TraceVeil Backend — Explained From Scratch

This document explains the entire backend in plain English. No assumptions about what you already know.

---

## The Big Picture First

**What is a backend?**

When you open a website, what you *see* (buttons, colors, animations) is the **frontend** — it runs in your browser. But all the real work — saving your data, checking your password, running calculations — happens on a server somewhere. That server-side code is the **backend**.

Think of a restaurant:
- The **frontend** is the dining room — what customers see and interact with
- The **backend** is the kitchen — where the actual work happens
- The **database** is the pantry/freezer — where everything is stored
- The **API** is the waiter — takes your order from the dining room to the kitchen, brings the food back

**What does TraceVeil's backend actually do?**

TraceVeil simulates cyber attacks on a fake corporate network. The backend:
1. Lets you register and log in
2. Lets you pick an attack scenario and run it
3. Runs the actual "attack" step by step in the background
4. Streams every attack event to your browser in real time
5. Fires alerts when dangerous events match detection rules
6. Saves everything to a database so you can replay it later

---

## Why We Have Multiple Services (Not Just One)

Our backend is split into 5 separate programs, each running in its own container:

```
services/
├── api/                 ← The main waiter (handles HTTP requests from your browser)
├── simulation_engine/   ← The chef (does the actual simulation work)
├── websocket_gateway/   ← The TV screen in the dining room (streams live updates)
├── alert_service/       ← The security guard (watches events and fires alerts)
└── replay_engine/       ← The VCR (plays back saved simulations)
```

**Why not just put everything in one file?**

You *could*, but imagine a restaurant where the chef also takes orders, manages the TV screens, and watches security cameras simultaneously. Everything would be slower and if one thing broke, everything would stop.

Splitting into services means:
- Each service does one job and does it well
- If the alert service crashes, simulations still run
- You can make one service faster without touching the others

The services communicate with each other through **Redis** — think of Redis like a shared whiteboard in the kitchen. Any service can post a message there, and any other service can read it.

---

## The Two Data Stores: PostgreSQL and Redis

Before diving into each service, you need to understand these two.

### PostgreSQL — The Filing Cabinet

PostgreSQL is a **database**. It stores everything permanently:
- User accounts and passwords
- Simulation records
- Every attack event that fired
- Alerts that were triggered
- Replay data

Permanent means: even if you turn off the server and turn it back on, the data is still there. It's like writing something in ink — it stays.

PostgreSQL stores data in **tables** — exactly like spreadsheet sheets. Each row is one record. Each column is a field.

Example — the `simulations` table looks like this:

| id | user_id | status | attack_speed | created_at |
|----|---------|--------|--------------|------------|
| abc-123 | user-456 | RUNNING | 1.0 | 2026-05-15 |
| def-789 | user-456 | COMPLETED | 2.0 | 2026-05-14 |

### Redis — The Whiteboard

Redis is completely different. It's **not** for permanent storage. Think of it as a whiteboard or sticky notes — fast to write, fast to read, but temporary.

We use Redis for two things:

**1. The Message Bus (Pub/Sub)**

"Pub/Sub" stands for "Publish/Subscribe". It works like a radio station:
- The simulation engine **publishes** (broadcasts) attack events to a channel
- The WebSocket gateway and alert service **subscribe** (tune in) to that channel
- Everyone subscribed gets the message instantly

In our system, every simulation has its own channel named `simulation:{id}:events`. When an attack step fires, the message goes there and two services receive it simultaneously: the gateway (to stream to your browser) and the alert service (to check detection rules).

**2. The Task Queue**

When you click "Run Simulation", the API doesn't run the simulation itself — it writes a task to a Redis queue, like leaving a note on a to-do list. The simulation engine is a worker that constantly checks that list, picks up tasks, and does the work.

---

## The 5 Services, Explained One by One

---

### 1. The API Service (`services/api/`)

**What it does:** Handles every HTTP request your browser makes. Think of it as the receptionist of the whole system.

**Technology:** FastAPI (a Python web framework)

**What "HTTP request" means:** When your browser wants to do something — log in, create a simulation, get a list of alerts — it sends a message to the server. That message is an HTTP request. FastAPI receives it, does some work, and sends a response back.

**The routes (what the API can do):**

| URL | Method | What it does |
|-----|--------|-------------|
| `/api/auth/register` | POST | Create a new account |
| `/api/auth/login` | POST | Log in, get back a JWT token |
| `/api/auth/me` | GET | "Who am I?" — returns your user info |
| `/api/scenarios` | GET | List the available attack scenarios |
| `/api/simulations` | POST | Create a new simulation |
| `/api/simulations/{id}/start` | POST | Start running a simulation |
| `/api/simulations/{id}/pause` | POST | Pause a running simulation |
| `/api/simulations/{id}/resume` | POST | Resume a paused simulation |
| `/api/simulations/{id}/stop` | POST | Stop a simulation early |
| `/api/simulations/{id}/events` | GET | Get the event log for a simulation |
| `/api/alerts` | GET | List alerts (optionally filtered by simulation) |
| `/api/alerts/{id}/acknowledge` | POST | Mark an alert as seen |

**The folder structure inside the API:**

```
services/api/app/
├── main.py           ← Startup code — creates the FastAPI app, starts the DB
├── config.py         ← All settings (DB URL, JWT secret, etc.) loaded from env vars
├── database.py       ← How we connect to PostgreSQL
├── redis_client.py   ← How we connect to Redis
├── celery_app.py     ← How we send tasks to the simulation engine
└── modules/
    ├── auth/         ← Login, register, JWT token logic
    ├── scenarios/    ← Reading pre-built attack scenarios
    ├── simulations/  ← Creating and managing simulations
    └── alerts/       ← Reading alerts and detection rules
```

Each module has 3 files:
- `models.py` — the database table definition (the columns, their types)
- `schemas.py` — what the API accepts and returns (request/response shapes)
- `router.py` — the actual route handlers (what runs when a request comes in)

**What is JWT (the token)?**

JWT stands for JSON Web Token. It's a small piece of text that proves who you are. When you log in, the API creates a JWT and sends it to your browser. Your browser then sends that JWT with every future request, like showing your ID badge to prove you're allowed in.

The JWT is signed with a secret key — only our server can create valid ones, so nobody can fake one.

---

### 2. The Simulation Engine (`services/simulation_engine/`)

**What it does:** The actual heavy lifting. Runs attack scenarios step by step, generates events, writes them to the database, and broadcasts them via Redis.

**Technology:** Celery (a background task system)

**What "Celery worker" means:**

Celery is a system for running tasks in the background. When you click "Start Simulation", the API doesn't run the simulation itself (that would block the API from handling other requests). Instead, it drops a task into a queue: "run this simulation". The Celery worker — a separate process — picks it up and runs it.

This is like calling a restaurant and placing a to-go order. You don't wait on the phone while they cook. They take your order, hang up, cook the food, and you pick it up when it's ready.

**The files inside:**

```
services/simulation_engine/
├── worker.py      ← Sets up Celery, connects to Redis as the task broker
├── tasks.py       ← The run_simulation() function — the main task
├── event_loop.py  ← Two coroutines that run at the same time during a sim
├── topology.py    ← Generates the virtual network (nodes and edges)
├── models.py      ← The simulation_events database table
├── database.py    ← PostgreSQL connection
└── config.py      ← Settings
```

**What happens when a simulation runs:**

```
1. LOAD      — Read the simulation and scenario from PostgreSQL
2. TOPOLOGY  — Generate a virtual network (workstations, servers, databases, etc.)
3. SYNC      — Publish the topology to Redis so your browser can render it
4. RECORD    — Create a Replay record in PostgreSQL for later playback
5. RUN       — Execute two coroutines in parallel:
               • fire_events   — steps through the scenario, publishes events
               • listen_commands — watches for PAUSE / RESUME / STOP commands
6. FINISH    — Mark the simulation COMPLETED or STOPPED in the DB
```

**What "coroutines" means:**

A coroutine is a function that can be paused and resumed. Python's `asyncio` lets you run multiple coroutines "at the same time" on a single CPU core by switching between them whenever one is waiting (for a timer, for Redis, for the database).

`fire_events` and `listen_commands` run concurrently — while fire_events sleeps between attack steps, listen_commands is watching for your PAUSE/STOP commands. Neither blocks the other.

**What a scenario step looks like (in the database):**

```json
{
  "event_type": "LATERAL_MOVEMENT",
  "source_node_type": "WORKSTATION",
  "target_node_type": "SERVER",
  "ttp_id": "T1021",
  "severity": "CRITICAL",
  "delay_ms": 4000,
  "probability": 0.85,
  "description": "Attacker pivots from workstation to app server"
}
```

For each step, the engine:
1. Waits `delay_ms` milliseconds (divided by attack speed)
2. Rolls the `probability` dice — 0.85 means 15% chance this step is skipped
3. Builds the attack event
4. Writes it to PostgreSQL
5. Publishes it to Redis (`simulation:{id}:events` channel)
6. Also publishes a `NODE_STATE_CHANGE` event (the targeted node becomes COMPROMISED etc.)

**How PAUSE / STOP works:**

The two coroutines share a `SimState` object with two flags:
- `running` — when cleared, `fire_events` blocks (pauses) at the next step
- `stopped` — when set, both coroutines exit cleanly

When you press Pause → API publishes "PAUSE" to Redis → `listen_commands` reads it → clears `running` → `fire_events` hits `await state.running.wait()` and waits indefinitely until Resume is pressed.

---

### 3. The WebSocket Gateway (`services/websocket_gateway/`)

**What it does:** Holds open persistent connections with your browser and streams real-time events to it.

**Technology:** FastAPI with WebSocket support

**What "WebSocket" means:**

Normal HTTP is like sending letters. You send one (a request), you wait for a reply (the response). Every exchange requires a new round trip.

WebSocket is like a phone call. You connect once, and then both sides can talk whenever they want, without the overhead of starting a new call every time. It's persistent and bidirectional.

We need WebSocket because attack events happen continuously while a simulation is running. We can't have your browser send an HTTP request every second asking "anything new?" — that would be slow and wasteful. Instead, the browser opens one WebSocket connection and the gateway pushes events to it the moment they arrive.

**How the browser connects:**

```
ws://localhost:8001/ws/{simulation_id}?token={your_jwt}
```

Notice the `?token=` — browsers can't send custom headers on WebSocket connections, so the JWT goes in the URL instead.

**What happens on connect:**

1. Gateway validates the JWT from the URL
2. Gateway adds your connection to the "room" for that simulation
3. Gateway sends a `STATE_SYNC` message with the full current topology
4. From then on, every Redis event for that simulation is forwarded to your browser

**The files inside:**

```
services/websocket_gateway/app/
├── main.py         ← FastAPI app, starts the Redis listener background task
├── router.py       ← The /ws/{simulation_id} WebSocket endpoint
├── gateway.py      ← Connection manager — tracks which connections are in which room
├── listener.py     ← Subscribes to Redis, routes messages to the right room
└── redis_client.py ← Redis connection
```

**The Connection Manager:**

```python
# Conceptually, the gateway keeps a dictionary like this:
rooms = {
    "sim-123": [websocket_alice, websocket_bob],
    "sim-456": [websocket_charlie],
}
```

When an event comes in for `sim-123`, it sends to both Alice and Bob — nobody else. Multiple users can watch the same simulation simultaneously.

---

### 4. The Alert Service (`services/alert_service/`)

**What it does:** A background process that watches the live event stream and fires alerts when attack events match detection rules.

**Technology:** Pure Python asyncio (no web framework — it doesn't serve HTTP)

**What it is NOT:**

The alert service is not a web server. It doesn't accept HTTP requests. It's just a loop: subscribe to Redis, read events, check rules, write alerts.

**How detection rules work:**

Detection rules are stored in the `detection_rules` table:

| name | event_type_filter | severity_min | alert_title |
|------|-------------------|--------------|-------------|
| Lateral Movement Detected | LATERAL_MOVEMENT | HIGH | Lateral Movement Activity Detected |
| Data Exfiltration Detected | EXFILTRATION | CRITICAL | Critical Data Exfiltration Detected |

When the alert service receives an event, it checks every rule:
- Does `event.event_type == rule.event_type_filter`? ✓
- Is `event.severity >= rule.severity_min`? ✓
- Both match → write an Alert record to PostgreSQL, publish `ALERT_FIRED` to Redis

The WebSocket gateway receives the `ALERT_FIRED` event and forwards it to your browser.

**The key idea — detection gaps:**

Some attack events on purpose don't match any rule (e.g., RECON events are low severity). Those are the "detection gaps" — attacks that went undetected. TraceVeil shows you which events fired alerts and which slipped through. That's the whole educational point.

**Auto-seeding detection rules:**

When the alert service starts, it calls a seed function that checks if the `detection_rules` table is empty. If it is, it inserts 5 default rules. If it's already populated, it skips. This means you never need to run the seed script manually.

---

### 5. The Replay Engine (`services/replay_engine/`)

**What it does:** Reads saved simulation events from PostgreSQL and re-plays them at a controlled speed, with pause, seek, and speed control.

**Technology:** FastAPI

**Why replay isn't a second simulation:**

The replay engine doesn't re-run the attack scenario. It reads the exact event log that was saved to PostgreSQL during the original simulation and publishes those exact same events to Redis — in order, at the original speed (or faster/slower). 

Your browser can't tell the difference between a live simulation and a replay. Both send the same event types through the same WebSocket. The replay is just the same pipeline, fed from PostgreSQL instead of a live engine.

**The endpoints:**

| URL | What it does |
|-----|-------------|
| `GET /api/replays` | List all saved replays |
| `POST /api/replays/{id}/play` | Start or resume playback |
| `POST /api/replays/{id}/pause` | Pause playback |
| `POST /api/replays/{id}/stop` | Stop and reset |
| `POST /api/replays/{id}/seek?position=0.6` | Jump to 60% through the timeline |
| `POST /api/replays/{id}/speed?multiplier=2` | Change playback speed |

**How seek works:**

When you drag the scrubber to 60%:
1. Engine calculates which event sequence number is at 60% of total events
2. Loads all `NODE_STATE_CHANGE` events up to that point from PostgreSQL
3. Reconstructs what every node's status was at that point in time
4. Publishes a `STATE_SYNC` event so your browser re-draws the topology correctly
5. Continues playing forward from that point

**The cursor:**

The engine stores a "cursor" in Redis for each active replay:
```json
{
  "status": "PLAYING",
  "sequence": 42,
  "speed": 2.0
}
```
This tells the engine where it is and how fast to go. It's stored in Redis because it changes constantly and doesn't need to be permanent.

---

## How It All Connects — A Full Example

Let's trace what happens when you start a simulation from scratch.

```
You click "Run Simulation" in the browser
│
│  HTTP POST /api/simulations/{id}/start
▼
API Service
  ├── Checks your JWT (are you logged in?)
  ├── Loads the simulation from PostgreSQL (does it exist? Is it yours?)
  ├── Sets simulation status = RUNNING in PostgreSQL
  ├── Dispatches "run_simulation" task to Redis task queue
  └── Returns 202 (accepted) immediately — doesn't wait for the simulation to finish
│
│  (meanwhile, the browser opens a WebSocket connection)
│  ws://localhost:8001/ws/{simulation_id}?token={jwt}
▼
WebSocket Gateway
  ├── Validates the JWT
  ├── Adds your connection to the simulation's room
  ├── Fetches topology from PostgreSQL
  └── Sends STATE_SYNC → your browser renders the network nodes
│
│  (meanwhile, the Celery worker picks up the task)
▼
Simulation Engine
  ├── Loads scenario steps from PostgreSQL
  ├── Generates topology (nodes + edges)
  ├── Saves topology to PostgreSQL
  ├── Publishes STATE_SYNC to Redis
  └── Starts the event loop:
        for each step in scenario:
          ├── Sleep delay_ms / attack_speed
          ├── Roll probability dice (maybe skip this step)
          ├── Build the attack event
          ├── Write to PostgreSQL (permanent record)
          ├── Publish to Redis channel "simulation:{id}:events"
          └── Publish NODE_STATE_CHANGE to same Redis channel
│
│  (Redis delivers the event simultaneously to two subscribers)
│
├─────────────────────────────┬──────────────────────────────────
▼                             ▼
WebSocket Gateway         Alert Service
  ├── Receives event           ├── Receives event
  └── Forwards to your         ├── Checks all detection rules
      browser via WebSocket    ├── Rule matches →
                               │     Write Alert to PostgreSQL
                               │     Publish ALERT_FIRED to Redis
                               │              │
                               │              ▼
                               │         WebSocket Gateway
                               │           └── Forwards ALERT_FIRED
                               │               to your browser
                               └── Rule doesn't match → detection gap
│
▼
Browser shows:
  • Attack event animation on the network diagram
  • Node color changes (COMPROMISED, ELEVATED, EXFILTRATING)
  • Alert appears in the alert feed (if a rule matched)
```

---

## Docker Compose — How Everything Starts

`docker-compose.yml` is the file that starts all services together.

Run this one command and everything starts:
```bash
docker compose up
```

**What Docker is:** Docker runs each service in an isolated "container" — think of it like a lightweight virtual machine. Each container has its own filesystem, its own Python environment, its own process. They're isolated from each other but can talk over a virtual network.

**What docker-compose does:** Starts all containers together, creates the network between them, waits for dependencies (e.g., the API waits for PostgreSQL to be ready before starting).

**The services in docker-compose.yml:**

| Service name | What it is | Port (external) |
|--------------|------------|-----------------|
| `postgres` | PostgreSQL database | 5434 (on your machine) |
| `redis` | Redis | 6379 |
| `api` | FastAPI REST API | 8000 |
| `websocket_gateway` | WebSocket Gateway | 8001 |
| `alert_service` | Alert Service | (no port — internal only) |
| `replay_engine` | Replay Engine | 8002 |
| `simulation_engine` | Celery worker | (no port — internal only) |

**Why 5434 instead of 5432 for PostgreSQL?**

Port 5432 is PostgreSQL's default. If you already have PostgreSQL installed on your Mac, it's probably using 5432. We use 5434 on your Mac to avoid a conflict. Inside Docker's internal network, PostgreSQL still runs on 5432 — services inside Docker connect to `postgres:5432` (the container name + the internal port).

---

## Key Concepts Quick Reference

**async / await**
Python code that can be paused while waiting (for a database, for Redis, for a timer) without blocking everything else. FastAPI is built entirely around this. Instead of wasting CPU spinning while waiting, it switches to another coroutine.

**SQLAlchemy**
A Python library that lets you talk to PostgreSQL using Python code (classes, methods) instead of writing raw SQL strings everywhere. You define your table as a Python class, and SQLAlchemy handles the SQL.

**Pydantic**
A library for data validation. When a request comes into the API, Pydantic checks that the JSON has the right fields and the right types. If something is wrong, it returns a 422 error automatically. Also used to control what fields the API returns in responses.

**FastAPI dependency injection**
A pattern where you declare what a route function needs, and FastAPI provides it. For example, every protected route has `user: User = Depends(get_current_user)` — FastAPI automatically calls `get_current_user`, validates the JWT, loads the user from the DB, and passes it to your function. You never call it yourself.

**Environment variables**
Configuration values (database passwords, JWT secrets) that are set outside the code, in the environment. In local development these come from a `.env` file or from `docker-compose.yml`. This means the same code works in development and production with different configs, and secrets never live in the codebase.

**JSONB**
A PostgreSQL column type that stores JSON. The `topology` column in `simulations` is JSONB — it holds the entire node/edge graph as a JSON object. You can query inside it, index it, and update parts of it. Better than storing JSON as a plain string.

---

## The Database Tables and Who Owns Them

Each service owns certain tables. "Owns" means it's the only service that creates or writes to them. Other services can read, but never write.

| Table | Owner | What it stores |
|-------|-------|---------------|
| `users` | API | User accounts |
| `scenarios` | API | Pre-built attack scenarios |
| `simulations` | API + Engine | Simulation records (engine updates status/topology) |
| `simulation_events` | Simulation Engine | Every attack event that fired |
| `detection_rules` | Alert Service | Rules for triggering alerts |
| `alerts` | Alert Service | Fired alert records |
| `replays` | Simulation Engine | One record per completed simulation |
| `replay_events` | Simulation Engine | Events formatted for replay playback |

---

## What Happens on First Start

When you run `docker compose up` for the first time on a fresh database:

1. PostgreSQL starts with an empty database
2. The API service starts, calls `init_db()` which creates all tables it owns
3. The API calls `seed_scenarios()` — sees the scenarios table is empty, inserts 3 pre-built attack scenarios
4. The simulation engine starts, creates the `simulation_events` and `replay_events` tables
5. The alert service starts, calls `seed_rules()` — sees detection_rules is empty, inserts 5 rules
6. Everything is ready — you can register an account and run a simulation

The seed functions are **idempotent** — if you restart and the tables already have data, they skip silently. Running `docker compose up` a second time does not duplicate your data.

---

## Common Terms You'll See in the Code

| Term | Meaning |
|------|---------|
| `router` | A FastAPI object that groups related routes (like a mini-app for just the auth routes) |
| `session` / `db` | An open connection to PostgreSQL for one request |
| `get_session` | A FastAPI dependency that creates a DB session and closes it when the request is done |
| `commit()` | Save changes to the database permanently (like Ctrl+S) |
| `refresh()` | Re-read an object from the database (to get server-generated values like timestamps) |
| `scalar_one_or_none()` | Run a query that returns one row, or None if not found |
| `publish()` | Send a message to a Redis channel (fire and forget) |
| `psubscribe()` | Subscribe to Redis channels using a pattern (e.g. `simulation:*:events` matches all simulations) |
| `lifespan` | FastAPI code that runs once at startup and once at shutdown |
| `Annotated` | Python typing syntax used to attach metadata (like `Depends(...)`) to function parameters |
