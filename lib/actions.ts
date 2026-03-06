"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { clearSession, createSession, ensureDefaultUsers, hashPassword, requireAdmin, requireAuth, verifyPassword } from "@/lib/auth";
import { isLotNotForSale, setNotForSaleTag } from "@/lib/lot-sale-status";
import { prisma } from "@/prisma/client";

function parseNumber(input: FormDataEntryValue | null) {
  const n = Number(input);
  if (!Number.isFinite(n)) throw new Error("Invalid number");
  return n;
}

async function ensureTenderNotClosed(tenderId: number) {
  const tender = await prisma.tender.findUnique({
    where: { id: tenderId },
    select: { status: true },
  });
  if (!tender) throw new Error("Tender not found");
  if (tender.status === "CLOSED") throw new Error("Tender is closed and cannot be modified");
}

type SaveLotEntryInput = {
  id?: number;
  tenderId: number;
  lotNo: number;
  shape: string;
  color: string;
  lustre: string;
  surface: string;
  size: string;
  startPrice: number;
};

export async function saveLotEntry(input: SaveLotEntryInput) {
  await requireAuth();

  const tenderId = Number(input.tenderId);
  const lotNo = Number(input.lotNo);
  const startPrice = Number(input.startPrice);

  if (!Number.isInteger(tenderId) || tenderId <= 0) throw new Error("Invalid tender");
  if (!Number.isInteger(lotNo) || lotNo <= 0) throw new Error("Invalid lot number");
  if (!Number.isFinite(startPrice) || startPrice < 0) throw new Error("Invalid base price");

  const shape = String(input.shape ?? "").trim();
  const color = String(input.color ?? "").trim();
  const lustre = String(input.lustre ?? "").trim();
  const surface = String(input.surface ?? "").trim();
  const size = String(input.size ?? "").trim();

  if (!shape || !color || !lustre || !surface || !size) {
    throw new Error("Shape, colour, lustre, surface and size are required");
  }
  await ensureTenderNotClosed(tenderId);

  const lot = await prisma.$transaction(async (tx) => {
    if (input.id) {
      const duplicate = await tx.lot.findFirst({
        where: {
          tenderId,
          lotNo,
          NOT: { id: input.id },
        },
        select: { id: true },
      });

      if (duplicate) throw new Error(`Lot No ${lotNo} already exists in this tender`);

      return tx.lot.upsert({
        where: { id: input.id },
        update: {
          tenderId,
          lotNo,
          shape,
          color,
          lustre,
          surface,
          size,
          description: `${shape} / ${color} / ${lustre} / ${surface} / ${size}`,
          startPrice,
        },
        create: {
          tenderId,
          lotNo,
          shape,
          color,
          lustre,
          surface,
          size,
          description: `${shape} / ${color} / ${lustre} / ${surface} / ${size}`,
          startPrice,
        },
      });
    }

    return tx.lot.upsert({
      where: {
        tenderId_lotNo: {
          tenderId,
          lotNo,
        },
      },
      update: {
        shape,
        color,
        lustre,
        surface,
        size,
        description: `${shape} / ${color} / ${lustre} / ${surface} / ${size}`,
        startPrice,
      },
      create: {
        tenderId,
        lotNo,
        shape,
        color,
        lustre,
        surface,
        size,
        description: `${shape} / ${color} / ${lustre} / ${surface} / ${size}`,
        startPrice,
      },
    });
  });

  revalidatePath(`/tenders/${tenderId}?tab=lots`);
  revalidatePath(`/tenders/${tenderId}`);
  revalidatePath("/");

  return {
    id: lot.id,
    tenderId: lot.tenderId,
    lotNo: lot.lotNo,
    shape: lot.shape,
    color: lot.color,
    lustre: lot.lustre,
    surface: lot.surface,
    size: lot.size,
    startPrice: Number(lot.startPrice),
  };
}

type BindBidRowInput = {
  lotNo: number;
  bidderRegId: string;
  amount: number;
  mode?: "DRAFT" | "SUBMITTED";
};

