# Traceveil — Foundation

**Version:** 0.3 (personal-project framing)
**Status:** Project foundation
**Last revised:** 2026-05-12

> Companion docs: [MVP.md](MVP.md) · [ARCHITECTURE.md](ARCHITECTURE.md) · [EVENT-SYSTEM.md](EVENT-SYSTEM.md) · [ATTACK-SCENARIOS.md](ATTACK-SCENARIOS.md)

---

## 1. Project Overview

> **Traceveil is a personal cybersecurity engineering project — an experiment in realtime attack simulation, infrastructure visualization, replay systems, and DevSecOps integration. It is built solo, on a 2-week budget, as a portfolio-grade artifact. It is deliberately not a product, a startup, or a SaaS.**

**Traceveil is an interactive cyber attack simulation and incident replay platform.**

It lets the operator launch a curated attack scenario against a simulated environment, *watch the breach happen* on a live topology, see detections fire in real time, and then **scrub back through every second of the incident** on an interactive timeline.

The cybersecurity surface is the project. The infrastructure, the containers, the CI/CD pipeline, the Kubernetes manifests — those are how Traceveil is *built and shipped*. They are not what Traceveil *is*.

What Traceveil *is*:

- A lab to **simulate** attacks safely.
- A canvas to **visualize** how they propagate.
- A surface to **observe** detections and alerts as they happen.
- A timeline to **replay** an incident as a story you can step through.
- A way to **study** infrastructure compromise visually, not through log queries.

---

## 2. Product Vision

Security teams should be able to **rehearse a breach the way pilots rehearse an engine failure** — repeatedly, vividly, with the ability to pause, rewind, and ask "what if we'd noticed sooner?"

Today they can't. Real incidents are post-mortems, not experiences. Detections decay silently. New analysts learn from PDFs of yesterday's war stories.

Traceveil's long-term vision is to make every serious security org's "did we handle that well?" question answerable from a replayable artifact rather than a Slack thread. A team should be able to say:

> "Here is the breach. Here is the timeline. Here is what fired, what didn't, and what we'd do differently."

And then play it back, on screen, in front of whoever needs to see it.

The product is closer in spirit to a **flight simulator** than to a SIEM. It is meant to be opened *before* the incident, not after.

---

## 3. Problem Statement

Security work today has a reproducibility problem and a storytelling problem.

**The reproducibility problem.** Real attacks can't be re-run. A team that handled a breach well in March cannot re-create it in April to train a new hire. Detection rules written last year decay silently because no one is firing realistic TTPs at them. "Did we catch this?" is answered by guesswork, not by evidence.

**The storytelling problem.** When an incident *is* reconstructed, it lives in a wiki page or a slide deck. The actual experience of *watching the attack unfold* — the speed, the order, the missed signals — is lost. Defenders inherit narration instead of memory.

Both problems share a root cause: the security industry has no shared substrate for **interactive, replayable, visual attack scenarios.** Tabletop exercises produce slides. CTFs produce flags. SIEMs produce alerts. None of them produce a thing you can *watch happen* and *play back*.

Traceveil is that substrate.

---

## 4. Why Traceveil Is Different

It's worth being explicit about what Traceveil is *not*, because adjacent categories will get conflated in conversation.

- **Not a SIEM.** A SIEM ingests real telemetry from real infrastructure and helps you search it. Traceveil generates *simulated* incidents end-to-end and shows them to you as scenes, not as queries.
- **Not a SOC dashboard.** SOC dashboards aggregate alerts from live systems. Traceveil's "alerts" are part of a story the user chose to launch.
- **Not a CTF or training lab.** CTFs are individual puzzles with flags. Traceveil's scenarios are continuous incidents with propagation, detection, and replay — and they're designed to be re-run, not solved once.
- **Not a red-team platform.** Red-team tooling actually compromises real targets. Traceveil simulates. The compromise lives in our data model, not in a victim machine.
- **Not a tabletop tool.** Tabletop exercises are verbal. Traceveil is visual, timed, and reproducible.

