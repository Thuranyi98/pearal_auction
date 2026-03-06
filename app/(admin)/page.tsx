import Link from "next/link";
import { HandCoins } from "lucide-react";

import { MotionBlock } from "@/components/dashboard/motion-block";
import { TenderAnalyticsPanel } from "@/components/dashboard/tender-analytics-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { calculateLotOutcome } from "@/lib/auction";
import { formatCurrency } from "@/lib/utils";
import { prisma } from "@/prisma/client";

export default async function DashboardPage() {
  const [tenders, tenderAnalyticsSource, lots, recentSubmittedBids] = await Promise.all([
    prisma.tender.findMany({ orderBy: { createdAt: "desc" }, take: 10 }),
    prisma.tender.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        bidders: true,
        lots: {
          include: {
            bids: {
              include: { bidder: true },
            },
          },
        },
      },
    }),
    prisma.lot.findMany({
      include: {
        tender: {
          select: { code: true },
        },
        bids: {
          include: { bidder: true },
        },
      },
    }),
    prisma.bid.findMany({
      where: { state: "SUBMITTED" },
      orderBy: { updatedAt: "desc" },
      take: 3,
      include: {
        bidder: true,
        lot: true,
        tender: true,
      },
    }),
  ]);

  const outcomes = lots.map(calculateLotOutcome);
  const tieLots = outcomes.filter((o) => o.isTie);
  const wonLots = outcomes.filter((o) => !o.isTie && !o.isUnsold && o.topAmount != null);
  const unsoldLots = outcomes.filter((o) => o.isUnsold);
  const prices = wonLots.map((o) => o.topAmount ?? 0);
  const average = prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
  const highest = prices.length ? Math.max(...prices) : 0;
  const inProgressTender = tenders.find((t) => t.status === "IN_PROGRESS") ?? tenders[0];
  const activeTenderLots = inProgressTender
    ? tenderAnalyticsSource.find((t) => t.id === inProgressTender.id)?.lots.length ?? 0
    : 0;
  const totalWinningValue = prices.reduce((sum, value) => sum + value, 0);
  const soldRate = lots.length > 0 ? (wonLots.length / lots.length) * 100 : 0;
  const tenderAnalytics = tenderAnalyticsSource.map((t) => {
    const tenderOutcomes = t.lots.map(calculateLotOutcome);
    const won = tenderOutcomes.filter((o) => !o.isTie && !o.isUnsold && o.topAmount != null);
    const unsold = tenderOutcomes.filter((o) => o.isUnsold);
    const tie = tenderOutcomes.filter((o) => o.isTie);
    const tenderPrices = won.map((o) => o.topAmount ?? 0);
    const bidStats = t.lots.flatMap((lot) => lot.bids);
    const submittedBids = bidStats.filter((bid) => bid.state === "SUBMITTED").length;
    const draftBids = bidStats.filter((bid) => bid.state === "DRAFT").length;
    const noBidLots = t.lots.filter((lot) => lot.bids.filter((bid) => bid.state === "SUBMITTED").length === 0).length;
    const winnerMap = new Map<string, { bidderNo: string; name: string; wins: number; totalAwarded: number }>();

    for (const outcome of won) {
      if (!outcome.winnerBidderNo || !outcome.winnerName) continue;
      const key = outcome.winnerBidderNo;
      const prev = winnerMap.get(key) ?? {
        bidderNo: outcome.winnerBidderNo,
        name: outcome.winnerName,
        wins: 0,
        totalAwarded: 0,
      };
      winnerMap.set(key, {
        ...prev,
        wins: prev.wins + 1,
        totalAwarded: prev.totalAwarded + Number(outcome.topAmount ?? 0),
      });
    }

    return {
      tenderId: t.id,
      code: t.code,
      name: t.name,
      status: t.status,
      lotCount: t.lots.length,
      wonCount: won.length,
      unsoldCount: unsold.length,
      tieCount: tie.length,
      highest: tenderPrices.length ? Math.max(...tenderPrices) : 0,
      average: tenderPrices.length ? tenderPrices.reduce((a, b) => a + b, 0) / tenderPrices.length : 0,
      lowest: tenderPrices.length ? Math.min(...tenderPrices) : 0,
      bidderCount: t.bidders.length,
      submittedBids,
      draftBids,
      noBidLots,
      topBidders: Array.from(winnerMap.values()).sort((a, b) => b.totalAwarded - a.totalAwarded).slice(0, 5),
    };
  });

  const aggregateWinnerMap = new Map<string, { bidderNo: string; name: string; wins: number; totalAwarded: number }>();
  for (const tender of tenderAnalyticsSource) {
    for (const lot of tender.lots) {
      const outcome = calculateLotOutcome(lot);
      if (outcome.isTie || outcome.isUnsold || outcome.topAmount == null) continue;
      if (!outcome.winnerBidderNo || !outcome.winnerName) continue;
      const key = outcome.winnerBidderNo;
      const prev = aggregateWinnerMap.get(key) ?? {
        bidderNo: outcome.winnerBidderNo,
        name: outcome.winnerName,
        wins: 0,
        totalAwarded: 0,
      };
      aggregateWinnerMap.set(key, {
        ...prev,
        wins: prev.wins + 1,
        totalAwarded: prev.totalAwarded + Number(outcome.topAmount ?? 0),
      });
    }
  }

  const aggregateAnalytics = {
    tenderId: 0 as const,
    code: "ALL" as const,
    name: "All Tenders" as const,
    status: "IN_PROGRESS" as const,
    lotCount: tenderAnalytics.reduce((sum, t) => sum + t.lotCount, 0),
    wonCount: tenderAnalytics.reduce((sum, t) => sum + t.wonCount, 0),
    unsoldCount: tenderAnalytics.reduce((sum, t) => sum + t.unsoldCount, 0),
    tieCount: tenderAnalytics.reduce((sum, t) => sum + t.tieCount, 0),
    highest: tenderAnalytics.length ? Math.max(...tenderAnalytics.map((t) => t.highest)) : 0,
    average: tenderAnalytics.length ? tenderAnalytics.reduce((sum, t) => sum + t.average, 0) / tenderAnalytics.length : 0,
    lowest: (() => {
      const nonZero = tenderAnalytics.map((t) => t.lowest).filter((v) => v > 0);
      return nonZero.length ? Math.min(...nonZero) : 0;
    })(),
    bidderCount: tenderAnalytics.reduce((sum, t) => sum + t.bidderCount, 0),
    submittedBids: tenderAnalytics.reduce((sum, t) => sum + t.submittedBids, 0),
    draftBids: tenderAnalytics.reduce((sum, t) => sum + t.draftBids, 0),
    noBidLots: tenderAnalytics.reduce((sum, t) => sum + t.noBidLots, 0),
    topBidders: Array.from(aggregateWinnerMap.values()).sort((a, b) => b.totalAwarded - a.totalAwarded).slice(0, 5),
  };
  return (
    <div className="space-y-2.5">
      <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white">
        <MotionBlock delay={0.02}>
          <div className="relative bg-gradient-to-r from-indigo-700 via-violet-600 to-fuchsia-500 p-3.5 pb-9 text-white">
            <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10" />
            <div className="absolute right-24 top-8 h-32 w-32 rounded-full bg-white/10" />

            <div className="relative z-10 flex items-center justify-end">
              <Badge variant="outline" className="border-white/30 bg-white/10 text-white">Auction Control Center</Badge>
            </div>

            <div className="relative z-10 mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px]">
              <span className="inline-flex items-center bg-white/10 px-2 py-0.5 text-white/90">
                Snapshot Scope: Overall System
              </span>
              <span className="inline-flex items-center bg-white/10 px-2 py-0.5 text-white/90">
                Active Tender Card: Reference Only
              </span>
            </div>

            <div className="relative z-10 mt-3 grid gap-2.5 lg:grid-cols-3">
              <div className="rounded-2xl bg-gradient-to-br from-emerald-100 to-emerald-200 p-2.5 text-slate-900">
                <p className="text-xs font-medium text-slate-600">Active Tender (Reference)</p>
                <p className="mt-1.5 text-base font-semibold">{inProgressTender ? inProgressTender.name : "No Active Tender"}</p>
                <p className="mt-1 text-xs text-slate-700">Code: {inProgressTender?.code ?? "-"}</p>
                <div className="mt-2.5 flex items-center justify-between">
                  <span className="text-sm font-semibold">Lots: {activeTenderLots}</span>
                  {inProgressTender ? (
                    <Button asChild size="sm" className="h-7 rounded-md bg-slate-900 px-2.5 text-xs hover:bg-slate-800">
                      <Link href={`/tenders/${inProgressTender.id}`}>Open</Link>
                    </Button>
                  ) : null}
                </div>
              </div>

              <div className="rounded-2xl bg-gradient-to-br from-orange-400 to-rose-400 p-2.5 text-white">
                <p className="text-xs font-medium text-white/90">Auction Health (Overall)</p>
                <p className="mt-1.5 text-2xl font-bold">{tieLots.length}</p>
                <p className="text-xs text-white/90">Tie lots need resolution</p>
                <div className="mt-2 text-xs text-white/90">Unsold: {unsoldLots.length} lots</div>
              </div>

              <div className="rounded-2xl bg-gradient-to-br from-cyan-300 to-sky-400 p-2.5 text-slate-900">
                <p className="text-xs font-medium text-slate-700">Winning Average (USD) - Overall</p>
                <p className="mt-1.5 text-3xl font-bold">{formatCurrency(average)}</p>
                <div className="mt-1.5 flex items-center justify-between text-xs">
                  <span>Highest: {formatCurrency(highest)}</span>
                  <span>Awards: {wonLots.length}</span>
                </div>
              </div>
            </div>
          </div>
        </MotionBlock>

        <MotionBlock delay={0.07}>
          <div className="grid gap-2.5 border-t border-slate-200 bg-slate-50/40 p-3 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-2.5">
            <p className="text-xs font-medium text-slate-600">Total Awarded Value (USD) - Overall</p>
            <p className="mt-1 text-2xl font-semibold text-orange-500">{formatCurrency(totalWinningValue)}</p>
            <p className="text-xs text-slate-500">Across all sold lots</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-2.5">
            <p className="text-xs font-medium text-slate-600">Lot Closure Rate (Overall)</p>
            <p className="mt-1 text-2xl font-semibold text-emerald-500">{soldRate.toFixed(1)}%</p>
            <p className="text-xs text-slate-500">Sold {wonLots.length} / {lots.length} lots</p>
          </div>
          </div>
        </MotionBlock>

        <MotionBlock delay={0.12} className="border-t border-slate-200 bg-white p-3">
          <TenderAnalyticsPanel items={tenderAnalytics} aggregate={aggregateAnalytics} />
        </MotionBlock>

        <MotionBlock delay={0.17}>
          <div className="border-t border-slate-200 bg-white p-3">
          <div className="rounded-xl bg-slate-50/40 p-2">
            <div className="mb-1.5 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-800">Latest Transactions</h2>
              <Button asChild size="sm" variant="outline" className="h-7 rounded-md px-2.5 text-[11px]">
                <Link href="/results">View All</Link>
              </Button>
            </div>
            <div className="max-h-[150px] space-y-1 overflow-y-auto pr-1">
              {recentSubmittedBids.length === 0 ? (
                <p className="text-sm text-slate-500">No recent bid submissions.</p>
              ) : (
                recentSubmittedBids.map((bid) => (
                  <div key={bid.id} className="flex items-center justify-between rounded-md border border-slate-200 bg-white px-2 py-1 transition-colors hover:bg-slate-50">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-indigo-100 text-indigo-600">
                        <HandCoins className="h-3 w-3" />
                      </span>
                      <div>
                        <p className="text-xs font-medium text-slate-800">
                          {bid.bidder.name} on Lot #{bid.lot.lotNo}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {bid.tender.code} • {bid.state}
                        </p>
                      </div>
                    </div>
                    <p className="text-xs font-semibold text-slate-900">{formatCurrency(Number(bid.amount))}</p>
                  </div>
                ))
              )}
            </div>
          </div>
          </div>
        </MotionBlock>
      </section>
    </div>
  );
}
