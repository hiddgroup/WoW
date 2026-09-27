"use client";

import type { Project, ProjectMember, ProjectView } from "@/lib/types";
import { CalendarView } from "./CalendarView";
import { GanttView } from "./GanttView";
import { ProjectListView } from "./ProjectListView";

interface ProjectSectionProps {
  projects: Project[];
  projectView: ProjectView;
  onViewChange: (view: ProjectView) => void;
  onOpenProject: (id: string) => void;
  calDate: Date;
  onCalDateChange: (d: Date) => void;
  ganttExpanded: Record<string, boolean>;
  onToggleGanttExpand: (id: string) => void;
  today: Date;
  membersLookup: ProjectMember[];
}

export function ProjectSection({
  projects,
  projectView,
  onViewChange,
  onOpenProject,
  calDate,
  onCalDateChange,
  ganttExpanded,
  onToggleGanttExpand,
  today,
  membersLookup,
}: ProjectSectionProps) {
  const viewBtn = (v: ProjectView, label: string) => (
    <button
      onClick={() => onViewChange(v)}
      className={`text-xs px-3 py-1.5 rounded-[7px] transition-all ${
        projectView === v
          ? "font-semibold bg-hub-primary text-hub-primary-foreground"
          : "font-medium bg-hub-surface text-hub-secondary"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="pt-5 sm:pt-7">
      <div className="flex items-center gap-2 sm:gap-2.5 mb-3 flex-wrap">
        <span className="text-[11px] font-bold text-hub-secondary uppercase tracking-widest">
          진행 중인 프로젝트
        </span>
        <span className="text-xs text-hub-muted">{projects.length}개</span>
        <div className="hidden sm:block flex-1 h-px bg-hub-border min-w-5" />
        <div className="flex gap-1 shrink-0 w-full sm:w-auto sm:ml-auto">
          {viewBtn("list", "리스트")}
          {viewBtn("gantt", "간트")}
          {viewBtn("calendar", "캘린더")}
        </div>
      </div>

      {projectView === "list" && (
        <ProjectListView
          projects={projects}
          onOpenProject={onOpenProject}
          membersLookup={membersLookup}
          today={today}
        />
      )}
      {projectView === "gantt" && (
        <GanttView
          projects={projects}
          ganttExpanded={ganttExpanded}
          onToggleExpand={onToggleGanttExpand}
          onOpenProject={onOpenProject}
          today={today}
          membersLookup={membersLookup}
        />
      )}
      {projectView === "calendar" && (
        <CalendarView
          projects={projects}
          calDate={calDate}
          onCalDateChange={onCalDateChange}
          onOpenProject={onOpenProject}
          today={today}
        />
      )}
    </div>
  );
}
