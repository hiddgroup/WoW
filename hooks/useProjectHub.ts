"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { COLORS } from "@/lib/constants";
import { INITIAL_PROJECTS } from "@/lib/data";
import {
  fetchAllProfiles,
  fetchApprovedMembers,
  fetchProfile,
  fetchProjects,
  insertProjects,
  deleteProjectFromDb,
  signIn,
  signOut,
  signUp,
  restoreSession,
  updateProfileRole,
  updateProfileStatus,
  upsertProject,
} from "@/lib/supabase/api";
import { isSupabaseConfigured, getSupabase } from "@/lib/supabase/client";
import type {
  AppView,
  AuthUser,
  AuthView,
  KanbanItem,
  Milestone,
  Project,
  ProjectStatus,
  ProjectView,
} from "@/lib/types";
import {
  calcProgress,
  getWeekRange,
  getNextWeekRange,
  milestoneRangeFmt,
  milestoneEnd,
  milestoneStart,
  isMilestoneActiveOn,
  isMilestoneOverdue,
  milestoneOverlapsRange,
  milestoneCompletedInRange,
  parseDateDay,
  todayAtMidnight,
  formatDateInput,
  applyScheduleSync,
  scheduleNeedsPersist,
  syncProjectsSchedule,
} from "@/lib/utils";

