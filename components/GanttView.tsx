"use client";

import { useLayoutEffect, useRef, useState, useEffect } from "react";
import {
  GANTT_DAY_W,
  GANTT_LABEL_W,
  GANTT_MS_ROW_H,
  GANTT_ROW_H,
  STATUS,
} from "@/lib/constants";
import type { Project } from "@/lib/types";
import { calcProgress, milestoneEnd, milestoneStart, milestoneTiming, projectEffectiveEnd } from "@/lib/utils";

interface GanttViewProps {
  projects: Project[];
  ganttExpanded: Record<string, boolean>;
  onToggleExpand: (id: string) => void;
  onOpenProject: (id: string) => void;
  today: Date;
}

export function GanttView({
  projects,
  ganttExpanded,
  onToggleExpand,
  onOpenProject,
  today,
}: GanttViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [labelW, setLabelW] = useState(GANTT_LABEL_W);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setLabelW(mq.matches ? 132 : GANTT_LABEL_W);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  let gMinD = projects.length
    ? new Date(
        Math.min(
          ...projects.map((p) => new Date(p.start + "T00:00:00").getTime())
        )
      )
    : new Date(today);
  let gMaxD = projects.length
    ? new Date(
        Math.max(
          ...projects.map((p) =>
            new Date(projectEffectiveEnd(p, today) + "T00:00:00").getTime()
          )
        )
      )
    : new Date(today);

  gMinD = new Date(gMinD);
  gMinD.setDate(gMinD.getDate() - 14);
  gMaxD = new Date(gMaxD);
  gMaxD.setDate(gMaxD.getDate() + 21);

  const gTotalDays = Math.ceil((gMaxD.getTime() - gMinD.getTime()) / 86400000);
  const gTimelineW = gTotalDays * GANTT_DAY_W;
  const gTodayX = Math.ceil((today.getTime() - gMinD.getTime()) / 86400000) * GANTT_DAY_W;
  const anyExpanded = Object.values(ganttExpanded).some(Boolean);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const todayLeft = labelW + gTodayX;
    const target = todayLeft - el.clientWidth / 2;
    const maxScroll = el.scrollWidth - el.clientWidth;
    el.scrollLeft = Math.max(0, Math.min(target, maxScroll));
  }, [gTodayX, projects.length, anyExpanded, labelW]);

  const months: { label: string; left: number }[] = [];
  const gMC = new Date(gMinD.getFullYear(), gMinD.getMonth(), 1);
  while (gMC <= gMaxD) {
    const off = Math.max(
      0,
      Math.ceil((gMC.getTime() - gMinD.getTime()) / 86400000)
    );
    months.push({
      label: gMC.toLocaleDateString("ko-KR", { year: "numeric", month: "short" }),
      left: off * GANTT_DAY_W,
    });
    gMC.setMonth(gMC.getMonth() + 1);
  }

  let totalH = 0;
  projects.forEach((p) => {
    totalH += GANTT_ROW_H;
    if (ganttExpanded[p.id]) totalH += p.milestones.length * GANTT_MS_ROW_H;
  });

  return (
    <div>
      <div className="flex items-center gap-2.5 mt-3.5 mb-3.5">
        <span className="text-[11px] font-bold text-hub-secondary uppercase tracking-widest">
          간트 차트
        </span>
        <div className="flex-1 h-px bg-hub-border" />
        <span className="text-xs text-hub-muted">{projects.length}개 프로젝트</span>
      </div>

      <div className="rounded-xl border border-hub-border overflow-hidden bg-white">
        <div
          ref={scrollRef}
          className="overflow-x-auto overflow-y-auto max-h-[calc(100dvh-280px)] sm:max-h-[calc(100vh-220px)] scrollbar-hub -webkit-overflow-scrolling-touch"
        >
          <div style={{ minWidth: labelW + gTimelineW }} className="relative">
            {/* Header */}
            <div className="flex h-9 border-b-2 border-hub-border bg-[#F7FAF5] sticky top-0 z-20">
              <div
                className="shrink-0 sticky left-0 z-30 bg-hub-surface flex items-center px-4 border-r border-hub-border"
                style={{ width: labelW }}
              >
                <span className="text-[11px] font-bold text-hub-secondary">프로젝트</span>
              </div>
              <div
                className="relative shrink-0 h-full overflow-hidden"
                style={{ width: gTimelineW }}
              >
                {months.map((m) => (
                  <div key={m.left}>
                    <div
                      className="absolute top-0 bottom-0 w-px bg-hub-border pointer-events-none"
                      style={{ left: m.left }}
                    />
                    <span
                      className="absolute top-1/2 -translate-y-1/2 text-[11px] font-semibold text-hub-secondary whitespace-nowrap pointer-events-none"
                      style={{ left: m.left + 6 }}
                    >
                      {m.label}
                    </span>
                  </div>
                ))}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-hub-primary opacity-60 pointer-events-none"
                  style={{ left: gTodayX }}
                />
                <span
                  className="absolute top-1.5 text-[9px] font-bold text-hub-primary whitespace-nowrap bg-hub-surface px-1 rounded-sm"
                  style={{ left: gTodayX - 14 }}
                >
                  오늘
                </span>
              </div>
            </div>

            {/* Content */}
            <div className="relative">
              <div
                className="absolute top-0 w-0.5 bg-hub-primary opacity-50 z-[15] pointer-events-none"
                style={{
                  left: labelW + gTodayX,
                  height: Math.max(GANTT_ROW_H, totalH),
                }}
              />

              {projects.map((p, ri) => {
                const sd = new Date(p.start + "T00:00:00");
                const ed = new Date(projectEffectiveEnd(p, today) + "T00:00:00");
                const bl =
                  Math.max(0, Math.ceil((sd.getTime() - gMinD.getTime()) / 86400000)) *
                  GANTT_DAY_W;
                const bw = Math.max(
                  GANTT_DAY_W * 2,
                  (Math.ceil((ed.getTime() - sd.getTime()) / 86400000) + 1) * GANTT_DAY_W
                );
                const { progress } = calcProgress(p.milestones);
                const sc = STATUS[p.status];
                const isExpanded = !!ganttExpanded[p.id];
                const isHL = !anyExpanded || isExpanded;
                const rowBg = ri % 2 === 0 ? "white" : "#FAFBF9";

                return (
                  <div key={p.id}>
                    <div
                      className="flex items-center border-b border-[#F0F5EE]"
                      style={{ height: GANTT_ROW_H, background: rowBg }}
                    >
                      <div
                        className="shrink-0 sticky left-0 z-10 h-full flex items-center gap-1.5 px-3 border-r border-hub-border cursor-pointer"
                        style={{ width: labelW, background: rowBg }}
                        onClick={() => onToggleExpand(p.id)}
                      >
                        <button
                          className="w-[18px] h-[18px] flex items-center justify-center shrink-0 transition-transform"
                          style={{
                            color: isHL ? "#8FAE94" : "#CCCCCC",
                            transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
                          }}
                        >
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                            <path
                              d="M3 2l4 3-4 3"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </button>
                        <div
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ background: isHL ? p.color : "#D0D0D0" }}
                        />
                        <div className="min-w-0 flex-1" style={{ color: isHL ? "#1A2E1E" : "#C0C0C0" }}>
                          <div className="text-[13px] font-medium truncate">{p.name}</div>
                          <span
                            className="text-[10px] font-semibold px-1 py-px rounded-lg inline-block mt-0.5"
                            style={{
                              color: isHL ? sc.color : "#AAAAAA",
                              background: isHL ? sc.bg : "#F0F0F0",
                            }}
                          >
                            {sc.label}
                          </span>
                        </div>
                      </div>
                      <div
                        className="relative shrink-0 h-full transition-[filter] duration-200"
                        style={{
                          width: gTimelineW,
                          filter: isHL ? "none" : "grayscale(1) opacity(0.2)",
                        }}
                      >
                        <div
                          className="absolute top-1/2 -translate-y-1/2 h-[18px] rounded-[9px] cursor-pointer overflow-visible z-[1]"
                          style={{
                            left: bl,
                            width: bw,
                            background: p.color + "33",
                          }}
                          onClick={() => onOpenProject(p.id)}
                        >
                          <div
                            className="absolute left-0 top-0 h-full rounded-[9px] opacity-85"
                            style={{ width: `${progress}%`, background: p.color }}
                          />
                          {p.milestones.map((m) => {
                            const mx =
                              Math.ceil(
                                (new Date(milestoneEnd(m) + "T00:00:00").getTime() - gMinD.getTime()) /
                                  86400000
                              ) * GANTT_DAY_W;
                            return (
                              <div
                                key={m.id}
                                title={m.name}
                                className="absolute w-2.5 h-2.5 rounded-full z-[3]"
                                style={{
                                  left: Math.max(-4, mx - bl - 5),
                                  top: 4,
                                  background: m.done ? "#40916C" : "white",
                                  border: `2px solid ${m.done ? "#C9A83D" : p.color}`,
                                  boxShadow: "0 0 0 1.5px white",
                                }}
                              />
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {isExpanded &&
                      p.milestones.map((m, mi) => {
                        const msSD = new Date(
                          milestoneStart(m, p, mi) + "T00:00:00"
                        );
                        const msED = new Date(milestoneEnd(m) + "T00:00:00");
                        const msBL =
                          Math.max(
                            0,
                            Math.ceil((msSD.getTime() - gMinD.getTime()) / 86400000)
                          ) * GANTT_DAY_W;
                        const msBW = Math.max(
                          GANTT_DAY_W,
                          (Math.ceil((msED.getTime() - msSD.getTime()) / 86400000) + 1) *
                            GANTT_DAY_W
                        );
                        const timing = milestoneTiming(m, today);
                        const isIP =
                          timing === "scheduled" && today >= msSD && today <= msED;
                        const isOD = timing === "delayed";
                        const msBg = m.done
                          ? "#F0FDF4"
                          : isIP
                            ? "#FFFBF0"
                            : "#F8F9FF";

                        return (
                          <div
                            key={m.id}
                            className="flex items-center border-b border-[#F0F5EE]"
                            style={{ height: GANTT_MS_ROW_H, background: msBg }}
                          >
                            <div
                              className="shrink-0 sticky left-0 z-10 h-full flex items-center gap-1.5 pl-10 pr-3 border-r border-hub-border"
                              style={{ width: labelW, background: msBg }}
                            >
                              <div
                                className="w-[7px] h-[7px] rounded-full shrink-0"
                                style={{
                                  background: m.done
                                    ? "#40916C"
                                    : isIP
                                      ? "#E8A838"
                                      : isOD
                                        ? "#D4685A"
                                        : "#C8DCC0",
                                }}
                              />
                              <div className="min-w-0 flex-1 flex items-center gap-1">
                                <span className="text-xs text-hub-text truncate flex-1">
                                  {m.name}
                                </span>
                                {isIP && (
                                  <span className="text-[9px] font-bold text-hub-today-text bg-amber-100 px-1 py-px rounded-lg shrink-0">
                                    진행 중
                                  </span>
                                )}
                                {isOD && (
                                  <span className="text-[9px] font-bold text-[#92400E] bg-[#FEF3C7] px-1 py-px rounded-lg shrink-0">
                                    지연
                                  </span>
                                )}
                                {timing === "done_late" && (
                                  <span className="text-[9px] font-bold text-[#92400E] bg-[#FEF3C7] px-1 py-px rounded-lg shrink-0">
                                    지연 완료
                                  </span>
                                )}
                              </div>
                            </div>
                            <div
                              className="relative shrink-0 h-full"
                              style={{ width: gTimelineW }}
                            >
                              <div
                                className="absolute top-1/2 -translate-y-1/2 h-2.5 rounded-[5px]"
                                style={{
                                  left: msBL,
                                  width: msBW,
                                  background: m.done ? "#40916C" : p.color,
                                  opacity: m.done ? 0.7 : isIP ? 1 : 0.4,
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
