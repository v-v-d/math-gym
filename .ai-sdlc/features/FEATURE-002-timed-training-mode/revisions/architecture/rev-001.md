# Architecture specification

- Feature ID: FEATURE-002
- Revision: 1
- Input revisions:
  - requirements revision 2 / SHA-256: 2c47c7e39698354c83bc39999b86044ad18cd2c2ec4f45e2d04c9dec369da933
  - design revision 3 / SHA-256: e08275f6ae867003d23335c2e4afdad493ddc3e17bb50d3d96bba836f46c6960
- Author role: Architect

## Current-system findings

The application is a static Vite + TypeScript SPA with domain state kept in memory.

Current code boundaries relevant to FEATURE-002:

- `src/domain/session.ts` owns selection, active-session and result state transitions. Its current active session assumes a fixed array of 10 problems and completes on the 10th accepted answer.
- `src/app/session-factory.ts` validates the catalog, samples exactly 10 unique problems, creates a session ID and captures `startedAt` through an injected `Clock`.
- `src/app/app-controller.ts` orchestrates UI events, asks the clock for `now` only on start/submit, sends analytics, manages focus and delegates rendering.
- `src/app/app-view.ts` renders three screens (`selection`, `active`, `result`), assumes `N из 10`, and has no mode selector or timed status block.
- The project already has injectable `Clock` and `RandomSource` abstractions, so deterministic timeout/sampling tests can be added without introducing a framework.
- Existing state is memory-only and reload returns the user to the initial screen; FEATURE-002 preserves this behavior.

## Proposed design

Introduce training mode as an explicit domain concept and split fixed ordinary-session behavior from timed-session behavior while keeping one state machine and one controller.

### Domain concepts

```ts
type TrainingMode = 'ordinary' | 'timed';
type CompletionReason = 'completed_all' | 'timeout';
```

Selection state gains `selectedMode`.

Active state gains:

- `mode`;
- `deadlineAt: number | null`;
- `solvedCount` derived from accepted responses;
- a problem-source cursor/queue that can yield the next problem without a fixed 10-item session limit.

Result state gains:

- `mode`;
- `correctCount`;
- `solvedCount`;
- `completionReason`;
- `completedAt`.

Ordinary mode keeps the current semantic contract of exactly 10 tasks and no session deadline.

Timed mode has an absolute deadline `startedAt + 60_000` and completes only because of timeout.

## ADR-001 Absolute deadline is domain truth

### Decision

The timed session uses an absolute `deadlineAt`, calculated once from the injected clock when the session becomes active. UI countdown ticks are presentation-only.

### Rationale

Browser timers can be delayed or throttled. If business correctness depended on `setInterval` tick count, a backgrounded tab could effectively receive more than 60 seconds.

### Consequence

Every timed submit calls the clock and must first check `now >= deadlineAt`. Such a submit is rejected and the session transitions to timeout result without counting the pending answer.

## ADR-002 Timer scheduling stays in the controller

### Decision

Use a small browser scheduling adapter owned by the application/controller layer, not the domain:

```ts
interface Scheduler {
  setInterval(callback: () => void, ms: number): unknown;
  clearInterval(handle: unknown): void;
}
```

The controller schedules UI refreshes at approximately 250–1000 ms while timed mode is active. Every callback obtains `clock.now()` and dispatches a pure domain `tick(state, now)` transition.

### Rationale

The domain remains deterministic and testable. DOM/browser timing remains outside it.

### Failure behavior

Repeated or late callbacks after result state are no-ops. Starting another session clears the previous timer handle before a new one is registered.

## ADR-003 Timed problem source uses shuffled cycles

### Decision

At timed-session start, create a randomized queue of the entire selected-grade problem pool using Fisher-Yates semantics. Consume one problem per accepted answer. When exhausted, generate a newly shuffled cycle.

### Rationale

This implements the approved requirement: no repeat until the grade pool is exhausted, then repeats may occur in a new cycle. It also removes the fixed 10-item limit.

### Memory

Grade 1 has about 10k tasks and grade 2 has 200, already loaded statically. A copied/shuffled array of references is acceptable for this browser application. Do not duplicate problem objects.

## ADR-004 Preserve ordinary mode with compatibility branch

### Decision

Do not rewrite ordinary mode into timed semantics. Session creation returns a mode-specific session payload while shared input/response primitives remain common.

Ordinary mode:
- sample 10 unique problems;
- complete after accepted answer 10.

Timed mode:
- create first shuffled cycle;
- set deadline;
- keep producing tasks until timeout.

### Rationale

