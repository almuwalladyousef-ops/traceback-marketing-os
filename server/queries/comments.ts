import { createServerClient } from "@/lib/supabase/server";
import { currentMonthDays, todayStr, thisWeekRange, lastWeekRange } from "@/lib/date";
import { format } from "date-fns";
import { getDay, getDaysInMonth, startOfMonth } from "date-fns";

export async function getCommentData() {
  const db = createServerClient();
  const monthDays = currentMonthDays();
  const firstDay = monthDays[0];
  const lastDay = monthDays[monthDays.length - 1];

  const { data, error } = await db
    .from("comment_logs")
    .select("log_date,count")
    .gte("log_date", firstDay)
    .lte("log_date", lastDay)
    .order("log_date");

  if (error) throw error;

  const logMap = new Map((data ?? []).map((l) => [l.log_date, l.count]));

  const chartData = monthDays.map((d) => ({
    date: d,
    day: parseInt(d.split("-")[2], 10),
    count: logMap.get(d) ?? 0,
  }));

  const today = todayStr();
  const todayLog = data?.find((l) => l.log_date === today) ?? null;

  // Week ranges
  const thisWeekR = thisWeekRange();
  const lastWeekR = lastWeekRange();

  const thisWeek = chartData
    .filter((d) => d.date >= thisWeekR.start && d.date <= thisWeekR.end)
    .reduce((s, d) => s + d.count, 0);

  const lastWeek = chartData
    .filter((d) => d.date >= lastWeekR.start && d.date <= lastWeekR.end)
    .reduce((s, d) => s + d.count, 0);

  const monthTotal = chartData.reduce((s, d) => s + d.count, 0);
  const todayCount = todayLog?.count ?? 0;

  // Streak
  let streak = 0;
  let cursor = todayLog ? today : (() => {
    const d = new Date(today);
    d.setDate(d.getDate() - 1);
    return format(d, "yyyy-MM-dd");
  })();

  const { data: allLogs } = await db
    .from("comment_logs")
    .select("log_date,count")
    .order("log_date", { ascending: false });

  for (const log of allLogs ?? []) {
    if (log.log_date === cursor && log.count > 0) {
      streak++;
      const d = new Date(cursor);
      d.setDate(d.getDate() - 1);
      cursor = format(d, "yyyy-MM-dd");
    } else if (log.log_date < cursor) {
      break;
    }
  }

  // Compute first-of-month day-of-week offset (0=Mon, 6=Sun)
  const firstDayOfMonth = new Date(firstDay);
  const rawDow = getDay(firstDayOfMonth); // 0=Sun
  const dayOneOffset = rawDow === 0 ? 6 : rawDow - 1; // convert to 0=Mon

  return {
    chartData,
    dayOneOffset,
    daysInMonth: getDaysInMonth(firstDayOfMonth),
    todayLogged: !!todayLog,
    streak,
    today,
    thisWeek,
    lastWeek,
    monthTotal,
    todayCount,
  };
}
