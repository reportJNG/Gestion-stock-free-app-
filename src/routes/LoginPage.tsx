import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { compare } from 'bcryptjs';
import { Eye, EyeOff, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { useAuth } from '@/store/AuthContext';
import type { User, UserRow } from '@/types';
import { mapUserRow } from '@/utils/userMapper';

type LoginPhase = 'select' | 'password';

interface PasswordRow {
  password_hash: string;
}

export const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const passwordRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<LoginPhase>('select');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    let isMounted = true;

    window.api.db.users
      .getAll()
      .then((rows: UserRow[]) => {
        if (isMounted) {
          setUsers(rows.filter((row) => row.is_active).map(mapUserRow));
        }
      })
      .catch(() => {
        if (isMounted) {
          setError('Could not load profiles.');
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (phase === 'password') {
      window.setTimeout(() => passwordRef.current?.focus(), 50);
    }
  }, [phase]);

  const selectUser = (user: User) => {
    setSelectedUser(user);
    setPassword('');
    setError('');
    setPhase('password');
  };

  const handleBack = () => {
    setPhase('select');
    setSelectedUser(null);
    setPassword('');
    setError('');
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedUser) {
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const row = await window.api.db.get<PasswordRow>('SELECT password_hash FROM users WHERE id = ?', [selectedUser.id]);
      const isValid = row?.password_hash ? await compare(password, row.password_hash) : false;

      if (!isValid) {
        setAttempts((current) => current + 1);
        setError('Wrong password. Try again.');
        return;
      }

      login(selectedUser);
      navigate('/home', { replace: true });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="auth-screen">
      <section className="auth-panel">
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

        <section className={`auth-form-zone ${phase === 'password' ? 'phase-active' : 'phase-enter'}`}>
          {phase === 'select' ? (
            <div className="auth-phase">
              <div>
                <h2>Who's logging in?</h2>
                <p>Select your profile</p>
              </div>
              <div className="profile-grid">
                {users.map((user) => (
                  <button
                    key={user.id}
                    className={`profile-card ${selectedUser?.id === user.id ? 'profile-card-selected' : ''}`}
                    type="button"
                    onClick={() => selectUser(user)}
                  >
                    <span className="profile-avatar">{user.avatarInitials || user.name.slice(0, 2).toUpperCase()}</span>
                    <strong>{user.name}</strong>
                    <Badge>{user.businessType}</Badge>
                  </button>
                ))}
              </div>
              {users.length === 0 ? <p className="auth-empty">No profiles yet. Create one to start.</p> : null}
              {error ? <p className="field-error">{error}</p> : null}
              <Button variant="ghost" size="sm" type="button" onClick={() => navigate('/register')}>
                <Plus size={16} />
                Create new profile
              </Button>
            </div>
          ) : (
            <form className="auth-phase" onSubmit={handleSubmit}>
              <div>
                <h2>Welcome back, {selectedUser?.name}</h2>
                <div className="selected-profile">
                  <span className="mini-avatar">{selectedUser?.avatarInitials}</span>
                  <Badge>{selectedUser?.businessType}</Badge>
                </div>
              </div>
              <label className="password-field">
                <span>Password</span>
                <div className="password-input-wrap">
                  <input
                    ref={passwordRef}
                    className="input-control"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                  <button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword((current) => !current)}>
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {error ? <small>{error}</small> : null}
              </label>
              {attempts >= 3 && selectedUser ? (
                <Link className="auth-link" to={`/forgot-password?userId=${selectedUser.id}`}>
                  Forgot your password?
                </Link>
              ) : null}
              <div className="auth-actions">
                <Button variant="ghost" type="button" onClick={handleBack}>
                  Back
                </Button>
                <Button className="auth-submit" type="submit" loading={isLoading} disabled={!password}>
                  Log In
                </Button>
              </div>
              {isLoading ? <Spinner size="sm" /> : null}
            </form>
          )}
        </section>
      </section>
    </main>
  );
};
