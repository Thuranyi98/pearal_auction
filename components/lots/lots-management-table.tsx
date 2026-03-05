"use client";

import { Plus, X } from "lucide-react";
import { useState, useTransition } from "react";
import { createPortal } from "react-dom";

import { saveLotEntry, setLotNotForSale } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type LotRow = {
  id: number;
  lotNo: number;
  shape: string;
  color: string;
  lustre: string;
  surface: string;
  size: string;
  startPrice: number;
  topBid: number | null;
  topBidder: string;
  notForSale: boolean;
};

type Props = {
  tenderId: number;
  tenderStatus: "PREP" | "IN_PROGRESS" | "CLOSED";
  initialRows: LotRow[];
};

type ModalForm = {
  id?: number;
  lotNo: string;
  shape: string;
  color: string;
  lustre: string;
  surface: string;
  size: string;
  startPrice: string;
};

const emptyForm: ModalForm = {
  lotNo: "",
  shape: "",
  color: "",
  lustre: "",
  surface: "",
  size: "",
  startPrice: "",
};

export function LotsManagementTable({ tenderId, tenderStatus, initialRows }: Props) {
  const [rows, setRows] = useState(initialRows);
  const [isPending, startTransition] = useTransition();
  const [modalOpen, setModalOpen] = useState(false);
  const [saleConfirmRow, setSaleConfirmRow] = useState<LotRow | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [form, setForm] = useState<ModalForm>(emptyForm);

  const isLocked = tenderStatus !== "PREP";
  const hasDOM = typeof document !== "undefined";

  function showToast(message: string) {
    setToast(message);
    setTimeout(() => setToast(null), 2200);
  }

  function openForCreate() {
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openForEdit(row: LotRow) {
    setForm({
      id: row.id,
      lotNo: String(row.lotNo),
      shape: row.shape,
      color: row.color,
      lustre: row.lustre,
      surface: row.surface,
      size: row.size,
      startPrice: String(row.startPrice),
    });
    setModalOpen(true);
  }

  function updateField<K extends keyof ModalForm>(key: K, value: ModalForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function submit() {
    const payload = {
      id: form.id,
      tenderId,
      lotNo: Number(form.lotNo),
      shape: form.shape,
      color: form.color,
      lustre: form.lustre,
      surface: form.surface,
      size: form.size,
      startPrice: Number(form.startPrice),
    };

    startTransition(async () => {
      try {
        const saved = await saveLotEntry(payload);

        setRows((prev) => {
          const idx = prev.findIndex((r) => r.id === saved.id);
          const nextRow: LotRow = {
            ...saved,
            topBid: idx >= 0 ? prev[idx].topBid : null,
            topBidder: idx >= 0 ? prev[idx].topBidder : "-",
            notForSale: idx >= 0 ? prev[idx].notForSale : false,
          };

          if (idx >= 0) {
            const next = [...prev];
            next[idx] = nextRow;
            return next.sort((a, b) => a.lotNo - b.lotNo);
          }

          return [...prev, nextRow].sort((a, b) => a.lotNo - b.lotNo);
        });

        setModalOpen(false);
        showToast("Data saved successfully");
      } catch (error) {
        showToast(error instanceof Error ? error.message : "Save failed");
      }
    });
  }

  function confirmToggleSale() {
    if (!saleConfirmRow) return;

    startTransition(async () => {
      try {
        await setLotNotForSale({
          tenderId,
          lotId: saleConfirmRow.id,
          notForSale: !saleConfirmRow.notForSale,
        });
        setRows((prev) =>
          prev.map((r) => (r.id === saleConfirmRow.id ? { ...r, notForSale: !saleConfirmRow.notForSale } : r))
        );
        showToast(!saleConfirmRow.notForSale ? "Lot marked as NOT FOR SALE" : "Lot reopened for sale");
        setSaleConfirmRow(null);
      } catch (error) {
        showToast(error instanceof Error ? error.message : "Update failed");
      }
    });
  }

  function formatSheetNumber(value: number | null) {
    if (value == null) return "";
    return value.toLocaleString("en-US", { maximumFractionDigits: 2 });
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-slate-500">
            {isLocked ? "Lots are locked after tender started." : "Click Add Lot or Edit to update details."}
          </p>
          <Button onClick={openForCreate} disabled={isLocked} className="h-9 rounded-full bg-primary px-4 text-xs hover:bg-primary/90">
            <Plus className="h-3.5 w-3.5" /> Add Lot
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-indigo-100 bg-gradient-to-b from-indigo-50/40 via-white to-sky-50/40 p-3">
        <table className="w-full table-fixed border-collapse text-xs text-slate-700">
          <thead>
            <tr className="bg-slate-100">
              <th rowSpan={2} className="h-12 border border-slate-300 px-1 text-center text-sm font-semibold text-slate-800">
                Lots
                <br />
                No.
              </th>
              <th colSpan={5} className="h-12 border border-slate-300 px-1 text-center text-sm font-semibold text-slate-800">
                Description
              </th>
              <th rowSpan={2} className="h-12 border border-slate-300 px-1 text-center text-sm font-semibold text-slate-800">
                Base Price
                <br />
                in USD
              </th>
              <th colSpan={2} className="h-12 border border-slate-300 px-1 text-center text-sm font-semibold text-slate-800">
                Bid Amount
              </th>
              <th rowSpan={2} className="h-12 border border-slate-300 px-1 text-center text-sm font-semibold text-slate-800">
                Sale
              </th>
            </tr>
            <tr className="bg-slate-100">
              <th className="h-10 border border-slate-300 px-1 text-center text-xs font-semibold text-slate-800">Shape</th>
              <th className="h-10 border border-slate-300 px-1 text-center text-xs font-semibold text-slate-800">Colour</th>
              <th className="h-10 border border-slate-300 px-1 text-center text-xs font-semibold text-slate-800">Lustre</th>
              <th className="h-10 border border-slate-300 px-1 text-center text-xs font-semibold text-slate-800">Surface</th>
              <th className="h-10 border border-slate-300 px-1 text-center text-xs font-semibold text-slate-800">
                Size
                <br />
                (mm)
              </th>
              <th className="h-10 border border-slate-300 px-1 text-center text-xs font-semibold text-slate-800">In Number</th>
              <th className="h-10 border border-slate-300 px-1 text-center text-xs font-semibold text-slate-800">In Words</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={10} className="h-10 border border-slate-300 px-2 text-center text-xs text-slate-500">
                  No lots yet.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.id}
                  className={isLocked ? "bg-white" : "cursor-pointer bg-white hover:bg-slate-100/40"}
                  onClick={() => {
                    if (!isLocked) openForEdit(row);
                  }}
                  title={isLocked ? undefined : "Click row to edit"}
                >
                  <td className="h-10 border border-slate-300 px-1 text-center text-xs">{row.lotNo}</td>
                  <td className="h-10 border border-slate-300 px-1 text-center text-xs">{row.shape}</td>
                  <td className="h-10 border border-slate-300 px-1 text-center text-xs">{row.color}</td>
                  <td className="h-10 border border-slate-300 px-1 text-center text-xs">{row.lustre}</td>
                  <td className="h-10 border border-slate-300 px-1 text-center text-xs">{row.surface}</td>
                  <td className="h-10 border border-slate-300 px-1 text-center text-xs">{row.size}</td>
                  <td className="h-10 border border-slate-300 px-1 text-right text-sm font-semibold tabular-nums text-slate-800">
                    {formatSheetNumber(row.startPrice)}
                  </td>
                  <td className="h-10 border border-slate-300 px-1 text-right text-xs tabular-nums">
                    {formatSheetNumber(row.topBid)}
                  </td>
                  <td className="h-10 border border-slate-300 px-1 text-left text-[11px] text-slate-600">
                    {row.topBidder === "-" ? "" : row.topBidder}
                  </td>
                  <td className="h-10 border border-slate-300 px-1 text-center text-[11px]">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className={`h-7 rounded-full px-2 text-[10px] ${
                        row.notForSale
                          ? "border-rose-300 bg-rose-100 text-rose-700"
                          : "border-emerald-300 bg-emerald-100 text-emerald-700"
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSaleConfirmRow(row);
                      }}
                      disabled={tenderStatus === "CLOSED" || isPending}
                    >
                      {row.notForSale ? "NOT FOR SALE" : "FOR SALE"}
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {hasDOM &&
        modalOpen &&
        createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-2xl rounded-lg border bg-background p-4 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold">{form.id ? "Edit Lot" : "New Lot"}</h3>
              <Button size="sm" variant="outline" onClick={() => setModalOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="grid gap-1">
                <label className="text-xs">Lot No</label>
                <Input value={form.lotNo} onChange={(e) => updateField("lotNo", e.target.value)} />
              </div>
              <div className="grid gap-1">
                <label className="text-xs">Base Price (USD)</label>
                <Input value={form.startPrice} onChange={(e) => updateField("startPrice", e.target.value)} />
              </div>

              <div className="grid gap-1">
                <label className="text-xs">Shape</label>
                <Input value={form.shape} onChange={(e) => updateField("shape", e.target.value)} />
              </div>
              <div className="grid gap-1">
                <label className="text-xs">Colour</label>
                <Input value={form.color} onChange={(e) => updateField("color", e.target.value)} />
              </div>
              <div className="grid gap-1">
                <label className="text-xs">Lustre</label>
                <Input value={form.lustre} onChange={(e) => updateField("lustre", e.target.value)} />
              </div>
              <div className="grid gap-1">
                <label className="text-xs">Surface</label>
                <Input value={form.surface} onChange={(e) => updateField("surface", e.target.value)} />
              </div>
              <div className="grid gap-1 md:col-span-2">
                <label className="text-xs">Size (mm)</label>
                <Input value={form.size} onChange={(e) => updateField("size", e.target.value)} />
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setModalOpen(false)} disabled={isPending}>
                Cancel
              </Button>
              <Button onClick={submit} disabled={isPending}>
                {isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {hasDOM &&
        saleConfirmRow &&
        createPortal(
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
            <h3 className="text-base font-semibold text-slate-900">
              {saleConfirmRow.notForSale ? "Reopen Lot For Sale?" : "Mark Lot As NOT FOR SALE?"}
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              If you change Lot #{saleConfirmRow.lotNo} to{" "}
              {saleConfirmRow.notForSale ? "FOR SALE" : "NOT FOR SALE"}, live monitor visibility and results
              status will be updated.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSaleConfirmRow(null)} disabled={isPending}>
                Cancel
              </Button>
              <Button
                onClick={confirmToggleSale}
                disabled={isPending}
                className={saleConfirmRow.notForSale ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"}
              >
                {isPending ? "Updating..." : saleConfirmRow.notForSale ? "Yes, Reopen Sale" : "Yes, Mark NOT FOR SALE"}
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {hasDOM &&
        toast &&
        createPortal(
          <div className="fixed right-4 top-4 z-[120] rounded-md border bg-white px-3 py-2 text-xs shadow">{toast}</div>,
          document.body
        )}
    </div>
  );
}
