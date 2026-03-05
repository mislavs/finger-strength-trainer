import { Navigate, Route, Routes } from "react-router-dom"

import { Layout } from "@/components/Layout"
import { LiveStreamPage } from "@/features/live-stream/LiveStreamPage"
import { ProtocolFormPage } from "@/features/protocols/ProtocolFormPage"
import { ProtocolListPage } from "@/features/protocols/ProtocolListPage"
import { appRoutes } from "@/lib/app-routes"
import { PlaceholderPage } from "@/pages/PlaceholderPage"

const placeholderRoutes = [
  { path: appRoutes.repeater.slice(1), title: "Repeater" },
  { path: appRoutes.history.slice(1), title: "History" },
] as const

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to={appRoutes.protocols} replace />} />
        <Route path={appRoutes.protocols.slice(1)} element={<ProtocolListPage />} />
        <Route path={appRoutes.protocolsNew.slice(1)} element={<ProtocolFormPage />} />
        <Route path={appRoutes.protocolsEdit.slice(1)} element={<ProtocolFormPage />} />
        <Route path={appRoutes.liveStream.slice(1)} element={<LiveStreamPage />} />
        {placeholderRoutes.map((route) => (
          <Route key={route.path} path={route.path} element={<PlaceholderPage title={route.title} />} />
        ))}
        <Route path="*" element={<Navigate to={appRoutes.protocols} replace />} />
      </Route>
    </Routes>
  )
}

export default App