What *is* different about Traceveil:

1. **Attacks are watchable, not just runnable.** The topology canvas is the primary interface. Propagation is animated. Compromise looks like compromise.
2. **Replay is a first-class feature.** Every run is recorded as a scrub-able timeline. You don't search for an event; you drag the playhead to it.
3. **Scenarios are versioned artifacts.** A scenario is a YAML file in a repo, not a session in someone's head. The same scenario, run twice, produces comparable results.
4. **Detections live next to the attacks they should catch.** Each scenario declares the detections it expects. The product scores hit vs. miss vs. late automatically.
5. **The visual layer carries meaning.** Animation timing, color, motion direction — they encode information. The UI is closer to a game HUD than a dashboard.

---

## 5. Core Product Philosophy

Six tenets that govern decisions when in doubt.

1. **Stories over rows.** A table of events is a failure of imagination. Every screen should answer *what happened, to what, when, and what fired* — visually.
2. **The graph never lies.** If a node is shown compromised, there is a real event chain that proves it. No decorative state, no fake animations.
3. **Time is a UI control.** Replay is not "log search with a slider." Time is a first-class axis you drag, pause, and speed through.
4. **Determinism is a feature.** A scenario re-run should produce a comparable run. Without that, regression testing of detections is impossible.
5. **Small surface, deep behavior.** Few primitives — Environment, Scenario, Run, Event, Detection, Replay. Rich composition between them.
6. **Cinematic, not corporate.** Dark, dense, deliberate. Motion has meaning. The product should look like something a security engineer *wants* to open.

---

## 6. Who Would Find This Interesting

Primarily me — Traceveil is the project I'd want to use to learn detection engineering, replay-system design, and visual incident storytelling end-to-end.

Beyond that, the kind of person who might enjoy poking at this on GitHub or watching the demo: a security-curious engineer who wants to *see* what an attack actually looks like instead of reading about it; a hiring manager reviewing a portfolio and wanting evidence of cybersecurity + DevSecOps depth; a detection-engineering hobbyist who'd think "huh, I could write a Sigma rule against that event stream." It's not built for enterprise SOC analysts looking for a Splunk replacement, hobbyist CTF players, or compliance auditors — those are different shapes of tool.

If a single reviewer walks away thinking *"this is a serious engineering project, and the attack-storytelling angle is creative,"* the project succeeded.

---

## 7. Core Cybersecurity Features

The feature set, framed by what it does for a security user.

- **Attack Scenarios.** Pre-built incidents that mirror real-world TTPs — initial access, lateral movement, privilege escalation, persistence, exfiltration. Each scenario is mapped to MITRE ATT&CK techniques, declares its expected detections, and runs deterministically.
- **Simulated Environments.** A small, declared topology of services, databases, identity providers, and network edges. Real enough to attack against; bounded enough to render and reason about.
- **Live Attack Propagation.** Watch a compromise spread node-by-node on the topology canvas. Each step is timed, animated, and recorded.
- **Detection Engine.** A set of detection rules that fire against attacker events. Each detection carries a MITRE tag, a severity, and a "fired on time / fired late / missed" verdict.
- **Incident Replay.** Every run is a scrub-able timeline. Drag the playhead; the graph and the alerts replay in lockstep.
- **Run Scorecard.** Expected vs. actual detections, with timing. The closest thing to a "MTTD score" for a single incident.
- **Event Stream.** A unified, real-time feed of attacker actions, telemetry samples, and detections — all on one bus, all on one timeline.
- **Attack Storytelling.** A run, once finished, becomes a watchable artifact. Shareable, re-openable, comparable.

Each of these is in service of one verb: **understand the attack**. Nothing in the feature set is administrative.

---

## 8. Core User Experience

A user opens Traceveil to a dark, cinematic canvas. A small simulated environment is laid out as a graph — services, databases, an ingress, an identity provider. A side rail lists attack scenarios.

