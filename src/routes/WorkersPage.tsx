import { Crown, Users } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PREMIUM_CONTACT_EMAIL } from '@/constants/developer';

const premiumMailto = `mailto:${PREMIUM_CONTACT_EMAIL}?subject=${encodeURIComponent('StockFlow Workers Premium')}&body=${encodeURIComponent("Hi Hamza,\n\nI'm interested in the Workers premium feature for StockFlow.\n\n")}`;

export const WorkersPage = () => {
  const openPremiumEmail = () => {
    void window.api.shell.openExternal(premiumMailto);
  };

  return (
    <div className="workers-page">
      <Card className="workers-hero">
        <div className="workers-hero-icon" aria-hidden="true">
          <Users size={32} />
        </div>
        <div>
          <div className="workers-hero-title">
            <h1>Workers</h1>
            <Badge variant="warn">Coming soon</Badge>
          </div>
          <p className="workers-hero-text">
            Manage your team members, assign roles, and track who handles stock and sales.
          </p>
        </div>
      </Card>

      <div className="workers-grid">
        {['Add team members', 'Role-based access', 'Activity tracking', 'Shift management'].map((feature) => (
          <Card key={feature} className="workers-feature-card">
            <Users size={18} />
            <span>{feature}</span>
          </Card>
        ))}
      </div>

      <Card className="workers-premium-card">
        <div className="workers-premium-badge" aria-hidden="true">
          <Crown size={20} />
        </div>
        <h2>Premium feature</h2>
        <p>
          Workers management is part of StockFlow Premium. Contact me to unlock team features for your business.
        </p>
        <Button onClick={openPremiumEmail}>Get Premium — {PREMIUM_CONTACT_EMAIL}</Button>
      </Card>
    </div>
  );
};