This minimizes regression risk for FEATURE-001 and makes ordinary behavior explicit in unit tests.

## State model

Recommended state shape:

```ts
type SelectionState = {
  screen: 'selection';
  selectedGrade: Grade | null;
  selectedMode: TrainingMode | null;
  error: string | null;
};

type ActiveState = {
  screen: 'active';
  mode: TrainingMode;
  grade: Grade;
  currentProblem: Problem;
  remainingProblems: readonly Problem[];
  answer: string;
  responses: readonly ResponseRecord[];
  sessionId: string;
  startedAt: number;
  deadlineAt: number | null;
  submitLocked: boolean;
};

type ResultState = {
  screen: 'result';
  mode: TrainingMode;
  grade: Grade;
  correctCount: number;
  solvedCount: number;
  completionReason: CompletionReason;
  sessionId: string;
  startedAt: number;
  completedAt: number;
};
```

`remainingProblems` contains references only. If the queue becomes empty in timed mode, refill by shuffling the catalog again before selecting the next problem.

## Domain transitions

### selectMode

Updates `selectedMode` only in selection state.

### commitOrdinarySession

Creates ordinary active state with a 10-problem queue and `deadlineAt=null`.

### commitTimedSession

Creates timed active state with `deadlineAt=startedAt+60_000` and a grade-pool queue.

### submitAnswer(state, now)

Order of checks for timed mode:

1. state must be active;
2. if `now >= deadlineAt`, call timeout completion and return `accepted=false`;
3. reject empty/locked input;
4. append response record;
5. ordinary: complete after 10th accepted response;
6. timed: select next problem and remain active.

The timeout boundary therefore has one deterministic rule: equality belongs to timeout, not acceptance.

### tick(state, now)

- ordinary or non-active state: no-op;
- timed active and `now < deadlineAt`: state unchanged;
- timed active and `now >= deadlineAt`: return timed result with counts from already accepted responses.

`tick` must be idempotent once the state is no longer active.

## Application/controller changes

`AppController` gains:

- `mode(mode: TrainingMode)` handler;
- mode-aware `start()`;
- timer handle ownership;
- `startTimedTicker()` / `stopTimedTicker()`;
- `tick()` using injected clock;
- shared `finish` handling after submit/tick transitions.

Controller invariants:

- at most one active interval;
- timer cleared on result, restart and return-to-selection;
- callbacks after completion cannot emit duplicate `session_completed` events;
- timed submit and timer callback can race in event-loop order, but both resolve through the same absolute deadline rule.

## UI/view changes

`AppView` remains a renderer over `AppState`.

### Selection

- add `MODE-SELECTOR-001` after grade selector;
- start enabled only when both grade and mode are selected;
- ordinary helper copy stays `10 примеров без ограничения времени`;
- timed helper copy is `60 секунд · решай столько, сколько успеешь`.

### Timed active

Render the approved design contract:

- `Решено: N`;
- `Осталось M:SS` with stable/tabular digits;
- existing task/answer/keypad controls;
- no `N из 10`.

Remaining seconds are computed from `Math.max(0, deadlineAt-now)` in the application/view model. The view must not mutate domain state.

### Timed result

Render:

- `Время вышло!`;
- `Правильно: X`;
- `Решено: Y`;
- optional accuracy `round(correct/solved*100)` when `solved>0`;
- `Еще раз` and `Выбрать класс и режим`.

The three approved mockups in `mockups/` are the visual contract for layout hierarchy and look-and-feel.

## Analytics contract

Extend existing allowed analytics fields without exposing expressions or entered answers.

Recommended payload additions:

- `session_started`: `mode`;
- `answer_submitted`: `mode`, existing problem number may be interpreted as accepted-answer sequence number;
- `session_completed`: `mode`, `completion_reason`, `correct_count`, `solved_count`, `duration_ms`.

For backwards compatibility, either retain `score` as an alias for `correct_count` or update tests/callers atomically. No expression text, answer value or problem ID is sent.

## Accessibility

- Mode selector uses a separate `radiogroup`.
- Countdown is visible text but not a per-second live region.
- Session announcer emits the task after an accepted answer and emits timeout result exactly once.
- Last-10-second visual treatment cannot use flashing.
- Focus after timeout moves to result heading or `Еще раз` according to one consistent rule; it must not remain on removed keypad controls.

## Security and privacy

No new network API, authentication, storage or user-provided free text is introduced.

Timer/session state remains in memory.

Analytics allowlisting remains the privacy boundary. New fields are enumerated primitives only; do not transmit entered answers or mathematical expressions.

## Failure modes

