import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export const ForgotPassword = () => (
  <main className="auth-screen">
    <Card className="auth-card">
      <div>
        <p className="eyebrow">Recovery</p>
        <h1>Forgot password</h1>
      </div>
      <Input label="Username" placeholder="admin" />
      <Button type="button">Send reset</Button>
      <Link className="auth-link" to="/login">
        Back to login
      </Link>
    </Card>
  </main>
);
