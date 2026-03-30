import { FeaturePlaceholder } from "../../../components/feature-placeholder";
import { ProtectedRoute } from "../../../components/protected-route";

export default function AdminUsersPage() {
  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <FeaturePlaceholder
        areaLabel="Admin users"
        title="Users page scaffold"
        description="This route is ready for the users table, filters, and create-user form."
      />
    </ProtectedRoute>
  );
}
