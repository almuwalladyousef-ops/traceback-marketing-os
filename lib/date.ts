import { addDays, format, startOfWeek, getDay, getDaysInMonth, startOfMonth } from "date-fns";

export function todayStr(): string {
  return format(new Date(), "yyyy-MM-dd");
}

export function isDue(dateStr: string | null): boolean {
  if (!dateStr) return false;
  return dateStr <= todayStr();
}

export function addDaysStr(dateStr: string, days: number): string {
  return format(addDays(new Date(dateStr), days), "yyyy-MM-dd");
}

export function influencerDueTouch(inf: {
  touch_1: boolean;
  touch_2: boolean;
  touch_3: boolean;
  touch_1_date: string | null;
  touch_2_date: string | null;
  touch_3_date: string | null;
  status: string;
  archive_date: string | null;
}): "touch_1" | "touch_2" | "touch_3" | "re_engage" | null {
  const today = todayStr();

  if (!inf.touch_1) return "touch_1";

  if (inf.touch_1 && !inf.touch_2 && inf.touch_1_date) {
    const dueDate = addDaysStr(inf.touch_1_date, 2);
    if (today >= dueDate) return "touch_2";
  }

  if (inf.touch_2 && !inf.touch_3 && inf.touch_2_date) {
    const dueDate = addDaysStr(inf.touch_2_date, 5);
    if (today >= dueDate) return "touch_3";
  }

  if (inf.status === "Archived" && inf.archive_date) {
    const reEngageDate = addDaysStr(inf.archive_date, 30);
    if (today >= reEngageDate) return "re_engage";
  }

  return null;
}

// Returns week-of-month (0-indexed) for a given date string
export function weekOfMonth(dateStr: string): number {
  const date = new Date(dateStr);
  const firstDay = startOfMonth(date);
  const firstMonday = startOfWeek(firstDay, { weekStartsOn: 1 });
  const diff = Math.floor(
    (date.getTime() - firstMonday.getTime()) / (7 * 24 * 60 * 60 * 1000)
  );
  return diff;
}

// Returns 0=Mon, 1=Tue, ... 6=Sun
export function weekdayIndex(dateStr: string): number {
  const d = getDay(new Date(dateStr)); // 0=Sun,1=Mon,...6=Sat
  return d === 0 ? 6 : d - 1;
}

export function currentMonthDays(): string[] {
  const now = new Date();
  const total = getDaysInMonth(now);
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return Array.from({ length: total }, (_, i) =>
    `${year}-${month}-${String(i + 1).padStart(2, "0")}`
  );
}

export function thisWeekRange(): { start: string; end: string } {
  const today = new Date();
  const start = startOfWeek(today, { weekStartsOn: 1 });
  const end = addDays(start, 6);
  return {
    start: format(start, "yyyy-MM-dd"),
    end: format(end, "yyyy-MM-dd"),
  };
}

export function lastWeekRange(): { start: string; end: string } {
  const today = new Date();
  const thisStart = startOfWeek(today, { weekStartsOn: 1 });
  const lastStart = addDays(thisStart, -7);
  const lastEnd = addDays(thisStart, -1);
  return {
    start: format(lastStart, "yyyy-MM-dd"),
    end: format(lastEnd, "yyyy-MM-dd"),
  };
}