export async function bindBidsFromRows(input: { tenderId: number; rows: BindBidRowInput[] }) {
  const actor = await requireAuth();

  const tenderId = Number(input.tenderId);
  if (!Number.isInteger(tenderId) || tenderId <= 0) throw new Error("Invalid tender");

  if (!Array.isArray(input.rows) || input.rows.length === 0) {
    return { bound: 0, skipped: 0 };
  }

  const lots = await prisma.lot.findMany({
    where: { tenderId },
    select: { id: true, lotNo: true, startPrice: true },
  });
  const lotMap = new Map(lots.map((lot) => [lot.lotNo, lot]));

  const bidderNos = Array.from(new Set(input.rows.map((row) => String(row.bidderRegId).trim()).filter(Boolean)));
  const bidders = await prisma.bidder.findMany({
    where: { bidderNo: { in: bidderNos } },
    select: { id: true, bidderNo: true },
  });
  const bidderMap = new Map(bidders.map((bidder) => [bidder.bidderNo, bidder]));

  let bound = 0;
  let skipped = 0;

  await prisma.$transaction(async (tx) => {
    for (const row of input.rows) {
      const lotNo = Number(row.lotNo);
      const bidderNo = String(row.bidderRegId ?? "").trim();
      const amount = Number(row.amount);
      const mode = row.mode ?? "SUBMITTED";

      if (!Number.isInteger(lotNo) || lotNo <= 0 || !bidderNo || !Number.isFinite(amount) || amount < 0) {
        skipped += 1;
        continue;
      }

      const lot = lotMap.get(lotNo);
      const bidder = bidderMap.get(bidderNo);

      if (!lot || !bidder) {
        skipped += 1;
        continue;
      }

      await tx.bid.upsert({
        where: {
          tenderId_lotId_bidderId: {
            tenderId,
            lotId: lot.id,
            bidderId: bidder.id,
          },
        },
        update: {
          amount,
          state: mode,
          warningBelowStart: amount < Number(lot.startPrice),
          submittedAt: mode === "SUBMITTED" ? new Date() : null,
        },
        create: {
          tenderId,
          lotId: lot.id,
          bidderId: bidder.id,
          amount,
          state: mode,
          warningBelowStart: amount < Number(lot.startPrice),
          submittedAt: mode === "SUBMITTED" ? new Date() : null,
        },
      });

      bound += 1;
    }
  });

  await prisma.auditLog.create({
    data: {
      username: actor.name,
      action: "BID_BIND_IMPORT",
      detail: `Tender #${tenderId}: bound=${bound}, skipped=${skipped}`,
      tenderId,
    },
  });

  revalidatePath(`/tenders/${tenderId}?tab=bid-entry`);
  revalidatePath(`/tenders/${tenderId}?tab=monitor`);
  revalidatePath(`/tenders/${tenderId}?tab=results`);
  revalidatePath("/");

  return { bound, skipped };
}

