import { NextResponse } from "next/server";

import { calculateLotOutcome } from "@/lib/auction";
import { isLotNotForSale } from "@/lib/lot-sale-status";
import { formatCurrency } from "@/lib/utils";
import { prisma } from "@/prisma/client";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tenderIdParam = searchParams.get("tenderId");

  const tenders = await prisma.tender.findMany({ orderBy: { createdAt: "desc" } });
  const selectedTender = tenders.find((t) => String(t.id) === tenderIdParam) ?? tenders[0];

  if (!selectedTender) {
    return NextResponse.json({ error: "No tender found" }, { status: 404 });
  }

  const allLots = await prisma.lot.findMany({
    where: { tenderId: selectedTender.id },
    orderBy: { lotNo: "asc" },
    include: { bids: { include: { bidder: true } } },
  });

  const lots = allLots.filter((lot) => !isLotNotForSale(lot));
  const outcomes = lots.map(calculateLotOutcome);

  const rows = outcomes
    .map((o) => {
      const winner = o.winnerBidderNo ? `Register No ${o.winnerBidderNo}` : "-";
      const finalPrice = o.topAmount ? formatCurrency(o.topAmount) : "-";
      const status = o.isTie ? "TIE" : o.isUnsold || o.topAmount == null ? "UNSOLD" : "FINAL";
      return `
        <tr>
          <td>${o.lotNo}</td>
          <td>${escapeHtml(formatCurrency(o.startPrice))}</td>
          <td>${escapeHtml(finalPrice)}</td>
          <td>${escapeHtml(winner)}</td>
          <td>${escapeHtml(status)}</td>
        </tr>
      `;
    })
    .join("");

  const html = `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #d1d5db; padding: 8px; font-size: 12px; text-align: left; }
          th { background: #eef2ff; }
        </style>
      </head>
      <body>
        <table>
          <thead>
            <tr>
              <th>Lot No</th>
              <th>Start Price</th>
              <th>Final Price</th>
              <th>Winner</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </body>
    </html>
  `;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "application/vnd.ms-excel; charset=utf-8",
      "Content-Disposition": `attachment; filename="results-${selectedTender.code}.xls"`,
      "Cache-Control": "no-store",
    },
  });
}
