import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createTender } from "@/lib/actions";
import { CalendarDays, CircleDollarSign, FileText, Sparkles } from "lucide-react";

export default function NewTenderPage() {
  return (
    <section className="w-full space-y-6">
      <div className="rounded-xl border bg-gradient-to-r from-slate-50 to-white p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tender Setup</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Create New Tender</h1>
        <p className="mt-1 text-sm text-muted-foreground">Prepare a new auction session with fixed USD currency and structured notes.</p>
      </div>

      <form action={createTender} className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4 rounded-xl border bg-white p-5 shadow-sm">
          <div className="grid gap-2">
            <Label htmlFor="name" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Tender Name *
            </Label>
            <div className="relative">
              <Sparkles className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="name"
                name="name"
                required
                placeholder="e.g. 2026 Atlantic Pearl Tender"
                className="h-11 rounded-lg border-slate-300 pl-9 focus-visible:ring-2"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="date" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Date
            </Label>
            <div className="relative">
              <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="date" name="date" type="date" className="h-11 rounded-lg border-slate-300 pl-9 focus-visible:ring-2" />
            </div>
          </div>

          <div className="grid gap-2">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Currency</Label>
            <div className="flex h-11 items-center gap-2 rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm font-medium">
              <CircleDollarSign className="h-4 w-4 text-emerald-600" />
              USD (fixed)
            </div>
          </div>
        </div>

        <div className="space-y-4 rounded-xl border bg-white p-5 shadow-sm">
          <div className="grid gap-2">
            <Label htmlFor="memo" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Memo
            </Label>
            <div className="relative">
              <FileText className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Textarea
                id="memo"
                name="memo"
                placeholder="Internal notes, special instructions, settlement details..."
                className="min-h-52 rounded-lg border-slate-300 pl-9 focus-visible:ring-2"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t pt-4">
            <Button type="submit" className="h-11 rounded-lg px-6">
              Create Tender
            </Button>
          </div>
        </div>
      </form>
    </section>
  );
}
