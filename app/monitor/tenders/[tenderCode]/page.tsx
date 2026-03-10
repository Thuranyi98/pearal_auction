import { notFound } from "next/navigation";

import { calculateLotOutcome, statusLabelFromOutcome, toNumber } from "@/lib/auction";
import { isLotNotForSale } from "@/lib/lot-sale-status";
import { prisma } from "@/prisma/client";
import { TenderMonitorGameBoard } from "@/components/monitor/tender-monitor-game-board";
import AutoRefresh from "./auto-refresh";

export const revalidate = 0;

type Props = {
  params: Promise<{ tenderCode: string }>;
};

export default async function TenderMonitorPage({ params }: Props) {
  const { tenderCode } = await params;

  const tender = await prisma.tender.findUnique({
    where: { code: tenderCode },
    include: {
      lots: {
        orderBy: { lotNo: "asc" },
        include: {
          bids: {
            include: { bidder: true },
          },
        },
      },
    },
  });

  if (!tender) notFound();

  const outcomes = tender.lots.map(calculateLotOutcome);
  const lotById = new Map(tender.lots.map((lot) => [lot.id, lot]));
  const visible = outcomes.filter((o) => {
    const lot = lotById.get(o.lotId);
    if (!lot) return false;
    return !o.isTie && !isLotNotForSale(lot);
  });

  const monitorRows = visible.map((o) => ({
    lotId: o.lotId,
    lotNo: o.lotNo,
    startPrice: toNumber(o.startPrice),
    topAmount: o.topAmount,
    winnerBidderNo: o.winnerBidderNo,
    status: statusLabelFromOutcome(o),
  }));

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_0%_0%,rgba(79,70,229,0.22)_0,transparent_32%),radial-gradient(circle_at_100%_0%,rgba(217,70,239,0.18)_0,transparent_30%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] p-4 md:p-8">
      <AutoRefresh />
      <TenderMonitorGameBoard
        monitorTitle={tender.monitorTitle ?? "LIVE BIDDING ARENA"}
        tenderCode={tender.code}
        tenderName={tender.name}
        tenderStatus={tender.status}
        rows={monitorRows}
      />
    </div>
  );
}
