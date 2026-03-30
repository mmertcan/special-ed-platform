import { FeaturePlaceholder } from "../../../components/feature-placeholder";
import { ProtectedRoute } from "../../../components/protected-route";

export default function TeacherStudentsPage() {
  return (
    <ProtectedRoute allowedRoles={["teacher"]}>
      <FeaturePlaceholder
        areaLabel="Teacher students"
        title="Student list page scaffold"
        description="This route is ready for the GET /me/students call and the student cards that link to the daily feed detail page."
      />
    </ProtectedRoute>
  );
}
