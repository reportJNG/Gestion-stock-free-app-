import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';

export const Dev = () => {
  const { notify } = useToast();

  return (
    <div className="dev-grid">
      <Card>
        <p className="eyebrow">Components</p>
        <h2>UI isolation</h2>
        <div className="stack">
          <div className="button-row">
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Danger</Button>
          </div>
          <Input label="Input" placeholder="Barcode or SKU" />
          <div className="button-row">
            <Badge variant="ok">OK</Badge>
            <Badge variant="warn">Low</Badge>
            <Badge variant="danger">Out</Badge>
            <Badge variant="info">Info</Badge>
            <Badge>Neutral</Badge>
          </div>
          <Spinner />
          <Button variant="secondary" onClick={() => notify({ title: 'Toast ready', message: 'Notification system is wired.', variant: 'success' })}>
            Show toast
          </Button>
        </div>
      </Card>
    </div>
  );
};
