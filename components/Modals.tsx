"use client";

import { useEffect, useMemo, useState } from "react";
import { COLORS, STATUS } from "@/lib/constants";
import type { Milestone, Project, ProjectMember, ProjectStatus } from "@/lib/types";
import { resolveProjectMembers, milestoneStart, milestoneEnd, formatProjectRange, milestoneTiming, milestoneTimingLabel } from "@/lib/utils";
import { fmt } from "@/lib/utils";
import { matchMemberIds, milestonesWithOwners } from "@/lib/wbs/matchMembers";
import type { WbsImportResult } from "@/lib/wbs/types";
import { FileIcon } from "./icons";
import {
  WbsFilePicker,
  WbsImportPanel,
  type WbsImportMode,
} from "./WbsImportPanel";

function InlineEditableName({
  value,
  onChange,
  className = "",
  placeholder = "이름 입력",
}: {
  value: string;
  onChange: (name: string) => void;
  className?: string;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== value) {
      onChange(trimmed);
    } else {
      setDraft(value);
    }
  };

  return (
    <input
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
        if (e.key === "Escape") {
          setDraft(value);
          e.currentTarget.blur();
        }
      }}
      placeholder={placeholder}
      className={`w-full bg-transparent outline-none border border-transparent rounded-md px-1 -mx-1 focus:border-hub-border focus:bg-white ${className}`}
    />
  );
}

function MilestoneAssignees({
  assigneeIds,
  approvedMembers,
  onAdd,
  onRemove,
}: {
  assigneeIds: string[];
  approvedMembers: ProjectMember[];
  onAdd: (userId: string) => void;
  onRemove: (userId: string) => void;
}) {
  const assigned = resolveProjectMembers(assigneeIds, approvedMembers);
  const available = approvedMembers.filter((member) => !assigneeIds.includes(member.id));

  return (
    <div className="flex items-center gap-1.5 flex-wrap pl-7">
      <span className="text-[10px] font-semibold text-hub-muted">담당</span>
      {assigned.map((member) => (
        <span
          key={member.id}
          className="inline-flex items-center gap-1 text-[11px] bg-white border border-hub-border rounded-full pl-1 pr-1 py-0.5"
        >
          <span
            className="w-4 h-4 rounded-full text-white text-[8px] font-bold flex items-center justify-center"
            style={{ background: member.color }}
          >
            {member.name[0]}
          </span>
          {member.name}
          <button
            type="button"
            onClick={() => onRemove(member.id)}
            className="text-hub-muted leading-none px-0.5"
            aria-label={`${member.name} 담당 해제`}
          >
            ×
          </button>
        </span>
      ))}
      {available.length > 0 ? (
        <select
          value=""
          onChange={(e) => {
            if (e.target.value) onAdd(e.target.value);
          }}
          className="border border-hub-border rounded-md px-1.5 py-1 text-[11px] outline-none bg-white text-hub-secondary"
          aria-label="마일스톤 담당자 추가"
        >
          <option value="">담당자 추가</option>
          {available.map((member) => (
            <option key={member.id} value={member.id}>
              {member.name}
            </option>
          ))}
        </select>
      ) : assigned.length === 0 ? (
        <span className="text-[11px] text-hub-muted">승인된 회원이 없습니다</span>
      ) : null}
    </div>
  );
}

interface AddProjectModalProps {
  open: boolean;
  form: {
    name: string;
    startDate: string;
    endDate: string;
    desc: string;
    color: string;
  };
  approvedMembers: ProjectMember[];
  onClose: () => void;
  onChange: (field: string, value: string) => void;
  onSubmit: (opts?: { milestones?: Milestone[]; members?: string[] }) => void;
}

