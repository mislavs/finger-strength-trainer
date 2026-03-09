# Tindeq Trainer -- Iterative Delivery Plan

## Assumptions

1. **Greenfield** -- only [docs/PRD.md](../docs/PRD.md) and [docs/TECHNICAL.md](../docs/TECHNICAL.md) exist; no code yet.
2. Architecture adapts the TECHNICAL.md's 2-project layout (`Core` / `Api`) to **4-project Clean Architecture** per the dotnet-backend skill: Domain, Infrastructure, Application, Api.
3. **MediatR/CQRS** for REST-based Protocol and Session features. Real-time BLE and session management uses regular DI services invoked from the SignalR hub -- MediatR is not a good fit for long-running stateful operations. **The training timer is frontend-owned** -- the backend does not run a timer; it reacts to phase-change signals from the frontend for BLE coordination and data management.
4. **SQLite** for persistence. Integration tests use EF Core SQLite in-memory provider (no Testcontainers/Docker needed, deviating from the dotnet-backend skill's PostgreSQL pattern).
5. Frontend follows the **scaffolding-frontend-spa** skill stack: Vite, React, TypeScript, TanStack Query, Tailwind, shadcn/ui, react-router-dom, react-hook-form + zod.
6. **.NET 10** targeting `net10.0-windows10.0.19041.0` for WinRT Bluetooth APIs.
7. BLE requires a physical Tindeq Progressor. A **mock BLE service** is provided for development/testing without hardware.

## Adapted Project Structure

Mapping TECHNICAL.md classes to Clean Architecture layers. Backend and frontend live in separate root folders:

```
backend/
  TindeqTrainer.slnx
  src/
    TindeqTrainer.Domain/
      Entities/          Protocol, Session, SessionSample
      ValueObjects/      ForceSample
      Enums/             SessionType, TimerPhase
      Constants/         ProgressorCommands (opcodes), ProgressorUuids
    TindeqTrainer.Infrastructure/
      Persistence/       AppDbContext, entity configs
      Bluetooth/         IProgressorService, ProgressorService (WinRT BLE)
    TindeqTrainer.Application/
      Features/
        Protocols/       CRUD commands/queries (MediatR)
        Sessions/        List/Get/Delete/Export queries (MediatR)
      Services/          TrainingSessionService, LiveStreamService
      Common/Behaviors/  ValidationBehavior
    TindeqTrainer.Api/
      Hubs/              TrainingHub (SignalR -- thin, delegates to Application services)
      Endpoints/         ProtocolEndpoints, SessionEndpoints, DeviceEndpoints
      Program.cs
  tests/
    TindeqTrainer.Domain.Tests/
    TindeqTrainer.Application.Tests/   Validators (unit) + handlers (integration)
    TindeqTrainer.Architecture.Tests/  Dependency rule enforcement

frontend/                              React SPA (Vite + TypeScript)
  src/
    components/ui/    shadcn/ui primitives
    components/       shared app components (layouts, nav, error boundary)
    hooks/            shared hooks
    lib/              utilities, API client, config
    features/
      protocols/      protocol management UI
      live-stream/    live stream page + chart
      repeater/       repeater training page
      history/        session history browser
    App.tsx
    main.tsx
```

---

## Step 1: Solution Foundation (DONE)

- **Goal:** Scaffold the Clean Architecture solution with domain models, EF Core + SQLite persistence, and a buildable/testable baseline.
- **Scope:**
  - Create `backend/` and `frontend/` root folders
  - Create `backend/TindeqTrainer.slnx` (XML-based solution format) with Domain, Infrastructure, Application, Api projects and project references per dotnet-backend skill
  - Add `.gitignore`, `backend/global.json` (pin .NET 10)
  - Domain: all model records/enums from TECHNICAL.md (`ForceSample`, `ProtocolDefinition`, `SetStats`, `HandData`, `SessionSummary`, `TrainingSessionRecord`, `LiveStreamRecord`, `TimerState`, `TimerPhase`, `SessionType`), BLE constants (`ProgressorCommands`, `ProgressorUuids`)
  - Infrastructure: `AppDbContext` with `DbSet<Protocol>`, `DbSet<Session>`, `DbSet<SessionSample>` entity configurations, SQLite connection string, `IServiceCollectionExtensions.AddInfrastructure()`
  - Application: `IServiceCollectionExtensions.AddApplication()` with MediatR + FluentValidation registration, `ValidationBehavior`
  - Api: `Program.cs` wiring DI, SignalR, SPA serving (placeholder), Swagger
  - Default protocol seeding (3 built-in protocols from PRD)
- **Tests:**
  - Architecture test: Domain must not reference Infrastructure or Application
  - Domain model unit tests (e.g., `ProtocolDefinition` derived target weight calculation)
- **Verification:** `dotnet build` and `dotnet test` pass
- **Exit Criteria:** Solution compiles, architecture test passes, SQLite DB can be created via EF migration

---

## Step 2: Protocol Management (Full-Stack Vertical Slice) (DONE)

- **Goal:** Deliver end-to-end protocol CRUD -- the first feature users can interact with in the browser.
- **Scope:**
  - **Application layer:** MediatR commands/queries following dotnet-backend feature pattern:
    - `CreateProtocol` command + validator
    - `UpdateProtocol` command + validator
    - `DeleteProtocol` command
    - `GetProtocol` query
    - `ListProtocols` query
  - **Api layer:** `ProtocolEndpoints` (minimal API with typed results per dotnet-backend skill pattern)
  - **Frontend scaffold** (in `frontend/`): Vite + React + TypeScript + Tailwind + shadcn/ui per scaffolding-frontend-spa skill
    - Folder structure: `frontend/src/features/protocols/` with list, create, edit pages
    - REST API client (TanStack Query hooks: `useProtocols`, `useCreateProtocol`, etc.)
    - `react-hook-form` + `zod` for protocol configuration form
    - Layout shell with navigation (Live Stream, Repeater, History tabs)
  - Configure .NET Api to serve the built SPA from `wwwroot` (copy `frontend/dist/` output to Api's `wwwroot` at build time)
- **Tests:**
  - Validator unit tests (each field rule)
  - Handler integration tests (CRUD happy path, not-found scenarios) using SQLite in-memory
  - Adapted `IntegrationTestFactory` using SQLite in-memory instead of Testcontainers
- **Verification:** `dotnet build`, `dotnet test`, launch app, navigate to protocols page, create/edit/delete a protocol
- **Exit Criteria:** User can manage protocols through the browser UI; default protocols visible on first launch

---

## Step 3: BLE Device Connection (DONE)

- **Goal:** Connect to a Tindeq Progressor via Bluetooth LE, front-loading hardware integration risk.
- **Scope:**
  - **Infrastructure:** `IProgressorService` interface + `ProgressorService` implementation:
    - Scan for Progressor devices (filter by name prefix "Progressor")
    - Auto-pick first match, connect via `BluetoothLEDevice`
    - GATT service/characteristic discovery by UUID
    - Command methods: `Tare()`, `StartMeasurement()`, `StopMeasurement()`, `GetBatteryVoltage()`, `GetFirmwareVersion()`
    - Subscribe to Data Point notifications, parse TLV responses
    - `ConnectionStatusChanged` event detection
  - **Infrastructure:** `MockProgressorService` for development without hardware (generates synthetic force data)
  - **Application:** Register BLE service in DI (select real vs. mock based on configuration)
  - **Api:** `DeviceEndpoints` (`GET /api/device/status`), SignalR `Connect`/`Disconnect`/`Tare` methods on `TrainingHub`
  - **Frontend:** `ConnectionBar` component (connection status, battery level, firmware version, tare button)
- **Tests:**
  - Unit tests for BLE notification parsing (TLV format, bulk sample extraction)
  - Unit tests for `MockProgressorService` behavior
- **Verification:** `dotnet build`, `dotnet test`; launch app with mock BLE, verify connection bar shows mock device status; optionally test with real Progressor
- **Exit Criteria:** App can connect to a Progressor (or mock), send tare command, display device status in UI
- **Implementation Summary:**
  - Added real and mock BLE implementations in `Infrastructure/Bluetooth` (`ProgressorService`, `MockProgressorService`) plus TLV parsing (`NotificationParser`)
  - Added BLE DI registration with configuration switch (`UseMockBle`)
  - Added `DeviceEndpoints` (`GET /api/device/status`) and SignalR `Connect` / `Disconnect` / `Tare` hub methods
  - Added frontend SignalR client hooks and `ConnectionBar` integration in the layout
  - Added `TindeqTrainer.Infrastructure.Tests` with unit coverage for notification parsing and mock BLE behavior
  - `IProgressorService` and `DeviceStatusDto` were placed in `TindeqTrainer.Domain/Services` to avoid project reference cycles

---

## Step 4: Live Stream Feature (DONE)

- **Goal:** Deliver the first real-time measurement feature -- free-form force monitoring with chart visualization and session persistence.
- **Scope:**
  - **Application:** `LiveStreamService`:
    - Manages sample collection (full 80 Hz in-memory buffer)
    - Sample decimation for frontend display (~10 samples/sec via averaging)
    - Flush timer (100ms interval, drain `ConcurrentQueue`, push via callback)
    - `Start()` / `Stop()` / `Save()` / `Discard()` lifecycle
    - Builds `LiveStreamRecord` with peak/avg/duration on stop
  - **Infrastructure:** `SessionRepository` -- save `LiveStreamRecord` to SQLite (session + samples)
  - **Api `TrainingHub`:** Wire `StartLiveStream`, `StopLiveStream`, `SaveLiveStream`, `DiscardLiveStream` client-to-server methods; push `ForceSamples` and `LiveStreamStopped` server-to-client events
  - **Frontend:**
    - `LiveStreamPage` with start/stop button
    - `ForceChart` component (real-time rolling-window chart using uPlot)
    - Live stats display: current force, peak force, duration
    - Save/discard dialog after stopping
    - SignalR client: `useForceSamples` hook subscribing to `ForceSamples` event
- **Tests:**
  - Unit tests for `LiveStreamService` (sample accumulation, decimation, peak/avg calculation)
  - Integration test: save live stream session, verify retrieval from DB
- **Verification:** `dotnet build`, `dotnet test`; launch app with mock BLE, start live stream, see real-time chart, stop, save session
- **Exit Criteria:** User can start a live stream, see real-time force data on a chart, stop and save the recording

---

## Step 5: Session History (DONE)

- **Goal:** Users can browse, view, and export past sessions (live stream recordings saved in Step 4 become visible here).
- **Scope:**
  - **Application:** MediatR queries:
    - `ListSessions` query (returns `SessionSummary[]` with date, type, protocol name, stats, is_complete)
    - `GetSession` query (returns full session with all samples)
    - `DeleteSession` command
    - `ExportSessionCsv` query (generates CSV: `hand,set,timestamp_s,weight_kg`)
  - **Api:** `SessionEndpoints` (minimal API for all 4 REST endpoints from TECHNICAL.md)
  - **Frontend:**
    - `HistoryPage` with `SessionList` (browsable list with date, protocol name, summary stats)
    - `SessionDetail` page (full force-time curve using uPlot, session metadata)
    - Delete confirmation dialog
    - CSV export download button
    - Live stream sessions tagged as "Live Stream", incomplete sessions marked
- **Tests:**
  - Validator unit tests
  - Handler integration tests (list, get, delete, export with seeded data)
- **Verification:** `dotnet build`, `dotnet test`; launch app, view previously saved live stream sessions, drill into detail view, export CSV, delete a session
- **Exit Criteria:** Session history is fully browsable; CSV export produces correct format

---

## Step 6: Timer State Machine (Frontend)

- **Goal:** Implement the work/rest/countdown/hand-switch timer as a frontend feature, giving users visible phase-driven countdowns for repeater training.
- **Scope:**
  - **Protocol model update** (extends the existing `Protocol` entity from Step 2):
    - Rename `SetsPerHand` -> `RepsPerSet` (number of work/rest cycles per hand per set)
    - Add `NumberOfSets` field (int, number of sets, default 1)
    - Add `SetRestSeconds` field (double, rest between sets, e.g., 240 for 4 minutes)
    - Update backend: entity, Create/Update commands + validators, default protocol seeds (existing protocols get `NumberOfSets=1`, `SetRestSeconds=0`)
    - Update frontend: protocol form (new fields for sets, set rest), zod schema, API types
  - **Frontend timer engine** (`features/repeater/timer-machine.ts`):
    - Pure TypeScript class, no React dependency -- independently testable
    - State machine phases: `Idle`, `Countdown`, `Work`, `Rest`, `HandSwitch`, `SetRest`, `Paused`, `Done`
    - Flow per set: `[Work -> Rest]×(reps-1) -> Work` for hand 1 -> `HandSwitch` -> same for hand 2; then `SetRest` between sets (none after last set)
    - Full flow example (2 sets, 3 reps): `Countdown -> Work->Rest->Work->Rest->Work -> HandSwitch -> Work->Rest->Work->Rest->Work -> SetRest -> Work->Rest->Work->Rest->Work -> HandSwitch -> Work->Rest->Work->Rest->Work -> Done`
    - `start(protocol, firstHand)`, `pause()`, `resume()`, `stop()`, `skipHandSwitch()`
    - `tick(elapsedMs)` method called from `setInterval` (~50ms), evaluates phase transitions
    - Returns `TimerState` on each tick (phase, remaining seconds, current rep, total reps, current set, total sets, current hand, hand label)
    - Fires callbacks: `onWorkStart`, `onRestStart`, `onHandSwitch`, `onSetRestStart`, `onSetRestComplete`, `onComplete` (used in Step 7 to signal backend)
    - Pause: freezes remaining seconds, records `phasePausedFrom`
    - Resume: brief countdown, then continues from frozen phase with saved remaining time
    - Last rep of each hand has no rest after it; last set has no set rest after it
  - **Frontend React hook** (`features/repeater/useTimer.ts`):
    - Wraps `TimerMachine` with `setInterval`, React state, and callback refs
    - Exposes `state`, `start()`, `pause()`, `resume()`, `stop()`, `skipHandSwitch()`
  - **Frontend `TimerDisplay` component** (`features/repeater/TimerDisplay.tsx`):
    - Phase label with color coding (green Work/"PULL", red Rest/"REST", amber Countdown, blue HandSwitch/"SWITCH HANDS", orange SetRest/"SET REST", gray Paused)
    - Large countdown display (remaining seconds)
    - Rep counter: "Rep {current} of {total}"
    - Set counter: "Set {current} of {total}"
    - Hand indicator: "{handLabel}"
  - **Frontend types** (`features/repeater/models.ts`):
    - `TimerPhase` enum (including `SetRest`), `TimerState` interface (with `currentRep`, `totalReps`, `currentSet`, `totalSets`), `TimerCallbacks` interface
  - **`RepeaterPage`**: Replace placeholder with protocol selector + hand selector + timer UI. User can select a protocol, start the timer, and watch it count through all phases including set rest (no BLE integration yet).
- **Tests:**
  - **Extensive Vitest unit tests** for `TimerMachine` (using manual `tick()` calls, no real timers):
    - Normal flow: full cycle through reps, hand switch, set rest, next set, done
    - Single-rep protocol (no rest between reps)
    - Multi-set protocol (correct set rest between sets, none after last)
    - Pause during each phase (including SetRest), resume correctly
    - Skip hand switch
    - Stop/abort at various phases
    - Callback invocations verified (`onWorkStart`, `onRestStart`, `onHandSwitch`, `onSetRestStart`, `onSetRestComplete`, `onComplete`)
    - Edge cases: single rep, single set, `countdownSeconds = 0`, `setRestSeconds = 0`
  - Backend: validator unit tests for new/renamed protocol fields
- **Verification:** `npm run build`, `npm test`, `dotnet build`, `dotnet test`; launch app, navigate to Repeater, select a protocol, start timer, watch reps/sets/hand switches cycle
- **Exit Criteria:** User can start a repeater timer in the browser, watch reps/sets/hand switches cycle with accurate countdowns; all tests pass

---

## Step 7: Repeater Training (Full Vertical Slice) (DONE)

- **Goal:** Deliver the core training feature -- connecting the frontend timer to BLE measurement and session persistence for structured repeater sessions with real-time force feedback.
- **Scope:**
  - **Application:** `TrainingSessionService` (reactive -- no timer, responds to frontend phase signals):
    - `StartTraining(protocolId)`: load protocol, tare, start BLE measurement, begin buffering samples
    - `WorkStarted(set, rep, hand)`: mark rep start boundary in sample buffer
    - `WorkEnded(set, rep, hand)`: compute `SetStats` for the completed rep (avg force, peak force, % time above target), push `RepCompleted` event to frontend. BLE measurement continues during rep rest.
    - `HandSwitch()`: stop BLE measurement
    - `HandSwitchComplete()`: tare, restart BLE measurement for new hand
    - `SetRestStarted()`: stop BLE measurement for the long rest between sets
    - `SetRestComplete()`: tare, restart BLE measurement for the next set
    - `PauseTraining()`: stop BLE measurement
    - `ResumeTraining()`: tare, restart BLE measurement
    - `CompleteTraining()`: build `TrainingSessionRecord` (IsComplete=true), persist to SQLite, push `SessionComplete` event
    - `AbortTraining()`: stop BLE, build partial `TrainingSessionRecord` (IsComplete=false), push `TrainingAborted` event
    - `SaveAbortedTraining()` / `DiscardAbortedTraining()`: persist or discard partial session
    - In-memory sample collection per hand, force sample decimation for real-time chart (~10/sec push to frontend)
  - **Api `TrainingHub`:** Wire all commands as hub methods; push `RepCompleted`, `SessionComplete`, `TrainingAborted`, `ForceSamples` events
  - **Frontend `RepeaterPage` enhancement** (timer already working from Step 6):
    - Connect `useTimer` callbacks to backend via SignalR:
      - `onWorkStart(set, rep, hand)` -> invoke `WorkStarted`
      - `onRestStart(set, rep, hand)` -> invoke `WorkEnded` (BLE measurement stays running during rep rest)
      - `onHandSwitch` -> invoke `HandSwitch`; on skip/expire -> invoke `HandSwitchComplete`
      - `onSetRestStart` -> invoke `SetRestStarted`
      - `onSetRestComplete` -> invoke `SetRestComplete`
      - `onComplete` -> invoke `CompleteTraining`
      - pause/resume/abort -> invoke corresponding hub methods
    - Training UI:
      - Work phase: force chart with horizontal target force line, "PULL" label (green), countdown, current/peak force, rep counter, set counter, hand indicator
      - Rest phase: "REST" label (red), countdown, last rep summary; target force line hidden
      - Set rest phase: "SET REST" label, long countdown (e.g., 4:00), force chart hidden
      - Hand switch: countdown with skip button, "Set up [hand]" prompt
      - Pause overlay
    - Post-session summary: per-hand stats table (avg force per rep, peak, % above target), full force-time curve
- **Tests:**
  - Unit tests for `TrainingSessionService` (uses mock `IProgressorService`)
  - Unit tests for `SetStats` calculation (average, peak, % time above target)
  - Integration test: complete a training session end-to-end (mock BLE), verify session persisted with correct stats
- **Verification:** `dotnet build`, `dotnet test`, `npm run build`, `npm test`; launch app with mock BLE, start a repeater session, observe phase transitions, complete session, view summary
- **Exit Criteria:** User can run a full repeater session (both hands, multiple sets), see real-time feedback with target force during work, view post-session summary; pause/resume and abort/save work correctly

---

## Step 8: Audio Cues

- **Goal:** Add audio feedback for phase transitions so the user can train without watching the screen.
- **Scope:**
  - **Audio cues** (frontend-driven -- timer callbacks trigger audio directly in the browser):
    - Sounds: "beep" (countdown tick), "go" (work start), "rest" (rest start), "done" (session complete)
    - Protocol `AudioCues` and `CountdownBeeps` flags control which sounds play
    - No backend involvement -- audio is a pure frontend concern
- **Tests:**
  - Vitest tests for audio cue trigger conditions (respect protocol flags)
  - Manual testing: audio playback
- **Verification:** `npm run build`, `npm test`; launch app, verify audio plays on transitions
- **Exit Criteria:** Audio cues play correctly on phase transitions, respecting protocol flags

---

## Step 9: BLE Connection Resilience

- **Goal:** Handle BLE disconnections gracefully during training with automatic reconnection.
- **Scope:**
  - **BLE reconnection:**
    - Backend detects disconnect via `ConnectionStatusChanged`, notifies frontend (`ConnectionLost` SignalR event)
    - Frontend pauses its own timer on `ConnectionLost`
    - Backend retries connection every 2s for up to 30s
    - On success: notify frontend (`Reconnected`), frontend resumes timer
    - On failure: prompt user to abort
- **Tests:**
  - Unit tests for reconnection retry logic (backend)
- **Verification:** `dotnet build`, `dotnet test`; simulate BLE disconnect during training, verify auto-pause and reconnect flow
- **Exit Criteria:** App handles BLE disconnection gracefully; training auto-pauses and resumes on reconnection

---

## Step 10: Polish

- **Goal:** Final UX polish and robustness improvements across the app.
- **Scope:**
  - Connection loss during training (auto-pause + reconnect flow end-to-end verification)
  - Hand switch skip UX verification
  - Incomplete session indicator in history list
  - Error boundaries and loading states
- **Tests:**
  - Manual end-to-end verification of all flows
- **Verification:** `dotnet build`, `dotnet test`, `npm run build`, `npm test`; full walkthrough of all features
- **Exit Criteria:** All PRD features implemented; app is robust and polished

---

## Cross-Step Risks and Mitigations

- **BLE API availability:** WinRT Bluetooth APIs require `net10.0-windows10.0.19041.0` TFM. If APIs are unavailable or behave unexpectedly, the mock service allows continued development. Mitigated by front-loading BLE work in Step 3.
- **Real-time chart performance:** 80 Hz data via SignalR could cause rendering jank. Mitigated by server-side decimation (~10 samples/sec) and using uPlot (lightweight, canvas-based). Monitor in Step 4.
- **Frontend timer drift:** Browser `setInterval` may drift under heavy load or if the tab loses focus. For a training app used in the foreground, sub-100ms precision is sufficient. Device-embedded timestamps (microseconds) provide authoritative timing for force samples, so timer drift does not affect data integrity.
- **SignalR backpressure:** High-frequency pushes may overwhelm slow clients. Mitigated by batching (100ms flush intervals) and configuring SignalR transport buffer sizes. Timer is now frontend-only, eliminating ~10 tick pushes/sec.
- **SQLite concurrent access:** Single-writer, multiple-reader. Not an issue for this single-user desktop app.

## Final Validation Checklist

- [ ] `dotnet build` succeeds with zero warnings
- [ ] `dotnet test` -- all unit and integration tests pass
- [ ] Architecture test enforces dependency rule
- [ ] App launches, serves SPA on localhost
- [ ] Can connect to Progressor (or mock), tare, see battery/firmware
- [ ] Live Stream: start, see real-time chart, stop, save, view in history
- [ ] Repeater: configure protocol, run full session (both hands), pause/resume, abort/save, view summary
- [ ] Session History: browse, drill into detail, export CSV, delete
- [ ] Protocol Management: create, edit, delete protocols; defaults present
- [ ] Audio cues play on transitions (respecting protocol flags)
- [ ] BLE reconnection works during training
