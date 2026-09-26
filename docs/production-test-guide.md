# Board Vault production test guide

## Single-user group acceptance journey

- [ ] Organizer creates one group and three placeholders without registering
  the other people.
- [ ] Organizer assigns ownership and preferences, refreshes, and confirms
  the entries persist.
- [ ] Organizer records a mixed real/placeholder session and confirms names in
  group and personal history.
- [ ] Organizer sends a targeted invitation and the invitee sees the correct
  claim review after joining.
- [ ] Invitee deselects at least one ownership and preference, leaves private
  import disabled, and confirms the retained history remains linked.
- [ ] A second invitee joins as a new person and does not receive the first
  placeholder’s history.
- [ ] Owner/member/non-member checks, wrong-email claim, expired/revoked
  invitation, refresh, mobile, keyboard, and screen-reader behavior are
  recorded.

Use this checklist against the deployed production application. Use only a
disposable test group for destructive actions. Do not write passwords, tokens,
or other secrets in this file.

## Test information

Date:

Browser:

Device / OS:

Screen size:

Owner account:

Test invitee account/email:

Test group name:

## 1. Public landing page

### Step 1 — Open the production URL

Expected:

- The landing page loads without errors.
- The product clearly explains the social group/game-night purpose.
- It does not feel like a BoardGameGeek replacement.

Observed:



### Step 2 — Review the main calls to action

Expected:

- Login and invitation/private-beta actions are easy to understand.
- No placeholder links or confusing buttons exist.

Observed:



## 2. Login and onboarding

### Step 3 — Sign out

Expected:

- Sign-out completes cleanly.
- You return to a signed-out state.
- Protected navigation is no longer visible.

Observed:



### Step 4 — Sign in again

Expected:

- The transition is understandable.
- Loading state is visible and intentional.
- No faint header-only message appears.
- You understand that the account is being prepared.
- You arrive at the Dashboard.

Observed:



### Step 5 — Refresh immediately after login

Expected:

- The Dashboard remains available.
- No unexpected redirect occurs.
- No 500 errors appear in the browser console.

Observed:



### Step 6 — Check the Dashboard

Expected:

- Groups load successfully.
- Invitations, history, and upcoming sessions do not show error toasts.
- The next useful action is clear.

Observed:



## 3. New-person invitation flow

Use a disposable email address you control.

### Step 7 — Create a disposable test group

Expected:

- Group creation is simple.
- You land directly in the new group workspace.
- The workspace clearly explains the next steps.

Observed:



### Step 8 — Invite a new person by email

Expected:

- The email invitation form explains what will happen.
- The invitation is sent successfully.
- The success message is visible and understandable.

Observed:



### Step 9 — Open the invitation email while signed out

Use a private/incognito window if possible.

Expected:

- The invitation identifies Board Vault and the group context.
- The registration page explains that the person is joining a group.
- Username and password requirements are clear.
- The CAPTCHA/security check is visible and understandable.

Observed:



### Step 10 — Complete registration

Expected:

- Smart CAPTCHA can be completed.
- Form validation is understandable.
- No raw Clerk/provider error is exposed.
- The submit button shows clear progress.

Observed:



### Step 11 — Confirm the new account destination

Expected:

- The new account reaches the Dashboard.
- The invited group is visible.
- The user understands that they successfully joined the group.

Observed:



### Step 12 — Refresh after joining

Expected:

- The account remains authenticated.
- The group remains visible.
- No duplicate group membership or invitation appears.

Observed:



## 4. Existing-account invitation flow

Use another existing Board Vault account.

### Step 13 — Invite an existing account by username

Expected:

- The owner can find and invite the user.
- The invitation appears as pending.
- The invitation type is clear.

Observed:



### Step 14 — Open the recipient’s groups page

Expected:

- The pending invitation is prominent enough to notice.
- The recipient understands the consequence of accepting it.
- Accept and decline actions are clearly different.

Observed:



### Step 15 — Accept the invitation

Expected:

- Acceptance succeeds.
- The group appears in the recipient’s groups.
- Shared group context is visible.

Observed:



### Step 16 — Refresh the recipient account

Expected:

- The group remains visible.
- The invitation is no longer shown as pending.
- No duplicate invitation appears.

Observed:



### Step 17 — Test invitation decline

Create another disposable invitation and decline it.

Expected:

- A confirmation appears before declining.
- “Keep it” cancels the action.
- “Decline” removes the invitation.
- The result is clear afterward.

Observed:



## 5. Group workspace and social experience

### Step 18 — Review the group home

Expected:

- The group feels like the main social workspace.
- Members, shared games, decisions, plans, and history are easy to find.
- The page does not feel like a generic CRUD/admin page.

Observed:



### Step 19 — Add games to your personal collection

Expected:

- Adding a game is understandable.
- Duplicate games are prevented or explained.
- The difference between personal ownership and group context is clear.

Observed:



### Step 20 — Review the group library

Expected:

- You understand which games the group can already play.
- Ownership/member context is useful.
- The page does not over-focus on game-detail metadata.

Observed:



## 6. Recommendations and acquisition decisions

### Step 21 — Open recommendations for the group

Expected:

- Recommendations are clearly group-specific.
- Each recommendation explains why it was selected.
- Attendee/group context is visible.

Observed:



### Step 22 — Give feedback on a recommendation

Expected:

- Feedback is easy to understand.
- The saved result is visible.
- The feedback feels useful for future group decisions.

