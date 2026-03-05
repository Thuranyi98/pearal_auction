import Link from "next/link";
import { HandCoins } from "lucide-react";

import { MotionBlock } from "@/components/dashboard/motion-block";
import { TenderAnalyticsPanel } from "@/components/dashboard/tender-analytics-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { calculateLotOutcome } from "@/lib/auction";
import { formatCurrency } from "@/lib/utils";
import { prisma } from "@/prisma/client";

function SparkBars({
  points,
  active,
  colorClass,
}: {
  points: { value: number; label: string; tooltip: string }[];
  active: number;
  colorClass: string;
}) {
  const max = Math.max(...points.map((point) => point.value), 1);
  return (
    <div className="flex items-end gap-1.5">
      {points.map((point, idx) => (
        <div key={`${point.label}-${idx}`} className="group relative">
          <div
            className={`w-3 rounded-sm transition-all ${idx === active ? `${colorClass} shadow-lg` : "bg-slate-200"} group-hover:brightness-95`}
            style={{ height: `${12 + (point.value / max) * 28}px` }}
          />
          <div className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded border border-slate-200 bg-white px-2 py-1 text-[10px] font-medium text-slate-700 shadow-sm group-hover:block">
            {point.tooltip}
          </div>
        </div>
      ))}
    </div>
  );
}

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
      take: 5,
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
  const allBids = lots.flatMap((lot) => lot.bids);
  const submittedBidsCount = allBids.filter((bid) => bid.state === "SUBMITTED").length;
  const draftBidsCount = allBids.filter((bid) => bid.state === "DRAFT").length;
  const totalWinningValue = prices.reduce((sum, value) => sum + value, 0);
  const soldRate = lots.length > 0 ? (wonLots.length / lots.length) * 100 : 0;
  const noBidLotsList = lots
    .filter((lot) => lot.bids.filter((bid) => bid.state === "SUBMITTED").length === 0)
    .sort((a, b) => a.tenderId - b.tenderId || a.lotNo - b.lotNo)
    .slice(0, 8)
    .map((lot) => ({
      lotId: lot.id,
      tenderCode: lot.tender.code,
      lotNo: lot.lotNo,
      startPrice: Number(lot.startPrice ?? 0),
    }));
  const tieQueue = lots
    .flatMap((lot) => {
      const submitted = lot.bids
        .filter((bid) => bid.state === "SUBMITTED")
        .sort((a, b) => Number(b.amount) - Number(a.amount));
      if (submitted.length < 2) return [];
      const top = Number(submitted[0].amount);
      const tied = submitted.filter((bid) => Number(bid.amount) === top);
      if (tied.length < 2) return [];
      return [
        {
          lotId: lot.id,
          tenderCode: lot.tender.code,
          lotNo: lot.lotNo,
          topAmount: top,
          tiedBidders: tied.length,
        },
      ];
    })
    .sort((a, b) => b.topAmount - a.topAmount)
    .slice(0, 8);
  const dayKeyFormatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Yangon",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const dayLabelFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Yangon",
    month: "short",
    day: "numeric",
  });
  const submittedDailyMap = new Map<string, number>();
  allBids
    .filter((bid) => bid.state === "SUBMITTED")
    .forEach((bid) => {
      const key = dayKeyFormatter.format(bid.updatedAt);
      const current = submittedDailyMap.get(key) ?? 0;
      submittedDailyMap.set(key, current + Number(bid.amount));
    });
  const now = new Date();
  const sales5DayPoints = Array.from({ length: 5 }, (_, idx) => {
    const date = new Date(now);
    date.setDate(now.getDate() - (4 - idx));
    const key = dayKeyFormatter.format(date);
    const label = dayLabelFormatter.format(date);
    const value = submittedDailyMap.get(key) ?? 0;
    return {
      value,
      label,
      tooltip: `${label}: ${formatCurrency(value)}`,
    };
  });

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
    const topBidders = Array.from(winnerMap.values())
      .sort((a, b) => b.totalAwarded - a.totalAwarded)
      .slice(0, 5);

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
      topBidders,
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
  const aggregateTopBidders = Array.from(aggregateWinnerMap.values())
    .sort((a, b) => b.totalAwarded - a.totalAwarded)
    .slice(0, 5);

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
    topBidders: aggregateTopBidders,
  };

  const recentSeries = tenderAnalytics
    .slice(0, 6)
    .map((item) => item.wonCount)
    .reverse();
  const outcomeSeries = [wonLots.length, tieLots.length, unsoldLots.length];
  const submissionPoints = recentSeries.map((value, idx) => ({
    value,
    label: `P${idx + 1}`,
    tooltip: `Period ${idx + 1}: ${value.toLocaleString("en-US")} bids`,
  }));
  const outcomePoints = [
    {
      value: outcomeSeries[0] ?? 0,
      label: "Sold",
      tooltip: `Sold: ${(outcomeSeries[0] ?? 0).toLocaleString("en-US")} lots`,
    },
    {
      value: outcomeSeries[1] ?? 0,
      label: "Tie",
      tooltip: `Tie: ${(outcomeSeries[1] ?? 0).toLocaleString("en-US")} lots`,
    },
    {
      value: outcomeSeries[2] ?? 0,
      label: "Unsold",
      tooltip: `Unsold: ${(outcomeSeries[2] ?? 0).toLocaleString("en-US")} lots`,
    },
  ];

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
          <div className="grid gap-2.5 border-t border-slate-200 bg-slate-50/40 p-3 lg:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-2.5">
            <p className="text-xs font-medium text-slate-600">Total Awarded Value (USD) - Overall</p>
            <p className="mt-1 text-2xl font-semibold text-orange-500">{formatCurrency(totalWinningValue)}</p>
            <p className="text-xs text-slate-500">Across all sold lots</p>
            <div className="mt-2">
              <SparkBars points={sales5DayPoints} active={4} colorClass="bg-orange-400" />
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-2.5">
            <p className="text-xs font-medium text-slate-600">Bid Submissions (Overall)</p>
            <p className="mt-1 text-2xl font-semibold text-violet-600">{submittedBidsCount.toLocaleString("en-US")}</p>
            <p className="text-xs text-slate-500">{draftBidsCount.toLocaleString("en-US")} draft bids pending</p>
            <div className="mt-2">
              <SparkBars points={submissionPoints.length ? submissionPoints : [{ value: 0, label: "N/A", tooltip: "No data" }]} active={Math.max(submissionPoints.length - 1, 0)} colorClass="bg-violet-600" />
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-2.5">
            <p className="text-xs font-medium text-slate-600">Lot Closure Rate (Overall)</p>
            <p className="mt-1 text-2xl font-semibold text-emerald-500">{soldRate.toFixed(1)}%</p>
            <p className="text-xs text-slate-500">
              Sold {wonLots.length} / {lots.length} lots
            </p>
            <div className="mt-2">
              <SparkBars points={outcomePoints} active={0} colorClass="bg-emerald-500" />
            </div>
          </div>
          </div>
        </MotionBlock>

        <MotionBlock delay={0.12} className="border-t border-slate-200 bg-white p-3">
          <TenderAnalyticsPanel items={tenderAnalytics} aggregate={aggregateAnalytics} />
        </MotionBlock>

        <MotionBlock delay={0.17}>
          <div className="grid gap-2.5 border-t border-slate-200 bg-white p-3 lg:grid-cols-[1.2fr_1fr]">
          <div className="rounded-xl bg-slate-50/40 p-2">
            <div className="mb-1.5 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-800">Latest Transactions</h2>
              <Button asChild size="sm" variant="outline" className="h-7 rounded-md px-2.5 text-[11px]">
                <Link href="/results">View All</Link>
              </Button>
            </div>
            <div className="max-h-[190px] space-y-1 overflow-y-auto pr-1">
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

          <div className="rounded-xl bg-slate-50/40 p-2.5">
            <div className="mb-1.5 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-800">Operational Queue</h2>
              <span className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-600">
                Live
              </span>
            </div>
            <div className="space-y-1.5">
              <div className="rounded-md border border-slate-200 bg-white p-1.5">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-600">Tie Queue Detail</p>
                <div className="space-y-1">
                  {tieQueue.length === 0 ? (
                    <p className="text-xs text-slate-500">No tie lots in queue.</p>
                  ) : (
                    tieQueue.map((item) => (
                      <div key={item.lotId} className="flex items-center justify-between bg-slate-50 px-2 py-0.5 text-[11px]">
                        <span className="font-medium text-slate-700">{item.tenderCode} • Lot #{item.lotNo}</span>
                        <span className="text-slate-600">
                          {item.tiedBidders} tied @ <span className="font-semibold text-slate-800">{formatCurrency(item.topAmount)}</span>
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
              <div className="rounded-md border border-slate-200 bg-white p-1.5">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-600">No-Bid Lots List</p>
                <div className="space-y-1">
                  {noBidLotsList.length === 0 ? (
                    <p className="text-xs text-slate-500">All lots have submitted bids.</p>
                  ) : (
                    noBidLotsList.map((item) => (
                      <div key={item.lotId} className="flex items-center justify-between bg-slate-50 px-2 py-0.5 text-[11px]">
                        <span className="font-medium text-slate-700">{item.tenderCode} • Lot #{item.lotNo}</span>
                        <span className="text-slate-600">Start {formatCurrency(item.startPrice)}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
          </div>
        </MotionBlock>
      </section>
    </div>
  );
}
