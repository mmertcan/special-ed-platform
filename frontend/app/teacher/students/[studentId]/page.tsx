import { ProtectedRoute } from "../../../../components/protected-route";
import { TeacherStudentDetailPanel } from "../../../../components/teacher-student-detail-panel";

export default function TeacherStudentDetailPage() {
  return (
    <ProtectedRoute allowedRoles={["teacher"]}>
      <TeacherStudentDetailPanel />
    </ProtectedRoute>
  );
}