They click *Launch* on **"SQL Injection → Auth Bypass → Data Exfiltration."**

For the next ~90 seconds, things happen on the screen:

- The web frontend node's outer ring fills red as it compromises.
- An animated edge brightens, and a particle travels from there to the API service.
- Event cards slide into the right rail: "HTTP exploit," "Container exec," "Lateral connection."
- A detection fires. The detecting node briefly pulses with the rule's name.
- A scorecard in the corner updates: *3 of 6 detections fired so far*.
- The bottom timeline fills left-to-right, one tick per attacker step.

The run ends. The view transitions seamlessly into **Replay mode**: same canvas, but now the timeline is interactive. The user drags the playhead back to T+12s — the topology reverts, only the frontend is compromised. They scrub forward and watch the breach again, slower this time. They click a node to inspect what happened to it, and which detections did or didn't fire.

That feeling — *the breach is something I can watch and scrub through* — is what Traceveil is.

Every other screen is in service of getting back to that one.

---

## 9. Attack Simulation Philosophy

Traceveil simulates attacks. It does not execute them. This is a deliberate philosophical choice, not a limitation.

**Attacks are scripted timelines, not real exploits.** A scenario is a YAML file declaring an ordered sequence of attacker steps — for example `http.exploit → sqli.payload → data.read → data.exfil` — each with a target, a MITRE tag, an effect on the topology, and the detections it should trigger. The runner walks the timeline, emits events, and updates the simulated topology state.

**Why scripted.** Real exploitation makes the project unsafe to demo, unsafe to run on a laptop, unsafe to share publicly, and impossible to make deterministic. Scripted attacks are reproducible, comparable, versionable, and *teachable* — the exact properties that make Traceveil worth building. The realism that matters is in the *shape* of the events (timing, sequence, telemetry signature), not in whether bytes actually crossed a wire.

**The realism contract.** A scripted attack must be indistinguishable from a real one at the level of *what the defender sees*. Event names, MITRE codes, timing, propagation order, detection signatures — all real. The only thing that's simulated is the underlying side effect.

**Determinism is the unlock.** Because scenarios are deterministic, a detection engineer can edit a rule, re-run the scenario, and get a clean diff: *the rule used to fire at T+8.2s, now it fires at T+6.1s, and no false positives.* That diff is the reason this project is interesting to build.

**MITRE-native.** Every step in every scenario is tagged with an ATT&CK technique. Every detection is tagged with techniques it claims to catch. The product's mental model is MITRE, not a proprietary taxonomy.

---

## 10. Incident Replay Philosophy

Replay is not a feature. It is the medium.

Most security tooling treats time as a filter on a search bar. Traceveil treats time as a **scrubber on a movie**. The distinction is not cosmetic — it changes what the operator can do.

**The replay contract.** For any past run, at any time *t* within that run, the system can reconstruct exactly what was happening: which nodes were compromised, which attacker steps were in flight, which detections had fired, which had not. Dragging the playhead to *t* shows that state on the same canvas the operator saw live.

**Replay is deterministic and authoritative.** A replay is not an approximation. It is a fold of every event ever stored for that run. The frame at *t = 47.3s* is the same byte-for-byte every time you scrub there.

**Replay enables three things the original live view cannot:**

1. **Slow it down.** Live, the attack happened in 90 seconds. In replay, the operator can spend 10 minutes at one moment.
2. **Step backwards.** "What was the state right before that detection fired?" is one drag away.
3. **Share a moment.** A replay is a URL plus a timestamp. A team can review the same incident at the same instant.

**Replay is also the test harness.** A new detection rule, run against past scenarios in replay mode, tells you immediately whether it would have caught past incidents. Replay turns Traceveil into a regression suite for defenders.

---

## 11. Infrastructure Visualization Philosophy

The topology canvas is not a sidebar. It is the home screen.

**The graph is the project's center of gravity.** Every other panel — event stream, scorecard, timeline — orbits the canvas and annotates it. The operator's mental model of the incident is built on the graph, not on a list of rows.

