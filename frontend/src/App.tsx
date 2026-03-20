import { Navigate, Route, Routes } from "react-router-dom";

import { Layout } from "@/components/Layout";
import { LiveStreamPage } from "@/features/live-stream/LiveStreamPage";
import { MaxWeightPage } from "@/features/max-weight/MaxWeightPage";
import { ProtocolFormPage } from "@/features/protocols/ProtocolFormPage";
import { RepeaterPage } from "@/features/repeater/RepeaterPage";
import { appRoutes } from "@/lib/app-routes";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to={appRoutes.repeaters} replace />} />
        <Route path={appRoutes.protocolsNew.slice(1)} element={<ProtocolFormPage />} />
        <Route path={appRoutes.protocolsEdit.slice(1)} element={<ProtocolFormPage />} />
        <Route path={appRoutes.maxWeight.slice(1)} element={<MaxWeightPage />} />
        <Route path={appRoutes.liveStream.slice(1)} element={<LiveStreamPage />} />
        <Route path={appRoutes.repeaters.slice(1)} element={<RepeaterPage />} />
        <Route path="*" element={<Navigate to={appRoutes.repeaters} replace />} />
      </Route>
    </Routes>
  );
}

export default App;
