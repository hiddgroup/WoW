import type { Milestone, ProjectMember } from "@/lib/types";
import type { WbsMilestone } from "@/lib/wbs/types";

const TITLE_SUFFIXES = [
  "실장님",
  "실장",
  "대표님",
  "대표",
  "님",
  "팀장님",
  "팀장",
  "매니저",
  "님",
];

export function normalizePersonName(name: string): string {
  let s = name.trim().replace(/\s+/g, "");
  for (const suffix of TITLE_SUFFIXES) {
    if (s.endsWith(suffix) && s.length > suffix.length) {
      s = s.slice(0, -suffix.length);
    }
  }
  return s;
}

/**
 * Match Excel owner/supporter names to approved profile IDs.
 * Uses exact normalized match, then mutual includes.
 */
export function matchMemberIds(
  ownerNames: string[],
  approvedMembers: ProjectMember[]
): { memberIds: string[]; unmatched: string[] } {
  const memberIds = new Set<string>();
  const unmatched: string[] = [];

  for (const raw of ownerNames) {
    const needle = normalizePersonName(raw);
    if (!needle) continue;

    const hit = approvedMembers.find((m) => {
      const hay = normalizePersonName(m.name);
      if (!hay) return false;
      return (
        hay === needle ||
        hay.includes(needle) ||
        needle.includes(hay)
      );
    });

    if (hit) {
      memberIds.add(hit.id);
    } else {
      unmatched.push(raw);
    }
  }

  return { memberIds: Array.from(memberIds), unmatched };
}

export function milestonesWithOwners(
  milestones: WbsMilestone[],
  approvedMembers: ProjectMember[]
): Milestone[] {
  return milestones.map((milestone) => {
    const { ownerNames, ...rest } = milestone;
    const assignees = matchMemberIds(ownerNames ?? [], approvedMembers).memberIds;
    return assignees.length ? { ...rest, assignees } : rest;
  });
}
