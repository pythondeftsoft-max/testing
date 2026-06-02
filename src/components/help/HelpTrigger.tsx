import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { HelpCircle } from 'lucide-react';
import HelpDrawer from './HelpDrawer';

interface HelpTriggerProps {
  /** Optional override for button label (icon-only by default). */
  label?: string;
  variant?: React.ComponentProps<typeof Button>['variant'];
  size?: React.ComponentProps<typeof Button>['size'];
  className?: string;
}

/**
 * `?` icon button that opens the contextual HelpDrawer.
 * Mount in portal headers (agency, landlord) so users can self-serve.
 */
const HelpTrigger: React.FC<HelpTriggerProps> = ({
  label,
  variant = 'ghost',
  size = 'icon',
  className,
}) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setOpen(true)}
        className={className}
        aria-label="Open help"
        title="Help"
      >
        <HelpCircle className="w-4 h-4" />
        {label && <span className="ml-2">{label}</span>}
      </Button>
      <HelpDrawer open={open} onOpenChange={setOpen} />
    </>
  );
};

export default HelpTrigger;
