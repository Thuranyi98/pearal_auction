"use client";

import { Loader2 } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

type BidderOption = {
  id: number;
  bidderNo: string;
  name: string;
};

type Props = {
  currentBidderId?: number;
  bidders: BidderOption[];
  disabled?: boolean;
};

export function BidderAutoSelect({ currentBidderId, bidders, disabled = false }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-2">
      <select
        name="bidderId"
        value={currentBidderId ? String(currentBidderId) : ""}
        onChange={(e) => {
          const next = new URLSearchParams(searchParams.toString());
          next.set("tab", "bid-entry");
          next.set("bidderId", e.target.value);
          next.delete("ok");
          startTransition(() => {
            router.replace(`${pathname}?${next.toString()}`);
          });
        }}
        className="h-9 rounded-full border border-slate-200 bg-slate-50 px-3 text-xs"
        disabled={disabled || bidders.length === 0 || isPending}
      >
        {bidders.length === 0 ? (
          <option value="">No bidders</option>
        ) : (
          bidders.map((b) => (
            <option key={b.id} value={b.id}>
              BidderNo {b.bidderNo} - {b.name}
            </option>
          ))
        )}
      </select>
      {isPending ? (
        <div className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2 py-1 text-[11px] font-medium text-sky-700">
          <Loader2 className="h-3 w-3 animate-spin" />
          Loading bidder data...
        </div>
      ) : null}
    </div>
  );
}
