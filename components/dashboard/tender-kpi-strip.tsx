"use client";

import { type ReactNode, useMemo, useState } from "react";
import { Activity, CircleDollarSign, Trophy } from "lucide-react";

import { formatCurrency } from "@/lib/utils";

type TenderKpi = {
  tenderId: number;
  code: string;
  name: string;
  totalLots: number;
  soldLots: number;
  unsoldLots: number;
  tieLots: number;
  winningValue: number;
  submittedBids: number;
  draftBids: number;
};

type Props = {
  items: TenderKpi[];
  aggregate: TenderKpi;
};

function KpiCard({
  title,
  value,
  hint,
  icon,
  accent,
}: {
  title: string;
  value: string;
  hint: string;
  icon: ReactNode;
  accent: string;
}) {
  return (
    <div className="border border-slate-200 bg-white p-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{title}</p>
        <span className={`inline-flex h-7 w-7 items-center justify-center border ${accent}`}>{icon}</span>
      </div>
      <p className="mt-2 text-xl font-semibold text-slate-900">{value}</p>
      <p className="mt-1 text-[11px] text-slate-500">{hint}</p>
    </div>
  );
}

export function TenderKpiStrip({ items, aggregate }: Props) {
  const [selectedKey, setSelectedKey] = useState<string>("ALL");

  const selected = useMemo(() => {
    if (selectedKey === "ALL") return aggregate;
    const id = Number(selectedKey);
    return items.find((item) => item.tenderId === id) ?? aggregate;
  }, [selectedKey, items, aggregate]);

  const soldRate = selected.totalLots > 0 ? (selected.soldLots / selected.totalLots) * 100 : 0;
  const tieRate = selected.totalLots > 0 ? (selected.tieLots / selected.totalLots) * 100 : 0;
  const unsoldRate = selected.totalLots > 0 ? (selected.unsoldLots / selected.totalLots) * 100 : 0;

  return (
    <section className="space-y-2 border border-slate-200 bg-slate-50/40 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold text-slate-700">Tender KPI</p>
        <select
          className="h-8 min-w-[220px] border border-slate-300 bg-white px-2.5 text-xs text-slate-700 outline-none"
          value={selectedKey}
          onChange={(e) => setSelectedKey(e.target.value)}
        >
          <option value="ALL">All Tenders</option>
          {items.map((item) => (
            <option key={item.tenderId} value={item.tenderId}>
              {item.code} - {item.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-2 lg:grid-cols-3">
        <KpiCard
          title="Awarded Value (USD)"
          value={formatCurrency(selected.winningValue)}
          hint={`${selected.soldLots.toLocaleString("en-US")} sold lots`}
          icon={<CircleDollarSign className="h-4 w-4" />}
          accent="border-emerald-200 bg-emerald-50 text-emerald-700"
        />
        <KpiCard
          title="Sold Rate"
          value={`${soldRate.toFixed(1)}%`}
          hint={`${selected.soldLots} / ${selected.totalLots} lots sold`}
          icon={<Trophy className="h-4 w-4" />}
          accent="border-indigo-200 bg-indigo-50 text-indigo-700"
        />
        <KpiCard
          title="Bid Activity"
          value={selected.submittedBids.toLocaleString("en-US")}
          hint={`${selected.draftBids.toLocaleString("en-US")} draft bids`}
          icon={<Activity className="h-4 w-4" />}
          accent="border-amber-200 bg-amber-50 text-amber-700"
        />
      </div>

      <div className="border border-slate-200 bg-white p-2.5">
        <div className="mb-1 flex items-center justify-between text-[11px] text-slate-600">
          <span>Lot Outcome Distribution</span>
          <span>{selected.totalLots.toLocaleString("en-US")} total lots</span>
        </div>
        <div className="flex h-3 w-full overflow-hidden border border-slate-200 bg-slate-100">
          <div className="h-full bg-teal-700" style={{ width: `${soldRate}%` }} />
          <div className="h-full bg-rose-700" style={{ width: `${tieRate}%` }} />
          <div className="h-full bg-amber-700" style={{ width: `${unsoldRate}%` }} />
        </div>
      </div>
    </section>
  );
}
