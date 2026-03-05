import type { Bid, Lot } from "@prisma/client";

export type LotWithBids = Lot & {
  bids: (Bid & { bidder: { id: number; bidderNo: string; name: string } })[];
};

export type LotOutcome = {
  lotId: number;
  lotNo: number;
  startPrice: number;
  topAmount: number | null;
  winnerBidderNo: string | null;
  winnerName: string | null;
  isTie: boolean;
  isUnsold: boolean;
};

export function toNumber(value: unknown) {
  return Number(value ?? 0);
}

export function calculateLotOutcome(lot: LotWithBids): LotOutcome {
  const submitted = lot.bids
    .filter((b) => b.state === "SUBMITTED")
    .sort((a, b) => toNumber(b.amount) - toNumber(a.amount));

  if (!submitted.length) {
    return {
      lotId: lot.id,
      lotNo: lot.lotNo,
      startPrice: toNumber(lot.startPrice),
      topAmount: null,
      winnerBidderNo: null,
      winnerName: null,
      isTie: false,
      isUnsold: true,
    };
  }

  const top = toNumber(submitted[0].amount);
  const ties = submitted.filter((b) => toNumber(b.amount) === top);
  const winner = ties.length === 1 ? ties[0] : null;

  return {
    lotId: lot.id,
    lotNo: lot.lotNo,
    startPrice: toNumber(lot.startPrice),
    topAmount: top,
    winnerBidderNo: winner?.bidder.bidderNo ?? null,
    winnerName: winner?.bidder.name ?? null,
    isTie: ties.length > 1,
    isUnsold: top <= 0,
  };
}

export function statusLabelFromOutcome(outcome: LotOutcome) {
  if (outcome.isTie) return "TIE";
  if (outcome.isUnsold || outcome.topAmount == null) return "UNSOLD";
  return "FINAL";
}