Observed:



### Step 23 — Review the acquisition board

Expected:

- Acquisition suggestions feel like group decisions.
- Already-owned games are excluded.
- Owner decision states are understandable.
- It does not feel like a shopping or affiliate page.

Observed:



## 7. Plan and complete a game night

### Step 24 — Schedule a session

Expected:

- Group and game context are obvious.
- Date, timezone, and notes are understandable.
- The page explains what happens next.

Observed:



### Step 25 — RSVP and manage attendance

Use both owner and member accounts.

Expected:

- RSVP actions are clear.
- Attendance status is understandable.
- Each account sees the correct social state.

Observed:



### Step 26 — Start and complete the session

Expected:

- The session lifecycle is clear.
- It is obvious which games were planned and which were actually played.
- The UI does not allow impossible participant states.

Observed:



### Step 27 — Record per-game participants

Expected:

- It is easy to mark who played each game.
- The explanation makes clear why this improves group history.
- The saved state survives navigation.

Observed:



### Step 28 — Add session feedback or notes

Expected:

- Notes and feedback are clearly associated with the game night.
- The information feels useful for remembering the session.

Observed:



## 8. History and shared memory

### Step 29 — Open group history

Expected:

- History feels like shared memory, not a generic analytics dashboard.
- Session dates, games, attendees, players, and notes are understandable.
- The group name is visible.

Observed:



### Step 30 — Refresh history

Expected:

- The completed session remains visible.
- Session and game context is consistent after refresh.
- No false empty state appears.

Observed:



### Step 31 — Compare history and recommendations

Expected:

- Previous play history is reflected consistently in the group library and recommendations.
- It is clear how history helps future group decisions.

Observed:



## 9. Recovery and error states

Use only the disposable test group for destructive actions.

### Step 32 — Test an invalid or revoked invitation

Expected:

- The error explains that the invitation is expired, used, or unavailable.
- The user receives a clear next action.
- Returning to private-beta access does not leave the page trapped in invitation mode.

Observed:



### Step 33 — Test invitation retry

Expected:

- A failed invitation preserves the entered email/username when appropriate.
- Retry is visible.
- Provider details are not exposed directly to the user.

Observed:



### Step 34 — Test unavailable group behavior

Expected:

- The user sees a clear unavailable-group message.
- The app does not show misleading empty content.
- A useful recovery path exists.

Observed:



## 10. Leave and delete flows

### Step 35 — Member leaves the disposable group

Expected:

- The consequence is explained before confirmation.
- Cancel keeps the member in the group.
- Confirming leave removes access.
- The user returns to a sensible groups state.

Observed:



### Step 36 — Owner deletes the disposable group

Only do this after all other tests are complete.

Expected:

- The danger zone is visually separate.
- The consequence is explicit.
- Cancel is the safe default.
- After deletion, the owner returns to the groups list.
- The deleted group no longer appears.

Observed:



## 11. Mobile and responsive review

Repeat the important flow at approximately 375px width.

### Step 37 — Mobile landing and login

Expected:

- No horizontal scrolling.
- Primary actions remain visible.
- Text is readable.
- Login/onboarding state is understandable.

Observed:



### Step 38 — Mobile group workspace

Expected:

- Navigation remains usable.
- Social context does not disappear.
- Cards and buttons do not overflow.
- The next action remains clear.

Observed:



### Step 39 — Mobile history and recommendations

Expected:

- History cards remain readable.
- Recommendation explanations are not hidden or truncated.
- Buttons remain easy to tap.

Observed:



## 12. Keyboard accessibility

Use only the keyboard for this section.

### Step 40 — Keyboard through login/onboarding

Expected:

- Focus is always visible.
- Focus order is logical.
- Forms can be completed without a mouse.
- Loading and error states are announced or clearly visible.

Observed:



### Step 41 — Keyboard through invitation flow

Expected:

- CAPTCHA and form controls are reachable.
- Dialogs manage focus correctly.
- Cancel actions return focus appropriately.

Observed:



### Step 42 — Keyboard through group/session/history flow

Expected:

- All important actions are reachable.
- No action requires guessing.
- Focus does not disappear after navigation or mutation.

Observed:



## Final assessment

### Critical errors

1.

2.

3.

### Confusing moments

1.

2.

3.

### Most useful parts

1.

2.

3.

### Product-direction feedback

Does the app feel focused on helping a group decide what to play, organize what it owns, and remember what it played?

Comments:



Does any part feel like it is becoming a BoardGameGeek-style catalog/details product?

Comments:



Does history feel like useful shared memory rather than generic statistics?

Comments:



Do recommendations help the group make an actual decision?

Comments:



### Final status

Landing page: PASS / PARTIAL / FAIL

Login/onboarding: PASS / PARTIAL / FAIL

New-person invitation: PASS / PARTIAL / FAIL

Existing-account invitation: PASS / PARTIAL / FAIL

Group workspace: PASS / PARTIAL / FAIL

Recommendations/acquisition: PASS / PARTIAL / FAIL

Session lifecycle: PASS / PARTIAL / FAIL

History/shared memory: PASS / PARTIAL / FAIL

Recovery/error states: PASS / PARTIAL / FAIL

Mobile: PASS / PARTIAL / FAIL

Keyboard accessibility: PASS / PARTIAL / FAIL

Overall release impression: PASS / PARTIAL / FAIL
