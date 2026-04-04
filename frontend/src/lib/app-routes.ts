export const appRoutes = {
  repeaters: "/repeaters",
  repeaterProtocolsNew: "/repeaters/repeater-protocols/new",
  repeaterProtocolsEdit: "/repeaters/repeater-protocols/:id/edit",
  workoutProtocols: "/workout-protocols",
  workoutProtocolsNew: "/workout-protocols/new",
  workoutProtocolsEdit: "/workout-protocols/:id/edit",
  workoutProtocolsRun: "/workout-protocols/:id/run",
  maxWeight: "/max-weight",
  liveStream: "/live-stream",
} as const;

export const navigationItems = [
  { to: appRoutes.liveStream, label: "Live Stream" },
  { to: appRoutes.repeaters, label: "Repeaters" },
  { to: appRoutes.workoutProtocols, label: "Workout Protocols" },
  { to: appRoutes.maxWeight, label: "Max Weight" },
] as const;
