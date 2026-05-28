import { BriefcaseIcon, HomeIcon, MicIcon, UserIcon } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
import clsx from "clsx";

const navItems = [
  { to: "/", icon: HomeIcon, label: "Dashboard" },
  { to: "/jobs", icon: BriefcaseIcon, label: "Job Queue" },
  { to: "/profile", icon: UserIcon, label: "Profile" },
  { to: "/interview", icon: MicIcon, label: "Interview Coach" },
];

export function Layout() {
  return (
    <div className="min-h-screen flex">
      <aside className="w-56 bg-brand-900 text-white flex flex-col">
        <div className="px-6 py-5 border-b border-brand-700">
          <h1 className="text-xl font-bold tracking-tight">Jobs AI</h1>
          <p className="text-xs text-brand-100 mt-0.5">AU Career Co-Pilot</p>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                clsx(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-brand-600 text-white"
                    : "text-brand-100 hover:bg-brand-700 hover:text-white"
                )
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="px-6 py-4 border-t border-brand-700">
          <button
            onClick={() => {
              localStorage.removeItem("access_token");
              window.location.href = "/login";
            }}
            className="text-xs text-brand-200 hover:text-white"
          >
            Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
