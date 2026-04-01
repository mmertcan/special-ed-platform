import { ProtectedRoute } from "../../../components/protected-route";
import { TeacherStudentsPanel } from "../../../components/teacher-students-panel";

export default function TeacherStudentsPage() {
  return (
    <ProtectedRoute allowedRoles={["teacher"]}>
      <TeacherStudentsPanel />
    </ProtectedRoute>
  );
}