**Visual encoding carries meaning.**

- **Nodes** encode service type, health, and compromise state. The compromise ring around a node *fills clockwise* over the actual duration of the attack step, so the user develops a felt sense of attack speed.
- **Edges** encode communication relationships. When an attack traverses an edge, the edge brightens and emits a single particle in the direction of travel — a one-second visual cue that an action just happened *there, on that link*.
- **Layers** can be toggled on top: attack path, detection coverage heat, identity flow (post-MVP). Layers add information without rearranging the canvas.

**The canvas is stable.** Layout is computed once and then frozen. Spatial memory is preserved across runs. If a user remembers "the database is in the lower-right," that fact is true tomorrow.

**The animation budget is not decorative.** Motion is reserved for moments that *mean* something — a compromise, a detection, a traversal. Idle states are still. This is what separates a cinematic feel from a noisy one.

**Why visual.** Reading a logs page tells you that the database was compromised at 14:23:11. Watching it happen on the graph tells you *that the attacker reached the database via the worker, which means the API → worker boundary was the failure point.* Visualization shifts the user from "what happened" to "why it was possible."

---

## 12. Role of DevOps in the Project

DevOps in Traceveil is **how the project is shipped**, not what the project *is*.

To be explicit:

- **Docker and containerization** exist to make Traceveil reproducibly runnable. A reviewer should clone the repo and bring the whole thing up in one command. That's the requirement.
- **Kubernetes** exists to prove the project is cloud-native and to practice modern deployment end-to-end. The MVP uses a local k3d cluster. There is no production multi-region story in scope.
- **CI/CD (GitHub Actions)** exists to keep the codebase honest — lint, test, build, push — and to demonstrate that the project is engineered, not assembled.
- **Observability (Prometheus + Grafana)** exists because a cybersecurity project should be self-observable, and because a Grafana panel during the demo signals "this is real, not a mockup."
- **Image scanning (Trivy), secrets handling, repo hygiene** exist because building a security-themed project without them would be embarrassing.

What DevOps is **explicitly not** doing in Traceveil:

- It is not the user-facing surface. The operator does not interact with kubectl.
- It is not where complexity goes. No service meshes, GitOps controllers, or Terraform modules added just to look serious.
- It is not the demo's main act. The DevOps story is a 30-second confidence check during the walkthrough; the cybersecurity story is the other three and a half minutes.

The rule: **every DevOps choice should be the simplest one that supports the cybersecurity surface, demonstrates competence, and would not be embarrassing to a senior engineer reviewing the repo.**

---

## 13. MVP Direction

The MVP is described in detail in [MVP.md](MVP.md). The short version:

- **2 weeks. Solo.** That's the budget, and it shapes every decision.
- **One screen, three modes.** Live, Replay, Detections — all built around the same topology canvas.
- **Three scenarios.** Authored as YAML, not in a UI.
- **One environment template.** Eight nodes, declared in a file. No environment creator.
- **One backend service.** A FastAPI monolith with internal modules. No microservice sprawl.
- **Real plumbing, simulated attacks.** Postgres, Redis, WebSockets — all real. Attacks are scripted. The boundary is honest.
- **A demoable end-to-end loop.** Launch → propagate → replay → scorecard, with zero manual intervention, in under 4 minutes.

The MVP's success criterion is a recorded walkthrough that makes a security-aware viewer say "wait, what is this and when can I have it?" Anything that does not serve that outcome is cut.

DevOps deliverables in the MVP are scoped to: Docker images, `docker-compose` bring-up, a working CI pipeline, a k3d-deployable Helm chart, and one Grafana dashboard. That's it. See [MVP.md](MVP.md) for the day-by-day plan.

---

## 14. Technical Direction

The stack is chosen to make the cybersecurity surface believable, not to showcase technology for its own sake.

**Frontend** — React 18, TypeScript, Vite, TailwindCSS for styling, Framer Motion for the animation layer, Cytoscape.js for the topology graph. State via Zustand, HTTP via TanStack Query, live updates via a native WebSocket.

