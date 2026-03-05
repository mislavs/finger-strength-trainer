export const appRoutes = {
  protocols: "/protocols",
  protocolsNew: "/protocols/new",
  protocolsEdit: "/protocols/:id/edit",
  liveStream: "/live-stream",
  repeater: "/repeater",
  history: "/history",
  historyDetail: "/history/:id",
} as const

export const navigationItems = [
  { to: appRoutes.liveStream, label: "Live Stream" },
  { to: appRoutes.repeater, label: "Repeater" },
  { to: appRoutes.history, label: "History" },
  { to: appRoutes.protocols, label: "Protocols" },
] as const
