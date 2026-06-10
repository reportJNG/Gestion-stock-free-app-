import { useEffect, useState } from 'react';
import { compare, hashSync } from 'bcryptjs';
import { BookOpen, Coffee, Cpu, LogOut, Package, Pill, Shirt, Sparkles, UtensilsCrossed } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/store/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { formatCurrency } from '@/utils/format';
import { useSettings } from '@/hooks/useSettings';
import { mapUserRow } from '@/utils/userMapper';
import type { UserRow } from '@/types';

const businessTypes = [
  ['clothing', 'Clothing', Shirt], ['food', 'Food', UtensilsCrossed], ['beverage', 'Beverage', Coffee],
  ['electronics', 'Electronics', Cpu], ['cosmetics', 'Cosmetics', Sparkles], ['pharmacy', 'Pharmacy', Pill],
  ['books', 'Books', BookOpen], ['general', 'General', Package],
] as const;

const initialsFor = (name: string) => name.trim().split(/\s+/).map((w) => w[0]).join('').toUpperCase().slice(0, 2);

export const ProfilePage = () => {
  const { user, login, logout } = useAuth();
  const { notify } = useToast();
  const { currency } = useSettings();
  const [stats, setStats] = useState({ products: 0, total_sales: 0, total_revenue: 0 });
  const [name, setName] = useState(user?.name ?? '');
  const [businessType, setBusinessType] = useState(user?.businessType ?? 'general');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [deleteStep, setDeleteStep] = useState(0);
  const [deleteConfirm, setDeleteConfirm] = useState('');

  useEffect(() => {
    if (user) window.api.profile.stats(user.id).then((row) => setStats(row ?? stats));
  }, [user]);

  if (!user) return null;

  const saveProfile = async () => {
    await window.api.db.users.updateSettings(user.id, { name, businessType, avatarInitials: initialsFor(name) });
    const row = await window.api.db.users.getById(user.id) as UserRow;
    login(mapUserRow(row));
    notify({ title: 'Profile updated', variant: 'success' });
  };

  const changePassword = async () => {
    setPasswordError('');
    if (newPassword.length < 4) return setPasswordError('New password must be at least 4 characters');
    if (newPassword !== confirmPassword) return setPasswordError("Passwords don't match");
    const row = await window.api.db.get('SELECT password_hash FROM users WHERE id = ?', [user.id]) as { password_hash: string } | undefined;
    if (!row || !(await compare(currentPassword, row.password_hash))) return setPasswordError('Current password is incorrect');
    await window.api.db.users.updatePassword(user.id, hashSync(newPassword, 10));
    setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
    notify({ title: 'Password changed', variant: 'success' });
  };

  const deleteEverything = async () => {
    await window.api.db.run('DELETE FROM products WHERE user_id = ?', [user.id]);
    await window.api.db.run('DELETE FROM sales WHERE user_id = ?', [user.id]);
    await window.api.db.run('DELETE FROM buyers WHERE user_id = ?', [user.id]);
    logout();
  };

  return (
    <div className="profile-page">
      <Card className="profile-card-large">
        <div className="profile-avatar-large">{user.avatarInitials}</div>
        <h1>{user.name}</h1>
        <Badge>{user.businessType}</Badge>
        <p>Member since {new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
        <div className="profile-divider" />
        <div className="profile-stats"><span>Products<strong>{stats.products}</strong></span><span>Total Sales<strong>{stats.total_sales}</strong></span><span>Total Revenue<strong>{formatCurrency(stats.total_revenue, currency)}</strong></span></div>
        {confirmLogout ? <div className="logout-confirm"><Button variant="danger" onClick={logout}>Sure? Log out</Button><Button variant="ghost" onClick={() => setConfirmLogout(false)}>Cancel</Button></div> : <Button variant="danger" onClick={() => setConfirmLogout(true)}><LogOut size={16} />Log Out</Button>}
      </Card>
      <div className="profile-forms">
        <Card className="settings-section"><h2>Profile Information</h2><Input label="Display Name" value={name} onChange={(e) => setName(e.target.value)} /><div className="business-grid">{businessTypes.map(([value, label, Icon]) => <button key={value} className={`business-card ${businessType === value ? 'business-card-selected' : ''}`} onClick={() => setBusinessType(value)}><Icon size={28}/><span>{label}</span></button>)}</div><p className="muted-text">Changing this only affects new products created going forward</p><Button size="sm" onClick={saveProfile}>Save Changes</Button></Card>
        <Card className="settings-section"><h2>Change Password</h2><Input label="Current Password" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} /><Input label="New Password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} /><Input label="Confirm New Password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} error={passwordError || (confirmPassword && confirmPassword !== newPassword ? "Passwords don't match" : '')} /><Button variant="secondary" size="sm" onClick={changePassword}>Update Password</Button></Card>
        <Card className="danger-zone"><h2>Danger Zone</h2><strong>Delete all my data</strong><p>Permanently removes all products, stock, and sales history</p>{deleteStep === 0 ? <Button variant="danger" onClick={() => setDeleteStep(1)}>Delete Everything</Button> : <><p>This will delete all data for {user.name}. Type your name to confirm.</p><Input value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)} /><Button variant="danger" disabled={deleteConfirm !== user.name} onClick={deleteEverything}>Confirm Delete</Button></>}</Card>
      </div>
    </div>
  );
};