**Backend** — Python 3.12, FastAPI, async throughout. SQLAlchemy 2.x + Alembic against PostgreSQL. Redis for pub/sub fan-out to WebSocket clients and for short-lived caches. Pydantic for every event schema crossing a boundary.

**Data** — One Postgres database. Events, runs, detections, snapshots all live there. No object storage, no time-series database, no Kafka. Volumes are small enough that a single Postgres is the right answer.

**Real-time transport** — A single WebSocket per client per run. The backend publishes domain events to a Redis channel; a thin gateway inside the FastAPI app fans them out to subscribed clients. No SSE, no long-poll fallback.

**Scenario runner** — An async Python task that walks a YAML scenario, sleeps between steps, writes events to Postgres, and publishes them to Redis. The entire "attack engine" is a few hundred lines.

**Detection engine** — Hardcoded Python predicate functions evaluated against each emitted event. A future version becomes a Sigma-rule compiler; the MVP does not need that.

**DevOps stack** — Docker (multi-stage, distroless final images), `docker-compose` for local dev, k3d + a single Helm chart for the Kubernetes story, GitHub Actions for CI, Prometheus + Grafana for the observability panel.

**Notably absent (and deliberately so for MVP)** — Kafka, RabbitMQ, Falco, Wazuh, ModSecurity, Terraform, service meshes, multi-cluster anything. These belong to the long-term direction, not to the foundation a solo engineer is building in two weeks.

---

## 15. Things I'd Like to Explore Later

None of these are MVP scope. They are the directions I'd find interesting to take Traceveil if I keep playing with it after the 2-week build.

**More scenarios.** Adding scenarios is the cheapest, highest-yield improvement. A growing library — mapped to MITRE ATT&CK, with each scenario declaring its expected detections — turns the project into a small personal regression suite for detection rules.

**Counterfactual replay.** *"What if a rule I haven't written yet had been enabled — would it have caught this run?"* Replay the same recorded events under a hypothetical rule set without re-running the scenario. This is the feature I'm most curious to build because it's the natural extension of "replay is the medium."

**Richer environments.** From a single declared 8-node topology to multi-namespace, multi-identity-provider, or hybrid (cloud + on-prem) shapes. Each is a YAML file; the renderer scales fine to ~50 nodes.

**A real Sigma compiler.** Replace the hardcoded Python predicates with a small Sigma rule compiler. This is mostly a learning exercise — a chance to understand the rule format end-to-end.

**Collaborative replay.** Two viewers sharing a replay session, bookmarks, annotations. Probably overkill for a personal project, but interesting as a real-time-systems puzzle.

Each of these is an expansion of the same three primitives — Environment, Scenario, Replay — that the MVP locks in. The foundation is to keep those primitives sharp enough that future tinkering is *composition*, not rewriting.

---

## 16. Final Project Summary

**Traceveil is an interactive cyber attack simulation and incident replay platform — built as a personal engineering project.**

It exists because I wanted a way to *experience* attacks, not just read about them, and because the intersection of cybersecurity, realtime systems, infrastructure visualization, and replay engines is a genuinely interesting design space to live inside for two weeks. It treats attacks as scripted, versioned timelines; environments as visual graphs you can watch get compromised; and replay as a first-class verb you can drag, pause, and share.

The project's center of gravity is the **topology canvas**. Its signature feature is the **replay timeline**. Its measure of success is whether the finished project is something I'm proud of, demonstrably engineered, and able to show to another security-curious engineer who comes away with the words *"that's a neat way to think about it."*

DevOps is how Traceveil ships. Cybersecurity is what Traceveil is.

The MVP — two weeks, solo, deliberately small — proves the loop end-to-end: launch a scenario, watch it propagate, replay it, see the scorecard. Whether anything beyond the MVP gets built is up to future me. The project is shaped so that growth is composition, not rewriting.

— *End of Foundation v0.3*
