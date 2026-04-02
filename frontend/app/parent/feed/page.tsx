import { ProtectedRoute } from "../../../components/protected-route";
import { ParentFeedPanel } from "../../../components/parent-feed-panel";

export default function ParentFeedPage() {
  return (
    <ProtectedRoute allowedRoles={["parent"]}>
      <ParentFeedPanel />
    </ProtectedRoute>
  );
}
