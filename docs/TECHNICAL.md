# Tindeq Trainer — Technical Specification

## Architecture

```
Tindeq Progressor (BLE)
    │
    ▼ BLE notifications (bytes)
.NET Backend (ASP.NET Core)
    ├── ProgressorService      → BLE connection, commands, notification parsing
    ├── TimerService           → work/rest/countdown state machine
    ├── TrainingSession        → in-memory sample collection, stats
    ├── SessionRepository      → SQLite persistence
    ├── SignalR Hub            → real-time push to frontend
    └── REST Controllers       → history, protocols, device commands
    │
    ▼ SignalR (WebSocket) + REST
React Frontend (Vite + TypeScript)
    ├── Real-time force chart
    ├── Timer display
    ├── Protocol config
    ├── Session history browser
    └── Served from the .NET host
```

The user runs one executable. The .NET host serves the React SPA and exposes SignalR + REST endpoints on localhost.

---

## Tindeq Progressor BLE Protocol

### Service & Characteristics

| Name | UUID | Properties |
|------|------|------------|
| Progressor Service | `7e4e1701-1ea6-40c9-9dcc-13d34ffead57` | — |
| Data Point | `7e4e1702-1ea6-40c9-9dcc-13d34ffead57` | Notify |
| Control Point | `7e4e1703-1ea6-40c9-9dcc-13d34ffead57` | Write, Write without response |

### Commands (written to Control Point)

Commands use a TLV format: `Opcode (1 byte) | Length (1 byte) | Value (n bytes)`.

All commands used by this app have no parameters, so only the opcode is needed.

| Opcode | Hex | Procedure | Description |
|--------|-----|-----------|-------------|
| 100 | 0x64 | Tare scale | Zero the weight reading with no load applied |
| 101 | 0x65 | Start weight measurement | Begin continuous measurement at 80 Hz |
| 102 | 0x66 | Stop weight measurement | Stop measurement. Must be done before sampling battery. |
| 107 | 0x6B | Get app version | Returns firmware version string |
| 110 | 0x6E | Shutdown | Turn the Progressor off |
| 111 | 0x6F | Sample battery voltage | Returns battery voltage in millivolts |

### Responses (received via Data Point notifications)

Notifications use TLV format: `Response code (1 byte) | Length (1 byte) | Value (n bytes)`.

| Code | Hex | Description | Payload |
|------|-----|-------------|---------|
| 0 | 0x00 | Command response | Depends on last command sent: battery voltage = `uint32` LE, firmware version = UTF-8 string, error info = UTF-8 string |
| 1 | 0x01 | Weight measurement | 1 or more 8-byte samples: `float32` LE weight (kg) + `uint32` LE timestamp (microseconds since measurement start) |
| 4 | 0x04 | Low power warning | None. Device will shut down after sending this. |

### Data Format Details

- All data is **little-endian**
- Weight measurement notifications contain **bulk samples** — multiple 8-byte (float32 + uint32) pairs packed into one notification
- Sample rate is **80 Hz** (fixed by device firmware)
- Timestamps are microseconds since `StartWeightMeas` was sent, embedded in each sample by the device clock
- The device auto-shuts down after **10 minutes of inactivity** (non-connected state)

### Parsing Weight Data (pseudocode)

```
notification = byte[] from BLE
response_code = notification[0]   // should be 0x01
length = notification[1]
payload = notification[2:]

for i = 0; i < payload.length; i += 8:
    weight_kg  = float32_le(payload[i..i+4])
    timestamp  = uint32_le(payload[i+4..i+8])
    microseconds = timestamp
    seconds = timestamp / 1_000_000.0
```

---

## Project Structure

