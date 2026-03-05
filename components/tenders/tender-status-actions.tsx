"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

type Props = {
  tenderId: number;
  tenderStatus: "PREP" | "IN_PROGRESS" | "CLOSED";
  updateStatusAction: (formData: FormData) => Promise<void>;
};

export function TenderStatusActions({ tenderId, tenderStatus, updateStatusAction }: Props) {
  const [closeConfirmOpen, setCloseConfirmOpen] = useState(false);

  async function handleCloseTender(formData: FormData) {
    await updateStatusAction(formData);
    setCloseConfirmOpen(false);
  }

  return (
    <>
      <div className="flex gap-2">
        {tenderStatus === "PREP" && (
          <form action={updateStatusAction}>
            <input type="hidden" name="tenderId" value={tenderId} />
            <input type="hidden" name="status" value="IN_PROGRESS" />
            <Button type="submit" className="h-9 rounded-full bg-primary px-4 text-xs hover:bg-primary/90">
              Start Tender
            </Button>
          </form>
        )}

        {tenderStatus === "IN_PROGRESS" && (
          <Button type="button" variant="outline" className="h-9 rounded-full border-slate-200 bg-white px-4 text-xs" onClick={() => setCloseConfirmOpen(true)}>
            Close Tender
          </Button>
        )}
      </div>

      {closeConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-4 shadow-xl">
            <h3 className="text-base font-semibold text-slate-900">Close Tender Confirmation</h3>
            <p className="mt-2 text-sm text-slate-600">
              This will close the tender permanently. After closing, you cannot reopen it or edit tender data.
            </p>

            <div className="mt-4 flex items-center justify-end gap-2">
              <Button type="button" variant="outline" className="h-9 rounded-full border-slate-200 px-4 text-xs" onClick={() => setCloseConfirmOpen(false)}>
                Cancel
              </Button>
              <form action={handleCloseTender}>
                <input type="hidden" name="tenderId" value={tenderId} />
                <input type="hidden" name="status" value="CLOSED" />
                <Button type="submit" className="h-9 rounded-full bg-primary px-4 text-xs text-primary-foreground hover:bg-primary/90">
                  Yes, Close Tender
                </Button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
