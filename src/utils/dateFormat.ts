/**
 * Shared date formatting for display and for HTML5 date inputs.
 * Handles Excel serial dates, YYYY-MM-DD, DD-MMM-YYYY, and DD-MMM-YY (e.g. 01-Mar-25).
 */

export function isDateColumnKey(key: string): boolean {
  const k = key.toLowerCase();
  // Emp ID must always be text (e.g. neo/c/10313), never a date picker
  if (k === "empid" || k === "emp_id") return false;
  return k === "date" || k.includes("date");
}

/** Excel epoch: Dec 30, 1899 */
const EXCEL_EPOCH_MS = new Date(1899, 11, 30).getTime();

function excelSerialToDate(serial: number): Date {
  return new Date(EXCEL_EPOCH_MS + serial * 86400 * 1000);
}

function isExcelSerial(value: unknown): value is number {
  return typeof value === "number" && !Number.isNaN(value) && value >= 1 && value < 100000;
}

const MONTH_NAMES = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

function parseMonthShort(str: string): number {
  const m = str.toLowerCase().slice(0, 3);
  const i = MONTH_NAMES.findIndex((name) => name.startsWith(m) || name === m);
  return i >= 0 ? i : -1;
}

function twoDigitYearToFull(yy: number): number {
  if (yy >= 100) return yy;
  return yy >= 0 && yy <= 29 ? 2000 + yy : 1900 + yy;
}

/** Parse various stored values to a Date, or null if unparseable */
function parseToDate(raw: unknown): Date | null {
  if (raw == null || raw === "") return null;
  if (isExcelSerial(raw)) return excelSerialToDate(raw);
  const s = String(raw).trim();
  if (!s) return null;
  // YYYY-MM-DD (HTML5 date input)
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (iso) {
    const d = new Date(parseInt(iso[1], 10), parseInt(iso[2], 10) - 1, parseInt(iso[3], 10));
    return Number.isNaN(d.getTime()) ? null : d;
  }
  // DD-MMM-YYYY or DD-MMM-YY (e.g. 01-Mar-2025, 01-Mar-25)
  const dddMmmY = /^(\d{1,2})-([A-Za-z]{3})-(\d{2,4})$/.exec(s);
  if (dddMmmY) {
    const day = parseInt(dddMmmY[1], 10);
    const month = parseMonthShort(dddMmmY[2]);
    const yearRaw = parseInt(dddMmmY[3], 10);
    const year = yearRaw >= 100 ? yearRaw : twoDigitYearToFull(yearRaw);
    if (month >= 0 && day >= 1 && day <= 31) {
      const d = new Date(year, month, day);
      return Number.isNaN(d.getTime()) ? null : d;
    }
  }
  // Fallback: native parse (e.g. full month names)
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Format a Date as DD-MMM-YYYY for display in table and storage */
function formatDDMMMYYYY(d: Date): string {
  const day = String(d.getDate()).padStart(2, "0");
  const month = d.toLocaleString("en-US", { month: "short" });
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

/** Format raw cell value for display in table (handles Excel serial and strings) */
export function formatDateForDisplay(raw: unknown): string {
  const d = parseToDate(raw);
  return d ? formatDDMMMYYYY(d) : String(raw ?? "").trim() || "";
}

/** Value for <input type="date">: YYYY-MM-DD or "" */
export function parseDateToInputValue(raw: unknown): string {
  const d = parseToDate(raw);
  if (!d) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Convert YYYY-MM-DD from date input to DD-MMM-YYYY for storage */
export function formatInputDateToStore(ymd: string): string {
  const trimmed = ymd.trim();
  if (!trimmed) return "";
  const d = parseToDate(trimmed);
  return d ? formatDDMMMYYYY(d) : trimmed;
}
