import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { hashSync } from 'bcryptjs';
import { Eye, EyeOff } from 'lucide-react';
import { AuthBranding } from '@/components/auth/AuthBranding';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import type { UserRow } from '@/types';
import { mapUserRow } from '@/utils/userMapper';

export const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { notify } = useToast();
  const userId = Number(searchParams.get('userId'));
  const [userName, setUserName] = useState('this profile');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!userId) {
      return;
    }

    window.api.db.users.getById(userId).then((row?: UserRow) => {
      if (row) {
        setUserName(mapUserRow(row).name);
      }
    });
  }, [userId]);

  const validate = () => {
    if (!userId) {
      return 'Choose a profile from login first.';
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
    await window.api.db.users.updatePassword(userId, hashSync(password, 10));
    notify({ title: 'Password updated!', variant: 'success' });
    window.setTimeout(() => navigate('/login'), 1500);
  };

  const liveError = confirmPassword && password !== confirmPassword ? 'Passwords must match.' : error;

  return (
    <main className="auth-screen">
      <section className="auth-panel auth-panel-narrow">
        <AuthBranding />
        <form className="auth-form-zone auth-phase phase-active" onSubmit={handleSubmit}>
          <div>
            <h2>Reset your password</h2>
            <p>Set a new password for {userName}</p>
          </div>
          <label className="password-field">
            <span>New password</span>
            <div className="password-input-wrap">
              <input className="input-control" type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} />
              <button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword((current) => !current)}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>
          <label className="input-field">
            <span>Confirm new password</span>
            <input className="input-control" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
            {liveError ? <small>{liveError}</small> : null}
          </label>
          <Button type="submit" loading={isLoading}>
            Update Password
          </Button>
          <Link className="auth-link" to="/login">
            Back to login
          </Link>
        </form>
      </section>
    </main>
  );
};
