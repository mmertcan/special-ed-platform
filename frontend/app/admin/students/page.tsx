import { AdminStudentsPanel } from "../../../components/admin-students-panel";
import { ProtectedRoute } from "../../../components/protected-route";

export default function AdminStudentsPage() {
  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <AdminStudentsPanel />
    </ProtectedRoute>
  );
}
