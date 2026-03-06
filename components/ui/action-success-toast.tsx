"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

const MESSAGE_MAP: Record<string, string> = {
  tender_created: "Tender created successfully",
  tender_status_updated: "Tender status updated",
  bidder_saved: "Bidder saved successfully",
  bid_draft_saved: "Bid draft saved",
  bid_submitted: "Bid submitted successfully",
  tie_resolved: "Tie resolved successfully",
  user_created: "User created successfully",
  bidder_deleted: "Bidder removed successfully",
  bidder_updated: "Bidder updated successfully",
  profile_saved: "Profile updated successfully",
  password_changed: "Password changed successfully",
  tender_updated: "Tender information updated",
  tender_deleted: "Tender deleted successfully",
};

export function ActionSuccessToast() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const ok = searchParams.get("ok");

  useEffect(() => {
    if (!ok) return;
    const message = MESSAGE_MAP[ok];
    if (!message) return;

    toast.success(message);

    const next = new URLSearchParams(searchParams.toString());
    next.delete("ok");
    const nextQuery = next.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
  }, [ok, pathname, router, searchParams]);

  return null;
}
