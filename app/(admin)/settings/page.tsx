import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { changeMyPassword, updateMyProfile } from "@/lib/actions";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/prisma/client";

type Props = {
  searchParams: Promise<{ ok?: string; error?: string }>;
};

function errorMessage(error?: string) {
  switch (error) {
    case "invalid_name":
      return "Name must be at least 2 characters.";
    case "missing_password_fields":
      return "Please fill current password, new password, and confirm password.";
    case "weak_password":
      return "New password must be at least 6 characters.";
    case "password_mismatch":
      return "New password and confirm password do not match.";
    case "password_same_as_old":
      return "New password must be different from current password.";
    case "current_password_wrong":
      return "Current password is incorrect.";
    case "user_not_found":
      return "User account not found.";
    default:
      return "";
  }
}

function successMessage(ok?: string) {
  if (ok === "profile_saved") return "Profile updated successfully.";
  if (ok === "password_changed") return "Password changed successfully.";
  return "";
}

export default async function SettingsPage({ searchParams }: Props) {
  const session = await requireAuth();
  const { ok, error } = await searchParams;
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, name: true, loginId: true, role: true, lastLoginAt: true },
  });

  if (!user) {
    return <div>User account not found.</div>;
  }

  const success = successMessage(ok);
  const failure = errorMessage(error);

  return (
    <div className="space-y-3 rounded-2xl bg-gradient-to-br from-sky-50/70 via-white to-violet-50/60 p-2">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Settings</h1>
        <p className="mt-0.5 text-sm text-slate-500">Manage your account and support access</p>
      </div>

      {success ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{success}</div>
      ) : null}
      {failure ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{failure}</div>
      ) : null}

      <Card className="overflow-hidden rounded-[24px] border border-slate-200/80 bg-white/95 shadow-none backdrop-blur">
        <CardHeader className="border-b border-slate-200 bg-gradient-to-r from-indigo-50 via-sky-50 to-cyan-50 py-4">
          <CardTitle className="text-sm font-semibold text-slate-800">Profile</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 p-3 md:grid-cols-2">
          <form action={updateMyProfile} className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-sm font-semibold text-slate-800">Account Info</p>
            <div className="mt-3 grid gap-2">
              <label className="text-xs text-slate-600">Display Name</label>
              <Input name="name" defaultValue={user.name} className="h-9 rounded-full border-slate-200 bg-slate-50 text-xs" />
            </div>
            <div className="mt-3 grid gap-2">
              <label className="text-xs text-slate-600">Login ID</label>
              <Input value={user.loginId} disabled className="h-9 rounded-full border-slate-200 bg-slate-100 text-xs" />
            </div>
            <div className="mt-3 flex items-center gap-2">
              <Badge variant="outline" className="rounded-full border-sky-200 bg-sky-50 text-sky-700">
                {user.role}
              </Badge>
              {user.lastLoginAt ? (
                <span className="text-[11px] text-slate-500">Last login: {new Date(user.lastLoginAt).toLocaleString()}</span>
              ) : null}
            </div>
            <Button type="submit" className="mt-4 h-9 rounded-full bg-primary px-4 text-xs text-primary-foreground hover:bg-primary/90">
              Save Profile
            </Button>
          </form>

          <form action={changeMyPassword} className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-sm font-semibold text-slate-800">Security</p>
            <div className="mt-3 grid gap-2">
              <label className="text-xs text-slate-600">Current Password</label>
              <Input
                name="currentPassword"
                type="password"
                required
                className="h-9 rounded-full border-slate-200 bg-slate-50 text-xs"
              />
            </div>
            <div className="mt-3 grid gap-2">
              <label className="text-xs text-slate-600">New Password</label>
              <Input name="newPassword" type="password" required className="h-9 rounded-full border-slate-200 bg-slate-50 text-xs" />
            </div>
            <div className="mt-3 grid gap-2">
              <label className="text-xs text-slate-600">Confirm New Password</label>
              <Input
                name="confirmPassword"
                type="password"
                required
                className="h-9 rounded-full border-slate-200 bg-slate-50 text-xs"
              />
            </div>
            <Button type="submit" variant="outline" className="mt-4 h-9 rounded-full border-slate-200 px-4 text-xs">
              Change Password
            </Button>
          </form>
        </CardContent>
      </Card>

    </div>
  );
}