```
TindeqTrainer/
├── TindeqTrainer.sln
├── src/
│   ├── TindeqTrainer.Core/              # No UI dependencies
│   │   ├── Bluetooth/
│   │   │   ├── ProgressorService.cs      # BLE scan, connect, commands, notification parsing
│   │   │   ├── ProgressorCommands.cs     # Command opcode constants
│   │   │   └── ProgressorData.cs         # UUIDs, response codes, payload parsing
│   │   ├── Training/
│   │   │   ├── TimerService.cs           # Work/rest/countdown state machine
│   │   │   ├── TrainingSession.cs        # Sample collection, live stats
│   │   │   └── TrainingProtocol.cs       # Protocol definitions, defaults
│   │   ├── Storage/
│   │   │   ├── SessionRepository.cs      # Save/load/delete sessions
│   │   │   ├── ProtocolRepository.cs     # Save/load/delete protocols
│   │   │   └── AppDbContext.cs           # EF Core SQLite context
│   │   └── Models/
│   │       ├── ForceSample.cs
│   │       ├── ProtocolDefinition.cs
│   │       ├── HandData.cs
│   │       ├── SetStats.cs
│   │       ├── SessionSummary.cs
│   │       └── TimerState.cs
│   │
│   ├── TindeqTrainer.Api/               # ASP.NET Core host
│   │   ├── Hubs/
│   │   │   └── TrainingHub.cs            # SignalR hub for real-time data
│   │   ├── Controllers/
│   │   │   ├── DeviceController.cs       # Connect, disconnect, tare, battery
│   │   │   ├── SessionController.cs      # History CRUD, CSV export
│   │   │   └── ProtocolController.cs     # Protocol CRUD
│   │   └── Program.cs
│   │
│   └── tindeq-trainer-ui/               # React (Vite + TypeScript)
│       ├── src/
│       │   ├── api/
│       │   │   ├── signalr.ts            # SignalR connection, event subscriptions
│       │   │   └── rest.ts               # REST API client
│       │   ├── hooks/
│       │   │   ├── useForceSamples.ts    # Live sample buffer for chart
│       │   │   ├── useTimerState.ts      # Timer phase, remaining time
│       │   │   └── useSession.ts         # Session history queries
│       │   ├── components/
│       │   │   ├── ForceChart.tsx         # Real-time force vs. time chart
│       │   │   ├── TimerDisplay.tsx       # Phase label, countdown, set counter
│       │   │   ├── ConnectionBar.tsx      # Device status, battery, tare button
│       │   │   ├── ProtocolForm.tsx       # Create/edit protocol
│       │   │   ├── SessionList.tsx        # History list
│       │   │   ├── SessionDetail.tsx      # Full curve + stats for past session
│       │   │   └── ThemeToggle.tsx
│       │   ├── pages/
│       │   │   ├── LiveStreamPage.tsx
│       │   │   ├── RepeaterPage.tsx
│       │   │   └── HistoryPage.tsx
│       │   └── App.tsx
```

---

## Data Models

### Core Models

```csharp
public record ForceSample(
    float WeightKg,
    double TimestampSeconds);

public record ProtocolDefinition(
    Guid Id,
    string Name,
    double MaxWeightKg,
    double WeightPercentage,        // 0-100
    int SetsPerHand,
    double WorkSeconds,
    double RestSeconds,
    double HandSwitchSeconds,
    double CountdownSeconds,
    bool AudioCues,
    bool CountdownBeeps);

public record SetStats(
    int SetNumber,
    double AvgForceKg,
    double PeakForceKg,
    double PercentTimeAboveTarget,
    double DurationSeconds);

public record HandData(
    string Hand,                    // "Left" / "Right"
    List<ForceSample> Samples,
    List<SetStats> Sets);

public record SessionSummary(
    Guid Id,
    DateTime Date,
    string ProtocolName,
    double PeakForceKg,
    double AvgForceKg,
    TimeSpan Duration);

public record TrainingSessionRecord(
    Guid Id,
    DateTime Date,
    ProtocolDefinition Protocol,
    HandData Hand1,
    HandData Hand2);
```

### Timer State

```csharp
public enum TimerPhase
{
    Idle,
    Countdown,
    Work,
    Rest,
    HandSwitch,
    Done
}

public record TimerState(
    TimerPhase Phase,
    double RemainingSeconds,
    int CurrentSet,
    int TotalSets,
    int CurrentHand,                // 1 or 2
    string HandLabel);              // "Left" / "Right"
```

---

## SignalR Messages

### Server → Client

| Event | Payload | Frequency |
|-------|---------|-----------|
| `ForceSamples` | `ForceSample[]` | ~10/sec (batched from 80 Hz) |
| `TimerTick` | `TimerState` | ~10/sec |
| `SetCompleted` | `SetStats` | After each work phase |
| `SessionComplete` | `TrainingSessionRecord` | Once at end |
| `PlaySound` | `string` (sound type: "beep", "go", "rest", "done") | On transitions |
| `ConnectionLost` | — | On BLE disconnect |
| `Reconnected` | — | On BLE reconnect |

### Client → Server

| Method | Payload | Description |
|--------|---------|-------------|
| `Connect` | — | Scan and connect to Progressor |
| `Disconnect` | — | Disconnect from device |
| `Tare` | — | Zero the scale |
| `StartLiveStream` | — | Start free-form measurement |
| `StopLiveStream` | — | Stop free-form measurement |
| `StartTraining` | `{ protocolId: Guid, firstHand: string }` | Start repeater session |
| `StopTraining` | — | Abort session (discards data) |
| `SkipHandSwitch` | — | Skip remaining hand switch time |

---

## REST Endpoints

