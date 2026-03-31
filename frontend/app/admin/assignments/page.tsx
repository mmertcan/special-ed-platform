import { AdminAssignmentsPanel } from "../../../components/admin-assignments-panel";
import { ProtectedRoute } from "../../../components/protected-route";

export default function AdminAssignmentsPage() {
  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <AdminAssignmentsPanel />
    </ProtectedRoute>
  );
}