export function AddProjectModal({
  open,
  form,
  approvedMembers,
  onClose,
  onChange,
  onSubmit,
}: AddProjectModalProps) {
  const [wbs, setWbs] = useState<WbsImportResult | null>(null);
  const [wbsError, setWbsError] = useState("");

  useEffect(() => {
    if (!open) {
      setWbs(null);
      setWbsError("");
    }
  }, [open]);

  const match = useMemo(
    () =>
      wbs
        ? matchMemberIds(wbs.ownerNames, approvedMembers)
        : { memberIds: [] as string[], unmatched: [] as string[] },
    [wbs, approvedMembers]
  );

  if (!open) return null;

  const inputClass =
    "w-full border border-hub-border rounded-[10px] px-3.5 py-2.5 text-sm outline-none bg-white";

  const applyWbs = (result: WbsImportResult) => {
    setWbsError("");
    setWbs(result);
    if (result.projectName) onChange("name", result.projectName);
    if (result.projectStart) onChange("startDate", result.projectStart);
    if (result.projectEnd) onChange("endDate", result.projectEnd);
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6"
      style={{ background: "var(--color-hub-overlay)" }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-[18px] w-full max-w-[460px] p-5 sm:p-7 animate-fade-up max-h-[calc(100dvh-2rem)] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-[17px] font-bold text-hub-text mb-5">새 프로젝트 추가</h2>
        <div className="flex flex-col gap-3.5">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-xs font-semibold text-hub-secondary">
                WBS 엑셀로 가져오기
              </span>
              <WbsFilePicker onParsed={applyWbs} onError={setWbsError} />
            </div>
            {wbsError && (
              <div className="text-[12px] text-red-700 bg-red-50 rounded-lg px-2.5 py-2">
                {wbsError}
              </div>
            )}
            {wbs && (
              <WbsImportPanel
                result={wbs}
                unmatchedNames={match.unmatched}
                onClear={() => setWbs(null)}
              />
            )}
          </div>

          <div>
            <label className="text-xs font-semibold text-hub-secondary block mb-1.5">
              프로젝트 이름 *
            </label>
            <input
              value={form.name}
              onChange={(e) => onChange("name", e.target.value)}
              placeholder="프로젝트 이름 입력"
              className={inputClass}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-hub-secondary block mb-1.5">
                시작일 *
              </label>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => onChange("startDate", e.target.value)}
                className="w-full border border-hub-border rounded-[10px] px-3 py-2.5 text-[13px] outline-none bg-white"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-hub-secondary block mb-1.5">
                종료일 (선택)
              </label>
              <input
                type="date"
                value={form.endDate}
                onChange={(e) => onChange("endDate", e.target.value)}
                className="w-full border border-hub-border rounded-[10px] px-3 py-2.5 text-[13px] outline-none bg-white"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-hub-secondary block mb-1.5">
              설명 (선택)
            </label>
            <textarea
              value={form.desc}
              onChange={(e) => onChange("desc", e.target.value)}
              placeholder="프로젝트 간단 설명..."
              rows={2}
              className="w-full border border-hub-border rounded-[10px] px-3.5 py-2.5 text-[13px] resize-none outline-none bg-white"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-hub-secondary block mb-2.5">
              프로젝트 색상
            </label>
            <div className="flex gap-2.5 flex-wrap items-center px-0.5 py-1">
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => onChange("color", c)}
                  className="w-7 h-7 rounded-full shrink-0 transition-all"
                  style={{
                    background: c,
                    boxShadow:
                      form.color === c
                        ? `0 0 0 2.5px white, 0 0 0 4.5px ${c}`
                        : "none",
                    transform: form.color === c ? "scale(1.18)" : "scale(1)",
                  }}
                />
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-2.5 mt-5 justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-[10px] text-sm text-hub-secondary bg-hub-surface"
          >
            취소
          </button>
          <button
            onClick={() =>
              onSubmit(
                wbs
                  ? {
                      milestones: milestonesWithOwners(wbs.milestones, approvedMembers),
                      members: match.memberIds,
                    }
                  : undefined
              )
            }
            className="px-5 py-2 rounded-[10px] text-sm font-semibold bg-hub-primary text-hub-primary-foreground"
          >
            {wbs
              ? `프로젝트 생성 (${wbs.milestones.length}개 마일스톤)`
              : "프로젝트 생성"}
          </button>
        </div>
      </div>
    </div>
  );
}

