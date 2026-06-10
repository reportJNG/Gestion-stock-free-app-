import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/store/AuthContext';

export const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = () => {
    login({
      id: 1,
      name: 'Admin',
      type: 'admin',
      passwordHash: '',
      createdAt: new Date().toISOString(),
    });
    navigate('/home');
  };

  return (
    <main className="auth-screen">
      <Card className="auth-card">
        <div>
          <p className="eyebrow">StockFlow</p>
          <h1>Login</h1>
        </div>
        <Input label="Username" placeholder="admin" />
        <Input label="Password" placeholder="Password" type="password" />
        <Button type="button" onClick={handleLogin}>
          Continue
        </Button>
      </Card>
    </main>
  );
};
