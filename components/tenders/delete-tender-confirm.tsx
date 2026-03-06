"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

type Props = {
  tenderId: number;
  tenderCode: string;
  deleteAction: (formData: FormData) => Promise<void>;
};

export function DeleteTenderConfirm({ tenderId, tenderCode, deleteAction }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => setOpen(true)}
        className="h-9 rounded-full border-rose-300 bg-rose-50 px-4 text-xs text-rose-700 hover:bg-rose-100"
      >
        Delete Tender
      </Button>

      {open ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-4 shadow-xl">
            <h3 className="text-base font-semibold text-slate-900">Delete Tender Confirmation</h3>
            <p className="mt-2 text-sm text-slate-600">
              Are you sure you want to delete tender <span className="font-semibold text-slate-900">{tenderCode}</span>? This action cannot be undone.
            </p>
            <p className="mt-1 text-xs text-rose-600">
              Lots, bids, and tender-bidder records in this tender will be removed.
            </p>

            <div className="mt-4 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-9 rounded-full border-slate-200 px-4 text-xs"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <form action={deleteAction}>
                <input type="hidden" name="tenderId" value={tenderId} />
                <Button type="submit" className="h-9 rounded-full bg-rose-600 px-4 text-xs text-white hover:bg-rose-700">
                  Yes, Delete Tender
                </Button>
              </form>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
