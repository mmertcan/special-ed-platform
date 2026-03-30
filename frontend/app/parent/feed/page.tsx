import { ProtectedRoute } from "../../../components/protected-route";
import { RoleHome } from "../../../components/role-home";

export default function ParentFeedPage() {
  return (
    <ProtectedRoute allowedRoles={["parent"]}>
      <RoleHome
        areaLabel="Parent area"
        title="Parent shell is connected."
        description="This protected route is ready for the child switcher and daily feed list. It already participates in role-based routing."
        links={[
          {
            href: "/parent/feed",
            title: "Daily feed",
            description: "This route will show the selected child's daily updates.",
          },
        ]}
      />
    </ProtectedRoute>
  );
}
