import Image from "next/image";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getCurrentSession } from "@/lib/auth";
import { signIn } from "@/lib/actions";

type Props = {
  searchParams: Promise<{ error?: string }>;
};

export default async function LoginPage({ searchParams }: Props) {
  const { error } = await searchParams;
  const session = await getCurrentSession();

  if (session) {
    redirect("/");
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_10%_0%,rgba(30,64,175,0.12),transparent_35%),radial-gradient(circle_at_90%_0%,rgba(15,23,42,0.08),transparent_30%)]" />
      <Card className="w-full max-w-md border-white/70 shadow-lg">
        <CardHeader>
          <div className="mb-2 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white">
              <Image src="/client-logo.png" alt="Client logo" width={36} height={36} className="h-full w-full object-contain p-0.5" />
            </div>
            <div>
              <p className="font-semibold">Pearl Auction Admin</p>
              <p className="text-xs text-muted-foreground">Sign in to continue</p>
            </div>
          </div>
          <CardTitle>Login</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={signIn} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="loginId">Login ID</Label>
              <Input id="loginId" name="loginId" placeholder="admin1" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" placeholder="********" required />
            </div>

            {error && (
              <p className="text-sm text-red-600">
                {error === "invalid" ? "Invalid login ID or password" : "Please enter login ID and password"}
              </p>
            )}

            <Button type="submit" className="w-full">
              Sign in
            </Button>

            <p className="text-xs text-muted-foreground">
              Default accounts: admin1/admin123, staffa/staff123
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
