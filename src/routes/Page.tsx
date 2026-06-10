import { Card } from '@/components/ui/Card';

export const Page = ({ title }: { title: string }) => (
  <Card>
    <p className="eyebrow">Route ready</p>
    <h2>{title}</h2>
  </Card>
);
