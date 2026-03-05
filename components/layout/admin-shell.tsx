"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Files,
  Gavel,
  LayoutDashboard,
  LogOut,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";
import { useMemo, useSyncExternalStore } from "react";

import { signOut } from "@/lib/actions";
import { cn } from "@/lib/utils";

type MenuItem = {
  href: string;
  label: string;
  icon: string;
};

type Props = {
  userName: string;
  role: string;
  menu: MenuItem[];
  children: React.ReactNode;
};

export function AdminShell({ userName, role, menu, children }: Props) {
  const pathname = usePathname();

  const collapsed = useSyncExternalStore(
    (onStoreChange) => {
      if (typeof window === "undefined") return () => {};
      const handler = () => onStoreChange();
      window.addEventListener("storage", handler);
      return () => window.removeEventListener("storage", handler);
    },
    () => {
      if (typeof window === "undefined") return false;
      return window.localStorage.getItem("pa_sidebar_collapsed") === "1";
    },
    () => false
  );

  function toggleSidebar() {
    const next = !collapsed;
    window.localStorage.setItem("pa_sidebar_collapsed", next ? "1" : "0");
    window.dispatchEvent(new Event("storage"));
  }

  const asideWidthClass = useMemo(() => (collapsed ? "md:grid-cols-[78px_1fr]" : "md:grid-cols-[240px_1fr]"), [collapsed]);

  function getMenuIcon(icon: string) {
    switch (icon) {
      case "dashboard":
        return <LayoutDashboard className="h-4 w-4" />;
      case "tenders":
        return <Gavel className="h-4 w-4" />;
      case "results":
        return <BarChart3 className="h-4 w-4" />;
      case "bidders":
        return <Users className="h-4 w-4" />;
      case "users":
        return <ShieldCheck className="h-4 w-4" />;
      case "audit":
        return <Files className="h-4 w-4" />;
      default:
        return <LayoutDashboard className="h-4 w-4" />;
    }
  }

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  const primaryMenu = menu.slice(0, 4);
  const secondaryMenu = menu.slice(4);

  return (
    <div className="min-h-screen bg-slate-100/80">
      <header className="border-b bg-background/90 backdrop-blur">
        <div className="flex h-16 w-full items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-3 font-semibold">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-xs font-bold text-primary-foreground shadow-sm">
              PA
            </div>
            <div className="leading-tight">
              <p>Pearl Auction Admin</p>
              <p className="text-xs font-normal text-muted-foreground">Control Center</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span>
              {userName} ({role})
            </span>
          </div>
        </div>
      </header>

      <div className={cn("grid w-full grid-cols-1 gap-4 p-3 md:p-4", asideWidthClass)}>
        <aside
          className={cn(
            "min-h-[calc(100vh-104px)] transition-all duration-300 ease-out",
            "flex flex-col rounded-2xl border border-slate-200 bg-white p-3.5"
          )}
        >
          <div className="mb-3 flex items-center justify-between">
            {!collapsed ? (
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-2 py-1.5">
                <span className="h-2 w-2 rounded-full bg-sky-500" />
                <p className="text-xs font-semibold text-slate-700">Pearl Corporation</p>
              </div>
            ) : (
              <span />
            )}
            <button
              type="button"
              onClick={toggleSidebar}
              className={cn(
                "rounded-md border px-1.5 py-1 transition-colors",
                "border-slate-300 text-slate-600 hover:bg-slate-100"
              )}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          </div>

          {!collapsed ? <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Main Menu</p> : null}
          <ul className="space-y-1 text-sm">
            {primaryMenu.map((item) => (
              <li key={item.href}>
                <Link
                  className={cn(
                    "group relative flex items-center gap-2 rounded-lg px-3 py-2.5 font-medium transition-all duration-200",
                    collapsed ? "justify-center px-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900" : "text-slate-600 hover:bg-slate-100",
                    isActive(item.href) &&
                      (collapsed ? "bg-slate-100 text-sky-600" : "bg-slate-100 text-slate-900"),
                    collapsed && "justify-center px-2"
                  )}
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                >
                  <span className={cn("transition-transform duration-200 group-hover:scale-110", isActive(item.href) && "text-sky-500")}>
                    {getMenuIcon(item.icon)}
                  </span>
                  {!collapsed ? <span className="transition-opacity duration-200">{item.label}</span> : null}
                  {collapsed ? (
                    <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                      {item.label}
                    </span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>

          {secondaryMenu.length > 0 ? (
            <>
              {!collapsed ? <p className="mb-1 mt-3 px-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Admin</p> : null}
              <ul className="space-y-1 text-sm">
                {secondaryMenu.map((item) => (
                  <li key={item.href}>
                    <Link
                      className={cn(
                        "group relative flex items-center gap-2 rounded-lg px-3 py-2.5 font-medium transition-all duration-200",
                        collapsed ? "justify-center px-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900" : "text-slate-600 hover:bg-slate-100",
                        isActive(item.href) &&
                          (collapsed ? "bg-slate-100 text-sky-600" : "bg-slate-100 text-slate-900")
                      )}
                      href={item.href}
                      title={collapsed ? item.label : undefined}
                    >
                      <span className={cn("transition-transform duration-200 group-hover:scale-110", isActive(item.href) && "text-sky-500")}>
                        {getMenuIcon(item.icon)}
                      </span>
                      {!collapsed ? <span>{item.label}</span> : null}
                      {collapsed ? (
                        <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                          {item.label}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          ) : null}

          <div className={cn("mt-4 border-t pt-3", collapsed ? "border-slate-800" : "border-slate-200")}>
            <Link
              href="/settings"
              className={cn(
                "group relative flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                collapsed ? "justify-center px-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900" : "gap-2 text-slate-600 hover:bg-slate-100",
                isActive("/settings") &&
                  (collapsed ? "bg-slate-100 text-sky-600" : "bg-slate-100 text-slate-900")
              )}
              title={collapsed ? "Settings" : undefined}
            >
              <Settings className="h-4 w-4" />
              {!collapsed ? <span>Settings</span> : null}
              {collapsed ? (
                <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                  Settings
                </span>
              ) : null}
            </Link>
          </div>

          <div className={cn("mt-auto pt-3", collapsed ? "text-slate-500" : "text-slate-600")}>
            {!collapsed ? (
              <div className="mb-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2">
                <p className="text-xs font-medium">{userName}</p>
                <p className="text-[11px] text-slate-500">{role}</p>
              </div>
            ) : null}
            <form action={signOut}>
              <button
                className={cn(
                  "flex w-full items-center rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
                  collapsed
                    ? "justify-center border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                    : "gap-2 border border-slate-200 text-slate-600 hover:bg-slate-100"
                )}
                type="submit"
                title={collapsed ? "Logout" : undefined}
              >
                <LogOut className="h-4 w-4" />
                {!collapsed ? <span>Logout</span> : null}
              </button>
            </form>
          </div>
        </aside>

        <main className="rounded-2xl border border-slate-200 bg-white p-4 transition-all duration-300 md:p-5">{children}</main>
      </div>
    </div>
  );
}
