export const appRoutes = {
  repeaters: "/repeaters",
  protocolsNew: "/repeaters/protocols/new",
  protocolsEdit: "/repeaters/protocols/:id/edit",
  maxWeight: "/max-weight",
  liveStream: "/live-stream",
  history: "/history",
  historyDetail: "/history/:id",
} as const;

export const navigationItems = [
  { to: appRoutes.liveStream, label: "Live Stream" },
  { to: appRoutes.repeaters, label: "Repeaters" },
  { to: appRoutes.maxWeight, label: "Max Weight" },
  { to: appRoutes.history, label: "History" },
] as const;
