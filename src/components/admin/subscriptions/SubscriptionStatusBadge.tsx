import { Badge } from '@/components/ui/badge';

interface SubscriptionStatusBadgeProps {
  status: string;
}

export const SubscriptionStatusBadge = ({ status }: SubscriptionStatusBadgeProps) => {
  const statusConfig = {
    active: { label: 'Active', className: 'bg-green-100 text-green-800 border-green-300' },
    canceled: { label: 'Canceled', className: 'bg-gray-100 text-gray-800 border-gray-300' },
    past_due: { label: 'Past Due', className: 'bg-red-100 text-red-800 border-red-300' },
    incomplete: { label: 'Incomplete', className: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
    trialing: { label: 'Trial', className: 'bg-blue-100 text-blue-800 border-blue-300' },
  };

  const config = statusConfig[status?.toLowerCase() as keyof typeof statusConfig] || 
    { label: status, className: 'bg-gray-100 text-gray-800 border-gray-300' };

  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  );
};
