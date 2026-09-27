import type { WbsImportResult, WbsMilestone } from "@/lib/wbs/types";

export type { WbsImportResult };

type XlsxModule = typeof import("xlsx");

const MAX_ROWS = 500;

const HEADER_ALIASES = {
  wbs: ["wbs 번호", "wbs번호", "wbs"],
  title: ["작업 제목", "작업제목", "제목", "task"],
  owner: ["작업 소유자", "작업소유자", "소유자", "담당자"],
  supporter: ["작업 서포터", "작업서포터", "서포터"],
  start: ["시작일", "시작"],
  end: ["마감일", "종료일", "마감"],
  progress: ["작업 완료 비율", "완료 비율", "완료율", "진행률"],
} as const;

type ColKey = keyof typeof HEADER_ALIASES;

function normalizeHeader(value: unknown): string {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function cellToString(value: unknown): string {
  if (value == null || value === "") return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") {
    if (Number.isInteger(value)) return String(value);
    return String(value);
  }
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).trim();
}

/** Normalize WBS like 1.0 → 1, 2.10 → 2.10, keep hierarchical dots. */
export function normalizeWbsNumber(raw: unknown): string {
  const s = cellToString(raw);
  if (!s) return "";

  if (/^\d+(\.\d+)*$/.test(s)) {
    return s
      .split(".")
      .map((part, idx, arr) => {
        if (arr.length === 2 && idx === 1 && part === "0") return null;
        const n = part.replace(/^0+(?=\d)/, "");
        return n === "" ? "0" : n;
      })
      .filter((p): p is string => p != null)
      .join(".");
  }

  const cleaned = s.replace(/\s+/g, "");
  if (/^\d+(\.\d+)*$/.test(cleaned)) return cleaned;
  return cleaned;
}

/** 1st depth only (e.g. "1", "2") — phase headers, not milestones. */
export function isTopLevelWbs(wbs: string): boolean {
  if (!wbs) return false;
  return /^\d+$/.test(wbs);
}