export function useProjectHub() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [view, setView] = useState<AppView>("dashboard");
  const [selId, setSelId] = useState<string | null>(null);
  const [calDate, setCalDate] = useState(new Date());
  const [projectView, setProjectView] = useState<ProjectView>("list");
  const [showAddProject, setShowAddProject] = useState(false);
  const [showMsForm, setShowMsForm] = useState(false);
  const [showFileForm, setShowFileForm] = useState(false);
  const [ganttExpanded, setGanttExpanded] = useState<Record<string, boolean>>({});
  const [addForm, setAddForm] = useState({
    name: "",
    startDate: "",
    endDate: "",
    desc: "",
    color: COLORS[0],
  });
  const [newMsName, setNewMsName] = useState("");
  const [newMsStart, setNewMsStart] = useState("");
  const [newMsEnd, setNewMsEnd] = useState("");
  const [newFileName, setNewFileName] = useState("");
  const [newFileUrl, setNewFileUrl] = useState("");
  const [authUsers, setAuthUsers] = useState<AuthUser[]>([]);
  const [approvedMembers, setApprovedMembers] = useState<AuthUser[]>([]);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [authView, setAuthView] = useState<AuthView>("login");
  const [authForm, setAuthForm] = useState({
    name: "",
    email: "",
    password: "",
    error: "",
  });
  const [showUserPanel, setShowUserPanel] = useState(false);
  const [hydrated, setHydrated] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [configError] = useState(() => !isSupabaseConfigured());

  const loadProjectsForUser = useCallback(async (user: AuthUser) => {
    if (user.status !== "approved") return;

    let loaded = await fetchProjects();
    if (!loaded) return;
    if (loaded.length === 0) {
      await insertProjects(INITIAL_PROJECTS);
      loaded = INITIAL_PROJECTS;
    }

    const today = todayAtMidnight();
    const synced = syncProjectsSchedule(loaded, today);
    synced.forEach((project, i) => {
      if (scheduleNeedsPersist(loaded[i], project)) {
        void upsertProject(project);
      }
    });
    setProjects(synced);
  }, []);

  const loadAdminUsers = useCallback(async (user: AuthUser) => {
    if (user.role === "admin" && user.status === "approved") {
      const users = await fetchAllProfiles();
      setAuthUsers(users);
    }
  }, []);

  const loadApprovedMembers = useCallback(async (user: AuthUser) => {
    if (user.status !== "approved") {
      setApprovedMembers([]);
      return;
    }
    const members = await fetchApprovedMembers();
    setApprovedMembers(members);
  }, []);

  const refreshCurrentUser = useCallback(
    async (userId: string) => {
      const profile = await fetchProfile(userId);
      if (!profile) return;
      setCurrentUser(profile);
      await loadProjectsForUser(profile);
      await loadAdminUsers(profile);
      await loadApprovedMembers(profile);
    },
    [loadAdminUsers, loadApprovedMembers, loadProjectsForUser]
  );

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) {
      setSessionReady(true);
      return;
    }

    let mounted = true;

    void (async () => {
      try {
        const user = await restoreSession();
        if (!mounted || !user) return;
        setCurrentUser(user);
        void loadProjectsForUser(user);
        void loadAdminUsers(user);
        void loadApprovedMembers(user);
      } finally {
        if (mounted) setSessionReady(true);
      }
    })();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;

        if (event === "SIGNED_OUT") return;

        if (
          session?.user &&
          (event === "SIGNED_IN" ||
            event === "TOKEN_REFRESHED" ||
            event === "INITIAL_SESSION")
        ) {
          window.setTimeout(() => {
            if (!mounted) return;
            void refreshCurrentUser(session.user.id);
          }, 0);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loadAdminUsers, loadApprovedMembers, loadProjectsForUser, refreshCurrentUser]);

  const today = todayAtMidnight();

  useEffect(() => {
    if (!currentUser || currentUser.status !== "approved" || projects.length === 0) {
      return;
    }

    const syncDay = todayAtMidnight();
    setProjects((prev) => {
      let changed = false;
      const next = prev.map((project) => {
        const synced = applyScheduleSync(project, syncDay);
        if (scheduleNeedsPersist(project, synced)) {
          changed = true;
          void upsertProject(synced);
          return synced;
        }
        return project;
      });
      return changed ? next : prev;
    });
  }, [currentUser?.id, projects.length, today.getTime()]);

  const syncProject = useCallback((project: Project) => {
    void upsertProject(project);
  }, []);

  const updateProjects = useCallback(
    (fn: (p: Project) => Project) => {
      setProjects((prev) => {
        const next = prev.map(fn);
        for (let i = 0; i < next.length; i++) {
          if (JSON.stringify(next[i]) !== JSON.stringify(prev[i])) {
            syncProject(next[i]);
          }
        }
        return next;
      });
    },
    [syncProject]
  );

  const { wStart, wEnd } = useMemo(() => getWeekRange(today), [today.getTime()]);
  const { nwStart, nwEnd } = useMemo(() => getNextWeekRange(today), [today.getTime()]);

  const active = useMemo(
    () => projects.filter((p) => !p.archived),
    [projects]
  );
  const archived = useMemo(
    () => projects.filter((p) => p.archived),
    [projects]
  );

  const kanbanData = useMemo(() => {
    const kanbanToday: KanbanItem[] = [];
    const kanbanUpcoming: KanbanItem[] = [];
    const kanbanNextWeek: KanbanItem[] = [];

    active.forEach((proj) => {
      proj.milestones.forEach((m, idx) => {
        const item: KanbanItem = {
          ...m,
          projectId: proj.id,
          projectName: proj.name,
          projectColor: proj.color,
          rangeFmt: milestoneRangeFmt(proj, m, idx),
        };

        const overlapsThisWeek =
          milestoneOverlapsRange(m, proj, idx, wStart, wEnd) ||
          milestoneCompletedInRange(m, wStart, wEnd);
        if (overlapsThisWeek) {
          kanbanUpcoming.push(item);
        }

        if (m.done) return;

        const activeToday = isMilestoneActiveOn(m, proj, idx, today);
        const overdue = isMilestoneOverdue(m, proj, idx, today);
        const overlapsNextWeek = milestoneOverlapsRange(m, proj, idx, nwStart, nwEnd);

        if (activeToday || overdue) {
          kanbanToday.push(item);
        }

        if (overlapsNextWeek) {
          kanbanNextWeek.push(item);
        }
      });
    });

    const byEnd = (a: KanbanItem, b: KanbanItem) =>
      parseDateDay(milestoneEnd(a)).getTime() - parseDateDay(milestoneEnd(b)).getTime();

    kanbanToday.sort(byEnd);
    kanbanUpcoming.sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      return byEnd(a, b);
    });
    kanbanNextWeek.sort(byEnd);

    const taskKeys = new Set<string>();
    for (const item of [...kanbanToday, ...kanbanUpcoming, ...kanbanNextWeek]) {
      taskKeys.add(`${item.projectId}:${item.id}`);
    }

    return {
      kanbanToday,
      kanbanUpcoming,
      kanbanNextWeek,
      taskCount: taskKeys.size,
    };
  }, [active, today, wStart, wEnd, nwStart, nwEnd]);

  const signup = async () => {
    if (!authForm.name.trim() || !authForm.email.trim() || !authForm.password.trim()) {
      setAuthForm((f) => ({ ...f, error: "모든 항목을 입력해주세요" }));
      return;
    }
    if (authForm.password.length < 6) {
      setAuthForm((f) => ({ ...f, error: "비밀번호는 6자 이상이어야 합니다" }));
      return;
    }

    setAuthLoading(true);
    try {
      const result = await signUp(
        authForm.name,
        authForm.email,
        authForm.password
      );

      if (result.error) {
        setAuthForm((f) => ({ ...f, error: result.error! }));
        return;
      }

      if (result.needsEmailConfirm) {
        setAuthForm((f) => ({
          ...f,
          error: "",
          password: "",
          name: "",
          email: "",
        }));
        setAuthView("login");
        setAuthForm((f) => ({
          ...f,
          error: "가입이 완료되었습니다. 이메일 인증 후 로그인해주세요.",
        }));
        return;
      }

      if (result.user) {
        setCurrentUser(result.user);
        if (result.user.role === "admin" && result.user.status === "approved") {
          setAuthUsers([result.user]);
        }
        void loadProjectsForUser(result.user);
        void loadAdminUsers(result.user);
        void loadApprovedMembers(result.user);
      }
      setAuthForm({ name: "", email: "", password: "", error: "" });
    } catch {
      setAuthForm((f) => ({
        ...f,
        error: "가입 요청이 시간 초과되었습니다. 다시 시도해주세요.",
      }));
    } finally {
      setAuthLoading(false);
    }
  };

  const login = async () => {
    if (!authForm.email.trim() || !authForm.password.trim()) {
      setAuthForm((f) => ({ ...f, error: "이메일과 비밀번호를 입력해주세요" }));
      return;
    }

    setAuthLoading(true);
    try {
      const result = await signIn(authForm.email, authForm.password);

      if (result.error) {
        setAuthForm((f) => ({ ...f, error: result.error! }));
        return;
      }

      if (result.user) {
        setCurrentUser(result.user);
        if (result.user.role === "admin" && result.user.status === "approved") {
          setAuthUsers([result.user]);
        }
        void loadProjectsForUser(result.user);
        void loadAdminUsers(result.user);
        void loadApprovedMembers(result.user);
      }
      setAuthForm({ name: "", email: "", password: "", error: "" });
    } catch (e) {
      const message =
        e instanceof Error && e.message === "timeout"
          ? "로그인 요청이 시간 초과되었습니다. 다시 시도해주세요."
          : "로그인 중 오류가 발생했습니다. 다시 시도해주세요.";
      setAuthForm((f) => ({ ...f, error: message }));
    } finally {
      setAuthLoading(false);
    }
  };

  const logout = async () => {
    await signOut();
    setCurrentUser(null);
    setProjects([]);
    setAuthUsers([]);
    setApprovedMembers([]);
    setAuthView("login");
  };

  const approveUser = async (uid: string) => {
    const ok = await updateProfileStatus(uid, "approved");
    if (!ok) return;
    const users = await fetchAllProfiles();
    setAuthUsers(users);
    if (currentUser?.status === "approved") {
      const members = await fetchApprovedMembers();
      setApprovedMembers(members);
    }
  };

  const rejectUser = async (uid: string) => {
    const ok = await updateProfileStatus(uid, "rejected");
    if (!ok) return;
    const users = await fetchAllProfiles();
    setAuthUsers(users);
  };

  const grantAdmin = async (uid: string) => {
    const ok = await updateProfileRole(uid, "admin");
    if (!ok) return;
    const users = await fetchAllProfiles();
    setAuthUsers(users);
  };

  const toggleMs = (pid: string, mid: string) => {
    const todayStr = formatDateInput(today);
    updateProjects((p) =>
      p.id !== pid
        ? p
        : {
            ...p,
            milestones: p.milestones.map((m) => {
              if (m.id !== mid) return m;
              if (m.completedAt) return { ...m, done: false, completedAt: undefined };
              return { ...m, done: true, completedAt: todayStr };
            }),
          }
    );
  };

  const setMilestoneCompletedAt = (pid: string, mid: string, value: string) => {
    updateProjects((p) =>
      p.id !== pid
        ? p
        : {
            ...p,
            milestones: p.milestones.map((m) => {
              if (m.id !== mid) return m;
              if (!value) return { ...m, done: false, completedAt: undefined };
              return { ...m, done: true, completedAt: value };
            }),
          }
    );
  };

  const addMember = (pid: string, uid: string) => {
    updateProjects((p) => {
      if (p.id !== pid) return p;
      const members = p.members || [];
      if (members.includes(uid)) return p;
      return { ...p, members: [...members, uid] };
    });
  };

  const removeMember = (pid: string, uid: string) => {
    updateProjects((p) => {
      if (p.id !== pid) return p;
      return {
        ...p,
        members: (p.members || []).filter((m) => m !== uid),
      };
    });
  };

  const archiveProject = (pid: string) => {
    updateProjects((p) => (p.id !== pid ? p : { ...p, archived: true }));
    setSelId(null);
  };

  const restoreProject = (pid: string) => {
    updateProjects((p) => (p.id !== pid ? p : { ...p, archived: false }));
  };

  const deleteProject = (pid: string) => {
    if (
      !window.confirm(
        "프로젝트를 영구 삭제하시겠습니까?\n삭제된 데이터는 복구할 수 없습니다."
      )
    ) {
      return;
    }
    setProjects((prev) => prev.filter((p) => p.id !== pid));
    void deleteProjectFromDb(pid);
    if (selId === pid) setSelId(null);
  };

  const setNotes = (pid: string, notes: string) => {
    updateProjects((p) => (p.id !== pid ? p : { ...p, notes }));
  };

  const setStatus = (pid: string, status: ProjectStatus) => {
    updateProjects((p) => (p.id !== pid ? p : { ...p, status }));
  };

  const setProjectName = (pid: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    updateProjects((p) => (p.id !== pid ? p : { ...p, name: trimmed }));
  };

  const setMilestoneName = (pid: string, mid: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    updateProjects((p) =>
      p.id !== pid
        ? p
        : {
            ...p,
            milestones: p.milestones.map((m) =>
              m.id !== mid ? m : { ...m, name: trimmed }
            ),
          }
    );
  };

  const setMilestoneDate = (
    pid: string,
    mid: string,
    field: "start" | "end",
    value: string
  ) => {
    if (!value) return;
    updateProjects((p) =>
      p.id !== pid
        ? p
        : {
            ...p,
            milestones: p.milestones.map((m) => {
              if (m.id !== mid) return m;
              const updated = { ...m, [field]: value };
              const { due: _due, ...rest } = updated;
              return rest;
            }),
          }
    );
  };

  const addMilestoneAssignee = (pid: string, mid: string, uid: string) => {
    if (!uid) return;
    updateProjects((p) => {
      if (p.id !== pid) return p;
      return {
        ...p,
        milestones: p.milestones.map((m) => {
          if (m.id !== mid) return m;
          const assignees = m.assignees ?? [];
          if (assignees.includes(uid)) return m;
          return { ...m, assignees: [...assignees, uid] };
        }),
      };
    });
  };

  const removeMilestoneAssignee = (pid: string, mid: string, uid: string) => {
    updateProjects((p) => {
      if (p.id !== pid) return p;
      return {
        ...p,
        milestones: p.milestones.map((m) => {
          if (m.id !== mid) return m;
          const assignees = (m.assignees ?? []).filter((id) => id !== uid);
          if (assignees.length === 0) {
            const { assignees: _removed, ...rest } = m;
            return rest;
          }
          return { ...m, assignees };
        }),
      };
    });
  };

  const deleteMilestone = (pid: string, mid: string) => {
    const project = projects.find((p) => p.id === pid);
    const ms = project?.milestones.find((m) => m.id === mid);
    const label = ms?.name ? `"${ms.name}"` : "이 마일스톤";
    if (!window.confirm(`${label}을(를) 삭제하시겠습니까?`)) return;
    updateProjects((p) =>
      p.id !== pid
        ? p
        : { ...p, milestones: p.milestones.filter((m) => m.id !== mid) }
    );
  };

  const addMs = () => {
    if (!selId || !newMsName.trim() || !newMsStart || !newMsEnd) return;
    const ms = {
      id: "ms_" + Date.now(),
      name: newMsName.trim(),
      start: newMsStart,
      end: newMsEnd,
      done: false,
    };
    updateProjects((p) =>
      p.id !== selId ? p : { ...p, milestones: [...p.milestones, ms] }
    );
    setNewMsName("");
    setNewMsStart("");
    setNewMsEnd("");
    setShowMsForm(false);
  };

  const addFile = () => {
    if (!selId || !newFileName.trim() || !newFileUrl.trim()) return;
    const f = {
      id: "f_" + Date.now(),
      name: newFileName.trim(),
      url: newFileUrl.trim(),
    };
    updateProjects((p) =>
      p.id !== selId ? p : { ...p, files: [...(p.files || []), f] }
    );
    setNewFileName("");
    setNewFileUrl("");
    setShowFileForm(false);
  };

  const addProject = (opts?: {
    milestones?: Milestone[];
    members?: string[];
  }) => {
    if (!addForm.name.trim() || !addForm.startDate) return;
    const milestones = (opts?.milestones ?? []).map((m, i) => ({
      ...m,
      id: m.id || `ms_${Date.now()}_${i}`,
    }));
    const np: Project = {
      id: "p_" + Date.now(),
      name: addForm.name.trim(),
      desc: addForm.desc || "",
      start: addForm.startDate,
      end: addForm.endDate || "",
      status: "not_started",
      color: addForm.color || COLORS[projects.length % COLORS.length],
      milestones,
      notes: "",
      files: [],
      archived: false,
      members: opts?.members ?? [],
    };
    setProjects((prev) => [...prev, np]);
    void upsertProject(np);
    setShowAddProject(false);
    setAddForm({
      name: "",
      startDate: "",
      endDate: "",
      desc: "",
      color: COLORS[0],
    });
  };

  const importWbsToProject = (
    pid: string,
    milestones: Milestone[],
    mode: "replace" | "append",
    memberIds: string[] = []
  ) => {
    if (!pid || milestones.length === 0) return;
    const stamped = milestones.map((m, i) => ({
      ...m,
      id: m.id || `ms_wbs_${Date.now()}_${i}`,
    }));
    updateProjects((p) => {
      if (p.id !== pid) return p;
      const nextMs =
        mode === "replace" ? stamped : [...p.milestones, ...stamped];
      const members = Array.from(new Set([...(p.members || []), ...memberIds]));
      return { ...p, milestones: nextMs, members };
    });
  };

  const toggleGanttExpand = (pid: string) => {
    setGanttExpanded((prev) => ({ ...prev, [pid]: !prev[pid] }));
  };

  const openProject = (id: string) => {
    setSelId(id);
    setShowMsForm(false);
    setShowFileForm(false);
  };

  const selProj = selId ? projects.find((p) => p.id === selId) ?? null : null;
  const selProgress = selProj ? calcProgress(selProj.milestones) : null;

  const pendingCount = authUsers.filter((u) => u.status === "pending").length;
  const isLoggedIn = !!currentUser;
  const isApproved = isLoggedIn && currentUser.status === "approved";
  const isPending = isLoggedIn && currentUser.status === "pending";
  const isAdmin = isLoggedIn && currentUser.role === "admin";

  return {
    hydrated,
    configError,
    authLoading,
    projects,
    active,
    archived,
    view,
    setView,
    selId,
    setSelId,
    selProj,
    selProgress,
    calDate,
    setCalDate,
    projectView,
    setProjectView,
    showAddProject,
    setShowAddProject,
    showMsForm,
    setShowMsForm,
    showFileForm,
    setShowFileForm,
    ganttExpanded,
    toggleGanttExpand,
    addForm,
    setAddForm,
    newMsName,
    setNewMsName,
    newMsStart,
    setNewMsStart,
    newMsEnd,
    setNewMsEnd,
    newFileName,
    setNewFileName,
    newFileUrl,
    setNewFileUrl,
    authUsers,
    approvedMembers,
    currentUser,
    authView,
    setAuthView,
    authForm,
    setAuthForm,
    showUserPanel,
    setShowUserPanel: (open: boolean) => {
      setShowUserPanel(open);
      if (open && currentUser) {
        void loadAdminUsers(currentUser);
      }
    },
    today,
    wStart,
    wEnd,
    kanbanData,
    isLoggedIn,
    sessionReady,
    isApproved,
    isPending,
    isAdmin,
    pendingCount,
    signup,
    login,
    logout,
    approveUser,
    rejectUser,
    grantAdmin,
    toggleMs,
    setMilestoneCompletedAt,
    addMember,
    removeMember,
    archiveProject,
    restoreProject,
    deleteProject,
    setNotes,
    setStatus,
    setProjectName,
    setMilestoneName,
    setMilestoneDate,
    addMilestoneAssignee,
    removeMilestoneAssignee,
    deleteMilestone,
    addMs,
    addFile,
    addProject,
    importWbsToProject,
    openProject,
  };
}
