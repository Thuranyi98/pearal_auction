import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResultsTableActions } from "@/components/results/results-table-actions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { calculateLotOutcome, statusLabelFromOutcome } from "@/lib/auction";
import { isLotNotForSale } from "@/lib/lot-sale-status";
import { formatCurrency } from "@/lib/utils";
import { prisma } from "@/prisma/client";

type Props = {
  searchParams: Promise<{ tenderId?: string; page?: string; pageSize?: string }>;
};

function resultStatusBadgeClass(status: string) {
  if (status === "FINAL") return "border-emerald-300 bg-emerald-100/70 text-emerald-700";
  if (status === "TIE") return "border-amber-300 bg-amber-100/70 text-amber-700";
  if (status === "NOT FOR SALE") return "border-slate-300 bg-slate-100/80 text-slate-700";
  return "border-rose-300 bg-rose-100/70 text-rose-700";
}

export default async function ResultsPage({ searchParams }: Props) {
  const { tenderId, page = "1", pageSize = "10" } = await searchParams;
  const tenders = await prisma.tender.findMany({ orderBy: { createdAt: "desc" } });
  const selectedTender = tenders.find((t) => String(t.id) === tenderId) ?? tenders[0];
  const currentPage = Math.max(1, Number(page) || 1);
  const currentPageSize = [10, 20, 30, 50].includes(Number(pageSize)) ? Number(pageSize) : 10;

  if (!selectedTender) {
    return <div>No tender found.</div>;
  }

  const allLots = await prisma.lot.findMany({
    where: { tenderId: selectedTender.id },
    orderBy: { lotNo: "asc" },
    include: { bids: { include: { bidder: true } } },
  });
  const visibleLots = allLots.filter((lot) => !isLotNotForSale(lot));
  const totalLots = visibleLots.length;
  const totalPages = Math.max(1, Math.ceil(totalLots / currentPageSize));
  const safePage = Math.min(currentPage, totalPages);
  const lots = visibleLots.slice((safePage - 1) * currentPageSize, safePage * currentPageSize);
  const exportHref = `/api/results/export?tenderId=${selectedTender.id}`;

  const outcomes = lots.map(calculateLotOutcome);

  return (
    <div className="space-y-3 rounded-2xl bg-gradient-to-br from-sky-50/70 via-white to-violet-50/60 p-2">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Results</h1>
        <p className="mt-0.5 text-sm text-slate-500">Auction result tracking made effortless</p>
      </div>

      <Card className="overflow-hidden rounded-[24px] border border-slate-200/80 bg-white/95 shadow-none backdrop-blur">
        <CardHeader className="border-b border-slate-200 bg-gradient-to-r from-indigo-50 via-sky-50 to-cyan-50 py-4">
          <CardTitle className="text-sm font-semibold text-slate-800">Tender Results</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 p-3">
          <form className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-gradient-to-r from-white to-slate-50 p-2.5">
            <select
              name="tenderId"
              defaultValue={String(selectedTender.id)}
              className="h-9 min-w-[220px] rounded-full border border-slate-200 bg-slate-50 px-3 text-xs outline-none transition-colors focus:border-indigo-300"
            >
              {tenders.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.code}
                </option>
              ))}
            </select>
            <select
              name="pageSize"
              defaultValue={String(currentPageSize)}
              className="h-9 rounded-full border border-slate-200 bg-slate-50 px-3 text-xs outline-none transition-colors focus:border-indigo-300"
            >
              <option value={10}>10 / page</option>
              <option value={20}>20 / page</option>
              <option value={30}>30 / page</option>
              <option value={50}>50 / page</option>
            </select>
            <input type="hidden" name="page" value="1" />
            <Button type="submit" className="h-9 rounded-full bg-primary px-4 text-xs text-primary-foreground hover:bg-primary/90">
              Filter
            </Button>
            <ResultsTableActions exportHref={exportHref} tableId="results-table" />
          </form>

          <div className="overflow-x-auto rounded-2xl border border-indigo-100 bg-gradient-to-b from-indigo-50/40 via-white to-sky-50/40">
            <Table id="results-table" className="w-full border-collapse text-xs">
              <TableHeader>
                <TableRow className="bg-indigo-100/50 hover:bg-indigo-100/50">
                  <TableHead className="h-[46px] border-b border-r border-slate-200">Lot No</TableHead>
                  <TableHead className="h-[46px] border-b border-r border-slate-200 text-right">Start Price</TableHead>
                  <TableHead className="h-[46px] border-b border-r border-slate-200 text-right">Final Price</TableHead>
                  <TableHead className="h-[46px] border-b border-r border-slate-200">Winner Register No</TableHead>
                  <TableHead className="h-[46px] border-b border-r border-slate-200">Winner Name</TableHead>
                  <TableHead className="h-[50px] border-b border-slate-200">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {outcomes.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={6} className="h-[52px] border-b border-slate-200 text-center text-slate-500">
                      No lots found.
                    </TableCell>
                  </TableRow>
                ) : (
                  outcomes.map((o) => {
                    const status = statusLabelFromOutcome(o);
                    return (
                    <TableRow key={o.lotId} className={`hover:bg-indigo-100/50 ${o.lotNo % 2 === 0 ? "bg-white/90" : "bg-sky-50/60"}`}>
                      <TableCell className="h-[46px] border-b border-r border-slate-200 font-medium">{o.lotNo}</TableCell>
                      <TableCell className="h-[46px] border-b border-r border-slate-200 text-right tabular-nums">{formatCurrency(o.startPrice)}</TableCell>
                      <TableCell className="h-[46px] border-b border-r border-slate-200 text-right tabular-nums">
                        {o.topAmount ? formatCurrency(o.topAmount) : "-"}
                      </TableCell>
                      <TableCell className="h-[46px] border-b border-r border-slate-200">
                        {o.winnerBidderNo ? (
                          <Badge variant="outline" className="w-fit rounded-full border-slate-200 bg-white px-2.5 py-0.5 font-medium text-slate-700">
                            {o.winnerBidderNo}
                          </Badge>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell className="h-[46px] border-b border-r border-slate-200">{o.winnerName ?? "-"}</TableCell>
                      <TableCell className="h-[46px] border-b border-slate-200">
                        <Badge variant="outline" className={`rounded-full px-2.5 py-0.5 font-medium ${resultStatusBadgeClass(status)}`}>
                          {status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border border-slate-200 bg-white px-4 py-2.5 text-xs">
            <div className="text-slate-500">
              Page {safePage} of {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <Button
                asChild
                size="sm"
                variant="outline"
                className="h-8 rounded-md border-slate-200 px-3 text-xs"
                disabled={safePage <= 1}
              >
                <Link href={`/results?tenderId=${selectedTender.id}&page=${Math.max(1, safePage - 1)}&pageSize=${currentPageSize}`}>
                  Prev
                </Link>
              </Button>
              <Button
                asChild
                size="sm"
                variant="outline"
                className="h-8 rounded-md border-slate-200 px-3 text-xs"
                disabled={safePage >= totalPages}
              >
                <Link href={`/results?tenderId=${selectedTender.id}&page=${Math.min(totalPages, safePage + 1)}&pageSize=${currentPageSize}`}>
                  Next
                </Link>
              </Button>
            </div>
          </div>

          <div>
            <Button asChild size="sm" variant="outline">
              <Link href={`/tenders/${selectedTender.id}?tab=results`}>Lot Detail</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