### Device

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/device/status` | Connection state, battery, firmware |

### Protocols

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/protocols` | List all protocols |
| GET | `/api/protocols/{id}` | Get single protocol |
| POST | `/api/protocols` | Create protocol |
| PUT | `/api/protocols/{id}` | Update protocol |
| DELETE | `/api/protocols/{id}` | Delete protocol |

### Sessions

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/sessions` | List all session summaries |
| GET | `/api/sessions/{id}` | Get full session with samples |
| DELETE | `/api/sessions/{id}` | Delete session |
| GET | `/api/sessions/{id}/export` | Download session as CSV |

---

## Data Flow

### Real-Time (during training)

```
Progressor
  │ BLE notification (bulk samples, ~10-40/sec)
  ▼
ProgressorService.OnNotification()
  │ parse into ForceSample[]
  ▼
TrainingSession.AddSamples()        → accumulates all samples (full 80 Hz)
  │
  ▼
SampleBuffer (ConcurrentQueue)      → accumulates for next flush
  │
  ▼
FlushTimer (every 100ms = 10/sec)
  │ drain buffer, send batch
  ▼
SignalR Hub → "ForceSamples"        → React chart
```

### Timer (parallel)

```
TimerService (ticks every ~50ms internally)
  │ evaluates phase transitions
  │ fires OnWorkStart / OnRestStart / OnHandSwitch / OnComplete
  ▼
Throttled to ~10/sec for UI
  ▼
SignalR Hub → "TimerTick"           → React timer display
```

### Persistence (end of session)

```
TimerService fires OnComplete
  ▼
TrainingSession.ToRecord()          → builds full session record with stats
  ▼
SessionRepository.SaveAsync()       → SQLite via EF Core
```

---

## Sample Handling Strategy

| Concern | Approach |
|---------|----------|
| Full resolution storage | All 80 Hz samples saved to session record |
| Frontend display rate | Configurable decimation, default ~10 samples/sec pushed via SignalR |
| Chart rendering | Rolling window during live view, full curve in history |
| Downsampling method | Average each N-sample window (preserves force accuracy) |
| Decimation factor | Configurable (default: 8, yielding ~10 display samples/sec) |

---

## BLE Connection Management

### Connection Flow

1. `BleakScanner` equivalent: `BluetoothLEAdvertisementWatcher` or `DeviceInformation.FindAllAsync` with `BluetoothLEDevice`
2. Filter by device name starting with "Progressor"
3. Auto-pick first match
4. Connect via `BluetoothLEDevice.FromBluetoothAddressAsync`
5. Get GATT service by UUID
6. Get Control Point and Data Point characteristics
7. Subscribe to Data Point notifications
8. Ready

### Reconnection on Disconnect

1. Detect disconnect via `BluetoothLEDevice.ConnectionStatusChanged`
2. Pause timer (freeze current state)
3. Notify frontend: `ConnectionLost`
4. Retry connection every 2 seconds, up to 30 seconds
5. On success: resume timer, notify frontend: `Reconnected`
6. On failure: prompt user to abort

### Command Sending

Commands are sent as byte arrays to the Control Point characteristic:

```csharp
await characteristic.WriteValueAsync(
    new byte[] { opcode }.AsBuffer(),
    GattWriteOption.WriteWithResponse);
```

---

## Storage

### SQLite via EF Core

Tables:
- `Protocols` — saved protocol definitions
- `Sessions` — session metadata (date, protocol ID, summary stats)
- `SessionSamples` — force samples per session (session ID, hand, weight, timestamp)

Alternatively, samples could be stored as a compressed binary blob per hand to reduce row count.

### CSV Export Format

```csv
hand,set,timestamp_s,weight_kg
Left,1,0.0125,24.3
Left,1,0.0250,24.7
...
Right,1,0.0125,23.1
...
```

---

## Dependencies

### .NET Backend

| Package | Purpose |
|---------|---------|
| ASP.NET Core | HTTP host, SignalR |
| Microsoft.Windows.SDK.Contracts (or target `net8.0-windows10.0.19041.0`) | WinRT Bluetooth APIs |
| Microsoft.EntityFrameworkCore.Sqlite | Session/protocol persistence |
| CommunityToolkit.Mvvm (optional) | Observable patterns if needed |

### React Frontend

| Package | Purpose |
|---------|---------|
| React + TypeScript | UI framework |
| Vite | Build tooling |
| @microsoft/signalr | SignalR client |
| uPlot or lightweight-charts | High-performance real-time charting |
| Tailwind CSS | Styling |
| Lucide or similar | Icons |

---

## Platform Requirements

- Windows 10+ (for WinRT Bluetooth APIs)
- Bluetooth adapter supporting BLE
- .NET 8+
- Node.js (build time only, for React)
- Modern browser (Chrome, Edge, Firefox)