export async function signIn(formData: FormData) {
  const loginId = String(formData.get("loginId") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!loginId || !password) {
    redirect("/login?error=missing");
  }

  await ensureDefaultUsers();

  const user = await prisma.user.findUnique({ where: { loginId } });

  if (!user || user.status !== "ACTIVE") {
    redirect("/login?error=invalid");
  }

  let ok = false;
  if (user.passwordHash.startsWith("scrypt$")) {
    ok = verifyPassword(password, user.passwordHash);
  } else if (user.passwordHash === "temporary_hash") {
    ok = password === "admin123";
    if (ok) {
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: hashPassword(password) },
      });
    }
  } else {
    ok = password === user.passwordHash;
    if (ok) {
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: hashPassword(password) },
      });
    }
  }

  if (!ok) {
    redirect("/login?error=invalid");
  }

  await createSession({
    id: user.id,
    name: user.name,
    loginId: user.loginId,
    role: user.role,
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  redirect("/");
}

export async function signOut() {
  await clearSession();
  redirect("/login");
}

export async function updateMyProfile(formData: FormData) {
  const session = await requireAuth();
  const name = String(formData.get("name") ?? "").trim();

  if (name.length < 2) {
    redirect("/settings?error=invalid_name");
  }

  await prisma.user.update({
    where: { id: session.userId },
    data: { name },
  });

  await createSession({
    id: session.userId,
    name,
    loginId: session.loginId,
    role: session.role,
  });

  await prisma.auditLog.create({
    data: {
      userId: session.userId,
      username: session.name,
      action: "PROFILE_UPDATED",
      detail: `User #${session.userId} updated profile name`,
    },
  });

  revalidatePath("/settings");
  revalidatePath("/");
  redirect("/settings?ok=profile_saved");
}

export async function changeMyPassword(formData: FormData) {
  const session = await requireAuth();
  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!currentPassword || !newPassword || !confirmPassword) {
    redirect("/settings?error=missing_password_fields");
  }
  if (newPassword.length < 6) {
    redirect("/settings?error=weak_password");
  }
  if (newPassword !== confirmPassword) {
    redirect("/settings?error=password_mismatch");
  }
  if (currentPassword === newPassword) {
    redirect("/settings?error=password_same_as_old");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, passwordHash: true },
  });
  if (!user) redirect("/settings?error=user_not_found");

  const validCurrent = verifyPassword(currentPassword, user.passwordHash);
  if (!validCurrent) {
    redirect("/settings?error=current_password_wrong");
  }

  await prisma.user.update({
    where: { id: session.userId },
    data: { passwordHash: hashPassword(newPassword) },
  });

  await prisma.auditLog.create({
    data: {
      userId: session.userId,
      username: session.name,
      action: "PASSWORD_CHANGED",
      detail: `User #${session.userId} changed account password`,
    },
  });

  revalidatePath("/settings");
  redirect("/settings?ok=password_changed");
}

export async function createTender(formData: FormData) {
  await requireAuth();

  const name = String(formData.get("name") ?? "").trim();
  const dateRaw = String(formData.get("date") ?? "").trim();
  const memo = String(formData.get("memo") ?? "").trim();

  if (!name) throw new Error("Tender name is required");

  const count = await prisma.tender.count();
  const code = `T-${String(count + 1).padStart(3, "0")}`;

  const created = await prisma.tender.create({
    data: {
      code,
      name,
      date: dateRaw ? new Date(dateRaw) : null,
      currency: "USD",
      memo: memo || null,
      status: "PREP",
    },
  });

  revalidatePath("/tenders");
  revalidatePath("/");
  redirect(`/tenders/${created.id}?ok=tender_created`);
}

export async function updateTenderStatus(formData: FormData) {
  const actor = await requireAuth();

  const tenderId = parseNumber(formData.get("tenderId"));
  const status = String(formData.get("status") ?? "PREP") as "PREP" | "IN_PROGRESS" | "CLOSED";
  await ensureTenderNotClosed(tenderId);

  await prisma.tender.update({
    where: { id: tenderId },
    data: {
      status,
      startedAt: status === "IN_PROGRESS" ? new Date() : undefined,
      endedAt: status === "CLOSED" ? new Date() : undefined,
    },
  });

  await prisma.auditLog.create({
    data: {
      username: actor.name,
      action: status === "IN_PROGRESS" ? "TENDER_STARTED" : "TENDER_CLOSED",
      detail: `Tender #${tenderId} changed to ${status}`,
      tenderId,
    },
  });

  revalidatePath(`/tenders/${tenderId}`);
  revalidatePath("/");
  revalidatePath("/tenders");
  redirect(`/tenders/${tenderId}?tab=overview&ok=tender_status_updated`);
}

