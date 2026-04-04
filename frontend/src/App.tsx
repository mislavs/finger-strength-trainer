import { Navigate, Route, Routes } from "react-router-dom";

import { Layout } from "@/components/Layout";
import { LiveStreamPage } from "@/features/live-stream/LiveStreamPage";
import { MaxWeightPage } from "@/features/max-weight/MaxWeightPage";
import { RepeaterProtocolFormPage } from "@/features/repeater-protocols/RepeaterProtocolFormPage";
import { RepeaterPage } from "@/features/repeater/RepeaterPage";
import { WorkoutProtocolFormPage } from "@/features/workout-protocols/WorkoutProtocolFormPage";
import { WorkoutProtocolListPage } from "@/features/workout-protocols/WorkoutProtocolListPage";
import { WorkoutProtocolRunnerPage } from "@/features/workout-protocols/WorkoutProtocolRunnerPage";
import { appRoutes } from "@/lib/app-routes";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to={appRoutes.repeaters} replace />} />
        <Route path={appRoutes.repeaterProtocolsNew.slice(1)} element={<RepeaterProtocolFormPage />} />
        <Route path={appRoutes.repeaterProtocolsEdit.slice(1)} element={<RepeaterProtocolFormPage />} />
        <Route path={appRoutes.workoutProtocols.slice(1)} element={<WorkoutProtocolListPage />} />
        <Route path={appRoutes.workoutProtocolsNew.slice(1)} element={<WorkoutProtocolFormPage />} />
        <Route path={appRoutes.workoutProtocolsEdit.slice(1)} element={<WorkoutProtocolFormPage />} />
        <Route path={appRoutes.workoutProtocolsRun.slice(1)} element={<WorkoutProtocolRunnerPage />} />
        <Route path={appRoutes.maxWeight.slice(1)} element={<MaxWeightPage />} />
        <Route path={appRoutes.liveStream.slice(1)} element={<LiveStreamPage />} />
        <Route path={appRoutes.repeaters.slice(1)} element={<RepeaterPage />} />
        <Route path="*" element={<Navigate to={appRoutes.repeaters} replace />} />
      </Route>
    </Routes>
  );
}

export default App;
