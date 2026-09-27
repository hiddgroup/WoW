"use client";

import type { KanbanItem, ProjectMember } from "@/lib/types";
import { milestoneTiming, milestoneTimingLabel } from "@/lib/utils";
import { MemberAvatars } from "./Avatar";
import { CheckIcon } from "./icons";

interface KanbanBoardProps {
  kanbanToday: KanbanItem[];
  kanbanUpcoming: KanbanItem[];
  kanbanNextWeek: KanbanItem[];
  weekStr: string;
  nextWeekStr: string;
  todayShortStr: string;
  taskCount: number;
  onOpenProject: (id: string) => void;
  onToggleMs: (projectId: string, msId: string) => void;
  membersLookup: ProjectMember[];
}

type KanbanVariant = "today" | "upcoming" | "nextWeek";

const variantStyles: Record<
  KanbanVariant,
  {
    panel: string;
    dot: string;
    title: string;
    badge: string;
    date: string;
    empty: string;
  }
> = {
  today: {
    panel: "bg-hub-today-bg border-hub-today-border",
    dot: "bg-hub-today-accent",
    title: "text-hub-today-text",
    badge: "text-hub-today-text bg-amber-100",
    date: "text-[#B8953A]",
    empty: "text-[#C8AC78]",
  },
  upcoming: {
    panel: "bg-hub-upcoming-bg border-hub-upcoming-border",
    dot: "bg-hub-upcoming-accent",
    title: "text-hub-upcoming-text",
    badge: "text-hub-upcoming-text bg-blue-100",
    date: "text-[#7A9AD8]",
    empty: "text-[#93A8D8]",
  },
  nextWeek: {
    panel: "bg-hub-nextweek-bg border-hub-nextweek-border",
    dot: "bg-hub-nextweek-accent",
    title: "text-hub-nextweek-text",
    badge: "text-hub-nextweek-text bg-green-100",
    date: "text-[#40916C]",
    empty: "text-[#7BAF8E]",
  },
};

function KanbanCard({
  item,
  variant,
  membersLookup,
  onOpen,
  onToggle,
}: {
  item: KanbanItem;
  variant: KanbanVariant;
  membersLookup: ProjectMember[];
  onOpen: () => void;
  onToggle: () => void;
}) {
  const styles = variantStyles[variant];
  const timing = item.done ? milestoneTiming(item) : null;
  const doneLabel =
    timing === "done" || timing === "done_late"
      ? milestoneTimingLabel(timing)
      : item.done
        ? "완료"
        : null;
  const doneStyle =
    timing === "done_late"
      ? { color: "#92400E", background: "#FEF3C7" }
      : { color: "#166534", background: "#DCFCE7" };
  const borderColor =
    variant === "today"
      ? "border-hub-today-border"
      : variant === "upcoming"
        ? "border-hub-upcoming-border"
        : "border-hub-nextweek-border";

  return (
    <div
      className={`bg-white rounded-lg border ${borderColor} px-2.5 py-2 flex items-center gap-2`}
    >
      <div className="flex-1 min-w-0 cursor-pointer" onClick={onOpen}>
        <div className="flex items-center gap-1.5 mb-0.5">
          <div
            className="w-1.5 h-1.5 rounded-full shrink-0"
            style={{ background: item.projectColor }}
          />
          <span className="text-xs text-hub-muted truncate">{item.projectName}</span>
        </div>
        <div className="flex items-center gap-1.5 min-w-0">
          <div
            className={`text-sm leading-snug truncate ${
              item.done
                ? "font-normal text-hub-muted line-through"
                : "font-semibold text-hub-text"
            }`}
          >
            {item.name}
          </div>
          {doneLabel && (
            <span
              className="text-[10px] font-bold px-1.5 py-0.5 rounded-[10px] shrink-0"
              style={doneStyle}
            >
              {doneLabel}
            </span>
          )}
        </div>
        <div className={`text-[10px] mt-0.5 ${styles.date}`}>{item.rangeFmt}</div>
      </div>
      {(item.assignees?.length ?? 0) > 0 && (
        <MemberAvatars
          memberIds={item.assignees ?? []}
          membersLookup={membersLookup}
          size="sm"
        />
      )}
      <button
        onClick={onToggle}
        className="w-[18px] h-[18px] rounded-full shrink-0 flex items-center justify-center transition-all mt-px"
        style={{
          border: `1.5px solid ${item.done ? "#40916C" : "#C8DCC0"}`,
          background: item.done ? "#40916C" : "transparent",
        }}
      >
        {item.done && <CheckIcon />}
      </button>
    </div>
  );
}