interface ProjectModalProps {
  project: Project | null;
  today: Date;
  showMsForm: boolean;
  showFileForm: boolean;
  newMsName: string;
  newMsStart: string;
  newMsEnd: string;
  newFileName: string;
  newFileUrl: string;
  onClose: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onAddMember: (userId: string) => void;
  onRemoveMember: (userId: string) => void;
  approvedMembers: ProjectMember[];
  onStatusChange: (status: ProjectStatus) => void;
  onProjectNameChange: (name: string) => void;
  onMilestoneNameChange: (mid: string, name: string) => void;
  onMilestoneDateChange: (mid: string, field: "start" | "end", value: string) => void;
  onMilestoneCompletedAtChange: (mid: string, value: string) => void;
  onAddMilestoneAssignee: (mid: string, userId: string) => void;
  onRemoveMilestoneAssignee: (mid: string, userId: string) => void;
  onDeleteMilestone: (mid: string) => void;
  onToggleMs: (mid: string) => void;
  onNotesChange: (notes: string) => void;
  onOpenMsForm: () => void;
  onCancelMsForm: () => void;
  onSubmitMs: () => void;
  onMsNameChange: (v: string) => void;
  onMsStartChange: (v: string) => void;
  onMsEndChange: (v: string) => void;
  onOpenFileForm: () => void;
  onCancelFileForm: () => void;
  onSubmitFile: () => void;
  onFileNameChange: (v: string) => void;
  onFileUrlChange: (v: string) => void;
  onImportWbs: (
    milestones: Milestone[],
    mode: WbsImportMode,
    memberIds: string[]
  ) => void;
}

