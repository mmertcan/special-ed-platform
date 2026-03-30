import type { UserRole } from "./types";

export function getRoleHome(role: UserRole) {
  switch (role) {
    case "admin":
      return "/admin";
    case "teacher":
      return "/teacher";
    case "parent":
      return "/parent/feed";
    default:
      return "/login";
  }
}
