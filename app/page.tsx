import { OutreachCard } from "@/components/dashboard/OutreachCard";
import { ContentCard } from "@/components/dashboard/ContentCard";
import { CommentsCard } from "@/components/dashboard/CommentsCard";
import { PaidAdsCard } from "@/components/dashboard/PaidAdsCard";
import { ActivityCard } from "@/components/dashboard/ActivityCard";
import { RealtimeRefresher } from "@/components/dashboard/RealtimeRefresher";

export const dynamic = "force-dynamic";

const MOCK = {
  outreach: {
    emailDue: 4, influencerDue: 2, personalDue: 2, totalDue: 8,
    emailActive: 47, influencerActive: 12, personalActive: 9,
    emailRepliesThisWeek: 23, repliesLastWeek: 16, emailReplyRate: 18,
    bars: [4, 7, 5, 9, 6, 11, 8, 14, 10, 9, 13, 16, 19, 23],
  },
  comments: {
    todayLogged: true, thisWeekComments: 47, lastWeekComments: 38,
    streak: 12, personalBest: 18,
    bars: [3, 5, 4, 6, 8, 7, 9, 6, 8, 10, 7, 11, 9, 12],
  },
  content: {
    inProgress: 7, publishedThisMonth: 12, scheduledCount: 3, avgCycleDays: 6,
    inProgressPieces: [
      { id: "1", title: "How we 10x'd outbound reply rates", scope: "personal", kind: "long_form", status: "Editing", updated_at: new Date(Date.now() - 2*86400000).toISOString() },
      { id: "2", title: "Cold email teardown — 47 examples", scope: "personal", kind: "long_form", status: "Filming", updated_at: new Date(Date.now() - 1*86400000).toISOString() },
      { id: "3", title: "What broke in our funnel last month", scope: "personal", kind: "long_form", status: "Script Final", updated_at: new Date(Date.now() - 4*86400000).toISOString() },
      { id: "4", title: "5 LinkedIn hooks that actually work", scope: "personal", kind: "short_form", status: "Script Draft", updated_at: new Date(Date.now()).toISOString() },
      { id: "5", title: "Influencer outreach playbook", scope: "personal", kind: "long_form", status: "Outline", updated_at: new Date(Date.now() - 7*86400000).toISOString() },
    ],
    scheduledThisWeek: [
      { id: "s1", title: "The death of cold email (or not)", publish_date: "2026-05-19", scope: "personal" as const, kind: "blogs" as const },
      { id: "s2", title: "How AI changed our content stack", publish_date: "2026-05-21", scope: "personal" as const, kind: "blogs" as const },
      { id: "s3", title: "Q2 marketing review", publish_date: "2026-05-23", scope: "personal" as const, kind: "blogs" as const },
    ],
  },
  activity: [
    { id: "1", color: "var(--green)", text: "Sarah Chen replied to your email", timeAgo: "2m ago" },
    { id: "2", color: "var(--accent)", text: "You logged 4 comments on r/marketing", timeAgo: "18m ago" },
    { id: "3", color: "var(--purple)", text: "Alex P. moved 'Cold email teardown' to Filming", timeAgo: "1h ago" },
    { id: "4", color: "var(--yellow)", text: "8 outreach tasks due today", timeAgo: "3h ago" },
    { id: "5", color: "var(--green)", text: "Jordan L. replied to influencer DM", timeAgo: "5h ago" },
    { id: "6", color: "var(--pink)", text: "Marcus R. published 'LinkedIn hooks'", timeAgo: "8h ago" },
    { id: "7", color: "var(--yellow)", text: "You started a 12-day streak", timeAgo: "1d ago" },
  ],
};

async function getDashboardData() {
  try {
    const { getDashboardData: fetchData } = await import("@/server/queries/dashboard");
    const data = await fetchData();
    return {
      outreach: {
        ...data.outreach,
        bars: (data.outreach.replyChart ?? []).map((p) => p.count),
      },
      comments: {
        ...data.comments,
        bars: (data.comments.commentWeekChart ?? []).map((p) => p.count),
      },
      content: data.content,
      activity: data.activity,
    };
  } catch {
    return MOCK;
  }
}

export default async function DashboardPage() {
  const data = await getDashboardData();

  return (
    <>
      <RealtimeRefresher />
      <div
        className="fade-in"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(12, 1fr)",
          gap: 16,
        }}
      >
        <OutreachCard {...data.outreach} />
        <CommentsCard {...data.comments} />
        <PaidAdsCard />
        <ContentCard {...data.content} />
        <ActivityCard items={data.activity} />
      </div>
    </>
  );
}
