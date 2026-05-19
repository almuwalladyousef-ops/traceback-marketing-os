---
name: Outreach lifecycle rules
description: The intended full lifecycle for email and influencer outreach — timing, auto-archive, re-engage, and deletion rules
type: project
---

The outreach cycle works as follows (applies to both Email Outreach and Influencer Outreach):

**Cycle 1**
1. Send initial outreach (Day 1)
2. Bump 1 due 48 hours (2 days) later
3. Bump 2 due 5 days after Bump 1
4. If no reply after Bump 2 → auto-archive

**Re-engage (Cycle 2)**
5. After 30 days in archive → circle back and repeat the same sequence (Sent → Bump 1 → Bump 2)
6. If no reply again → permanently delete (not just archive)

**Why:** This is the intended cold outreach cadence — two touches after the initial send, then a rest period, one more cycle, then done.

**How to apply:** When building or modifying outreach automation, auto-archiving, or re-engage logic, follow this exact cadence. The timing constants are: Bump 1 = +2 days from send, Bump 2 = +5 days from Bump 1, re-engage = +30 days from archive date.

**What's already implemented (influencer):**
- `influencerDueTouch` in `lib/date.ts` computes due touches including re_engage after 30 days
- `archiveInfluencer` in `server/actions/influencers.ts` increments `cycle_count` and auto-deletes on cycle 2 (cycle_count >= 2)
- Timing: Bump 1 = 2 days ✓, Bump 2 = 5 days ✓, re-engage = 30 days ✓

**What's NOT yet implemented:**
- Auto-archive when Bump 2 is sent with no reply (currently manual for both email and influencer)
- Email outreach has no cycle_count / second-cycle-then-delete logic
- Email outreach has no re-engage after 30 days logic