| Failure | Behavior |
|---|---|
| invalid catalog at start | existing start error, no timer starts |
| random source fails at start | existing start error, no timer starts |
| random source fails while refilling a timed cycle | technical session error, not fake timeout result |
| clock fails / returns non-finite value | technical session error, stop scheduler |
| scheduler callback delayed | next callback compares absolute clock to deadline and times out immediately |
| duplicate/late scheduler callback | domain no-op after result |
| submit at exactly deadline | answer rejected, timeout result |
| reload during timed mode | existing memory-only reset to selection |

## Observability

No backend telemetry exists. Client analytics provide product observability.

Unit tests must make timeout/edge behavior deterministic with fake clock and scheduler. CI remains `npm run verify` plus new targeted unit tests. E2E evidence should exercise visible countdown and forced timeout using controllable/fake time rather than waiting a real 60 seconds where supported.

## Compatibility and migration

No data migration, API migration or persisted-state migration is required.

Compatibility risk is concentrated in the shared `AppState`, controller callbacks and analytics payload types. Ordinary-mode regression tests are mandatory.

Generated static problem catalog format does not change.

## Rollout

This is a static SPA feature and does not require a backend rollout.

Recommended rollout sequence:

1. merge behind unreachable UI path or branch-by-abstraction if implementation is split across PRs;
2. land domain/session support and tests;
3. land UI/timer integration and E2E;
4. expose the mode selector only once the full timed path is verified.

If partial changes reach trunk, the existing ordinary UI remains the keystone interface until timed mode is complete.

## Rollback

Rollback is a normal static application code rollback. No persisted state or schema needs reversal.

If only the timed UI must be disabled, remove/hide the `На время` selector path while leaving shared refactors intact, provided ordinary regression verification remains green.

## Alternatives considered

### ALT-001 Complete timed mode after a pre-generated large list

Rejected. There is no reliable upper bound on problems a user can submit in 60 seconds, and an arbitrary large list complicates correctness.

### ALT-002 Use setInterval tick count as timer truth

Rejected due to browser throttling and background-tab drift.

### ALT-003 Separate timed state machine/controller

Rejected for the first implementation because input, scoring and rendering semantics are mostly shared. Mode-specific branches in one explicit domain model are smaller and easier to regression-test. Reconsider if modes diverge significantly later.

## Implementation stages

### STAGE-001 Domain model and deterministic timing

Goal: introduce mode-aware state and pure timeout/problem-cycle behavior without exposing timed mode in UI.

#### TASK-001 Mode-aware session state

- Requirement links: FR-001, FR-002, FR-006, FR-007, FR-008, FR-010
- Allowed scope: `src/domain/session.ts`, domain unit tests
- Dependencies: none
- Acceptance criteria:
  - ordinary remains 10 accepted answers;
  - timed does not complete on answer count;
  - timeout at `now >= deadlineAt` produces counts from accepted responses only;
  - post-timeout submit cannot change result.
- Required checks: unit tests, typecheck
- Risk: high — shared FEATURE-001 state machine
- Associated tests: TEST-001..TEST-006

#### TASK-002 Timed problem-cycle factory

- Requirement links: FR-002, FR-003, FR-004
- Allowed scope: `src/app/session-factory.ts`, `src/domain/random.ts` only if required, unit tests
- Dependencies: TASK-001 contract
- Acceptance criteria:
  - ordinary still samples exactly 10;
  - timed starts with an entire shuffled grade pool by reference;
  - no repeat before cycle exhaustion;
  - cycle refill is deterministic under injected random source.
- Required checks: unit tests, catalog tests, typecheck
- Risk: medium
- Associated tests: TEST-007..TEST-010

#### E2E-001 Domain join contract

- Requirement links: FR-002, FR-006, FR-007, FR-010
- Purpose: a test harness proves ordinary completion at 10 and timed completion only on deadline with no pending-answer credit.
- Dependencies: TASK-001, TASK-002

### STAGE-002 Controller, timer lifecycle and analytics

Goal: integrate deterministic domain timing into browser orchestration.

#### TASK-003 Scheduler/timer lifecycle

- Requirement links: FR-004, FR-006, FR-007, FR-009
- Allowed scope: `src/app/app-controller.ts`, new small scheduler adapter, controller tests
- Dependencies: STAGE-001 verified
- Acceptance criteria:
  - one timer at most;
  - timeout auto-transition without user action;
  - timer cleared on result/repeat/choose/reload lifecycle;
  - delayed callback uses absolute deadline;
  - no duplicate completion side effects.
