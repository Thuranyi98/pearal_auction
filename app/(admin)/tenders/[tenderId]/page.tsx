import { notFound } from "next/navigation";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LotsManagementTable } from "@/components/lots/lots-management-table";
import { BidderAutoSelect } from "@/components/tenders/bidder-auto-select";
import { DeleteTenderConfirm } from "@/components/tenders/delete-tender-confirm";
import { EditBidderDialog } from "@/components/tenders/edit-bidder-dialog";
import { TenderStatusActions } from "@/components/tenders/tender-status-actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { addBidder, deleteTender, removeBidderFromTender, resolveTieByRebid, saveBidEntry, updateBidderInTender, updateTenderInfo, updateTenderStatus } from "@/lib/actions";
import { calculateLotOutcome, statusLabelFromOutcome, toNumber } from "@/lib/auction";
import { isLotNotForSale } from "@/lib/lot-sale-status";
import { formatCurrency } from "@/lib/utils";
import { prisma } from "@/prisma/client";

type Props = {
  params: Promise<{ tenderId: string }>;
  searchParams: Promise<{ tab?: string; bidderId?: string; detailLotId?: string }>;
};

const tabs = [
  { key: "overview", label: "Overview" },
  { key: "lots", label: "Lots" },
  { key: "bidders", label: "Bidders" },
  { key: "bid-entry", label: "Bid Entry" },
  { key: "monitor", label: "Monitor" },
  { key: "results", label: "Results" },
  { key: "settings", label: "Settings" },
];

function lotStatusBadgeClass(status: string) {
  if (status === "FINAL") return "border-emerald-300 bg-emerald-100/70 text-emerald-700";
  if (status === "TIE") return "border-amber-300 bg-amber-100/70 text-amber-700";
  return "border-rose-300 bg-rose-100/70 text-rose-700";
}

