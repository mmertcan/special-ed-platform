export type UserRole = "admin" | "teacher" | "parent";

export type CurrentUser = {
  id: number;
  role: UserRole;
  full_name: string;
  email: string;
  is_active: boolean;
  created_at_utc: string;
};

export type AuthState = {
  token: string | null;
  currentUser: CurrentUser | null;
  isBooting: boolean;
  isAuthenticated: boolean;
};

export type MeResponse = {
  ok: true;
  user: CurrentUser;
};

export type LoginResponse = {
  ok: true;
  token: string;
  expires_at_utc: string;
  user: CurrentUser;
};

export type AdminUsersResponse = {
  ok: true;
  users: CurrentUser[];
};
