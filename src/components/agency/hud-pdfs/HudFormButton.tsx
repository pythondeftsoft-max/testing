// Reusable button for generating any of the four HUD PDFs.
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  formNumber: '52517' | '52580' | '52671' | '52641';
  entityId: string;
  agencyName: string;
  size?: 'default' | 'sm' | 'icon';
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  className?: string;
  label?: string;
}

const HudFormButton: React.FC<Props> = ({ formNumber, entityId, agencyName, size = 'sm', variant = 'outline', className, label }) => {
  const [loading, setLoading] = useState(false);

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setLoading(true);
    try {
      switch (formNumber) {
        case '52517': {
          const { generateRfta52517Pdf } = await import('@/utils/hud-pdfs/rfta52517');
          await generateRfta52517Pdf(entityId, agencyName);
          break;
        }
        case '52580': {
          const { generateNspire52580Pdf } = await import('@/utils/hud-pdfs/nspire52580');
          await generateNspire52580Pdf(entityId, agencyName);
          break;
        }
        case '52671': {
          const { generateSpecialClaim52671Pdf } = await import('@/utils/hud-pdfs/specialClaim52671');
          await generateSpecialClaim52671Pdf(entityId, agencyName);
          break;
        }
        case '52641': {
          const { generateHapContract52641Pdf } = await import('@/utils/hud-pdfs/hapContract52641');
          await generateHapContract52641Pdf(entityId, agencyName);
          break;
        }
      }
      toast.success(`HUD-${formNumber} downloaded`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate PDF');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button size={size} variant={variant} className={className} onClick={handleClick} disabled={loading}>
      {loading ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <FileText className="h-3.5 w-3.5 mr-1" />}
      {label ?? `HUD-${formNumber}`}
    </Button>
  );
};

export default HudFormButton;
