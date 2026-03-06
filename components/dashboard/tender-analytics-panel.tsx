"use client";

import Link from "next/link";
import { type ReactNode, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { BarChart3, ChevronDown, DollarSign, Gavel, Users } from "lucide-react";

import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type TenderAnalytics = {
  topBidders: {
    bidderNo: string;
    name: string;
    wins: number;
    totalAwarded: number;
  }[];
  tenderId: number;
  code: string;
  name: string;
  status: "PREP" | "IN_PROGRESS" | "CLOSED";
  lotCount: number;
  wonCount: number;
  unsoldCount: number;
  tieCount: number;
  highest: number;
  average: number;
  lowest: number;
  bidderCount: number;
  submittedBids: number;
  draftBids: number;
  noBidLots: number;
};

type Props = {
  items: TenderAnalytics[];
  aggregate: Omit<TenderAnalytics, "tenderId" | "code" | "name" | "status"> & {
    tenderId: 0;
    code: "ALL";
    name: "All Tenders";
    status: "IN_PROGRESS";
  };
};

function StatCard({
  label,
  value,
  hint,
  accentClass,
  icon,
}: {
  label: string;
  value: string;
  hint?: string;
  accentClass: string;
  icon: ReactNode;
}) {
  return (
    <motion.div
      className="border border-slate-200 bg-white p-2.5"
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
        <span className={`inline-flex h-7 w-7 items-center justify-center ${accentClass}`}>{icon}</span>
      </div>
      <p className="mt-2 text-xl font-semibold tracking-tight text-slate-900">{value}</p>
      {hint ? <p className="mt-1 text-[11px] text-slate-500">{hint}</p> : null}
    </motion.div>
  );
}

export function TenderAnalyticsPanel({ items, aggregate }: Props) {
  const [selectedKey, setSelectedKey] = useState<string>("ALL");

  const selected = useMemo(() => {
    if (selectedKey === "ALL") return aggregate;
    const id = Number(selectedKey);
    return items.find((x) => x.tenderId === id) ?? aggregate;
  }, [selectedKey, items, aggregate]);

  const totalLots = Math.max(1, selected.lotCount);
  const wonPct = (selected.wonCount / totalLots) * 100;
  const unsoldPct = (selected.unsoldCount / totalLots) * 100;
  const tiePct = (selected.tieCount / totalLots) * 100;

  const topTenders = [...items]
    .sort((a, b) => b.average - a.average)
    .slice(0, 3);

  const detailHref = selectedKey === "ALL" ? "/tenders" : `/tenders/${selected.tenderId}`;

  return (
    <motion.section
      className="space-y-2.5 border border-slate-200 bg-white p-2.5"
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
    >
      <div className="bg-slate-50 p-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-1.5">
              <BarChart3 className="h-4 w-4 text-slate-700" />
              <h2 className="text-sm font-semibold tracking-wide">Tender Analytics</h2>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-600">Tender</label>
            <div className="relative">
              <select
                className="h-8 min-w-[230px] appearance-none border-2 border-slate-400 bg-white pl-2.5 pr-8 text-xs font-medium text-slate-800 outline-none transition-colors focus:border-indigo-500"
                value={selectedKey}
                onChange={(e) => setSelectedKey(e.target.value)}
              >
                <option value="ALL">All Tenders</option>
                {items.map((t) => (
                  <option key={t.tenderId} value={t.tenderId}>
                    {t.code} - {t.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" />
            </div>
            <span className="inline-flex h-8 items-center border border-slate-300 bg-white px-2 text-[11px] font-medium text-slate-700">
              {selected.code}
            </span>
            <Button asChild size="sm" variant="outline" className="h-7 rounded-md border-slate-300 px-2.5 text-[11px]">
              <Link href={detailHref}>View Details</Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Winning Avg"
          value={formatCurrency(selected.average)}
          hint={`Highest ${formatCurrency(selected.highest)}`}
          accentClass="border border-indigo-200 bg-indigo-50 text-indigo-700"
          icon={<DollarSign className="h-4 w-4" />}
        />
        <StatCard
          label="Lots Processed"
          value={selected.lotCount.toLocaleString("en-US")}
          hint={`${selected.wonCount} won / ${selected.unsoldCount} unsold`}
          accentClass="border border-cyan-200 bg-cyan-50 text-cyan-700"
          icon={<BarChart3 className="h-4 w-4" />}
        />
        <StatCard
          label="Bidders"
          value={selected.bidderCount.toLocaleString("en-US")}
          hint={selectedKey === "ALL" ? "Across all tenders" : "In selected tender"}
          accentClass="border border-emerald-200 bg-emerald-50 text-emerald-700"
          icon={<Users className="h-4 w-4" />}
        />
        <StatCard
          label="Tie Cases"
          value={selected.tieCount.toLocaleString("en-US")}
          hint={selected.tieCount > 0 ? "Needs operator resolution" : "No tie currently"}
          accentClass="border border-amber-200 bg-amber-50 text-amber-700"
          icon={<Gavel className="h-4 w-4" />}
        />
      </div>

      <div className="grid gap-2 lg:grid-cols-[1.25fr_1fr]">
        <div className="bg-gradient-to-br from-slate-50 to-white p-2.5">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-700">Outcome Distribution</h3>
          <div className="space-y-1.5">
            <div className="border border-slate-200 bg-white p-3">
              <div className="grid gap-2 lg:grid-cols-[220px_1fr]">
                <div className="relative mx-auto w-[220px]">
                  <svg viewBox="0 0 140 86" className="h-[120px] w-full">
                    <defs>
                      <pattern id="pending-stripe" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
                        <rect width="6" height="6" fill="#f8fafc" />
                        <line x1="0" y1="0" x2="0" y2="6" stroke="#cbd5e1" strokeWidth="2" />
                      </pattern>
                    </defs>
                    <path
                      d="M10 70 A60 60 0 0 1 130 70"
                      fill="none"
                      stroke="#e2e8f0"
                      strokeWidth="16"
                      strokeLinecap="round"
                      pathLength={100}
                    />
                    <path
                      d="M10 70 A60 60 0 0 1 130 70"
                      fill="none"
                      stroke="#34d399"
                      strokeWidth="16"
                      strokeLinecap="round"
                      pathLength={100}
                      strokeDasharray={`${wonPct} ${100 - wonPct}`}
                    />
                    <path
                      d="M10 70 A60 60 0 0 1 130 70"
                      fill="none"
                      stroke="#8b5cf6"
                      strokeWidth="16"
                      strokeLinecap="round"
                      pathLength={100}
                      strokeDasharray={`${tiePct} ${100 - tiePct}`}
                      strokeDashoffset={-wonPct}
                    />
                    <path
                      d="M10 70 A60 60 0 0 1 130 70"
                      fill="none"
                      stroke="url(#pending-stripe)"
                      strokeWidth="16"
                      strokeLinecap="butt"
                      pathLength={100}
                      strokeDasharray={`${unsoldPct} ${100 - unsoldPct}`}
                      strokeDashoffset={-(wonPct + tiePct)}
                    />
                  </svg>
                  <div className="absolute inset-x-0 top-[56px] text-center">
                    <p className="text-3xl font-semibold leading-none text-slate-900">{wonPct.toFixed(0)}%</p>
                    <p className="mt-1 text-[11px] text-slate-500">Sold lots</p>
                  </div>
                </div>
                <div className="my-auto grid gap-1.5 text-[11px] text-slate-600">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                    Sold {selected.wonCount} ({wonPct.toFixed(1)}%)
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-violet-500" />
                    Tie {selected.tieCount} ({tiePct.toFixed(1)}%)
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="inline-block h-2.5 w-2.5 rounded-full border border-slate-300 bg-[repeating-linear-gradient(135deg,#e2e8f0_0px,#e2e8f0_2px,#f8fafc_2px,#f8fafc_4px)]" />
                    Unsold {selected.unsoldCount} ({unsoldPct.toFixed(1)}%)
                  </span>
                  <span className="mt-1 text-[11px] text-slate-500">
                    Total lots: {selected.lotCount.toLocaleString("en-US")}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid gap-1.5 md:grid-cols-3">
              <div className="border border-slate-200 bg-white p-2.5">
                <div className="mb-1 flex items-center justify-between text-[11px]">
                  <span className="text-slate-600">Won Lots</span>
                  <span className="font-medium text-slate-800">{selected.wonCount}</span>
                </div>
                <div className="h-2 w-full overflow-hidden bg-gradient-to-r from-slate-100 to-slate-200/70">
                  <div className="h-full bg-emerald-500" style={{ width: `${wonPct}%` }} />
                </div>
              </div>
              <div className="border border-slate-200 bg-white p-2.5">
                <div className="mb-1 flex items-center justify-between text-[11px]">
                  <span className="text-slate-600">Unsold Lots</span>
                  <span className="font-medium text-slate-800">{selected.unsoldCount}</span>
                </div>
                <div className="h-2 w-full overflow-hidden bg-gradient-to-r from-slate-100 to-slate-200/70">
                  <div className="h-full bg-orange-400" style={{ width: `${unsoldPct}%` }} />
                </div>
              </div>
              <div className="border border-slate-200 bg-white p-2.5">
                <div className="mb-1 flex items-center justify-between text-[11px]">
                  <span className="text-slate-600">Tie Lots</span>
                  <span className="font-medium text-slate-800">{selected.tieCount}</span>
                </div>
                <div className="h-2 w-full overflow-hidden bg-gradient-to-r from-slate-100 to-slate-200/70">
                  <div className="h-full bg-violet-600" style={{ width: `${tiePct}%` }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-50 via-indigo-50/40 to-white p-2">
          <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-700">Top Tender Performance</h3>
          <div className="space-y-1">
            {topTenders.length === 0 ? (
              <p className="text-xs text-slate-500">No tender performance data.</p>
            ) : (
              topTenders.map((t, idx) => (
                <motion.div
                  key={t.tenderId}
                  className="border border-slate-200 bg-gradient-to-r from-white to-slate-50 px-2 py-1.5 text-[11px]"
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.4 }}
                  transition={{ duration: 0.24, ease: "easeOut", delay: idx * 0.05 }}
                  whileHover={{ x: 2 }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[9px] font-semibold text-white">
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-slate-800">{t.code}</p>
                        <p className="truncate text-[10px] text-slate-500">{t.wonCount} won • {t.lotCount} lots</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-indigo-700">{formatCurrency(t.average)}</p>
                      <p className="text-[10px] text-slate-500">Avg</p>
                    </div>
                  </div>
                  <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-slate-200/80">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-violet-400"
                      style={{ width: `${Math.min((t.average / Math.max(selected.average, 1)) * 100, 100)}%` }}
                    />
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-2 lg:grid-cols-2">
        <div className="border border-slate-200 bg-white p-2.5">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-700">Top Bidders</h3>
            <span className="text-[11px] text-slate-500">By total awarded value</span>
          </div>
          {selected.topBidders.length === 0 ? (
            <p className="text-xs text-slate-500">No winning bidder records for this scope.</p>
          ) : (
            <div className="overflow-hidden">
              <div className="grid grid-cols-[1.2fr_2.1fr_0.8fr_1.4fr] bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-600">
                <span>Bidder No</span>
                <span>Name</span>
                <span className="text-right">Wins</span>
                <span className="text-right">Awarded</span>
              </div>
              {selected.topBidders.map((bidder) => (
                <div
                  key={bidder.bidderNo}
                  className="grid grid-cols-[1.2fr_2.1fr_0.8fr_1.4fr] border-t border-slate-100 px-2 py-1.5 text-[11px] text-slate-700"
                >
                  <span className="font-medium">{bidder.bidderNo}</span>
                  <span className="truncate">{bidder.name}</span>
                  <span className="text-right">{bidder.wins}</span>
                  <span className="text-right font-semibold text-indigo-700">{formatCurrency(bidder.totalAwarded)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border border-slate-200 bg-white p-2.5">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-700">Action Needed</h3>
            <span className="text-[11px] text-slate-500">Operational checklist</span>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between bg-amber-50 px-2 py-1.5 text-xs">
              <span className="text-amber-800">Tie lots pending resolution</span>
              <span className="font-semibold text-amber-900">{selected.tieCount}</span>
            </div>
            <div className="flex items-center justify-between bg-slate-50 px-2 py-1.5 text-xs">
              <span className="text-slate-700">Lots with no submitted bids</span>
              <span className="font-semibold text-slate-900">{selected.noBidLots}</span>
            </div>
            <div className="flex items-center justify-between bg-violet-50 px-2 py-1.5 text-xs">
              <span className="text-violet-800">Draft bids pending submit</span>
              <span className="font-semibold text-violet-900">{selected.draftBids}</span>
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