function KanbanColumn({
  title,
  subtitle,
  items,
  variant,
  emptyLabel,
  membersLookup,
  onOpenProject,
  onToggleMs,
}: {
  title: string;
  subtitle?: string;
  items: KanbanItem[];
  variant: KanbanVariant;
  emptyLabel: string;
  membersLookup: ProjectMember[];
  onOpenProject: (id: string) => void;
  onToggleMs: (projectId: string, msId: string) => void;
}) {
  const styles = variantStyles[variant];

  return (
    <div className={`rounded-xl p-3 border ${styles.panel}`}>
      <div className="flex items-center gap-1.5 mb-2.5">
        <div className={`w-[7px] h-[7px] rounded-full shrink-0 ${styles.dot}`} />
        <span className={`text-xs font-bold ${styles.title}`}>{title}</span>
        {subtitle && <span className={`text-[11px] ${styles.date}`}>{subtitle}</span>}
        <div className="flex-1" />
        <span
          className={`text-[11px] font-semibold px-1.5 py-px rounded-[10px] ${styles.badge}`}
        >
          {items.length}
        </span>
      </div>
      <div className="flex flex-col gap-1.5 min-h-[120px]">
        {items.length === 0 ? (
          <div className={`text-center py-7 text-xs ${styles.empty}`}>{emptyLabel}</div>
        ) : (
          items.map((item) => (
            <KanbanCard
              key={`${item.projectId}-${item.id}`}
              item={item}
              variant={variant}
              membersLookup={membersLookup}
              onOpen={() => onOpenProject(item.projectId)}
              onToggle={() => onToggleMs(item.projectId, item.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

export function KanbanBoard({
  kanbanToday,
  kanbanUpcoming,
  kanbanNextWeek,
  weekStr,
  nextWeekStr,
  todayShortStr,
  taskCount,
  onOpenProject,
  onToggleMs,
  membersLookup,
}: KanbanBoardProps) {
  return (
    <div className="pt-4 sm:pt-[26px]">
      <div className="flex items-center gap-2 sm:gap-2.5 mb-3.5 flex-wrap">
        <span className="text-[11px] font-bold text-hub-secondary uppercase tracking-widest">
          할 일
        </span>
        <span className="text-xs text-hub-muted">{weekStr}</span>
        <div className="hidden sm:block flex-1 h-px bg-hub-border" />
        <span className="text-xs text-hub-muted sm:ml-auto">{taskCount}개 마일스톤</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
        <KanbanColumn
          title="오늘 진행 중"
          subtitle={todayShortStr}
          items={kanbanToday}
          variant="today"
          emptyLabel="진행 중인 Task 없음"
          membersLookup={membersLookup}
          onOpenProject={onOpenProject}
          onToggleMs={onToggleMs}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <KanbanColumn
            title="이번 주 진행"
            items={kanbanUpcoming}
            variant="upcoming"
            emptyLabel="이번 주 Task 없음"
            membersLookup={membersLookup}
            onOpenProject={onOpenProject}
            onToggleMs={onToggleMs}
          />
          <KanbanColumn
            title="다음 주 예정"
            subtitle={nextWeekStr}
            items={kanbanNextWeek}
            variant="nextWeek"
            emptyLabel="예정된 Task 없음"
            membersLookup={membersLookup}
            onOpenProject={onOpenProject}
            onToggleMs={onToggleMs}
          />
        </div>
      </div>
    </div>
  );
}
