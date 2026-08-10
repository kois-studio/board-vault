# Product direction and decisions

## Primary persona

The first target user is the organizer or host of a recurring board-game group. They currently use chat, memory, spreadsheets, and guesswork to decide what to play.

The product must also be pleasant for group members, but the organizer is the initial activation and retention driver.

## Core job to be done

When a group is meeting, help the organizer answer:

> What can this group play tonight that fits the attendees, time, mood, and games available?

Then preserve the result so the next decision becomes easier.

## Product loop acceptance criteria

The following journey must be possible with real persisted data:

1. Create a group or accept an invitation.
2. Add at least five games to a personal collection.
3. Invite members and select the attendees for a session.
4. Specify date/time, timezone, approximate duration, and optional location.
5. Receive at least three recommendations or an honest “no suitable games” result.
6. See an explanation for every recommendation.
7. Schedule, start, complete, or cancel the session.
8. Record which games were actually played and who attended.
9. View the session in history.
10. Give a simple rating or reason for rejecting a recommendation.

## Product decisions

### Group is the primary context

Recommendations and history should be group-aware. Individual collections remain important, but the product’s most valuable data is the intersection of:

- group members;
- attendee availability;
- owned games;
- group ratings;
- previous plays;
- session constraints.

### Recommendations begin with rules

Use hard constraints followed by a transparent score. Do not require machine learning for the first release.

### Sessions are first-class

Use one consistent term in the UI and API. “Session” is recommended because it can cover both scheduled events and completed plays. If “Meet” remains in the database temporarily, expose a stable session-oriented API.

### Ratings are lightweight initially

Start with a simple post-session rating and feedback reason. Avoid building a full review network before session retention is proven.

## Non-goals for the first flagship release

- native mobile applications;
- offline synchronization;
- platform-wide competitive statistics;
- subscription billing;
- a public developer API;
- advanced AI-generated recommendations;
- venue or club management;
- complete internationalization;
- a large social feed.

## Naming decision required

Choose one brand and one vocabulary before polishing marketing or adding routes. The current repository mixes “Board Vault” and “BoardMeet.” The selected name must be used consistently in product copy, metadata, emails, and documentation.

## Product questions that must not be silently assumed

Record a decision in this document if implementation depends on it:

- Is a game recommendation based on collective ownership, organizer ownership, or either?
- Can invited non-members attend a session?
- Is a session private to the group or shareable?
- Are ratings private, group-visible, or public?
- Does “played” mean started, completed, or merely selected?
- What is the minimum data required to recommend a game?
