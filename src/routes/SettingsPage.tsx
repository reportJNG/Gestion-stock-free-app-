import { useEffect, useState } from 'react';
import { Download, Upload } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { APP_NAME } from '@/constants/app';
import { useSettings } from '@/hooks/useSettings';
import { useToast } from '@/components/ui/Toast';

const currencies = ['DZD', 'USD', 'EUR', 'GBP', 'MAD', 'TND'];

const Toggle = ({ checked, onChange }: { checked: boolean; onChange: (value: boolean) => void }) => (
  <button className={`toggle ${checked ? 'toggle-on' : ''}`} type="button" onClick={() => onChange(!checked)}><span /></button>
);

export const SettingsPage = () => {
  const { settings, updateSetting } = useSettings();
  const { notify } = useToast();
  const [version, setVersion] = useState(import.meta.env.VITE_APP_VERSION ?? '');

  useEffect(() => {
    void window.api.app
      .getInfo()
      .then((info) => setVersion(info.version))
      .catch(() => undefined);
  }, []);
  const saved = (key: string, value: string) => {
    updateSetting(key, value);
    notify({ title: 'Saved', variant: 'success' });
  };

  const exportBackup = async () => {
    const result = await window.api.file.exportBackup();
    if (!result?.canceled) notify({ title: 'Backup exported', message: result.filePath, variant: 'success' });
  };

  const importBackup = async () => {
    if (!confirm('This will replace all current data. Continue?')) return;
    const result = await window.api.file.importBackup();
    if (!result?.canceled) notify({ title: 'Backup imported', message: 'Restart the app to reload the database.', variant: 'success' });
  };

  return (
    <div className="settings-page">
      <Card className="settings-section"><h1>Settings</h1><h2>General</h2>
        <label className="input-field"><span>Currency Symbol</span><select className="input-control" value={settings.currency} onChange={(e) => saved('currency', e.target.value)}>{currencies.map((c) => <option key={c}>{c}</option>)}</select></label>
        <div className="segmented">{['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'].map((fmt) => <button key={fmt} className={settings.date_format === fmt ? 'period-active' : ''} onClick={() => saved('date_format', fmt)}>{fmt}</button>)}</div>
        <label className="input-field"><span>Language</span><select className="input-control" value={settings.language} onChange={(e) => saved('language', e.target.value)}><option value="en">English</option></select><small>More languages coming soon</small></label>
      </Card>
      <Card className="settings-section"><h2>Stock Alerts</h2><div className="setting-row"><div><strong>Low Stock Alerts</strong><p>Show alerts on dashboard when items are running low</p></div><Toggle checked={settings.low_stock_alert === '1'} onChange={(v) => saved('low_stock_alert', v ? '1' : '0')} /></div><Input label="Default Low Stock Threshold" type="number" value={settings.default_threshold ?? '5'} onChange={(e) => saved('default_threshold', e.target.value)} /></Card>
      <Card className="settings-section"><h2>Scanner Behavior</h2><div className="setting-row"><div><strong>Auto-confirm single scans</strong><p>Automatically record a sale of quantity 1 without confirmation step</p></div><Toggle checked={settings.scan_auto_confirm === '1'} onChange={(v) => saved('scan_auto_confirm', v ? '1' : '0')} /></div><Input label="Default scan quantity" type="number" min={1} value={settings.scan_default_qty ?? '1'} onChange={(e) => saved('scan_default_qty', e.target.value)} /><div className="setting-row"><div><strong>Always ask for buyer name</strong><p>Show the buyer name field on every scan</p></div><Toggle checked={settings.scan_ask_buyer === '1'} onChange={(v) => saved('scan_ask_buyer', v ? '1' : '0')} /></div></Card>
      <Card className="settings-section"><h2>Data & Privacy</h2><div className="setting-row"><div><strong>Backup database</strong><p>Export a copy of stockflow.db</p></div><Button variant="secondary" onClick={exportBackup}><Download size={16}/>Export Backup</Button></div><div className="setting-row"><div><strong>Import backup</strong><p>This will replace all current data</p></div><Button variant="ghost" onClick={importBackup}><Upload size={16}/>Import Backup</Button></div><p className="muted-text">{APP_NAME} v{version || '...'} · Built with Electron + React + SQLite</p></Card>
      <Card className="settings-section"><h2>Appearance</h2><p className="muted-text">Dark mode is always active - more themes coming soon</p><div className="palette-row"><span style={{ background: 'var(--bg-base)' }} />Background<span style={{ background: 'var(--bg-surface)' }} />Surface<span style={{ background: 'var(--bg-elevated)' }} />Elevated<span style={{ background: 'var(--accent)' }} />White accent</div></Card>
    </div>
  );
};
