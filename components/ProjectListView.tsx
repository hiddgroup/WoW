"use client";

import { STATUS } from "@/lib/constants";
import type { Project, ProjectMember } from "@/lib/types";
import { fmt, getMemberNames, milestoneEnd, milestoneStart, isMilestoneActiveOn, isMilestoneOverdue, milestoneTimingLabel, milestoneTiming, parseDateDay } from "@/lib/utils";

interface ProjectListViewProps {
  projects: Project[];
  onOpenProject: (id: string) => void;
  membersLookup: ProjectMember[];
  today: Date;
}

export function ProjectListView({
  projects,
  onOpenProject,
  membersLookup,
  today,
}: ProjectListViewProps) {
  const sorted = [...projects].sort((a, b) => {
    const aEnd = a.end || a.start;
    const bEnd = b.end || b.start;
    return new Date(aEnd).getTime() - new Date(bEnd).getTime();
  });

  return (
    <>
      <div className="hidden md:grid grid-cols-[2fr_110px_1.5fr_1.5fr_120px] gap-3 px-4 py-2.5 bg-hub-surface rounded-t-[10px] border border-hub-border border-b-0">
        {["프로젝트", "기간", "진행 중인 Task", "다음 Task", "담당자"].map((h) => (
          <span
            key={h}
            className="text-[11px] font-bold text-hub-secondary tracking-wide"
          >
            {h}
          </span>
        ))}
      </div>
      <div className="bg-white rounded-b-[10px] md:rounded-t-none rounded-[10px] border border-hub-border overflow-hidden">
        {sorted.map((p) => {
          const sc = STATUS[p.status];
          const open = p.milestones
            .map((m, idx) => ({ m, idx }))
            .filter(({ m }) => !m.done)
            .sort(
              (a, b) =>
                parseDateDay(milestoneStart(a.m, p, a.idx)).getTime() -
                parseDateDay(milestoneStart(b.m, p, b.idx)).getTime()
            );

          let curIndex = open.findIndex(
            ({ m, idx }) =>
              isMilestoneActiveOn(m, p, idx, today) ||
              isMilestoneOverdue(m, p, idx, today)
          );
          if (curIndex < 0) curIndex = 0;

          const curEntry = open[curIndex] ?? null;
          const nxtEntry = open[curIndex + 1] ?? null;
          const cur = curEntry?.m ?? null;
          const nxt = nxtEntry?.m ?? null;

          return (
            <div
              key={p.id}
              onClick={() => onOpenProject(p.id)}
              className="grid grid-cols-1 md:grid-cols-[2fr_110px_1.5fr_1.5fr_120px] gap-2 md:gap-3 px-4 py-3 md:py-[11px] border-b border-[#F0F5EE] cursor-pointer transition-colors hover:bg-[#F7FAF5] items-start md:items-center"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ background: p.color }}
                />
                <div className="min-w-0">
                  <div className="font-semibold text-[13px] text-hub-text truncate">
                    {p.name}
                  </div>
                  <span
                    className="text-[10px] font-semibold px-1.5 py-0.5 rounded-[10px] inline-flex mt-0.5"
                    style={{ color: sc.color, background: sc.bg }}
                  >
                    {sc.label}
                  </span>
                </div>
              </div>
              <div className="text-[11px] text-hub-muted leading-snug md:block">
                <span className="md:hidden text-[10px] font-bold text-hub-secondary uppercase tracking-wide mr-2">
                  기간
                </span>
                <span>{fmt(p.start)}</span>
                <span className="mx-1 md:hidden">~</span>
                <span className="hidden md:block">{p.end ? `~ ${fmt(p.end)}` : "~ 미정"}</span>
                <span className="md:hidden">{p.end ? fmt(p.end) : "미정"}</span>
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-bold text-hub-secondary uppercase tracking-wide mb-0.5 md:hidden">
                  진행 중인 Task
                </div>
                <div className="text-xs font-medium text-hub-text truncate flex items-center gap-1.5">
                  <span className="truncate">{cur?.name ?? "—"}</span>
                  {cur && milestoneTiming(cur, today) === "delayed" && (
                    <span className="text-[10px] font-bold text-[#92400E] bg-[#FEF3C7] px-1.5 py-0.5 rounded-[10px] shrink-0">
                      {milestoneTimingLabel("delayed")}
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-hub-muted mt-px">
                  {cur && curEntry
                    ? `${fmt(milestoneStart(cur, p, curEntry.idx))} ~ ${fmt(milestoneEnd(cur))}`
                    : ""}
                </div>
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-bold text-hub-secondary uppercase tracking-wide mb-0.5 md:hidden">
                  다음 Task
                </div>
                <div className="text-xs text-hub-secondary truncate">
                  {nxt?.name ?? "—"}
                </div>
                <div className="text-[10px] text-hub-muted mt-px">
                  {nxt && nxtEntry
                    ? `${fmt(milestoneStart(nxt, p, nxtEntry.idx))} ~ ${fmt(milestoneEnd(nxt))}`
                    : ""}
                </div>
              </div>
              <div className="text-xs text-hub-secondary truncate">
                <span className="md:hidden text-[10px] font-bold text-hub-secondary uppercase tracking-wide mr-2">
                  담당자
                </span>
                {getMemberNames(p.members, membersLookup)}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
