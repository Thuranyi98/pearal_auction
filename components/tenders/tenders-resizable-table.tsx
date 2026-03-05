"use client";

import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  Plus,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import {
  ColumnDef,
  ColumnSizingState,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  PaginationState,
  useReactTable,
} from "@tanstack/react-table";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type TenderTableRow = {
  id: number;
  code: string;
  date: string | null;
  status: "PREP" | "IN_PROGRESS" | "CLOSED";
  lots: number;
};

type Props = {
  rows: TenderTableRow[];
  initialStatus: string;
  initialQuery: string;
  newTenderHref?: string;
};

export function TendersResizableTable({
  rows,
  initialStatus,
  initialQuery,
  newTenderHref = "/tenders/new",
}: Props) {
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>({
    sr: 62,
    code: 260,
    date: 170,
    currency: 130,
    status: 170,
    lots: 110,
    action: 120,
  });
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  const columns = useMemo<ColumnDef<TenderTableRow>[]>(
    () => [
      {
        id: "sr",
        header: "No",
        cell: ({ row }) => row.index + 1 + pagination.pageIndex * pagination.pageSize,
        enableResizing: false,
      },
      {
        accessorKey: "code",
        id: "code",
        header: "Tender",
        cell: ({ row }) => (
          <span className="block truncate font-medium text-slate-800" title={row.original.code}>
            {row.original.code}
          </span>
        ),
      },
      {
        accessorKey: "date",
        id: "date",
        header: "Date",
        cell: ({ row }) => row.original.date ?? "-",
      },
      {
        id: "currency",
        header: "Payment",
        cell: () => (
          <Badge
            variant="outline"
            className="rounded-full border-slate-300 bg-slate-100 px-2.5 py-0.5 font-medium text-slate-600"
          >
            USD
          </Badge>
        ),
      },
      {
        accessorKey: "status",
        id: "status",
        header: "Status",
        cell: ({ row }) => {
          const status = row.original.status;
          const statusClass =
            status === "PREP"
              ? "border-slate-300 bg-slate-100 text-slate-600"
              : status === "IN_PROGRESS"
              ? "border-amber-300 bg-amber-100/70 text-amber-700"
              : "border-emerald-300 bg-emerald-100/70 text-emerald-700";
          return (
            <Badge variant="outline" className={cn("rounded-full px-2.5 py-0.5 font-medium", statusClass)}>
              {status.replace("_", " ")}
            </Badge>
          );
        },
      },
      {
        accessorKey: "lots",
        id: "lots",
        header: "Lots",
        cell: ({ row }) => <span className="tabular-nums">{row.original.lots}</span>,
      },
      {
        id: "action",
        header: "Action",
        enableResizing: false,
        cell: ({ row }) => (
          <Link
            href={`/tenders/${row.original.id}`}
            className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100"
            title="Open"
          >
            <Eye className="h-3.5 w-3.5" />
            Open
          </Link>
        ),
      },
    ],
    [pagination.pageIndex, pagination.pageSize]
  );

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    columnResizeMode: "onChange",
    columnResizeDirection: "ltr",
    state: { columnSizing, pagination },
    onColumnSizingChange: setColumnSizing,
    onPaginationChange: setPagination,
  });

  return (
    <section className="overflow-hidden rounded-[24px] border border-slate-200/80 bg-white/95 backdrop-blur">
      <div className="border-b border-slate-200 bg-gradient-to-r from-indigo-50 via-sky-50 to-cyan-50 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-800">Tenders</h2>
      </div>

      <form action="/tenders" method="get" className="border-b border-slate-200 bg-gradient-to-r from-white to-slate-50 px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              name="q"
              defaultValue={initialQuery}
              placeholder="Search tenders..."
              className="h-9 w-full rounded-full border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs text-slate-700 outline-none transition-colors focus:border-indigo-300"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 text-xs text-slate-500">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <select
                name="status"
                defaultValue={initialStatus}
                className="h-9 border-0 bg-transparent pr-1 text-xs text-slate-600 outline-none"
              >
                <option value="ALL">All Status</option>
                <option value="PREP">Prep</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>

            <div className="inline-flex h-9 items-center rounded-full border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-600">
              USD
            </div>

            <Button type="submit" className="h-9 rounded-full bg-primary px-4 text-xs hover:bg-primary/90">
              Apply
            </Button>
          </div>

          <Button asChild className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-full bg-primary px-4 text-xs hover:bg-primary/90">
            <Link href={newTenderHref}>
              <Plus className="h-3.5 w-3.5" />
              New Tender
            </Link>
          </Button>
        </div>
      </form>

      <div className="p-3">
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-gradient-to-b from-indigo-50/40 via-white to-sky-50/40">
          <table className="w-full table-fixed border-collapse text-xs" style={{ minWidth: table.getCenterTotalSize() }}>
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="bg-indigo-100/50">
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className={cn(
                      "relative h-[46px] border-b border-r border-slate-200 px-3 align-middle font-semibold text-slate-700",
                      header.id === "sr" || header.id === "currency" || header.id === "status" || header.id === "action"
                        ? "text-center"
                        : "",
                      header.id === "lots" ? "text-right" : "text-left"
                    )}
                    style={{ width: header.getSize() }}
                  >
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    {header.column.getCanResize() ? (
                      <div
                        onMouseDown={header.getResizeHandler()}
                        onTouchStart={header.getResizeHandler()}
                        className={cn(
                          "absolute right-0 top-0 z-20 h-full w-3 cursor-col-resize touch-none select-none",
                          header.column.getIsResizing() ? "bg-slate-400/70" : "hover:bg-slate-300/60"
                        )}
                        title="Resize column"
                      />
                    ) : null}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td className="border-b border-slate-200 py-8 text-center text-muted-foreground" colSpan={7}>
                  No tenders found.
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id} className={cn("hover:bg-indigo-100/50", row.index % 2 === 0 ? "bg-white/90" : "bg-sky-50/60")}>
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className={cn(
                        "h-[46px] border-b border-r border-slate-200 px-3 py-1 align-middle text-slate-700",
                        cell.column.id === "sr" || cell.column.id === "currency" || cell.column.id === "status" || cell.column.id === "action"
                          ? "text-center"
                          : "",
                        cell.column.id === "lots" ? "text-right" : "text-left"
                      )}
                      style={{ width: cell.column.getSize() }}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white px-4 py-2.5 text-xs">
        <div className="text-slate-500">
          Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount() || 1}
        </div>
        <div className="flex items-center gap-2">
          <select
            className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs"
            value={table.getState().pagination.pageSize}
            onChange={(e) => {
              const size = Number(e.target.value);
              setPagination((prev) => ({ ...prev, pageIndex: 0, pageSize: size }));
            }}
          >
            <option value={10}>10 / page</option>
            <option value={20}>20 / page</option>
            <option value={30}>30 / page</option>
            <option value={50}>50 / page</option>
          </select>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 rounded-md border-slate-200 px-2"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 rounded-md border-slate-200 px-2"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </section>
  );
}
