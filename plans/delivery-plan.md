# Tindeq Trainer -- Iterative Delivery Plan

## Assumptions

1. **Greenfield** -- only [docs/PRD.md](../docs/PRD.md) and [docs/TECHNICAL.md](../docs/TECHNICAL.md) exist; no code yet.
2. Architecture adapts the TECHNICAL.md's 2-project layout (`Core` / `Api`) to **4-project Clean Architecture** per the dotnet-backend skill: Domain, Infrastructure, Application, Api.
3. **MediatR/CQRS** for REST-based Protocol and Session features. Real-time training orchestration (BLE, timer, training sessions) uses regular DI services invoked from the SignalR hub -- MediatR is not a good fit for long-running stateful operations.
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
      Services/          TimerService, TrainingOrchestrator, LiveStreamService
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

## Step 2: Protocol Management (Full-Stack Vertical Slice)

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

## Step 3: BLE Device Connection

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

---

## Step 4: Live Stream Feature

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

## Step 5: Session History

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

## Step 6: Timer State Machine

- **Goal:** Implement the work/rest/countdown/hand-switch state machine that drives repeater training.
- **Scope:**
  - **Application:** `TimerService`:
    - State machine: `Idle -> Countdown -> Work -> Rest -> ... -> HandSwitch -> Countdown -> Work -> ... -> Done`
    - Internal tick at ~50ms, evaluates phase transitions
    - `Start(protocol, firstHand)`, `Pause()`, `Resume()`, `Stop()`, `SkipHandSwitch()`
    - Emits `TimerState` on each tick (phase, remaining seconds, current set, total sets, current hand, hand label)
    - Emits domain events: `OnWorkStart`, `OnRestStart`, `OnHandSwitch`, `OnComplete`
    - Pause: freezes timer, records `PhasePausedFrom`
    - Resume: resets to brief countdown, then continues from frozen phase
    - Last set of each hand has no rest after it
  - **Api `TrainingHub`:** Wire throttled `TimerTick` push (~10/sec)
  - **Frontend:** `TimerDisplay` component (phase label, countdown, set counter) -- can be tested standalone with mock data
- **Tests:**
  - **Extensive unit tests** for all state transitions:
    - Normal flow through all phases
    - Pause during each phase, resume correctly
    - Skip hand switch
    - Stop/abort at various phases
    - Edge cases: single set, set count boundaries
  - Unit tests for tick throttling logic
- **Verification:** `dotnet build`, `dotnet test` -- all state machine transitions validated
- **Exit Criteria:** TimerService passes comprehensive unit tests covering every phase transition and edge case

---

## Step 7: Repeater Training (Full Vertical Slice)

- **Goal:** Deliver the core training feature -- structured repeater sessions with real-time feedback, pause/resume, abort/save, and post-session summary.
- **Scope:**
  - **Application:** `TrainingOrchestrator`:
    - Coordinates `TimerService` + `IProgressorService` + `TrainingSession`
    - `TrainingSession`: in-memory sample collection per hand, `SetStats` calculation on work-phase end (avg force, peak force, % time above target)
    - Start: select protocol + first hand -> tare -> countdown -> continuous measurement
    - BLE stays measuring during rest phases (timer dictates rhythm, not BLE)
    - On `OnWorkStart`: mark set start boundary
    - On `OnRestStart`: compute `SetStats` for completed set, emit `SetCompleted`
    - On `OnHandSwitch`: stop BLE, wait/skip, tare, start BLE for hand 2
    - On `OnComplete`: build `TrainingSessionRecord` (IsComplete=true), save, emit `SessionComplete`
    - Pause: stop BLE measurement, freeze timer
    - Resume: tare, brief countdown, restart BLE, resume timer
    - Abort: stop everything, build partial `TrainingSessionRecord` (IsComplete=false), emit `TrainingAborted`, prompt save/discard
  - **Api `TrainingHub`:** Wire `StartTraining`, `PauseTraining`, `ResumeTraining`, `StopTraining`, `SaveAbortedTraining`, `DiscardAbortedTraining`, `SkipHandSwitch`; push `SetCompleted`, `SessionComplete`, `TrainingAborted`
  - **Frontend `RepeaterPage`:**
    - Protocol selection (from saved protocols)
    - Hand selection (left/right first)
    - Training UI:
      - Work phase: force chart with horizontal target line, "PULL" label (green), countdown, current/peak force, set counter, hand indicator
      - Rest phase: "REST" label (red), countdown, last set summary
      - Hand switch: countdown with skip button, "Set up [hand]" prompt
      - Pause overlay
    - Post-session summary: per-hand stats table (avg force per set, peak, % above target), full force-time curve
