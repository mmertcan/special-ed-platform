import { FeaturePlaceholder } from "../../../components/feature-placeholder";
import { ProtectedRoute } from "../../../components/protected-route";

export default function AdminAssignmentsPage() {
  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <FeaturePlaceholder
        areaLabel="Admin assignments"
        title="Assignments page scaffold"
        description="This protected route already sits behind the admin guard. The next implementation step is to fetch students, teachers, and parents, then wire assignment POST requests."
      />
    </ProtectedRoute>
  );
}
