import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireAdmin } from "@/lib/auth";
import { createUser } from "@/lib/actions";
import { prisma } from "@/prisma/client";

function roleBadgeClass(role: string) {
  if (role === "ADMIN") return "border-primary/30 bg-primary/10 text-primary";
  return "border-cyan-300 bg-cyan-100/70 text-cyan-700";
}

function userStatusBadgeClass(status: string) {
  if (status === "ACTIVE") return "border-emerald-300 bg-emerald-100/70 text-emerald-700";
  if (status === "SUSPENDED") return "border-amber-300 bg-amber-100/70 text-amber-700";
  return "border-slate-300 bg-slate-100 text-slate-600";
}

export default async function UsersPage() {
  await requireAdmin();

  const users = await prisma.user.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div className="space-y-3 rounded-2xl bg-gradient-to-br from-sky-50/70 via-white to-violet-50/60 p-2">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">User Admin</h1>
        <p className="mt-0.5 text-sm text-slate-500">Manage operator and admin accounts</p>
      </div>

      <Card className="overflow-hidden rounded-[24px] border border-slate-200/80 bg-white/95 shadow-none backdrop-blur">
        <CardHeader className="border-b border-slate-200 bg-gradient-to-r from-indigo-50 via-sky-50 to-cyan-50 py-4">
          <CardTitle className="text-sm font-semibold text-slate-800">Users</CardTitle>
        </CardHeader>
        <CardContent className="p-3">
          <div className="overflow-x-auto rounded-2xl border border-indigo-100 bg-gradient-to-b from-indigo-50/40 via-white to-sky-50/40">
          <Table className="w-full border-collapse text-xs">
            <TableHeader>
              <TableRow className="bg-indigo-100/50 hover:bg-indigo-100/50">
                <TableHead className="h-[46px] border-b border-r border-slate-200">Name</TableHead>
                <TableHead className="h-[46px] border-b border-r border-slate-200">LoginID</TableHead>
                <TableHead className="h-[46px] border-b border-r border-slate-200">Role</TableHead>
                <TableHead className="h-[46px] border-b border-r border-slate-200">Status</TableHead>
                <TableHead className="h-[46px] border-b border-slate-200 text-center">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={5} className="h-[52px] border-b border-slate-200 text-center text-slate-500">
                    No users found.
                  </TableCell>
                </TableRow>
              ) : (
                users.map((u, index) => (
                  <TableRow key={u.id} className={`hover:bg-indigo-100/50 ${index % 2 === 0 ? "bg-white/90" : "bg-sky-50/60"}`}>
                    <TableCell className="h-[46px] border-b border-r border-slate-200 font-medium">{u.name}</TableCell>
                    <TableCell className="h-[46px] border-b border-r border-slate-200">{u.loginId}</TableCell>
                    <TableCell className="h-[46px] border-b border-r border-slate-200">
                      <Badge variant="outline" className={`rounded-full px-2.5 py-0.5 font-medium ${roleBadgeClass(u.role)}`}>
                        {u.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="h-[46px] border-b border-r border-slate-200">
                      <Badge variant="outline" className={`rounded-full px-2.5 py-0.5 font-medium ${userStatusBadgeClass(u.status)}`}>
                        {u.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="h-[46px] border-b border-slate-200 text-center">
                      <Button size="sm" variant="outline" className="h-8 rounded-md border-slate-200 px-3 text-xs" disabled>
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden rounded-[24px] border border-slate-200/80 bg-white/95 shadow-none backdrop-blur">
        <CardHeader className="border-b border-slate-200 bg-gradient-to-r from-fuchsia-50 via-white to-sky-50 py-4">
          <CardTitle className="text-sm font-semibold text-slate-800">+ Add User</CardTitle>
        </CardHeader>
        <CardContent className="p-3">
          <form action={createUser} className="grid gap-3 rounded-2xl border border-slate-200 bg-gradient-to-r from-white to-slate-50 p-3 md:grid-cols-5">
            <div className="grid gap-2">
              <Label htmlFor="name" className="text-xs text-slate-600">Name</Label>
              <Input id="name" name="name" required className="h-9 rounded-full border-slate-200 bg-slate-50 text-xs" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="loginId" className="text-xs text-slate-600">LoginID</Label>
              <Input id="loginId" name="loginId" required className="h-9 rounded-full border-slate-200 bg-slate-50 text-xs" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password" className="text-xs text-slate-600">Password</Label>
              <Input id="password" name="password" type="password" required className="h-9 rounded-full border-slate-200 bg-slate-50 text-xs" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="role" className="text-xs text-slate-600">Role</Label>
              <select id="role" name="role" className="h-9 rounded-full border border-slate-200 bg-slate-50 px-3 text-xs outline-none focus:border-indigo-300">
                <option value="ADMIN">Admin</option>
                <option value="OPERATOR">Operator</option>
              </select>
            </div>
            <Button type="submit" className="h-9 self-end rounded-full bg-primary px-4 text-xs text-primary-foreground hover:bg-primary/90">
              Add
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
