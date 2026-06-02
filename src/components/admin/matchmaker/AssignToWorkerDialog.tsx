import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAvailableWorkers, AvailableWorker } from '@/hooks/useAvailableWorkers';
import { Loader2, Search, User } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface AssignToWorkerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAssign: (workerId: string) => void;
  entityType: 'tenant' | 'property';
  entityName: string;
}

export const AssignToWorkerDialog = ({
  isOpen,
  onClose,
  onAssign,
  entityType,
  entityName,
}: AssignToWorkerDialogProps) => {
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const { data: workers, isLoading } = useAvailableWorkers();

  const filteredWorkers = workers?.filter((worker) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      worker.full_name.toLowerCase().includes(searchLower) ||
      worker.email.toLowerCase().includes(searchLower)
    );
  });

  const handleAssign = () => {
    if (selectedWorkerId) {
      onAssign(selectedWorkerId);
      setSelectedWorkerId(null);
      setSearchQuery('');
      onClose();
    }
  };

  const handleClose = () => {
    setSelectedWorkerId(null);
    setSearchQuery('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Assign {entityType === 'tenant' ? 'Tenant' : 'Property'} to Worker</DialogTitle>
          <DialogDescription>
            Select a matchmaker to assign <strong>{entityName}</strong> to their workload.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search workers by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              autoComplete="off"
              type="text"
            />
          </div>

          {/* Workers list */}
          <div className="max-h-[300px] overflow-y-auto space-y-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredWorkers && filteredWorkers.length > 0 ? (
              filteredWorkers.map((worker) => (
                <button
                  key={worker.user_id}
                  onClick={() => setSelectedWorkerId(worker.user_id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                    selectedWorkerId === worker.user_id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:bg-accent'
                  }`}
                >
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {worker.first_name[0]}{worker.last_name[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left">
                    <div className="font-medium flex items-center gap-2">
                      {worker.full_name}
                      {worker.role_name && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                          {worker.role_name === 'super_admin' ? 'Super Admin' : 
                           worker.role_name === 'operations_admin' ? 'Operations' : 'Matchmaker'}
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">{worker.email}</div>
                  </div>
                </button>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <User className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No workers found</p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleAssign} disabled={!selectedWorkerId}>
            Assign to Worker
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
