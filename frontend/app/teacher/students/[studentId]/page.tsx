import { FeaturePlaceholder } from "../../../../components/feature-placeholder";
import { ProtectedRoute } from "../../../../components/protected-route";

export default function TeacherStudentDetailPage() {
  return (
    <ProtectedRoute allowedRoles={["teacher"]}>
      <FeaturePlaceholder
        areaLabel="Teacher student detail"
        title="Daily feed detail scaffold"
        description="This route now exists so teacher student cards have a real destination. The next slice will verify the selected student belongs to the logged-in teacher, then load and post daily feed entries."
      />
    </ProtectedRoute>
  );
}
