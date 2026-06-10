import { useParams } from 'react-router-dom';
import { Card } from '@/components/ui/Card';

export const ProductDetails = () => {
  const { id } = useParams();

  return (
    <Card>
      <p className="eyebrow">Route ready</p>
      <h2>Product #{id}</h2>
    </Card>
  );
};
