# Tindeq Trainer

A desktop training app for the [Tindeq Progressor](https://tindeq.com/) force gauge. It connects to the device over Bluetooth LE, streams force data in real time, and supports structured interval training with timers, targets, and session history.

## Features

- **Protocol management** -- create and configure training protocols (reps, sets, work/rest durations, hand-switch intervals, target weight, audio cues)
- **Repeater training** -- run structured interval sessions driven by a timer state machine with countdown, work, rest, hand-switch, and set-rest phases
- **Live stream** -- free-form force monitoring with a real-time chart showing peak, average, and duration
- **Session history** -- browse past sessions, view force-time charts, export to CSV
- **BLE device connection** -- connect to a Tindeq Progressor (or a mock device), tare, and view battery/firmware status

## Tech Stack

| Layer    | Stack |
|----------|-------|
| Frontend | React 19, TypeScript, Vite, TanStack Query, Tailwind CSS, shadcn/ui, SignalR, uPlot |
| Backend  | .NET 10, Clean Architecture (MediatR/CQRS), EF Core + SQLite, SignalR, Aspire |
| Device   | Windows BLE via WinRT APIs |
