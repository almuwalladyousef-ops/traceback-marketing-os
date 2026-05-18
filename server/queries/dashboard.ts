import { createServerClient } from "@/lib/supabase/server";
import { todayStr, thisWeekRange, lastWeekRange, influencerDueTouch } from "@/lib/date";
import { format, startOfMonth, endOfMonth, addDays, formatDistanceToNow } from "date-fns";

export interface ActivityItem {
  id: string;
  color: string;
  text: string;
  timeAgo: string;
}

export async function getDashboardData() {
  const db = createServerClient();
  const today = todayStr();
  const thisWeek = thisWeekRange();
  const lastWeek = lastWeekRange();
  const monthStart = format(startOfMonth(new Date()), "yyyy-MM-dd");
  const monthEnd = format(endOfMonth(new Date()), "yyyy-MM-dd");
  const twoWeeksAgo = format(addDays(new Date(), -14), "yyyy-MM-dd");

  const [
    companiesRes,
    influencersRes,
    personalRes,
    contentInProgressRes,
    contentScheduledRes,
    contentPublishedRes,
    commentLogsRes,
    recentRepliesRes,
    recentContentRes,
    allLogsRes,
  ] = await Promise.all([
    db.from("companies").select("id,name,status,follow_up_date,archived,updated_at").eq("archived", false),
    db.from("influencers").select("*").neq("status", "Deleted"),
    db.from("personal_leads").select("id,status,follow_up_date"),
    db.from("content_pieces").select("id,title,status,scope,kind,updated_at").eq("archived", false).neq("status", "Published").neq("status", "Idea"),
    db.from("content_pieces").select("id,title,publish_date,scope,kind").eq("archived", false).gte("publish_date", today).lte("publish_date", thisWeek.end),
    db.from("content_pieces").select("id,created_at,publish_date").eq("archived", false).eq("status", "Published").gte("publish_date", monthStart).lte("publish_date", monthEnd),
    db.from("comment_logs").select("*").gte("log_date", lastWeek.start).order("log_date"),
    db.from("companies").select("name,updated_at").in("status", ["Replied", "In Conversation"]).order("updated_at", { ascending: false }).limit(3),
    db.from("content_pieces").select("title,status,updated_at").eq("archived", false).neq("status", "Idea").order("updated_at", { ascending: false }).limit(3),
    db.from("comment_logs").select("log_date,count").order("log_date", { ascending: false }),
  ]);

  const companies = companiesRes.data ?? [];
  const influencers = influencersRes.data ?? [];
  const personal = personalRes.data ?? [];
  const contentPieces = contentInProgressRes.data ?? [];
  const commentLogs = commentLogsRes.data ?? [];
  const allLogs = allLogsRes.data ?? [];

  // Dues
  const emailDue = companies.filter(c => c.follow_up_date && c.follow_up_date <= today && !["Replied", "In Conversation", "Dead"].includes(c.status)).length;
  const influencerDue = influencers.filter(i => i.status === "Active" && influencerDueTouch(i) !== null).length;
  const personalDue = personal.filter(p => p.status === "Active" && p.follow_up_date && p.follow_up_date <= today).length;

  // Active counts
  const emailActive = companies.filter(c => !["Dead"].includes(c.status)).length;
  const influencerActive = influencers.filter(i => i.status === "Active").length;
  const personalActive = personal.filter(p => p.status === "Active").length;

  // Reply rates
  const repliedCompanies = companies.filter(c => ["Replied", "In Conversation"].includes(c.status)).length;
  const emailReplyRate = emailActive > 0 ? Math.round((repliedCompanies / emailActive) * 100) : 0;

  // Replies this week
  const emailRepliesThisWeek = companies.filter(c =>
    ["Replied", "In Conversation"].includes(c.status) && c.updated_at >= thisWeek.start
  ).length;
  const repliesLastWeek = companies.filter(c =>
    ["Replied", "In Conversation"].includes(c.status) && c.updated_at >= lastWeek.start && c.updated_at <= lastWeek.end
  ).length;

  // Reply chart last 14 days
  const replyByDate: Record<string, number> = {};
  companies.filter(c => ["Replied", "In Conversation"].includes(c.status))
    .forEach(c => {
      const date = c.updated_at.split("T")[0];
      if (date >= twoWeeksAgo) replyByDate[date] = (replyByDate[date] ?? 0) + 1;
    });

  const replyChart = Array.from({ length: 14 }, (_, i) => {
    const date = format(addDays(new Date(), -13 + i), "yyyy-MM-dd");
    return { date, day: format(addDays(new Date(), -13 + i), "d"), count: replyByDate[date] ?? 0, isToday: date === today };
  });

  // Comment data
  const todayLog = commentLogs.find(l => l.log_date === today);
  const todayLogged = !!todayLog;
  const thisWeekComments = commentLogs.filter(l => l.log_date >= thisWeek.start && l.log_date <= thisWeek.end).reduce((s, l) => s + l.count, 0);
  const lastWeekComments = commentLogs.filter(l => l.log_date >= lastWeek.start && l.log_date <= lastWeek.end).reduce((s, l) => s + l.count, 0);

  // Week comment chart
  const weekLogMap = new Map(commentLogs.map(l => [l.log_date, l.count]));
  const commentWeekChart = Array.from({ length: 7 }, (_, i) => {
    const date = format(addDays(new Date(), -6 + i), "yyyy-MM-dd");
    return { date, day: format(addDays(new Date(), -6 + i), "EEE"), count: weekLogMap.get(date) ?? 0, isToday: date === today };
  });

  // Streak
  let streak = 0;
  let cursor = todayLogged ? today : format(addDays(new Date(), -1), "yyyy-MM-dd");
  for (const log of allLogs) {
    if (log.log_date === cursor && log.count > 0) {
      streak++;
      cursor = format(addDays(new Date(cursor), -1), "yyyy-MM-dd");
    } else if (log.log_date < cursor) break;
  }

  // Personal best
  let personalBest = 0;
  let currentRun = 0;
  let prevDate = "";
  for (const log of [...allLogs].reverse()) {
    if (log.count > 0) {
      if (prevDate && log.log_date === format(addDays(new Date(prevDate), 1), "yyyy-MM-dd")) {
        currentRun++;
      } else {
        currentRun = 1;
      }
      personalBest = Math.max(personalBest, currentRun);
      prevDate = log.log_date;
    } else {
      currentRun = 0;
      prevDate = "";
    }
  }

  // Content
  const contentInProgress = contentPieces.length;
  const contentPublishedThisMonth = contentPublishedRes.data?.length ?? 0;
  const contentScheduledThisWeek = contentScheduledRes.data ?? [];

  const publishedWithDates = (contentPublishedRes.data ?? []).filter(p => p.publish_date && p.created_at);
  const avgCycleDays = publishedWithDates.length > 0
    ? Math.round(publishedWithDates.reduce((sum, p) => {
        return sum + (new Date(p.publish_date!).getTime() - new Date(p.created_at).getTime()) / 86400000;
      }, 0) / publishedWithDates.length)
    : null;

  // Activity feed
  const activity: ActivityItem[] = [];
  (recentRepliesRes.data ?? []).slice(0, 2).forEach(c => {
    activity.push({ id: `reply-${c.name}`, color: "#22c55e", text: `${c.name} replied to your email`, timeAgo: formatDistanceToNow(new Date(c.updated_at), { addSuffix: true }) });
  });
  if (todayLog && todayLog.count > 0) {
    activity.push({ id: "comment-today", color: "#f59e0b", text: `You logged ${todayLog.count} comments today`, timeAgo: "Today" });
  }
  (recentContentRes.data ?? []).slice(0, 2).forEach(p => {
    activity.push({ id: `content-${p.title}`, color: "#a78bfa", text: `"${p.title}" moved to ${p.status}`, timeAgo: formatDistanceToNow(new Date(p.updated_at), { addSuffix: true }) });
  });
  const totalDue = emailDue + influencerDue + personalDue;
  if (totalDue > 0) {
    activity.push({ id: "due-today", color: "#f43f5e", text: `${totalDue} outreach tasks due today`, timeAgo: "Now" });
  }
  if (streak > 0) {
    activity.push({ id: "streak", color: "#f59e0b", text: `You're on a ${streak}-day comment streak`, timeAgo: "Today" });
  }

  return {
    outreach: {
      emailDue, influencerDue, personalDue, totalDue,
      emailActive, influencerActive, personalActive,
      emailRepliesThisWeek, repliesLastWeek, emailReplyRate,
      replyChart,
    },
    content: {
      inProgress: contentInProgress,
      inProgressPieces: contentPieces as { id: string; title: string; status: string; scope: string; kind: string; updated_at: string }[],
      scheduledThisWeek: contentScheduledThisWeek,
      publishedThisMonth: contentPublishedThisMonth,
      scheduledCount: contentScheduledThisWeek.length,
      avgCycleDays,
    },
    comments: {
      todayLogged, thisWeekComments, lastWeekComments, streak, personalBest, commentWeekChart,
    },
    activity: activity.slice(0, 6),
  };
}
