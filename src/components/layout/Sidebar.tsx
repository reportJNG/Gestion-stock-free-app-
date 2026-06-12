import {
  BarChart2,
  Archive,
  Info,
  LayoutDashboard,
  Layers,
  LogOut,
  Package,
  Scan,
  Settings,
  TrendingUp,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { AppLogo } from "@/components/ui/AppLogo";
import { APP_NAME } from "@/constants/app";
import { useAuth } from "@/store/AuthContext";

const navItems: Array<{
  to: string;
  label: string;
  icon: LucideIcon;
  shortcut?: string;
}> = [
  {
    to: "/home",
    label: "Dashboard",
    icon: LayoutDashboard,
    shortcut: "Ctrl+1",
  },
  { to: "/products", label: "Products", icon: Package, shortcut: "Ctrl+2" },
  { to: "/stock", label: "Stock", icon: Layers, shortcut: "Ctrl+3" },
  { to: "/scan", label: "Scanner", icon: Scan, shortcut: "Ctrl+4" },
  { to: "/reporting", label: "Reports", icon: BarChart2, shortcut: "Ctrl+5" },
  { to: "/economy", label: "Economy", icon: TrendingUp, shortcut: "Ctrl+6" },
  { to: "/profile", label: "Profile", icon: User },
  { to: "/settings", label: "Settings", icon: Settings, shortcut: "Ctrl+," },
  { to: "/archives", label: "Archives", icon: Archive },
  { to: "/workers", label: "Workers", icon: Users },
  { to: "/about", label: "About", icon: Info },
];

export const Sidebar = () => {
  const { user, logout } = useAuth();

  return (
    <aside className="sidebar">
      {/* Brand */}
      <div className="sidebar-brand">
        <AppLogo />

        <div className="brand-content">
          <div className="brand-name">{APP_NAME}</div>
          <div className="brand-tag">DESK</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav" aria-label="Main navigation">
        {navItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `nav-item ${isActive ? "nav-item-active" : ""}`
              }
            >
              <Icon size={18} />

              <span>{item.label}</span>

              {item.shortcut && (
                <kbd className="nav-shortcut">{item.shortcut}</kbd>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* User */}
      <div className="sidebar-user">
        <div className="user-avatar">
          {user?.name?.charAt(0)?.toUpperCase() ?? "U"}
        </div>

        <div className="user-meta">
          <span>{user?.name ?? "Guest"}</span>
          <small>{user?.businessType ?? "Signed Out"}</small>
        </div>

        <button
          className="icon-button"
          type="button"
          aria-label="Logout"
          onClick={logout}
        >
          <LogOut size={16} />
        </button>
      </div>
    </aside>
  );
};