- Required checks: fake-clock/scheduler tests, typecheck
- Risk: high — race/boundary behavior
- Associated tests: TEST-011..TEST-015

#### TASK-004 Analytics mode/completion payloads

- Requirement links: FR-012
- Allowed scope: `src/analytics/metrika.ts`, controller analytics calls, analytics unit tests
- Dependencies: TASK-003
- Acceptance criteria:
  - mode and completion reason are allowlisted;
  - correct/solved counts emitted on completion;
  - answer/expression remain excluded;
  - ordinary analytics remain valid.
- Required checks: analytics unit tests
- Risk: medium — existing privacy allowlist
- Associated tests: TEST-016..TEST-018

#### E2E-002 Automatic timeout orchestration

- Requirement links: FR-004, FR-006, FR-007
- Purpose: controllable time proves automatic transition and exactly-once completion side effects.
- Dependencies: TASK-003, TASK-004

### STAGE-003 Approved UI and full flow

Goal: expose the approved timed experience and visual contract.

#### TASK-005 Mode selector and timed exercise UI

- Requirement links: FR-001, FR-005, FR-010, FR-011
- UX links: SCREEN-001, SCREEN-002, MODE-SELECTOR-001, TIMER-001, SOLVED-COUNTER-001
- Allowed scope: `src/app/app-view.ts`, `src/styles.css`, controller handler wiring, visual assets
- Dependencies: STAGE-002 verified
- Acceptance criteria:
  - user selects grade and mode;
  - timed screen matches approved hierarchy and copy;
  - visible countdown/solved count update without live-region spam;
  - ordinary `N из 10` remains unchanged.
- Required checks: unit/DOM tests, typecheck, responsive visual check
- Risk: medium
- Associated tests: TEST-019..TEST-023, E2E-003

#### TASK-006 Timed result and repeat navigation

- Requirement links: FR-008, FR-009, FR-011
- UX links: SCREEN-003, RESULT-STATS-001
- Allowed scope: `src/app/app-view.ts`, `src/styles.css`, announcer/focus code as needed
- Dependencies: TASK-005
- Acceptance criteria:
  - timeout result shows mandatory correct/solved metrics;
  - optional accuracy never replaces mandatory metrics;
  - repeat starts new timed session same grade;
  - choose class/mode resets selection;
  - focus and announcement occur once.
- Required checks: DOM/accessibility tests, typecheck, responsive visual check
- Risk: medium
- Associated tests: TEST-024..TEST-028, E2E-004

#### E2E-003 Timed happy path and visual contract

- Requirement links: FR-001, FR-002, FR-005, FR-010, FR-011
- Purpose: select timed mode, submit >10 answers under fake time, verify continued exercise and approved screen hierarchy.
- Dependencies: TASK-005

#### E2E-004 Timeout result/repeat

- Requirement links: FR-006, FR-007, FR-008, FR-009
- Purpose: force deadline with pending input, assert it is ignored, verify result counts and restart navigation.
- Dependencies: TASK-006

## Dependency DAG

```text
TASK-001 ─┐
          ├─> E2E-001 -> verify STAGE-001
TASK-002 ─┘

STAGE-001 -> TASK-003 -> TASK-004 -> E2E-002 -> verify STAGE-002

STAGE-002 -> TASK-005 -> E2E-003
                     └-> TASK-006 -> E2E-004 -> verify STAGE-003
```

No implementation stage may start before its dependency stage is verified.

## Risks

- RISK-001 High: timeout/submit boundary may double-complete or credit a late answer if domain ordering is wrong.
- RISK-002 High: shared session refactor may regress ordinary FEATURE-001 behavior.
- RISK-003 Medium: timer callbacks can leak across repeat/navigation without strict cleanup.
- RISK-004 Medium: shuffled-cycle refill can accidentally repeat early if queue ownership is mutated incorrectly.
- RISK-005 Medium: approved mockups are richer than the current UI; decorative implementation must not compromise accessibility or core behavior.
- RISK-006 Low: optional accuracy may create product ambiguity unless kept visually secondary.

## Open questions

- Q-ARCH-001: Confirm the architecture may treat `Точность: Z%` as optional presentation derived from `correctCount/solvedCount`, not persisted domain state.
- Q-ARCH-002: Confirm timer UI refresh around 250–1000 ms is acceptable while the domain deadline remains exact; implementation may choose 250 ms for smoother visible second changes or 1000 ms for simpler scheduling.
- Q-ARCH-003: Confirm decorative assets from approved mockups may be implemented with CSS/vector approximations where exact generated artwork is not practical, while preserving the approved layout hierarchy and visual tone.
