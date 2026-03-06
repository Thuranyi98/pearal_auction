"use client";

import { useState } from "react";
import { createPortal } from "react-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  tenderId: number;
  bidderId: number;
  bidderNo: string;
  name: string;
  email: string | null;
  disabled?: boolean;
  updateAction: (formData: FormData) => Promise<void>;
};

export function EditBidderDialog({
  tenderId,
  bidderId,
  bidderNo,
  name,
  email,
  disabled = false,
  updateAction,
}: Props) {
  const [open, setOpen] = useState(false);
  const hasDOM = typeof document !== "undefined";

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className="h-8 rounded-full border-slate-200 bg-white px-3 text-xs"
      >
        Edit
      </Button>

      {open && hasDOM
        ? createPortal(
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-4 shadow-xl">
            <h3 className="text-base font-semibold text-slate-900">Edit Bidder</h3>
            <form action={updateAction} className="mt-3 space-y-3">
              <input type="hidden" name="tenderId" value={tenderId} />
              <input type="hidden" name="bidderId" value={bidderId} />

              <div className="grid gap-2">
                <Label htmlFor={`bidderNo_${bidderId}`} className="text-xs text-slate-600">Bidder No*</Label>
                <Input
                  id={`bidderNo_${bidderId}`}
                  name="bidderNo"
                  defaultValue={bidderNo}
                  required
                  className="h-9 rounded-full border-slate-200 bg-slate-50 text-xs"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor={`name_${bidderId}`} className="text-xs text-slate-600">Name*</Label>
                <Input
                  id={`name_${bidderId}`}
                  name="name"
                  defaultValue={name}
                  required
                  className="h-9 rounded-full border-slate-200 bg-slate-50 text-xs"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor={`email_${bidderId}`} className="text-xs text-slate-600">Email</Label>
                <Input
                  id={`email_${bidderId}`}
                  name="email"
                  type="email"
                  defaultValue={email ?? ""}
                  className="h-9 rounded-full border-slate-200 bg-slate-50 text-xs"
                />
              </div>

              <div className="mt-4 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 rounded-full border-slate-200 px-4 text-xs"
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" className="h-9 rounded-full bg-primary px-4 text-xs text-primary-foreground hover:bg-primary/90">
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )
        : null}
    </>
  );
}
