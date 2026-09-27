export type ProjectStatus =
  | "not_started"
  | "in_progress"
  | "at_risk"
  | "completed"
  | "delayed";

export type UserRole = "admin" | "user";
export type UserStatus = "approved" | "pending" | "rejected";

export interface Milestone {
  id: string;
  name: string;
  start: string;
  end: string;
  done: boolean;
  /** 사용자가 입력한 실제 완료일. 없으면 일정 경과만으로 완료 처리하지 않습니다. */
  completedAt?: string;
  /** @deprecated legacy field — use end */
  due?: string;
}

export interface ProjectFile {
  id: string;
  name: string;
  url: string;
}

export interface Project {
  id: string;
  name: string;
  desc: string;
  start: string;
  end: string;
  status: ProjectStatus;
  color: string;
  notes: string;
  files: ProjectFile[];
  archived: boolean;
  members: string[];
  milestones: Milestone[];
}

export interface TeamMember {
  id: string;
  name: string;
  color: string;
}

export interface ProjectMember {
  id: string;
  name: string;
  email: string;
  color: string;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
}

export type AppView = "dashboard" | "archive";
export type ProjectView = "list" | "gantt" | "calendar";
export type AuthView = "login" | "signup";

export interface KanbanItem extends Milestone {
  projectId: string;
  projectName: string;
  projectColor: string;
  rangeFmt: string;
}

export interface StatusConfig {
  label: string;
  color: string;
  bg: string;
}
