import { requireAuth } from "@/lib/auth";
import { AdminShell } from "@/components/layout/admin-shell";

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await requireAuth();

  const menu = [
    { href: "/", label: "Dashboard", icon: "dashboard", adminOnly: false },
    { href: "/tenders", label: "Tenders", icon: "tenders", adminOnly: false },
    { href: "/results", label: "Results", icon: "results", adminOnly: false },
    { href: "/bidders", label: "Bidders", icon: "bidders", adminOnly: false },
    { href: "/users", label: "Users (Admin)", icon: "users", adminOnly: true },
    { href: "/audit-log", label: "Audit Log (A)", icon: "audit", adminOnly: true },
  ];

  return (
    <AdminShell
      userName={session.name}
      role={session.role}
      menu={menu
        .filter((item) => (item.adminOnly ? session.role === "ADMIN" : true))
        .map((item) => ({ href: item.href, label: item.label, icon: item.icon }))}
    >
      {children}
    </AdminShell>
  );
}
