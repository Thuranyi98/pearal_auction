"use client";

import { motion } from "framer-motion";

import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";

type MonitorRow = {
  lotId: number;
  lotNo: number;
  startPrice: number;
  topAmount: number | null;
  winnerBidderNo: string | null;
  status: string;
};

type Props = {
  monitorTitle: string;
  tenderCode: string;
  tenderName: string;
  tenderStatus: string;
  rows: MonitorRow[];
};

function statusClass(status: string) {
  if (status === "FINAL") return "border-emerald-300 bg-emerald-100/80 text-emerald-700";
  if (status === "UNSOLD") return "border-rose-300 bg-rose-100/80 text-rose-700";
  return "border-amber-300 bg-amber-100/80 text-amber-700";
}

export function TenderMonitorGameBoard({ monitorTitle, tenderCode, tenderName, tenderStatus, rows }: Props) {
  const soldCount = rows.filter((row) => row.status === "FINAL").length;
  const highest = rows.reduce((max, row) => Math.max(max, row.topAmount ?? 0), 0);
  const topRow = rows.reduce<MonitorRow | null>((best, row) => {
    if ((row.topAmount ?? 0) <= 0) return best;
    if (!best) return row;
    return (row.topAmount ?? 0) > (best.topAmount ?? 0) ? row : best;
  }, null);

  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      <div className="overflow-hidden rounded-[28px] border border-indigo-200/70 bg-gradient-to-r from-indigo-700 via-violet-600 to-fuchsia-500 p-6 text-white shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-4xl font-black uppercase tracking-[0.08em] text-white">{monitorTitle}</h1>
            <p className="mt-1 text-sm text-white/90">
              Tender {tenderCode} - {tenderName}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-300" />
            <Badge variant="outline" className="rounded-full border-white/40 bg-white/15 px-3 py-1 text-white">
              LIVE MONITOR
            </Badge>
            <Badge variant="outline" className="rounded-full border-white/40 bg-white/15 px-3 py-1 text-white">
              Status: {tenderStatus}
            </Badge>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl bg-gradient-to-br from-emerald-100 to-emerald-200 p-3 text-slate-900">
            <p className="text-xs uppercase tracking-wide text-slate-700">Lots on Screen</p>
            <p className="mt-1 text-3xl font-extrabold">{rows.length}</p>
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-orange-400 to-rose-400 p-3 text-white">
            <p className="text-xs uppercase tracking-wide text-white/90">Sold Lots</p>
            <p className="mt-1 text-3xl font-extrabold">{soldCount}</p>
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-cyan-300 to-sky-400 p-3 text-slate-900">
            <p className="text-xs uppercase tracking-wide text-slate-700">Highest Bid</p>
            <p className="mt-1 text-3xl font-extrabold">{formatCurrency(highest)}</p>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-[26px] border border-slate-200 bg-gradient-to-b from-slate-100/80 via-white to-indigo-50/60 p-3">
        {topRow ? (
          <div className="mb-2 overflow-hidden rounded-2xl border border-amber-300/80 bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-300 px-2 py-2">
            <motion.div
              className="flex w-max items-center gap-10 whitespace-nowrap text-sm font-black uppercase tracking-wide text-amber-950"
              animate={{ x: ["100%", "-100%"] }}
              transition={{ duration: 12, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
            >
              <span>Big Bid Alert</span>
              <span>
                Lot #{topRow.lotNo} - Bidder {topRow.winnerBidderNo ?? "-"} leading with {formatCurrency(topRow.topAmount ?? 0)}
              </span>
              <span>Big Bid Alert</span>
              <span>
                Lot #{topRow.lotNo} - Bidder {topRow.winnerBidderNo ?? "-"} leading with {formatCurrency(topRow.topAmount ?? 0)}
              </span>
            </motion.div>
          </div>
        ) : null}

        <div className="grid grid-cols-[0.7fr_1fr_1fr_1.2fr_0.9fr] items-center gap-3 rounded-2xl bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 px-4 py-3 text-sm font-semibold uppercase tracking-wide text-slate-100">
          <div>Lot</div>
          <div className="text-right">Start</div>
          <div className="text-right">Top / Final</div>
          <div>Winner</div>
          <div>Status</div>
        </div>

        <div className="mt-2 space-y-2">
          {rows.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500">
              No lots available for display.
            </div>
          ) : (
            rows.map((row, idx) => (
              <motion.div
                key={row.lotId}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: idx * 0.03 }}
                className={`grid grid-cols-[0.7fr_1fr_1fr_1.2fr_0.9fr] items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 ${
                  idx % 2 === 0 ? "bg-white" : "bg-indigo-50/60"
                }`}
              >
                <div className="text-xl font-black text-slate-900">#{row.lotNo}</div>
                <div className="text-right text-base font-semibold text-slate-700">{formatCurrency(row.startPrice)}</div>
                <div className="text-right text-lg font-extrabold text-indigo-700">{row.topAmount ? formatCurrency(row.topAmount) : "-"}</div>
                <div className="text-base font-semibold text-slate-800">{row.winnerBidderNo ? `Bidder ${row.winnerBidderNo}` : "-"}</div>
                <div>
                  <Badge variant="outline" className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusClass(row.status)}`}>
                    {row.status}
                  </Badge>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
