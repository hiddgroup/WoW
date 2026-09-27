import { COLORS } from "./constants";
import type { AuthUser, Milestone, Project, ProjectMember } from "./types";

export function memberColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLORS[Math.abs(hash) % COLORS.length];
}

export function toProjectMember(user: AuthUser): ProjectMember {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    color: memberColor(user.id),
  };
}

export function resolveProjectMembers(
  memberIds: string[],
  membersLookup: ProjectMember[]
): ProjectMember[] {
  const map = new Map(membersLookup.map((m) => [m.id, m]));
  return memberIds
    .map((id) => map.get(id))
    .filter((m): m is ProjectMember => !!m);
}

export function fmt(
  d: string,
  opts?: Intl.DateTimeFormatOptions
): string {
  if (!d) return "";
  try {
    const date = new Date(d + "T00:00:00");
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleDateString("ko-KR", opts ?? {
      month: "short",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

export function formatProjectRange(start: string, end: string): string {
  if (!end) return `${fmt(start)} ~ 미정`;
  return `${fmt(start)} ~ ${fmt(end)}`;
}

export function projectEffectiveEnd(
  project: Project,
  fallback: Date = todayAtMidnight()
): string {
  if (project.end) return project.end;
  const msEnds = project.milestones
    .map((m) => milestoneEnd(m))
    .filter(Boolean)
    .sort();
  if (msEnds.length > 0) return msEnds[msEnds.length - 1];
  return fallback.toISOString().slice(0, 10);
}

export function todayAtMidnight(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

export function parseDateDay(value: string): Date {
  const date = new Date(value + "T00:00:00");
  date.setHours(0, 0, 0, 0);
  return date;
}

export function rangesOverlap(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date
): boolean {
  return aStart.getTime() <= bEnd.getTime() && aEnd.getTime() >= bStart.getTime();
}

export function getWeekRange(today: Date) {
  const dow = today.getDay();
  const wStart = new Date(today);
  wStart.setDate(today.getDate() - dow);
  wStart.setHours(0, 0, 0, 0);
  const wEnd = new Date(wStart);
  wEnd.setDate(wStart.getDate() + 6);
  wEnd.setHours(0, 0, 0, 0);
  return { wStart, wEnd };
}

export function getNextWeekRange(today: Date) {
  const { wEnd } = getWeekRange(today);
  const nwStart = new Date(wEnd);
  nwStart.setDate(wEnd.getDate() + 1);
  nwStart.setHours(0, 0, 0, 0);
  const nwEnd = new Date(nwStart);
  nwEnd.setDate(nwStart.getDate() + 6);
  nwEnd.setHours(0, 0, 0, 0);
  return { nwStart, nwEnd };
}

export function milestoneEnd(milestone: Milestone): string {
  return milestone.end || milestone.due || "";
}

export function milestoneStart(
  milestone: Milestone,
  project: Project,
  index: number
): string {
  if (milestone.start) return milestone.start;
  const prevMs = index > 0 ? project.milestones[index - 1] : null;
  return prevMs ? milestoneEnd(prevMs) : project.start;
}

function normalizeAssignees(ids: string[] | undefined): string[] | undefined {
  if (!ids?.length) return undefined;
  const unique = [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
  return unique.length ? unique : undefined;
}

export function normalizeMilestone(
  milestone: Milestone,
  project: Project,
  index: number
): Milestone {
  const end = milestoneEnd(milestone);
  const start = milestoneStart({ ...milestone, end }, project, index);
  const { due: _due, assignees, ...rest } = milestone;
  const nextAssignees = normalizeAssignees(assignees);
  return nextAssignees
    ? { ...rest, start, end, assignees: nextAssignees }
    : { ...rest, start, end };
}

export function normalizeProjectMilestones(project: Project): Project {
  return {
    ...project,
    milestones: project.milestones.map((m, i) =>
      normalizeMilestone(m, project, i)
    ),
  };
}

export function milestoneRangeFmt(
  project: Project,
  milestone: Milestone,
  index: number
): string {
  const msStart = milestoneStart(milestone, project, index);
  const msEnd = milestoneEnd(milestone);
  return `${fmt(msStart, { month: "short", day: "numeric" })} ~ ${fmt(msEnd, { month: "short", day: "numeric" })}`;
}

export function isMilestoneActiveOn(
  milestone: Milestone,
  project: Project,
  index: number,
  day: Date
): boolean {
  if (milestone.done) return false;
  const start = parseDateDay(milestoneStart(milestone, project, index));
  const end = parseDateDay(milestoneEnd(milestone));
  return start.getTime() <= day.getTime() && end.getTime() >= day.getTime();
}

export function isMilestoneOverdue(
  milestone: Milestone,
  project: Project,
  index: number,
  day: Date
): boolean {
  if (milestone.done) return false;
  const end = parseDateDay(milestoneEnd(milestone));
  return end.getTime() < day.getTime();
}

export function milestoneOverlapsRange(
  milestone: Milestone,
  project: Project,
  index: number,
  rangeStart: Date,
  rangeEnd: Date
): boolean {
  const start = parseDateDay(milestoneStart(milestone, project, index));
  const end = parseDateDay(milestoneEnd(milestone));
  return rangesOverlap(start, end, rangeStart, rangeEnd);
}

export function milestoneCompletedInRange(
  milestone: Milestone,
  rangeStart: Date,
  rangeEnd: Date
): boolean {
  if (!milestone.done || !milestone.completedAt) return false;
  const completed = parseDateDay(milestone.completedAt);
  return rangesOverlap(completed, completed, rangeStart, rangeEnd);
}

export function calcProgress(milestones: Milestone[]) {
  const total = milestones.length;
  const done = milestones.filter((m) => m.done).length;
  const progress = total > 0 ? Math.round((done / total) * 100) : 0;
  return { total, done, progress };
}

export function getMemberNames(
  memberIds: string[],
  membersLookup: ProjectMember[] = []
): string {
  return (
    resolveProjectMembers(memberIds, membersLookup)
      .map((m) => m.name)
      .join(" · ") || "미지정"
  );
}

export function formatDateInput(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export type MilestoneTiming = "scheduled" | "delayed" | "done" | "done_late";

/** 일정만 지난 항목은 지연. 실제 완료일이 계획 종료일보다 늦으면 지연 완료. */
export function milestoneTiming(
  milestone: Milestone,
  today: Date = todayAtMidnight()
): MilestoneTiming {
  const plannedEnd = parseDateDay(milestoneEnd(milestone)).getTime();
  if (milestone.completedAt) {
    const actual = parseDateDay(milestone.completedAt).getTime();
    return actual > plannedEnd ? "done_late" : "done";
  }
  if (plannedEnd < today.getTime()) return "delayed";
  return "scheduled";
}

export function milestoneTimingLabel(timing: MilestoneTiming): string | null {
  if (timing === "delayed") return "지연";
  if (timing === "done_late") return "지연 완료";
  if (timing === "done") return "완료";
  return null;
}

export function scheduleNeedsPersist(before: Project, after: Project): boolean {
  if (before.status !== after.status) return true;
  if (before.archived !== after.archived) return true;
  if (before.milestones.length !== after.milestones.length) return true;
  return before.milestones.some((m, i) => {
    const a = after.milestones[i];
    if (!a) return true;
    return (
      m.done !== a.done ||
      m.completedAt !== a.completedAt ||
      m.start !== a.start ||
      m.end !== a.end ||
      milestoneEnd(m) !== milestoneEnd(a)
    );
  });
}

/** 일정 경과 시 지연만 반영합니다. 완료·아카이브는 사용자가 직접 처리할 때만 바뀝니다. */
export function applyScheduleSync(
  project: Project,
  today: Date = todayAtMidnight()
): Project {
  if (project.archived) return project;

  const day = today.getTime();
  const milestones = normalizeProjectMilestones(project).milestones.map((m) => {
    if (m.done && !m.completedAt) return { ...m, done: false };
    return m;
  });

  const start = parseDateDay(project.start);
  const started = start.getTime() <= day;
  const hasOpenOverdue = milestones.some(
    (m) => milestoneTiming(m, today) === "delayed"
  );
  const hasLateCompletion = milestones.some(
    (m) => milestoneTiming(m, today) === "done_late"
  );
  const projectPastEnd =
    !!project.end && parseDateDay(project.end).getTime() < day;
  const allUserDone =
    milestones.length > 0 && milestones.every((m) => !!m.completedAt);
  const projectPastAndOpen = projectPastEnd && !allUserDone;
  const stillLate = hasOpenOverdue || hasLateCompletion || projectPastAndOpen;
  const userClosed = project.status === "completed" && allUserDone;

  let status = project.status;
  if (stillLate && !userClosed) {
    status = "delayed";
  } else if (!stillLate && status === "delayed") {
    status = started ? "in_progress" : "not_started";
  } else if (!stillLate && started && status === "not_started") {
    status = "in_progress";
  }

  return { ...project, milestones, status, archived: project.archived };
}

export function syncProjectsSchedule(
  projects: Project[],
  today: Date = todayAtMidnight()
): Project[] {
  return projects.map((p) => applyScheduleSync(p, today));
}
