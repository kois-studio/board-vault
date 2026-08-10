# Board Vault master brief

**Document role:** product and technical direction for every agent.

**Current assessment:** promising foundation, not launch-ready, and too broad for the current level of completion.

## Product thesis

Board Vault should become the shared memory and decision layer for recurring tabletop groups.

The flagship promise is:

> Given this group, these attendees, this amount of time, and the games they can actually play, recommend the best next game and make it easy to record what happened.

The collection is important input data. It is not the final product value by itself.

## Current reality

The repository currently contains:

- a substantial NestJS API and Angular application;
- authentication, collection, groups, reviews, wishlist, proposals, and admin surfaces;
- partial meeting and play-history flows;
- placeholder recommendation and statistics experiences;
- inconsistent API authorization;
- no reliable migration system;
- almost no meaningful automated coverage;
- marketing claims that exceed the implemented product.

The strongest existing slice is collection management. The most important unfinished slice is session planning and logging.

## Strategic decision

Focus the first flagship release on one recurring gaming group and one organizer/host persona.

The release must make this journey work end to end:

```text
Create or join a group
  → add a few owned games
  → invite/select attendees
  → receive explainable recommendations
  → schedule or start a session
  → record games actually played
  → view group history and feedback
```

Everything else is secondary until that loop is reliable and useful.

## Priority order

### P0 — safety and data truth

1. Close privilege escalation and object-level authorization gaps.
2. Activate strict request validation and harden authentication flows.
3. Reconcile the real Turso schema with code and create versioned migrations.
4. Establish the canonical session model.

### P1 — flagship product loop

1. Implement one atomic session creation/logging use case.
2. Implement deterministic, explainable recommendations.
3. Replace hardcoded play screens with real upcoming sessions and history.
4. Add feedback and basic group statistics from real session data.

### P2 — delivery quality

1. Add authorization, integration, and core journey tests.
2. Add CI, reproducible dependency installation, health checks, and observability.
3. Introduce shared API contracts and reduce client/server drift.
4. Fix responsive, accessibility, timezone, loading, and error behavior.

### P3 — expansion

Consider imports, richer preferences, recurring events, clubs, billing, public API, mobile applications, and localization only after the core loop demonstrates repeat usage.

## Non-negotiable constraints

- Ordinary users must never be able to modify authorization or verification state.
- Authorization must be checked against the target object, not just the route user ID.
- Sessions must distinguish planned games from games actually played.
- Recommendations must explain why a game was selected.
- Marketing must describe implemented behavior accurately.
- Database changes must be reproducible through migrations.
- Every completed feature must have verification evidence.

## Success definition

The first flagship release is successful when a new group can reach a useful recommendation and record a real session without support, and a returning group gets better value from its accumulated history.

The product should optimize for:

- time from signup to first useful recommendation;
- percentage of invited members who join a group;
- percentage of scheduled sessions that are completed and logged;
- repeat sessions per group;
- recommendation acceptance and feedback;
- weekly returning groups.
