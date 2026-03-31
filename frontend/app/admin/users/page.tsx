import { AdminUsersPanel } from "../../../components/admin-users-panel";
import { ProtectedRoute } from "../../../components/protected-route";

export default function AdminUsersPage() {
  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <AdminUsersPanel />
    </ProtectedRoute>
  );
}
