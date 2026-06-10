import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';

const titles: Record<string, string> = {
  '/home': 'Dashboard',
  '/products': 'Products',
  '/stock': 'Stock',
  '/scan': 'Scanner',
  '/reporting': 'Reports',
  '/economy': 'Economy',
  '/profile': 'Profile',
  '/settings': 'Settings',
  '/contact': 'Contact',
  '/dev': 'Developer Tools',
};

export const TopBar = () => {
  const location = useLocation();
  const title = useMemo(() => {
    if (location.pathname.startsWith('/products/')) {
      return 'Product Details';
    }

    return titles[location.pathname] ?? 'StockFlow';
  }, [location.pathname]);

  return (
    <header className="topbar">
      <h1>{title}</h1>
      <div className="window-controls">
        <button className="window-control window-minimize" type="button" aria-label="Minimize" onClick={() => void window.api.window.minimize()} />
        <button className="window-control window-maximize" type="button" aria-label="Maximize" onClick={() => void window.api.window.maximize()} />
        <button className="window-control window-close" type="button" aria-label="Close" onClick={() => void window.api.window.close()} />
      </div>
    </header>
  );
};
