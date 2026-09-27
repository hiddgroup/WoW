import type { ProjectStatus, StatusConfig } from "./types";

export const STATUS: Record<ProjectStatus, StatusConfig> = {
  not_started: { label: "시작 전", color: "#6B7280", bg: "#F3F4F6" },
  in_progress: { label: "진행 중", color: "#166534", bg: "#DCFCE7" },
  at_risk: { label: "위험", color: "#B91C1C", bg: "#FEE2E2" },
  completed: { label: "완료", color: "#14532D", bg: "#BBF7D0" },
  delayed: { label: "지연", color: "#92400E", bg: "#FEF3C7" },
};

export const COLORS = [
  "#EDC651",
  "#4A90D9",
  "#E8A838",
  "#D4845A",
  "#7B62A3",
  "#3D7A5C",
  "#D4685A",
  "#3A9B8C",
  "#8D99AE",
  "#C4A55A",
];

export const TEAM = [
  { id: "tm1", name: "김민준", color: "#EDC651" },
  { id: "tm2", name: "이서연", color: "#4A90D9" },
  { id: "tm3", name: "박지호", color: "#D4845A" },
  { id: "tm4", name: "최유나", color: "#D4685A" },
  { id: "tm5", name: "정현우", color: "#7B62A3" },
];

export const DAY_HEADERS = ["일", "월", "화", "수", "목", "금", "토"];

export const GANTT_DAY_W = 16;
export const GANTT_ROW_H = 52;
export const GANTT_MS_ROW_H = 38;
export const GANTT_LABEL_W = 200;
