export const appRoutes = {
  repeaters: "/repeaters",
  protocolsNew: "/repeaters/protocols/new",
  protocolsEdit: "/repeaters/protocols/:id/edit",
  maxWeight: "/max-weight",
  liveStream: "/live-stream",
} as const;

export const navigationItems = [
  { to: appRoutes.liveStream, label: "Live Stream" },
  { to: appRoutes.repeaters, label: "Repeaters" },
  { to: appRoutes.maxWeight, label: "Max Weight" },
] as const;