export default async function TenderDetailPage({ params, searchParams }: Props) {
  const { tenderId } = await params;
  const { tab = "overview", bidderId, detailLotId } = await searchParams;
  const id = Number(tenderId);

  const tender = await prisma.tender.findUnique({
    where: { id },
    include: {
      lots: {
        orderBy: { lotNo: "asc" },
        include: {
          bids: {
            include: { bidder: true },
          },
        },
      },
      bidders: {
        include: {
          bidder: true,
        },
      },
    },
  });

  if (!tender) notFound();

  const selectedBidderId = bidderId ? Number(bidderId) : tender.bidders[0]?.bidder.id;
  const isTenderClosed = tender.status === "CLOSED";
  const outcomes = tender.lots.map(calculateLotOutcome);
  const tieOutcomes = outcomes.filter((o) => {
    const lot = tender.lots.find((x) => x.id === o.lotId);
    if (!lot) return false;
    return o.isTie && !isLotNotForSale(lot);
  });
  const submittedBidsCount = tender.lots.flatMap((lot) => lot.bids).filter((bid) => bid.state === "SUBMITTED").length;
  const soldLotsCount = outcomes.filter((o) => !o.isTie && !o.isUnsold && o.topAmount != null).length;
  const closureRate = tender.lots.length > 0 ? (soldLotsCount / tender.lots.length) * 100 : 0;
  const monitorPath = `/monitor/tenders/${tender.code}`;
  const selectedBidder = tender.bidders.find((b) => b.bidder.id === selectedBidderId)?.bidder;
  const selectedDetailLotId = detailLotId ? Number(detailLotId) : null;
  const selectedTieLot = tieOutcomes.length
    ? tender.lots.find((lot) => lot.id === tieOutcomes[0].lotId)
    : null;
  const tenderDateValue = tender.date ? new Date(tender.date).toISOString().slice(0, 10) : "";

  const bidMap = selectedBidderId
    ? new Map(
        (
          await prisma.bid.findMany({
            where: {
              tenderId: id,
              bidderId: selectedBidderId,
            },
          })
        ).map((b) => [`${b.lotId}`, b])
      )
    : new Map();

  return (
    <div className="space-y-3 rounded-2xl bg-gradient-to-br from-sky-50/70 via-white to-violet-50/60 p-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Tender Detail: {tender.code} <span className="text-base font-normal text-slate-600">Status: {tender.status}</span>
        </h1>
        <Badge variant="outline" className="rounded-full border-slate-200 bg-white px-3 py-1">Currency: USD</Badge>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <Button
            key={t.key}
            asChild
            size="sm"
            variant={tab === t.key ? "default" : "outline"}
            className={tab === t.key ? "h-8 rounded-full bg-primary px-3 text-xs hover:bg-primary/90" : "h-8 rounded-full border-slate-200 bg-white px-3 text-xs"}
          >
            <Link href={`/tenders/${id}?tab=${t.key}`}>{t.label}</Link>
          </Button>
        ))}
      </div>

      {tab === "overview" && (
        <Card className="overflow-hidden rounded-[24px] border border-slate-200/80 bg-white/95 shadow-none backdrop-blur">
          <CardHeader className="border-b border-slate-200 bg-gradient-to-r from-indigo-700 via-violet-600 to-fuchsia-500 py-5 text-white">
            <CardTitle className="text-base font-semibold text-white">Overview</CardTitle>
            <p className="mt-1 text-xs text-white/85">
              Live operational snapshot for tender {tender.code}
            </p>
            <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
              <span className="rounded-full border border-white/30 bg-white/15 px-2.5 py-1">Status: {tender.status}</span>
              <span className="rounded-full border border-white/30 bg-white/15 px-2.5 py-1">Currency: USD</span>
              <span className="rounded-full border border-white/30 bg-white/15 px-2.5 py-1">Auto Monitor Ready</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 p-3">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl bg-gradient-to-br from-emerald-100 to-emerald-200 p-3 text-slate-900">
                <p className="text-xs font-medium text-slate-700">Lots</p>
                <p className="mt-1 text-2xl font-bold">{tender.lots.length}</p>
                <p className="text-[11px] text-slate-700">Total configured lots</p>
              </div>
              <div className="rounded-2xl bg-gradient-to-br from-cyan-200 to-sky-300 p-3 text-slate-900">
                <p className="text-xs font-medium text-slate-700">Bidders</p>
                <p className="mt-1 text-2xl font-bold">{tender.bidders.length}</p>
                <p className="text-[11px] text-slate-700">Registered participants</p>
              </div>
              <div className="rounded-2xl bg-gradient-to-br from-orange-300 to-rose-400 p-3 text-white">
                <p className="text-xs font-medium text-white/90">Tie Lots</p>
                <p className="mt-1 text-2xl font-bold">{tieOutcomes.length}</p>
                <p className="text-[11px] text-white/90">Require rebid resolution</p>
              </div>
              <div className="rounded-2xl bg-gradient-to-br from-violet-200 to-fuchsia-200 p-3 text-slate-900">
                <p className="text-xs font-medium text-slate-700">Closure Rate</p>
                <p className="mt-1 text-2xl font-bold">{closureRate.toFixed(1)}%</p>
                <p className="text-[11px] text-slate-700">{submittedBidsCount} submitted bids</p>
              </div>
            </div>

            <TenderStatusActions tenderId={id} tenderStatus={tender.status} updateStatusAction={updateTenderStatus} />
          </CardContent>
        </Card>
      )}

      {tab === "lots" && (
        <div className="space-y-4">
          <Card className="overflow-hidden rounded-[24px] border border-slate-200/80 bg-white/95 shadow-none backdrop-blur">
            <CardHeader className="border-b border-slate-200 bg-gradient-to-r from-indigo-50 via-sky-50 to-cyan-50 py-4">
              <CardTitle className="text-sm font-semibold text-slate-800">Lots</CardTitle>
            </CardHeader>
            <CardContent className="p-3">
              <LotsManagementTable
                tenderId={id}
                tenderStatus={tender.status}
                initialRows={tender.lots.map((lot) => {
                  const out = calculateLotOutcome(lot);
                  return {
                    id: lot.id,
                    lotNo: lot.lotNo,
                    shape: lot.shape || "-",
                    color: lot.color || "-",
                    lustre: lot.lustre || "-",
                    surface: lot.surface || "-",
                    size: lot.size || "-",
                    startPrice: toNumber(lot.startPrice),
                    topBid: out.topAmount,
                    topBidder: out.isTie ? "Tie" : out.winnerBidderNo ? `Bidder${out.winnerBidderNo}` : "-",
                    notForSale: isLotNotForSale(lot),
                  };
                })}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "bidders" && (
        <div className="space-y-4">
          <Card className="overflow-hidden rounded-[24px] border border-slate-200/80 bg-white/95 shadow-none backdrop-blur">
            <CardHeader className="border-b border-slate-200 bg-gradient-to-r from-indigo-50 via-sky-50 to-cyan-50 py-4">
              <CardTitle className="text-sm font-semibold text-slate-800">Bidders</CardTitle>
            </CardHeader>
            <CardContent className="p-3">
              <div className="overflow-x-auto rounded-2xl border border-indigo-100 bg-gradient-to-b from-indigo-50/40 via-white to-sky-50/40">
              <Table className="w-full border-collapse text-xs">
                <TableHeader>
                  <TableRow className="bg-indigo-100/50 hover:bg-indigo-100/50">
                    <TableHead className="h-[46px] border-b border-r border-slate-200">Bidder No</TableHead>
                    <TableHead className="h-[46px] border-b border-r border-slate-200">Name</TableHead>
                    <TableHead className="h-[46px] border-b border-r border-slate-200">Email</TableHead>
                    <TableHead className="h-[46px] border-b border-r border-slate-200 text-right">Bid Count</TableHead>
                    <TableHead className="h-[46px] border-b border-slate-200 text-center">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tender.bidders.map((tb, idx) => (
                    <TableRow key={tb.id} className={`hover:bg-indigo-100/50 ${idx % 2 === 0 ? "bg-white/90" : "bg-sky-50/60"}`}>
                      <TableCell className="h-[46px] border-b border-r border-slate-200 font-medium">{tb.bidder.bidderNo}</TableCell>
                      <TableCell className="h-[46px] border-b border-r border-slate-200">{tb.bidder.name}</TableCell>
                      <TableCell className="h-[46px] border-b border-r border-slate-200">{tb.bidder.email ?? "-"}</TableCell>
                      <TableCell className="h-[46px] border-b border-r border-slate-200 text-right tabular-nums">
                        {
                          tender.lots.flatMap((l) => l.bids).filter((b) => b.bidderId === tb.bidder.id && b.state === "SUBMITTED")
                            .length
                        }
                      </TableCell>
                      <TableCell className="h-[46px] border-b border-slate-200 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <EditBidderDialog
                            tenderId={id}
                            bidderId={tb.bidder.id}
                            bidderNo={tb.bidder.bidderNo}
                            name={tb.bidder.name}
                            email={tb.bidder.email ?? null}
                            disabled={isTenderClosed}
                            updateAction={updateBidderInTender}
                          />
                          <form action={removeBidderFromTender}>
                            <input type="hidden" name="tenderId" value={id} />
                            <input type="hidden" name="bidderId" value={tb.bidder.id} />
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={isTenderClosed}
                              className="h-8 rounded-full border-rose-300 bg-rose-50 px-3 text-xs text-rose-700 hover:bg-rose-100"
                            >
                              Delete
                            </Button>
                          </form>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden rounded-[24px] border border-slate-200/80 bg-white/95 shadow-none backdrop-blur">
            <CardHeader className="border-b border-slate-200 bg-gradient-to-r from-fuchsia-50 via-white to-sky-50 py-4">
              <CardTitle className="text-sm font-semibold text-slate-800">Add/Edit Bidder</CardTitle>
            </CardHeader>
            <CardContent className="p-3">
              <form action={addBidder} className="grid gap-3 rounded-2xl border border-slate-200 bg-gradient-to-r from-white to-slate-50 p-3 md:grid-cols-4">
                <input type="hidden" name="tenderId" value={id} />
                <div className="grid gap-2">
                  <Label htmlFor="bidderNo" className="text-xs text-slate-600">Bidder No*</Label>
                  <Input id="bidderNo" name="bidderNo" required disabled={isTenderClosed} className="h-9 rounded-full border-slate-200 bg-slate-50 text-xs" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="name" className="text-xs text-slate-600">Name*</Label>
                  <Input id="name" name="name" required disabled={isTenderClosed} className="h-9 rounded-full border-slate-200 bg-slate-50 text-xs" />
                </div>
                <div className="grid gap-2 md:col-span-2">
                  <Label htmlFor="email" className="text-xs text-slate-600">Email</Label>
                  <Input id="email" name="email" type="email" disabled={isTenderClosed} className="h-9 rounded-full border-slate-200 bg-slate-50 text-xs" />
                </div>
                <Button type="submit" disabled={isTenderClosed} className="h-9 rounded-full bg-primary px-4 text-xs hover:bg-primary/90 md:col-span-4 md:w-fit">
                  Save
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "bid-entry" && (
        <div className="space-y-4">
          <Card className="overflow-hidden rounded-[24px] border border-slate-200/80 bg-white/95 shadow-none backdrop-blur">
            <CardHeader className="border-b border-slate-200 bg-gradient-to-r from-indigo-50 via-sky-50 to-cyan-50 py-4">
              <CardTitle className="text-sm font-semibold text-slate-800">Bid Entry</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-white to-slate-50 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <BidderAutoSelect
                    currentBidderId={selectedBidderId}
                    disabled={isTenderClosed}
                    bidders={tender.bidders.map((tb) => ({
                      id: tb.bidder.id,
                      bidderNo: tb.bidder.bidderNo,
                      name: tb.bidder.name,
                    }))}
                  />
                </div>
              </div>

              {selectedBidder ? (
                <>
                  <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm">
                    <span className="text-slate-500">Bidder:</span>{" "}
                    <span className="font-medium text-slate-800">
                      {selectedBidder.bidderNo} {selectedBidder.name}
                    </span>
                  </div>

                  <form key={`bid-entry-${selectedBidder.id}`} action={saveBidEntry} className="space-y-3">
                    <input type="hidden" name="tenderId" value={id} />
                    <input type="hidden" name="bidderId" value={selectedBidder.id} />

                    <div className="overflow-x-auto rounded-2xl border border-indigo-100 bg-gradient-to-b from-indigo-50/40 via-white to-sky-50/40">
                    <Table className="w-full border-collapse text-xs">
                      <TableHeader>
                        <TableRow className="bg-indigo-100/50 hover:bg-indigo-100/50">
                          <TableHead className="h-[46px] border-b border-r border-slate-200">Lot No</TableHead>
                          <TableHead className="h-[46px] border-b border-r border-slate-200 text-right">Start Price</TableHead>
                          <TableHead className="h-[46px] border-b border-r border-slate-200">Top Bid</TableHead>
                          <TableHead className="h-[46px] border-b border-r border-slate-200">Your Bid</TableHead>
                          <TableHead className="h-[46px] border-b border-slate-200">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {tender.lots.map((lot, idx) => {
                          const out = calculateLotOutcome(lot);
                          const myBid = bidMap.get(`${lot.id}`);
                          const lotNotForSale = isLotNotForSale(lot);
                          return (
                            <TableRow key={lot.id} className={`hover:bg-indigo-100/50 ${idx % 2 === 0 ? "bg-white/90" : "bg-sky-50/60"}`}>
                              <TableCell className="h-[46px] border-b border-r border-slate-200 font-medium">{lot.lotNo}</TableCell>
                              <TableCell className="h-[46px] border-b border-r border-slate-200 text-right">
                                {formatCurrency(toNumber(lot.startPrice))}
                              </TableCell>
                              <TableCell className="h-[46px] border-b border-r border-slate-200">
                                {out.topAmount
                                  ? `${formatCurrency(out.topAmount)}${out.isTie ? " (Tie)" : out.winnerBidderNo ? ` (B${out.winnerBidderNo})` : ""}`
                                  : "-"}
                              </TableCell>
                              <TableCell className="h-[46px] border-b border-r border-slate-200">
                                <Input
                                  name={`bid_${lot.id}`}
                                  defaultValue={myBid ? String(toNumber(myBid.amount)) : ""}
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  className="h-8 rounded-md border-slate-200 text-xs"
                                  disabled={lotNotForSale || isTenderClosed}
                                />
                              </TableCell>
                              <TableCell className="h-[46px] border-b border-slate-200 text-xs text-amber-700">
                                {lotNotForSale ? "NOT FOR SALE" : myBid?.warningBelowStart ? "Below start price" : ""}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                    </div>

                    <div className="flex flex-wrap justify-end gap-2">
                      <Button type="submit" name="mode" value="SUBMITTED" disabled={isTenderClosed} className="h-9 rounded-full bg-primary px-4 text-xs text-primary-foreground hover:bg-primary/90">
                        Submit / Confirm
                      </Button>
                    </div>
                  </form>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Please add at least one bidder first.</p>
              )}
            </CardContent>
          </Card>

          <Card className="overflow-hidden rounded-[24px] border border-slate-200/80 bg-white/95 shadow-none backdrop-blur">
            <CardHeader className="border-b border-slate-200 bg-gradient-to-r from-fuchsia-50 via-white to-sky-50 py-4">
              <CardTitle className="text-sm font-semibold text-slate-800">Tie Resolution</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedTieLot ? (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
                  <div className="mb-2 text-sm font-medium text-amber-900">
                    Resolve Lot #{selectedTieLot.lotNo}
                  </div>
                  <p className="mb-3 text-xs text-amber-800">
                    Tied bidders must rebid for this lot. Highest unique rebid amount wins automatically.
                  </p>
                  <form action={resolveTieByRebid} className="space-y-3">
                    <input type="hidden" name="tenderId" value={id} />
                    <input type="hidden" name="lotId" value={selectedTieLot.id} />
                    <div className="grid gap-2 md:grid-cols-2">
                      {selectedTieLot.bids
                        .filter((b) => b.state === "SUBMITTED")
                        .sort((a, b) => toNumber(b.amount) - toNumber(a.amount))
                        .filter((b, _idx, arr) => toNumber(b.amount) === toNumber(arr[0].amount))
                        .map((b) => (
                          <div key={b.id} className="rounded-md border border-amber-200 bg-white p-2">
                            <div className="mb-1 text-xs font-medium text-slate-800">
                              {b.bidder.bidderNo} - {b.bidder.name}
                            </div>
                            <Label htmlFor={`rebid_${b.id}`} className="text-[11px] text-slate-600">
                              Rebid Amount (current {formatCurrency(toNumber(b.amount))})
                            </Label>
                            <Input
                              id={`rebid_${b.id}`}
                              name={`rebid_${b.id}`}
                              type="number"
                              min={String(toNumber(b.amount))}
                              step="0.01"
                              required
                              defaultValue={String(toNumber(b.amount))}
                              disabled={isTenderClosed}
                              className="mt-1 h-9 rounded-md border-slate-300 bg-white text-xs"
                            />
                          </div>
                        ))}
                    </div>
                    <div className="flex justify-end">
                      <Button type="submit" disabled={isTenderClosed} className="h-9 rounded-full bg-primary px-4 text-xs text-primary-foreground hover:bg-primary/90">
                        Confirm Rebid Winner
                      </Button>
                    </div>
                  </form>
                </div>
              ) : null}

              <div className="overflow-x-auto rounded-2xl border border-indigo-100 bg-gradient-to-b from-indigo-50/40 via-white to-sky-50/40">
              <Table className="w-full border-collapse text-xs">
                <TableHeader>
                  <TableRow className="bg-indigo-100/50 hover:bg-indigo-100/50">
                    <TableHead className="h-[46px] border-b border-r border-slate-200">LotNo</TableHead>
                    <TableHead className="h-[46px] border-b border-r border-slate-200">TieAmount</TableHead>
                    <TableHead className="h-[46px] border-b border-r border-slate-200">Bidders</TableHead>
                    <TableHead className="h-[46px] border-b border-slate-200">Detail</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tieOutcomes.map((t, idx) => {
                    const lot = tender.lots.find((x) => x.id === t.lotId)!;
                    const tied = lot.bids.filter((b) => b.state === "SUBMITTED" && toNumber(b.amount) === t.topAmount);
                    const details = lot.bids
                      .filter((b) => b.state === "SUBMITTED")
                      .sort((a, b) => toNumber(b.amount) - toNumber(a.amount))
                      .map((b) => `${b.bidder.bidderNo}-${b.bidder.name}: ${formatCurrency(toNumber(b.amount))}`)
                      .join(" | ");
                    return [
                      <TableRow key={`tie-${t.lotId}`} className={idx % 2 === 0 ? "bg-white/90" : "bg-sky-50/60"}>
                          <TableCell className="h-[46px] border-b border-r border-slate-200">{t.lotNo}</TableCell>
                          <TableCell className="h-[46px] border-b border-r border-slate-200">{formatCurrency(t.topAmount ?? 0)}</TableCell>
                          <TableCell className="h-[46px] border-b border-r border-slate-200">{tied.map((x) => `${x.bidder.bidderNo}-${x.bidder.name}`).join(", ")}</TableCell>
                          <TableCell className="h-[46px] border-b border-slate-200">
                            <Button asChild size="sm" variant="ghost" className="h-8 rounded-full px-3 text-xs text-indigo-700 hover:bg-indigo-100/70">
                              <Link
                                href={`/tenders/${id}?tab=bid-entry${
                                  selectedBidderId ? `&bidderId=${selectedBidderId}` : ""
                                }&detailLotId=${t.lotId}#tie-table`}
                              >
                                Detail
                              </Link>
                            </Button>
                          </TableCell>
                      </TableRow>,
                      selectedDetailLotId === t.lotId ? (
                        <TableRow key={`tie-detail-${t.lotId}`}>
                          <TableCell colSpan={4} className="bg-slate-50">
                            <div className="text-xs text-slate-700">{details}</div>
                          </TableCell>
                        </TableRow>
                      ) : null,
                    ];
                  })}
                  {tieOutcomes.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="h-[46px] border-b border-slate-200 text-muted-foreground">
                        No tie lots
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "monitor" && (
        <Card className="overflow-hidden rounded-[24px] border border-slate-200/80 bg-white/95 shadow-none backdrop-blur">
          <CardHeader className="border-b border-slate-200 bg-gradient-to-r from-indigo-700 via-violet-600 to-fuchsia-500 py-5 text-white">
            <CardTitle className="text-base font-semibold text-white">Monitor</CardTitle>
            <p className="mt-1 text-xs text-white/85">Public display stream for live tender broadcast</p>
            <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
              <span className="rounded-full border border-white/30 bg-white/15 px-2.5 py-1">Live Board Enabled</span>
              <span className="rounded-full border border-white/30 bg-white/15 px-2.5 py-1">Tie Lots Hidden</span>
              <span className="rounded-full border border-white/30 bg-white/15 px-2.5 py-1">Auto Refresh: ON</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 p-3 text-sm">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl bg-gradient-to-br from-emerald-100 to-emerald-200 p-3 text-slate-900">
                <p className="text-xs font-medium text-slate-700">Display Lots</p>
                <p className="mt-1 text-2xl font-bold">{tender.lots.length}</p>
                <p className="text-[11px] text-slate-700">Visible on TV monitor</p>
              </div>
              <div className="rounded-2xl bg-gradient-to-br from-orange-300 to-rose-400 p-3 text-white">
                <p className="text-xs font-medium text-white/90">Tie Queue</p>
                <p className="mt-1 text-2xl font-bold">{tieOutcomes.length}</p>
                <p className="text-[11px] text-white/90">Hidden from monitor</p>
              </div>
              <div className="rounded-2xl bg-gradient-to-br from-cyan-300 to-sky-400 p-3 text-slate-900">
                <p className="text-xs font-medium text-slate-700">Tender Status</p>
                <p className="mt-1 text-xl font-bold">{tender.status}</p>
                <p className="text-[11px] text-slate-700">Broadcast readiness</p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-white to-slate-50 p-3">
              <Button asChild className="h-9 rounded-full bg-primary px-4 text-xs text-primary-foreground hover:bg-primary/90">
                <Link href={monitorPath} target="_blank" rel="noreferrer">
                  Open Monitor Display
                </Link>
              </Button>
              <div className="mt-2 text-xs text-slate-600">
                Monitor URL: <span className="font-medium text-slate-800">{monitorPath}</span>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-3">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-600">Display Rules</p>
              <ul className="list-disc space-y-1 pl-5 text-xs text-slate-600">
                <li>Show only current Tender (fixed)</li>
                <li>Hide Tie lots (ON)</li>
                <li>Auto refresh / realtime (ON)</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      {tab === "results" && (
        <Card className="overflow-hidden rounded-[24px] border border-slate-200/80 bg-white/95 shadow-none backdrop-blur">
          <CardHeader className="border-b border-slate-200 bg-gradient-to-r from-indigo-50 via-sky-50 to-cyan-50 py-4">
            <CardTitle className="text-sm font-semibold text-slate-800">Results</CardTitle>
          </CardHeader>
          <CardContent className="p-3">
            <div className="overflow-x-auto rounded-2xl border border-indigo-100 bg-gradient-to-b from-indigo-50/40 via-white to-sky-50/40">
            <Table className="w-full border-collapse text-xs">
              <TableHeader>
                <TableRow className="bg-indigo-100/50 hover:bg-indigo-100/50">
                  <TableHead className="h-[46px] border-b border-r border-slate-200">LotNo</TableHead>
                  <TableHead className="h-[46px] border-b border-r border-slate-200">StartPrice</TableHead>
                  <TableHead className="h-[46px] border-b border-r border-slate-200">Final Price</TableHead>
                  <TableHead className="h-[46px] border-b border-r border-slate-200">Winner</TableHead>
                  <TableHead className="h-[46px] border-b border-slate-200">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {outcomes.map((o, idx) => {
                  const lot = tender.lots.find((x) => x.id === o.lotId);
                  const notForSale = lot ? isLotNotForSale(lot) : false;
                  const status = notForSale ? "NOT FOR SALE" : statusLabelFromOutcome(o);
                  return (
                  <TableRow key={o.lotId} className={idx % 2 === 0 ? "bg-white/90" : "bg-sky-50/60"}>
                    <TableCell className="h-[46px] border-b border-r border-slate-200">{o.lotNo}</TableCell>
                    <TableCell className="h-[46px] border-b border-r border-slate-200">{formatCurrency(o.startPrice)}</TableCell>
                    <TableCell className="h-[46px] border-b border-r border-slate-200">{o.topAmount ? formatCurrency(o.topAmount) : "-"}</TableCell>
                    <TableCell className="h-[46px] border-b border-r border-slate-200">{o.winnerBidderNo ? `Bidder${o.winnerBidderNo}` : "-"}</TableCell>
                    <TableCell className="h-[46px] border-b border-slate-200">
                      <Badge variant="outline" className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${notForSale ? "border-slate-300 bg-slate-100 text-slate-700" : lotStatusBadgeClass(status)}`}>
                        {status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {tab === "settings" && (
        <Card className="overflow-hidden rounded-[24px] border border-slate-200/80 bg-white/95 shadow-none backdrop-blur">
          <CardHeader className="border-b border-slate-200 bg-gradient-to-r from-indigo-50 via-sky-50 to-cyan-50 py-4">
            <CardTitle className="text-sm font-semibold text-slate-800">Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-3">
            <form action={updateTenderInfo} className="rounded-2xl border border-slate-200 bg-gradient-to-r from-white to-slate-50 p-4">
              <input type="hidden" name="tenderId" value={id} />
              <p className="text-sm font-semibold text-slate-800">Edit Tender Information</p>

              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div className="grid gap-2 md:col-span-2">
                  <Label htmlFor="name" className="text-xs text-slate-600">Tender Name*</Label>
                  <Input id="name" name="name" defaultValue={tender.name} required disabled={isTenderClosed} className="h-9 rounded-full border-slate-200 bg-slate-50 text-xs" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="date" className="text-xs text-slate-600">Date</Label>
                  <Input id="date" name="date" type="date" defaultValue={tenderDateValue} disabled={isTenderClosed} className="h-9 rounded-full border-slate-200 bg-slate-50 text-xs" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="currency" className="text-xs text-slate-600">Currency</Label>
                  <Input id="currency" value="USD (fixed)" disabled className="h-9 rounded-full border-slate-200 bg-slate-100 text-xs" />
                </div>
                <div className="grid gap-2 md:col-span-2">
                  <Label htmlFor="memo" className="text-xs text-slate-600">Memo</Label>
                  <Textarea
                    id="memo"
                    name="memo"
                    defaultValue={tender.memo ?? ""}
                    disabled={isTenderClosed}
                    className="min-h-28 rounded-xl border-slate-200 bg-slate-50 text-xs"
                  />
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                <Button asChild size="sm" variant="outline" className="h-9 rounded-full border-slate-200 px-3 text-xs">
                  <Link href="/audit-log">Open Audit Log</Link>
                </Button>
                <Button type="submit" disabled={isTenderClosed} className="h-9 rounded-full bg-primary px-4 text-xs text-primary-foreground hover:bg-primary/90">
                  Save Changes
                </Button>
              </div>
            </form>

            <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-4">
              <p className="text-sm font-semibold text-rose-800">Danger Zone</p>
              <p className="mt-1 text-xs text-rose-700">
                Delete this tender permanently. This action cannot be undone.
              </p>
              <div className="mt-3">
                <DeleteTenderConfirm tenderId={id} tenderCode={tender.code} deleteAction={deleteTender} />
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
