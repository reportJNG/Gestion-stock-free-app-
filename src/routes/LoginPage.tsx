import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { compare } from "bcryptjs";
import { Eye, EyeOff, Plus } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { useAuth } from "@/store/AuthContext";

import type { User, UserRow } from "@/types";
import { mapUserRow } from "@/utils/userMapper";

type Phase = "select" | "password";

interface PasswordRow {
  password_hash: string;
}

export const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const passwordRef = useRef<HTMLInputElement>(null);

  const [phase, setPhase] = useState<Phase>("select");
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingLogin, setLoadingLogin] = useState(false);

  const [error, setError] = useState("");
  const [attempts, setAttempts] = useState(0);

  /* -------------------- Load Users -------------------- */
  useEffect(() => {
    let mounted = true;

    const loadUsers = async () => {
      try {
        setLoadingUsers(true);

        const rows: UserRow[] = await window.api.db.users.getAll();

        if (!mounted) return;

        setUsers(rows.filter((r) => r.is_active).map(mapUserRow));
      } catch {
        if (mounted) setError("Failed to load profiles.");
      } finally {
        if (mounted) setLoadingUsers(false);
      }
    };

    loadUsers();

    return () => {
      mounted = false;
    };
  }, []);

  /* -------------------- Focus Password -------------------- */
  useEffect(() => {
    if (phase === "password") {
      const t = setTimeout(() => passwordRef.current?.focus(), 80);
      return () => clearTimeout(t);
    }
  }, [phase]);

  /* -------------------- Actions -------------------- */
  const resetAuthState = () => {
    setPassword("");
    setError("");
    setShowPassword(false);
  };

  const selectUser = (user: User) => {
    setSelectedUser(user);
    setAttempts(0);
    resetAuthState();
    setPhase("password");
  };

  const goBack = () => {
    setSelectedUser(null);
    setAttempts(0);
    resetAuthState();
    setPhase("select");
  };

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedUser || loadingLogin) return;

    setLoadingLogin(true);
    setError("");

    try {
      const row = await window.api.db.get<PasswordRow>(
        "SELECT password_hash FROM users WHERE id = ?",
        [selectedUser.id],
      );

      const isValid =
        row?.password_hash && (await compare(password, row.password_hash));

      if (!isValid) {
        setAttempts((prev) => prev + 1);
        setError("Wrong password. Try again.");
        return;
      }

      login(selectedUser);
      navigate("/home", { replace: true });
    } catch {
      setError("Login failed. Please try again.");
    } finally {
      setLoadingLogin(false);
    }
  };

  const showForgotPassword = attempts >= 3 && selectedUser;

  /* -------------------- UI -------------------- */
  return (
    <main className="auth-screen">
      <section className="auth-panel">
        {/* Branding */}
        <aside className="auth-branding">
          <div>
            <div className="auth-mark" aria-hidden="true">
              {Array.from({ length: 9 }).map((_, i) => (
                <span key={i} />
              ))}
            </div>

            <h1>StockFlow</h1>
            <p>Manage smarter.</p>
          </div>
          <small>v0.1.0</small>
        </aside>

        {/* Content */}
        <section className={`auth-form-zone ${phase}`}>
          {/* ---------------- SELECT USER ---------------- */}
          {phase === "select" && (
            <div className="auth-phase">
              <div>
                <h2>Who's logging in?</h2>
                <p>Select your profile</p>
              </div>

              {loadingUsers ? (
                <Spinner />
              ) : (
                <div className="profile-grid">
                  {users.map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      className={`profile-card ${
                        selectedUser?.id === user.id
                          ? "profile-card-selected"
                          : ""
                      }`}
                      onClick={() => selectUser(user)}
                    >
                      <span className="profile-avatar">
                        {user.avatarInitials ||
                          user.name.slice(0, 2).toUpperCase()}
                      </span>

                      <strong>{user.name}</strong>
                      <Badge>{user.businessType}</Badge>
                    </button>
                  ))}
                </div>
              )}

              {!loadingUsers && users.length === 0 && (
                <p className="auth-empty">No profiles yet.</p>
              )}

              {error && <p className="field-error">{error}</p>}

              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={() => navigate("/register")}
              >
                <Plus size={16} />
                Create new profile
              </Button>
            </div>
          )}

          {/* ---------------- PASSWORD ---------------- */}
          {phase === "password" && selectedUser && (
            <form className="auth-phase" onSubmit={handleLogin}>
              <div>
                <h2>Welcome back, {selectedUser.name}</h2>

                <div className="selected-profile">
                  <span className="mini-avatar">
                    {selectedUser.avatarInitials}
                  </span>
                  <Badge>{selectedUser.businessType}</Badge>
                </div>
              </div>

              <label className="password-field">
                <span>Password</span>

                <div className="password-input-wrap">
                  <input
                    ref={passwordRef}
                    className="input-control"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    placeholder="Enter your password"
                    onChange={(e) => setPassword(e.target.value)}
                  />

                  <button
                    type="button"
                    aria-label="Toggle password visibility"
                    onClick={() => setShowPassword((v) => !v)}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                {error && <small>{error}</small>}
              </label>

              {showForgotPassword && (
                <Link
                  className="auth-link"
                  to={`/forgot-password?userId=${selectedUser.id}`}
                >
                  Forgot your password?
                </Link>
              )}

              <div className="auth-actions">
                <Button type="button" variant="ghost" onClick={goBack}>
                  Back
                </Button>

                <Button
                  type="submit"
                  className="auth-submit"
                  loading={loadingLogin}
                  disabled={!password}
                >
                  Log In
                </Button>
              </div>
            </form>
          )}
        </section>
      </section>
    </main>
  );
};
