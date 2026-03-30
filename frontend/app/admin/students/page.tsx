import { FeaturePlaceholder } from "../../../components/feature-placeholder";
import { ProtectedRoute } from "../../../components/protected-route";

export default function AdminStudentsPage() {
  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <FeaturePlaceholder
        areaLabel="Admin students"
        title="Students page scaffold"
        description="This route is ready for the students table, active filter, and create-student form."
      />
    </ProtectedRoute>
  );
}
