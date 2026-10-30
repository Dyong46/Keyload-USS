"use client"

import { useState, type ReactNode } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Building2,
  CalendarDays,
  CarFront,
  CircleUserRound,
  LoaderCircle,
  PanelLeftClose,
  PanelLeftOpen,
  Sparkles,
  UserCog,
  Wrench,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

type BackendState = "pending" | "connected" | "unavailable"

type SchedulerShellProps = {
  children: ReactNode
  backendState: BackendState
  staffName: string
}

export function SchedulerShell({
  children,
  backendState,
  staffName,
}: SchedulerShellProps) {
  const pathname = usePathname()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-slate-950">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 hidden border-r border-slate-200/80 bg-[#0d1b2e] px-4 py-5 text-white transition-[width] duration-200 lg:flex lg:flex-col",
          sidebarCollapsed ? "w-20" : "w-64"
        )}
      >
        <button
          type="button"
          onClick={() => setSidebarCollapsed((collapsed) => !collapsed)}
          aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="absolute top-6 -right-3 z-10 grid size-7 place-items-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50 hover:text-slate-950"
        >
          {sidebarCollapsed ? (
            <PanelLeftOpen className="size-4" />
          ) : (
            <PanelLeftClose className="size-4" />
          )}
        </button>
        <Link
          href="/"
          title={sidebarCollapsed ? "USS Service Scheduler" : undefined}
          className={cn(
            "flex items-center rounded-xl px-2 text-left",
            sidebarCollapsed ? "justify-center" : "gap-3"
          )}
        >
          <span className="grid size-10 place-items-center rounded-xl bg-blue-500 shadow-lg shadow-blue-950/30">
            <CarFront className="size-5" />
          </span>
          <span className={cn(sidebarCollapsed && "hidden")}>
            <span className="block text-sm font-bold tracking-wide">USS</span>
            <span className="block text-[11px] text-slate-400">
              Service Scheduler
            </span>
          </span>
        </Link>

        <nav className="mt-10 space-y-1" aria-label="Primary navigation">
          <NavLink
            href="/"
            label="Appointments"
            icon={CalendarDays}
            active={pathname === "/" || pathname.startsWith("/appointments")}
            collapsed={sidebarCollapsed}
          />
          <NavLink
            href="/customers"
            label="Customers"
            icon={CircleUserRound}
            active={pathname.startsWith("/customers")}
            collapsed={sidebarCollapsed}
          />
          <NavLink
            href="/technicians"
            label="Technicians"
            icon={UserCog}
            active={pathname.startsWith("/technicians")}
            collapsed={sidebarCollapsed}
          />
          <NavLink
            href="/service-types"
            label="Service types"
            icon={Wrench}
            active={pathname.startsWith("/service-types")}
            collapsed={sidebarCollapsed}
          />
        </nav>

        <div
          className={cn(
            "mt-auto rounded-2xl border border-white/10 bg-white/5 p-3.5",
            sidebarCollapsed && "hidden"
          )}
        >
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-white">
            <Sparkles className="size-3.5 text-blue-400" /> Live workflow
          </div>
          <p className="text-xs leading-5 text-slate-400">
            Availability, booking and appointment lifecycle actions are backed
            by the NestJS API.
          </p>
        </div>
      </aside>

      <div
        className={cn(
          "transition-[padding] duration-200",
          sidebarCollapsed ? "lg:pl-20" : "lg:pl-64"
        )}
      >
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur md:px-8">
          <div className="flex items-center gap-3 lg:hidden">
            <span className="grid size-9 place-items-center rounded-xl bg-blue-600 text-white">
              <CarFront className="size-4" />
            </span>
            <span className="text-sm font-bold">USS</span>
          </div>
          <div className="hidden items-center gap-2 text-xs font-medium text-slate-500 lg:flex">
            <Building2 className="size-4" /> Demo dealership workspace
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={cn(
                "hidden h-7 px-2.5 sm:inline-flex",
                backendState === "connected" &&
                  "border-emerald-200 bg-emerald-50 text-emerald-700",
                backendState === "unavailable" &&
                  "border-red-200 bg-red-50 text-red-700",
                backendState === "pending" &&
                  "border-slate-200 bg-slate-50 text-slate-500"
              )}
            >
              {backendState === "pending" ? (
                <LoaderCircle className="size-3 animate-spin" />
              ) : (
                <span
                  className={cn(
                    "size-1.5 rounded-full",
                    backendState === "connected"
                      ? "bg-emerald-500"
                      : "bg-red-500"
                  )}
                />
              )}
              {backendState === "connected"
                ? "Backend connected"
                : backendState === "unavailable"
                  ? "Backend unavailable"
                  : "Connecting…"}
            </Badge>
            <div className="ml-1 flex items-center gap-2 border-l border-slate-200 pl-3">
              <span className="grid size-8 place-items-center rounded-full bg-slate-900 text-xs font-bold text-white">
                DS
              </span>
              <div className="hidden sm:block">
                <p className="text-xs font-semibold text-slate-800">
                  {staffName}
                </p>
                <p className="text-[10px] text-slate-500">Service advisor</p>
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1440px] p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}

function NavLink({
  href,
  label,
  icon: Icon,
  active,
  collapsed,
}: {
  href: string
  label: string
  icon: typeof CalendarDays
  active: boolean
  collapsed: boolean
}) {
  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-400 hover:bg-white/5 hover:text-white",
        collapsed && "justify-center gap-0 px-0",
        active &&
          "bg-white/10 font-semibold text-white ring-1 ring-white/10"
      )}
    >
      <Icon className={cn("size-4", active && "text-blue-400")} />
      <span className={cn(collapsed && "sr-only")}>{label}</span>
    </Link>
  )
}
