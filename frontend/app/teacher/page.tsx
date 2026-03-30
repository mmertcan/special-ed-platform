import { ProtectedRoute } from "../../components/protected-route";
import { RoleHome } from "../../components/role-home";

export default function TeacherPage() {
  return (
    <ProtectedRoute allowedRoles={["teacher"]}>
      <RoleHome
        areaLabel="Teacher area"
        title="Teacher shell is connected."
        description="This route already blocks non-teacher users and restores the session after refresh. The next page to build is the student list."
        links={[
          {
            href: "/teacher/students",
            title: "Assigned students",
            description: "Show only the students linked to the logged-in teacher.",
          },
        ]}
      />
    </ProtectedRoute>
  );
}
