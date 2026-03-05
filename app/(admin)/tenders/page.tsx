import { TendersResizableTable } from "@/components/tenders/tenders-resizable-table";
import { prisma } from "@/prisma/client";

type Props = {
  searchParams: Promise<{
    status?: string;
    q?: string;
  }>;
};

export default async function TendersPage({ searchParams }: Props) {
  const { status = "ALL", q = "" } = await searchParams;

  const tenders = await prisma.tender.findMany({
    where: {
      ...(status !== "ALL" ? { status: status as "PREP" | "IN_PROGRESS" | "CLOSED" } : {}),
      currency: "USD",
      ...(q ? { name: { contains: q } } : {}),
    },
    include: {
      _count: { select: { lots: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const tableRows = tenders.map((t) => ({
    id: t.id,
    code: t.code,
    date: t.date ? new Date(t.date).toISOString().slice(0, 10) : null,
    status: t.status,
    lots: t._count.lots,
  }));

  return (
    <div className="space-y-3">
      <TendersResizableTable
        rows={tableRows}
        initialStatus={status}
        initialQuery={q}
        newTenderHref="/tenders/new"
      />
    </div>
  );
}