export async function addLot(formData: FormData) {
  await requireAuth();

  const tenderId = parseNumber(formData.get("tenderId"));
  const lotNo = parseNumber(formData.get("lotNo"));
  const description = String(formData.get("description") ?? "").trim();
  const startPrice = parseNumber(formData.get("startPrice"));
  await ensureTenderNotClosed(tenderId);

  await prisma.lot.create({
    data: {
      tenderId,
      lotNo,
      description: description || null,
      startPrice,
    },
  });

  revalidatePath(`/tenders/${tenderId}?tab=lots`);
  revalidatePath("/");
}

export async function addBidder(formData: FormData) {
  await requireAuth();

  const tenderId = parseNumber(formData.get("tenderId"));
  const bidderNo = String(formData.get("bidderNo") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();

  if (!bidderNo || !name) throw new Error("Bidder no and name are required");
  await ensureTenderNotClosed(tenderId);

  const bidder = await prisma.bidder.upsert({
    where: {
      bidderNo_name: {
        bidderNo,
        name,
      },
    },
    update: {
      email: email || null,
    },
    create: {
      bidderNo,
      name,
      email: email || null,
    },
  });

  await prisma.tenderBidder.upsert({
    where: {
      tenderId_bidderId: {
        tenderId,
        bidderId: bidder.id,
      },
    },
    update: {},
    create: {
      tenderId,
      bidderId: bidder.id,
    },
  });

  revalidatePath(`/tenders/${tenderId}?tab=bidders`);
  revalidatePath("/bidders");
  redirect(`/tenders/${tenderId}?tab=bidders&ok=bidder_saved`);
}

export async function removeBidderFromTender(formData: FormData) {
  const actor = await requireAuth();
  const tenderId = parseNumber(formData.get("tenderId"));
  const bidderId = parseNumber(formData.get("bidderId"));
  await ensureTenderNotClosed(tenderId);

  const tenderBidder = await prisma.tenderBidder.findUnique({
    where: {
      tenderId_bidderId: {
        tenderId,
        bidderId,
      },
    },
    include: {
      bidder: {
        select: { bidderNo: true, name: true },
      },
      tender: {
        select: { code: true },
      },
    },
  });
  if (!tenderBidder) {
    redirect(`/tenders/${tenderId}?tab=bidders`);
  }

  await prisma.$transaction(async (tx) => {
    await tx.bid.deleteMany({
      where: { tenderId, bidderId },
    });
    await tx.tenderBidder.delete({
      where: {
        tenderId_bidderId: {
          tenderId,
          bidderId,
        },
      },
    });
  });

  await prisma.auditLog.create({
    data: {
      username: actor.name,
      action: "BIDDER_REMOVED_FROM_TENDER",
      detail: `Removed bidder ${tenderBidder.bidder.bidderNo} (${tenderBidder.bidder.name}) from tender ${tenderBidder.tender.code}`,
      tenderId,
    },
  });

  revalidatePath(`/tenders/${tenderId}?tab=bidders`);
  revalidatePath(`/tenders/${tenderId}?tab=bid-entry`);
  revalidatePath(`/tenders/${tenderId}?tab=results`);
  revalidatePath("/bidders");
  revalidatePath("/");
  redirect(`/tenders/${tenderId}?tab=bidders&ok=bidder_deleted`);
}

export async function updateBidderInTender(formData: FormData) {
  const actor = await requireAuth();
  const tenderId = parseNumber(formData.get("tenderId"));
  const bidderId = parseNumber(formData.get("bidderId"));
  const bidderNo = String(formData.get("bidderNo") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();

  if (!bidderNo || !name) throw new Error("Bidder no and name are required");
  await ensureTenderNotClosed(tenderId);

  const tenderBidder = await prisma.tenderBidder.findUnique({
    where: {
      tenderId_bidderId: {
        tenderId,
        bidderId,
      },
    },
    include: {
      tender: {
        select: { code: true },
      },
    },
  });
  if (!tenderBidder) throw new Error("Bidder is not registered in this tender");

  await prisma.bidder.update({
    where: { id: bidderId },
    data: {
      bidderNo,
      name,
      email: email || null,
    },
  });

  await prisma.auditLog.create({
    data: {
      username: actor.name,
      action: "BIDDER_UPDATED",
      detail: `Updated bidder ${bidderNo} (${name}) in tender ${tenderBidder.tender.code}`,
      tenderId,
    },
  });

  revalidatePath(`/tenders/${tenderId}?tab=bidders`);
  revalidatePath(`/tenders/${tenderId}?tab=bid-entry`);
  revalidatePath("/bidders");
  redirect(`/tenders/${tenderId}?tab=bidders&ok=bidder_updated`);
}

export async function saveBidEntry(formData: FormData) {
  const actor = await requireAuth();

  const tenderId = parseNumber(formData.get("tenderId"));
  const bidderId = parseNumber(formData.get("bidderId"));
  const mode = String(formData.get("mode") ?? "DRAFT") as "DRAFT" | "SUBMITTED";
  await ensureTenderNotClosed(tenderId);

  const lots = await prisma.lot.findMany({
    where: { tenderId },
    select: { id: true, startPrice: true, description: true },
  });

  for (const lot of lots) {
    if (isLotNotForSale(lot)) continue;

    const raw = formData.get(`bid_${lot.id}`);
    if (raw == null || String(raw).trim() === "") continue;

    const amount = Number(raw);
    if (!Number.isFinite(amount) || amount < 0) continue;

    await prisma.bid.upsert({
      where: {
        tenderId_lotId_bidderId: {
          tenderId,
          lotId: lot.id,
          bidderId,
        },
      },
      update: {
        amount,
        state: mode,
        warningBelowStart: amount < Number(lot.startPrice),
        submittedAt: mode === "SUBMITTED" ? new Date() : null,
      },
      create: {
        tenderId,
        lotId: lot.id,
        bidderId,
        amount,
        state: mode,
        warningBelowStart: amount < Number(lot.startPrice),
        submittedAt: mode === "SUBMITTED" ? new Date() : null,
      },
    });
  }

  await prisma.auditLog.create({
    data: {
      username: actor.name,
      action: mode === "SUBMITTED" ? "BID_SUBMITTED" : "BID_DRAFT_SAVED",
      detail: `Tender #${tenderId}, bidder #${bidderId}`,
      tenderId,
    },
  });

  revalidatePath(`/tenders/${tenderId}?tab=bid-entry&bidderId=${bidderId}`);
  revalidatePath(`/tenders/${tenderId}?tab=monitor`);
  revalidatePath(`/tenders/${tenderId}?tab=results`);
  revalidatePath("/");
  const okKey = mode === "SUBMITTED" ? "bid_submitted" : "bid_draft_saved";
  redirect(`/tenders/${tenderId}?tab=bid-entry&bidderId=${bidderId}&ok=${okKey}`);
}

export async function setLotNotForSale(input: { tenderId: number; lotId: number; notForSale: boolean }) {
  const actor = await requireAuth();

  const tenderId = Number(input.tenderId);
  const lotId = Number(input.lotId);
  const notForSale = Boolean(input.notForSale);

  const tender = await prisma.tender.findUnique({
    where: { id: tenderId },
    select: { id: true, status: true, code: true },
  });
  if (!tender) throw new Error("Tender not found");
  if (tender.status === "CLOSED") throw new Error("Cannot change lot sale status after tender closed");

  const lot = await prisma.lot.findFirst({
    where: { id: lotId, tenderId },
    select: { id: true, lotNo: true, description: true },
  });
  if (!lot) throw new Error("Lot not found");

  await prisma.lot.update({
    where: { id: lotId },
    data: {
      description: setNotForSaleTag(lot.description, notForSale),
    },
  });

  await prisma.auditLog.create({
    data: {
      username: actor.name,
      action: notForSale ? "LOT_NOT_FOR_SALE" : "LOT_REOPENED_FOR_SALE",
      detail: `Tender #${tenderId}, Lot #${lot.lotNo} marked as ${notForSale ? "NOT FOR SALE" : "FOR SALE"}`,
      tenderId,
      lotId,
    },
  });

  revalidatePath(`/tenders/${tenderId}?tab=lots`);
  revalidatePath(`/tenders/${tenderId}?tab=bid-entry`);
  revalidatePath(`/tenders/${tenderId}?tab=results`);
  revalidatePath(`/monitor/tenders/${tender.code}`);
  revalidatePath("/results");
  revalidatePath("/");
}

export async function resolveTieBid(formData: FormData) {
  const actor = await requireAuth();

  const tenderId = parseNumber(formData.get("tenderId"));
  const lotId = parseNumber(formData.get("lotId"));
  const winnerBidId = parseNumber(formData.get("winnerBidId"));
  await ensureTenderNotClosed(tenderId);

  const lot = await prisma.lot.findFirst({
    where: { id: lotId, tenderId },
    select: {
      id: true,
      lotNo: true,
      bids: {
        where: { state: "SUBMITTED" },
        include: { bidder: true },
      },
    },
  });

  if (!lot) throw new Error("Lot not found");

  const submitted = lot.bids.sort((a, b) => Number(b.amount) - Number(a.amount));
  if (!submitted.length) throw new Error("No submitted bids for this lot");

  const topAmount = Number(submitted[0].amount);
  const tied = submitted.filter((b) => Number(b.amount) === topAmount);
  if (tied.length < 2) throw new Error("This lot is not in tie state");

  const winner = tied.find((b) => b.id === winnerBidId);
  if (!winner) throw new Error("Selected winner is not part of tied bids");

  await prisma.$transaction(async (tx) => {
    await tx.bid.updateMany({
      where: {
        tenderId,
        lotId,
        state: "SUBMITTED",
        amount: topAmount,
        NOT: { id: winnerBidId },
      },
      data: {
        state: "INVALID",
        note: "Tie resolved - non-winning tied bid",
      },
    });

    await tx.bid.update({
      where: { id: winnerBidId },
      data: {
        state: "SUBMITTED",
        submittedAt: new Date(),
        note: "Tie resolved - selected winner",
      },
    });
  });

  await prisma.auditLog.create({
    data: {
      username: actor.name,
      action: "TIE_RESOLVED",
      detail: `Tender #${tenderId}, Lot #${lot.lotNo}, winner bidder ${winner.bidder.bidderNo}, amount ${topAmount}`,
      tenderId,
      lotId,
    },
  });

  revalidatePath(`/tenders/${tenderId}?tab=bid-entry`);
  revalidatePath(`/tenders/${tenderId}?tab=monitor`);
  revalidatePath(`/tenders/${tenderId}?tab=results`);
  revalidatePath("/");
}

export async function resolveTieByRebid(formData: FormData) {
  const actor = await requireAuth();

  const tenderId = parseNumber(formData.get("tenderId"));
  const lotId = parseNumber(formData.get("lotId"));
  await ensureTenderNotClosed(tenderId);

  const lot = await prisma.lot.findFirst({
    where: { id: lotId, tenderId },
    select: {
      id: true,
      lotNo: true,
      bids: {
        where: { state: "SUBMITTED" },
        include: { bidder: true },
      },
    },
  });

  if (!lot) throw new Error("Lot not found");

  const submitted = lot.bids.sort((a, b) => Number(b.amount) - Number(a.amount));
  if (!submitted.length) throw new Error("No submitted bids for this lot");

  const topAmount = Number(submitted[0].amount);
  const tied = submitted.filter((b) => Number(b.amount) === topAmount);
  if (tied.length < 2) throw new Error("This lot is not in tie state");

  const rebidAmounts = new Map<number, number>();
  for (const bid of tied) {
    const raw = formData.get(`rebid_${bid.id}`);
    if (raw == null || String(raw).trim() === "") {
      throw new Error("All tied bidders must provide rebid amount");
    }
    const amount = Number(raw);
    if (!Number.isFinite(amount) || amount < topAmount) {
      throw new Error(`Rebid amount must be at least ${topAmount}`);
    }
    rebidAmounts.set(bid.id, amount);
  }

  const projected = submitted.map((b) => ({
    bidId: b.id,
    bidderNo: b.bidder.bidderNo,
    amount: rebidAmounts.get(b.id) ?? Number(b.amount),
  }));

  const projectedTop = Math.max(...projected.map((x) => x.amount));
  const topProjected = projected.filter((x) => x.amount === projectedTop);
  if (topProjected.length !== 1) {
    throw new Error("Rebid results are still tie. Enter unique highest amount.");
  }

  const winnerProjected = topProjected[0];

  await prisma.$transaction(async (tx) => {
    for (const bid of tied) {
      await tx.bid.update({
        where: { id: bid.id },
        data: {
          amount: rebidAmounts.get(bid.id)!,
          state: "SUBMITTED",
          submittedAt: new Date(),
          note: "Tie rebid round",
        },
      });
    }
  });

  await prisma.auditLog.create({
    data: {
      username: actor.name,
      action: "TIE_REBID_RESOLVED",
      detail: `Tender #${tenderId}, Lot #${lot.lotNo}, winner bidder ${winnerProjected.bidderNo}, amount ${projectedTop}`,
      tenderId,
      lotId,
    },
  });

  revalidatePath(`/tenders/${tenderId}?tab=bid-entry`);
  revalidatePath(`/tenders/${tenderId}?tab=monitor`);
  revalidatePath(`/tenders/${tenderId}?tab=results`);
  revalidatePath("/");
  redirect(`/tenders/${tenderId}?tab=bid-entry&ok=tie_resolved`);
}

export async function createUser(formData: FormData) {
  await requireAdmin();

  const name = String(formData.get("name") ?? "").trim();
  const loginId = String(formData.get("loginId") ?? "").trim();
  const role = String(formData.get("role") ?? "OPERATOR") as "ADMIN" | "OPERATOR";
  const password = String(formData.get("password") ?? "").trim();

  if (!name || !loginId || !password) throw new Error("Name, LoginID and password are required");

  await prisma.user.create({
    data: {
      name,
      loginId,
      passwordHash: hashPassword(password),
      role,
      status: "ACTIVE",
    },
  });

  revalidatePath("/users");
  redirect("/users?ok=user_created");
}

export async function updateTenderInfo(formData: FormData) {
  const actor = await requireAuth();

  const tenderId = parseNumber(formData.get("tenderId"));
  const name = String(formData.get("name") ?? "").trim();
  const dateRaw = String(formData.get("date") ?? "").trim();
  const memo = String(formData.get("memo") ?? "").trim();

  if (!name) throw new Error("Tender name is required");
  await ensureTenderNotClosed(tenderId);

  await prisma.tender.update({
    where: { id: tenderId },
    data: {
      name,
      date: dateRaw ? new Date(dateRaw) : null,
      memo: memo || null,
    },
  });

  await prisma.auditLog.create({
    data: {
      username: actor.name,
      action: "TENDER_UPDATED",
      detail: `Tender #${tenderId} information updated`,
      tenderId,
    },
  });

  revalidatePath(`/tenders/${tenderId}`);
  revalidatePath("/tenders");
  revalidatePath("/");
  redirect(`/tenders/${tenderId}?tab=settings&ok=tender_updated`);
}

export async function deleteTender(formData: FormData) {
  const actor = await requireAdmin();
  const tenderId = parseNumber(formData.get("tenderId"));

  const tender = await prisma.tender.findUnique({
    where: { id: tenderId },
    select: { id: true, code: true, name: true },
  });
  if (!tender) throw new Error("Tender not found");

  await prisma.tender.delete({ where: { id: tenderId } });

  await prisma.auditLog.create({
    data: {
      username: actor.name,
      action: "TENDER_DELETED",
      detail: `Deleted tender ${tender.code} (${tender.name})`,
    },
  });

  revalidatePath("/tenders");
  revalidatePath("/results");
  revalidatePath("/bidders");
  revalidatePath("/");
  redirect("/tenders?ok=tender_deleted");
}