function formatYmdUTC(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function excelSerialToYmd(serial: number): string | null {
  if (!Number.isFinite(serial) || serial < 20000 || serial > 80000) return null;
  const utc = Date.UTC(1899, 11, 30) + Math.round(serial) * 86400000;
  return formatYmdUTC(new Date(utc));
}

export function parseExcelDate(value: unknown): string | null {
  if (value == null || value === "") return null;

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  if (typeof value === "number") {
    return excelSerialToYmd(value);
  }

  const s = cellToString(value);
  if (!s) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  const ko = s.match(/(\d{2,4})\s*년\s*(\d{1,2})\s*월\s*(\d{1,2})\s*일/);
  if (ko) {
    let y = Number(ko[1]);
    if (y < 100) y += 2000;
    const m = String(Number(ko[2])).padStart(2, "0");
    const d = String(Number(ko[3])).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  const md = s.match(/^(\d{1,2})[./](\d{1,2})(?:[./](\d{2,4}))?$/);
  if (md) {
    const year = md[3]
      ? Number(md[3]) < 100
        ? 2000 + Number(md[3])
        : Number(md[3])
      : new Date().getFullYear();
    const m = String(Number(md[1])).padStart(2, "0");
    const d = String(Number(md[2])).padStart(2, "0");
    return `${year}-${m}-${d}`;
  }

  if (/^\d+(\.\d+)?$/.test(s)) {
    return excelSerialToYmd(Number(s));
  }

  return null;
}

function parseProgress(value: unknown): number {
  if (value == null || value === "") return 0;
  if (typeof value === "number") return value > 1 ? value / 100 : value;
  const s = cellToString(value).replace("%", "");
  const n = Number(s);
  if (!Number.isFinite(n)) return 0;
  return n > 1 ? n / 100 : n;
}

function findHeaderRow(rows: unknown[][]): {
  rowIndex: number;
  cols: Partial<Record<ColKey, number>>;
} | null {
  const limit = Math.min(rows.length, 40);
  for (let r = 0; r < limit; r++) {
    const row = rows[r] ?? [];
    const cols: Partial<Record<ColKey, number>> = {};

    for (let c = 0; c < row.length; c++) {
      const h = normalizeHeader(row[c]);
      if (!h) continue;
      (Object.keys(HEADER_ALIASES) as ColKey[]).forEach((key) => {
        if (cols[key] != null) return;
        if (HEADER_ALIASES[key].some((alias) => h === alias || h.includes(alias))) {
          cols[key] = c;
        }
      });
    }

    if (cols.wbs != null && cols.title != null && cols.start != null && cols.end != null) {
      const next = rows[r + 1] ?? [];
      for (let c = 0; c < next.length; c++) {
        const h = normalizeHeader(next[c]);
        if (HEADER_ALIASES.supporter.some((a) => h === a || h.includes(a))) {
          cols.supporter = c;
        }
        if (cols.owner == null && HEADER_ALIASES.owner.some((a) => h === a || h.includes(a))) {
          cols.owner = c;
        }
      }
      return { rowIndex: r, cols };
    }
  }
  return null;
}

function extractProjectName(rows: unknown[][]): string | undefined {
  for (let r = 0; r < Math.min(rows.length, 12); r++) {
    const row = rows[r] ?? [];
    for (let c = 0; c < row.length; c++) {
      if (
        normalizeHeader(row[c]) === "프로젝트 이름" ||
        normalizeHeader(row[c]) === "프로젝트명"
      ) {
        for (let k = c + 1; k < Math.min(row.length, c + 5); k++) {
          const v = cellToString(row[k]);
          if (v) return v;
        }
      }
    }
  }
  return undefined;
}

function splitNames(raw: string): string[] {
  if (!raw) return [];
  return raw
    .split(/[,，/、]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

async function loadXlsx(): Promise<XlsxModule> {
  // next.config aliases `xlsx` → CJS build to avoid broken ESM module factories
  const mod = await import("xlsx");
  return (mod as { default?: XlsxModule }).default ?? (mod as XlsxModule);
}

export async function parseWbsWorkbook(
  data: ArrayBuffer | Uint8Array
): Promise<WbsImportResult> {
  const XLSX = await loadXlsx();
  const warnings: string[] = [];
  const workbook = XLSX.read(data, { type: "array", cellDates: false });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error("엑셀 시트를 찾을 수 없습니다.");
  }

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<(string | number | Date | null)[]>(sheet, {
    header: 1,
    defval: null,
    raw: true,
  }) as unknown[][];

  if (!rows.length) {
    throw new Error("엑셀 파일이 비어 있습니다.");
  }

  const header = findHeaderRow(rows);
  if (!header) {
    throw new Error("WBS 헤더(WBS 번호, 작업 제목, 시작일, 마감일)를 찾을 수 없습니다.");
  }

  const { cols, rowIndex } = header;
  const projectName = extractProjectName(rows);
  const milestones: WbsMilestone[] = [];
  const ownerSet = new Set<string>();
  let skippedRows = 0;
  let idCounter = 0;

  const dataStart = rowIndex + 1;
  let start = dataStart;
  while (start < rows.length && start < dataStart + 5) {
    const wbs = normalizeWbsNumber(rows[start]?.[cols.wbs!]);
    if (wbs) break;
    start++;
  }

  const end = Math.min(rows.length, start + MAX_ROWS);

  for (let r = start; r < end; r++) {
    const row = rows[r] ?? [];
    const wbs = normalizeWbsNumber(row[cols.wbs!]);
    const title = cellToString(row[cols.title!]);
    if (!wbs && !title) continue;

    // Skip 1st-depth phase rows (e.g. "1 프로젝트 정의 및 계획")
    if (isTopLevelWbs(wbs)) continue;

    const startDate = parseExcelDate(row[cols.start!]);
    const endDateRaw = parseExcelDate(row[cols.end!]);

    if (!startDate || !endDateRaw) {
      if (wbs || title) skippedRows++;
      continue;
    }

    let endDate = endDateRaw;
    if (startDate > endDate) {
      warnings.push(
        `"${title || wbs}" 시작일이 마감일보다 늦어 마감일을 시작일로 보정했습니다.`
      );
      endDate = startDate;
    }

    const progress = cols.progress != null ? parseProgress(row[cols.progress]) : 0;
    const name = [wbs, title].filter(Boolean).join(" ");

    const ownerNames: string[] = [];
    if (cols.owner != null) {
      splitNames(cellToString(row[cols.owner])).forEach((n) => {
        ownerNames.push(n);
        ownerSet.add(n);
      });
    }
    if (cols.supporter != null) {
      splitNames(cellToString(row[cols.supporter])).forEach((n) => {
        ownerNames.push(n);
        ownerSet.add(n);
      });
    }

    idCounter += 1;
    milestones.push({
      id: `ms_wbs_${Date.now()}_${idCounter}`,
      name,
      start: startDate,
      end: endDate,
      done: progress >= 1,
      ownerNames,
    });
  }

  if (milestones.length === 0) {
    throw new Error("시작일·마감일이 있는 작업 행을 찾지 못했습니다.");
  }

  const starts = milestones.map((m) => m.start).sort();
  const ends = milestones.map((m) => m.end).sort();

  return {
    projectName,
    projectStart: starts[0],
    projectEnd: ends[ends.length - 1],
    milestones,
    ownerNames: Array.from(ownerSet),
    skippedRows,
    warnings,
  };
}

export async function parseWbsFile(file: File): Promise<WbsImportResult> {
  const buffer = await file.arrayBuffer();
  return parseWbsWorkbook(buffer);
}
