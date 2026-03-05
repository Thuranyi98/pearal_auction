import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { prisma } from "@/prisma/client";

type Props = {
  searchParams: Promise<{
    q?: string;
    tenderId?: string;
    page?: string;
    pageSize?: string;
  }>;
};

export default async function BiddersPage({ searchParams }: Props) {
  const { q = "", tenderId = "ALL", page = "1", pageSize = "10" } = await searchParams;
  const parsedTenderId = tenderId !== "ALL" ? Number(tenderId) : null;
  const activeTenderId = Number.isInteger(parsedTenderId) && parsedTenderId && parsedTenderId > 0 ? parsedTenderId : null;
  const currentPage = Math.max(1, Number(page) || 1);
  const currentPageSize = [10, 20, 30, 50].includes(Number(pageSize)) ? Number(pageSize) : 10;

  const tenders = await prisma.tender.findMany({
    select: { id: true, code: true, name: true },
    orderBy: { createdAt: "desc" },
  });

  const bidderWhere = {
    ...(q
      ? {
          OR: [
            { bidderNo: { contains: q } },
            { name: { contains: q } },
            { email: { contains: q } },
          ],
        }
      : {}),
    ...(activeTenderId
      ? {
          tenders: {
            some: { tenderId: activeTenderId },
          },
        }
      : {}),
  };

  const totalBidders = await prisma.bidder.count({ where: bidderWhere });
  const totalPages = Math.max(1, Math.ceil(totalBidders / currentPageSize));
  const safePage = Math.min(currentPage, totalPages);

  const bidders = await prisma.bidder.findMany({
    where: {
      ...bidderWhere,
    },
    include: {
      _count: { select: { bids: true } },
      tenders: {
        include: {
          tender: {
            select: { id: true, code: true, name: true },
          },
        },
      },
    },
    orderBy: { bidderNo: "asc" },
    skip: (safePage - 1) * currentPageSize,
    take: currentPageSize,
  });

  return (
    <Card className="overflow-hidden rounded-[24px] border border-slate-200/80 bg-white/95 shadow-none backdrop-blur">
      <CardHeader className="border-b border-slate-200 bg-gradient-to-r from-indigo-50 via-sky-50 to-cyan-50 py-4">
        <CardTitle className="text-sm font-semibold text-slate-800">Bidders</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 p-3">
        <form className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-gradient-to-r from-white to-slate-50 p-2.5">
          <input
            name="q"
            defaultValue={q}
            placeholder="Search bidder no, name, email..."
            className="h-9 min-w-[240px] flex-1 rounded-full border border-slate-200 bg-slate-50 px-3 text-xs outline-none transition-colors focus:border-indigo-300"
          />
          <select
            name="tenderId"
            defaultValue={activeTenderId ? String(activeTenderId) : "ALL"}
            className="h-9 min-w-[240px] rounded-full border border-slate-200 bg-slate-50 px-3 text-xs outline-none transition-colors focus:border-indigo-300"
          >
            <option value="ALL">All Tenders</option>
            {tenders.map((t) => (
              <option key={t.id} value={t.id}>
                {t.code} - {t.name}
              </option>
            ))}
          </select>
          <Button type="submit" className="h-9 rounded-full bg-primary px-4 text-xs text-primary-foreground hover:bg-primary/90">
            Apply
          </Button>
          <input type="hidden" name="page" value="1" />
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
        </form>

        <div className="overflow-x-auto rounded-2xl border border-indigo-100 bg-gradient-to-b from-indigo-50/40 via-white to-sky-50/40">
          <Table className="w-full border-collapse text-xs">
            <TableHeader>
              <TableRow className="bg-indigo-100/50 hover:bg-indigo-100/50">
                <TableHead className="h-[46px] border-b border-r border-slate-200">Bidder No</TableHead>
                <TableHead className="h-[46px] border-b border-r border-slate-200">Name</TableHead>
                <TableHead className="h-[46px] border-b border-r border-slate-200">Email</TableHead>
                <TableHead className="h-[46px] border-b border-r border-slate-200">Status</TableHead>
                <TableHead className="h-[46px] border-b border-r border-slate-200">Tenders</TableHead>
                <TableHead className="h-[46px] border-b border-r border-slate-200 text-right">Bid Count</TableHead>
                <TableHead className="h-[46px] border-b border-slate-200 text-center">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bidders.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={7} className="h-[50px] border-b border-slate-200 text-center text-slate-500">
                    No bidders found.
                  </TableCell>
                </TableRow>
              ) : (
                bidders.map((b) => {
                  const tenderCodes = b.tenders.map((tb) => tb.tender.code);
                  const preferredTenderId = activeTenderId ?? b.tenders[0]?.tender.id ?? null;
                  const bidderStatus = b._count.bids > 0 ? "ACTIVE" : "REGISTERED";
                  return (
                    <TableRow key={b.id} className={`hover:bg-indigo-100/50 ${b.id % 2 === 0 ? "bg-white/90" : "bg-sky-50/60"}`}>
                      <TableCell className="h-[46px] border-b border-r border-slate-200 font-medium">{b.bidderNo}</TableCell>
                      <TableCell className="h-[46px] border-b border-r border-slate-200">{b.name}</TableCell>
                      <TableCell className="h-[46px] border-b border-r border-slate-200">{b.email ?? "-"}</TableCell>
                      <TableCell className="h-[46px] border-b border-r border-slate-200">
                        <Badge
                          variant="outline"
                          className={`rounded-full px-2.5 py-0.5 font-medium ${
                            bidderStatus === "ACTIVE"
                              ? "border-emerald-300 bg-emerald-100/70 text-emerald-700"
                              : "border-slate-300 bg-slate-100 text-slate-600"
                          }`}
                        >
                          {bidderStatus}
                        </Badge>
                      </TableCell>
                      <TableCell className="h-[46px] max-w-[360px] border-b border-r border-slate-200 text-[11px] text-slate-600">
                        {tenderCodes.length ? (
                          <div className="flex flex-wrap gap-1">
                            {tenderCodes.slice(0, 3).map((code) => (
                              <Badge key={code} variant="outline" className="rounded-full border-slate-200 bg-white px-2 py-0 text-[10px] font-medium text-slate-600">
                                {code}
                              </Badge>
                            ))}
                            {tenderCodes.length > 3 ? (
                              <Badge variant="outline" className="rounded-full border-slate-300 bg-slate-100 px-2 py-0 text-[10px] font-medium text-slate-500">
                                +{tenderCodes.length - 3}
                              </Badge>
                            ) : null}
                          </div>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell className="h-[46px] border-b border-r border-slate-200 text-right tabular-nums">{b._count.bids}</TableCell>
                      <TableCell className="h-[46px] border-b border-slate-200 text-center">
                        {preferredTenderId ? (
                          <Button asChild size="sm" variant="outline" className="h-8 rounded-md border-slate-200 px-2">
                            <Link href={`/tenders/${preferredTenderId}?tab=bid-entry&bidderId=${b.id}`}>
                              <ArrowRight className="h-3.5 w-3.5" />
                            </Link>
                          </Button>
                        ) : (
                          <span className="text-[11px] text-slate-400">-</span>
                        )}
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
            <Button asChild type="button" size="sm" variant="outline" className="h-8 rounded-md border-slate-200 px-3 text-xs" disabled={safePage <= 1}>
              <Link
                href={`/bidders?q=${encodeURIComponent(q)}&tenderId=${activeTenderId ?? "ALL"}&page=${Math.max(
                  1,
                  safePage - 1
                )}&pageSize=${currentPageSize}`}
              >
                Prev
              </Link>
            </Button>
            <Button
              asChild
              type="button"
              size="sm"
              variant="outline"
              className="h-8 rounded-md border-slate-200 px-3 text-xs"
              disabled={safePage >= totalPages}
            >
              <Link
                href={`/bidders?q=${encodeURIComponent(q)}&tenderId=${activeTenderId ?? "ALL"}&page=${Math.min(
                  totalPages,
                  safePage + 1
                )}&pageSize=${currentPageSize}`}
              >
                Next
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
