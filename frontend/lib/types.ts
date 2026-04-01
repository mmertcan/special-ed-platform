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

export type ViewerStudent = {
  id: number;
  full_name: string;
  is_active: boolean;
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

export type AssignParentRequest = {
  parent_user_id: number;
  student_id: number;
};

export type AssignParentResponse = {
  ok: true;
  assigned_by_user_id: number;
  parent_user_id: number;
  student_id: number;
};

export type AssignTeacherRequest = {
  teacher_user_id: number;
  student_id: number;
};

export type AssignTeacherResponse = {
  ok: true;
  assigned_by_user_id: number;
  teacher_user_id: number;
  student_id: number;
};

export type MeStudentsResponse = {
  ok: true;
  viewer_role: "teacher" | "parent";
  viewer_user_id: number;
  students: ViewerStudent[];
};

export type DailyFeedMediaItem = {
  id: number;
  post_id: number;
  storage_key: string;
  media_type: "image" | "video";
  created_at_utc: string;
};

export type DailyFeedEntry = {
  id: number;
  student_id: number;
  body: string;
  posted_at_utc: string;
  updated_at_utc?: string | null;
  author_user_id?: number;
  author_role?: UserRole;
  media_items?: DailyFeedMediaItem[];
};

export type DailyFeedResponse = {
  ok: true;
  student_id: number;
  viewer_role: "teacher" | "parent";
  viewer_user_id: number;
  entries: DailyFeedEntry[];
};

export type DailyFeedCreateRequest = {
  body: string;
};

export type DailyFeedCreateResponse = {
  ok: true;
  post: DailyFeedEntry;
};
