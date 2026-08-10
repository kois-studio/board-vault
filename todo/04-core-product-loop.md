# Core product loop workstream

## CP-001 — finish collection activation

Goal: a new user can add a small useful collection quickly.

Tasks:

- provide a clear first-five-games onboarding flow;
- make search and add states reliable;
- show ownership and collection status consistently;
- support empty, loading, and error states;
- defer full catalog/import work until the basic flow is useful.

Acceptance criteria:

- a user can add five games without leaving the primary flow;
- duplicate adds are safe and idempotent;
- the UI reflects the persisted state after refresh;
- unauthorized collection access is rejected.

## CP-002 — finish group activation

Goal: an organizer can create a group and get real members into it.

Tasks:

- define group roles and invitation lifecycle;
- make invitation acceptance/rejection real;
- send or display notification side effects;
- remove N+1 invitation/member loading where practical;
- provide useful empty states for a group with no games or members.

Acceptance criteria:

- a second account can accept an invitation;
- non-members cannot read private group data;
- owner/member roles are enforced server-side;
- group membership survives refresh and appears consistently across screens.

## CP-003 — implement explainable recommendations

Goal: recommend games for a concrete group session.

Hard filters should include:

- attendee count;
- player limits;
- estimated available time;
- ownership or availability policy;
- hidden, deleted, or unavailable games.

Initial score should consider:

- group and member ratings;
- time since last play;
- novelty;
- game duration fit;
- complexity fit;
- organizer preferences.

Acceptance criteria:

- endpoint accepts group, attendees, time, and optional preferences;
- response contains ranked games and explanation fields;
- no-result state explains which constraint prevented recommendations;
- recommendation feedback is persisted;
- scoring is deterministic and unit tested.

## CP-004 — replace the meeting flow with sessions

Goal: schedule and log a session from one coherent flow.

Tasks:

- implement one backend use case for session creation;
- persist date, time, timezone, group, organizer, attendees, and planned games;
- support scheduled, active, completed, and cancelled states;
- replace the wizard TODO submission;
- remove or hide the incomplete confirmation flow;
- ensure the upcoming page reads real data;
- allow completion with the games actually played.

Acceptance criteria:

- refreshing the browser does not lose the session;
- upcoming and history pages show the same persisted session;
- planned games can differ from actually played games;
- cancellation is visible and does not appear as completed history;
- session access is restricted to authorized group users.

## CP-005 — make history useful

Goal: history should improve future decisions.

Tasks:

- show date, attendees, games actually played, and basic outcome;
- add group-level most-played and recently-played views;
- show last-played date in recommendation context;
- allow a simple post-session rating and feedback reason;
- remove hardcoded/sample charts.

Acceptance criteria:

- every displayed statistic comes from persisted play data;
- empty history is honest and actionable;
- group and personal history permissions are enforced;
- history data can be used by recommendation scoring.

## CP-006 — repair route and state consistency

Tasks:

- remove links to nonexistent recommendation and security routes;
- replace `href="#"` placeholders with real links or remove them;
- eliminate BoardMeet/Board Vault naming inconsistency;
- reduce eager global data loading;
- avoid mutating nested signal state in place;
- centralize API loading, error, and toast behavior.

## Definition of done

The core product loop can be demonstrated with two real accounts, a real group, real games, a real recommendation, and a real completed session using a clean database.
