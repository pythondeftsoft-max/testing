
import React from 'react';
import { Button } from '@/components/ui/button';
import { Users, Loader2 } from 'lucide-react';
import { useUserPoints } from '@/hooks/useUserPoints';
import { toast } from 'sonner';

interface DistributePointsButtonProps {
  portfolioPointsId: string;
  onSuccess?: () => void;
}

const DistributePointsButton = ({ portfolioPointsId, onSuccess }: DistributePointsButtonProps) => {
  const { distributePoints } = useUserPoints(''); // userId not needed for distribution

  const handleDistribute = async () => {
    try {
      const result = await distributePoints.mutateAsync(portfolioPointsId);
      toast.success('Successfully distributed points');
      onSuccess?.();
    } catch (error) {
      console.error('Failed to distribute points:', error);
      toast.error('Failed to distribute points');
    }
  };

  return (
    <Button
      onClick={handleDistribute}
      disabled={distributePoints.isPending}
      variant="outline"
      size="sm"
      className="flex items-center gap-2"
    >
      {distributePoints.isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Users className="h-4 w-4" />
      )}
      Distribute Points
    </Button>
  );
};

export default DistributePointsButton;