- **Tests:**
  - Unit tests for `TrainingOrchestrator` (uses mock `IProgressorService`)
  - Unit tests for `SetStats` calculation (average, peak, % time above target)
  - Integration test: complete a training session end-to-end (mock BLE), verify session persisted with correct stats
- **Verification:** `dotnet build`, `dotnet test`; launch app with mock BLE, start a repeater session, observe phase transitions, complete session, view summary
- **Exit Criteria:** User can run a full repeater session (both hands), see real-time feedback, view post-session summary; pause/resume and abort/save work correctly

---

## Step 8: Audio, Themes, and Connection Resilience

- **Goal:** Add audio cues, light/dark theme toggle, and BLE reconnection handling to complete the product.
- **Scope:**
  - **Audio cues:**
    - `PlaySound` SignalR event with sound type: "beep" (countdown), "go" (work start), "rest" (rest start), "done" (session complete)
    - Frontend: play audio files on `PlaySound` events
    - Protocol `AudioCues` and `CountdownBeeps` flags control which sounds play
  - **Theme toggle:**
    - `darkMode: 'class'` on `<html>`, default to OS preference
    - `ThemeToggle` component in nav bar
    - Persist preference in localStorage
  - **BLE reconnection:**
    - Detect disconnect via `ConnectionStatusChanged`
    - Pause timer, notify frontend (`ConnectionLost`)
    - Retry connection every 2s for up to 30s
    - On success: resume, notify frontend (`Reconnected`)
    - On failure: prompt user to abort
  - **Remaining polish:**
    - Connection loss during training (auto-pause + reconnect flow)
    - Hand switch skip (`SkipHandSwitch` already wired, verify UX)
    - Incomplete session indicator in history list
    - Error boundaries and loading states
- **Tests:**
  - Unit tests for reconnection retry logic
  - Unit tests for audio cue trigger conditions (respect protocol flags)
  - Manual testing: theme toggle, audio playback
- **Verification:** `dotnet build`, `dotnet test`; launch app, toggle theme, verify audio plays on transitions, simulate BLE disconnect during training
- **Exit Criteria:** All PRD features implemented; app handles BLE disconnection gracefully; audio and theme preferences work correctly

---

## Cross-Step Risks and Mitigations

- **BLE API availability:** WinRT Bluetooth APIs require `net10.0-windows10.0.19041.0` TFM. If APIs are unavailable or behave unexpectedly, the mock service allows continued development. Mitigated by front-loading BLE work in Step 3.
- **Real-time chart performance:** 80 Hz data via SignalR could cause rendering jank. Mitigated by server-side decimation (~10 samples/sec) and using uPlot (lightweight, canvas-based). Monitor in Step 4.
- **Timer precision:** `System.Threading.Timer` or `PeriodicTimer` may drift. For a training app, sub-100ms precision is sufficient. The device-embedded timestamps (microseconds) provide authoritative timing for samples.
- **SignalR backpressure:** High-frequency pushes may overwhelm slow clients. Mitigated by batching (100ms flush intervals) and configuring SignalR transport buffer sizes.
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
- [ ] Light/dark theme toggle works
- [ ] BLE reconnection works during training
