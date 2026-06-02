import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import StaffPermissionOverridesPanel from './StaffPermissionOverridesPanel';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agencyId: string;
  staffId: string | null;
  staffName?: string | null;
}

const EditStaffPermissionsDrawer: React.FC<Props> = ({ open, onOpenChange, agencyId, staffId, staffName }) => {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Permissions — {staffName || 'Staff member'}</SheetTitle>
          <SheetDescription>
            Adjust individual permission overrides. Anything left on <em>Inherit</em> uses the role default.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-4">
          {staffId && <StaffPermissionOverridesPanel agencyId={agencyId} staffId={staffId} />}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default EditStaffPermissionsDrawer;
