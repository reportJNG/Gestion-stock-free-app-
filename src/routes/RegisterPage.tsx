import { useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { hashSync } from 'bcryptjs';
import {
  Armchair,
  BookOpen,
  Coffee,
  Cpu,
  Eye,
  EyeOff,
  Package,
  Pill,
  Shirt,
  Sparkles,
  UtensilsCrossed,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';

const defaultSettings = [
  ['currency', 'DZD'],
  ['language', 'en'],
  ['low_stock_alert', '1'],
  ['scan_auto_confirm', '0'],
  ['date_format', 'DD/MM/YYYY'],
] as const;

const businessTypes: Array<{
  value: string;
  label: string;
  description: string;
  icon: LucideIcon;
}> = [
  { value: 'clothing', label: 'Clothing', description: 'Sizes and colors for apparel.', icon: Shirt },
  { value: 'shoes', label: 'Shoes', description: 'Shoe sizes and color variants.', icon: Package },
  { value: 'food', label: 'Food', description: 'Expiry dates and weights.', icon: UtensilsCrossed },
  { value: 'beverage', label: 'Beverage', description: 'Volumes and expiry dates.', icon: Coffee },
  { value: 'electronics', label: 'Electronics', description: 'Warranty and brand fields.', icon: Cpu },
  { value: 'cosmetics', label: 'Cosmetics', description: 'Shades and expiry dates.', icon: Sparkles },
  { value: 'pharmacy', label: 'Pharmacy', description: 'Dosage and expiry dates.', icon: Pill },
  { value: 'furniture', label: 'Furniture', description: 'Material and color fields.', icon: Armchair },
  { value: 'books', label: 'Books', description: 'Author and ISBN fields.', icon: BookOpen },
  { value: 'general', label: 'General', description: 'Simple product tracking.', icon: Package },
];

const initialsFor = (name: string) => {
  return name
    .trim()
    .split(/\s+/)
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

export const RegisterPage = () => {
  const navigate = useNavigate();
  const { notify } = useToast();
  const [name, setName] = useState('');
  const [businessType, setBusinessType] = useState('general');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const matchError = useMemo(() => {
    if (!confirmPassword || password === confirmPassword) {
      return '';
    }

    return 'Passwords must match.';
  }, [confirmPassword, password]);

  const validate = () => {
    if (name.trim().length < 2) {
      return 'Name must be at least 2 characters.';
    }
    if (password.length < 4) {
      return 'Password must be at least 4 characters.';
    }
    if (password !== confirmPassword) {
      return 'Passwords must match.';
    }
    return '';
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);
    try {
      const created = await window.api.db.users.create({
        name: name.trim(),
        passwordHash: hashSync(password, 10),
        businessType,
        avatarInitials: initialsFor(name),
      });

      const userId = Number(created?.id);
      if (userId) {
        await Promise.all(defaultSettings.map(([key, value]) => window.api.db.settings.set(userId, key, value)));
      }

      notify({ title: 'Profile created', message: 'You can log in now.', variant: 'success' });
      navigate('/login');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="auth-screen">
      <section className="auth-panel register-panel">
        <aside className="auth-branding">
          <div>
            <div className="auth-mark" aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
            </div>
            <h1>StockFlow</h1>
            <p>Manage smarter.</p>
          </div>
          <small>v0.1.0</small>
        </aside>

        <form className="auth-form-zone auth-phase phase-active" onSubmit={handleSubmit}>
          <div>
            <h2>Create your profile</h2>
            <p>Set up your StockFlow workspace</p>
          </div>
          <Input label="Your name or business name" placeholder="e.g. Ahmed, Ahmed's Store..." value={name} onChange={(event) => setName(event.target.value)} />
          <fieldset className="business-selector">
            <legend>What kind of business are you?</legend>
            <div className="business-grid">
              {businessTypes.map((type) => {
                const Icon = type.icon;
                return (
                  <button
                    key={type.value}
                    className={`business-card ${businessType === type.value ? 'business-card-selected' : ''}`}
                    type="button"
                    title={type.description}
                    onClick={() => setBusinessType(type.value)}
                  >
                    <Icon size={32} />
                    <span>{type.label}</span>
                  </button>
                );
              })}
            </div>
          </fieldset>
          <label className="password-field">
            <span>Create a password</span>
            <div className="password-input-wrap">
              <input className="input-control" type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} />
              <button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword((current) => !current)}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>
          <Input label="Confirm password" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} error={matchError || error} />
          <Button type="submit" loading={isLoading}>
            Create Profile
          </Button>
          <Link className="auth-link" to="/login">
            Back to login
          </Link>
        </form>
      </section>
    </main>
  );
};
