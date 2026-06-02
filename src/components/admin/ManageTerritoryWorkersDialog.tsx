import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useTerritoryWorkers, useAddTerritoryWorker, useRemoveTerritoryWorker } from '@/hooks/useTerritoryWorkers';
import { useAvailableWorkers } from '@/hooks/useAvailableWorkers';
import { Territory } from '@/hooks/useTerritories';
import { X, UserPlus, Users, Search } from 'lucide-react';

interface ManageTerritoryWorkersDialogProps {
  territory: Territory;
  isOpen: boolean;
  onClose: () => void;
}

export const ManageTerritoryWorkersDialog: React.FC<ManageTerritoryWorkersDialogProps> = ({
  territory,
  isOpen,
  onClose,
}) => {
  const { data: currentWorkers = [], isLoading } = useTerritoryWorkers(territory.id);
  const { data: availableWorkers = [] } = useAvailableWorkers();
  const addWorker = useAddTerritoryWorker();
  const removeWorker = useRemoveTerritoryWorker();
  
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter out already assigned workers
  const unassignedWorkers = availableWorkers.filter(
    w => !currentWorkers.some(cw => cw.worker_id === w.user_id)
  );

  // Filter workers by search query
  const filteredUnassignedWorkers = unassignedWorkers.filter((worker) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      worker.full_name.toLowerCase().includes(searchLower) ||
      worker.email.toLowerCase().includes(searchLower)
    );
  });

  const handleAddWorker = () => {
    if (selectedWorkerId) {
      addWorker.mutate({
        territoryId: territory.id,
        workerId: selectedWorkerId,
      });
      setSelectedWorkerId('');
      setSearchQuery('');
    }
  };

  const handleRemoveWorker = (workerId: string) => {
    removeWorker.mutate({
      territoryId: territory.id,
      workerId: workerId,
    });
  };

  const handleRemoveAll = () => {
    if (confirm(`Remove all ${currentWorkers.length} workers from "${territory.territory_name}"?`)) {
      currentWorkers.forEach(worker => {
        removeWorker.mutate({
          territoryId: territory.id,
          workerId: worker.worker_id,
        });
      });
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Manage Workers - {territory.territory_name}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="current" className="w-full py-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="current">
              Current Workers ({currentWorkers.length})
            </TabsTrigger>
            <TabsTrigger value="add">
              Add Worker
            </TabsTrigger>
          </TabsList>

          <TabsContent value="current" className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {currentWorkers.length === 0 && "No workers assigned to this territory"}
              </div>
              {currentWorkers.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveAll}
                  className="text-destructive hover:text-destructive"
                >
                  Remove All
                </Button>
              )}
            </div>

            {isLoading ? (
              <div className="text-sm text-muted-foreground">Loading workers...</div>
            ) : currentWorkers.length > 0 && (
              <ScrollArea className="h-[200px] pr-4">
                <div className="space-y-2">
                  {currentWorkers.map((worker) => (
                    <div
                      key={worker.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {getInitials(worker.first_name, worker.last_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium text-sm">
                            {worker.full_name}
                            {worker.is_primary && (
                              <Badge variant="secondary" className="ml-2 text-xs">
                                Primary
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {worker.email}
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveWorker(worker.worker_id)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>

          <TabsContent value="add" className="space-y-3">
            <div className="space-y-3">
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
                  disabled={unassignedWorkers.length === 0}
                />
              </div>

              {/* Workers list */}
              <ScrollArea className="max-h-[300px]">
                <div className="space-y-2 pr-4">
                  {filteredUnassignedWorkers.length > 0 ? (
                    filteredUnassignedWorkers.map((worker) => (
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
                            {getInitials(worker.first_name, worker.last_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 text-left">
                          <div className="font-medium">{worker.full_name}</div>
                          <div className="text-sm text-muted-foreground">{worker.email}</div>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      {unassignedWorkers.length === 0 
                        ? "All available workers have been assigned"
                        : "No workers found"}
                    </div>
                  )}
                </div>
              </ScrollArea>

              <Button
                onClick={handleAddWorker}
                disabled={!selectedWorkerId || addWorker.isPending}
                className="w-full"
              >
                <UserPlus className="mr-2 h-4 w-4" />
                {addWorker.isPending ? 'Adding...' : 'Add Worker'}
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
