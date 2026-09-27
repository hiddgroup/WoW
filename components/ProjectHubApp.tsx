"use client";

import { useMemo } from "react";
import { ArchiveView } from "@/components/ArchiveView";
import { AuthScreen, PendingScreen } from "@/components/AuthScreen";
import { Header } from "@/components/Header";
import { KanbanBoard } from "@/components/KanbanBoard";
import {
  AddProjectModal,
  ProjectModal,
  UserPanel,
} from "@/components/Modals";
import { ProjectSection } from "@/components/ProjectSection";
import { useProjectHub } from "@/hooks/useProjectHub";
import { toProjectMember, getNextWeekRange } from "@/lib/utils";

export default function ProjectHubApp() {
  const hub = useProjectHub();
  const projectMembers = useMemo(
    () => hub.approvedMembers.map(toProjectMember),
    [hub.approvedMembers]
  );

  if (hub.configError) {
    const isLocal =
      typeof window !== "undefined" &&
      (window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1");

    return (
      <div className="min-h-screen bg-hub-bg flex items-center justify-center p-4 sm:p-6">
        <div className="bg-white rounded-[20px] p-6 sm:p-10 w-full max-w-[480px] shadow-[0_8px_40px_rgba(26,46,30,0.12)]">
          <div className="text-[17px] font-bold text-hub-text mb-3 text-center">
            Supabase 설정 필요
          </div>
          {isLocal ? (
            <p className="text-sm text-hub-secondary leading-relaxed text-center">
              <code className="text-xs bg-hub-bg px-1.5 py-0.5 rounded">.env.local</code>에
              Supabase URL과 anon key를 입력한 뒤{" "}
              <strong className="font-semibold text-hub-text">개발 서버를 재시작</strong>
              해주세요.
            </p>
          ) : (
            <div className="text-sm text-hub-secondary leading-relaxed space-y-3">
              <p>
                Vercel 배포 환경에 Supabase 환경 변수가 없거나, 변수 추가 후{" "}
                <strong className="font-semibold text-hub-text">재배포</strong>가 되지
                않았습니다.
              </p>
              <ol className="list-decimal list-inside space-y-1.5 text-[13px]">
                <li>Vercel → Project → Settings → Environment Variables</li>
                <li>
                  <code className="text-xs bg-hub-bg px-1 py-0.5 rounded">
                    NEXT_PUBLIC_SUPABASE_URL
                  </code>
                  ,{" "}
                  <code className="text-xs bg-hub-bg px-1 py-0.5 rounded">
                    NEXT_PUBLIC_SUPABASE_ANON_KEY
                  </code>{" "}
                  등록
                </li>
                <li>Deployments → 최신 배포 → Redeploy</li>
              </ol>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!hub.sessionReady) {
    return <div className="min-h-screen bg-hub-bg" />;
  }

  if (!hub.isLoggedIn) {
    return (
      <AuthScreen
        authView={hub.authView}
        authForm={hub.authForm}
        onNameChange={(v) =>
          hub.setAuthForm((f) => ({ ...f, name: v, error: "" }))
        }
        onEmailChange={(v) =>
          hub.setAuthForm((f) => ({ ...f, email: v, error: "" }))
        }
        onPasswordChange={(v) =>
          hub.setAuthForm((f) => ({ ...f, password: v, error: "" }))
        }
        onLogin={hub.login}
        onSignup={hub.signup}
        authLoading={hub.authLoading}
        onGoLogin={() => {
          hub.setAuthView("login");
          hub.setAuthForm({ name: "", email: "", password: "", error: "" });
        }}
        onGoSignup={() => {
          hub.setAuthView("signup");
          hub.setAuthForm({ name: "", email: "", password: "", error: "" });
        }}
      />
    );
  }

  if (hub.isPending) {
    return (
      <PendingScreen
        userName={hub.currentUser?.name ?? ""}
        onLogout={hub.logout}
      />
    );
  }

  const todayStr = hub.today.toLocaleDateString("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short",
  });
  const todayShortStr = hub.today.toLocaleDateString("ko-KR", {
    month: "short",
    day: "numeric",
  });
  const weekStr = `${hub.wStart.getMonth() + 1}/${hub.wStart.getDate()} ~ ${hub.wEnd.getMonth() + 1}/${hub.wEnd.getDate()}`;
  const { nwStart, nwEnd } = getNextWeekRange(hub.today);
  const nextWeekStr = `${nwStart.getMonth() + 1}/${nwStart.getDate()} ~ ${nwEnd.getMonth() + 1}/${nwEnd.getDate()}`;

  return (
    <div className="min-h-screen bg-hub-bg text-hub-text overflow-x-hidden">
      <Header
        view={hub.view}
        todayStr={todayStr}
        currentUserName={hub.currentUser?.name ?? ""}
        isAdmin={hub.isAdmin}
        pendingCount={hub.pendingCount}
        onViewChange={hub.setView}
        onOpenUserPanel={() => hub.setShowUserPanel(true)}
        onLogout={hub.logout}
        onAddProject={() => hub.setShowAddProject(true)}
      />

      <main className="px-4 sm:px-6 lg:px-7 pb-10 sm:pb-16 max-w-[1440px] mx-auto w-full">
        {hub.view === "dashboard" && (
          <>
            <KanbanBoard
              kanbanToday={hub.kanbanData.kanbanToday}
              kanbanUpcoming={hub.kanbanData.kanbanUpcoming}
              kanbanNextWeek={hub.kanbanData.kanbanNextWeek}
              weekStr={weekStr}
              nextWeekStr={nextWeekStr}
              todayShortStr={todayShortStr}
              taskCount={hub.kanbanData.taskCount}
              onOpenProject={hub.openProject}
              onToggleMs={hub.toggleMs}
              membersLookup={projectMembers}
            />
            <ProjectSection
              projects={hub.active}
              projectView={hub.projectView}
              onViewChange={hub.setProjectView}
              onOpenProject={hub.openProject}
              calDate={hub.calDate}
              onCalDateChange={hub.setCalDate}
              ganttExpanded={hub.ganttExpanded}
              onToggleGanttExpand={hub.toggleGanttExpand}
              today={hub.today}
              membersLookup={projectMembers}
            />
          </>
        )}

        {hub.view === "archive" && (
          <ArchiveView
            projects={hub.archived}
            onRestore={hub.restoreProject}
            onDelete={hub.deleteProject}
            membersLookup={projectMembers}
          />
        )}
      </main>

      <ProjectModal
        project={hub.selProj}
        today={hub.today}
        showMsForm={hub.showMsForm}
        showFileForm={hub.showFileForm}
        newMsName={hub.newMsName}
        newMsStart={hub.newMsStart}
        newMsEnd={hub.newMsEnd}
        newFileName={hub.newFileName}
        newFileUrl={hub.newFileUrl}
        onClose={() => hub.setSelId(null)}
        onArchive={() => hub.selId && hub.archiveProject(hub.selId)}
        onDelete={() => hub.selId && hub.deleteProject(hub.selId)}
        onAddMember={(uid) => hub.selId && hub.addMember(hub.selId, uid)}
        onRemoveMember={(uid) => hub.selId && hub.removeMember(hub.selId, uid)}
        approvedMembers={projectMembers}
        onStatusChange={(status) => hub.selId && hub.setStatus(hub.selId, status)}
        onProjectNameChange={(name) => hub.selId && hub.setProjectName(hub.selId, name)}
        onMilestoneNameChange={(mid, name) =>
          hub.selId && hub.setMilestoneName(hub.selId, mid, name)
        }
        onMilestoneDateChange={(mid, field, value) =>
          hub.selId && hub.setMilestoneDate(hub.selId, mid, field, value)
        }
        onMilestoneCompletedAtChange={(mid, value) =>
          hub.selId && hub.setMilestoneCompletedAt(hub.selId, mid, value)
        }
        onAddMilestoneAssignee={(mid, userId) =>
          hub.selId && hub.addMilestoneAssignee(hub.selId, mid, userId)
        }
        onRemoveMilestoneAssignee={(mid, userId) =>
          hub.selId && hub.removeMilestoneAssignee(hub.selId, mid, userId)
        }
        onDeleteMilestone={(mid) =>
          hub.selId && hub.deleteMilestone(hub.selId, mid)
        }
        onToggleMs={(mid) => hub.selId && hub.toggleMs(hub.selId, mid)}
        onNotesChange={(notes) => hub.selId && hub.setNotes(hub.selId, notes)}
        onOpenMsForm={() => {
          const p = hub.selProj;
          if (p) {
            const last = p.milestones[p.milestones.length - 1];
            hub.setNewMsStart(last ? last.end : p.start);
          }
          hub.setShowMsForm(true);
        }}
        onCancelMsForm={() => {
          hub.setShowMsForm(false);
          hub.setNewMsName("");
          hub.setNewMsStart("");
          hub.setNewMsEnd("");
        }}
        onSubmitMs={hub.addMs}
        onMsNameChange={hub.setNewMsName}
        onMsStartChange={hub.setNewMsStart}
        onMsEndChange={hub.setNewMsEnd}
        onOpenFileForm={() => hub.setShowFileForm(true)}
        onCancelFileForm={() => {
          hub.setShowFileForm(false);
          hub.setNewFileName("");
          hub.setNewFileUrl("");
        }}
        onSubmitFile={hub.addFile}
        onFileNameChange={hub.setNewFileName}
        onFileUrlChange={hub.setNewFileUrl}
        onImportWbs={(milestones, mode, memberIds) => {
          if (!hub.selId) return;
          hub.importWbsToProject(hub.selId, milestones, mode, memberIds);
        }}
      />

      <AddProjectModal
        open={hub.showAddProject}
        form={hub.addForm}
        approvedMembers={projectMembers}
        onClose={() => {
          hub.setShowAddProject(false);
          hub.setAddForm({
            name: "",
            startDate: "",
            endDate: "",
            desc: "",
            color: hub.addForm.color,
          });
        }}
        onChange={(field, value) =>
          hub.setAddForm((f) => ({ ...f, [field]: value }))
        }
        onSubmit={hub.addProject}
      />

      <UserPanel
        open={hub.showUserPanel}
        users={hub.authUsers}
        onClose={() => hub.setShowUserPanel(false)}
        onApprove={hub.approveUser}
        onReject={hub.rejectUser}
        onGrantAdmin={hub.grantAdmin}
      />
    </div>
  );
}
