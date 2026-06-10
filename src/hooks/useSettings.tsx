import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useAuth } from '@/store/AuthContext';

type SettingsMap = Record<string, string>;
interface SettingsContextType {
  settings: SettingsMap;
  currency: string;
  dateFormat: string;
  updateSetting: (key: string, value: string) => void;
  isLoading: boolean;
}

const defaults: SettingsMap = {
  currency: 'DZD',
  language: 'en',
  low_stock_alert: '1',
  scan_auto_confirm: '0',
  date_format: 'DD/MM/YYYY',
  default_threshold: '5',
  scan_default_qty: '1',
  scan_ask_buyer: '0',
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<SettingsMap>(defaults);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setSettings(defaults);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    window.api.db.settings.getAll(user.id).then((rows: Array<{ key: string; value: string }>) => {
      setSettings({ ...defaults, ...Object.fromEntries(rows.map((row) => [row.key, row.value])) });
      setIsLoading(false);
    });
  }, [user]);

  const updateSetting = useCallback((key: string, value: string) => {
    setSettings((current) => ({ ...current, [key]: value }));
    window.setTimeout(() => {
      if (user) void window.api.db.settings.set(user.id, key, value);
    }, 500);
  }, [user]);

  const value = useMemo(() => ({
    settings,
    currency: settings.currency ?? 'DZD',
    dateFormat: settings.date_format ?? 'DD/MM/YYYY',
    updateSetting,
    isLoading,
  }), [isLoading, settings, updateSetting]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) throw new Error('useSettings must be used within SettingsProvider');
  return context;
};
