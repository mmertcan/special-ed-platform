import { ProtectedRoute } from "../../components/protected-route";
import { RoleHome } from "../../components/role-home";

export default function AdminPage() {
  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <RoleHome
        areaLabel="Admin area"
        title="Admin shell is connected."
        description="This route is now protected by auth state and role guards. The next pages to build are users, students, and assignments."
        links={[
          {
            href: "/admin/users",
            title: "Users page",
            description: "Create teachers and parents, then filter the list.",
          },
          {
            href: "/admin/students",
            title: "Students page",
            description: "Create students and filter active or inactive records.",
          },
          {
            href: "/admin/assignments",
            title: "Assignments page",
            description: "Link teachers and parents to students.",
          },
        ]}
      />
    </ProtectedRoute>
  );
}
