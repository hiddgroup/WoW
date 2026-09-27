import type { Milestone } from "@/lib/types";

export type WbsMilestone = Milestone & { ownerNames?: string[] };

export type WbsImportResult = {
  projectName?: string;
  projectStart?: string;
  projectEnd?: string;
  milestones: WbsMilestone[];
  ownerNames: string[];
  skippedRows: number;
  warnings: string[];
};
