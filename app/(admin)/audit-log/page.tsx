import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/prisma/client";

type Props = {
  searchParams: Promise<{ user?: string; action?: string; page?: string; pageSize?: string }>;
};

export default async function AuditLogPage({ searchParams }: Props) {
  await requireAdmin();

  const { user = "", action = "", page = "1", pageSize = "20" } = await searchParams;
  const currentPage = Math.max(1, Number(page) || 1);
  const currentPageSize = [10, 20, 30, 50].includes(Number(pageSize)) ? Number(pageSize) : 20;
  const where = {
    ...(user ? { username: { contains: user } } : {}),
    ...(action ? { action: { contains: action } } : {}),
  };

  const totalLogs = await prisma.auditLog.count({ where });
  const totalPages = Math.max(1, Math.ceil(totalLogs / currentPageSize));
  const safePage = Math.min(currentPage, totalPages);

  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: (safePage - 1) * currentPageSize,
    take: currentPageSize,
  });

  function actionBadgeClass(actionName: string) {
    if (actionName.includes("CLOSE")) return "border-rose-300 bg-rose-100/70 text-rose-700";
    if (actionName.includes("SAVE") || actionName.includes("ADD")) return "border-emerald-300 bg-emerald-100/70 text-emerald-700";
    if (actionName.includes("NOT_FOR_SALE")) return "border-slate-300 bg-slate-100/80 text-slate-700";
    if (actionName.includes("REOPENED")) return "border-sky-300 bg-sky-100/70 text-sky-700";
    return "border-indigo-300 bg-indigo-100/70 text-indigo-700";
  }

  return (
    <div className="space-y-3 rounded-2xl bg-gradient-to-br from-sky-50/70 via-white to-violet-50/60 p-2">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Audit Log</h1>
        <p className="mt-0.5 text-sm text-slate-500">System activity and security tracking</p>
      </div>

      <Card className="overflow-hidden rounded-[24px] border border-slate-200/80 bg-white/95 shadow-none backdrop-blur">
        <CardHeader className="border-b border-slate-200 bg-gradient-to-r from-indigo-50 via-sky-50 to-cyan-50 py-4">
          <CardTitle className="text-sm font-semibold text-slate-800">Activity Logs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 p-3">
          <form className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-gradient-to-r from-white to-slate-50 p-2.5">
            <input
              name="user"
              defaultValue={user}
              placeholder="Filter by user"
              className="h-9 min-w-[200px] rounded-full border border-slate-200 bg-slate-50 px-3 text-xs outline-none transition-colors focus:border-indigo-300"
            />
            <input
              name="action"
              defaultValue={action}
              placeholder="Filter by action"
              className="h-9 min-w-[220px] rounded-full border border-slate-200 bg-slate-50 px-3 text-xs outline-none transition-colors focus:border-indigo-300"
            />
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
          </form>

          <div className="overflow-x-auto rounded-2xl border border-indigo-100 bg-gradient-to-b from-indigo-50/40 via-white to-sky-50/40">
            <Table className="w-full border-collapse text-xs">
              <TableHeader>
                <TableRow className="bg-indigo-100/50 hover:bg-indigo-100/50">
                  <TableHead className="h-[46px] border-b border-r border-slate-200">Time</TableHead>
                  <TableHead className="h-[46px] border-b border-r border-slate-200">User</TableHead>
                  <TableHead className="h-[46px] border-b border-r border-slate-200">Action</TableHead>
                  <TableHead className="h-[46px] border-b border-slate-200">Detail</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={4} className="h-[52px] border-b border-slate-200 text-center text-slate-500">
                      No audit records found.
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log, idx) => (
                    <TableRow key={log.id} className={`hover:bg-indigo-100/50 ${idx % 2 === 0 ? "bg-white/90" : "bg-sky-50/60"}`}>
                      <TableCell className="h-[46px] border-b border-r border-slate-200 text-slate-600">
                        {new Date(log.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell className="h-[46px] border-b border-r border-slate-200 font-medium text-slate-800">
                        {log.username ?? "-"}
                      </TableCell>
                      <TableCell className="h-[46px] border-b border-r border-slate-200">
                        <Badge variant="outline" className={`rounded-full px-2.5 py-0.5 font-medium ${actionBadgeClass(log.action)}`}>
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="h-[46px] border-b border-slate-200 text-slate-600">{log.detail}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border border-slate-200 bg-white px-4 py-2.5 text-xs">
            <div className="text-slate-500">
              Page {safePage} of {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <Button asChild size="sm" variant="outline" className="h-8 rounded-md border-slate-200 px-3 text-xs" disabled={safePage <= 1}>
                <Link
                  href={`/audit-log?user=${encodeURIComponent(user)}&action=${encodeURIComponent(action)}&page=${Math.max(
                    1,
                    safePage - 1
                  )}&pageSize=${currentPageSize}`}
                >
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
                <Link
                  href={`/audit-log?user=${encodeURIComponent(user)}&action=${encodeURIComponent(action)}&page=${Math.min(
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
    </div>
  );
}
