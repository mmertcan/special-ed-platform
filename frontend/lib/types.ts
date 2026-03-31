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

export type AdminCreateUserRequest = {
  full_name: string;
  email: string;
  password: string;
  role: UserRole;
  is_active: boolean;
};

export type AdminCreateUserResponse = {
  ok: true;
  user: CurrentUser;
};

export type StudentRecord = {
  id: number;
  full_name: string;
  is_active: boolean;
  created_at_utc: string;
};

export type AdminStudentsResponse = {
  ok: true;
  students: StudentRecord[];
};

export type AdminCreateStudentRequest = {
  full_name: string;
  is_active: boolean;
};

export type AdminCreateStudentResponse = {
  ok: true;
  student: StudentRecord;
};

export type AssignmentStudentSummary = {
  id: number;
  full_name: string;
  is_active: boolean;
};

export type AssignmentLinkedParent = {
  id: number;
  full_name: string;
  email: string;
  is_active: boolean;
  relationship_label: string | null;
};

export type AssignmentLinkedTeacher = {
  id: number;
  full_name: string;
  email: string;
  is_active: boolean;
};

export type AdminAssignmentsResponse = {
  ok: true;
  student: AssignmentStudentSummary;
  parents: AssignmentLinkedParent[];
  teachers: AssignmentLinkedTeacher[];
};
