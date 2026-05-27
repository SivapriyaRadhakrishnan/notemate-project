import {
  Bell,
  BarChart3,
  CreditCard,
  FileCheck2,
  FilePlus2,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Settings,
  ShieldAlert,
  SlidersHorizontal,
  User,
  Wallet,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../../context/auth-context";
import { supabase } from "../../supabase/client";

type Role = "customer" | "writer" | "admin";

interface NavigationItem {
  icon: LucideIcon;
  label: string;
  path: string;
  end?: boolean;
}

interface RoleConfig {
  role: Role;
  brandLabel: string;
  dashboardTitle: string;
  searchPlaceholder: string;
  navItems: NavigationItem[];
}

const roleConfigs: Record<Role, RoleConfig> = {
  customer: {
    role: "customer",
    brandLabel: "Customer Portal",
    dashboardTitle: "Customer Dashboard",
    searchPlaceholder: "Search assignments...",
    navItems: [
      { icon: LayoutDashboard, label: "Dashboard", path: "/customer", end: true },
      { icon: FilePlus2, label: "Create Assignment", path: "/customer/create-assignment" },
      { icon: FileText, label: "My Assignments", path: "/customer/assignments" },
      { icon: MessageSquare, label: "Messages", path: "/customer/messages" },
      { icon: Wallet, label: "Payments", path: "/customer/payments" },
      { icon: Bell, label: "Notifications", path: "/customer/notifications" },
      { icon: User, label: "Profile", path: "/customer/profile" },
      { icon: Settings, label: "Settings", path: "/customer/settings" },
    ],
  },
  writer: {
    role: "writer",
    brandLabel: "Writer Workspace",
    dashboardTitle: "Writer Dashboard",
    searchPlaceholder: "Search orders...",
    navItems: [
      { icon: LayoutDashboard, label: "Writer Dashboard", path: "/writer-dashboard", end: true },
      { icon: FileCheck2, label: "Orders", path: "/writer-dashboard/orders" },
      { icon: MessageSquare, label: "Messages", path: "/writer-dashboard/messages" },
      { icon: Wallet, label: "Payments", path: "/writer-dashboard/payments" },
      { icon: Bell, label: "Notifications", path: "/writer-dashboard/notifications" },
      { icon: User, label: "Profile", path: "/writer-dashboard/profile" },
      { icon: Settings, label: "Settings", path: "/writer-dashboard/settings" },
    ],
  },
  admin: {
    role: "admin",
    brandLabel: "Admin Console",
    dashboardTitle: "Admin Dashboard",
    searchPlaceholder: "Search platform data...",
    navItems: [
      { icon: LayoutDashboard, label: "Admin Dashboard", path: "/admin-dashboard", end: true },
      { icon: FileCheck2, label: "Writer Verifications", path: "/admin-dashboard/writer-verifications" },
      { icon: ShieldAlert, label: "Disputes", path: "/admin-dashboard/disputes" },
      { icon: BarChart3, label: "Analytics", path: "/admin-dashboard/analytics" },
      { icon: SlidersHorizontal, label: "Commission Config", path: "/admin-dashboard/commission-config" },
      { icon: Bell, label: "Notifications", path: "/admin-dashboard/notifications" },
      { icon: User, label: "Profile", path: "/admin-dashboard/profile" },
      { icon: Settings, label: "Settings", path: "/admin-dashboard/settings" },
    ],
  },
};

const pageTitles: Record<string, string> = {
  profile: "Profile",
  messages: "Messages",
  payments: "Payments",
  notifications: "Notifications",
  settings: "Settings",
  "create-assignment": "Create Assignment",
  assignments: "My Assignments",
  orders: "Orders",
  "writer-verifications": "Writer Verifications",
  disputes: "Disputes",
  analytics: "Analytics",
  "commission-config": "Commission Config",
};

const getPageTitle = (config: RoleConfig, pathname: string) => {
  const segment = pathname.split("/").filter(Boolean).at(-1);
  if (!segment || segment === config.role || pathname === "/writer-dashboard" || pathname === "/admin-dashboard") {
    return config.dashboardTitle;
  }

  return pageTitles[segment] || config.dashboardTitle;
};

const getInitials = (name?: string) => {
  if (!name) return "N";

  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
};

export const RoleSidebar = ({
  role,
  mobile = false,
  onNavigate,
}: {
  role: Role;
  mobile?: boolean;
  onNavigate?: () => void;
}) => {
  const config = roleConfigs[role];
  const navigate = useNavigate();
  const { profile } = useAuth();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <aside
      className={`flex h-full w-72 shrink-0 flex-col justify-between border-r border-white/10 bg-[#081120] p-6 ${
        mobile ? "" : "hidden lg:flex"
      }`}
    >
      <div>
        <div className="mb-10 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-blue-600 shadow-lg shadow-violet-500/20">
            <span className="font-bold text-white">N</span>
          </div>

          <div>
            <h1 className="text-2xl font-black text-white">NoteMate</h1>
            <p className="text-xs text-white/40">{config.brandLabel}</p>
          </div>
        </div>

        <nav className="space-y-2">
          {config.navItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                onClick={onNavigate}
                className={({ isActive }) =>
                  `group flex w-full items-center gap-4 rounded-2xl px-4 py-3 transition-all duration-300 ${
                    isActive ? "bg-white/10 text-white" : "text-white/60 hover:bg-white/5 hover:text-white"
                  }`
                }
              >
                <Icon size={20} className="transition-transform duration-300 group-hover:scale-110" />
                <span className="font-medium">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      <div className="space-y-4">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="truncate text-sm font-semibold text-white">{profile?.full_name || "NoteMate User"}</p>
          <p className="mt-1 text-xs capitalize text-white/40">{config.brandLabel}</p>
        </div>

        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-4 rounded-2xl border border-red-500/10 bg-red-500/5 px-4 py-3 text-red-400 transition-all duration-300 hover:bg-red-500/10"
        >
          <LogOut size={20} />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </aside>
  );
};

export const RoleNavbar = ({
  role,
  onOpenSidebar,
}: {
  role: Role;
  onOpenSidebar: () => void;
}) => {
  const config = roleConfigs[role];
  const location = useLocation();
  const { profile, session } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const title = useMemo(() => getPageTitle(config, location.pathname), [config, location.pathname]);

  useEffect(() => {
    const fetchUnread = async () => {
      if (!session?.user.id) return;

      const { count, error } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", session.user.id)
        .eq("read", false);

      if (!error) {
        setUnreadCount(count || 0);
      }
    };

    fetchUnread();
  }, [session?.user.id, location.pathname]);

  return (
    <header className="flex items-center justify-between border-b border-white/10 bg-[#020617]/80 px-4 py-4 backdrop-blur-xl sm:px-6">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={onOpenSidebar}
          className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/70 transition-all duration-300 hover:bg-white/10 hover:text-white lg:hidden"
          aria-label="Open navigation"
        >
          <Menu size={20} />
        </button>

        <div>
          <h1 className="text-2xl font-black text-white sm:text-3xl">{title}</h1>
          <p className="mt-1 text-sm text-white/50">Welcome back, {profile?.full_name || "NoteMate User"}</p>
        </div>
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        <div className="hidden items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 xl:flex">
          <CreditCard size={18} className="text-white/40" />
          <input
            type="text"
            placeholder={config.searchPlaceholder}
            className="w-56 bg-transparent text-sm text-white outline-none placeholder:text-white/30"
          />
        </div>

        <NavLink
          to={config.navItems.find((item) => item.label === "Notifications")?.path || "#"}
          className="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/70 transition-all duration-300 hover:bg-white/10 hover:text-white"
          aria-label="Notifications"
        >
          <Bell size={20} />
          {unreadCount > 0 && (
            <span className="absolute right-2 top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-violet-500 px-1 text-[10px] font-black text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </NavLink>

        <NavLink
          to={config.navItems.find((item) => item.label === "Profile")?.path || "#"}
          className="hidden items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 transition-all duration-300 hover:bg-white/10 sm:flex"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-blue-500 font-semibold text-white">
            {getInitials(profile?.full_name)}
          </div>

          <div className="hidden md:block">
            <p className="text-sm font-medium text-white">{profile?.full_name || "NoteMate User"}</p>
            <p className="text-xs text-white/50">{config.brandLabel}</p>
          </div>
        </NavLink>
      </div>
    </header>
  );
};

export const RoleLayout = ({ role }: { role: Role }) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-[#020617]">
      <RoleSidebar role={role} />

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/70"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation overlay"
          />
          <div className="relative h-full">
            <RoleSidebar role={role} mobile onNavigate={() => setMobileOpen(false)} />
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-white"
              aria-label="Close navigation"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      <div className="min-w-0 flex-1">
        <RoleNavbar role={role} onOpenSidebar={() => setMobileOpen(true)} />
        <main className="p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
