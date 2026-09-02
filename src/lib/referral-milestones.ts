import "server-only";
import { prisma } from "@/lib/db/prisma";
import { adjustPoints } from "@/lib/points/engine";

// ---------------------------------------------------------------------------
// Referral milestone rewards. Every 5 friends a member brings in pays a
// growing points bonus:
//
//   5 friends   → 250 pts
//   10 friends  → 500 pts  (add 5 more, gain more)
//   15 friends  → 750 pts
//   20 friends  → 1000 pts … and so on, forever.
//
// Milestones are awarded automatically right after a referred signup lands.
// Idempotency: PointTransaction idempotencyKey `ref_milestone:<userId>:<step>`
// guarantees a milestone can never pay twice.
//
// Fast-upgrade bonus: if a referred member buys a paid membership within
// 7 days of joining, the referrer earns DOUBLE the usual referral commission
// (handled in referral-money.recordCommissionForMembership via isFastUpgrade).
// ---------------------------------------------------------------------------

export const REFERRAL_MILESTONE_STEP = 5;

/** Which milestone step (1, 2, 3…) has the target `totalReferrals` reached? */
export function milestoneStepFor(totalReferrals: number): number {
  return Math.floor(totalReferrals / REFERRAL_MILESTONE_STEP);
}

/** Referral count required to reach milestone `step`. */
export function milestoneTarget(step: number): number {
  return step * REFERRAL_MILESTONE_STEP;
}

/** Points paid when milestone `step` is reached (grows with each step). */
export function milestoneReward(step: number): number {
  return step * 250;
}

/**
 * Milestone steps crossed when the referral count moves from `before` to
 * `after` (after > before). Pure — unit-testable.
 */
export function milestonesCrossed(before: number, after: number): number[] {
  const steps: number[] = [];
  for (
    let step = milestoneStepFor(before) + 1;
    step <= milestoneStepFor(after);
    step++
  ) {
    steps.push(step);
  }
  return steps;
}

/**
 * True when a referred member upgraded to a paid membership within 7 days of
 * joining — the referrer then earns double commission. Pure.
 */
export function isFastUpgrade(joinedAt: Date, upgradedAt: Date): boolean {
  return upgradedAt.getTime() - joinedAt.getTime() <= 7 * 86_400_000;
}

export function milestoneIdempotencyKey(referrerId: string, step: number): string {
  return `ref_milestone:${referrerId}:${step}`;
}

export interface MilestoneView {
  step: number;
  target: number;
  reward: number;
  reached: boolean;
  claimed: boolean;
}

/** Read model for the referrals page milestone tracker. */
export async function getReferralMilestones(
  referrerId: string,
  totalReferrals: number,
): Promise<{ milestones: MilestoneView[]; next: MilestoneView | null }> {
  const currentStep = milestoneStepFor(totalReferrals);
  // Show reached milestones (up to 2 back) plus the next two ahead.
  const firstStep = Math.max(1, currentStep - 1);
  const lastStep = currentStep + 2;
  const steps: number[] = [];
  for (let s = firstStep; s <= lastStep; s++) steps.push(s);

  const claims = await prisma.pointTransaction.findMany({
    where: {
      userId: referrerId,
      idempotencyKey: {
        in: steps.map((s) => milestoneIdempotencyKey(referrerId, s)),
      },
    },
    select: { idempotencyKey: true },
  });
  const claimed = new Set(claims.map((c) => c.idempotencyKey));

  const milestones: MilestoneView[] = steps.map((step) => {
    const target = milestoneTarget(step);
    return {
      step,
      target,
      reward: milestoneReward(step),
      reached: totalReferrals >= target,
      claimed: claimed.has(milestoneIdempotencyKey(referrerId, step)),
    };
  });

  const next =
    milestones.find((m) => !m.reached) ??
    // Open-ended ladder: always another milestone 5 friends away.
    {
      step: currentStep + 1,
      target: milestoneTarget(currentStep + 1),
      reward: milestoneReward(currentStep + 1),
      reached: false,
      claimed: false,
    };

  return { milestones, next };
}

/**
 * Awards every milestone the referrer just crossed after a new referral
 * signup. Safe to call repeatedly: claimed milestones are skipped both by the
 * pre-check and the idempotency key on the ledger row.
 */
export async function awardReferralMilestones(referrerId: string): Promise<number> {
  const totalReferrals = await prisma.user.count({
    where: { referredById: referrerId },
  });

  let awarded = 0;
  for (const step of milestonesCrossed(0, totalReferrals)) {
    const key = milestoneIdempotencyKey(referrerId, step);
    const already = await prisma.pointTransaction.findUnique({
      where: { idempotencyKey: key },
      select: { id: true },
    });
    if (already) continue;
    await adjustPoints({
      userId: referrerId,
      amount: milestoneReward(step),
      type: "REFERRAL",
      eventKey: "referral_milestone",
      idempotencyKey: key,
      description: `Referral milestone: ${milestoneTarget(step)} friends referred (+${milestoneReward(step)} pts)`,
      referenceType: "referral_milestone",
      referenceId: String(step),
    });
    awarded += milestoneReward(step);
  }
  return awarded;
}
