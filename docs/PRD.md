# Tindeq Trainer — Product Requirements Document

## Overview

A desktop training application for the Tindeq Progressor force gauge. The app connects to the Progressor via Bluetooth LE, streams real-time force data, and provides structured training protocols with timers, targets, and session history.

The app runs as a .NET backend with a React frontend, served locally. The user launches the app and opens a browser.

---

## Features

### Feature 1: Live Stream

Free-form, unstructured force monitoring.

- User manually starts and stops measurement
- Real-time force vs. time chart (rolling window)
- Displays current force (kg), peak force (kg), session duration
- No timers, no targets, no protocols
- Tare before starting
- When the user stops measurement, prompt to save or discard the recording
- Saved recordings appear in session history tagged as "Live Stream" with peak force, average force, and duration

**Use cases:** max hang testing, grip exploration, device verification.

---

### Feature 2: Repeater Training

Structured interval training with configurable protocols, one hand at a time.

#### Protocol Configuration (saveable/loadable)

| Setting | Description | Example |
|---------|-------------|---------|
| Name | Protocol name | "7/3 Repeaters 60%" |
| Max weight | User's tested max for this grip (kg) | 40 |
| Weight percentage | Target as % of max | 60 |
| Sets per hand | Number of work intervals per hand | 10 |
| Work time | Duration of each pull (seconds) | 7 |
| Rest time | Duration of rest between sets (seconds) | 3 |
| Hand switch time | Time to switch the device to the other hand (seconds) | 30 |
| Countdown time | Countdown before first set starts (seconds) | 5 |
| Audio cues | Sound on work/rest transitions | on/off |
| Countdown beeps | Beeps during countdown | on/off |

**Derived value:** Target weight = max weight × weight percentage (e.g., 40 × 60% = 24 kg).

#### Session Flow

1. User selects a protocol
2. User picks which hand goes first (left or right)
3. Tare (once at start)
4. Countdown (configurable, e.g., 5 seconds)
5. **Hand 1 loop:**
   - Work phase (e.g., 7s) → Rest phase (e.g., 3s) → repeat for N sets
   - Last set has no rest after it
6. **Hand switch** (configurable time, or user taps to skip early)
7. Countdown
8. **Hand 2 loop:** same as hand 1
9. **Session complete** → show summary → save

The Progressor stays measuring continuously for each hand (including during rest phases). The timer only dictates the user's pull/rest rhythm.

#### Pause & Resume

The user can pause the session at any time during any phase (work, rest, countdown, hand switch).

- **On pause:** BLE measurement stops, timer freezes at current position
- **On resume:** tare, brief countdown, BLE measurement restarts, timer resumes from where it left off
- Paused state is clearly indicated in the UI
- The force data will have a gap corresponding to the pause duration (this is expected since no training is happening)

#### Abort & Save

The user can abort a session at any time. On abort:

- Prompt to **save** or **discard** the partial session
- If saved, the session is marked as incomplete and contains only the sets that were fully completed
- Partial sessions appear in history with an "Incomplete" indicator

#### UI During Work Phase

- Force vs. time chart (rolling window) with horizontal target line
- Countdown timer (e.g., "4.3s")
- Phase label "PULL" — green background
- Current force (kg), peak force (kg)
- Set counter (e.g., "Set 3 / 10")
- Hand indicator (e.g., "Left Hand")
- Audio cue on transition

#### UI During Rest Phase

- Countdown timer
- Phase label "REST" — red background
- Last set summary: average force, % time above target
- Audio cue on transition

#### UI During Hand Switch

- Countdown timer (or tap to skip)
- Prompt: "Set up [right/left] hand"
- Audio cue when time to start

#### Post-Session Summary

Per hand:
- Average force per set (table or bar chart)
- Peak force
- % time above target per set
- Overall consistency

Full session:
- Full force-time curve viewable (both hands)
- Protocol used, date/time

---

### Default Protocols

The app ships with a few built-in protocols. Users can create, edit, and delete their own.

| Name | Weight % | Sets | Work (s) | Rest (s) |
|------|----------|------|----------|----------|
| Max Repeaters 80% | 80 | 6 | 7 | 3 |
| Endurance 60% | 60 | 10 | 7 | 3 |
| Short Power 90% | 90 | 4 | 5 | 5 |

Max weight is always user-configured (not part of the default template).

---

## Connection & Device Handling

| Behavior | Decision |
|----------|----------|
| Device discovery | Auto-pick the first Progressor found |
| Tare | Once at session start |
| Mid-session abort | Prompt to save or discard partial data |
| Connection loss | Pause session, attempt auto-reconnect, offer option to abort |
| Multiple devices in range | Pick the first one found |

---

## Session History

- All completed sessions are saved automatically; partial sessions and live stream recordings are saved if the user chooses
- Live stream sessions appear with protocol name "Live Stream"
- Incomplete repeater sessions are marked with an "Incomplete" indicator
- Browsable list with date, protocol name, summary stats
- Drill into any session to view the full force-time curve
- Export any session to CSV
- Delete sessions

---

## General

| Setting | Decision |
|---------|----------|
| Units | kg only |
| Theme | Light and dark, user toggleable |
| Platform | Windows desktop (browser-based UI) |

---

## Out of Scope

- RFD commands on the device (calculated from weight data if needed)
- Device calibration
- Multi-device simultaneous use
- Mobile support
- User accounts / cloud sync
