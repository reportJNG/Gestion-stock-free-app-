import {
  BarChart2,
  Archive,
  Code2,
  LayoutDashboard,
  Layers,
  LogOut,
  Mail,
  Package,
  Scan,
  Settings,
  TrendingUp,
  User,
  type LucideIcon,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '@/store/AuthContext';

const navItems: Array<{ to: string; label: string; icon: LucideIcon }> = [
  { to: '/home', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/products', label: 'Products', icon: Package },
  { to: '/stock', label: 'Stock', icon: Layers },
  { to: '/scan', label: 'Scanner', icon: Scan },
  { to: '/reporting', label: 'Reports', icon: BarChart2 },
  { to: '/economy', label: 'Economy', icon: TrendingUp },
  { to: '/profile', label: 'Profile', icon: User },
  { to: '/settings', label: 'Settings', icon: Settings },
  { to: '/contact', label: 'Contact', icon: Mail },
  { to: '/archives', label: 'Archives', icon: Archive },
  { to: '/dev', label: 'Dev', icon: Code2 },
];

export const Sidebar = () => {
  const { user, logout } = useAuth();

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-mark">S</div>
        <div>
          <div className="brand-name">StockFlow</div>
          <div className="brand-tag">DESK</div>
        </div>
      </div>

      <nav className="sidebar-nav" aria-label="Main navigation">
        {navItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `nav-item ${isActive ? 'nav-item-active' : ''}`}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="sidebar-user">
        <div className="user-avatar">{user?.name.charAt(0) ?? 'U'}</div>
        <div className="user-meta">
          <span>{user?.name ?? 'Guest'}</span>
          <small>{user?.businessType ?? 'signed out'}</small>
        </div>
        <button className="icon-button" type="button" aria-label="Logout" onClick={logout}>
          <LogOut size={16} />
        </button>
      </div>
    </aside>
  );
};