export function ProjectModal({
  project,
  today,
  showMsForm,
  showFileForm,
  newMsName,
  newMsStart,
  newMsEnd,
  newFileName,
  newFileUrl,
  onClose,
  onArchive,
  onDelete,
  onAddMember,
  onRemoveMember,
  approvedMembers,
  onStatusChange,
  onProjectNameChange,
  onMilestoneNameChange,
  onMilestoneDateChange,
  onMilestoneCompletedAtChange,
  onAddMilestoneAssignee,
  onRemoveMilestoneAssignee,
  onDeleteMilestone,
  onToggleMs,
  onNotesChange,
  onOpenMsForm,
  onCancelMsForm,
  onSubmitMs,
  onMsNameChange,
  onMsStartChange,
  onMsEndChange,
  onOpenFileForm,
  onCancelFileForm,
  onSubmitFile,
  onFileNameChange,
  onFileUrlChange,
  onImportWbs,
}: ProjectModalProps) {
  const [wbs, setWbs] = useState<WbsImportResult | null>(null);
  const [wbsError, setWbsError] = useState("");
  const [wbsMode, setWbsMode] = useState<WbsImportMode>("replace");

  useEffect(() => {
    setWbs(null);
    setWbsError("");
    setWbsMode("replace");
  }, [project?.id]);

  const wbsMatch = useMemo(
    () =>
      wbs
        ? matchMemberIds(wbs.ownerNames, approvedMembers)
        : { memberIds: [] as string[], unmatched: [] as string[] },
    [wbs, approvedMembers]
  );

  if (!project) return null;

  const done = project.milestones.filter((m) => m.done).length;
  const total = project.milestones.length;
  const assigned = resolveProjectMembers(project.members || [], approvedMembers);
  const available = approvedMembers.filter(
    (m) => !(project.members || []).includes(m.id)
  );

  return (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center py-4 sm:py-10 px-4 sm:px-5 overflow-y-auto"
      style={{ background: "var(--color-hub-overlay)" }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-[18px] w-full max-w-[590px] flex flex-col max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100vh-80px)] animate-fade-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 sm:px-6 pt-5 sm:pt-6 shrink-0">
          <div className="flex items-start justify-between gap-2 sm:gap-3 mb-3.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ background: project.color }}
              />
              <h2 className="text-[19px] font-bold text-hub-text leading-snug flex-1 min-w-0">
                <InlineEditableName
                  value={project.name}
                  onChange={onProjectNameChange}
                  className="text-[19px] font-bold text-hub-text leading-snug"
                  placeholder="프로젝트 이름"
                />
              </h2>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={onArchive}
                className="text-xs text-hub-muted px-3 py-1 rounded-[7px] bg-hub-bg font-medium"
              >
                아카이브
              </button>
              <button
                onClick={onDelete}
                className="text-xs text-red-700 px-3 py-1 rounded-[7px] bg-red-50 font-medium"
              >
                삭제
              </button>
              <button
                onClick={onClose}
                className="w-[30px] h-[30px] rounded-lg bg-hub-bg text-hub-secondary text-xl flex items-center justify-center leading-none"
              >
                ×
              </button>
            </div>
          </div>

          <div className="flex gap-1.5 flex-wrap mb-3.5">
            {(Object.entries(STATUS) as [ProjectStatus, (typeof STATUS)[ProjectStatus]][]).map(
              ([key, sc]) => {
                const isActive = project.status === key;
                return (
                  <button
                    key={key}
                    onClick={() => onStatusChange(key)}
                    className="text-xs rounded-full px-3 py-1 transition-all"
                    style={{
                      fontWeight: isActive ? 700 : 500,
                      color: isActive ? sc.color : "#8FAE94",
                      background: isActive ? sc.bg : "#F2F5EF",
                      border: `1px solid ${isActive ? sc.color + "50" : "transparent"}`,
                    }}
                  >
                    {sc.label}
                  </button>
                );
              }
            )}
          </div>

          <div className="bg-hub-bg rounded-xl px-4 py-3 flex flex-col gap-1">
            <div className="text-[11px] font-bold text-hub-secondary uppercase tracking-wider">
              프로젝트 설명
            </div>
            <div className="text-[13px] text-hub-text leading-relaxed">
              {project.desc || "설명 없음"}
            </div>
            <div className="text-[11px] text-hub-muted mt-0.5">
              {formatProjectRange(project.start, project.end)} · {done}/{total} 마일스톤 완료
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 sm:px-6 pb-5 sm:pb-7 pt-4 flex flex-col gap-5">
          <div>
            <div className="text-[11px] font-bold text-hub-secondary uppercase tracking-widest mb-2.5">
              담당자
            </div>

            {assigned.length > 0 ? (
              <div className="flex flex-col gap-1.5 mb-3">
                {assigned.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-hub-bg"
                  >
                    <div
                      className="w-7 h-7 rounded-full text-white text-[11px] font-bold flex items-center justify-center shrink-0"
                      style={{ background: m.color }}
                    >
                      {m.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium text-hub-text">{m.name}</div>
                      <div className="text-[11px] text-hub-muted truncate">{m.email}</div>
                    </div>
                    <button
                      onClick={() => onRemoveMember(m.id)}
                      className="w-6 h-6 rounded-md bg-red-50 text-red-700 text-sm flex items-center justify-center shrink-0"
                      title="담당자 제거"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-hub-muted mb-3">담당자 없음</div>
            )}

            {available.length > 0 ? (
              <>
                <div className="text-[11px] font-bold text-hub-secondary uppercase tracking-widest mb-2">
                  담당자 추가
                </div>
                <div className="flex gap-2 flex-wrap">
                  {available.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => onAddMember(m.id)}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-hub-surface border border-hub-border transition-all hover:border-hub-primary"
                    >
                      <div
                        className="w-5 h-5 rounded-full text-white text-[9px] font-bold flex items-center justify-center shrink-0"
                        style={{ background: m.color }}
                      >
                        {m.name[0]}
                      </div>
                      <span className="text-[13px] text-hub-text">{m.name}</span>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-xs text-hub-muted">
                {approvedMembers.length === 0
                  ? "가입·승인된 사용자가 없습니다"
                  : "추가할 수 있는 사용자가 없습니다"}
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between gap-2 mb-2.5 flex-wrap">
              <div className="text-[11px] font-bold text-hub-secondary uppercase tracking-widest">
                마일스톤
              </div>
              <WbsFilePicker
                label="WBS 가져오기"
                onParsed={(result) => {
                  setWbsError("");
                  setWbs(result);
                  setWbsMode("replace");
                }}
                onError={setWbsError}
              />
            </div>
            {wbsError && (
              <div className="text-[12px] text-red-700 bg-red-50 rounded-lg px-2.5 py-2 mb-2.5">
                {wbsError}
              </div>
            )}
            {wbs && (
              <div className="mb-3 flex flex-col gap-2">
                <WbsImportPanel
                  result={wbs}
                  unmatchedNames={wbsMatch.unmatched}
                  mode={wbsMode}
                  onModeChange={setWbsMode}
                  existingMilestoneCount={project.milestones.length}
                  onClear={() => setWbs(null)}
                />
                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setWbs(null)}
                    className="px-3.5 py-1.5 rounded-lg text-[13px] text-hub-secondary bg-hub-surface"
                  >
                    취소
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onImportWbs(
                        milestonesWithOwners(wbs.milestones, approvedMembers),
                        wbsMode,
                        wbsMatch.memberIds
                      );
                      setWbs(null);
                    }}
                    className="px-3.5 py-1.5 rounded-lg text-[13px] font-semibold bg-hub-primary text-hub-primary-foreground"
                  >
                    {wbsMode === "replace" ? "마일스톤 교체" : "마일스톤 추가"}
                  </button>
                </div>
              </div>
            )}
            <div className="flex flex-col gap-1">
              {project.milestones.map((m, idx) => {
                const msStart = new Date(
                  milestoneStart(m, project, idx) + "T00:00:00"
                );
                const msEnd = new Date(milestoneEnd(m) + "T00:00:00");
                const timing = milestoneTiming(m, today);
                const timingLabel = milestoneTimingLabel(timing);
                const isInProgress = timing === "scheduled" && today >= msStart && today <= msEnd;
                const isDone = timing === "done" || timing === "done_late";
                const timingStyle =
                  timing === "delayed" || timing === "done_late"
                    ? { color: "#92400E", background: "#FEF3C7" }
                    : { color: "#166534", background: "#DCFCE7" };

                return (
                  <div
                    key={m.id}
                    className="flex flex-col gap-1.5 px-2.5 py-2 rounded-lg"
                    style={{
                      background: isDone
                        ? timing === "done_late"
                          ? "#FFFBF0"
                          : "#F0FDF4"
                        : timing === "delayed"
                          ? "#FFFBF0"
                          : isInProgress
                            ? "#FFFBF0"
                            : "#F7FAF5",
                      border:
                        timing === "delayed" || isInProgress
                          ? "1px solid #F5E6C0"
                          : "1px solid transparent",
                    }}
                  >
                    <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                    <button
                      onClick={() => onToggleMs(m.id)}
                      className="w-5 h-5 rounded-full shrink-0 flex items-center justify-center transition-all"
                      style={{
                        border: `2px solid ${isDone ? "#40916C" : isInProgress || timing === "delayed" ? "#E8A838" : "#D3E8CA"}`,
                        background: isDone ? "#40916C" : "transparent",
                      }}
                      title={isDone ? "완료 해제" : "완료"}
                    >
                      {isDone && (
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                          <path
                            d="M1.5 5l2.5 2.5 4.5-4.5"
                            stroke="white"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </button>
                    <div className="flex-1 min-w-0 flex items-center gap-1.5">
                      <InlineEditableName
                        value={m.name}
                        onChange={(name) => onMilestoneNameChange(m.id, name)}
                        className={`text-sm ${
                          isDone
                            ? "font-normal text-hub-muted line-through"
                            : "font-medium text-hub-text"
                        }`}
                        placeholder="마일스톤 이름"
                      />
                      {isInProgress && (
                        <span className="text-[10px] font-bold text-hub-today-text bg-amber-100 px-2 py-0.5 rounded-[10px] shrink-0 whitespace-nowrap">
                          진행 중
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0 w-full sm:w-auto justify-end sm:justify-start">
                      <input
                        type="date"
                        value={m.start}
                        onChange={(e) => onMilestoneDateChange(m.id, "start", e.target.value)}
                        className="border border-hub-border rounded-md px-1.5 py-1 text-[11px] outline-none bg-white w-full sm:w-[118px] min-w-0"
                        title="시작일"
                      />
                      <span className="text-[10px] text-hub-muted shrink-0">~</span>
                      <input
                        type="date"
                        value={m.end}
                        onChange={(e) => onMilestoneDateChange(m.id, "end", e.target.value)}
                        className="border border-hub-border rounded-md px-1.5 py-1 text-[11px] outline-none bg-white w-full sm:w-[118px] min-w-0"
                        style={{
                          color: timing === "delayed" ? "#B91C1C" : "#5A6B5E",
                        }}
                        title="계획 종료일"
                      />
                      <input
                        type="date"
                        value={m.completedAt ?? ""}
                        onChange={(e) => onMilestoneCompletedAtChange(m.id, e.target.value)}
                        className="border border-hub-border rounded-md px-1.5 py-1 text-[11px] outline-none bg-white w-full sm:w-[118px] min-w-0"
                        title="실제 완료일"
                      />
                      {timingLabel && (
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-[10px] shrink-0 whitespace-nowrap"
                          style={timingStyle}
                        >
                          {timingLabel}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => onDeleteMilestone(m.id)}
                        className="w-6 h-6 rounded-md bg-red-50 text-red-700 text-sm flex items-center justify-center shrink-0"
                        title="마일스톤 삭제"
                        aria-label="마일스톤 삭제"
                      >
                        ×
                      </button>
                    </div>
                    </div>
                    <MilestoneAssignees
                      assigneeIds={m.assignees ?? []}
                      approvedMembers={approvedMembers}
                      onAdd={(userId) => onAddMilestoneAssignee(m.id, userId)}
                      onRemove={(userId) => onRemoveMilestoneAssignee(m.id, userId)}
                    />
                  </div>
                );
              })}
            </div>

            {showMsForm ? (
              <div className="mt-2.5 flex gap-2 items-center flex-wrap">
                <input
                  value={newMsName}
                  onChange={(e) => onMsNameChange(e.target.value)}
                  placeholder="마일스톤 이름"
                  className="flex-1 min-w-[130px] border border-hub-border rounded-lg px-3 py-2 text-[13px] outline-none bg-white"
                />
                <input
                  type="date"
                  value={newMsStart}
                  onChange={(e) => onMsStartChange(e.target.value)}
                  className="border border-hub-border rounded-lg px-2.5 py-2 text-[13px] outline-none bg-white"
                  title="시작일"
                />
                <span className="text-xs text-hub-muted">~</span>
                <input
                  type="date"
                  value={newMsEnd}
                  onChange={(e) => onMsEndChange(e.target.value)}
                  className="border border-hub-border rounded-lg px-2.5 py-2 text-[13px] outline-none bg-white"
                  title="종료일"
                />
                <button
                  onClick={onSubmitMs}
                  className="bg-hub-primary text-hub-primary-foreground rounded-lg px-3.5 py-2 text-[13px] font-semibold"
                >
                  추가
                </button>
                <button onClick={onCancelMsForm} className="text-hub-muted text-[13px] px-0.5 py-2">
                  취소
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenMsForm}
                className="mt-2.5 text-[13px] text-hub-accent font-semibold flex items-center gap-1"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path
                    d="M6 1.5v9M1.5 6h9"
                    stroke="#EDC651"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
                마일스톤 추가
              </button>
            )}
          </div>

          <div>
            <div className="text-[11px] font-bold text-hub-secondary uppercase tracking-widest mb-2.5">
              메모
            </div>
            <textarea
              value={project.notes}
              onChange={(e) => onNotesChange(e.target.value)}
              placeholder="프로젝트 메모나 코멘트를 입력하세요..."
              className="w-full min-h-[90px] border border-hub-border rounded-[10px] p-3 text-[13px] text-hub-text bg-hub-bg resize-y outline-none leading-relaxed"
            />
          </div>

          <div>
            <div className="text-[11px] font-bold text-hub-secondary uppercase tracking-widest mb-2.5">
              파일 링크
            </div>
            {(project.files || []).map((f) => (
              <div
                key={f.id}
                className="flex items-center gap-2 py-1.5 border-b border-hub-surface"
              >
                <FileIcon />
                <a
                  href={f.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[13px] text-hub-primary flex-1 overflow-hidden text-ellipsis whitespace-nowrap"
                >
                  {f.name}
                </a>
              </div>
            ))}

            {showFileForm ? (
              <div className="mt-2 flex gap-2 flex-wrap">
                <input
                  value={newFileName}
                  onChange={(e) => onFileNameChange(e.target.value)}
                  placeholder="파일 이름"
                  className="flex-1 min-w-[100px] border border-hub-border rounded-lg px-3 py-2 text-[13px] outline-none"
                />
                <input
                  value={newFileUrl}
                  onChange={(e) => onFileUrlChange(e.target.value)}
                  placeholder="https://..."
                  className="flex-[2] min-w-[140px] border border-hub-border rounded-lg px-3 py-2 text-[13px] outline-none"
                />
                <button
                  onClick={onSubmitFile}
                  className="bg-hub-primary text-hub-primary-foreground rounded-lg px-3.5 py-2 text-[13px] font-semibold"
                >
                  추가
                </button>
                <button
                  onClick={onCancelFileForm}
                  className="text-hub-muted text-[13px] px-0.5 py-2"
                >
                  취소
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenFileForm}
                className="mt-2 text-[13px] text-hub-accent font-semibold flex items-center gap-1"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path
                    d="M6 1.5v9M1.5 6h9"
                    stroke="#EDC651"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
                파일 링크 추가
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface UserPanelProps {
  open: boolean;
  users: {
    id: string;
    name: string;
    email: string;
    role: string;
    status: string;
    createdAt: string;
  }[];
  onClose: () => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onGrantAdmin: (id: string) => void;
}

export function UserPanel({
  open,
  users,
  onClose,
  onApprove,
  onReject,
  onGrantAdmin,
}: UserPanelProps) {
  if (!open) return null;

  const statusStyle = (status: string) => {
    if (status === "approved")
      return { label: "승인됨", color: "#166534", bg: "#DCFCE7" };
    if (status === "pending")
      return { label: "대기 중", color: "#92400E", bg: "#FEF3C7" };
    return { label: "거절됨", color: "#B91C1C", bg: "#FEE2E2" };
  };

  return (
    <div
      className="fixed inset-0 z-[300] flex items-start justify-center py-4 sm:py-10 px-4 sm:px-5 overflow-y-auto"
      style={{ background: "var(--color-hub-overlay)" }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-[18px] w-full max-w-[560px] p-5 sm:p-7 animate-fade-up max-h-[calc(100dvh-2rem)] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <div className="text-[17px] font-bold text-hub-text">회원 관리</div>
            <div className="text-xs text-hub-muted mt-0.5">총 {users.length}명 등록</div>
          </div>
          <button
            onClick={onClose}
            className="w-[30px] h-[30px] rounded-lg bg-hub-bg text-hub-secondary text-xl flex items-center justify-center leading-none"
          >
            ×
          </button>
        </div>

        <div>
          {users.map((user) => {
            const sc = statusStyle(user.status);
            return (
              <div
                key={user.id}
                className="flex flex-col sm:flex-row sm:items-center gap-2.5 py-3 border-b border-[#F0F5EE]"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div
                    className="w-9 h-9 rounded-full text-sm font-bold flex items-center justify-center shrink-0"
                    style={{
                      background: user.role === "admin" ? "#EDC651" : "#8FAE94",
                      color: user.role === "admin" ? "#1A2E1E" : "white",
                    }}
                  >
                    {user.name?.[0] ?? "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-semibold text-sm text-hub-text">{user.name}</span>
                      {user.role === "admin" && (
                        <span className="text-[10px] bg-hub-surface text-hub-primary px-1.5 py-0.5 rounded-md font-semibold">
                          관리자
                        </span>
                      )}
                      <span
                        className="text-[11px] font-semibold px-2 py-0.5 rounded-[10px] whitespace-nowrap sm:hidden"
                        style={{ color: sc.color, background: sc.bg }}
                      >
                        {sc.label}
                      </span>
                    </div>
                    <div className="text-xs text-hub-muted mt-px truncate">{user.email}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap sm:shrink-0">
                  <div className="text-[11px] text-hub-muted shrink-0 hidden sm:block">{user.createdAt}</div>
                  <span
                    className="text-[11px] font-semibold px-2 py-0.5 rounded-[10px] shrink-0 whitespace-nowrap hidden sm:inline"
                    style={{ color: sc.color, background: sc.bg }}
                  >
                    {sc.label}
                  </span>
                  {user.status === "approved" && user.role !== "admin" && (
                    <button
                      onClick={() => {
                        if (
                          confirm(
                            `${user.name}님에게 관리자 권한을 부여할까요?`
                          )
                        ) {
                          onGrantAdmin(user.id);
                        }
                      }}
                      className="bg-[#F8F1D4] text-[#1A2E1E] rounded-[7px] px-3 py-1 text-xs font-semibold shrink-0"
                    >
                      관리자 지정
                    </button>
                  )}
                  {user.status !== "approved" && (
                    <button
                      onClick={() => onApprove(user.id)}
                      className="bg-green-100 text-green-800 rounded-[7px] px-3 py-1 text-xs font-semibold shrink-0"
                    >
                      승인
                    </button>
                  )}
                  {user.status !== "rejected" && (
                    <button
                      onClick={() => onReject(user.id)}
                      className="bg-red-100 text-red-700 rounded-[7px] px-3 py-1 text-xs font-semibold shrink-0"
                    >
                      거절
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
